"""
Script de peuplement de la base de données — Wiqayati (données de démo enrichies)
================================================================================
Crée :
  - 1 Admin IT
  - 1 Admin Ministère
  - 3 Nutritionnistes
  - 3 Agents avec structures complètes (Dispensaires / CSB et Campagne caravane mobile)
  - 16 Patients avec CIN (8 chiffres stricts) + INS + Données cliniques exhaustives (14 variables FINDRISC)
  - Suivi longitudinal (évaluations répétées démontrant la réduction du risque diabète)
  - Répartition multi-canaux (Mobile citoyen, Dispensaire CSB, Caravane mobile)
  - Plans de soin (VALIDÉ ou BROUILLON/À MODIFIER — aucun rejeté selon la directive clinique)
  - Notifications citoyennes

Usage :
    python scripts/seed_demo.py
"""
import datetime
import io
import os
import sys
from pathlib import Path

# Fix encoding on Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import django

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wiqayati.settings.development')
django.setup()

from django.utils import timezone  # noqa: E402
from django.db import transaction  # noqa: E402

from apps.accounts.models import CompteUtilisateur, Role, Notification  # noqa: E402
from apps.screening.models import ProfilPatient, ReponseScreening, TypeSoumission  # noqa: E402
from apps.risk_engine.models import ResultatEvaluationRisque, NiveauRisque  # noqa: E402
from apps.care_plan.models import PlanSoin, StatutPlan  # noqa: E402
from apps.nutritionist_queue.models import (  # noqa: E402
    TacheNutritionniste, PrioriteTache, StatutTache,
)

print("=" * 70)
print("  WIQAYATI — Peuplement de la base de données de démonstration")
print("=" * 70)

# ─────────────────────────────────────────────────────────────────────────────
# 1. NETTOYAGE PRÉALABLE
# ─────────────────────────────────────────────────────────────────────────────
print("\n[1/6] Nettoyage des données existantes…")
Notification.objects.all().delete()
TacheNutritionniste.objects.all().delete()
PlanSoin.objects.all().delete()
ResultatEvaluationRisque.objects.all().delete()
ReponseScreening.objects.all().delete()
ProfilPatient.objects.all().delete()
CompteUtilisateur.objects.all().delete()
print("     [OK] Tables nettoyées")

# ─────────────────────────────────────────────────────────────────────────────
# 2. COMPTES UTILISATEURS & STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────
print("\n[2/6] Création des comptes utilisateurs et structures…")

with transaction.atomic():
    # ── Admin IT ──
    admin_it = CompteUtilisateur.objects.create_user(
        username='admin.it',
        email='admin.it@wiqayati.tn',
        password='Admin2026!',
        prenom='Sami',
        nom='Bouaziz',
        role=Role.ADMIN_IT,
        is_staff=True,
    )

    # ── Admin Ministère ──
    admin_min = CompteUtilisateur.objects.create_user(
        username='admin.ministere',
        email='admin.ministere@sante.gov.tn',
        password='Admin2026!',
        prenom='Houda',
        nom='Meddeb',
        role=Role.ADMIN_MINISTERE,
    )

    # ── Nutritionnistes ──
    nutri1 = CompteUtilisateur.objects.create_user(
        username='nutri.ben_ali',
        email='s.benali@hopital-tunis.tn',
        password='Nutri2026!',
        prenom='Sirine',
        nom='Ben Ali',
        role=Role.NUTRITIONNISTE,
        gouvernorat='Tunis',
        structure_nom="Institut National de Nutrition de Tunis",
        structure_localisation="Bab Saadoun, Tunis",
        structure_code="INN-TUN-01",
        responsable_structure="Pr. H. Aounallah",
    )
    nutri2 = CompteUtilisateur.objects.create_user(
        username='nutri.trabelsi',
        email='m.trabelsi@hopital-sfax.tn',
        password='Nutri2026!',
        prenom='Mohamed',
        nom='Trabelsi',
        role=Role.NUTRITIONNISTE,
        gouvernorat='Sfax',
        structure_nom="CHU Hédi Chaker Sfax — Service Nutrition",
        structure_localisation="Route El Ain, Sfax",
        structure_code="CHU-SFX-02",
        responsable_structure="Dr. N. Khemakhem",
    )
    nutri3 = CompteUtilisateur.objects.create_user(
        username='nutri.chaabane',
        email='l.chaabane@csb-sousse.tn',
        password='Nutri2026!',
        prenom='Leila',
        nom='Chaâbane',
        role=Role.NUTRITIONNISTE,
        gouvernorat='Sousse',
        structure_nom="CHU Sahloul Sousse",
        structure_localisation="Sahloul, Sousse",
        structure_code="CHU-SOU-03",
        responsable_structure="Dr. F. Mahjoub",
    )

    # ── Agent Campagne Mobile ──
    agent_camp = CompteUtilisateur.objects.create_user(
        username='agent.campagne.sfax',
        email='agent.camp@wiqayati-sfax.tn',
        password='Agent2026!',
        prenom='Khaled',
        nom='Ferchichi',
        role=Role.AGENT_CAMPAGNE,
        gouvernorat='Sfax',
        expire_le=timezone.now() + datetime.timedelta(days=90),
        structure_nom="Caravane Santé Mobile Sfax-Sud & Régions",
        structure_localisation="Sfax Sud — Secteurs Ruraux & Périurbains",
        structure_code="CAR-SFX-04",
        responsable_structure="Dr. Mounir Karray (Directeur Régional)",
        campagne_date_fin=(timezone.now() + datetime.timedelta(days=90)).date(),
    )

    # ── Agents Dispensaire / Soins Primaires ──
    agent_sp1 = CompteUtilisateur.objects.create_user(
        username='agent.csp.tunis',
        email='agent.csp1@wiqayati.tn',
        password='Agent2026!',
        prenom='Amina',
        nom='Gharbi',
        role=Role.AGENT_SOINS_PRIMAIRES,
        gouvernorat='Tunis',
        structure_nom="Centre de Santé de Base Bab Souika (CSB Niveau 2)",
        structure_localisation="Tunis — Place Bab Souika",
        structure_code="CSB-TUN-102",
        responsable_structure="Dr. Sonia Zouari (Médecin Chef)",
    )
    agent_sp2 = CompteUtilisateur.objects.create_user(
        username='agent.csp.sousse',
        email='agent.csp2@wiqayati.tn',
        password='Agent2026!',
        prenom='Yassine',
        nom='Saidani',
        role=Role.AGENT_SOINS_PRIMAIRES,
        gouvernorat='Sousse',
        structure_nom="Centre de Santé de Base Sousse Médina",
        structure_localisation="Sousse — Rue de l'Hôpital",
        structure_code="CSB-SOU-015",
        responsable_structure="Dr. Hichem Baccouche (Médecin Chef)",
    )

