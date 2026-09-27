"""
seed_fhir_dmi.py — Script de simulation des Dossiers Médicaux Informatisés (DMI) sur HAPI FHIR.

Usage (depuis le dossier backend/) :
    python scripts/seed_fhir_dmi.py [--fhir-url http://localhost:8085/fhir] [--dry-run]

Ce script pousse sur HAPI FHIR des ressources réalistes pour chaque patient de démonstration,
simulant un Dossier Médical Informatisé (DMI) enrichi permettant de tester l'Agent Hybride LLM.

Patients couverts (9 profils cliniques) :
  1. Mohamed Haddad   (TUN10001980) — HTA + dyslipidémie, pré-diabétique
  2. Fatma Belhaj     (TUN10001975) — SOPK, obésité classe II, metformine
  3. Karim Mansouri   (TUN10001968) — Coronaropathie, HTA stade 2
  4. Walid Ben Amor   (TUN10001982) — Asthme léger, santé métabolique correcte
  5. Abdelaziz Jouini (TUN10001955) — IRC stade 3, créatinine élevée
  6. Amel Bouzid      (TUN10001995) — SOPK, surpoids
  7. Moncef Jlassi    (TUN10001970) — DT2 diagnostiqué
  8. Rania Khelifi    (TUN10001988) — Post-partum, ATCD diabète gestationnel
  9. Sana Riahi       (TUN10002001) — Jeune adulte, aucun antécédent
"""

import argparse
import json
import sys
from datetime import date
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# --- Configuration des profils DMI -----------------------------------------

