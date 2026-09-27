from typing import Any, Dict


# ===========================================================================
# FORM SPECIFICATION - build your form from exactly this, nothing more
# ===========================================================================
FORM_FIELDS = {
    # identity / gates
    "age":              "int, years",
    "sex":              "'M' | 'F'",
    "pregnant":         "bool (ask women only)",
    "known_diabetes":   "bool - already diagnosed by a doctor",

    # anthropometry (measured at a centre, or self-reported at home)
    "weight_kg":        "float",
    "height_cm":        "float",
    "waist_cm":         "float | None - show the how-to-measure picture",

    # FINDRISC items
    "active_30min_daily":   "bool - at work OR leisure, 30 min most days",
    "veg_fruit_daily":      "bool - vegetables, fruit or berries every day",
    "bp_medication":        "bool - ever taken medication for high BP",
    "high_glucose_ever":    "bool - ever told your blood glucose was high",
    "family_history":       "'none' | 'second_degree' | 'first_degree'",
    #   first_degree  = parent, sibling, own child
    #   second_degree = grandparent, aunt, uncle, cousin

    # extra items the NHANES model uses
    "sbp":              "int | None - systolic BP, if measured",
    "hypertension_dx":  "bool - told you have high blood pressure",
    "smoker_now":       "bool",
    "gestational_dm":   "bool | None - women only",

    # optional glucometer block
    "glucose_mgdl":     "float | None",
    "glucose_fasting":  "bool | None - 8h+ with no food",
    "hba1c_pct":        "float | None - if they have a lab result",

    # safety
    "symptoms":         "list of: 'thirst','urination','weight_loss',"
                        "'blurred_vision','chest_pain','fainting'",
}

# ===========================================================================
# 1. FINDRISC
# ===========================================================================
# Original Finnish points. Range 0-26.
# WHY bands and not "1 in 3": the Finnish absolute risks do not transport.
# A Norwegian cohort found only ~13.5% of people scoring >=15 developed
# diabetes in 10 years, far below the Finnish "1 in 3".

FINDRISC_ORIGINAL = {
    "age":    [(45, 0), (55, 2), (65, 3), (999, 4)],
    "bmi":    [(25, 0), (30, 1), (999, 3)],
    "waist_M": [(94, 0), (102, 3), (999, 4)],
    "waist_F": [(80, 0), (88, 3), (999, 4)],
    "inactive": 2,
    "no_veg_fruit": 1,
    "bp_meds": 2,
    "high_glucose_ever": 5,
    "family_second": 3,
    "family_first": 5,
}

# SHADOW VARIANT - Tunisian waist cutoff.
# WHY: Bouguerra et al. found 85 cm optimal for BOTH sexes in Tunisian adults,
# vs the European 94/80. The original score therefore over-scores Tunisian
# women and under-scores men - which matches the Algerian finding that women
# scored significantly higher (15.6 vs 14.1).
# The second threshold keeps the original +8 cm structure.
# STATUS: NOT VALIDATED. Compute it, log it, do not show it.
FINDRISC_TN_WAIST = {
    "waist_M": [(85, 0), (93, 3), (999, 4)],
    "waist_F": [(85, 0), (93, 3), (999, 4)],
}

BANDS = [(7, "low"), (12, "slightly_elevated"), (15, "moderate"),
         (21, "high"), (99, "very_high")]
# 10-year risk of drug-treated T2D, original Finnish cohort.
# Source: Lindström & Tuomilehto, Diabetes Care 2003;26(3):725-731, Table 3.
#
# CAVEAT: these absolute risks do NOT transport across populations.
# The Norwegian HUNT study found only ~13.5% at scores >=15, far below
# the Finnish 33%. No North African cohort has calibrated them. Report
# them as an estimate and label the source. Do NOT present as Tunisia-
# calibrated probabilities.
FINDRISC_TEN_YEAR_RISK = [
    (1,   0.6),   # 0
    (4,   1.0),   # 1-3
    (7,   1.6),   # 4-6
    (9,   2.8),   # 7-8
    (11,  4.2),   # 9-10
    (13,  7.6),   # 11-12
    (15, 12.4),   # 13-14
    (17, 21.1),   # 15-16
    (19, 33.4),   # 17-18
    (21, 40.4),   # 19-20
    (999, 50.1),  # >20
]

