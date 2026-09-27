"""
wq_adapter.py - WiQayati <-> diabetes-risk-screening adapter.

Translates between:
  - WiQayati's French 14-variable payload (contract v1.0)
  - Our English feature dict (risk_engine.assess format)

Two public functions:
  wiqayati_to_our_form(payload)       -> form dict for assess()
  our_assessment_to_wiqayati(...)     -> WiQayati response contract

Two optional helpers for two-way integration:
  generate_wiqayati_protocol(...)     -> protocol + WiQayati CarePlan hints
  health()                            -> simple status dict

Notes:
  * WiQayati's form lacks `taille_cm` (height) and `high_glucose_hist`
    (ever told blood sugar high). Both are strongly recommended additions.
    When absent, the adapter falls back gracefully:
      - no taille_cm      -> DIABSCORE returns None, detector loses WHtR
      - no high_glucose   -> that feature is treated as False
  * The 0-100 score is a deterministic blend. See _score_100() for the
    formula. Clinical review of the weights is pending.
"""
import sys
from pathlib import Path
from datetime import datetime, timezone
import uuid

_THIS_DIR = str(Path(__file__).resolve().parent)
if _THIS_DIR not in sys.path:
    sys.path.insert(0, _THIS_DIR)


# ===========================================================================
# INPUT SIDE - WiQayati payload -> our form dict
# ===========================================================================

def _mmol_to_mgdl(mmol):
    """Convert mmol/L glucose to mg/dL. Used by interpret_glucose()."""
    if mmol is None:
        return None
    try:
        return round(float(mmol) * 18.0, 1)
    except (TypeError, ValueError):
        return None


def wiqayati_to_our_form(payload: dict) -> dict:
    """
    Take the WiQayati `donnees_questionnaire` dict and return the form dict
    that risk_engine.assess() expects.

    `payload` here is the INNER questionnaire dict, not the full envelope.
    """
    q = payload  # the donnees_questionnaire block

    age = int(q.get("age", 0))
    sex = q.get("genre", "F")
    if sex == "AUTRE":
        sex = "F"  # assume female by default; treated downstream as non-male

    height_cm = None
    if q.get("taille_cm"):
        try:
            height_cm = float(q.get("taille_cm"))
        except (TypeError, ValueError):
            height_cm = None

    weight_kg = None
    if q.get("poids_kg"):
        try:
            weight_kg = float(q.get("poids_kg"))
        except (TypeError, ValueError):
            weight_kg = None

    imc = q.get("imc")
    if weight_kg and height_cm and not imc:
        try:
            imc = round(weight_kg / ((height_cm / 100.0) ** 2), 1)
        except ZeroDivisionError:
            imc = 22.0

    if height_cm is None:
        height_cm = 170.0  # Valeur par défaut de référence
    if weight_kg is None and imc:
        try:
            weight_kg = round(float(imc) * (float(height_cm) / 100.0) ** 2, 1)
        except (TypeError, ValueError):
            weight_kg = 70.0

    waist_cm = q.get("tour_taille_cm")

    # Glucose: only usable if fasting AND value provided.
    glucose_mgdl = None
    glucose_fasting = None
    if q.get("glycemie_jeun_connue") and q.get("glycemie_jeun_mmol") is not None:
        glucose_mgdl = _mmol_to_mgdl(q.get("glycemie_jeun_mmol"))
        glucose_fasting = True

    # Family history: WiQayati is boolean, we distinguish 1st vs 2nd degree.
    family = "first_degree" if q.get("antecedents_familiaux_diabete") else "none"

    # Symptoms: WiQayati's standard form does not capture them.
    symptoms = q.get("symptoms", [])

    sbp = None
    if q.get("sbp"):
        try:
            sbp = float(q.get("sbp"))
        except (TypeError, ValueError):
            sbp = None

    bp_meds = bool(q.get("prise_antihypertenseur")) if "prise_antihypertenseur" in q else bool(q.get("hypertension_diagnostiquee"))

    return {
        "age": age,
        "sex": sex,
        "pregnant": False,
        "known_diabetes": False,  # screening is for people not yet diagnosed

        "weight_kg": weight_kg,
        "height_cm": height_cm,
        "bmi": float(imc) if imc else 22.0,
        "waist_cm": waist_cm,

        # FINDRISC items
        "active_30min_daily": q.get("niveau_activite_physique") in ("MODERE", "INTENSE", "ELEVE", "ACTIF", "OUI", True),
        "veg_fruit_daily": q.get("qualite_alimentation") in ("BONNE", "EXCELLENTE", "EQUILIBREE", "QUOTIDIENNE", "OUI", True),
        "bp_medication": bp_meds,
        "high_glucose_ever": bool(q.get("high_glucose_hist", False)),
        "family_history": family,

        # Detector items
        "sbp": sbp,
        "hypertension_dx": bool(q.get("hypertension_diagnostiquee")),
        "smoker_now": q.get("statut_tabagisme") in ("FUMEUR", "FUMEUR_ACTUEL", "OUI", True),
        "gestational_dm": bool(q.get("diabete_gestationnel_antecedent", False)),

        # Glucose
        "glucose_mgdl": glucose_mgdl,
        "glucose_fasting": glucose_fasting,
        "hba1c_pct": None,

        "symptoms": symptoms,
    }


