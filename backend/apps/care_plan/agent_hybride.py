"""
Agent Hybride LLM — Générateur de Plan de Soin Personnalisé (v1.0)
===================================================================

Remplace le `GenerateurPlanSoin` statique en intégrant :
  1. Les réponses au questionnaire FINDRISC étendu v2.0
  2. Les données cliniques DMI extraites de HAPI FHIR (optionnel)
  3. Le contexte épidémiologique tunisien

Architecture interne :
  AgentHybridePlanSoin
  ├── _construire_prompt_systeme()     → Rôle clinique et contraintes absolues
  ├── _construire_prompt_utilisateur() → Fusion formulaire étendu + DMI
  ├── _appeler_llm()                   → Dispatch Gemini / OpenAI / stub
  ├── _parser_reponse()                → Extraction et validation JSON
  ├── _valider_guardrails()            → Sécurité clinique post-LLM (délégué à protocol_engine)
  ├── _generer_plan_fallback()         → Bascule sur GenerateurPlanSoin si LLM échoue
  └── generer_plan()                   → Point d'entrée principal

GARANTIE : Aucun dépistage ne peut échouer à cause d'une indisponibilité du LLM.
"""

import json
import logging
import time
from datetime import datetime, timezone

from django.conf import settings

logger = logging.getLogger(__name__)


def _PROVIDER():
    return getattr(settings, "AGENT_HYBRIDE_PROVIDER", "stub")


def _MODEL():
    return getattr(settings, "AGENT_HYBRIDE_MODEL", "gemini-2.0-flash")


def _MAX_TOKENS():
    return getattr(settings, "AGENT_HYBRIDE_MAX_TOKENS", 2048)


def _TIMEOUT():
    return getattr(settings, "AGENT_HYBRIDE_TIMEOUT_S", 15)


# ===========================================================================
# Agent principal
# ===========================================================================