# Testing cutoffs. Sex-specific, from the Algiers study (>=13 women, >=11 men).
# PROVISIONAL - label them as such until you have Tunisian outcome data.
TEST_CUTOFF = {"M": 11, "F": 13}


def _points(value, table):
    """Walk a threshold table: first bound the value falls under wins."""
    if value is None:
        return None
    for bound, pts in table:
        if value < bound:
            return pts
    return table[-1][1]


def findrisc_ten_year_risk(score: int):
    """Map a FINDRISC score to a 10-year T2D risk percentage.
    Returns a float in [0, 100]. See FINDRISC_TEN_YEAR_RISK for caveats.
    """
    for bound, pct in FINDRISC_TEN_YEAR_RISK:
        if score < bound:
            return pct
    return FINDRISC_TEN_YEAR_RISK[-1][1]


def findrisc(a: dict, waist_variant: str = "original"):
    """Returns (score, band, per-item breakdown). Breakdown drives the
    'why this score' display AND the prevention plan."""
    if a.get("bmi") is not None:
        bmi = float(a["bmi"])
    elif a.get("weight_kg") and a.get("height_cm"):
        bmi = float(a["weight_kg"]) / (float(a["height_cm"]) / 100) ** 2
    else:
        bmi = 22.0

    waist_table = FINDRISC_ORIGINAL[f"waist_{a['sex']}"]
    if waist_variant == "tn":
        waist_table = FINDRISC_TN_WAIST[f"waist_{a['sex']}"]

    items = {
        "age":        _points(a["age"], FINDRISC_ORIGINAL["age"]),
        "bmi":        _points(bmi, FINDRISC_ORIGINAL["bmi"]),
        "waist":      _points(a.get("waist_cm"), waist_table),
        "activity":   0 if a["active_30min_daily"] else FINDRISC_ORIGINAL["inactive"],
        "diet":       0 if a["veg_fruit_daily"] else FINDRISC_ORIGINAL["no_veg_fruit"],
        "bp_meds":    FINDRISC_ORIGINAL["bp_meds"] if a["bp_medication"] else 0,
        "glucose_hx": FINDRISC_ORIGINAL["high_glucose_ever"] if a["high_glucose_ever"] else 0,
        "family": {"none": 0,
                   "second_degree": FINDRISC_ORIGINAL["family_second"],
                   "first_degree": FINDRISC_ORIGINAL["family_first"]}[a["family_history"]],
    }
    # waist missing: score without it, and say so. Do not impute.
    score = sum(v for v in items.values() if v is not None)
    band = next(name for bound, name in BANDS if score < bound)
    return score, band, items, bmi


# ===========================================================================
# 2. GLUCOSE INTERPRETATION  (ADA diagnostic ranges)
# ===========================================================================
# WHY a separate branch: a value in the diabetes range is NOT a future risk.
# Telling someone "62% chance of developing diabetes" when they already have
# it is the single worst failure mode this app can have.

def interpret_glucose(a: dict):
    g, fasting, a1c = a.get("glucose_mgdl"), a.get("glucose_fasting"), a.get("hba1c_pct")

    if a1c is not None:
        if a1c >= 6.5:
            return "diabetes_range", "HbA1c in the diabetes range, needs confirmation"
        if a1c >= 5.7:
            return "prediabetes", "HbA1c in the prediabetes range"
        return "normal", "HbA1c normal"

    if g is None:
        return "not_provided", None

    if not fasting:
        # WHY discard: a capillary reading after a meal has no interpretable
        # threshold for risk. Better to ignore it than to guess.
        return "unusable", "Value not taken fasting, so it cannot be interpreted"

    if g >= 126:
        return "diabetes_range", "Fasting glucose in the diabetes range, needs confirmation"
    if g >= 100:
        return "prediabetes", "Fasting glucose in the prediabetes range"
    return "normal", "Fasting glucose normal"


