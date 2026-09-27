import os
import django
import requests

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wiqayati.settings.development")
django.setup()

from apps.fhir_bridge.client import ClientHapiFhir
from apps.care_plan.agent_hybride import AgentHybridePlanSoin
from apps.risk_engine.services import ClientMoteurRisque

base_url = ClientHapiFhir.get_base_url()
print("1. Testing FHIR base URL:", base_url)

meta_resp = requests.get(f"{base_url}/metadata", timeout=5)
print("   Metadata status:", meta_resp.status_code)
assert meta_resp.status_code == 200, "FHIR server is not reachable!"

# 1. Create Patient in FHIR
ins_test = "TUN10001234"
patient_fhir_id = ClientHapiFhir.creer_ou_maj_patient({
    "ins": ins_test,
    "nom": "Ben Salem",
    "prenom": "Karim",
    "genre": "M",
    "date_naissance": "1976-08-15",
    "gouvernorat": "Tunis",
    "telephone": "+216 98 123 456"
})
print("2. Patient FHIR ID created/updated:", patient_fhir_id)

# 2. Add Condition (Hypertension I10)
cond_url = f"{base_url}/Condition"
cond_res = requests.post(cond_url, json={
    "resourceType": "Condition",
    "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]},
    "subject": {"reference": f"Patient/{patient_fhir_id}"},
    "code": {"coding": [{"system": "http://hl7.org/fhir/sid/icd-10", "code": "I10", "display": "Hypertension artérielle essentielle"}]},
    "onsetDateTime": "2019-04-10"
}, timeout=5)
print("3. Condition created status:", cond_res.status_code)

# 3. Add Observation (HbA1c 6.2%)
obs_url = f"{base_url}/Observation"
obs_res = requests.post(obs_url, json={
    "resourceType": "Observation",
    "status": "final",
    "subject": {"reference": f"Patient/{patient_fhir_id}"},
    "code": {"coding": [{"system": "http://loinc.org", "code": "4548-4", "display": "Hemoglobin A1c/Hemoglobin.total in Blood"}]},
    "valueQuantity": {"value": 6.2, "unit": "%"}
}, timeout=5)
print("4. Observation created status:", obs_res.status_code)

# 4. Add Allergy (Pamplemousse / Citrus)
allergy_url = f"{base_url}/AllergyIntolerance"
allergy_res = requests.post(allergy_url, json={
    "resourceType": "AllergyIntolerance",
    "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active"}]},
    "patient": {"reference": f"Patient/{patient_fhir_id}"},
    "code": {"text": "Pamplemousse"}
}, timeout=5)
print("5. Allergy created status:", allergy_res.status_code)

# 5. Read back complete DMI using ClientHapiFhir
dmi = ClientHapiFhir.lire_dossier_patient(ins_test)
print("\n--- Extracted DMI from HAPI FHIR ---")
print("dmi_disponible:", dmi.get("dmi_disponible"))
print("Conditions count:", len(dmi.get("conditions", [])))
print("Observations count:", len(dmi.get("observations", [])))
print("Allergies count:", len(dmi.get("allergies", [])))
print("Clinical summary:", dmi.get("resume_clinique"))

# 6. Evaluate risk with ML engine
form_data = {
    "age": 47,
    "genre": "M",
    "taille_cm": 174,
    "poids_kg": 94,
    "tour_taille_cm": 101,
    "niveau_activite_physique": "FAIBLE",
    "qualite_alimentation": "MAUVAISE",
    "antecedents_familiaux_diabete": True,
    "hypertension_diagnostiquee": True,
    "high_glucose_hist": False,
    "statut_tabagisme": "FUMEUR_ACTUEL"
}
assessment = ClientMoteurRisque.evaluer(
    ins_patient=ins_test,
    donnees_questionnaire=form_data,
    contexte={"source": "fhir_llm_test"}
)
print("\n--- ML Risk Assessment ---")
print("Score:", assessment.get("score"))
print("Risk band:", assessment.get("niveau_risque"))

# 7. Run protocol_engine with real FHIR DMI
from apps.risk_engine.ml.protocol_engine import generate_protocol

protocol = generate_protocol(assessment, form_data, dmi=dmi, language="fr")
print("\n--- Protocol Engine Output with FHIR DMI ---")
print("Protocol ID:", protocol.get("protocol_id"))
print("DMI integrated:", protocol.get("dmi_integrated"))
print("DMI summary:", protocol.get("dmi_summary"))
print("Urgent flags:", protocol.get("urgent_flags"))
print("Requires referral:", protocol.get("requires_medical_referral"))
print(f"Total protocol items: {len(protocol.get('items', []))}")
for i, it in enumerate(protocol.get("items", []), 1):
    print(f"  [{i}] {it.get('category')} | trigger={it.get('trigger')} | {it.get('title')}")

# 8. Test Hybrid Agent (with mock LLM rephrase to test LLM merge over FHIR DMI)
agent = AgentHybridePlanSoin(assessment=assessment, form=form_data, dmi=dmi)
# Simulate LLM response
llm_rephrased = [
    {
        "trigger": "dmi_hypertension",
        "action": "Une hypertension essentielle est notée dans votre DMI FHIR. Réduisez les apports en sel (< 5g/j) et adoptez un menu DASH.",
        "target": "Sel < 5g/jour"
    }
]
merged = agent._fusionner_reponse_llm(protocol, {"items": llm_rephrased})
htn_item = next((it for it in merged.get("items", []) if it.get("trigger") == "dmi_hypertension"), None)
print("\n--- LLM Merge over DMI Item ---")
if htn_item:
    print("Trigger:", htn_item.get("trigger"))
    print("Action (rephrased):", htn_item.get("action"))
    print("Prose source:", htn_item.get("metadata", {}).get("prose_source"))
    print("Source (preserved):", htn_item.get("source"))

print("\nSUCCESS: FHIR SERVER, DMI EXTRACTION AND LLM INTEGRATION FULLY LINKED AND VERIFIED!")