class AgentHybridePlanSoin:
    """
    Génère un plan de soin personnalisé en combinant le formulaire étendu
    et, si disponible, les données DMI du dossier médical FHIR.

    Usage:
        agent = AgentHybridePlanSoin(assessment, form, dmi)
        rapport = agent.generer_plan()
        nutrition = rapport["plan_nutrition"]
        activite  = rapport["plan_activite"]
    """

    SCHEMA_SORTIE = {
        "plan_nutrition": {
            "titre": "str",
            "niveau_priorite": "STAT|URGENT|ROUTINE",
            "objectifs": ["str"],
            "aliments_a_privilegier": ["str"],
            "aliments_a_eviter": ["str"],
            "interactions_medicaments_aliments": ["str"],
            "conseils_specifiques": "str",
            "frequence_suivi": "str",
            "version_source": "agent-hybride-v1.0",
        },
        "plan_activite": {
            "titre": "str",
            "objectifs": ["str"],
            "programme_semaine": "str",
            "precautions": "str",
            "version_source": "agent-hybride-v1.0",
        },
        "rapport_nutritionniste": {
            "resume_dossier": "str",
            "points_attention": ["str"],
            "justification_ia": "str",
            "sources_donnees": ["formulaire_v2", "dmi_fhir"],
            "requires_medical_referral": "bool",
            "orientation_medicale": {
                "motif": "str",
                "urgence": "str",
                "specialite": "str",
            },
        },
        "metadata": {
            "agent_version": "agent-hybride-v1.0",
            "llm_provider": "str",
            "llm_model": "str",
            "dmi_utilise": "bool",
            "dmi_fhir_id": "str|null",
            "formulaire_version": "2.0",
            "genere_le": "ISO8601",
            "latence_ms": "int",
        },
    }

    def __init__(
        self,
        assessment: dict,
        form: dict,
        dmi: dict | None = None,
    ):
        self.assessment = assessment
        self.form = form
        self.dmi = dmi or {}
        self._dmi_disponible = bool(self.dmi.get("dmi_disponible"))

    # ------------------------------------------------------------------
    # Point d'entrée principal
    # ------------------------------------------------------------------

    def generer_plan(self) -> dict:
        """
        Génère le plan personnalisé :
          1. Obtient le protocole déterministe de référence (baseline) via protocol_engine.
          2. En mode stub ou si le LLM échoue/timeout, retourne la baseline avec prose_source="deterministic".
          3. Si LLM actif : lui soumet les items pour reformulation du style uniquement.
          4. Fusionne STRICTEMENT par trigger : copie uniquement 'action' et 'target'.
             Préserve trigger, category, priority, title, evidence, source.
             Supprime tout item supplémentaire injecté par le LLM.
          5. Réapplique _apply_guardrails sur le protocole fusionné.
          6. Marque metadata.prose_source sur chaque item ("llm" ou "deterministic").
        """
        # Étape 1 : Baseline déterministe
        baseline_protocol = self._generer_baseline_deterministe()

        provider = _PROVIDER()
        if provider == "stub":
            logger.info("Agent Hybride en mode STUB — conservation de la baseline déterministe.")
            return self._formater_rapport_final(baseline_protocol, prose_source="deterministic", raison="provider=stub")

        t0 = time.time()
        try:
            prompt_systeme = self._construire_prompt_systeme(baseline_protocol)
            prompt_utilisateur = self._construire_prompt_utilisateur(baseline_protocol)
            reponse_brute = self._appeler_llm(prompt_systeme, prompt_utilisateur)
            llm_output = self._parser_reponse(reponse_brute)
            latence_ms = int((time.time() - t0) * 1000)

            # Étape 4 & 5 : Fusion stricte par nom de trigger + ré-application des guardrails
            merged_protocol = self._fusionner_reponse_llm(baseline_protocol, llm_output)

            logger.info(
                "Agent Hybride: plan généré via %s en %d ms (DMI=%s)",
                provider, latence_ms, self._dmi_disponible
            )
            return self._formater_rapport_final(
                merged_protocol,
                prose_source="llm",
                llm_provider=provider,
                latence_ms=latence_ms
            )

        except _LlmTimeout:
            logger.warning("Agent Hybride: timeout LLM après %d s — fallback baseline.", _TIMEOUT())
            return self._formater_rapport_final(
                baseline_protocol, prose_source="deterministic", raison="llm_timeout"
            )
        except _LlmError as exc:
            logger.warning("Agent Hybride: erreur LLM (%s) — fallback baseline.", exc)
            return self._formater_rapport_final(
                baseline_protocol, prose_source="deterministic", raison=f"llm_error: {exc}"
            )
        except Exception as exc:
            logger.exception("Agent Hybride: erreur inattendue — fallback baseline (%s)", exc)
            return self._formater_rapport_final(
                baseline_protocol, prose_source="deterministic", raison=f"unexpected: {exc}"
            )

    def _generer_baseline_deterministe(self) -> dict:
        """Appelle protocol_engine.generate_protocol pour obtenir la référence clinique absolue."""
        from apps.risk_engine.ml import protocol_engine
        try:
            return protocol_engine.generate_protocol(
                assessment=self.assessment,
                form=self.form,
                dmi=self.dmi if self._dmi_disponible else None,
                language="fr"
            )
        except Exception as exc:
            logger.warning("Erreur lors de la génération du protocole baseline: %s", exc)
            # En cas d'erreur exceptionnelle, retourne une structure vide conforme
            return {
                "items": [],
                "urgent_flags": [],
                "requires_medical_referral": False,
                "summary": "",
                "disclaimer": ""
            }

    def _fusionner_reponse_llm(self, baseline: dict, llm_output: dict) -> dict:
        """
        Merge rule :
          - Pour chaque item de baseline, retrouver l'item LLM correspondant PAR NOM DE TRIGGER.
          - Copier UNIQUEMENT 'action' et 'target' depuis le LLM.
          - Conserver 'trigger', 'category', 'priority', 'title', 'evidence', 'source' de baseline.
          - Si un trigger est absent du LLM, conserver la version déterministe.
          - Ne JAMAIS permettre au LLM d'ajouter ou de supprimer des items.
          - Marquer metadata.prose_source = 'llm' ou 'deterministic'.
          - Réappliquer protocol_engine._apply_guardrails().
        """
        import copy
        from apps.risk_engine.ml import protocol_engine

        merged = copy.deepcopy(baseline)
        llm_items = llm_output.get("items", [])
        if not isinstance(llm_items, list):
            llm_items = []

        # Indexation des items LLM par trigger
        llm_map = {}
        for it in llm_items:
            if isinstance(it, dict) and "trigger" in it:
                llm_map[it["trigger"]] = it

        final_items = []
        for base_it in baseline.get("items", []):
            item = copy.deepcopy(base_it)
            item.setdefault("metadata", {})
            trig = item.get("trigger")

            if trig in llm_map:
                llm_it = llm_map[trig]
                if llm_it.get("action"):
                    item["action"] = str(llm_it["action"]).strip()
                if llm_it.get("target"):
                    item["target"] = str(llm_it["target"]).strip()
                item["metadata"]["prose_source"] = "llm"
            else:
                item["metadata"]["prose_source"] = "deterministic"

            final_items.append(item)

        merged["items"] = final_items

        # Ré-application déterministe des guardrails cliniques
        dmi_arg = self.dmi if self._dmi_disponible else None
        merged = protocol_engine._apply_guardrails(merged, self.form, dmi_arg)

        # S'assurer que tous les items résultants ont leur metadata prose_source
        for it in merged.get("items", []):
            it.setdefault("metadata", {})
            if "prose_source" not in it["metadata"]:
                it["metadata"]["prose_source"] = "deterministic"

        return merged

    def _formater_rapport_final(
        self,
        protocol: dict,
        prose_source: str = "deterministic",
        raison: str = "",
        llm_provider: str = "none",
        latence_ms: int = 0
    ) -> dict:
        """
        Construit l'enveloppe finale {plan_nutrition, plan_activite, rapport_nutritionniste, metadata}
        à partir du protocole généré ou fusionné.
        """
        from apps.care_plan.services import GenerateurPlanSoin

        items = protocol.get("items", [])
        # S'assurer que tous les items ont bien leur tag prose_source
        for it in items:
            it.setdefault("metadata", {})
            if "prose_source" not in it["metadata"]:
                it["metadata"]["prose_source"] = prose_source

        niveau_risque = self.assessment.get("niveau_risque", "INTERMEDIAIRE")
        nutrition, activite = GenerateurPlanSoin.generer_plans(
            niveau_risqu=niveau_risque,
            facteurs=self.assessment.get("facteurs", []),
            protocole_ml=protocol,
        )

        requires_referral = bool(protocol.get("requires_medical_referral", False))
        urgent_flags = list(protocol.get("urgent_flags", []))

        return {
            "plan_nutrition": nutrition,
            "plan_activite": activite,
            "rapport_nutritionniste": {
                "resume_dossier": protocol.get("summary", ""),
                "points_attention": urgent_flags,
                "justification_ia": (
                    "Plan personnalisé rédigé par LLM et validé par garde-fous cliniques."
                    if prose_source == "llm"
                    else f"Plan déterministe sécurisé ({raison or 'baseline'})."
                ),
                "sources_donnees": ["formulaire_v2", "dmi_fhir"] if self._dmi_disponible else ["formulaire_v2"],
                "requires_medical_referral": requires_referral,
                "orientation_medicale": {
                    "urgent_flags": urgent_flags,
                    "requires_medical_referral": requires_referral,
                },
            },
            "protocol": protocol,
            "metadata": {
                "agent_version": "agent-hybride-v1.0",
                "llm_provider": llm_provider if prose_source == "llm" else "none",
                "llm_model": _MODEL() if prose_source == "llm" else "none",
                "dmi_utilise": self._dmi_disponible,
                "dmi_fhir_id": self.dmi.get("fhir_patient_id"),
                "formulaire_version": "2.0",
                "genere_le": datetime.now(timezone.utc).isoformat(),
                "latence_ms": latence_ms,
                "fallback_raison": raison,
                "prose_source": prose_source,
                "urgent_flags": urgent_flags,
                "requires_medical_referral": requires_referral,
            },
        }

    # ------------------------------------------------------------------
    # Prompts (Le LLM ne fait que reformuler les chaînes action et target)
    # ------------------------------------------------------------------

    def _construire_prompt_systeme(self, baseline_protocol: dict | None = None) -> str:
        return (
            "Tu es un rédacteur médical et nutritionniste expert en diabétologie préventive (Wiqayati, Tunisie).\n"
            "Ta mission UNIQUE est d'améliorer la clarté et l'empathie des recommandations cliniques.\n\n"
            "RÈGLE IMPÉRATIVE DE SÉCURITÉ :\n"
            "Tu reçois une liste de recommandations déterministes validées cliniquement.\n"
            "Tu dois UNIQUEMENT reformuler les champs 'action' et 'target' de chaque élément existant.\n"
            "- Ne change JAMAIS le sens médical des recommandations.\n"
            "- N'ajoute JAMAIS de nouveaux éléments ni de médicaments.\n"
            "- Préserve scrupuleusement la valeur exacte de chaque 'trigger'.\n\n"
            "FORMAT DE SORTIE ATTENDU : JSON strict contenant la clé 'items' :\n"
            "{\n"
            '  "items": [\n'
            '    {\n'
            '      "trigger": "nom_du_trigger_identique",\n'
            '      "action": "Texte d action reformulé, bienveillant et clair",\n'
            '      "target": "Cible chiffrée ou objectif reformulé"\n'
            '    }\n'
            "  ]\n"
            "}\n"
        )

    def _construire_prompt_utilisateur(self, baseline_protocol: dict | None = None) -> str:
        items_a_reformuler = []
        if baseline_protocol and "items" in baseline_protocol:
            for it in baseline_protocol["items"]:
                items_a_reformuler.append({
                    "trigger": it.get("trigger"),
                    "title": it.get("title"),
                    "action": it.get("action"),
                    "target": it.get("target"),
                })

        dmi_dispo = "OUI" if self._dmi_disponible else "NON"
        dmi_cond = [c.get("libelle") for c in self.dmi.get("conditions", [])] if self._dmi_disponible else []

        payload = {
            "patient_contexte": {
                "age": self.form.get("age"),
                "genre": self.form.get("genre"),
                "imc": self.form.get("imc"),
                "niveau_risque": self.assessment.get("niveau_risque"),
                "dmi_disponible": dmi_dispo,
                "conditions_actives": dmi_cond,
            },
            "items_a_reformuler": items_a_reformuler,
        }

        instruction_intro = (
            "Voici les données du patient et la liste des recommandations à reformuler "
            "en français médical chaleureux et accessible :\n"
        )
        return (
            instruction_intro
            + json.dumps(payload, ensure_ascii=False, indent=2)
            + "\n\nReformule uniquement 'action' et 'target' pour chaque trigger sans ajouter ni enlever d'items."
        )

    # ------------------------------------------------------------------
    # Appel LLM
    # ------------------------------------------------------------------

    def _appeler_llm(self, prompt_systeme: str, prompt_utilisateur: str) -> str:
        provider = _PROVIDER()
        timeout = _TIMEOUT()

        if provider == "gemini":
            return self._appeler_gemini(prompt_systeme, prompt_utilisateur, timeout)
        elif provider == "openai":
            return self._appeler_openai(prompt_systeme, prompt_utilisateur, timeout)
        else:
            raise _LlmError(f"Provider inconnu: {provider}")

    def _appeler_gemini(
        self, prompt_systeme: str, prompt_utilisateur: str, timeout: int
    ) -> str:
        try:
            import google.generativeai as genai  # type: ignore
        except ImportError as exc:
            raise _LlmError("google-generativeai non installé") from exc

        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            raise _LlmError("GEMINI_API_KEY manquant dans les settings.")

        genai.configure(api_key=api_key)
        model_name = _MODEL()
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=prompt_systeme,
        )

        import threading

        result: list = []
        exception: list = []

        def _call():
            try:
                response = model.generate_content(
                    prompt_utilisateur,
                    generation_config={
                        "max_output_tokens": _MAX_TOKENS(),
                        "temperature": 0.3,
                    },
                )
                result.append(response.text)
            except Exception as exc:
                exception.append(exc)

        t = threading.Thread(target=_call, daemon=True)
        t.start()
        t.join(timeout=timeout)

        if t.is_alive():
            raise _LlmTimeout(f"Gemini timeout après {timeout}s")
        if exception:
            raise _LlmError(f"Gemini error: {exception[0]}")
        if not result:
            raise _LlmError("Gemini: réponse vide")
        return result[0]

    def _appeler_openai(
        self, prompt_systeme: str, prompt_utilisateur: str, timeout: int
    ) -> str:
        try:
            from openai import OpenAI  # type: ignore
        except ImportError as exc:
            raise _LlmError("openai non installé") from exc

        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            raise _LlmError("OPENAI_API_KEY manquant dans les settings.")

        client = OpenAI(api_key=api_key, timeout=timeout)
        response = client.chat.completions.create(
            model=_MODEL(),
            max_tokens=_MAX_TOKENS(),
            temperature=0.3,
            messages=[
                {"role": "system", "content": prompt_systeme},
                {"role": "user", "content": prompt_utilisateur},
            ],
        )
        content = response.choices[0].message.content
        if not content:
            raise _LlmError("OpenAI: réponse vide")
        return content

    # ------------------------------------------------------------------
    # Parser
    # ------------------------------------------------------------------

    def _parser_reponse(self, texte: str) -> dict:
        """
        Extrait le JSON valide depuis la réponse LLM.
        Supporte les réponses enveloppées dans des balises ```json ... ```.
        """
        texte = texte.strip()
        # Strip markdown code fences
        if texte.startswith("```"):
            lines = texte.split("\n")
            texte = "\n".join(
                line for line in lines
                if not line.strip().startswith("```")
            ).strip()

        try:
            data = json.loads(texte)
        except json.JSONDecodeError:
            # Try to extract JSON object from within the text
            import re
            match = re.search(r'\{.*\}', texte, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group())
                except json.JSONDecodeError as exc:
                    raise _LlmError(f"JSON invalide dans la réponse LLM: {exc}") from exc
            else:
                raise _LlmError("Aucun JSON valide trouvé dans la réponse LLM.")

        if not isinstance(data, dict):
            raise _LlmError("La réponse LLM doit être un objet JSON.")

        # L'objet doit contenir 'items' (ou une liste d'items reformulés)
        if "items" not in data and not any(k in data for k in ("plan_nutrition", "plan_activite")):
            raise _LlmError("Réponse LLM invalide : clé 'items' absente.")

        return data

    # ------------------------------------------------------------------
    # Fallback statique
    # ------------------------------------------------------------------

    def _generer_plan_fallback(self, raison: str = "") -> dict:
        """
        Bascule sur GenerateurPlanSoin (moteur statique de règles).
        Garantit qu'aucun dépistage ne reste sans plan.
        """
        from apps.care_plan.services import GenerateurPlanSoin
        from apps.risk_engine.services import ServiceProtocoleML

        logger.info("Fallback GenerateurPlanSoin (%s)", raison)
        try:
            protocole_ml = ServiceProtocoleML.generer_protocole(self.form)
        except Exception as exc:
            logger.warning("ServiceProtocoleML échoué dans fallback: %s", exc)
            protocole_ml = None

        niveau_risque = self.assessment.get("niveau_risque", "INTERMEDIAIRE")
        nutrition, activite = GenerateurPlanSoin.generer_plans(
            niveau_risqu=niveau_risque,
            facteurs=self.assessment.get("facteurs", []),
            protocole_ml=protocole_ml,
        )

        return {
            "plan_nutrition": nutrition,
            "plan_activite": activite,
            "rapport_nutritionniste": {
                "resume_dossier": (
                    f"Plan généré par le moteur de règles statique "
                    f"(niveau risque: {niveau_risque}). "
                    f"Raison du fallback: {raison}"
                ),
                "points_attention": [],
                "justification_ia": "Plan de règles statiques — LLM non disponible.",
                "sources_donnees": ["formulaire_v2"],
                "requires_medical_referral": bool(
                    protocole_ml and protocole_ml.get("requires_medical_referral")
                ),
                "orientation_medicale": {},
            },
            "metadata": {
                "agent_version": "fallback-static-v1.0",
                "llm_provider": "none",
                "llm_model": "none",
                "dmi_utilise": False,
                "dmi_fhir_id": None,
                "formulaire_version": "2.0",
                "genere_le": datetime.now(timezone.utc).isoformat(),
                "latence_ms": 0,
                "fallback_raison": raison,
            },
        }


# ===========================================================================
# Exceptions internes
# ===========================================================================

class _LlmError(Exception):
    """Erreur non-critique du LLM — déclenche le fallback."""


class _LlmTimeout(_LlmError):
    """Timeout LLM — déclenche le fallback."""