# ===========================================================================
# 3. DPP PREVENTION PLAN
# ===========================================================================
# WHY rules and not a model: there is no dataset of "person followed diet X
# and did/didn't become diabetic". The evidence is the DPP trial: 7% weight
# loss + 150 min/week of moderate activity cut diabetes incidence by 58% over
# 2.8 years in 3,234 adults with prediabetes. Metformin cut it by 31%.
# Personalisation = applying those targets to THIS person's failed items.

def prevention_plan(a: dict, items: dict, bmi: float, glucose_state: str):
    plan = []

    if bmi >= 25:
        target_loss = round(a["weight_kg"] * 0.07, 1)
        plan.append({
            "area": "weight",
            "target": f"Lose {target_loss} kg (7% of your current weight)",
            "detail": f"From {a['weight_kg']} kg to about "
                      f"{round(a['weight_kg'] - target_loss, 1)} kg, over 6 months",
            "evidence": "DPP: 7% weight loss + activity cut diabetes incidence 58%",
        })

    if not a["active_30min_daily"]:
        plan.append({
            "area": "activity",
            "target": "150 minutes of brisk walking per week",
            "detail": "30 minutes, 5 days a week. Start at 10 minutes a day "
                      "and add 5 minutes each week.",
            "evidence": "DPP activity goal",
        })
    else:
        plan.append({
            "area": "activity",
            "target": "Keep up your current activity",
            "detail": "You already meet the target. Maintaining it is what matters.",
            "evidence": "DPP activity goal",
        })

    if not a["veg_fruit_daily"]:
        plan.append({
            "area": "diet",
            "target": "Vegetables or fruit every day",
            "detail": "One of the risk items you scored on. Start with one "
                      "vegetable portion at lunch and one at dinner.",
            "evidence": "FINDRISC item",
        })

    if glucose_state == "prediabetes":
        plan.append({
            "area": "medical",
            "target": "See a doctor within a month",
            "detail": "Your glucose is in the prediabetes range. This is the "
                      "stage where lifestyle change works best. Ask your "
                      "doctor whether metformin is appropriate for you.",
            "evidence": "DPP: metformin cut incidence 31%; lifestyle 58%",
        })

    if items["waist"] and items["waist"] > 0:
        plan.append({
            "area": "waist",
            "target": "Reduce waist circumference",
            "detail": "Abdominal fat carries risk independently of overall "
                      "weight. It usually falls with the weight target above.",
            "evidence": "FINDRISC item",
        })
    return plan


# ===========================================================================
# 4. WHAT-IF SIMULATOR
# ===========================================================================
# WHY: the score is deterministic, so you can run it backwards. This turns a
# static verdict into "here is what changes it", which is the whole point of
# a prevention platform. It is a simulation, not a prediction - label it.

def simulate(a: dict, weight_kg=None, active=None, veg_fruit=None):
    b = dict(a)
    if weight_kg is not None:
        b["weight_kg"] = weight_kg
    if active is not None:
        b["active_30min_daily"] = active
    if veg_fruit is not None:
        b["veg_fruit_daily"] = veg_fruit
    score, band, _, _ = findrisc(b)
    return {
        "score": score,
        "band": band,
        "ten_year_risk_pct": findrisc_ten_year_risk(score),
    }