print(f"     [OK] {CompteUtilisateur.objects.count()} comptes crees avec metadonnees de structure")

# ─────────────────────────────────────────────────────────────────────────────
# 3. PATIENTS & DOSSIERS CLINIQUES (16 PATIENTS)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[3/6] Création des patients avec CIN 8 chiffres et fiches cliniques…")

# Liste de patients : (cin, ins, prenom, nom, ddn, genre, gouv, tel)
PATIENTS_CONFIG = [
    # 0 : ÉLEVÉ, Suivi longitudinal (diminuera)
    ('08123456', 'TUN10001980', 'Mohamed',   'Haddad',    '1980-03-15', 'M', 'Tunis',    '+21620100001'),
    # 1 : ÉLEVÉ, Hyperglycémie sévère
    ('09234567', 'TUN10001975', 'Fatma',     'Belhaj',    '1975-07-22', 'F', 'Sfax',     '+21650100002'),
    # 2 : ÉLEVÉ, Suivi longitudinal (diminuera)
    ('07345678', 'TUN10001968', 'Karim',     'Mansouri',  '1968-11-05', 'M', 'Sousse',   '+21621100003'),
    # 3 : INTERMÉDIAIRE, Pré-diabète, Suivi longitudinal (diminuera)
    ('11456789', 'TUN10001990', 'Ines',      'Zouari',    '1990-01-30', 'F', 'Tunis',    '+21625100004'),
    # 4 : INTERMÉDIAIRE, Diabète gestationnel
    ('05567890', 'TUN10001985', 'Olfa',      'Dridi',     '1985-02-09', 'F', 'Nabeul',   '+21696100010'),
    # 5 : INTERMÉDIAIRE, Mobile citoyen
    ('12678901', 'TUN10002001', 'Sana',      'Riahi',     '2001-04-18', 'F', 'Monastir', '+21622100006'),
    # 6 : INTERMÉDIAIRE, Âgé, Suivi longitudinal (diminuera)
    ('04789012', 'TUN10001955', 'Abdelaziz', 'Jouini',   '1955-09-12', 'M', 'Sfax',     '+21698100005'),
    # 7 : INTERMÉDIAIRE, Pré-diabète
    ('06890123', 'TUN10001963', 'Lotfi',     'Guesmi',    '1963-08-27', 'M', 'Sousse',   '+21695100007'),
    # 8 : FAIBLE, Mobile citoyen
    ('14901234', 'TUN10001988', 'Rania',     'Khelifi',   '1988-12-03', 'F', 'Tunis',    '+21620100008'),
    # 9 : FAIBLE, Caravane mobile
    ('08012345', 'TUN10001972', 'Nabil',     'Ayari',     '1972-06-14', 'M', 'Sfax',     '+21621100009'),
    # 10 : ÉLEVÉ, Dispensaire
    ('09112233', 'TUN10001978', 'Tarak',     'Mejri',     '1978-05-19', 'M', 'Kairouan', '+21623100011'),
    # 11 : INTERMÉDIAIRE, Mobile
    ('13223344', 'TUN10001995', 'Amel',      'Bouzid',    '1995-10-10', 'F', 'Bizerte',  '+21624100012'),
    # 12 : INTERMÉDIAIRE, Pré-diabète (acanthosis + surpoids)
    ('07334455', 'TUN10001982', 'Walid',     'Ben Amor',  '1982-04-02', 'M', 'Ariana',   '+21626100013'),
    # 13 : FAIBLE, Mobile
    ('10445566', 'TUN10001998', 'Yasmine',   'Trabelsi',  '1998-08-14', 'F', 'Ben Arous', '+21627100014'),
    # 14 : FAIBLE, Caravane
    ('06556677', 'TUN10001970', 'Moncef',    'Jlassi',    '1970-12-25', 'M', 'Gafsa',    '+21628100015'),
    # 15 : INTERMÉDIAIRE, Mobile
    ('11667788', 'TUN10001992', 'Mouna',     'Gharbi',    '1992-06-30', 'F', 'Gabès',    '+21629100016'),
]