PROFILS_DMI = [
    {
        "ins": "TUN10001980",
        "nom": "Haddad",
        "prenom": "Mohamed",
        "genre": "male",
        "date_naissance": "1980-03-15",
        "conditions": [
            {"code": "I10", "display": "Hypertension artérielle essentielle", "onset": "2019-04"},
            {"code": "E78.2", "display": "Dyslipidémie mixte", "onset": "2020-01"},
        ],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 6.2, "unite": "%", "date": "2026-02-15"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 6.8, "unite": "mmol/L", "date": "2026-02-15"},
            {"code": "13457-7", "display": "LDL Cholestérol", "valeur": 3.8, "unite": "mmol/L", "date": "2026-02-15"},
            {"code": "2160-0", "display": "Créatinine", "valeur": 88.0, "unite": "µmol/L", "date": "2026-02-15"},
            {"code": "55284-4", "display": "PA systolique", "valeur": 145.0, "unite": "mmHg", "date": "2026-03-10"},
        ],
        "medicaments": [
            {"nom": "Ramipril 5mg", "indication": "Hypertension artérielle"},
            {"nom": "Atorvastatine 40mg", "indication": "Dyslipidémie"},
        ],
        "allergies": [],
    },
    {
        "ins": "TUN10001975",
        "nom": "Belhaj",
        "prenom": "Fatma",
        "genre": "female",
        "date_naissance": "1975-07-22",
        "conditions": [
            {"code": "E28.2", "display": "Syndrome des ovaires polykystiques (SOPK)", "onset": "2005-09"},
            {"code": "E66.0", "display": "Obésité morbide due à un excès de calories", "onset": "2018-01"},
            {"code": "R73.09", "display": "Autre hyperglycémie (pré-diabète)", "onset": "2023-06"},
        ],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 6.1, "unite": "%", "date": "2026-01-10"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 6.5, "unite": "mmol/L", "date": "2026-01-10"},
        ],
        "medicaments": [
            {"nom": "Metformine 850mg", "indication": "Pré-diabète SOPK"},
        ],
        "allergies": [
            {"substance": "Pénicilline", "type": "allergy", "categorie": "medication", "criticite": "high"},
        ],
    },
    {
        "ins": "TUN10001968",
        "nom": "Mansouri",
        "prenom": "Karim",
        "genre": "male",
        "date_naissance": "1968-11-05",
        "conditions": [
            {"code": "I10", "display": "Hypertension artérielle essentielle (stade 2)", "onset": "2015-03"},
            {"code": "I25.10", "display": "Coronaropathie sans angine de poitrine", "onset": "2021-08"},
        ],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 5.9, "unite": "%", "date": "2026-03-01"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 6.3, "unite": "mmol/L", "date": "2026-03-01"},
            {"code": "55284-4", "display": "PA systolique", "valeur": 158.0, "unite": "mmHg", "date": "2026-03-01"},
            {"code": "13457-7", "display": "LDL Cholestérol", "valeur": 2.9, "unite": "mmol/L", "date": "2026-03-01"},
        ],
        "medicaments": [
            {"nom": "Bisoprolol 5mg", "indication": "Coronaropathie / HTA"},
            {"nom": "Aspirine 100mg", "indication": "Cardio-protection"},
            {"nom": "Atorvastatine 40mg", "indication": "Dyslipidémie post-coronarienne"},
            {"nom": "Ramipril 10mg", "indication": "HTA / protection cardiaque"},
        ],
        "allergies": [],
    },
    {
        "ins": "TUN10001982",
        "nom": "Ben Amor",
        "prenom": "Walid",
        "genre": "male",
        "date_naissance": "1982-04-18",
        "conditions": [
            {"code": "J45.20", "display": "Asthme léger intermittent", "onset": "2000-09"},
        ],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 5.3, "unite": "%", "date": "2025-11-20"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 5.1, "unite": "mmol/L", "date": "2025-11-20"},
        ],
        "medicaments": [
            {"nom": "Salbutamol spray 100µg", "indication": "Asthme — à la demande"},
        ],
        "allergies": [
            {"substance": "Arachides", "type": "intolerance", "categorie": "food", "criticite": "moderate"},
        ],
    },
    {
        "ins": "TUN10001955",
        "nom": "Jouini",
        "prenom": "Abdelaziz",
        "genre": "male",
        "date_naissance": "1955-01-30",
        "conditions": [
            {"code": "N18.3", "display": "Insuffisance rénale chronique stade 3", "onset": "2017-05"},
            {"code": "I10", "display": "Hypertension artérielle", "onset": "2010-02"},
        ],
        "observations": [
            {"code": "2160-0", "display": "Créatinine", "valeur": 168.0, "unite": "µmol/L", "date": "2026-02-28"},
            {"code": "4548-4", "display": "HbA1c", "valeur": 5.8, "unite": "%", "date": "2026-02-28"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 6.1, "unite": "mmol/L", "date": "2026-02-28"},
        ],
        "medicaments": [
            {"nom": "Amlodipine 10mg", "indication": "HTA"},
            {"nom": "Furosémide 40mg", "indication": "IRC — gestion des œdèmes"},
        ],
        "allergies": [],
    },
    {
        "ins": "TUN10001995",
        "nom": "Bouzid",
        "prenom": "Amel",
        "genre": "female",
        "date_naissance": "1995-08-12",
        "conditions": [
            {"code": "E28.2", "display": "Syndrome des ovaires polykystiques (SOPK)", "onset": "2016-04"},
        ],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 5.6, "unite": "%", "date": "2026-01-15"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 5.8, "unite": "mmol/L", "date": "2026-01-15"},
        ],
        "medicaments": [],
        "allergies": [
            {"substance": "Lactose", "type": "intolerance", "categorie": "food", "criticite": "low"},
        ],
    },
    {
        "ins": "TUN10001970",
        "nom": "Jlassi",
        "prenom": "Moncef",
        "genre": "male",
        "date_naissance": "1970-06-07",
        "conditions": [
            {"code": "E11.9", "display": "Diabète de type 2 sans complication", "onset": "2022-01"},
            {"code": "E78.5", "display": "Hyperlipidémie mixte", "onset": "2020-06"},
        ],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 7.8, "unite": "%", "date": "2026-03-15"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 8.9, "unite": "mmol/L", "date": "2026-03-15"},
        ],
        "medicaments": [
            {"nom": "Metformine 1000mg", "indication": "DT2"},
            {"nom": "Rosuvastatine 20mg", "indication": "Hyperlipidémie"},
        ],
        "allergies": [],
    },
    {
        "ins": "TUN10001988",
        "nom": "Khelifi",
        "prenom": "Rania",
        "genre": "female",
        "date_naissance": "1988-02-14",
        "conditions": [
            {"code": "Z87.59", "display": "ATCD personnel de diabète gestationnel", "onset": "2023-07"},
        ],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 5.7, "unite": "%", "date": "2026-02-10"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 5.9, "unite": "mmol/L", "date": "2026-02-10"},
        ],
        "medicaments": [],
        "allergies": [
            {"substance": "Gluten", "type": "intolerance", "categorie": "food", "criticite": "moderate"},
        ],
    },
    {
        "ins": "TUN10002001",
        "nom": "Riahi",
        "prenom": "Sana",
        "genre": "female",
        "date_naissance": "2001-05-20",
        "conditions": [],
        "observations": [
            {"code": "4548-4", "display": "HbA1c", "valeur": 5.1, "unite": "%", "date": "2026-01-08"},
            {"code": "2339-0", "display": "Glycémie jeun", "valeur": 4.8, "unite": "mmol/L", "date": "2026-01-08"},
        ],
        "medicaments": [],
        "allergies": [],
    },
]