# ===========================================================================
# 5. DIABSCORE  (Gannar et al. 2018 - validated on a TUNISIAN population)
# ===========================================================================
# WHY add this alongside FINDRISC: DIABSCORE was originally developed in
# Spain (Cabrera de Leon 2008, Diabetes Res Clin Pract 80:128-133) but was
# externally validated on a Tunisian sample from the Nabeul/Cap-Bon region
# (n=225 adults, PLoS ONE 2018, doi:10.1371/journal.pone.0200718). That is
# the single most locally-relevant validation either score in this file has
# - your FINDRISC Tunisian-waist variant above is explicitly marked
# NOT VALIDATED, whereas this one has a published Tunisian sensitivity/NPV.
# It also needs only 4 non-invasive inputs: age, waist-to-height ratio,
# first-degree family history of T2D, and (for women) a personal history of
# gestational diabetes.
#
# FORMULA (exact, from the paper's Methods section):
#   DIABSCORE = age_years
#             + (waist_cm / height_cm * 100)          # WHtR, as a percentage
#             + (10 if first-degree family history of T2D else 0)
#             + (25 if personal history of gestational diabetes else 0)
#
# CUTOFFS - use the Tunisian-validated ones here, not the original Spanish
# ones (Spain: >=100). In the Tunisian validation:
#   >=90  -> T2D screening cutoff   (Se=97%, NPV=97%, ages 18-75)
#   >=80  -> prediabetes screening cutoff (higher Se/NPV, less balanced
#            specificity - expect more false positives at this cutoff)
#
# CAVEAT: the paper's family-history item is specifically "first-degree
# relative diagnosed before age 65". FORM_FIELDS captures
# first_degree/second_degree/none but not the relative's age at diagnosis,
# so treating any first_degree=True as "yes" here is a slight overcount
# versus the original definition. Flag this to whoever owns the form if you
# want to match the validation exactly.

DIABSCORE_FAMILY_POINTS = 10
DIABSCORE_GESTATIONAL_POINTS = 25
DIABSCORE_CUTOFF_T2D = 90          # Tunisian-validated, ages 18-75
DIABSCORE_CUTOFF_PREDIABETES = 80  # Tunisian-validated


def diabscore(a: dict):
    """Returns (score, detail dict). Score is None if waist or height is
    missing - do not impute, same policy as findrisc()."""
    waist = a.get("waist_cm")
    height = a.get("height_cm")
    if waist is None or height is None:
        return None, {"missing": "waist_cm and height_cm are both required"}

    whtr_component = (waist / height) * 100
    family_component = (
        DIABSCORE_FAMILY_POINTS
        if a["family_history"] == "first_degree" else 0
    )
    gestational_component = (
        DIABSCORE_GESTATIONAL_POINTS
        if a.get("gestational_dm") else 0
    )

    score = a["age"] + whtr_component + family_component + gestational_component

    return round(score, 1), {
        "t2d_flag": score >= DIABSCORE_CUTOFF_T2D,
        "prediabetes_flag": score >= DIABSCORE_CUTOFF_PREDIABETES,
        "components": {
            "age": a["age"],
            "whtr_x100": round(whtr_component, 1),
            "family_history": family_component,
            "gestational_dm": gestational_component,
        },
        "source": "Gannar et al. 2018, doi:10.1371/journal.pone.0200718 "
                  "(Tunisian validation)",
    }


# ===========================================================================
# ===========================================================================
# 6. TRAINED DETECTOR (current dysglycemia) - lazy default loader
# ===========================================================================
# ===========================================================================
# WHY lazy + cached: assess() should work out of the box without every
# caller having to load and pass a model instance, but we don't want to pay
# the load cost (reading model/model.pkl + model/schema.json) on every
# single call either.
#
# NOTE: this imports Nhanes_model (capital N) to match the file name on
# disk. Python is case-sensitive on Linux and macOS, so keep them aligned.
#
# DetectionModel itself already degrades gracefully: if the model files
# aren't present it sets available=False instead of raising, so callers of
# assess() don't need to special-case a missing model.

_detector_cache = None


def get_detector():
    global _detector_cache
    if _detector_cache is None:
        try:
            from Nhanes_model import DetectionModel
        except ModuleNotFoundError:
            from apps.risk_engine.ml.Nhanes_model import DetectionModel
        _detector_cache = DetectionModel()
    return _detector_cache