# Données FINDRISC + cliniques pour chaque patient
SCREENINGS_DETAIL = [
    # 0 : Mohamed Haddad (ÉLEVÉ, CSB Tunis)
    {
        'niveau': 'ELEVE', 'score': 84, 'canal': TypeSoumission.SOINS_PRIMAIRES, 'agent': agent_sp1,
        'valideur': nutri1, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 44, 'genre': 'M', 'imc': 32.4, 'poids_kg': 98, 'taille_cm': 174, 'tour_taille_cm': 104,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': True,
            'niveau_activite_physique': 'SEDENTAIRE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': False, 'qualite_alimentation': 'MAUVAISE',
            'statut_tabagisme': 'ACTIF', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.8,
            'hba1c_pct': 6.3, 'tension_systolique': 145, 'tension_diastolique': 92,
            'traitement_antihypertenseur': True, 'high_glucose_hist': True,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': True, 'score_findrisc': 18,
            'notes_dmi': 'Patient adressé par CSB Bab Souika. Surcharge pondérale ancienne.',
        }
    },
    # 1 : Fatma Belhaj (ÉLEVÉ, Hyperglycémie sévère > 7.0, Caravane Sfax)
    {
        'niveau': 'ELEVE', 'score': 88, 'canal': TypeSoumission.CAMPAGNE, 'agent': agent_camp,
        'valideur': nutri2, 'statut_plan': StatutPlan.BROUILLON,
        'donnees': {
            'age': 49, 'genre': 'F', 'imc': 34.6, 'poids_kg': 88, 'taille_cm': 159, 'tour_taille_cm': 99,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': True,
            'niveau_activite_physique': 'FAIBLE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': False, 'qualite_alimentation': 'MAUVAISE',
            'statut_tabagisme': 'ANCIEN', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 7.6,
            'hba1c_pct': 7.1, 'tension_systolique': 150, 'tension_diastolique': 95,
            'traitement_antihypertenseur': True, 'high_glucose_hist': True,
            'diabete_gestationnel_antecedent': True, 'medicaments_corticoides': False,
            'acanthosis_nigricans': True, 'score_findrisc': 21,
            'notes_dmi': (
                'Dépistée lors de la caravane Sfax Sud. Glycémie capillaire très élevée, '
                'consultation médecin requise.'
            ),
        }
    },
    # 2 : Karim Mansouri (ÉLEVÉ, CSB Sousse)
    {
        'niveau': 'ELEVE', 'score': 76, 'canal': TypeSoumission.SOINS_PRIMAIRES, 'agent': agent_sp2,
        'valideur': nutri3, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 56, 'genre': 'M', 'imc': 30.1, 'poids_kg': 92, 'taille_cm': 175, 'tour_taille_cm': 106,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': True,
            'niveau_activite_physique': 'SEDENTAIRE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'ACTIF', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.2,
            'hba1c_pct': 6.0, 'tension_systolique': 140, 'tension_diastolique': 88,
            'traitement_antihypertenseur': True, 'high_glucose_hist': True,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': True,
            'acanthosis_nigricans': False, 'score_findrisc': 17,
            'notes_dmi': 'Corticothérapie au long cours pour asthme sévère.',
        }
    },
    # 3 : Ines Zouari (INTERMÉDIAIRE, Pré-diabète, Mobile citoyen)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 58, 'canal': TypeSoumission.AUTO_EVALUATION, 'agent': None,
        'valideur': nutri1, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 34, 'genre': 'F', 'imc': 27.5, 'poids_kg': 72, 'taille_cm': 162, 'tour_taille_cm': 84,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'MODERE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 5.8,
            'hba1c_pct': 5.7, 'tension_systolique': 122, 'tension_diastolique': 78,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 11,
            'notes_dmi': 'Auto-évaluation mobile. Père diabétique de type 2.',
        }
    },
    # 4 : Olfa Dridi (INTERMÉDIAIRE, Diabète gestationnel, CSB Tunis)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 62, 'canal': TypeSoumission.SOINS_PRIMAIRES, 'agent': agent_sp1,
        'valideur': nutri1, 'statut_plan': StatutPlan.BROUILLON,
        'donnees': {
            'age': 39, 'genre': 'F', 'imc': 28.2, 'poids_kg': 76, 'taille_cm': 164, 'tour_taille_cm': 86,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'FAIBLE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.1,
            'hba1c_pct': 5.9, 'tension_systolique': 125, 'tension_diastolique': 80,
            'traitement_antihypertenseur': False, 'high_glucose_hist': True,
            'diabete_gestationnel_antecedent': True, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 13,
            'notes_dmi': 'Antécédent de diabète gestationnel en 2021 (gros bébé de 4.2 kg).',
        }
    },
    # 5 : Sana Riahi (INTERMÉDIAIRE, Mobile citoyen)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 52, 'canal': TypeSoumission.AUTO_EVALUATION, 'agent': None,
        'valideur': nutri2, 'statut_plan': StatutPlan.BROUILLON,
        'donnees': {
            'age': 23, 'genre': 'F', 'imc': 25.1, 'poids_kg': 66, 'taille_cm': 162, 'tour_taille_cm': 78,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'MODERE', 'activite_physique_quotidienne': True,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'BONNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
            'hba1c_pct': None, 'tension_systolique': 118, 'tension_diastolique': 74,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 9,
            'notes_dmi': 'Jeune étudiante soucieuse de son hygiène de vie.',
        }
    },
    # 6 : Abdelaziz Jouini (INTERMÉDIAIRE, Caravane Sfax)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 65, 'canal': TypeSoumission.CAMPAGNE, 'agent': agent_camp,
        'valideur': nutri2, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 69, 'genre': 'M', 'imc': 28.8, 'poids_kg': 82, 'taille_cm': 169, 'tour_taille_cm': 98,
            'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': True,
            'niveau_activite_physique': 'FAIBLE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'ANCIEN', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 5.9,
            'hba1c_pct': 5.8, 'tension_systolique': 138, 'tension_diastolique': 85,
            'traitement_antihypertenseur': True, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 14,
            'notes_dmi': 'Retraité actif en milieu rural.',
        }
    },
    # 7 : Lotfi Guesmi (INTERMÉDIAIRE, CSB Sousse)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 59, 'canal': TypeSoumission.SOINS_PRIMAIRES, 'agent': agent_sp2,
        'valideur': nutri3, 'statut_plan': StatutPlan.BROUILLON,
        'donnees': {
            'age': 61, 'genre': 'M', 'imc': 27.2, 'poids_kg': 79, 'taille_cm': 170, 'tour_taille_cm': 96,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'FAIBLE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': False, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'ACTIF', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.0,
            'hba1c_pct': 5.9, 'tension_systolique': 130, 'tension_diastolique': 82,
            'traitement_antihypertenseur': False, 'high_glucose_hist': True,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 12,
            'notes_dmi': 'Fumeur modéré (15 cig/jour).',
        }
    },
    # 8 : Rania Khelifi (FAIBLE, Mobile citoyen)
    {
        'niveau': 'FAIBLE', 'score': 24, 'canal': TypeSoumission.AUTO_EVALUATION, 'agent': None,
        'valideur': nutri1, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 36, 'genre': 'F', 'imc': 22.8, 'poids_kg': 60, 'taille_cm': 162, 'tour_taille_cm': 72,
            'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'ACTIF', 'activite_physique_quotidienne': True,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'BONNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
            'hba1c_pct': None, 'tension_systolique': 115, 'tension_diastolique': 70,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 4,
            'notes_dmi': 'Profil très sain. Marche et yoga 3x/semaine.',
        }
    },
    # 9 : Nabil Ayari (FAIBLE, Caravane Sfax)
    {
        'niveau': 'FAIBLE', 'score': 20, 'canal': TypeSoumission.CAMPAGNE, 'agent': agent_camp,
        'valideur': nutri2, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 52, 'genre': 'M', 'imc': 23.5, 'poids_kg': 71, 'taille_cm': 174, 'tour_taille_cm': 85,
            'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'MODERE', 'activite_physique_quotidienne': True,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'BONNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
            'hba1c_pct': None, 'tension_systolique': 120, 'tension_diastolique': 76,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 5,
            'notes_dmi': 'Agriculteur de la région de Sfax.',
        }
    },
    # 10 : Tarak Mejri (ÉLEVÉ, CSB)
    {
        'niveau': 'ELEVE', 'score': 81, 'canal': TypeSoumission.SOINS_PRIMAIRES, 'agent': agent_sp1,
        'valideur': nutri1, 'statut_plan': StatutPlan.BROUILLON,
        'donnees': {
            'age': 46, 'genre': 'M', 'imc': 33.1, 'poids_kg': 99, 'taille_cm': 173, 'tour_taille_cm': 105,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': True,
            'niveau_activite_physique': 'SEDENTAIRE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': False, 'qualite_alimentation': 'MAUVAISE',
            'statut_tabagisme': 'ACTIF', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.7,
            'hba1c_pct': 6.2, 'tension_systolique': 142, 'tension_diastolique': 90,
            'traitement_antihypertenseur': True, 'high_glucose_hist': True,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': True, 'score_findrisc': 18,
            'notes_dmi': 'Conducteur de taxi, sédentarité sévère et alimentation sur le pouce.',
        }
    },
    # 11 : Amel Bouzid (INTERMÉDIAIRE, Mobile)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 55, 'canal': TypeSoumission.AUTO_EVALUATION, 'agent': None,
        'valideur': nutri1, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 30, 'genre': 'F', 'imc': 26.8, 'poids_kg': 70, 'taille_cm': 161, 'tour_taille_cm': 83,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'MODERE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 5.7,
            'hba1c_pct': 5.6, 'tension_systolique': 119, 'tension_diastolique': 75,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 10,
            'notes_dmi': 'Ingénieure en informatique à Bizerte.',
        }
    },
    # 12 : Walid Ben Amor (INTERMÉDIAIRE, CSB Tunis)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 64, 'canal': TypeSoumission.SOINS_PRIMAIRES, 'agent': agent_sp1,
        'valideur': nutri1, 'statut_plan': StatutPlan.BROUILLON,
        'donnees': {
            'age': 43, 'genre': 'M', 'imc': 29.2, 'poids_kg': 89, 'taille_cm': 175, 'tour_taille_cm': 99,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'FAIBLE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': False, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.4,
            'hba1c_pct': 6.0, 'tension_systolique': 130, 'tension_diastolique': 82,
            'traitement_antihypertenseur': False, 'high_glucose_hist': True,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': True, 'score_findrisc': 14,
            'notes_dmi': 'Signes d insulino-résistance cutanée nets (cou et aisselles).',
        }
    },
    # 13 : Yasmine Trabelsi (FAIBLE, Mobile)
    {
        'niveau': 'FAIBLE', 'score': 16, 'canal': TypeSoumission.AUTO_EVALUATION, 'agent': None,
        'valideur': nutri2, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 27, 'genre': 'F', 'imc': 21.2, 'poids_kg': 56, 'taille_cm': 163, 'tour_taille_cm': 68,
            'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'ACTIF', 'activite_physique_quotidienne': True,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'BONNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
            'hba1c_pct': None, 'tension_systolique': 112, 'tension_diastolique': 70,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 3,
            'notes_dmi': 'Mode de vie sain et équilibré.',
        }
    },
    # 14 : Moncef Jlassi (FAIBLE, Caravane Gafsa)
    {
        'niveau': 'FAIBLE', 'score': 22, 'canal': TypeSoumission.CAMPAGNE, 'agent': agent_camp,
        'valideur': nutri3, 'statut_plan': StatutPlan.VALIDE,
        'donnees': {
            'age': 54, 'genre': 'M', 'imc': 24.1, 'poids_kg': 72, 'taille_cm': 173, 'tour_taille_cm': 86,
            'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'ACTIF', 'activite_physique_quotidienne': True,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'BONNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
            'hba1c_pct': None, 'tension_systolique': 122, 'tension_diastolique': 78,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 5,
            'notes_dmi': 'Travailleur agricole, forte dépense physique quotidienne.',
        }
    },
    # 15 : Mouna Gharbi (INTERMÉDIAIRE, Mobile)
    {
        'niveau': 'INTERMEDIAIRE', 'score': 54, 'canal': TypeSoumission.AUTO_EVALUATION, 'agent': None,
        'valideur': nutri3, 'statut_plan': StatutPlan.BROUILLON,
        'donnees': {
            'age': 33, 'genre': 'F', 'imc': 26.5, 'poids_kg': 69, 'taille_cm': 161, 'tour_taille_cm': 82,
            'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
            'niveau_activite_physique': 'MODERE', 'activite_physique_quotidienne': False,
            'consommation_legumes_fruits': True, 'qualite_alimentation': 'MOYENNE',
            'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
            'hba1c_pct': None, 'tension_systolique': 118, 'tension_diastolique': 76,
            'traitement_antihypertenseur': False, 'high_glucose_hist': False,
            'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
            'acanthosis_nigricans': False, 'score_findrisc': 9,
            'notes_dmi': 'Consultante à Gabès.',
        }
    },
]

