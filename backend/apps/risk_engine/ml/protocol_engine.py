"""
protocol_engine.py - rules-based protocol generator.

WELLNESS FRAMING (regulatory decision: wellness, not medical device):
  This is a health education document. It does not diagnose, does not
  prescribe, and does not claim medical benefit. Every item is a
  "conseil" (suggestion), not a "prescription". The nutritionist who
  reviews and signs takes professional responsibility for the content
  as health education. A single exception: emergency symptoms
  (chest pain, fainting) route to "seek emergency care" - that is a
  safety exception, not a medical claim.

Input:  the dict returned by risk_engine.assess(), plus the raw form dict
Output: a structured protocol draft ready for nutritionist review

Language: French (phase 1). Arabic scaffolded but not filled.
"""
from datetime import datetime, timezone
import hashlib
import json
import uuid

VERSION = "1.0"
DEFAULT_LANGUAGE = "fr"
MAX_ITEMS = 10


# ===========================================================================
# PROTOCOL LIBRARY - one entry per possible trigger
# ===========================================================================
# Categories: "consultation", "alimentation", "activite_physique",
#             "suivi", "education"
# Priorities: "prioritaire", "recommandee", "complementaire"
#
# Placeholders in action/target/timeline are filled from the context dict
# built in _build_context(). See that function for available keys.