# ===========================================================================
# ORCHESTRATION
# ===========================================================================
URGENT_SYMPTOMS = {"chest_pain", "fainting"}
HYPERGLYCEMIA_SYMPTOMS = {"thirst", "urination", "weight_loss", "blurred_vision"}


def assess(a: dict, nhanes_model=None) -> Dict[str, Any]:
    """The single entry point your API calls."""
    out: Dict[str, Any] = {"version": "findrisc-tn-0.1-provisional"}

    # --- gates: people this pathway is not for ---
    if a["age"] < 20:
        return {**out, "status": "out_of_scope",
                "message": "This assessment is for adults aged 20 and over."}
    if a.get("pregnant"):
        return {**out, "status": "out_of_scope",
                "message": "Diabetes screening in pregnancy follows a different "
                           "protocol. Please see your doctor."}
    if a.get("known_diabetes"):
        return {**out, "status": "already_diagnosed",
                "message": "You already have a diagnosis, so a future-risk "
                           "estimate does not apply. This tool is for prevention."}

    # --- red flags: override everything ---
    sx = set(a.get("symptoms", []))
    if sx & URGENT_SYMPTOMS:
        return {**out, "status": "seek_care_now",
                "message": "You reported symptoms that need medical attention "
                           "today. Please see a doctor now."}

    # --- engine 1: future risk ---
    score, band, items, bmi = findrisc(a)
    score_tn, band_tn, _, _ = findrisc(a, waist_variant="tn")   # shadow, logged only

    out["future_risk"] = {
        "score": score,
        "band": band,
        "max_score": 26,
        "ten_year_risk_pct": findrisc_ten_year_risk(score),
        "ten_year_risk_source": (...),
        "factors": sorted(
            [{"item": k, "points": v} for k, v in items.items()
             if v is not None and v > 0],
            key=lambda d: -d["points"])[:3],
        "factors_all": [
            {"item": k, "points": v} for k, v in items.items()
            if v is not None and v > 0
        ],
        "waist_missing": items["waist"] is None,
    }
    out["_shadow"] = {"tn_waist_score": score_tn, "tn_waist_band": band_tn}

    # --- engine 1b: DIABSCORE (Tunisian-validated) ---
    diabscore_value, diabscore_detail = diabscore(a)
    out["diabscore"] = {"score": diabscore_value, **diabscore_detail}

    # --- engine 2: current undiagnosed T2D (optional trained model) ---
    # Falls back to the saved detector unless a specific model instance
    # (e.g. for testing, or a fine-tuned Tunisian version) is passed in.
    # Reads form field high_glucose_ever and maps it to the model's
    # high_glucose_hist feature inside DetectionModel._featurize.
    detector = nhanes_model or get_detector()
    out["detect_now"] = detector.predict(a)

    # --- glucose branch ---
    state, msg = interpret_glucose(a)
    out["glucose"] = {"state": state, "message": msg}

    # --- what happens next ---
    cutoff = TEST_CUTOFF[a["sex"]]
    # WHY OR with diabscore: DIABSCORE>=90 has 97% sensitivity in the
    # Tunisian validation - if it flags and FINDRISC doesn't, that's exactly
    # the case worth catching rather than missing.
    needs_test = (score >= cutoff
                  or bool(sx & HYPERGLYCEMIA_SYMPTOMS)
                  or diabscore_detail.get("t2d_flag", False))

    if state == "diabetes_range":
        out["status"] = "diagnostic_range"
        out["referral"] = {
            "to": "general practitioner",
            "urgency": "within 2 weeks",
            "reason": "A result in the diabetes range must be confirmed by a "
                      "second test. This is not a diagnosis.",
        }
        # WHY no plan here: this person may already have diabetes. Prevention
        # advice would be the wrong conversation.
        return out

    if state == "prediabetes":
        out["status"] = "prediabetes"
        out["referral"] = {"to": "general practitioner", "urgency": "within a month",
                           "reason": "Glucose in the prediabetes range."}
    elif needs_test and state in ("not_provided", "unusable"):
        out["status"] = "testing_recommended"
        out["referral"] = {
            "to": "fasting blood glucose test",
            "urgency": "soon",
            "reason": f"Your score of {score} is at or above the {cutoff} "
                      f"threshold for testing.",
        }
    else:
        out["status"] = "prevention"
        out["referral"] = {"to": "no referral needed", "urgency": "routine",
                           "reason": "Re-assess in 1 to 3 years, or sooner if "
                                     "your weight or health changes."}

    out["plan"] = prevention_plan(a, items, bmi, state)

    current_risk = findrisc_ten_year_risk(score)
    sim_loss = simulate(a, weight_kg=a["weight_kg"] * 0.93)
    sim_active = simulate(a, active=True)
    sim_both = simulate(a, weight_kg=a["weight_kg"] * 0.93, active=True)

    out["simulation"] = {
        "current": {
            "score": score, "band": band,
            "ten_year_risk_pct": current_risk,
        },
        "if_7pct_weight_loss": sim_loss,
        "if_active":           sim_active,
        "if_both":             sim_both,
        "absolute_risk_drop_both": round(
            current_risk - sim_both["ten_year_risk_pct"], 1),
    }

    return out


