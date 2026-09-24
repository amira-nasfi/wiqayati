"""
Script de peuplement de la base de données — Wiqayati (données de démo)
=====================================================================
Crée :
  - 1 Admin IT
  - 1 Admin Ministère
  - 3 Nutritionnistes
  - 3 Agents (campagne + soins primaires)
  - 10 Patients avec leur INS + dépistages + évaluations + plans
    (3 ÉLEVÉ, 4 INTERMÉDIAIRE, 3 FAIBLE)
    dont 4 plans VALIDÉS, 4 en BROUILLON, 2 REJETÉS
  - Notifications citoyennes

Usage :
    python manage.py shell < scripts/seed_demo.py
  ou
    python manage.py seed_demo   (si enregistré comme commande)
"""
import os
import sys
import io

# Fix encoding on Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import django
from pathlib import Path

# ── Bootstrap Django ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wiqayati.settings.development')
django.setup()

from django.utils import timezone
from django.db import transaction
import datetime

from apps.accounts.models import CompteUtilisateur, Role, Notification
from apps.screening.models import ProfilPatient, ReponseScreening, TypeSoumission
from apps.risk_engine.models import ResultatEvaluationRisque, NiveauRisque
from apps.care_plan.models import PlanSoin, StatutPlan

print("=" * 60)
print("  WIQAYATI — Peuplement de la base de données de démo")
print("=" * 60)

# ─────────────────────────────────────────────────────────────────────────────
# NETTOYAGE PRÉALABLE (optionnel)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[1/6] Nettoyage des données existantes…")
Notification.objects.all().delete()
PlanSoin.objects.all().delete()
ResultatEvaluationRisque.objects.all().delete()
ReponseScreening.objects.all().delete()
ProfilPatient.objects.all().delete()
CompteUtilisateur.objects.all().delete()
print("     [OK] Tables videes")

# ─────────────────────────────────────────────────────────────────────────────
# COMPTES UTILISATEURS
# ─────────────────────────────────────────────────────────────────────────────
print("\n[2/6] Création des comptes utilisateurs…")

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
    )
    nutri2 = CompteUtilisateur.objects.create_user(
        username='nutri.trabelsi',
        email='m.trabelsi@hopital-sfax.tn',
        password='Nutri2026!',
        prenom='Mohamed',
        nom='Trabelsi',
        role=Role.NUTRITIONNISTE,
        gouvernorat='Sfax',
    )
    nutri3 = CompteUtilisateur.objects.create_user(
        username='nutri.chaabane',
        email='l.chaabane@csb-sousse.tn',
        password='Nutri2026!',
        prenom='Leila',
        nom='Chaâbane',
        role=Role.NUTRITIONNISTE,
        gouvernorat='Sousse',
    )

    # ── Agent campagne ──
    agent_camp = CompteUtilisateur.objects.create_user(
        username='agent.campagne.sfax',
        email='agent.camp@wiqayati-sfax.tn',
        password='Agent2026!',
        prenom='Khaled',
        nom='Ferchichi',
        role=Role.AGENT_CAMPAGNE,
        gouvernorat='Sfax',
        expire_le=timezone.now() + datetime.timedelta(days=90),
    )

    # ── Agents soins primaires ──
    agent_sp1 = CompteUtilisateur.objects.create_user(
        username='agent.csp.tunis',
        email='agent.csp1@wiqayati.tn',
        password='Agent2026!',
        prenom='Amina',
        nom='Gharbi',
        role=Role.AGENT_SOINS_PRIMAIRES,
        gouvernorat='Tunis',
    )
    agent_sp2 = CompteUtilisateur.objects.create_user(
        username='agent.csp.sousse',
        email='agent.csp2@wiqayati.tn',
        password='Agent2026!',
        prenom='Yassine',
        nom='Saidani',
        role=Role.AGENT_SOINS_PRIMAIRES,
        gouvernorat='Sousse',
    )

print(f"     ✓ {CompteUtilisateur.objects.count()} comptes créés")

