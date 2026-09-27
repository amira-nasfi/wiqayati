"""
Définition officielle en français des champs du questionnaire de dépistage Wiqayati.
v1.0 : 14 champs de base (FINDRISC étendu Tunisie)
v2.0 : +12 champs cliniques complémentaires (Hybrid Agent DMI)
"""

DEFINITION_QUESTIONNAIRE_V1 = {
    "version": "1.0",
    "titre": "Questionnaire National de Dépistage Précoce du Diabète de Type 2",
    "description": "Formulaire d'évaluation des facteurs de risque métaboliques et comportementaux.",
    "champs": [
        {
            "nom": "age",
            "type": "entier",
            "libelle": "Âge",
            "description": "Âge du patient en années révolues",
            "obligatoire": True,
            "min": 18,
            "max": 120,
            "unite": "ans"
        },
        {
            "nom": "genre",
            "type": "choix",
            "libelle": "Genre",
            "obligatoire": True,
            "options": [
                {"valeur": "M", "libelle": "Masculin"},
                {"valeur": "F", "libelle": "Féminin"},
                {"valeur": "AUTRE", "libelle": "Autre"}
            ]
        },
        {
            "nom": "taille_cm",
            "type": "decimal",
            "libelle": "Taille",
            "description": "Taille du patient en centimètres",
            "obligatoire": True,
            "min": 100.0,
            "max": 230.0,
            "unite": "cm"
        },
        {
            "nom": "imc",
            "type": "decimal",
            "libelle": "Indice de Masse Corporelle (IMC)",
            "description": "Poids (kg) divisé par la taille au carré (m²)",
            "obligatoire": True,
            "min": 10.0,
            "max": 80.0,
            "unite": "kg/m²"
        },
        {
            "nom": "tour_taille_cm",
            "type": "decimal",
            "libelle": "Tour de taille",
            "description": "Mesuré à mi-distance entre le bas des côtes et la crête iliaque",
            "obligatoire": True,
            "min": 40.0,
            "max": 200.0,
            "unite": "cm"
        },
        {
            "nom": "antecedents_familiaux_diabete",
            "type": "booleen",
            "libelle": "Antécédents familiaux de diabète",
            "description": "Présence de diabète de type 2 chez parents, frères ou sœurs (1er degré)",
            "obligatoire": True
        },
        {
            "nom": "hypertension_diagnostiquee",
            "type": "booleen",
            "libelle": "Hypertension artérielle",
            "description": "Hypertension diagnostiquée ou prise de médicaments antihypertenseurs",
            "obligatoire": True
        },
        {
            "nom": "niveau_activite_physique",
            "type": "choix",
            "libelle": "Activité physique habituelle",
            "obligatoire": True,
            "options": [
                {"valeur": "FAIBLE", "libelle": "Faible (sédentaire, moins de 30 min par semaine)"},
                {"valeur": "MODERE", "libelle": "Modérée (30 à 150 min d'exercice modéré par semaine)"},
                {"valeur": "ELEVE", "libelle": "Élevée (plus de 150 min par semaine ou activité sportive régulière)"}
            ]
        },
        {
            "nom": "qualite_alimentation",
            "type": "choix",
            "libelle": "Qualité de l'alimentation",
            "obligatoire": True,
            "options": [
                {"valeur": "BONNE", "libelle": "Équilibrée (légumes, fruits frais quotidiens, peu de sucres)"},
                {"valeur": "MOYENNE", "libelle": "Moyenne (consommation irrégulière de fruits/légumes)"},
                {"valeur": "MAUVAISE", "libelle": "Déséquilibrée (riche en fritures, boissons sucrées, pâtisseries)"}
            ]
        },
        {
            "nom": "statut_tabagisme",
            "type": "choix",
            "libelle": "Statut tabagique",
            "obligatoire": True,
            "options": [
                {"valeur": "JAMAIS", "libelle": "Jamais fumé"},
                {"valeur": "EX_FUMEUR", "libelle": "Ancien fumeur (sevrage complet)"},
                {"valeur": "FUMEUR_ACTUEL", "libelle": "Fumeur actif (cigarettes, chicha, etc.)"}
            ]
        },
        {
            "nom": "glycemie_jeun_connue",
            "type": "booleen",
            "libelle": "Glycémie à jeun déjà mesurée",
            "description": "Le patient dispose-t-il d'un résultat récent de glycémie à jeun ?",
            "obligatoire": True
        },
        {
            "nom": "glycemie_jeun_mmol",
            "type": "decimal",
            "libelle": "Valeur de la glycémie à jeun",
            "description": "En mmol/L (laisser vide si non connue)",
            "obligatoire": False,
            "min": 0.0,
            "max": 40.0,
            "unite": "mmol/L"
        },
        {
            "nom": "high_glucose_hist",
            "type": "booleen",
            "libelle": "Antécédent de glycémie élevée",
            "description": "Un professionnel de santé vous a-t-il déjà informé que votre glycémie était élevée ?",
            "obligatoire": True
        },
        {
            "nom": "diabete_gestationnel_antecedent",
            "type": "booleen",
            "libelle": "Antécédent de diabète gestationnel",
            "description": "Diabète diagnostiqué au cours d'une grossesse (femmes)",
            "obligatoire": True
        },
        {
            "nom": "medicaments_corticoides",
            "type": "booleen",
            "libelle": "Prise au long cours de corticoïdes",
            "description": "Traitements réguliers ou fréquents par corticoïdes",
            "obligatoire": True
        },
        {
            "nom": "acanthosis_nigricans",
            "type": "booleen",
            "libelle": "Présence d'Acanthosis nigricans",
            "description": "Signe cutané : hyperpigmentation veloutée des plis du cou ou des aisselles",
            "obligatoire": True
        }
    ]
}

