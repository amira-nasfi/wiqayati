"""
Service et client du moteur de calcul du risque de diabète de type 2.
Respecte scrupuleusement le contrat d'interface figé v1.0 (packages/shared/risk-engine-contract.json).
"""
import bisect
import json
import math
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.utils import timezone
import requests

logger = logging.getLogger(__name__)


class ServiceStubMoteurRisque:
    """
    Implémentation déterministe locale du moteur de risque (stub-1.0).
    Exécuté en local lorsque RISK_ENGINE_URL='internal://stub'.
    """
    VERSION_MOTEUR = "stub-1.0"

    @classmethod
    def evaluer(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        donnees = payload.get("donnees_questionnaire", {})
        request_id = payload.get("request_id", str(uuid.uuid4()))

        score = 0
        facteurs: List[Dict[str, Any]] = []

        # 1. Âge >= 45
        age = donnees.get("age", 0)
        if age >= 45:
            score += 15
            facteurs.append({
                "cle": "age",
                "libelle": f"Âge supérieur ou égal à 45 ans ({age} ans)",
                "poids": 0.15,
                "valeur": age,
                "seuil": 45,
                "direction": "AU_DESSUS"
            })

        # 2. IMC
        imc = donnees.get("imc", 0.0)
        if imc >= 30.0:
            score += 20
            facteurs.append({
                "cle": "imc",
                "libelle": f"Obésité (IMC: {imc:.1f} kg/m²)",
                "poids": 0.20,
                "valeur": imc,
                "seuil": 30.0,
                "direction": "AU_DESSUS"
            })
        elif imc >= 25.0:
            score += 10
            facteurs.append({
                "cle": "imc",
                "libelle": f"Surpoids (IMC: {imc:.1f} kg/m²)",
                "poids": 0.10,
                "valeur": imc,
                "seuil": 25.0,
                "direction": "AU_DESSUS"
            })

        # 3. Antécédents familiaux
        if donnees.get("antecedents_familiaux_diabete") is True:
            score += 20
            facteurs.append({
                "cle": "antecedents_familiaux_diabete",
                "libelle": "Antécédent familial de diabète de type 2 (1er degré)",
                "poids": 0.20,
                "valeur": True,
                "seuil": True,
                "direction": "PRESENT"
            })

        # 4. Hypertension artérielle
        if donnees.get("hypertension_diagnostiquee") is True:
            score += 15
            facteurs.append({
                "cle": "hypertension_diagnostiquee",
                "libelle": "Hypertension artérielle diagnostiquée",
                "poids": 0.15,
                "valeur": True,
                "seuil": True,
                "direction": "PRESENT"
            })

        # 5. Activité physique faible
        activite = donnees.get("niveau_activite_physique")
        if activite == "FAIBLE":
            score += 10
            facteurs.append({
                "cle": "niveau_activite_physique",
                "libelle": "Activité physique insuffisante ou sédentarité",
                "poids": 0.10,
                "valeur": "FAIBLE",
                "seuil": "MODERE",
                "direction": "EN_DESSOUS"
            })

        # 6. Qualité de l'alimentation
        alimentation = donnees.get("qualite_alimentation")
        if alimentation == "MAUVAISE":
            score += 5
            facteurs.append({
                "cle": "qualite_alimentation",
                "libelle": "Habitudes alimentaires déséquilibrées",
                "poids": 0.05,
                "valeur": "MAUVAISE",
                "seuil": "MOYENNE",
                "direction": "EN_DESSOUS"
            })

        # 7. Tabagisme actif
        tabac = donnees.get("statut_tabagisme")
        if tabac == "FUMEUR_ACTUEL":
            score += 5
            facteurs.append({
                "cle": "statut_tabagisme",
                "libelle": "Tabagisme actif",
                "poids": 0.05,
                "valeur": "FUMEUR_ACTUEL",
                "seuil": "JAMAIS",
                "direction": "PRESENT"
            })

        # 8. Acanthosis nigricans
        if donnees.get("acanthosis_nigricans") is True:
            score += 10
            facteurs.append({
                "cle": "acanthosis_nigricans",
                "libelle": "Présence clinique d'Acanthosis nigricans",
                "poids": 0.10,
                "valeur": True,
                "seuil": True,
                "direction": "PRESENT"
            })

        # 9. Diabète gestationnel
        if donnees.get("diabete_gestationnel_antecedent") is True:
            score += 15
            facteurs.append({
                "cle": "diabete_gestationnel_antecedent",
                "libelle": "Antécédent de diabète gestationnel",
                "poids": 0.15,
                "valeur": True,
                "seuil": True,
                "direction": "PRESENT"
            })

        # Plafonnement strict du score entre 0 et 100
        score_final = max(0, min(100, score))

        # Détermination du niveau de risque
        if score_final < 30:
            niveau = "FAIBLE"
        elif score_final < 60:
            niveau = "INTERMEDIAIRE"
        else:
            niveau = "ELEVE"

        return {
            "request_id": str(request_id),
            "niveau_risque": niveau,
            "score": float(score_final),
            "facteurs": facteurs,
            "version_moteur": cls.VERSION_MOTEUR,
            "evalue_le": timezone.now().isoformat()
        }


class ServiceModeleIA:
    """
    Régression logistique DIABSCORE + FINDRISC (v2 slim), entraînée sur NHANES 2017-2020.
    Exécuté en local lorsque RISK_ENGINE_URL='internal://ia'.
    Le score (0-100) est le rang percentile du risque dans la cohorte NHANES : les probabilités
    sont calibrées sur une population américaine et ne doivent pas être affichées telles quelles.
    """
    VERSION_MOTEUR = "ia-2.0"
    CHECKPOINT = Path(__file__).resolve().parent / "ia" / "diabscore_findrisc_v2.json"
    SEUIL_GLYCEMIE_DIABETE = 7.0      # mmol/L : glycémie à jeun évocatrice d'un diabète
    SEUIL_GLYCEMIE_PREDIABETE = 5.6   # mmol/L : hyperglycémie modérée à jeun
    CHAMPS_REQUIS = ["age", "imc", "taille_cm", "tour_taille_cm", "tour_hanches_cm"]
    LIBELLES = {
        "diabscore": "DIABSCORE (âge, tour de taille / taille, antécédents familiaux et gestationnels)",
        "bmi": "Indice de masse corporelle élevé",
        "waist_hip": "Rapport tour de taille / tour de hanches élevé",
        "inactive": "Activité physique insuffisante ou sédentarité",
        "bp_meds": "Hypertension artérielle diagnostiquée",
        "high_glucose_hist": "Glycémie à jeun modérément élevée (pré-diabète)",
    }
    _ckpt = None

    @classmethod
    def checkpoint(cls) -> Dict[str, Any]:
        if cls._ckpt is None:
            cls._ckpt = json.loads(cls.CHECKPOINT.read_text())
        return cls._ckpt

    @classmethod
    def evaluer(cls, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Renvoie None si les mesures nécessaires au modèle manquent (repli sur le stub)."""
        donnees = payload.get("donnees_questionnaire", {})
        if any(not donnees.get(c) for c in cls.CHAMPS_REQUIS):
            return None
        ck = cls.checkpoint()

        glycemie = donnees.get("glycemie_jeun_mmol") if donnees.get("glycemie_jeun_connue") else None
        x = {
            "diabscore": (float(donnees["age"])
                          + 100 * float(donnees["tour_taille_cm"]) / float(donnees["taille_cm"])
                          + 10 * bool(donnees.get("antecedents_familiaux_diabete"))
                          + 25 * bool(donnees.get("diabete_gestationnel_antecedent"))),
            "bmi": float(donnees["imc"]),
            "waist_hip": float(donnees["tour_taille_cm"]) / float(donnees["tour_hanches_cm"]),
            "inactive": float(donnees.get("niveau_activite_physique") == "FAIBLE"),
            "bp_meds": float(bool(donnees.get("hypertension_diagnostiquee"))),
            "high_glucose_hist": float(glycemie is not None
                                       and cls.SEUIL_GLYCEMIE_PREDIABETE <= glycemie < cls.SEUIL_GLYCEMIE_DIABETE),
        }
        contributions = {
            f: coef * (x[f] - moy) / ecart
            for f, coef, moy, ecart in zip(ck["features"], ck["coef"], ck["mean"], ck["scale"])
        }
        p = 1 / (1 + math.exp(-(ck["intercept"] + sum(contributions.values()))))
        score = min(100, bisect.bisect_left(ck["score_quantiles"], p))

        if p < ck["threshold"]:
            niveau = "FAIBLE"
        elif score >= ck["eleve_percentile"]:
            niveau = "ELEVE"
        else:
            niveau = "INTERMEDIAIRE"

        # Facteurs : contributions positives au logit, normalisées pour sommer à 1
        positives = {f: c for f, c in contributions.items() if c > 0}
        total = sum(positives.values())
        facteurs: List[Dict[str, Any]] = []
        for f, c in sorted(positives.items(), key=lambda kv: -kv[1]):
            binaire = f in ("inactive", "bp_meds", "high_glucose_hist")
            facteurs.append({
                "cle": f,
                "libelle": cls.LIBELLES[f],
                "poids": round(c / total, 3),
                "valeur": bool(x[f]) if binaire else round(x[f], 2),
                "seuil": True if binaire else round(ck["mean"][ck["features"].index(f)], 2),
                "direction": "PRESENT" if binaire else "AU_DESSUS",
            })

        # Glycémie à jeun >= 7 mmol/L : diabète probable, orientation prioritaire quel que soit le modèle
        if glycemie is not None and glycemie >= cls.SEUIL_GLYCEMIE_DIABETE:
            niveau, score = "ELEVE", 100
            facteurs.insert(0, {
                "cle": "glycemie_jeun_mmol",
                "libelle": f"Glycémie à jeun évocatrice d'un diabète ({glycemie} mmol/L)",
                "poids": 1.0,
                "valeur": glycemie,
                "seuil": cls.SEUIL_GLYCEMIE_DIABETE,
                "direction": "AU_DESSUS"
            })

        return {
            "request_id": str(payload.get("request_id", uuid.uuid4())),
            "niveau_risque": niveau,
            "score": float(score),
            "facteurs": facteurs,
            "version_moteur": cls.VERSION_MOTEUR,
            "evalue_le": timezone.now().isoformat()
        }


class ClientMoteurRisque:
    """
    Client de haut niveau pour l'évaluation de risque.
    Bascule de manière transparente entre le stub local et le service externe IA
    selon la valeur de settings.RISK_ENGINE_URL.
    """

    @classmethod
    def evaluer(
        cls, ins_patient: str, donnees_questionnaire: Dict[str, Any], contexte: Dict[str, Any]
    ) -> Dict[str, Any]:
        request_id = str(uuid.uuid4())
        payload = {
            "request_id": request_id,
            "ins_patient": ins_patient,
            "version_questionnaire": "1.0",
            "donnees_questionnaire": donnees_questionnaire,
            "contexte": contexte
        }

        url = getattr(settings, 'RISK_ENGINE_URL', 'internal://stub')

        if not url or url == 'internal://stub':
            return ServiceStubMoteurRisque.evaluer(payload)

        if url == 'internal://ia':
            try:
                resultat = ServiceModeleIA.evaluer(payload)
            except Exception as exc:
                logger.exception("Échec du modèle IA local, repli sur le stub: %s", exc)
                resultat = None
            return resultat or ServiceStubMoteurRisque.evaluer(payload)

        # Appel distant vers le module IA externe
        try:
            endpoint = url.rstrip('/') + '/risk-engine/evaluer'
            response = requests.post(endpoint, json=payload, timeout=3.0)
            if response.status_code == 200:
                data = response.json()
                return data
            logger.error("Erreur HTTP %s depuis le moteur distant: %s", response.status_code, response.text)
            # Repli de sécurité (failover) sur le stub déterministe
            return ServiceStubMoteurRisque.evaluer(payload)
        except Exception as exc:
            logger.exception("Échec d'appel du moteur externe IA, repli sur le stub: %s", exc)
            return ServiceStubMoteurRisque.evaluer(payload)
