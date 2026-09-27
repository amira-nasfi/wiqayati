"""
Client HAPI FHIR R4 pour la synchronisation des ressources de santé.
Structure standardisée : Patient, QuestionnaireResponse, RiskAssessment, CarePlan, Task.
Lecture DMI (Dossier Médical Informatisé) : Conditions, Observations, MedicationStatements, AllergyIntolerances.
"""
import logging
import requests
from django.conf import settings
from typing import Dict, Any, Optional, List

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

    # =========================================================================
    # Méthodes de LECTURE DMI (Dossier Médical Informatisé)
    # Lecture seule — n'écrivent jamais sur FHIR
    # =========================================================================

    @classmethod
    def lire_dossier_patient(cls, ins: str) -> dict:
        """
        Lit l'ensemble du dossier clinique pour un patient identifié par INS.
        Agrège : Conditions, Observations, MedicationStatements, AllergyIntolerances.
        Retourne un ContexteDMI structuré ou {"dmi_disponible": False} si FHIR indisponible
        ou si aucun patient n'est trouvé avec cet INS.
        """
        if not getattr(settings, 'FHIR_ENABLED', True):
            return {"dmi_disponible": False}

        try:
            fhir_patient_id = cls.rechercher_patient_fhir(ins)
            if not fhir_patient_id:
                return {"dmi_disponible": False}

            conditions = cls.lire_conditions(fhir_patient_id)
            observations = cls.lire_observations(fhir_patient_id)
            medicaments = cls.lire_medicaments(fhir_patient_id)
            allergies = cls.lire_allergies(fhir_patient_id)

            # Résumé clinique textuel
            cond_libelles = ", ".join(
                c.get("libelle", c.get("code", "")) for c in conditions
            ) if conditions else "Aucune condition documentée"
            hba1c_val = next(
                (o.get("valeur") for o in observations
                 if "hba1c" in (o.get("code") or "").lower() or "hba" in (o.get("code") or "").lower()),
                None
            )
            resume = f"Patient avec INS {ins}."
            if conditions:
                resume += f" Conditions actives : {cond_libelles}."
            if hba1c_val is not None:
                resume += f" HbA1c : {hba1c_val}%."

            return {
                "dmi_disponible": True,
                "fhir_patient_id": fhir_patient_id,
                "conditions": conditions,
                "observations": observations,
                "medicaments": medicaments,
                "allergies": allergies,
                "resume_clinique": resume,
            }
        except Exception as exc:
            logger.warning("Erreur lors de la lecture du dossier DMI (INS=%s): %s", ins, exc)
            return {"dmi_disponible": False}

    @classmethod
    def rechercher_patient_fhir(cls, ins: str) -> Optional[str]:
        """Recherche un Patient FHIR par identifiant INS. Retourne le fhir_patient_id ou None."""
        url = f"{cls.get_base_url()}/Patient"
        params = {"identifier": f"urn:oid:wiqayati:ins|{ins}"}
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                bundle = resp.json()
                entries = bundle.get("entry", [])
                if entries:
                    return entries[0]["resource"]["id"]
        except Exception as exc:
            logger.warning("Recherche Patient FHIR échouée (INS=%s): %s", ins, exc)
        return None

    @classmethod
    def lire_conditions(cls, fhir_patient_id: str) -> List[dict]:
        """Conditions actives du patient (pathologies en cours)."""
        url = f"{cls.get_base_url()}/Condition"
        params = {"patient": fhir_patient_id, "clinical-status": "active", "_count": "50"}
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                bundle = resp.json()
                results = []
                for entry in bundle.get("entry", []):
                    resource = entry.get("resource", {})
                    coding = (resource.get("code", {}).get("coding") or [{}])[0]
                    onset = (
                        resource.get("onsetDateTime", "")
                        or resource.get("onsetPeriod", {}).get("start", "")
                    )
                    # Extract YYYY-MM from onset date
                    onset_short = onset[:7] if onset else None
                    results.append({
                        "code": coding.get("code", ""),
                        "libelle": (
                            coding.get("display")
                            or resource.get("code", {}).get("text", "")
                            or coding.get("code", "")
                        ),
                        "statut": "active",
                        "onset": onset_short,
                    })
                return results
        except Exception as exc:
            logger.warning("Lecture Conditions FHIR échouée (patient=%s): %s", fhir_patient_id, exc)
        return []

    @classmethod
    def lire_observations(cls, fhir_patient_id: str) -> List[dict]:
        """Observations biologiques récentes (≤ 12 mois de préférence)."""
        url = f"{cls.get_base_url()}/Observation"
        params = {
            "patient": fhir_patient_id,
            "category": "laboratory",
            "_sort": "-date",
            "_count": "30",
        }
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                bundle = resp.json()
                results = []
                for entry in bundle.get("entry", []):
                    resource = entry.get("resource", {})
                    coding = (resource.get("code", {}).get("coding") or [{}])[0]
                    value_qty = resource.get("valueQuantity", {})
                    interp = (resource.get("interpretation") or [{}])[0]
                    interp_code = (interp.get("coding") or [{}])[0].get("code", "")
                    results.append({
                        "code": (
                            coding.get("display")
                            or resource.get("code", {}).get("text", "")
                            or coding.get("code", "")
                        ),
                        "valeur": value_qty.get("value"),
                        "unite": value_qty.get("unit", ""),
                        "date": resource.get("effectiveDateTime", "")[:10],
                        "interpretation": interp_code,
                    })
                return results
        except Exception as exc:
            logger.warning("Lecture Observations FHIR échouée (patient=%s): %s", fhir_patient_id, exc)
        return []

    @classmethod
    def lire_medicaments(cls, fhir_patient_id: str) -> List[dict]:
        """MedicationStatement actifs du patient."""
        url = f"{cls.get_base_url()}/MedicationStatement"
        params = {"patient": fhir_patient_id, "status": "active", "_count": "30"}
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                bundle = resp.json()
                results = []
                for entry in bundle.get("entry", []):
                    resource = entry.get("resource", {})
                    med = resource.get("medicationCodeableConcept", {})
                    coding = (med.get("coding") or [{}])[0]
                    nom = (
                        coding.get("display")
                        or med.get("text", "")
                        or coding.get("code", "Médicament inconnu")
                    )
                    indication = ""
                    for reason in resource.get("reasonCode", []):
                        reason_coding = (reason.get("coding") or [{}])[0]
                        indication = reason_coding.get("display") or reason.get("text", "")
                        if indication:
                            break
                    results.append({
                        "nom": nom,
                        "indication": indication,
                        "statut": resource.get("status", "active"),
                    })
                return results
        except Exception as exc:
            logger.warning("Lecture MedicationStatement FHIR échouée (patient=%s): %s", fhir_patient_id, exc)
        return []

    @classmethod
    def lire_allergies(cls, fhir_patient_id: str) -> List[dict]:
        """AllergyIntolerance documentées pour le patient."""
        url = f"{cls.get_base_url()}/AllergyIntolerance"
        params = {"patient": fhir_patient_id, "_count": "20"}
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                bundle = resp.json()
                results = []
                for entry in bundle.get("entry", []):
                    resource = entry.get("resource", {})
                    code = resource.get("code", {})
                    coding = (code.get("coding") or [{}])[0]
                    nom = (
                        coding.get("display")
                        or code.get("text", "")
                        or coding.get("code", "Allergie inconnue")
                    )
                    results.append({
                        "substance": nom,
                        "type": resource.get("type", ""),
                        "categorie": (resource.get("category") or [""])[0],
                        "criticite": resource.get("criticality", ""),
                    })
                return results
        except Exception as exc:
            logger.warning("Lecture AllergyIntolerance FHIR échouée (patient=%s): %s", fhir_patient_id, exc)
        return []
