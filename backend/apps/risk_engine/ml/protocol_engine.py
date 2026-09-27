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
import uuid

VERSION = "2.0"
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
    # ---------------------------------------------------------------------
    # DMI FHIR Triggers (source: données cliniques du dossier médical)
    # ---------------------------------------------------------------------
    "dmi_hba1c_prediabetes": {
        "category": "suivi",
        "priority": "prioritaire",
        "title": "Surveillance glycémique trimestrielle (HbA1c pré-diabétique)",
        "action": "Votre dossier médical indique une HbA1c de {dmi_hba1c}%, "
                  "dans la zone pré-diabétique (5,7–6,4%). "
                  "Un dosage trimestriel est recommandé pour surveiller l'évolution. "
                  "Le renforcement du mode de vie (alimentation et activité physique) "
                  "peut normaliser cette valeur.",
        "target": "HbA1c < 5,7% en 6 mois",
        "timeline": "Contrôle trimestriel",
        "evidence": "HbA1c DMI: {dmi_hba1c}% — seuil pré-diabète ADA: 5,7–6,4%",
        "source": "DMI FHIR",
    },
    "dmi_hba1c_diabetes": {
        "category": "consultation",
        "priority": "prioritaire",
        "title": "Alerte clinique : HbA1c dans la zone diabétique",
        "action": "Votre dossier médical enregistre une HbA1c de {dmi_hba1c}%, "
                  "atteignant ou dépassant le seuil diagnostique du diabète (≥ 6,5%). "
                  "Une consultation médicale urgente est requise pour confirmation et prise en charge.",
        "target": "Consultation médicale urgente",
        "timeline": "Dans les 2 semaines",
        "evidence": "HbA1c DMI: {dmi_hba1c}% ≥ 6,5% — critère diagnostique ADA/OMS",
        "source": "DMI FHIR",
    },
    "dmi_glucose_prediabetes": {
        "category": "suivi",
        "priority": "prioritaire",
        "title": "Glycémie à jeun pré-diabétique (DMI)",
        "action": "Votre dossier indique une glycémie à jeun de {dmi_glycemie} mmol/L, "
                  "dans la zone pré-diabétique (5,6–6,9 mmol/L). "
                  "Adoptez un régime à faible index glycémique et intensifiez l'activité physique.",
        "target": "Glycémie < 5,6 mmol/L",
        "timeline": "Contrôle dans 3 mois",
        "evidence": "Glycémie DMI: {dmi_glycemie} mmol/L — seuil pré-diabète: 5,6–6,9 mmol/L",
        "source": "DMI FHIR",
    },
    "dmi_glucose_diabetes": {
        "category": "consultation",
        "priority": "prioritaire",
        "title": "Alerte clinique : Glycémie dans la zone diabétique (DMI)",
        "action": "Votre dossier indique une glycémie à jeun de {dmi_glycemie} mmol/L ≥ 7,0 mmol/L. "
                  "Ce résultat nécessite une confirmation médicale immédiate.",
        "target": "Consultation médicale urgente",
        "timeline": "Dans les 2 semaines",
        "evidence": "Glycémie DMI: {dmi_glycemie} mmol/L ≥ 7,0 mmol/L — critère ADA",
        "source": "DMI FHIR",
    },
    "dmi_statin": {
        "category": "alimentation",
        "priority": "prioritaire",
        "title": "Interaction médicament-aliment : Statine",
        "action": "Vous prenez {dmi_statine_nom} (statine). "
                  "Le pamplemousse et les jus d'agrumes amers (bergamote) "
                  "inhibent l'enzyme CYP3A4, augmentant la concentration sanguine de la statine "
                  "et le risque de myopathie. Évitez absolument ces aliments. "
                  "Renforcez le profil méditerranéen (huile d'olive, poissons gras, légumineuses).",
        "target": "Suppression pamplemousse/agrumes amers",
        "timeline": "Immédiat et permanent",
        "evidence": "Interaction CYP3A4 documentée — {dmi_statine_nom}",
        "source": "DMI FHIR",
    },
    "dmi_ace_inhibitor": {
        "category": "alimentation",
        "priority": "recommandee",
        "title": "Interaction médicament-aliment : IEC (antihypertenseur)",
        "action": "Vous prenez un inhibiteur de l'enzyme de conversion (IEC : {dmi_ieca_nom}). "
                  "Un excès de potassium (sels de substitution, excès de bananes, fruits secs, "
                  "légumineuses en grande quantité) peut provoquer une hyperkaliémie. "
                  "Maintenez un apport en potassium équilibré sans excès.",
        "target": "Apport potassium équilibré",
        "timeline": "Permanent",
        "evidence": "Risque hyperkaliémie sous IEC — {dmi_ieca_nom}",
        "source": "DMI FHIR",
    },
    "dmi_ckd_stage_3": {
        "category": "alimentation",
        "priority": "prioritaire",
        "title": "Insuffisance rénale chronique : Adaptation diététique",
        "action": "Votre dossier indique une créatinine élevée ({dmi_creatinine} µmol/L), "
                  "compatible avec une insuffisance rénale chronique. "
                  "Limitez les apports protéiques à 0,8 g/kg/j maximum. "
                  "Évitez strictement l'automédication par AINS (ibuprofène, naproxène). "
                  "Un suivi néphrologique est recommandé.",
        "target": "Protéines ≤ 0,8 g/kg/j",
        "timeline": "Immédiat",
        "evidence": "Créatinine DMI: {dmi_creatinine} µmol/L > 106 µmol/L",
        "source": "DMI FHIR",
    },
    "dmi_dyslipidemia": {
        "category": "alimentation",
        "priority": "prioritaire",
        "title": "Dyslipidémie documentée : Réduction des graisses saturées",
        "action": "Une dyslipidémie est documentée dans votre dossier médical. "
                  "Réduisez drastiquement les acides gras saturés (viandes grasses, charcuteries, "
                  "beurre, fromages gras, pâtisseries) et les acides gras trans (margarines, "
                  "produits industriels). Privilégiez les acides gras insaturés (huile d'olive, "
                  "poissons gras, noix).",
        "target": "Réduction graisses saturées < 7% calories totales",
        "timeline": "Progressif sur 4 semaines",
        "evidence": "Dyslipidémie CIM-10 E78.* documentée dans le DMI",
        "source": "DMI FHIR",
    },
    "dmi_hypertension": {
        "category": "alimentation",
        "priority": "prioritaire",
        "title": "Hypertension documentée : Restriction sodée et régime DASH",
        "action": "Une hypertension artérielle essentielle (I10) est documentée dans votre dossier. "
                  "Limitez les apports en sel à moins de 5 g par jour (évitez les charcuteries, "
                  "conserves, fromages salés, plats industriels). "
                  "Adoptez le régime DASH-méditerranéen : riche en légumes, fruits, "
                  "légumineuses, céréales complètes et pauvre en sodium.",
        "target": "Apport sodé < 5 g/jour",
        "timeline": "Immédiat",
        "evidence": "HTA essentielle CIM-10 I10 documentée dans le DMI",
        "source": "DMI FHIR",
    },
    "dmi_recent_hba1c": {
        "category": "suivi",
        "priority": "complementaire",
        "title": "HbA1c récente disponible dans le dossier",
        "action": "Un dosage d'HbA1c récent ({dmi_hba1c_date}) est déjà disponible dans votre dossier médical. "
                  "Aucun dosage supplémentaire n'est nécessaire dans l'immédiat. "
                  "La prochaine évaluation sera planifiée selon les recommandations du nutritionniste.",
        "target": "Exploiter le bilan biologique existant",
        "timeline": "Prochain rendez-vous de suivi",
        "evidence": "HbA1c datée de moins de 90 jours dans le DMI",
        "source": "DMI FHIR",
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


def _build_dmi_context(dmi: dict | None) -> dict:
    """
    Extrait et formate les valeurs numériques clés du DMI pour le remplissage
    des gabarits de l'agent. Retourne un dict vide si aucune DMI disponible.
    """
    if not dmi or not dmi.get("dmi_disponible"):
        return {}

    ctx = {}

    # Observations biologiques
    for obs in dmi.get("observations", []):
        code = obs.get("code", "").lower()
        val = obs.get("valeur")
        if val is None:
            continue
        if "hba1c" in code or "hba" in code:
            ctx["dmi_hba1c"] = _fmt_fr_number(val)
            ctx["dmi_hba1c_raw"] = float(val)
            # Date du dernier HbA1c
            date_obs = obs.get("date", "")
            ctx["dmi_hba1c_date"] = date_obs
        elif "glyc" in code or "glucose" in code or "gluc" in code:
            ctx["dmi_glycemie"] = _fmt_fr_number(val)
            ctx["dmi_glycemie_raw"] = float(val)
        elif "creat" in code:
            ctx["dmi_creatinine"] = _fmt_fr_number(val)
            ctx["dmi_creatinine_raw"] = float(val)

    # Médicaments : statines et IEC
    for med in dmi.get("medicaments", []):
        nom = med.get("nom", "")
        nom_lower = nom.lower()
        if any(k in nom_lower for k in ("statin", "atorva", "rosuva", "simva", "pravasta", "fluva", "pitava")):
            ctx.setdefault("dmi_statine_nom", nom)
        ieca_keywords = ("pril", "ramipril", "lisinopril", "enalapril", "captopril",
                         "perindopril", "fosinopril", "quinapril", "trandolapril")
        if any(k in nom_lower for k in ieca_keywords):
            ctx.setdefault("dmi_ieca_nom", nom)

    # Valeurs par défaut pour les placeholders non remplis
    ctx.setdefault("dmi_hba1c", "—")
    ctx.setdefault("dmi_hba1c_raw", None)
    ctx.setdefault("dmi_hba1c_date", "—")
    ctx.setdefault("dmi_glycemie", "—")
    ctx.setdefault("dmi_glycemie_raw", None)
    ctx.setdefault("dmi_creatinine", "—")
    ctx.setdefault("dmi_creatinine_raw", None)
    ctx.setdefault("dmi_statine_nom", "statine")
    ctx.setdefault("dmi_ieca_nom", "IEC")

    return ctx


def _extract_triggers(assessment: dict, dmi: dict | None = None) -> list:
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

    # ---------------------------------------------------------------
    # DMI FHIR triggers
    # ---------------------------------------------------------------
    if dmi and dmi.get("dmi_disponible"):
        dmi_ctx = _build_dmi_context(dmi)

        # HbA1c
        hba1c = dmi_ctx.get("dmi_hba1c_raw")
        if hba1c is not None:
            if hba1c >= 6.5:
                triggers.append("dmi_hba1c_diabetes")
            elif hba1c >= 5.7:
                triggers.append("dmi_hba1c_prediabetes")
            # Dosage récent (< 90 jours)
            from datetime import datetime as _dt
            date_hba1c = dmi_ctx.get("dmi_hba1c_date", "")
            if date_hba1c:
                try:
                    d = _dt.fromisoformat(date_hba1c.replace("Z", "+00:00"))
                    age_days = (_dt.now(d.tzinfo) - d).days
                    if age_days < 90:
                        triggers.append("dmi_recent_hba1c")
                except Exception:
                    pass

        # Glycémie à jeun
        glycemie = dmi_ctx.get("dmi_glycemie_raw")
        if glycemie is not None:
            if glycemie >= 7.0:
                triggers.append("dmi_glucose_diabetes")
            elif glycemie >= 5.6:
                triggers.append("dmi_glucose_prediabetes")

        # Créatinine > 106 µmol/L → IRC stade 3
        creatinine = dmi_ctx.get("dmi_creatinine_raw")
        if creatinine is not None and creatinine > 106:
            triggers.append("dmi_ckd_stage_3")

        # Médicaments
        if "dmi_statine_nom" in dmi_ctx and dmi_ctx["dmi_statine_nom"] != "statine":
            triggers.append("dmi_statin")
        if "dmi_ieca_nom" in dmi_ctx and dmi_ctx["dmi_ieca_nom"] != "IEC":
            triggers.append("dmi_ace_inhibitor")

        # Conditions CIM-10
        for cond in dmi.get("conditions", []):
            code = cond.get("code", "")
            statut = cond.get("statut", "").lower()
            if statut != "active":
                continue
            if code == "I10":
                triggers.append("dmi_hypertension")
            if code.startswith("E78"):
                triggers.append("dmi_dyslipidemia")

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
    hyper_symptoms = ", ".join(
        s for s in symptoms if s in {"thirst", "urination", "weight_loss", "blurred_vision"}
    )

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


def _apply_guardrails(
    protocol: dict,
    form: dict,
    dmi: dict | None,
    dmi_ctx: dict | None = None,
) -> dict:
    """
    Garde-fous cliniques déterministes post-génération (6 règles impératives).
    Les guardrails sont ADDITIFS — ils ne retirent jamais de recommandations,
    sauf les allergènes déclarés (règle 4).
    """
    import re
    flags = list(protocol.get("urgent_flags", []))
    items = list(protocol.get("items", []))
    item_triggers = {it["trigger"] for it in items}

    def _add_item_first(trigger_key: str):
        """Insère un item en tête s'il n'est pas déjà présent."""
        if trigger_key not in item_triggers:
            tpl = PROTOCOL_LIBRARY.get(trigger_key)
            if tpl:
                ctx = dmi_ctx or {}
                item = {
                    "trigger": trigger_key,
                    "category": tpl["category"],
                    "priority": tpl["priority"],
                    "title": tpl["title"],
                    "action": _fill_template(tpl["action"], ctx),
                    "target": _fill_template(tpl["target"], ctx),
                    "timeline": _fill_template(tpl["timeline"], ctx),
                    "evidence": _fill_template(tpl["evidence"], ctx),
                    "source": tpl["source"],
                }
                items.insert(0, item)
                item_triggers.add(trigger_key)

    # Règle 1 — Hyperglycémie confirmée
    hba1c_raw = (dmi_ctx or {}).get("dmi_hba1c_raw")
    glycemie_raw = (dmi_ctx or {}).get("dmi_glycemie_raw")
    form_glycemie = form.get("glycemie_jeun_mmol")
    form_hba1c = form.get("hba1c_valeur")

    confirmed_hyper = (
        (hba1c_raw is not None and hba1c_raw >= 6.5)
        or (glycemie_raw is not None and glycemie_raw >= 7.0)
        or (form_hba1c is not None and float(form_hba1c) >= 6.5)
        or (form_glycemie is not None and float(form_glycemie) >= 7.0)
    )
    if confirmed_hyper:
        protocol["requires_medical_referral"] = True
        if "confirmed_hyperglycemia" not in flags:
            flags.append("confirmed_hyperglycemia")
        _add_item_first("glucose_range")

    # Règle 2 — Insuffisance rénale chronique (créatinine DMI > 106)
    if dmi_ctx and dmi_ctx.get("dmi_creatinine_raw", 0) and dmi_ctx["dmi_creatinine_raw"] > 106:
        if "ckd_documented" not in flags:
            flags.append("ckd_documented")
        _add_item_first("dmi_ckd_stage_3")

    # Règle 3 — Traitement par statine
    statine_nom = (dmi_ctx or {}).get("dmi_statine_nom", "statine")
    has_statine = (
        (statine_nom != "statine")
        or any("statin" in (med.get("nom", "") or "").lower()
               for med in (dmi or {}).get("medicaments", []))
        or any("statin" in s.lower()
               for s in str(form.get("prise_medicaments_liste", "")).split(","))
    )
    if has_statine:
        if "drug_food_interaction" not in flags:
            flags.append("drug_food_interaction")
        _add_item_first("dmi_statin")

    # Règle 4 — Allergies alimentaires déclarées
    allergie_str = str(form.get("allergie_alimentaire", "") or "").strip()
    if allergie_str:
        allergenes = [a.strip().lower() for a in re.split(r'[,;]', allergie_str) if a.strip()]
        if allergenes and "allergen_removed" not in flags:
            flags.append("allergen_removed")
        # Signaler dans le protocole sans supprimer les items (additif)
        protocol["allergie_alimentaire_declaree"] = allergie_str
        protocol["allergenes_detectes"] = allergenes

    # Règle 5 — Tabagisme actif
    if form.get("statut_tabagisme") == "FUMEUR_ACTUEL":
        if "smoking" not in flags:
            flags.append("smoking")
        _add_item_first("smoker")

    # Règle 6 — Grossesse / diabète gestationnel
    if form.get("pregnant") or form.get("diabete_gestationnel_antecedent"):
        protocol["requires_medical_referral"] = True
        if "gestational_risk" not in flags:
            flags.append("gestational_risk")

    protocol["urgent_flags"] = flags
    protocol["items"] = items[:MAX_ITEMS]
    return protocol


def generate_protocol(assessment: dict, form: dict,
                      dmi: dict | None = None,
                      language: str = DEFAULT_LANGUAGE) -> dict:
    """
    Build a protocol draft from an assessment.

    Parameters
    ----------
    assessment : dict
        The output of risk_engine.assess().
    form : dict
        The raw form answers (needed for numeric values like weight).
    dmi : dict | None
        Optional ContexteDMI from HAPI FHIR (see ClientHapiFhir.lire_dossier_patient).
        When None or dmi['dmi_disponible'] is False, behaviour is unchanged.
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

    dmi_ctx = _build_dmi_context(dmi)
    triggers = _extract_triggers(assessment_with_inputs, dmi=dmi)
    context = {**_build_context(form, assessment), **dmi_ctx}

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
        (
            CATEGORY_ORDER.index(it["category"])
            if it["category"] in CATEGORY_ORDER else 99
        ),
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

    # DMI metadata
    dmi_integrated = bool(dmi and dmi.get("dmi_disponible"))
    dmi_summary = dmi.get("resume_clinique", "") if dmi_integrated else ""

    protocol = {
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
        # DMI integration metadata
        "dmi_integrated": dmi_integrated,
        "dmi_source": "fhir" if dmi_integrated else None,
        "dmi_summary": dmi_summary,
    }

    # Apply deterministic clinical guardrails
    protocol = _apply_guardrails(protocol, form, dmi, dmi_ctx)

    return protocol


def _build_summary(assessment: dict, items: list, context: dict) -> str:
    """One-paragraph summary in plain French."""
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
    import os
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    _this_dir = os.path.dirname(os.path.abspath(__file__))
    if _this_dir not in sys.path:
        sys.path.insert(0, _this_dir)

    from risk_engine import assess
    from demo_profiles import KARIM, LEILA, AMIRA

    WITH_DMI = "--with-dmi" in sys.argv

    # Mock DMI simulé pour Karim Mansouri (TUN10001968)
    KARIM_DMI_MOCK = {
        "dmi_disponible": True,
        "fhir_patient_id": "mock-karim-001",
        "conditions": [
            {"code": "I10", "libelle": "Hypertension artérielle essentielle",
             "statut": "active", "onset": "2018-06"},
        ],
        "observations": [
            {"code": "HbA1c", "valeur": 6.8, "unite": "%",
             "date": "2026-08-15", "interpretation": "HIGH"},
            {"code": "Glycémie jeun", "valeur": 7.2, "unite": "mmol/L",
             "date": "2026-08-15"},
            {"code": "Créatinine", "valeur": 88, "unite": "µmol/L",
             "date": "2026-08-15"},
        ],
        "medicaments": [
            {"nom": "Ramipril 10mg", "indication": "HTA", "statut": "active"},
            {"nom": "Atorvastatine 40mg", "indication": "Dyslipidémie", "statut": "active"},
            {"nom": "Aspirine 100mg", "indication": "Cardio-protection", "statut": "active"},
        ],
        "allergies": [],
        "resume_clinique": "Patient coronarien, HTA traitée. HbA1c 6,8% — zone diabétique. "
                           "Statine + IECA actifs."
    }

    profiles = [("KARIM", KARIM), ("LEILA", LEILA), ("AMIRA", AMIRA)]

    for name, profile in profiles:
        print(f"\n{'='*72}\n{name}\n{'='*72}")
        assessment = assess(profile)
        dmi_arg = KARIM_DMI_MOCK if (WITH_DMI and name == "KARIM") else None
        protocol = generate_protocol(assessment, profile, dmi=dmi_arg, language="fr")

        print(f"Protocol ID:   {protocol['protocol_id'][:8]}...")
        print(f"Status:        {protocol['status']}")
        print(f"DMI intégré:   {protocol['dmi_integrated']}")
        if protocol['dmi_integrated']:
            print(f"Résumé DMI:    {protocol['dmi_summary']}")
        print(f"Items:         {len(protocol['items'])}")
        print(f"Urgent flags:  {protocol['urgent_flags']}")
        print(f"Referral:      {protocol['requires_medical_referral']}")
        print(f"\nSummary: {protocol['summary']}")
        print("\nItems:")
        for i, item in enumerate(protocol["items"], 1):
            print(f"\n  [{i}] {item['priority'].upper()} | {item['category']}")
            print(f"      Trigger: {item['trigger']}")
            print(f"      {item['title']}")
            print(f"      → {item['action']}")
            print(f"      Cible: {item['target']} ({item['timeline']})")
            print(f"      Source: {item['source']}")

    if WITH_DMI:
        print(f"\n{'='*72}")
        print("Test guardrails sur KARIM avec HbA1c=6.8% (doit déclencher confirmed_hyperglycemia):")
        assessment = assess(KARIM)
        p = generate_protocol(assessment, KARIM, dmi=KARIM_DMI_MOCK)
        assert p["requires_medical_referral"] is True, "ÉCHEC: requires_medical_referral doit être True"
        assert "confirmed_hyperglycemia" in p["urgent_flags"], "ÉCHEC: confirmed_hyperglycemia absent"
        print("✓ requires_medical_referral = True")
        print("✓ confirmed_hyperglycemia détecté")

    print(f"\n{'='*72}\nDone. Review the items above for tone and content.\n{'='*72}")