PROTOCOL_LIBRARY = {
    # ---------------------------------------------------------------------
    # Consultation triggers (highest priority)
    # ---------------------------------------------------------------------
    "symptoms_urgent": {
        "category": "consultation",
        "priority": "prioritaire",
        "title": "Consultez rapidement un professionnel de santé",
        "action": "Vous avez signalé des symptômes qui nécessitent une attention "
                  "médicale rapide. Consultez dès aujourd'hui.",
        "target": "Consultation immédiate",
        "timeline": "Aujourd'hui",
        "evidence": "Symptômes signalés: {urgent_symptoms}",
        "source": "Sécurité",
    },
    "symptoms_hyperglycemia": {
        "category": "consultation",
        "priority": "prioritaire",
        "title": "Consultation recommandée",
        "action": "Certains symptômes que vous avez signalés peuvent être liés "
                  "à une glycémie élevée. Il est conseillé de consulter un "
                  "professionnel de santé pour un contrôle.",
        "target": "Contrôle glycémique",
        "timeline": "Dans les 2 semaines",
        "evidence": "Symptômes signalés: {hyper_symptoms}",
        "source": "Recommandation de dépistage",
    },
    "diabscore_t2d": {
        "category": "consultation",
        "priority": "prioritaire",
        "title": "Contrôle glycémique conseillé",
        "action": "Votre profil suggère la possibilité d'une glycémie élevée. "
                  "Il est conseillé de consulter un professionnel de santé "
                  "pour un contrôle sanguin.",
        "target": "Glycémie à jeun ou HbA1c",
        "timeline": "Dans les 2 semaines",
        "evidence": "Profil dépassant le seuil de dépistage validé en Tunisie "
                    "(DIABSCORE {diabscore})",
        "source": "Gannar et al. 2018, PLoS ONE",
    },
    "diabscore_prediabetes": {
        "category": "consultation",
        "priority": "recommandee",
        "title": "Suivi glycémique annuel",
        "action": "Votre profil suggère un risque de prédiabète. Il est "
                  "conseillé de faire contrôler votre glycémie au moins une "
                  "fois par an.",
        "target": "Glycémie annuelle",
        "timeline": "Annuel",
        "evidence": "Profil au-dessus du seuil de dépistage du prédiabète "
                    "(DIABSCORE {diabscore})",
        "source": "Gannar et al. 2018, PLoS ONE",
    },
    "glucose_range": {
        "category": "consultation",
        "priority": "prioritaire",
        "title": "Confirmation par un professionnel de santé",
        "action": "Un résultat de glycémie dans la plage du diabète doit "
                  "être confirmé par un second test. Ceci n'est pas un "
                  "diagnostic.",
        "target": "Confirmation par un médecin",
        "timeline": "Dans les 2 semaines",
        "evidence": "Valeur de glycémie fournie hors de la plage normale",
        "source": "ADA - critères diagnostiques",
    },

    # ---------------------------------------------------------------------
    # Alimentation
    # ---------------------------------------------------------------------
    "bmi": {
        "category": "alimentation",
        "priority": "prioritaire",
        "title": "Réduction progressive du poids",
        "action": "Atteindre une perte de {target_loss_kg} kg (7% de votre "
                  "poids actuel) réduit significativement le risque de "
                  "diabète de type 2. L'objectif est {target_weight_kg} kg "
                  "sur 6 mois, soit environ {loss_per_month} kg par mois.",
        "target": "{target_loss_kg} kg en 6 mois",
        "timeline": "6 mois",
        "evidence": "Essai DPP: 7% de perte de poids réduit l'incidence du "
                    "diabète de 58%",
        "source": "Knowler et al. 2002, NEJM",
    },
    "waist": {
        "category": "alimentation",
        "priority": "prioritaire",
        "title": "Réduction du tour de taille",
        "action": "Votre tour de taille ({waist_cm} cm) dépasse le seuil de "
                  "risque ({waist_target} cm). Il diminue habituellement "
                  "avec la perte de poids suggérée ci-dessus. Privilégiez "
                  "les aliments peu transformés et limitez les boissons "
                  "sucrées.",
        "target": "Tour de taille < {waist_target} cm",
        "timeline": "Progressif sur 6 mois",
        "evidence": "Obésité abdominale = facteur de risque indépendant",
        "source": "FINDRISC / OMS",
    },
    "diet": {
        "category": "alimentation",
        "priority": "recommandee",
        "title": "Légumes et fruits chaque jour",
        "action": "Ajoutez une portion de légumes au déjeuner et au dîner, "
                  "et un fruit au petit-déjeuner ou en collation. "
                  "Privilégiez les légumes de saison et les fruits entiers "
                  "(plutôt que les jus).",
        "target": "≥ 5 portions de fruits et légumes par jour",
        "timeline": "Progressif sur 4 semaines",
        "evidence": "Item FINDRISC - associé à une réduction du risque",
        "source": "FINDRISC",
    },
    "glucose_hx": {
        "category": "alimentation",
        "priority": "prioritaire",
        "title": "Attention renforcée à l'alimentation",
        "action": "Un antécédent de glycémie élevée augmente le risque. "
                  "Réduisez les sucres rapides (boissons sucrées, pâtisseries, "
                  "pain blanc) et privilégiez les féculents complets.",
        "target": "Réduction des sucres rapides",
        "timeline": "Progressif",
        "evidence": "Antécédent personnel de glycémie élevée = facteur de "
                    "risque majeur",
        "source": "FINDRISC",
    },

    # ---------------------------------------------------------------------
    # Activité physique
    # ---------------------------------------------------------------------
    "inactive": {
        "category": "activite_physique",
        "priority": "prioritaire",
        "title": "Activité physique régulière",
        "action": "Objectif: 30 minutes de marche rapide, 5 jours par semaine. "
                  "Commencez par 10 minutes par jour et ajoutez 5 minutes "
                  "chaque semaine jusqu'à atteindre 30 minutes.",
        "target": "150 minutes par semaine",
        "timeline": "Progressif sur 6 semaines",
        "evidence": "Essai DPP: objectif d'activité - réduit l'incidence du "
                    "diabète de 58% avec la perte de poids",
        "source": "Knowler et al. 2002, NEJM",
    },

    # ---------------------------------------------------------------------
    # Suivi (monitoring)
    # ---------------------------------------------------------------------
    "family_hx": {
        "category": "suivi",
        "priority": "recommandee",
        "title": "Suivi glycémique annuel",
        "action": "En raison d'antécédents familiaux de diabète, il est "
                  "conseillé de contrôler votre glycémie à jeun au moins "
                  "une fois par an.",
        "target": "Glycémie annuelle",
        "timeline": "Annuel",
        "evidence": "Antécédent familial de 1er degré augmente le risque "
                    "de 2 à 3 fois",
        "source": "ADA",
    },
    "bp_meds": {
        "category": "suivi",
        "priority": "recommandee",
        "title": "Suivi de la tension artérielle",
        "action": "La tension artérielle et son traitement sont associés à "
                  "un risque métabolique. Continuez le suivi avec votre "
                  "médecin et parlez-lui de votre risque de diabète.",
        "target": "Tension artérielle contrôlée",
        "timeline": "Prochain rendez-vous",
        "evidence": "HTA et traitement antihypertenseur = facteurs de risque",
        "source": "FINDRISC",
    },
    "htn": {
        "category": "suivi",
        "priority": "recommandee",
        "title": "Hypertension: suivi régulier",
        "action": "Votre hypertension doit rester contrôlée. Le suivi "
                  "régulier de la tension réduit le risque cardiométabolique "
                  "global.",
        "target": "Suivi tensionnel régulier",
        "timeline": "Selon avis médical",
        "evidence": "HTA associée au risque de DT2",
        "source": "OMS / ADA",
    },
    "smoker": {
        "category": "suivi",
        "priority": "recommandee",
        "title": "Arrêt du tabac",
        "action": "Le tabagisme augmente le risque de diabète de type 2 et "
                  "de complications cardiovasculaires. Envisagez un plan "
                  "d'arrêt avec votre médecin (substituts nicotiniques, "
                  "soutien).",
        "target": "Arrêt du tabac",
        "timeline": "Progressif",
        "evidence": "Tabagisme = facteur de risque modifiable",
        "source": "OMS",
    },
    "age_risk": {
        "category": "suivi",
        "priority": "complementaire",
        "title": "Suivi de santé après 45 ans",
        "action": "Après 45 ans, le risque métabolique augmente. Maintenez "
                  "un suivi annuel de votre glycémie et de votre tension.",
        "target": "Bilan annuel",
        "timeline": "Annuel",
        "evidence": "Âge = facteur de risque non modifiable",
        "source": "ADA",
    },

    # ---------------------------------------------------------------------
    # Éducation
    # ---------------------------------------------------------------------
    "education_general": {
        "category": "education",
        "priority": "complementaire",
        "title": "Comprendre le prédiabète",
        "action": "Le prédiabète est une phase où la glycémie est élevée "
                  "mais pas encore au niveau du diabète. C'est la période "
                  "où les changements de mode de vie sont les plus efficaces.",
        "target": "Connaître les signes",
        "timeline": "À votre rythme",
        "evidence": "Éducation thérapeutique - DPP",
        "source": "Knowler et al. 2002, NEJM",
    },
    "education_diet": {
        "category": "education",
        "priority": "complementaire",
        "title": "Choisir ses aliments",
        "action": "Apprenez à lire les étiquettes, à reconnaître les sucres "
                  "cachés (sodas, sauces, céréales du petit-déjeuner) et à "
                  "composer des assiettes équilibrées.",
        "target": "Maîtrise des choix alimentaires",
        "timeline": "Progressif",
        "evidence": "Éducation nutritionnelle",
        "source": "Recommandations générales",
    },

    # ---------------------------------------------------------------------
    # Cas particulier
    # ---------------------------------------------------------------------
    "detector_flagged": {
        "category": "suivi",
        "priority": "recommandee",
        "title": "Un modèle statistique vous a identifié comme à risque",
        "action": "Un modèle entraîné sur des données de population vous "
                  "classe parmi les personnes susceptibles d'avoir une "
                  "glycémie élevée. Ceci n'est pas un diagnostic. Un contrôle "
                  "sanguin permettra de vérifier.",
        "target": "Contrôle sanguin",
        "timeline": "Dans les 3 mois",
        "evidence": "Modèle de dépistage (NHANES)",
        "source": "Modèle interne",
    },
        "maintain_habits": {
        "category": "education",
        "priority": "complementaire",
        "title": "Maintenir vos habitudes actuelles",
        "action": "Votre profil actuel ne présente pas de facteur de risque "
                  "majeur. Continuez votre alimentation équilibrée et votre "
                  "activité physique régulière. Recontrôlez votre glycémie "
                  "tous les 3 ans, ou plus tôt si votre poids ou votre "
                  "santé changent.",
        "target": "Maintien des habitudes",
        "timeline": "Long terme",
        "evidence": "Prévention primaire - maintenir un mode de vie sain",
        "source": "Recommandations générales",
    },
}