PLANS_NUTRITION_TEMPLATES = {
    'ELEVE': {
        'titre': 'Plan nutritionnel intensif personnalisé (Agent Hybride)',
        'objectifs': [
            'Déficit calorique modéré de 450 à 500 kcal/jour sans privation drastique',
            'Éviction complète des boissons sucrées, sodas et pâtisseries orientales',
            'Remplacement systématique du pain blanc tunisien par du pain complet ou d\'orge (Mbeses complet)',
            (
                'Consommation quotidienne d\'au moins 400g de légumes locaux '
                '(salade mechouia allégée en huile, tajines de légumes)'
            ),
            'Privilégier l\'huile d\'olive extra vierge tunisienne (2 cuillères à soupe max par jour)',
            (
                'Apport protéique régulier : poissons de Méditerranée 2 à 3 fois par semaine, '
                'légumineuses (pois chiches, lentilles)'
            ),
        ],
        'conseils_specifiques': (
            'Plan généré par l\'Agent Hybride WiQayati à partir des 14 variables du screening et '
            'des données DMI. Consultation mensuelle avec le nutritionniste référent recommandée.'
        ),
    },
    'INTERMEDIAIRE': {
        'titre': 'Plan d\'équilibrage alimentaire structuré (Agent Hybride)',
        'objectifs': [
            (
                'Adopter le régime méditerranéen traditionnel tunisien '
                '(céréales complètes, huile d\'olive, légumes cuits et crus)'
            ),
            'Limiter le sel de table à moins de 5g par jour pour préserver la fonction rénale et cardiovasculaire',
            'Structurer les prises alimentaires en 3 repas équilibrés sans grignotage intermédiaire',
            'Consommer 2 fruits frais entiers de saison par jour (agrumes, grenades, pêches) à distance des repas',
        ],
        'conseils_specifiques': 'Suivi trimestriel en centre de santé de base. Auto-surveillance recommandée.',
    },
    'FAIBLE': {
        'titre': 'Programme de consolidation du mode de vie sain',
        'objectifs': [
            'Maintenir la diversité alimentaire actuelle riche en micronutriments et antioxydants',
            'Hydratation régulière optimale (1.5 à 2L d\'eau par jour)',
            'Préserver la part prépondérante des produits frais et non transformés',
        ],
        'conseils_specifiques': 'Maintien des bonnes habitudes acquises. Réévaluation annuelle conseillée.',
    },
}