# ===========================================================================
# TESTS - run: python risk_engine.py
# ===========================================================================
if __name__ == "__main__":
    base = dict(age=52, sex="F", pregnant=False, known_diabetes=False,
                weight_kg=82, height_cm=162, waist_cm=96,
                active_30min_daily=False, veg_fruit_daily=False,
                bp_medication=True, high_glucose_ever=False,
                family_history="first_degree", sbp=145, hypertension_dx=True,
                smoker_now=False, gestational_dm=False,
                glucose_mgdl=None, glucose_fasting=None, hba1c_pct=None,
                symptoms=[])

    r = assess(base)
    assert r["future_risk"]["score"] == 2 + 3 + 4 + 2 + 1 + 2 + 0 + 5, r["future_risk"]
    assert r["future_risk"]["band"] == "high"      # 19 -> 15-20 band
    assert r["status"] == "testing_recommended"
    print(f"case 1  score {r['future_risk']['score']}  "
          f"{r['future_risk']['band']}  "
          f"10yr risk {r['future_risk']['ten_year_risk_pct']:.0f}%")
    print(f"        -> {r['status']}")
    print(f"        if 7% weight loss + active: "
          f"{r['simulation']['if_both']['band']}  "
          f"10yr risk {r['simulation']['if_both']['ten_year_risk_pct']:.0f}%  "
          f"(drop {r['simulation']['absolute_risk_drop_both']:.0f}pp)")

    # diabetes range: no risk %, no prevention plan
    r2 = assess({**base, "glucose_mgdl": 148, "glucose_fasting": True})
    assert r2["status"] == "diagnostic_range"
    assert "plan" not in r2
    print(f"case 2  {r2['status']} - correctly withheld the risk score")

    # non-fasting value must be discarded, not guessed
    r3 = assess({**base, "glucose_mgdl": 148, "glucose_fasting": False})
    assert r3["glucose"]["state"] == "unusable"
    print(f"case 3  {r3['glucose']['state']} - non-fasting value ignored")

    # low-risk young adult
    r4 = assess({**base, "age": 28, "weight_kg": 60, "waist_cm": 72,
                 "active_30min_daily": True, "veg_fruit_daily": True,
                 "bp_medication": False, "family_history": "none",
                 "hypertension_dx": False})
    print(f"case 4  score {r4['future_risk']['score']}  "
          f"{r4['future_risk']['band']}  "
          f"10yr risk {r4['future_risk']['ten_year_risk_pct']:.1f}%  "
          f"-> {r4['status']}")

    print("\nall assertions passed")