# ─── Helpers FHIR R4 ────────────────────────────────────────────────────────

def _headers():
    return {"Content-Type": "application/fhir+json; charset=utf-8"}


def creer_patient(fhir_url: str, profil: dict, dry_run: bool) -> str | None:
    """Crée ou met à jour un Patient FHIR. Retourne le fhir_patient_id."""
    resource = {
        "resourceType": "Patient",
        "identifier": [
            {
                "system": "urn:oid:wiqayati:ins",
                "value": profil["ins"]
            }
        ],
        "name": [
            {
                "use": "official",
                "family": profil["nom"],
                "given": [profil["prenom"]]
            }
        ],
        "gender": profil["genre"],
        "birthDate": profil["date_naissance"],
        "address": [{"country": "Tunisie"}],
    }

    if dry_run:
        print(f"  [DRY-RUN] Patient {profil['prenom']} {profil['nom']} ({profil['ins']})")
        return f"dry-run-{profil['ins']}"

    try:
        resp = requests.post(f"{fhir_url}/Patient", json=resource, headers=_headers(), timeout=10)
        if resp.status_code in (200, 201):
            fhir_id = resp.json().get("id")
            print(f"  ✓ Patient créé : {profil['prenom']} {profil['nom']} → FHIR ID: {fhir_id}")
            return fhir_id
        else:
            print(f"  ✗ Erreur Patient ({resp.status_code}): {resp.text[:200]}")
    except Exception as exc:
        print(f"  ✗ Connexion échouée: {exc}")
    return None


def creer_condition(fhir_url: str, fhir_patient_id: str, cond: dict, dry_run: bool):
    """Crée une ressource Condition FHIR."""
    onset = cond.get("onset", "")
    resource = {
        "resourceType": "Condition",
        "clinicalStatus": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active"}]
        },
        "code": {
            "coding": [
                {
                    "system": "http://hl7.org/fhir/sid/icd-10",
                    "code": cond["code"],
                    "display": cond["display"]
                }
            ],
            "text": cond["display"]
        },
        "subject": {"reference": f"Patient/{fhir_patient_id}"},
    }
    if onset:
        resource["onsetDateTime"] = f"{onset}-01" if len(onset) == 7 else onset

    if dry_run:
        print(f"    [DRY-RUN] Condition: {cond['display']} ({cond['code']})")
        return

    try:
        resp = requests.post(f"{fhir_url}/Condition", json=resource, headers=_headers(), timeout=10)
        if resp.status_code in (200, 201):
            print(f"    ✓ Condition: {cond['display']} ({cond['code']})")
        else:
            print(f"    ✗ Erreur Condition ({resp.status_code}): {resp.text[:200]}")
    except Exception as exc:
        print(f"    ✗ Connexion échouée (Condition): {exc}")