PLANS_ACTIVITE_TEMPLATES = {
    'ELEVE': {
        'titre': 'Programme de réadaptation cardiovasculaire et métabolique',
        'objectifs': [
            'Marche dynamique quotidienne progressive de 40 à 45 minutes (fractionnable en 2 x 20 min)',
            'Rupture systématique de la sédentarité : se lever et marcher 3 minutes toutes les heures de travail',
            'Renforcement musculaire léger (squats assis, montées de marche) 2 fois par semaine',
            'Objectif podomètre : 7 500 à 9 000 pas par jour',
        ],
        'frequence_hebdomadaire': 6,
        'duree_seance_minutes': 45,
    },
    'INTERMEDIAIRE': {
        'titre': 'Programme d\'activité physique régulière et modérée',
        'objectifs': [
            'Marche active ou vélo 30 à 40 minutes, 5 fois par semaine',
            'Utilisation exclusive des escaliers pour les étages 1 à 3',
            'Séance d\'étirements et de souplesse 15 minutes le weekend',
            'Objectif podomètre : 8 000 pas par jour',
        ],
        'frequence_hebdomadaire': 5,
        'duree_seance_minutes': 35,
    },
    'FAIBLE': {
        'titre': 'Maintien de l\'activité physique optimale',
        'objectifs': [
            'Au minimum 150 minutes d\'activité aérobique modérée par semaine',
            'Pratique de loisirs actifs (jardinage, marche en plein air, natation)',
            'Objectif podomètre : 10 000 pas par jour',
        ],
        'frequence_hebdomadaire': 5,
        'duree_seance_minutes': 30,
    },
}