# ===========================================================================
# Helpers
# ===========================================================================

def _fmt_fr_number(x):
    """French decimal formatting: 6.6 -> '6,6'."""
    if x is None:
        return "—"
    try:
        return f"{float(x):.1f}".replace(".", ",")
    except (ValueError, TypeError):
        return str(x)


def _extract_triggers(assessment: dict) -> list:
    """Read the assessment and return the list of trigger keys that fire."""
    triggers = []

    # Emergencies first
    symptoms = set(assessment.get("_inputs", {}).get("symptoms", []))
    # Also check via the assessment status - the engine already routes these
    status = assessment.get("status", "")

    if status == "seek_care_now":
        triggers.append("symptoms_urgent")
    elif status == "already_diagnosed" or status == "out_of_scope":
        # No protocol for these
        return []

    # Hyperglycemia symptoms
    hyper = {"thirst", "urination", "weight_loss", "blurred_vision"}
    if symptoms & hyper:
        triggers.append("symptoms_hyperglycemia")

      # Glucose interpretation
    glucose_state = assessment.get("glucose", {}).get("state")
    if glucose_state == "diabetes_range":
        triggers.append("glucose_range")
    elif glucose_state == "prediabetes":
        triggers.append("diabscore_prediabetes")

    # DIABSCORE flags. If a lab value was already provided (either
    # diabetes_range or prediabetes), it supersedes the DIABSCORE proxy.
    # Only fall back to DIABSCORE when the user didn't provide a lab value.
    if glucose_state not in ("diabetes_range", "prediabetes"):
        ds = assessment.get("diabscore", {})
        if ds.get("t2d_flag"):
            triggers.append("diabscore_t2d")
        elif ds.get("prediabetes_flag"):
            triggers.append("diabscore_prediabetes")

      # Detector. Skip if the user already provided a lab value that's
    # already abnormal - the lab is more informative than the model.
    det = assessment.get("detect_now", {})
    if (det.get("available") and det.get("flagged")
            and glucose_state not in ("diabetes_range", "prediabetes")):
        triggers.append("detector_flagged")

    # FINDRISC factors
    fr = assessment.get("future_risk", {})
    factors = fr.get("factors_all") or fr.get("factors", [])
    factor_keys = {f["item"] for f in factors}
    if "bmi" in factor_keys:
        triggers.append("bmi")
    if "waist" in factor_keys:
        triggers.append("waist")
    if "diet" in factor_keys:
        triggers.append("diet")
    if "glucose_hx" in factor_keys:
        triggers.append("glucose_hx")
    if "activity" in factor_keys:
        triggers.append("inactive")
    if "family" in factor_keys:
        triggers.append("family_hx")
    if "bp_meds" in factor_keys:
        triggers.append("bp_meds")
    if "age" in factor_keys:
        triggers.append("age_risk")

    # Direct form fields (from _inputs if present, else skipped)
    form = assessment.get("_inputs", {})
    if form.get("hypertension_dx"):
        triggers.append("htn")
    if form.get("smoker_now"):
        triggers.append("smoker")
    if form.get("gestational_dm"):
        triggers.append("diabscore_prediabetes")

        # Always add general education
    triggers.append("education_general")

    # If nothing risk-specific fired, add a "maintain habits" item so
    # low-risk profiles get more than a single generic education item.
    non_education = [t for t in triggers if t != "education_general"]
    if not non_education:
        triggers.append("maintain_habits")

    return triggers