def creer_observation(fhir_url: str, fhir_patient_id: str, obs: dict, dry_run: bool):
    """Crée une Observation FHIR (bilan biologique)."""
    resource = {
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "laboratory"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": obs.get("code", ""),
                    "display": obs["display"]
                }
            ],
            "text": obs["display"]
        },
        "subject": {"reference": f"Patient/{fhir_patient_id}"},
        "effectiveDateTime": obs["date"],
        "valueQuantity": {
            "value": obs["valeur"],
            "unit": obs["unite"],
            "system": "http://unitsofmeasure.org",
        }
    }

    if dry_run:
        print(f"    [DRY-RUN] Observation: {obs['display']} = {obs['valeur']} {obs['unite']}")
        return

    try:
        resp = requests.post(f"{fhir_url}/Observation", json=resource, headers=_headers(), timeout=10)
        if resp.status_code in (200, 201):
            print(f"    ✓ Observation: {obs['display']} = {obs['valeur']} {obs['unite']}")
        else:
            print(f"    ✗ Erreur Observation ({resp.status_code}): {resp.text[:200]}")
    except Exception as exc:
        print(f"    ✗ Connexion échouée (Observation): {exc}")


def creer_medication(fhir_url: str, fhir_patient_id: str, med: dict, dry_run: bool):
    """Crée un MedicationStatement FHIR."""
    resource = {
        "resourceType": "MedicationStatement",
        "status": "active",
        "medicationCodeableConcept": {
            "text": med["nom"],
            "coding": [{"display": med["nom"]}]
        },
        "subject": {"reference": f"Patient/{fhir_patient_id}"},
        "reasonCode": [{"text": med["indication"]}],
    }

    if dry_run:
        print(f"    [DRY-RUN] Médicament: {med['nom']} — {med['indication']}")
        return

    try:
        resp = requests.post(f"{fhir_url}/MedicationStatement", json=resource, headers=_headers(), timeout=10)
        if resp.status_code in (200, 201):
            print(f"    ✓ Médicament: {med['nom']}")
        else:
            print(f"    ✗ Erreur MedicationStatement ({resp.status_code}): {resp.text[:200]}")
    except Exception as exc:
        print(f"    ✗ Connexion échouée (MedicationStatement): {exc}")


def creer_allergie(fhir_url: str, fhir_patient_id: str, allergie: dict, dry_run: bool):
    """Crée une AllergyIntolerance FHIR."""
    resource = {
        "resourceType": "AllergyIntolerance",
        "patient": {"reference": f"Patient/{fhir_patient_id}"},
        "code": {
            "text": allergie["substance"],
            "coding": [{"display": allergie["substance"]}]
        },
        "type": allergie.get("type", "allergy"),
        "category": [allergie.get("categorie", "food")],
        "criticality": allergie.get("criticite", "low"),
    }

    if dry_run:
        print(f"    [DRY-RUN] Allergie: {allergie['substance']}")
        return

    try:
        resp = requests.post(f"{fhir_url}/AllergyIntolerance", json=resource, headers=_headers(), timeout=10)
        if resp.status_code in (200, 201):
            print(f"    ✓ Allergie: {allergie['substance']}")
        else:
            print(f"    ✗ Erreur AllergyIntolerance ({resp.status_code}): {resp.text[:200]}")
    except Exception as exc:
        print(f"    ✗ Connexion échouée (AllergyIntolerance): {exc}")


# ─── Script principal ────────────────────────────────────────────────────────

