"""
Client HAPI FHIR R4 pour la synchronisation des ressources de santé.
Structure standardisée : Patient, QuestionnaireResponse, RiskAssessment, CarePlan, Task.
"""
import logging
import requests
from django.conf import settings
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class ClientHapiFhir:
    """
    Client HTTP pour communiquer avec le serveur HAPI FHIR R4.
    """

    @classmethod
    def get_base_url(cls) -> str:
        return getattr(settings, 'FHIR_SERVER_URL', 'http://localhost:8085/fhir').rstrip('/')

    @classmethod
    def creer_ou_maj_patient(cls, patient_data: Dict[str, Any], fhir_id: Optional[str] = None) -> Optional[str]:
        """
        Crée ou met à jour une ressource FHIR Patient indexée par l'INS.
        """
        url = f"{cls.get_base_url()}/Patient"
        headers = {"Content-Type": "application/fhir+json; charset=utf-8"}

        resource = {
            "resourceType": "Patient",
            "identifier": [
                {
                    "system": "urn:oid:wiqayati:ins",
                    "value": patient_data["ins"]
                }
            ],
            "name": [
                {
                    "use": "official",
                    "family": patient_data["nom"],
                    "given": [patient_data["prenom"]]
                }
            ],
            "gender": "male" if patient_data["genre"] == "M" else "female",
            "birthDate": str(patient_data["date_naissance"]),
            "address": [
                {
                    "state": patient_data["gouvernorat"],
                    "country": "Tunisie"
                }
            ]
        }
        if patient_data.get("telephone"):
            resource["telecom"] = [{"system": "phone", "value": patient_data["telephone"]}]

        try:
            if fhir_id:
                resource["id"] = fhir_id
                resp = requests.put(f"{url}/{fhir_id}", json=resource, headers=headers, timeout=5)
            else:
                resp = requests.post(url, json=resource, headers=headers, timeout=5)

            if resp.status_code in (200, 201):
                return resp.json().get("id")
            logger.error("Erreur FHIR Patient (%s): %s", resp.status_code, resp.text)
        except Exception as exc:
            logger.warning("Échec de connexion HAPI FHIR Patient: %s", exc)
        return None

    @classmethod
    def creer_questionnaire_response(cls, fhir_patient_id: str, screening_data: Dict[str, Any]) -> Optional[str]:
        """Crée une ressource FHIR QuestionnaireResponse."""
        url = f"{cls.get_base_url()}/QuestionnaireResponse"
        headers = {"Content-Type": "application/fhir+json; charset=utf-8"}

        resource = {
            "resourceType": "QuestionnaireResponse",
            "status": "completed",
            "subject": {"reference": f"Patient/{fhir_patient_id}"},
            "authored": screening_data.get("soumis_le"),
            "item": [
                {"linkId": k, "text": k, "answer": [{"valueString": str(v)}]}
                for k, v in screening_data.get("donnees", {}).items()
            ]
        }

        try:
            resp = requests.post(url, json=resource, headers=headers, timeout=5)
            if resp.status_code in (200, 201):
                return resp.json().get("id")
        except Exception as exc:
            logger.warning("Échec de connexion HAPI FHIR QuestionnaireResponse: %s", exc)
        return None

    @classmethod
    def creer_risk_assessment(cls, fhir_patient_id: str, risk_data: Dict[str, Any]) -> Optional[str]:
        """Crée une ressource FHIR RiskAssessment."""
        url = f"{cls.get_base_url()}/RiskAssessment"
        headers = {"Content-Type": "application/fhir+json; charset=utf-8"}

        resource = {
            "resourceType": "RiskAssessment",
            "status": "final",
            "subject": {"reference": f"Patient/{fhir_patient_id}"},
            "occurrenceDateTime": risk_data.get("evalue_le"),
            "prediction": [
                {
                    "outcome": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "44054006",
                                "display": "Type 2 diabetes mellitus"
                            }
                        ],
                        "text": f"Risque de diabète de type 2 : {risk_data['niveau_risque']}"
                    },
                    "probabilityDecimal": round(risk_data["score"] / 100.0, 2),
                    "qualitativeRisk": {
                        "text": risk_data["niveau_risque"]
                    }
                }
            ],
            "note": [{"text": f"Version moteur: {risk_data.get('version_moteur', 'stub-1.0')}"}]
        }

        try:
            resp = requests.post(url, json=resource, headers=headers, timeout=5)
            if resp.status_code in (200, 201):
                return resp.json().get("id")
        except Exception as exc:
            logger.warning("Échec de connexion HAPI FHIR RiskAssessment: %s", exc)
        return None

    @classmethod
    def creer_ou_maj_care_plan(
        cls, fhir_patient_id: str, plan_data: Dict[str, Any], fhir_id: Optional[str] = None
    ) -> Optional[str]:
        """Crée ou met à jour une ressource FHIR CarePlan."""
        url = f"{cls.get_base_url()}/CarePlan"
        headers = {"Content-Type": "application/fhir+json; charset=utf-8"}

        resource = {
            "resourceType": "CarePlan",
            "status": "active" if plan_data["statut"] == "VALIDE" else "draft",
            "intent": "plan",
            "title": "Plan de soin personnalisé Wiqayati",
            "subject": {"reference": f"Patient/{fhir_patient_id}"},
            "description": plan_data.get("notes_nutritionniste", ""),
            "activity": [
                {
                    "detail": {
                        "kind": "NutritionOrder",
                        "description": str(plan_data.get("plan_nutrition", {}))
                    }
                },
                {
                    "detail": {
                        "kind": "ServiceRequest",
                        "description": str(plan_data.get("plan_activite", {}))
                    }
                }
            ]
        }

        try:
            if fhir_id:
                resource["id"] = fhir_id
                resp = requests.put(f"{url}/{fhir_id}", json=resource, headers=headers, timeout=5)
            else:
                resp = requests.post(url, json=resource, headers=headers, timeout=5)

            if resp.status_code in (200, 201):
                return resp.json().get("id")
        except Exception as exc:
            logger.warning("Échec de connexion HAPI FHIR CarePlan: %s", exc)
        return None