def _build_context(form: dict, assessment: dict) -> dict:
    """Build the placeholder context for template filling."""
    weight = form.get("weight_kg") or 0
    target_loss = round(weight * 0.07, 1) if weight else 0
    target_weight = round(weight - target_loss, 1) if weight else 0
    loss_per_month = round(target_loss / 6, 1) if target_loss else 0

    sex = form.get("sex", "F")
    waist_target = 94 if sex == "M" else 80

    symptoms = form.get("symptoms", [])
    urgent_symptoms = ", ".join(s for s in symptoms if s in {"chest_pain", "fainting"})
    hyper_symptoms = ", ".join(s for s in symptoms if s in
                              {"thirst", "urination", "weight_loss", "blurred_vision"})

    return {
        "weight_kg": _fmt_fr_number(weight),
        "target_loss_kg": _fmt_fr_number(target_loss),
        "target_weight_kg": _fmt_fr_number(target_weight),
        "loss_per_month": _fmt_fr_number(loss_per_month),
        "waist_cm": form.get("waist_cm", "—"),
        "waist_target": waist_target,
        "age": form.get("age", "—"),
        "findrisc_score": assessment.get("future_risk", {}).get("score", "—"),
        "ten_year_pct": _fmt_fr_number(
            assessment.get("future_risk", {}).get("ten_year_risk_pct")),
        "diabscore": assessment.get("diabscore", {}).get("score", "—"),
        "urgent_symptoms": urgent_symptoms or "—",
        "hyper_symptoms": hyper_symptoms or "—",
    }