def verifier_serveur(fhir_url: str) -> bool:
    """Vérifie que le serveur HAPI FHIR est accessible."""
    try:
        resp = requests.get(f"{fhir_url}/metadata", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✓ Serveur HAPI FHIR accessible : {fhir_url}")
            print(f"  FHIR Version: {data.get('fhirVersion', '?')} | "
                  f"Software: {data.get('software', {}).get('name', '?')}")
            return True
        else:
            print(f"✗ Serveur HAPI FHIR inaccessible ({resp.status_code})")
    except Exception as exc:
        print(f"✗ Impossible de contacter {fhir_url}: {exc}")
    return False


def main():
    parser = argparse.ArgumentParser(
        description="Seed HAPI FHIR avec les DMI des patients de démonstration Wiqayati."
    )
    parser.add_argument(
        "--fhir-url",
        default="http://localhost:8085/fhir",
        help="URL de base du serveur HAPI FHIR (défaut: http://localhost:8085/fhir)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche les ressources à créer sans les envoyer au serveur FHIR."
    )
    parser.add_argument(
        "--patient",
        help="Seeder uniquement le patient avec cet INS (ex: TUN10001980)."
    )
    args = parser.parse_args()

    fhir_url = args.fhir_url.rstrip("/")
    dry_run = args.dry_run

    print(f"\n{'='*72}")
    print("Wiqayati — Seed HAPI FHIR DMI")
    print(f"{'='*72}")
    print(f"URL FHIR  : {fhir_url}")
    print(f"Mode      : {'DRY-RUN (aucune écriture)' if dry_run else 'PRODUCTION (écriture réelle)'}")
    print(f"Patients  : {args.patient or 'tous les 9 profils'}")
    print(f"{'='*72}\n")

    if not dry_run and not verifier_serveur(fhir_url):
        print("\n⚠  Le serveur HAPI FHIR n'est pas accessible. Lancez-le d'abord avec :")
        print("   docker compose -f infra/docker-compose.yml up -d hapi-fhir")
        sys.exit(1)

    profils = PROFILS_DMI
    if args.patient:
        profils = [p for p in profils if p["ins"] == args.patient]
        if not profils:
            print(f"✗ Aucun profil trouvé pour INS={args.patient}")
            sys.exit(1)

    stats = {"patients": 0, "conditions": 0, "observations": 0, "medicaments": 0, "allergies": 0}

    for profil in profils:
        print(f"\n── {profil['prenom']} {profil['nom']} ({profil['ins']}) ──")
        fhir_patient_id = creer_patient(fhir_url, profil, dry_run)
        if not fhir_patient_id:
            print("  ⚠  Abandon (échec de création du patient FHIR)")
            continue
        stats["patients"] += 1

        for cond in profil.get("conditions", []):
            creer_condition(fhir_url, fhir_patient_id, cond, dry_run)
            stats["conditions"] += 1

        for obs in profil.get("observations", []):
            creer_observation(fhir_url, fhir_patient_id, obs, dry_run)
            stats["observations"] += 1

        for med in profil.get("medicaments", []):
            creer_medication(fhir_url, fhir_patient_id, med, dry_run)
            stats["medicaments"] += 1

        for allergie in profil.get("allergies", []):
            creer_allergie(fhir_url, fhir_patient_id, allergie, dry_run)
            stats["allergies"] += 1

    print(f"\n{'='*72}")
    print("Seed terminé.")
    print(f"  Patients    : {stats['patients']}")
    print(f"  Conditions  : {stats['conditions']}")
    print(f"  Observations: {stats['observations']}")
    print(f"  Médicaments : {stats['medicaments']}")
    print(f"  Allergies   : {stats['allergies']}")
    print(f"{'='*72}\n")

    if not dry_run:
        print("Vérification : Consultez http://localhost:8085/fhir/Patient?_count=20 pour valider.")


if __name__ == "__main__":
    main()