# ===========================================================================
# OUTPUT SIDE - our assessment -> WiQayati contract
# ===========================================================================

# WiQayati bands
BAND_FAIBLE = "FAIBLE"
BAND_INTER = "INTERMEDIAIRE"
BAND_ELEVE = "ELEVE"

# Our FINDRISC bands -> WiQayati bands
BAND_MAP = {
    "low": BAND_FAIBLE,
    "slightly_elevated": BAND_FAIBLE,
    "moderate": BAND_INTER,
    "high": BAND_ELEVE,
    "very_high": BAND_ELEVE,
}


def _score_100(assessment: dict) -> float:
    """
    Blend our three engines into WiQayati's 0-100 scale.

    Weights (pending clinical review):
      FINDRISC score (0-26)          -> scaled to 0-50
      DIABSCORE flags                -> up to 25
      Detector probability (0-1)     -> up to 25

    Result is clamped to [0, 100].
    """
    fr = assessment.get("future_risk", {})
    ds = assessment.get("diabscore", {})
    det = assessment.get("detect_now", {})

    # FINDRISC: 0-26 -> 0-50
    findrisc_pts = float(fr.get("score") or 0) * (50.0 / 26.0)

    # DIABSCORE flags: T2D flag dominates prediabetes flag
    ds_pts = 0.0
    if ds.get("t2d_flag"):
        ds_pts = 25.0
    elif ds.get("prediabetes_flag"):
        ds_pts = 15.0

    # Detector probability
    det_pts = 25.0 * float(det.get("probability") or 0.0)

    total = findrisc_pts + ds_pts + det_pts
    return round(min(max(total, 0.0), 100.0), 1)


def _band_from_score(score: float) -> str:
    if score < 30:
        return BAND_FAIBLE
    if score < 60:
        return BAND_INTER
    return BAND_ELEVE


def _facteur(cle, libelle, poids, valeur, seuil, direction):
    """Build one entry in the WiQayati facteurs array."""
    return {
        "cle": cle,
        "libelle": libelle,
        "poids": float(poids),
        "valeur": valeur,
        "seuil": seuil,
        "direction": direction,
    }


def _build_facteurs(assessment: dict, form: dict) -> list:
    """
    Translate our FINDRISC factor breakdown into WiQayati's facteurs list.
    Capped at 5 entries, sorted by weight desc, matching the contract's
    example shape.
    """
    fr = assessment.get("future_risk", {})
    factors = fr.get("factors_all") or fr.get("factors") or []

    # Weight for each FINDRISC factor, expressed as a fraction of max 26.
    # These match the point values in risk_engine.FINDRISC_ORIGINAL.
    POINTS = {
        "age": 4, "bmi": 3, "waist": 4, "activity": 2, "diet": 1,
        "bp_meds": 2, "glucose_hx": 5, "family": 5,
    }
    LIBELLES = {
        "age": lambda v, f: f"Âge ({f.get('age')} ans)",
        "bmi": lambda v, f: f"IMC ({f.get('bmi', '—')} kg/m²)",
        "waist": lambda v, f: f"Tour de taille ({f.get('waist_cm', '—')} cm)",
        "activity": lambda v, f: "Activité physique faible",
        "diet": lambda v, f: "Alimentation peu équilibrée",
        "bp_meds": lambda v, f: "Traitement antihypertenseur",
        "glucose_hx": lambda v, f: "Antécédent d'hyperglycémie",
        "family": lambda v, f: "Antécédent familial de diabète",
    }
    DIRECTION = {
        "age": "AU_DESSUS", "bmi": "AU_DESSUS", "waist": "AU_DESSUS",
        "activity": "PRESENT", "diet": "PRESENT", "bp_meds": "PRESENT",
        "glucose_hx": "PRESENT", "family": "PRESENT",
    }
    SEUILS = {
        "age": 45, "bmi": 30, "waist": 94, "activity": None,
        "diet": None, "bp_meds": None, "glucose_hx": True, "family": True,
    }

    out = []
    for factor in factors:
        cle = factor.get("item")
        if cle not in POINTS:
            continue
        pts = POINTS[cle]
        out.append(_facteur(
            cle=cle,
            libelle=LIBELLES[cle](None, form),
            poids=pts / 26.0,
            valeur=form.get("age") if cle == "age" else
                   form.get("bmi") if cle == "bmi" else
                   form.get("waist_cm") if cle == "waist" else True,
            seuil=SEUILS[cle],
            direction=DIRECTION[cle],
        ))

    out.sort(key=lambda f: -f["poids"])
    return out[:5]