# ─────────────────────────────────────────────────────────────────────────────
# PATIENTS & DOSSIERS
# ─────────────────────────────────────────────────────────────────────────────
print("\n[3/6] Création des patients et de leurs dossiers…")

PATIENTS_DATA = [
    # (ins, prenom, nom, ddn, genre, gouvernorat, tel)
    ('TUN10001980', 'Mohamed',  'Haddad',    '1980-03-15', 'M', 'Tunis',    '+21620100001'),
    ('TUN10001975', 'Fatma',    'Belhaj',    '1975-07-22', 'F', 'Sfax',     '+21650100002'),
    ('TUN10001968', 'Karim',    'Mansouri',  '1968-11-05', 'M', 'Sousse',   '+21621100003'),
    ('TUN10001990', 'Ines',     'Zouari',    '1990-01-30', 'F', 'Tunis',    '+21625100004'),
    ('TUN10001955', 'Abdelaziz','Jouini',    '1955-09-12', 'M', 'Sfax',     '+21698100005'),
    ('TUN10002001', 'Sana',     'Riahi',     '2001-04-18', 'F', 'Monastir', '+21622100006'),
    ('TUN10001963', 'Lotfi',    'Guesmi',    '1963-08-27', 'M', 'Sousse',   '+21695100007'),
    ('TUN10001988', 'Rania',    'Khelifi',   '1988-12-03', 'F', 'Tunis',    '+21620100008'),
    ('TUN10001972', 'Nabil',    'Ayari',     '1972-06-14', 'M', 'Sfax',     '+21621100009'),
    ('TUN10001985', 'Olfa',     'Dridi',     '1985-02-09', 'F', 'Nabeul',   '+21696100010'),
]