def _fill_template(text: str, context: dict) -> str:
    """Fill {placeholders} in a template string. Missing keys are left as-is."""
    try:
        return text.format(**context)
    except (KeyError, IndexError):
        # Fill what we can, leave the rest
        for key, val in context.items():
            text = text.replace("{" + key + "}", str(val))
        return text


# ===========================================================================
# Main generator
# ===========================================================================

CATEGORY_ORDER = ["consultation", "alimentation", "activite_physique",
                  "suivi", "education"]
PRIORITY_ORDER = {"prioritaire": 0, "recommandee": 1, "complementaire": 2}


def generate_protocol(assessment: dict, form: dict,
                      language: str = DEFAULT_LANGUAGE) -> dict:
    """
    Build a protocol draft from an assessment.

    Parameters
    ----------
    assessment : dict
        The output of risk_engine.assess().
    form : dict
        The raw form answers (needed for numeric values like weight).
    language : str
        "fr" (default) or "ar" (scaffolded, not yet filled).

    Returns
    -------
    dict
        A structured protocol ready for nutritionist review.
    """
    now = datetime.now(timezone.utc).isoformat()
    protocol_id = str(uuid.uuid4())

    # Sanity: no protocol for already-diagnosed or out-of-scope users
    status = assessment.get("status", "")
    if status in ("already_diagnosed", "out_of_scope"):
        return {
            "protocol_id": protocol_id,
            "generated_at": now,
            "language": language,
            "version": VERSION,
            "status": "not_applicable",
            "reason": assessment.get("message", ""),
            "items": [],
            "summary": "",
            "urgent_flags": [],
            "requires_medical_referral": False,
            "signature": None,
        }

    # Attach form to assessment so _extract_triggers can read it
    assessment_with_inputs = dict(assessment)
    assessment_with_inputs["_inputs"] = form

    triggers = _extract_triggers(assessment_with_inputs)
    context = _build_context(form, assessment)

    # Look up each trigger and build the item
    items = []
    seen_titles = set()
    for trigger in triggers:
        template = PROTOCOL_LIBRARY.get(trigger)
        if not template:
            continue
        title = template["title"]
        if title in seen_titles:
            continue
        seen_titles.add(title)

        item = {
            "trigger": trigger,
            "category": template["category"],
            "priority": template["priority"],
            "title": title,
            "action": _fill_template(template["action"], context),
            "target": _fill_template(template["target"], context),
            "timeline": _fill_template(template["timeline"], context),
            "evidence": _fill_template(template["evidence"], context),
            "source": template["source"],
        }
        items.append(item)

    # Sort: priority, then category order, then original order
    items.sort(key=lambda it: (
        PRIORITY_ORDER.get(it["priority"], 99),
        CATEGORY_ORDER.index(it["category"])
            if it["category"] in CATEGORY_ORDER else 99,
    ))

    # Cap at MAX_ITEMS
    items = items[:MAX_ITEMS]

    # Urgent flags
    urgent_flags = []
    if any(it["trigger"] == "symptoms_urgent" for it in items):
        urgent_flags.append("emergency_symptoms")
    if any(it["trigger"] == "diabscore_t2d" for it in items):
        urgent_flags.append("likely_hyperglycemia")
    if any(it["trigger"] == "glucose_range" for it in items):
        urgent_flags.append("glucose_in_diabetes_range")

    requires_referral = any(
        it["category"] == "consultation" for it in items)

    # Summary
    summary = _build_summary(assessment, items, context)

    # Disclaimer
    disclaimer = _build_disclaimer(language)

    return {
        "protocol_id": protocol_id,
        "generated_at": now,
        "language": language,
        "version": VERSION,
        "status": "draft",
        "patient_summary": {
            "findrisc_score": assessment.get("future_risk", {}).get("score"),
            "findrisc_band": assessment.get("future_risk", {}).get("band"),
            "ten_year_risk_pct": assessment.get("future_risk", {}).get("ten_year_risk_pct"),
            "diabscore": assessment.get("diabscore", {}).get("score"),
            "diabscore_flags": [
                f for f in ("prediabetes_flag", "t2d_flag")
                if assessment.get("diabscore", {}).get(f)
            ],
            "detector_probability": assessment.get("detect_now", {}).get("probability"),
            "detector_flagged": assessment.get("detect_now", {}).get("flagged"),
        },
        "items": items,
        "summary": summary,
        "disclaimer": disclaimer,
        "urgent_flags": urgent_flags,
        "requires_medical_referral": requires_referral,
        "signature": None,
    }