# ─── Champs supplémentaires v2.0 (tous optionnels — rétrocompatibilité v1.0 garantie) ─────────
_CHAMPS_V2 = [
    {
        "nom": "tour_hanche_cm",
        "type": "decimal",
        "libelle": "Tour de hanche",
        "description": "Mesuré autour de la partie la plus large des hanches",
        "obligatoire": False,
        "min": 50.0,
        "max": 200.0,
        "unite": "cm",
        "utilite_clinique": "Ratio taille/hanche → risque cardio-métabolique"
    },
    {
        "nom": "pression_arterielle_systolique",
        "type": "entier",
        "libelle": "Pression artérielle systolique",
        "description": "Valeur en mmHg (chiffre le plus haut)",
        "obligatoire": False,
        "min": 70,
        "max": 250,
        "unite": "mmHg",
        "utilite_clinique": "Valeur numérique de l'HTA pour le LLM"
    },
    {
        "nom": "antecedents_cardiovasculaires",
        "type": "booleen",
        "libelle": "Antécédents cardiovasculaires personnels",
        "description": "Infarctus du myocarde, AVC, angor documenté",
        "obligatoire": False,
        "utilite_clinique": "Facteur de risque cardio-métabolique majeur"
    },
    {
        "nom": "cholesterol_total_eleve",
        "type": "booleen",
        "libelle": "Cholestérol total élevé connu",
        "description": "Diagnostic de dyslipidémie ou résultat biologique élevé",
        "obligatoire": False,
        "utilite_clinique": "Facteur de risque métabolique"
    },
    {
        "nom": "hba1c_connue",
        "type": "booleen",
        "libelle": "HbA1c déjà dosée",
        "description": "Le patient dispose-t-il d'un résultat récent d'HbA1c ?",
        "obligatoire": False,
        "utilite_clinique": "Disponibilité d'un suivi glycémique"
    },
    {
        "nom": "hba1c_valeur",
        "type": "decimal",
        "libelle": "Valeur HbA1c",
        "description": "En pourcentage (laisser vide si non connue). Conditionnelle si hba1c_connue=true.",
        "obligatoire": False,
        "min": 3.0,
        "max": 20.0,
        "unite": "%",
        "utilite_clinique": "Suivi glycémique sur 3 mois"
    },
    {
        "nom": "prise_medicaments_liste",
        "type": "texte",
        "libelle": "Médicaments en cours",
        "description": "Liste libre des traitements actuels (corticoïdes, diurétiques, antipsychotiques, etc.)",
        "obligatoire": False,
        "max_longueur": 500,
        "utilite_clinique": "Interaction médicament-aliment pour le LLM"
    },
    {
        "nom": "sommeil_heures",
        "type": "decimal",
        "libelle": "Durée de sommeil habituelle",
        "description": "Nombre moyen d'heures de sommeil par nuit",
        "obligatoire": False,
        "min": 2.0,
        "max": 14.0,
        "unite": "h/nuit",
        "utilite_clinique": "Facteur métabolique émergent"
    },
    {
        "nom": "stress_chronique",
        "type": "choix",
        "libelle": "Niveau de stress chronique perçu",
        "description": "Évaluation subjective du stress au quotidien",
        "obligatoire": False,
        "options": [
            {"valeur": "FAIBLE", "libelle": "Faible — situation globalement sereine"},
            {"valeur": "MODERE", "libelle": "Modéré — stress occasionnel gérable"},
            {"valeur": "ELEVE", "libelle": "Élevé — stress chronique quotidien"}
        ],
        "utilite_clinique": "Le stress chronique élève le cortisol et favorise la dysglycémie"
    },
    {
        "nom": "alimentation_mediterraneenne",
        "type": "booleen",
        "libelle": "Adhérence au régime méditerranéen",
        "description": "Alimentation basée sur huile d'olive, légumineuses, poissons, légumes de saison",
        "obligatoire": False,
        "utilite_clinique": "Facteur protecteur tunisien reconnu"
    },
    {
        "nom": "consommation_sucres_caches",
        "type": "choix",
        "libelle": "Fréquence de consommation de produits ultra-transformés",
        "description": "Sodas, biscuits industriels, céréales sucrées, plats préparés",
        "obligatoire": False,
        "options": [
            {"valeur": "RAREMENT", "libelle": "Rarement (moins d'1 fois par semaine)"},
            {"valeur": "HEBDOMADAIRE", "libelle": "Hebdomadaire (1 à 3 fois par semaine)"},
            {"valeur": "QUOTIDIENNE", "libelle": "Quotidienne (chaque jour ou presque)"}
        ],
        "utilite_clinique": "Charge glycémique et index insulinique"
    },
    {
        "nom": "allergie_alimentaire",
        "type": "texte",
        "libelle": "Allergies et intolérances alimentaires connues",
        "description": (
            "Liste libre des allergies ou intolérances alimentaires déclarées par le patient "
            "(ex : intolérance au lactose, allergie aux arachides, gluten, fruits de mer, œufs, soja…). "
            "Le guardrail vérifiera que le plan ne recommande aucun aliment allergène."
        ),
        "obligatoire": False,
        "max_longueur": 300,
        "placeholder": "Ex : arachides, lactose, gluten, fruits à coque",
        "utilite_clinique": "Exclusion des aliments allergènes des recommandations nutritionnelles"
    },
]

DEFINITION_QUESTIONNAIRE_V2 = {
    "version": "2.0",
    "titre": "Questionnaire National de Dépistage Précoce du Diabète de Type 2 (v2.0 — Agent Hybride)",
    "description": (
        "Version enrichie du formulaire FINDRISC incluant des données cliniques complémentaires "
        "exploitées par l'Agent Hybride LLM pour personnaliser le plan de soin."
    ),
    "champs": DEFINITION_QUESTIONNAIRE_V1["champs"] + _CHAMPS_V2
}