# Données questionnaire + résultats par patient
# Format: (niveau_risque, score, type_soumission, agent, donnees_questionnaire)
SCREENINGS_DATA = [
    # Patient 0 — ÉLEVÉ
    ('ELEVE', 82, TypeSoumission.CAMPAGNE, agent_camp, {
        'age': 44, 'genre': 'M', 'imc': 31.5, 'tour_taille_cm': 102,
        'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': True,
        'niveau_activite_physique': 'SEDENTAIRE', 'qualite_alimentation': 'MAUVAISE',
        'statut_tabagisme': 'ACTIF', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.8,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': True,
    }),
    # Patient 1 — ÉLEVÉ
    ('ELEVE', 78, TypeSoumission.SOINS_PRIMAIRES, agent_sp1, {
        'age': 49, 'genre': 'F', 'imc': 34.2, 'tour_taille_cm': 98,
        'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': True,
        'niveau_activite_physique': 'FAIBLE', 'qualite_alimentation': 'MAUVAISE',
        'statut_tabagisme': 'ANCIEN', 'glycemie_jeun_connue': True, 'glycemie_jeun_mmol': 6.5,
        'diabete_gestationnel_antecedent': True, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
    # Patient 2 — ÉLEVÉ
    ('ELEVE', 75, TypeSoumission.CAMPAGNE, agent_camp, {
        'age': 56, 'genre': 'M', 'imc': 29.8, 'tour_taille_cm': 105,
        'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': True,
        'niveau_activite_physique': 'SEDENTAIRE', 'qualite_alimentation': 'MOYENNE',
        'statut_tabagisme': 'ACTIF', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': True,
        'acanthosis_nigricans': False,
    }),
    # Patient 3 — INTERMÉDIAIRE
    ('INTERMEDIAIRE', 58, TypeSoumission.SOINS_PRIMAIRES, agent_sp1, {
        'age': 34, 'genre': 'F', 'imc': 27.1, 'tour_taille_cm': 82,
        'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
        'niveau_activite_physique': 'MODERE', 'qualite_alimentation': 'MOYENNE',
        'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
    # Patient 4 — INTERMÉDIAIRE
    ('INTERMEDIAIRE', 62, TypeSoumission.CAMPAGNE, agent_camp, {
        'age': 69, 'genre': 'M', 'imc': 28.5, 'tour_taille_cm': 95,
        'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': True,
        'niveau_activite_physique': 'FAIBLE', 'qualite_alimentation': 'MOYENNE',
        'statut_tabagisme': 'ANCIEN', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
    # Patient 5 — INTERMÉDIAIRE
    ('INTERMEDIAIRE', 54, TypeSoumission.AUTO_EVALUATION, None, {
        'age': 23, 'genre': 'F', 'imc': 24.5, 'tour_taille_cm': 72,
        'antecedents_familiaux_diabete': True, 'hypertension_diagnostiquee': False,
        'niveau_activite_physique': 'MODERE', 'qualite_alimentation': 'BONNE',
        'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
    # Patient 6 — INTERMÉDIAIRE
    ('INTERMEDIAIRE', 50, TypeSoumission.SOINS_PRIMAIRES, agent_sp2, {
        'age': 61, 'genre': 'M', 'imc': 26.9, 'tour_taille_cm': 93,
        'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
        'niveau_activite_physique': 'FAIBLE', 'qualite_alimentation': 'MOYENNE',
        'statut_tabagisme': 'ACTIF', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
    # Patient 7 — FAIBLE
    ('FAIBLE', 22, TypeSoumission.AUTO_EVALUATION, None, {
        'age': 36, 'genre': 'F', 'imc': 22.3, 'tour_taille_cm': 71,
        'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
        'niveau_activite_physique': 'ACTIF', 'qualite_alimentation': 'BONNE',
        'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
    # Patient 8 — FAIBLE
    ('FAIBLE', 18, TypeSoumission.SOINS_PRIMAIRES, agent_sp2, {
        'age': 52, 'genre': 'M', 'imc': 23.8, 'tour_taille_cm': 88,
        'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
        'niveau_activite_physique': 'MODERE', 'qualite_alimentation': 'BONNE',
        'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
    # Patient 9 — FAIBLE
    ('FAIBLE', 15, TypeSoumission.CAMPAGNE, agent_camp, {
        'age': 39, 'genre': 'F', 'imc': 21.0, 'tour_taille_cm': 69,
        'antecedents_familiaux_diabete': False, 'hypertension_diagnostiquee': False,
        'niveau_activite_physique': 'ACTIF', 'qualite_alimentation': 'BONNE',
        'statut_tabagisme': 'JAMAIS', 'glycemie_jeun_connue': False, 'glycemie_jeun_mmol': None,
        'diabete_gestationnel_antecedent': False, 'medicaments_corticoides': False,
        'acanthosis_nigricans': False,
    }),
]

FACTEURS_PAR_NIVEAU = {
    'ELEVE': [
        'Surpoids ou obésité (IMC ≥ 30)',
        'Antécédents familiaux de diabète au 1er degré',
        'Hypertension artérielle diagnostiquée',
        'Sédentarité prononcée',
        'Tour de taille élevé (risque métabolique)',
    ],
    'INTERMEDIAIRE': [
        'Antécédents familiaux de diabète',
        'Alimentation déséquilibrée',
        'Activité physique insuffisante',
    ],
    'FAIBLE': [],
}

PLANS_NUTRITION = {
    'ELEVE': {
        'titre': 'Plan nutritionnel intensif — Réduction du risque cardiométabolique',
        'objectifs': [
            'Réduire l\'apport calorique de 500 kcal/jour progressivement',
            'Limiter les glucides simples (sucres, pain blanc, pâtisseries) à moins de 50g/jour',
            'Augmenter les fibres alimentaires (légumes, légumineuses, céréales complètes)',
            'Viser 5 portions de fruits et légumes par jour',
            'Remplacer les graisses saturées par des huiles végétales (huile d\'olive)',
        ],
        'conseils_specifiques': 'Consultation diététique mensuelle recommandée. Tenir un journal alimentaire.',
    },
    'INTERMEDIAIRE': {
        'titre': 'Plan nutritionnel structuré — Équilibre alimentaire',
        'objectifs': [
            'Adopter le régime méditerranéen (base céréalière, légumes, poissons)',
            'Réduire la consommation de sel à moins de 5g/jour',
            'Éviter les boissons sucrées et les aliments ultra-transformés',
            'Préférer des portions modérées et des repas réguliers',
        ],
        'conseils_specifiques': 'Bilan nutritionnel trimestriel conseillé.',
    },
    'FAIBLE': {
        'titre': 'Maintien d\'un mode de vie sain',
        'objectifs': [
            'Continuer une alimentation variée et équilibrée',
            'Maintenir la consommation de fruits et légumes',
            'Limiter la charcuterie et les produits gras',
        ],
        'conseils_specifiques': None,
    },
}

PLANS_ACTIVITE = {
    'ELEVE': {
        'titre': 'Programme d\'activité physique quotidienne — Réhabilitation métabolique',
        'objectifs': [
            'Marche rapide 45 minutes par jour, 7 jours/semaine',
            'Natation ou vélo 3 fois par semaine (30 min)',
            'Éviter toute position assise prolongée > 1 heure consécutive',
            'Exercices de renforcement musculaire 2 fois par semaine',
        ],
        'frequence_hebdomadaire': 7,
        'duree_seance_minutes': 45,
    },
    'INTERMEDIAIRE': {
        'titre': 'Programme d\'activité physique régulière',
        'objectifs': [
            'Marche ou jogging 30 minutes, 5 fois par semaine',
            'Activité ludique ou sportive 2 fois par semaine (natation, cyclisme)',
            'Préférer les escaliers aux ascenseurs',
        ],
        'frequence_hebdomadaire': 5,
        'duree_seance_minutes': 30,
    },
    'FAIBLE': {
        'titre': 'Maintien de l\'activité physique actuelle',
        'objectifs': [
            'Maintenir au minimum 150 minutes d\'activité modérée par semaine',
            'Intégrer des activités de loisirs actifs (jardinage, danse, randonnée)',
        ],
        'frequence_hebdomadaire': 5,
        'duree_seance_minutes': 30,
    },
}

# Statuts des plans : 4 VALIDÉS, 4 BROUILLON, 2 REJETÉS
STATUTS_PLANS = [
    (StatutPlan.VALIDE,    nutri1),   # P0 ÉLEVÉ → validé
    (StatutPlan.VALIDE,    nutri2),   # P1 ÉLEVÉ → validé
    (StatutPlan.BROUILLON, None),     # P2 ÉLEVÉ → en attente
    (StatutPlan.VALIDE,    nutri1),   # P3 INTERMÉDIAIRE → validé
    (StatutPlan.BROUILLON, None),     # P4 INTERMÉDIAIRE → en attente
    (StatutPlan.REJETE,    nutri3),   # P5 INTERMÉDIAIRE → rejeté
    (StatutPlan.BROUILLON, None),     # P6 INTERMÉDIAIRE → en attente
    (StatutPlan.VALIDE,    nutri2),   # P7 FAIBLE → validé
    (StatutPlan.BROUILLON, None),     # P8 FAIBLE → en attente
    (StatutPlan.REJETE,    nutri1),   # P9 FAIBLE → rejeté
]

# Comptes citoyens (INS → compte citoyen pour connexion mobile)
CITOYENS_DATA = {
    'TUN10001980': ('citoyen.haddad',   'haddad@mail.tn',   '1234'),
    'TUN10001975': ('citoyen.belhaj',   'belhaj@mail.tn',   '1234'),
    'TUN10001968': ('citoyen.mansouri', 'mansouri@mail.tn', '1234'),
    'TUN10001990': ('citoyen.zouari',   'zouari@mail.tn',   '1234'),
    'TUN10001985': ('citoyen.dridi',    'dridi@mail.tn',    '1234'),
}

patients = []
plans_crees = []

with transaction.atomic():
    for i, (pd, sd, statut_info) in enumerate(
        zip(PATIENTS_DATA, SCREENINGS_DATA, STATUTS_PLANS)
    ):
        ins, prenom, nom, ddn, genre, gouv, tel = pd
        niveau, score, type_soum, agent, donnees = sd
        statut_plan, valideur = statut_info

        # ── Patient ──
        patient = ProfilPatient.objects.create(
            ins=ins,
            prenom=prenom,
            nom=nom,
            date_naissance=ddn,
            genre=genre,
            gouvernorat=gouv,
            telephone=tel,
            cree_par=agent,
        )
        patients.append(patient)

        # ── Réponse screening ──
        reponse = ReponseScreening.objects.create(
            patient=patient,
            soumis_par=agent,
            type_soumission=type_soum,
            version_questionnaire='1.0',
            donnees=donnees,
        )

        # ── Évaluation risque ──
        evaluation = ResultatEvaluationRisque.objects.create(
            reponse_screening=reponse,
            patient=patient,
            niveau_risque=niveau,
            score=score,
            facteurs=FACTEURS_PAR_NIVEAU[niveau],
            version_moteur='stub-1.0',
        )

        # ── Plan de soin ──
        notes = ''
        if statut_plan == StatutPlan.VALIDE:
            notes = f"Plan personnalisé validé après examen du dossier de {prenom} {nom}. Réévaluation dans 3 mois."
        elif statut_plan == StatutPlan.REJETE:
            notes = "Informations incomplètes — dossier à compléter avec les résultats biologiques récents."

        plan = PlanSoin.objects.create(
            patient=patient,
            evaluation_risque=evaluation,
            plan_nutrition=PLANS_NUTRITION[niveau],
            plan_activite=PLANS_ACTIVITE[niveau],
            notes_nutritionniste=notes,
            statut=statut_plan,
            valide_le=timezone.now() if statut_plan == StatutPlan.VALIDE else None,
            valide_par=valideur,
            motif_rejet="Dossier incomplet — résultats biologiques manquants." if statut_plan == StatutPlan.REJETE else '',
        )
        plans_crees.append(plan)

        # ── Compte citoyen (pour les 5 premiers) ──
        if ins in CITOYENS_DATA:
            _, email_c, pin = CITOYENS_DATA[ins]
            citoyen = CompteUtilisateur.objects.create_user(
                username=ins,
                email=email_c,
                password=pin,
                prenom=prenom,
                nom=nom,
                role=Role.CITOYEN,
                gouvernorat=gouv,
            )
            # Relier le ProfilPatient au CompteUtilisateur citoyen
            # (si votre modèle a ce champ — sinon on l'ignore)

print(f"     ✓ {len(patients)} patients créés")
print(f"     ✓ {ReponseScreening.objects.count()} dépistages")
print(f"     ✓ {ResultatEvaluationRisque.objects.count()} évaluations de risque")
print(f"     ✓ {PlanSoin.objects.count()} plans de soin")

# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS CITOYENNES
# ─────────────────────────────────────────────────────────────────────────────
print("\n[4/6] Création des notifications citoyennes…")

notifs_creees = 0
for ins in CITOYENS_DATA:
    try:
        compte = CompteUtilisateur.objects.get(username=ins)
        patient = ProfilPatient.objects.get(ins=ins)
        plan = PlanSoin.objects.filter(patient=patient).first()

        if plan and plan.statut == StatutPlan.VALIDE:
            Notification.objects.create(
                destinataire=compte,
                type_notification=Notification.TypeNotification.PLAN_VALIDE,
                message=f"Votre plan nutritionnel et d'activité physique a été validé par votre nutritionniste référent. Consultez l'onglet « Mon Plan » pour voir vos recommandations personnalisées.",
                lu=False,
            )
            notifs_creees += 1
        elif plan and plan.statut == StatutPlan.REJETE:
            Notification.objects.create(
                destinataire=compte,
                type_notification=Notification.TypeNotification.PLAN_REJETE,
                message=f"Votre plan est en cours de révision par votre nutritionniste. Des informations complémentaires sont nécessaires. Vous serez notifié(e) dès sa validation.",
                lu=False,
            )
            notifs_creees += 1

        # Rappel auto-évaluation
        Notification.objects.create(
            destinataire=compte,
            type_notification=Notification.TypeNotification.RAPPEL_AUTO_EVALUATION,
            message="N'oubliez pas de mettre à jour votre auto-évaluation. Une évaluation régulière permet un suivi optimal de votre santé préventive.",
            lu=True,
        )
        notifs_creees += 1
    except CompteUtilisateur.DoesNotExist:
        pass

print(f"     ✓ {notifs_creees} notifications créées")

# ─────────────────────────────────────────────────────────────────────────────
# SUPERUSER
# ─────────────────────────────────────────────────────────────────────────────
print("\n[5/6] Vérification du superuser…")
if not CompteUtilisateur.objects.filter(is_superuser=True).exists():
    CompteUtilisateur.objects.create_superuser(
        username='superadmin',
        email='superadmin@wiqayati.tn',
        password='SuperAdmin2026!',
        prenom='Super',
        nom='Admin',
        role=Role.ADMIN_IT,
    )
    print("     ✓ Superuser créé (superadmin / SuperAdmin2026!)")
else:
    print("     ✓ Superuser existant conservé")

# ─────────────────────────────────────────────────────────────────────────────
# RÉSUMÉ
# ─────────────────────────────────────────────────────────────────────────────
print("\n[6/6] Résumé de la base de données de démo")
print("=" * 60)
print("\n  COMPTES UTILISATEURS")
print(f"    Admin IT         : admin.it / Admin2026!")
print(f"    Admin Ministère  : admin.ministere / Admin2026!")
print(f"    Nutritionniste 1 : nutri.ben_ali / Nutri2026!")
print(f"    Nutritionniste 2 : nutri.trabelsi / Nutri2026!")
print(f"    Nutritionniste 3 : nutri.chaabane / Nutri2026!")
print(f"    Agent campagne   : agent.campagne.sfax / Agent2026!")
print(f"    Agent CSP Tunis  : agent.csp.tunis / Agent2026!")
print(f"    Agent CSP Sousse : agent.csp.sousse / Agent2026!")
print(f"\n  CITOYENS (connexion mobile — PIN : 1234)")
for ins, (uname, _, _) in CITOYENS_DATA.items():
    p = ProfilPatient.objects.get(ins=ins)
    plan = PlanSoin.objects.filter(patient=p).first()
    statut = plan.get_statut_display() if plan else 'Aucun'
    print(f"    INS: {ins}  ({p.prenom} {p.nom}) — Plan: {statut}")
print(f"\n  STATISTIQUES")
print(f"    Patients      : {ProfilPatient.objects.count()}")
print(f"    Dépistages    : {ReponseScreening.objects.count()}")
print(f"    Évaluations   : {ResultatEvaluationRisque.objects.count()}")
print(f"    Plans validés : {PlanSoin.objects.filter(statut=StatutPlan.VALIDE).count()}")
print(f"    Plans attente : {PlanSoin.objects.filter(statut=StatutPlan.BROUILLON).count()}")
print(f"    Plans rejetés : {PlanSoin.objects.filter(statut=StatutPlan.REJETE).count()}")
risques = {
    'ÉLEVÉ':         ResultatEvaluationRisque.objects.filter(niveau_risque='ELEVE').count(),
    'INTERMÉDIAIRE': ResultatEvaluationRisque.objects.filter(niveau_risque='INTERMEDIAIRE').count(),
    'FAIBLE':        ResultatEvaluationRisque.objects.filter(niveau_risque='FAIBLE').count(),
}
for k, v in risques.items():
    print(f"    Risque {k:<14}: {v}")
print("\n" + "=" * 60)
print("  ✅ Base de données peuplée avec succès !")
print("=" * 60 + "\n")