def _build_summary(assessment: dict, items: list, context: dict) -> str:
    """One-paragraph summary in plain French."""
    score = assessment.get("future_risk", {}).get("score", "—")
    band = assessment.get("future_risk", {}).get("band", "—")
    pct = context.get("ten_year_pct", "—")

    band_fr = {
        "low": "faible",
        "slightly_elevated": "légèrement élevé",
        "moderate": "modéré",
        "high": "élevé",
        "very_high": "très élevé",
    }.get(band, band)

    priorities = [it for it in items if it["priority"] == "prioritaire"][:3]
    priority_str = ", ".join(it["title"].lower() for it in priorities) \
        if priorities else "suivi régulier"

    return (
        f"Votre profil indique un risque {band_fr} de diabète de type 2 "
        f"(environ {pct}% sur 10 ans). "
        f"Les priorités sont : {priority_str}. "
        f"Ce document est un support d'éducation à la santé et ne remplace "
        f"pas une consultation médicale."
    )


def _build_disclaimer(language: str) -> str:
    if language == "ar":
        return ("هذا المستند هو دعم تثقيفي صحي ولا يحل محل الاستشارة الطبية. "
                "استشر أخصائي الرعاية الصحية لأي قرار.")
    return (
        "Ce document est un support d'éducation à la santé. Il ne remplace "
        "pas un avis médical. Consultez un professionnel de santé pour toute "
        "décision concernant votre santé."
    )


# ===========================================================================
# Test - runs on the demo profiles
# ===========================================================================
if __name__ == "__main__":
    from risk_engine import assess
    from demo_profiles import KARIM, LEILA, AMIRA

    profiles = [("KARIM", KARIM), ("LEILA", LEILA), ("AMIRA", AMIRA)]

    for name, profile in profiles:
        print(f"\n{'='*72}\n{name}\n{'='*72}")
        assessment = assess(profile)
        protocol = generate_protocol(assessment, profile, language="fr")

        print(f"Protocol ID:  {protocol['protocol_id'][:8]}...")
        print(f"Status:       {protocol['status']}")
        print(f"Items:        {len(protocol['items'])}")
        print(f"Urgent flags: {protocol['urgent_flags']}")
        print(f"Referral:     {protocol['requires_medical_referral']}")
        print(f"\nSummary: {protocol['summary']}")
        print(f"\nItems:")
        for i, item in enumerate(protocol["items"], 1):
            print(f"\n  [{i}] {item['priority'].upper()} | {item['category']}")
            print(f"      Trigger: {item['trigger']}")
            print(f"      {item['title']}")
            print(f"      → {item['action']}")
            print(f"      Cible: {item['target']} ({item['timeline']})")
            print(f"      Source: {item['source']}")

    print(f"\n{'='*72}\nDone. Review the items above for tone and content.\n{'='*72}")