"""
Définition officielle en français des 14 champs du questionnaire de dépistage Wiqayati (v1.0).
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
            "nom": "taille_cm",
            "type": "decimal",
            "libelle": "Taille",
            "description": "Taille debout, sans chaussures",
            "obligatoire": False,
            "min": 100.0,
            "max": 250.0,
            "unite": "cm"
        },
        {
            "nom": "tour_hanches_cm",
            "type": "decimal",
            "libelle": "Tour de hanches",
            "description": "Mesuré au niveau le plus large des fesses",
            "obligatoire": False,
            "min": 50.0,
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
