"""
Service et client du moteur de calcul du risque de diabète de type 2.
Respecte scrupuleusement le contrat d'interface figé v1.0 (packages/shared/risk-engine-contract.json).
"""
import uuid
import logging
from typing import Dict, Any, List
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


class ClientMoteurRisque:
    """
    Client de haut niveau pour l'évaluation de risque.
    Bascule de manière transparente entre le stub local et le service externe IA
    selon la valeur de settings.RISK_ENGINE_URL.
    """

    @classmethod
    def evaluer(cls, ins_patient: str, donnees_questionnaire: Dict[str, Any], contexte: Dict[str, Any]) -> Dict[str, Any]:
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