def our_assessment_to_wiqayati(assessment: dict, form: dict,
                                request_id: str = None,
                                include_supplement: bool = True) -> dict:
    """
    Take our assess() output and format it as the WiQayati response contract.

    The top-level keys are exactly what the contract specifies. Our extra
    detail goes under `_supplement` so WiQayati's existing code ignores it
    until they choose to consume it.
    """
    score = _score_100(assessment)
    band = _band_from_score(score)
    facteurs = _build_facteurs(assessment, form)

    response = {
        "request_id": request_id or str(uuid.uuid4()),
        "niveau_risque": band,
        "score": score,
        "facteurs": facteurs,
        "version_moteur": "wq-ml-1.0",
        "evalue_le": datetime.now(timezone.utc).isoformat(),
    }

    if include_supplement:
        fr = assessment.get("future_risk", {})
        ds = assessment.get("diabscore", {})
        det = assessment.get("detect_now", {})
        response["_supplement"] = {
            "findrisc": {
                "score": fr.get("score"),
                "band": fr.get("band"),
                "ten_year_risk_pct": fr.get("ten_year_risk_pct"),
                "ten_year_risk_source": fr.get("ten_year_risk_source"),
            },
            "diabscore": {
                "score": ds.get("score"),
                "prediabetes_flag": ds.get("prediabetes_flag"),
                "t2d_flag": ds.get("t2d_flag"),
            },
            "detector": {
                "probability": det.get("probability"),
                "flagged": det.get("flagged"),
                "claim": det.get("claim"),
            },
            "status": assessment.get("status"),
            "referral": assessment.get("referral"),
        }

    return response


# ===========================================================================
# CONVENIENCE - full pipeline in one call
# ===========================================================================

def run_pipeline(full_payload: dict) -> dict:
    """
    Take the FULL WiQayati envelope (request_id + donnees_questionnaire +
    contexte) and return the WiQayati response contract.

    This is what Django calls. One import, one function.
    """
    from risk_engine import assess  # local import - keeps the module lightweight

    inner = full_payload.get("donnees_questionnaire") or full_payload
    request_id = full_payload.get("request_id")

    form = wiqayati_to_our_form(inner)
    assessment = assess(form)
    return our_assessment_to_wiqayati(
        assessment, form, request_id=request_id)


# ===========================================================================
# PROTOCOL - WiQayati CarePlan shape (optional)
# ===========================================================================

def generate_wiqayati_protocol(full_payload: dict) -> dict:
    """
    Same as run_pipeline, but returns the protocol draft instead of (or in
    addition to) the risk response.

    Output shape is our internal protocol format. Django's apps.care_plan
    can pick items out of `items` and store them as CarePlan.activity entries.
    """
    from risk_engine import assess
    from protocol_engine import generate_protocol

    inner = full_payload.get("donnees_questionnaire") or full_payload
    form = wiqayati_to_our_form(inner)
    assessment = assess(form)
    protocol = generate_protocol(assessment, form, language="fr")

    return {
        "protocol_id": protocol.get("protocol_id", "draft"),
        "language": protocol.get("language", "fr"),
        "status": protocol.get("status", "draft"),
        "summary": protocol.get("summary", ""),
        "disclaimer": protocol.get("disclaimer"),
        "items": protocol.get("items", []),
        "urgent_flags": protocol.get("urgent_flags", []),
        "requires_medical_referral": protocol.get("requires_medical_referral", False),
        "patient_summary": protocol.get("patient_summary", {}),
    }


# ===========================================================================
# HEALTH CHECK
# ===========================================================================

def health() -> dict:
    """One-line status for Django's failover logic."""
    import os
    schema_path = os.path.join("model", "schema.json")
    model_path = os.path.join("model", "model.pkl")
    return {
        "service": "wq_risk_adapter",
        "version": "1.0",
        "model_present": os.path.exists(model_path),
        "schema_present": os.path.exists(schema_path),
    }


# ===========================================================================
# CLI test - python wq_adapter.py
# ===========================================================================

if __name__ == "__main__":
    import json

    # Karim-equivalent payload using WiQayati's contract
    sample = {
        "request_id": "test-001",
        "ins_patient": "TUN10001234",
        "version_questionnaire": "1.0",
        "donnees_questionnaire": {
            "age": 47,
            "genre": "M",
            "imc": 31.0,
            "tour_taille_cm": 101.0,
            "antecedents_familiaux_diabete": True,
            "hypertension_diagnostiquee": False,
            "niveau_activite_physique": "FAIBLE",
            "qualite_alimentation": "MAUVAISE",
            "statut_tabagisme": "FUMEUR_ACTUEL",
            "glycemie_jeun_connue": False,
            "glycemie_jeun_mmol": None,
            "diabete_gestationnel_antecedent": False,
            "medicaments_corticoides": False,
            "acanthosis_nigricans": False,
            # Optional additions, if the form is updated:
            "taille_cm": 174.0,
            "high_glucose_hist": False,
        },
        "contexte": {
            "type_soumission": "AGENT",
            "role_soumetteur": "AGENT_SOINS_PRIMAIRES",
            "horodatage_soumission": datetime.now(timezone.utc).isoformat(),
        },
    }

    print("=== /evaluate equivalent ===")
    print(json.dumps(run_pipeline(sample), indent=2, ensure_ascii=False))

    print("\n=== /protocol equivalent ===")
    proto = generate_wiqayati_protocol(sample)
    print(json.dumps(proto, indent=2, ensure_ascii=False))

    print("\n=== health ===")
    print(json.dumps(health(), indent=2))