FACTEURS_RISQUE_MAPPING = {
    'ELEVE': [
        'Indice de Masse Corporelle (IMC) en zone d\'obésité',
        'Tour de taille supérieur aux seuils cardiométaboliques tunisiens',
        'Antécédent familial de diabète au premier degré',
        'Hypertension artérielle sous traitement ou non contrôlée',
        'Sédentarité marquée au travail et à domicile',
    ],
    'INTERMEDIAIRE': [
        'Surpoids modéré ou tour de taille limite',
        'Activité physique inférieure aux recommandations de l\'OMS',
        'Alimentation pauvre en fibres ou riche en sucres rapides',
        'Antécédent familial de diabète',
    ],
    'FAIBLE': [
        'Profil biométrique dans les normes recommandées',
        'Bonne hygiène de vie globale',
    ],
}

# Comptes citoyens pour application mobile
CITOYENS_DATA = {
    'TUN10001980': ('citoyen.haddad',   'haddad@mail.tn',   '1234'),
    'TUN10001975': ('citoyen.belhaj',   'belhaj@mail.tn',   '1234'),
    'TUN10001968': ('citoyen.mansouri', 'mansouri@mail.tn', '1234'),
    'TUN10001990': ('citoyen.zouari',   'zouari@mail.tn',   '1234'),
    'TUN10001985': ('citoyen.dridi',    'dridi@mail.tn',    '1234'),
}

patients_crees = []
screenings_crees = []
evaluations_crees = []
plans_crees = []

