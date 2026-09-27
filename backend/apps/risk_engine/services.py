"""
Service et client du moteur de calcul du risque de diabète de type 2.
Respecte scrupuleusement le contrat d'interface figé v1.0 (packages/shared/risk-engine-contract.json).

Modes disponibles via settings.RISK_ENGINE_URL :
  - 'internal://stub'   → Stub déterministe local (défaut de sécurité)
  - 'internal://ml'     → Moteur IA ML local (FINDRISC + XGBoost NHANES)
  - 'https://...'       → Service distant (appel HTTP)
"""
import uuid
import os
import sys
import logging
import warnings
from typing import Dict, Any, List
from django.conf import settings
from django.utils import timezone
import requests

logger = logging.getLogger(__name__)

# Chemin absolu vers le sous-répertoire ml/ contenant le moteur IA
_ML_DIR = os.path.join(os.path.dirname(__file__), "ml")


class ServiceStubMoteurRisque:
    """
    Implémentation déterministe locale du moteur de risque (stub-1.0).
    Exécuté en local lorsque RISK_ENGINE_URL='internal://stub'.
    Sert aussi de fallback automatique si le moteur ML échoue.
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


class ServiceMLMoteurRisque:
    """
    Moteur de risque IA in-process basé sur :
      - FINDRISC (score clinique, risque à 10 ans)
      - DIABSCORE (score bioclinique de pré-diabète)
      - Détecteur XGBoost + Calibration Isotonique (dysglycémie actuelle)
    Lit les fichiers modèles depuis apps/risk_engine/ml/model/
    Effectue un fallback automatique sur le stub en cas d'erreur.
    """
    VERSION_MOTEUR = "wq-ml-1.0"
    _adapter = None

    @classmethod
    def _load_adapter(cls):
        """Import lazy du module wq_adapter (évite les imports au démarrage Django)."""
        if cls._adapter is not None:
            return cls._adapter

        if _ML_DIR not in sys.path:
            sys.path.insert(0, _ML_DIR)

        # Supprimer les InconsistentVersionWarnings de sklearn (version mismatch mineur)
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
            import importlib
            adapter = importlib.import_module("wq_adapter")

        cls._adapter = adapter
        logger.info("Moteur IA Diabète (wq-ml-1.0) chargé depuis %s", _ML_DIR)
        return cls._adapter

    @classmethod
    def _sanitize(cls, obj):
        """
        Nettoie récursivement les types non-JSON-sérialisables (ex: Ellipsis, np.float64).
        """
        if obj is ...:
            return None
        if isinstance(obj, dict):
            return {k: cls._sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [cls._sanitize(i) for i in obj]
        # numpy scalars → python native
        try:
            import numpy as np
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.bool_):
                return bool(obj)
        except ImportError:
            pass
        return obj

    @classmethod
    def evaluer(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Évalue le risque de diabète via le moteur IA ML.
        Retourne une réponse conforme au contrat v1.0 + clé _supplement avec
        les données enrichies (FINDRISC, DIABSCORE, probabilité détecteur ML).
        """
        try:
            adapter = cls._load_adapter()
            # Changer temporairement le CWD pour que les chemins relatifs model/ fonctionnent
            original_cwd = os.getcwd()
            try:
                os.chdir(_ML_DIR)
                result = adapter.run_pipeline(payload)
            finally:
                os.chdir(original_cwd)

            return cls._sanitize(result)

        except Exception as exc:
            logger.exception(
                "Erreur du moteur IA ML (wq-ml-1.0), basculement sur le stub: %s", exc
            )
            return None  # Signal de fallback pour ClientMoteurRisque


class ServiceProtocoleML:
    """
    Génère un protocole de soins personnalisé via protocol_engine.py.
    Utilisé par apps.care_plan pour enrichir les plans de soins.
    """

    @classmethod
    def generer_protocole(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Retourne le protocole complet avec items d'activité, recommandations
        nutritionnelles, urgences et critères d'orientation médicale.
        """
        try:
            if _ML_DIR not in sys.path:
                sys.path.insert(0, _ML_DIR)

            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
                import importlib
                adapter = importlib.import_module("wq_adapter")

            original_cwd = os.getcwd()
            try:
                os.chdir(_ML_DIR)
                result = adapter.generate_wiqayati_protocol(payload)
            finally:
                os.chdir(original_cwd)

            return ServiceMLMoteurRisque._sanitize(result)

        except Exception as exc:
            logger.exception("Erreur génération protocole ML: %s", exc)
            return None


class ClientMoteurRisque:
    """
    Client de haut niveau pour l'évaluation de risque.
    Bascule de manière transparente entre les moteurs :
      1. internal://ml   → Moteur IA ML local (recommandé)
      2. internal://stub → Stub déterministe (fallback ou développement)
      3. https://...     → Service distant

    En cas d'échec du moteur ML ou du service distant, bascule
    automatiquement et silencieusement sur le stub.
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

        url = getattr(settings, 'RISK_ENGINE_URL', 'internal://ml')

        # --- Mode ML local ---
        if url == 'internal://ml':
            result = ServiceMLMoteurRisque.evaluer(payload)
            if result is not None:
                logger.info(
                    "Évaluation ML OK | ins=%s | score=%.1f | niveau=%s",
                    ins_patient, result.get("score", 0), result.get("niveau_risque")
                )
                return result
            # Fallback silencieux sur le stub
            logger.warning("Basculement sur stub (moteur ML indisponible) pour ins=%s", ins_patient)
            return ServiceStubMoteurRisque.evaluer(payload)

        # --- Mode stub local ---
        if not url or url == 'internal://stub':
            return ServiceStubMoteurRisque.evaluer(payload)

        # --- Mode service distant ---
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
