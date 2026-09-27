"""
Commande Django de peuplement de la base de données de démo WiQayati.
Usage:
    python manage.py seed_demo_data
"""
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.accounts.models import CompteUtilisateur, Role, Notification
from apps.screening.models import ProfilPatient, ReponseScreening, TypeSoumission
from apps.risk_engine.models import ResultatEvaluationRisque, NiveauRisque
from apps.care_plan.models import PlanSoin, StatutPlan
from apps.nutritionist_queue.models import (
    TacheNutritionniste, PrioriteTache, StatutTache,
)


class Command(BaseCommand):
    help = "Initialise la base de données avec des données de démonstration complètes pour WiQayati"

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-clean',
            action='store_true',
            help='Ne pas supprimer les données existantes avant de peupler',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=" * 70))
        self.stdout.write(self.style.NOTICE("  WIQAYATI — Peuplement des données de démonstration"))
        self.stdout.write(self.style.NOTICE("=" * 70))

        if not options.get('no_clean'):
            self.stdout.write("\n[1/5] Nettoyage des tables existantes...")
            Notification.objects.all().delete()
            TacheNutritionniste.objects.all().delete()
            PlanSoin.objects.all().delete()
            ResultatEvaluationRisque.objects.all().delete()
            ReponseScreening.objects.all().delete()
            ProfilPatient.objects.all().delete()
            CompteUtilisateur.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("     [OK] Tables reinitialisees."))

        self.stdout.write("\n[2/5] Création des comptes utilisateurs et structures...")
        with transaction.atomic():
            # Admin IT
            admin_it = CompteUtilisateur.objects.create_user(
                username='admin.it',
                email='admin.it@wiqayati.tn',
                password='Admin2026!',
                prenom='Sami',
                nom='Bouaziz',
                role=Role.ADMIN_IT,
                is_staff=True,
            )
            # Admin Ministère
            admin_min = CompteUtilisateur.objects.create_user(
                username='admin.ministere',
                email='admin.ministere@sante.gov.tn',
                password='Admin2026!',
                prenom='Houda',
                nom='Meddeb',
                role=Role.ADMIN_MINISTERE,
            )
            # Nutritionnistes
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
            # Agent Campagne
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
            # Agents Soins Primaires / Dispensaires
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

            # Superadmin
            CompteUtilisateur.objects.create_superuser(
                username='superadmin',
                email='superadmin@wiqayati.tn',
                password='SuperAdmin2026!',
                prenom='Super',
                nom='Admin',
                role=Role.ADMIN_IT,
            )

        self.stdout.write(self.style.SUCCESS(f"     [OK] {CompteUtilisateur.objects.count()} comptes crees avec succes."))

        self.stdout.write("\n[3/5] Création des dossiers patients et dépistages...")

        PATIENTS_CONFIG = [
            ('08123456', 'TUN10001980', 'Mohamed',   'Haddad',    '1980-03-15', 'M', 'Tunis',    '+21620100001'),
            ('09234567', 'TUN10001975', 'Fatma',     'Belhaj',    '1975-07-22', 'F', 'Sfax',     '+21650100002'),
            ('07345678', 'TUN10001968', 'Karim',     'Mansouri',  '1968-11-05', 'M', 'Sousse',   '+21621100003'),
            ('11456789', 'TUN10001990', 'Ines',      'Zouari',    '1990-01-30', 'F', 'Tunis',    '+21625100004'),
            ('05567890', 'TUN10001985', 'Olfa',      'Dridi',     '1985-02-09', 'F', 'Nabeul',   '+21696100010'),
            ('12678901', 'TUN10002001', 'Sana',      'Riahi',     '2001-04-18', 'F', 'Monastir', '+21622100006'),
            ('04789012', 'TUN10001955', 'Abdelaziz', 'Jouini',   '1955-09-12', 'M', 'Sfax',     '+21698100005'),
            ('06890123', 'TUN10001963', 'Lotfi',     'Guesmi',    '1963-08-27', 'M', 'Sousse',   '+21695100007'),
            ('14901234', 'TUN10001988', 'Rania',     'Khelifi',   '1988-12-03', 'F', 'Tunis',    '+21620100008'),
            ('08012345', 'TUN10001972', 'Nabil',     'Ayari',     '1972-06-14', 'M', 'Sfax',     '+21621100009'),
            ('09112233', 'TUN10001978', 'Tarak',     'Mejri',     '1978-05-19', 'M', 'Kairouan', '+21623100011'),
            ('13223344', 'TUN10001995', 'Amel',      'Bouzid',    '1995-10-10', 'F', 'Bizerte',  '+21624100012'),
            ('07334455', 'TUN10001982', 'Walid',     'Ben Amor',  '1982-04-02', 'M', 'Ariana',   '+21626100013'),
            ('10445566', 'TUN10001998', 'Yasmine',   'Trabelsi',  '1998-08-14', 'F', 'Ben Arous','+21627100014'),
            ('06556677', 'TUN10001970', 'Moncef',    'Jlassi',    '1970-12-25', 'M', 'Gafsa',    '+21628100015'),
            ('11667788', 'TUN10001992', 'Mouna',     'Gharbi',    '1992-06-30', 'F', 'Gabès',    '+21629100016'),
        ]

        SCREENINGS_DETAIL = [
            # 0 : Mohamed Haddad
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
            # 1 : Fatma Belhaj
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
                    'notes_dmi': 'Dépistée lors de la caravane Sfax Sud. Glycémie très élevée.',
                }
            },
            # 2 : Karim Mansouri
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
            # 3 : Ines Zouari
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
            # 4 : Olfa Dridi
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
                    'notes_dmi': 'Antécédent de diabète gestationnel en 2021.',
                }
            },
            # 5 : Sana Riahi
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
            # 6 : Abdelaziz Jouini
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
            # 7 : Lotfi Guesmi
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
            # 8 : Rania Khelifi
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
            # 9 : Nabil Ayari
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
            # 10 : Tarak Mejri
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
                    'notes_dmi': 'Conducteur de taxi, sédentarité sévère.',
                }
            },
            # 11 : Amel Bouzid
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
            # 12 : Walid Ben Amor
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
                    'notes_dmi': 'Signes d insulino-résistance cutanée nets.',
                }
            },
            # 13 : Yasmine Trabelsi
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
            # 14 : Moncef Jlassi
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
            # 15 : Mouna Gharbi
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

        PLANS_NUTRITION = {
            'ELEVE': {
                'titre': 'Plan nutritionnel intensif personnalisé (Agent Hybride)',
                'objectifs': [
                    'Déficit calorique modéré de 450 à 500 kcal/jour sans privation drastique',
                    'Éviction complète des boissons sucrées, sodas et pâtisseries orientales',
                    'Remplacement systématique du pain blanc tunisien par du pain complet ou d\'orge (Mbeses complet)',
                    'Consommation quotidienne d\'au moins 400g de légumes locaux (salade mechouia allégée, tajines de légumes)',
                    'Privilégier l\'huile d\'olive extra vierge tunisienne (2 cuillères à soupe max par jour)',
                    'Apport protéique régulier : poissons de Méditerranée 2 à 3 fois par semaine, légumineuses (pois chiches, lentilles)',
                ],
                'conseils_specifiques': 'Plan généré par l\'Agent Hybride WiQayati à partir des 14 variables du screening et des données DMI.',
            },
            'INTERMEDIAIRE': {
                'titre': 'Plan d\'équilibrage alimentaire structuré (Agent Hybride)',
                'objectifs': [
                    'Adopter le régime méditerranéen traditionnel tunisien (céréales complètes, huile d\'olive, légumes cuits et crus)',
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

        PLANS_ACTIVITE = {
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

        FACTEURS_RISQUE = {
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

        CITOYENS_PIN = {
            'TUN10001980': '1234',
            'TUN10001975': '1234',
            'TUN10001968': '1234',
            'TUN10001990': '1234',
            'TUN10001985': '1234',
        }

        patients_crees = []
        with transaction.atomic():
            for p_cfg, s_det in zip(PATIENTS_CONFIG, SCREENINGS_DETAIL):
                cin, ins, prenom, nom, ddn, genre, gouv, tel = p_cfg
                niveau = s_det['niveau']
                score = s_det['score']
                canal = s_det['canal']
                agent = s_det['agent']
                valideur = s_det['valideur']
                statut_plan = s_det['statut_plan']
                donnees = s_det['donnees']

                # Création patient
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

                # Réponse screening initiale (antidatée à 4 mois pour suivi longitudinal)
                reponse = ReponseScreening.objects.create(
                    patient=patient,
                    soumis_par=agent,
                    type_soumission=canal,
                    version_questionnaire='1.0',
                    donnees=donnees,
                )
                date_initiale = timezone.now() - datetime.timedelta(days=120)
                ReponseScreening.objects.filter(id=reponse.id).update(soumis_le=date_initiale)

                # Évaluation risque initiale
                eval_init = ResultatEvaluationRisque.objects.create(
                    reponse_screening=reponse,
                    patient=patient,
                    niveau_risque=niveau,
                    score=score,
                    facteurs=FACTEURS_RISQUE[niveau],
                    version_moteur='agent-hybride-v1.2',
                )
                ResultatEvaluationRisque.objects.filter(id=eval_init.id).update(evalue_le=date_initiale)

                # Plan de soin
                notes = (
                    f"Recommandations de l'Agent Hybride validées pour {prenom} {nom}."
                    if statut_plan == StatutPlan.VALIDE else
                    f"Plan initial généré automatiquement par l'Agent Hybride en attente de personnalisation."
                )
                plan = PlanSoin.objects.create(
                    patient=patient,
                    evaluation_risque=eval_init,
                    plan_nutrition=PLANS_NUTRITION[niveau],
                    plan_activite=PLANS_ACTIVITE[niveau],
                    notes_nutritionniste=notes,
                    statut=statut_plan,
                    valide_le=timezone.now() if statut_plan == StatutPlan.VALIDE else None,
                    valide_par=valideur if statut_plan == StatutPlan.VALIDE else None,
                )
                PlanSoin.objects.filter(id=plan.id).update(genere_le=date_initiale)

                # Tâche file d'attente
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

                # Compte citoyen
                if ins in CITOYENS_PIN:
                    citoyen = CompteUtilisateur.objects.create_user(
                        username=ins,
                        email=f"{ins.lower()}@citoyen.wiqayati.tn",
                        password=CITOYENS_PIN[ins],
                        prenom=prenom,
                        nom=nom,
                        role=Role.CITOYEN,
                        gouvernorat=gouv,
                    )

            # Suivi longitudinal : 4 patients ayant une baisse nette du score de risque
            suivis = [
                (0, 52, NiveauRisque.INTERMEDIAIRE, 29.8, 6.0, "Baisse de l'IMC et amélioration de l'HbA1c."),
                (2, 48, NiveauRisque.INTERMEDIAIRE, 27.9, 5.7, "Reprise marche quotidienne, glycémie stabilisée."),
                (3, 30, NiveauRisque.FAIBLE, 24.8, 5.2, "Normalisation pondérale et glycémie redevenue normale."),
                (6, 42, NiveauRisque.INTERMEDIAIRE, 26.5, 5.5, "Excellente adhésion au programme d'activité physique."),
            ]
            date_recente = timezone.now() - datetime.timedelta(days=10)
            for p_idx, score_rec, niv_rec, imc_rec, gly_rec, note in suivis:
                p = patients_crees[p_idx]
                d_rec = dict(p.reponses_screening.first().donnees)
                d_rec['imc'] = imc_rec
                d_rec['glycemie_jeun_mmol'] = gly_rec
                d_rec['hba1c_pct'] = 5.5
                d_rec['activite_physique_quotidienne'] = True
                d_rec['niveau_activite_physique'] = 'ACTIF'
                d_rec['note_suivi'] = note

                rep_rec = ReponseScreening.objects.create(
                    patient=p,
                    soumis_par=agent_sp1 if p.gouvernorat == 'Tunis' else agent_sp2,
                    type_soumission=TypeSoumission.SOINS_PRIMAIRES,
                    version_questionnaire='1.0',
                    donnees=d_rec,
                )
                ReponseScreening.objects.filter(id=rep_rec.id).update(soumis_le=date_recente)

                ev_rec = ResultatEvaluationRisque.objects.create(
                    reponse_screening=rep_rec,
                    patient=p,
                    niveau_risque=niv_rec,
                    score=score_rec,
                    facteurs=FACTEURS_RISQUE[niv_rec],
                    version_moteur='agent-hybride-v1.2',
                )
                ResultatEvaluationRisque.objects.filter(id=ev_rec.id).update(evalue_le=date_recente)

        self.stdout.write(self.style.SUCCESS(f"     [OK] {len(patients_crees)} patients crees avec CIN 8 chiffres."))
        self.stdout.write(self.style.SUCCESS(f"     [OK] {ReponseScreening.objects.count()} depistages enregistres."))
        self.stdout.write(self.style.SUCCESS(f"     [OK] {PlanSoin.objects.count()} plans de soins generes (0 rejete)."))

        self.stdout.write("\n[4/5] Creation des notifications citoyennes...")
        for ins in CITOYENS_PIN:
            try:
                compte = CompteUtilisateur.objects.get(username=ins)
                patient = ProfilPatient.objects.get(ins=ins)
                plan = PlanSoin.objects.filter(patient=patient).first()
                if plan and plan.statut == StatutPlan.VALIDE:
                    Notification.objects.create(
                        destinataire=compte,
                        type_notification=Notification.TypeNotification.PLAN_VALIDE,
                        message="Votre plan de nutrition et d'activite physique a ete valide par votre praticien.",
                        lu=False,
                    )
                Notification.objects.create(
                    destinataire=compte,
                    type_notification=Notification.TypeNotification.RAPPEL_AUTO_EVALUATION,
                    message="Pensez a renouveler votre auto-evaluation dans 3 mois.",
                    lu=True,
                )
            except Exception:
                pass
        self.stdout.write(self.style.SUCCESS(f"     [OK] {Notification.objects.count()} notifications creees."))

        self.stdout.write("\n[5/5] Résumé final :")
        self.stdout.write("=" * 70)
        self.stdout.write("  COMPTES DE CONNEXION :")
        self.stdout.write("  Admin IT         : admin.it / Admin2026!")
        self.stdout.write("  Admin Ministère  : admin.ministere / Admin2026!")
        self.stdout.write("  Nutritionniste 1 : nutri.ben_ali / Nutri2026! (Tunis - INN)")
        self.stdout.write("  Nutritionniste 2 : nutri.trabelsi / Nutri2026! (Sfax - CHU)")
        self.stdout.write("  Nutritionniste 3 : nutri.chaabane / Nutri2026! (Sousse - CHU)")
        self.stdout.write("  Agent Campagne   : agent.campagne.sfax / Agent2026! (Caravane Sfax-Sud)")
        self.stdout.write("  Agent CSB Tunis  : agent.csp.tunis / Agent2026! (CSB Bab Souika)")
        self.stdout.write("  Agent CSB Sousse : agent.csp.sousse / Agent2026! (CSB Sousse Médina)")
        self.stdout.write("  Superadmin       : superadmin / SuperAdmin2026!")
        self.stdout.write("  Citoyens (mobile): username = INS (ex: TUN10001980) / PIN: 1234")
        self.stdout.write("\n  EXEMPLES CIN POUR RECHERCHE DANS LE PORTAIL AGENT :")
        for p in ProfilPatient.objects.all()[:5]:
            self.stdout.write(f"  CIN: {p.cin} | DdN: {p.date_naissance} | {p.prenom} {p.nom} | INS: {p.ins}")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("  Peuplement terminé avec succès sans aucune erreur !"))