with transaction.atomic():
    for p_cfg, s_detail in zip(PATIENTS_CONFIG, SCREENINGS_DETAIL):
        cin, ins, prenom, nom, ddn, genre, gouv, tel = p_cfg
        niveau = s_detail['niveau']
        score = s_detail['score']
        canal = s_detail['canal']
        agent = s_detail['agent']
        valideur = s_detail['valideur']
        statut_plan = s_detail['statut_plan']
        donnees = s_detail['donnees']

        # ── 1. Création Patient avec CIN strict ──
        patient = ProfilPatient.objects.create(
            cin=cin,
            ins=ins,
            prenom=prenom,
            nom=nom,
            date_naissance=ddn,
            genre=genre,
            gouvernorat=gouv,
            telephone=tel,
            cree_par=agent,
        )
        patients_crees.append(patient)

        # ── 2. Réponse screening initiale ──
        reponse = ReponseScreening.objects.create(
            patient=patient,
            soumis_par=agent,
            type_soumission=canal,
            version_questionnaire='1.0',
            donnees=donnees,
        )
        date_initiale = timezone.now() - datetime.timedelta(days=120)
        ReponseScreening.objects.filter(id=reponse.id).update(soumis_le=date_initiale)
        screenings_crees.append(reponse)

        # ── 3. Évaluation initiale ──
        evaluation = ResultatEvaluationRisque.objects.create(
            reponse_screening=reponse,
            patient=patient,
            niveau_risque=niveau,
            score=score,
            facteurs=FACTEURS_RISQUE_MAPPING[niveau],
            version_moteur='agent-hybride-v1.2',
        )
        ResultatEvaluationRisque.objects.filter(id=evaluation.id).update(evalue_le=date_initiale)
        evaluations_crees.append(evaluation)

        # ── 4. Plan de soin (VALIDÉ ou BROUILLON — jamais rejeté) ──
        notes = ''
        if statut_plan == StatutPlan.VALIDE:
            notes = (
                f"Recommandations de l'Agent Hybride revues et adaptées pour {prenom} {nom}. "
                f"Objectif : réduction de l'IMC de 5% sous 6 mois. Bilan biologique de contrôle planifié."
            )
        else:
            notes = (
                "Plan initial généré automatiquement par l'Agent Hybride. "
                "En attente de revue par le nutritionniste pour ajustement personnalisé."
            )

        plan = PlanSoin.objects.create(
            patient=patient,
            evaluation_risque=evaluation,
            plan_nutrition=PLANS_NUTRITION_TEMPLATES[niveau],
            plan_activite=PLANS_ACTIVITE_TEMPLATES[niveau],
            notes_nutritionniste=notes,
            statut=statut_plan,
            valide_le=timezone.now() if statut_plan == StatutPlan.VALIDE else None,
            valide_par=valideur if statut_plan == StatutPlan.VALIDE else None,
        )
        PlanSoin.objects.filter(id=plan.id).update(genere_le=date_initiale)
        plans_crees.append(plan)

        # ── 5. File d'attente nutritionniste ──
        priorite_map = {
            'ELEVE': PrioriteTache.STAT,
            'INTERMEDIAIRE': PrioriteTache.URGENT,
            'FAIBLE': PrioriteTache.ROUTINE,
        }
        TacheNutritionniste.objects.create(
            plan_soin=plan,
            priorite=priorite_map[niveau],
            statut=StatutTache.COMPLETE if statut_plan == StatutPlan.VALIDE else StatutTache.DEMANDE,
            assigne_a=valideur,
        )

        # ── 6. Compte citoyen si configuré ──
        if ins in CITOYENS_DATA:
            _, email_c, pin = CITOYENS_DATA[ins]
            CompteUtilisateur.objects.create_user(
                username=ins,
                email=email_c,
                password=pin,
                prenom=prenom,
                nom=nom,
                role=Role.CITOYEN,
                gouvernorat=gouv,
            )

    # ── 7. SUIVI LONGITUDINAL (Évaluations répétées démontrant la baisse du risque) ──
    # Patients 0, 2, 3, 6 ont une 2ème évaluation récente avec score réduit !
    patients_suivi = [
        (
            0, 52, NiveauRisque.INTERMEDIAIRE, 29.8, 6.0,
            "Baisse de l'IMC et amélioration de l'HbA1c après 4 mois de régime."
        ),
        (2, 48, NiveauRisque.INTERMEDIAIRE, 27.9, 5.7, "Reprise de la marche quotidienne, glycémie stabilisée."),
        (3, 30, NiveauRisque.FAIBLE, 24.8, 5.2, "Normalisation pondérale et glycémie à jeun redevenue normale."),
        (6, 42, NiveauRisque.INTERMEDIAIRE, 26.5, 5.5, "Excellente adhésion au programme d'activité physique."),
    ]

    for p_idx, score_recent, niveau_recent, imc_recent, gly_recent, note_amelioration in patients_suivi:
        p = patients_crees[p_idx]
        donnees_recentes = dict(p.reponses_screening.first().donnees)
        donnees_recentes['imc'] = imc_recent
        donnees_recentes['glycemie_jeun_mmol'] = gly_recent
        donnees_recentes['hba1c_pct'] = 5.5
        donnees_recentes['activite_physique_quotidienne'] = True
        donnees_recentes['niveau_activite_physique'] = 'ACTIF'
        donnees_recentes['note_suivi'] = note_amelioration

        date_recente = timezone.now() - datetime.timedelta(days=10)
        reponse_suivi = ReponseScreening.objects.create(
            patient=p,
            soumis_par=agent_sp1 if p.gouvernorat == 'Tunis' else agent_sp2,
            type_soumission=TypeSoumission.SOINS_PRIMAIRES,
            version_questionnaire='1.0',
            donnees=donnees_recentes,
        )
        ReponseScreening.objects.filter(id=reponse_suivi.id).update(soumis_le=date_recente)

        eval_suivi = ResultatEvaluationRisque.objects.create(
            reponse_screening=reponse_suivi,
            patient=p,
            niveau_risque=niveau_recent,
            score=score_recent,
            facteurs=FACTEURS_RISQUE_MAPPING[niveau_recent],
            version_moteur='agent-hybride-v1.2',
        )
        ResultatEvaluationRisque.objects.filter(id=eval_suivi.id).update(evalue_le=date_recente)

print(f"     [OK] {len(patients_crees)} patients crees avec CIN 8 chiffres")
print(f"     [OK] {ReponseScreening.objects.count()} depistages enregistres (dont suivi longitudinal)")
print(f"     [OK] {ResultatEvaluationRisque.objects.count()} evaluations de risque calculees")
print(f"     [OK] {PlanSoin.objects.count()} plans de soins enregistres")

# ─────────────────────────────────────────────────────────────────────────────
# 4. NOTIFICATIONS CITOYENNES
# ─────────────────────────────────────────────────────────────────────────────
print("\n[4/6] Creation des notifications citoyennes…")

notifs_count = 0
for ins, (_, _, _) in CITOYENS_DATA.items():
    try:
        compte = CompteUtilisateur.objects.get(username=ins)
        patient = ProfilPatient.objects.get(ins=ins)
        plan = PlanSoin.objects.filter(patient=patient).first()

        if plan and plan.statut == StatutPlan.VALIDE:
            Notification.objects.create(
                destinataire=compte,
                type_notification=Notification.TypeNotification.PLAN_VALIDE,
                message=(
                    "Votre plan personnalisé de nutrition et d'activité physique a été "
                    "validé par votre nutritionniste. "
                    "Consultez l'onglet « Mon Plan » pour découvrir vos recommandations."
                ),
                lu=False,
            )
            notifs_count += 1
        elif plan and plan.statut == StatutPlan.BROUILLON:
            Notification.objects.create(
                destinataire=compte,
                type_notification=Notification.TypeNotification.RAPPEL_AUTO_EVALUATION,
                message=(
                    "Votre questionnaire a été traité par notre Agent Hybride. "
                    "Votre plan est actuellement en cours de personnalisation par votre praticien référent."
                ),
                lu=False,
            )
            notifs_count += 1

        # Rappel auto-évaluation
        Notification.objects.create(
            destinataire=compte,
            type_notification=Notification.TypeNotification.RAPPEL_AUTO_EVALUATION,
            message=(
                "Pensez à renouveler votre auto-évaluation dans 3 mois pour suivre "
                "l'évolution de vos indicateurs de santé."
            ),
            lu=True,
        )
        notifs_count += 1
    except CompteUtilisateur.DoesNotExist:
        pass

print(f"     [OK] {notifs_count} notifications citoyennes creees")

# ─────────────────────────────────────────────────────────────────────────────
# 5. SUPERUSER
# ─────────────────────────────────────────────────────────────────────────────
print("\n[5/6] Creation / verification du superuser…")
if not CompteUtilisateur.objects.filter(username='superadmin').exists():
    CompteUtilisateur.objects.create_superuser(
        username='superadmin',
        email='superadmin@wiqayati.tn',
        password='SuperAdmin2026!',
        prenom='Super',
        nom='Admin',
        role=Role.ADMIN_IT,
    )
    print("     [OK] Superuser 'superadmin' cree")
else:
    print("     [OK] Superuser existant conserve")

# ─────────────────────────────────────────────────────────────────────────────
# 6. RÉSUMÉ & IDENTIFIANTS DE TEST
# ─────────────────────────────────────────────────────────────────────────────
print("\n[6/6] Résumé de la base de données de démo enrichie")
print("=" * 70)
print("\n  COMPTES DE CONNEXION :")
print("  -------------------------------------------------------------")
print("  Admin IT         : admin.it / Admin2026!")
print("  Admin Ministère  : admin.ministere / Admin2026!")
print("  Nutritionniste 1 : nutri.ben_ali / Nutri2026! (Tunis - INN)")
print("  Nutritionniste 2 : nutri.trabelsi / Nutri2026! (Sfax - CHU)")
print("  Nutritionniste 3 : nutri.chaabane / Nutri2026! (Sousse - CHU)")
print("  Agent Campagne   : agent.campagne.sfax / Agent2026! (Caravane Sfax-Sud)")
print("  Agent CSB Tunis  : agent.csp.tunis / Agent2026! (CSB Bab Souika)")
print("  Agent CSB Sousse : agent.csp.sousse / Agent2026! (CSB Sousse Médina)")

print("\n  EXEMPLES PATIENTS POUR RECHERCHE CIN DANS LE PORTAIL AGENT :")
print("  -------------------------------------------------------------")
for p in ProfilPatient.objects.all()[:6]:
    print(f"  CIN : {p.cin}  |  DdN : {p.date_naissance.strftime('%Y-%m-%d')}  |  {p.prenom} {p.nom}  |  INS : {p.ins}")

print("\n  STATISTIQUES GÉNÉRALES :")
print(f"  Patients uniques       : {ProfilPatient.objects.count()}")
print(f"  Dépistages totaux      : {ReponseScreening.objects.count()}")
print(f"  Évaluations de risque  : {ResultatEvaluationRisque.objects.count()}")
print(f"  Plans Validés          : {PlanSoin.objects.filter(statut=StatutPlan.VALIDE).count()}")
print(f"  Plans Brouillon/Modif  : {PlanSoin.objects.filter(statut=StatutPlan.BROUILLON).count()}")
print(
    f"  Plans Rejetés          : {PlanSoin.objects.filter(statut=StatutPlan.REJETE).count()} "
    f"(0 rejeté - conformément aux règles cliniques)"
)

print("\n" + "=" * 70)
print("  Base de données WiQayati peuplée avec succès !")
print("=" * 70 + "\n")
