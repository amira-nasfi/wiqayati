"""
Commande de génération de données de démonstration pour Wiqayati.
Crée les comptes des différents rôles et des dossiers patients de test.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.accounts.models import CompteUtilisateur, Role
from apps.screening.models import ProfilPatient, ReponseScreening, TypeSoumission
from apps.risk_engine.models import ResultatEvaluationRisque, NiveauRisque
from apps.risk_engine.services import ClientMoteurRisque
from apps.care_plan.models import PlanSoin, StatutPlan
from apps.care_plan.services import GenerateurPlanSoin
from apps.nutritionist_queue.models import TacheNutritionniste, PrioriteTache, StatutTache


class Command(BaseCommand):
    help = "Initialise les utilisateurs types et des dossiers de test pour tous les rôles"

    def handle(self, *args, **options):
        self.stdout.write("Initialisation des comptes de test Wiqayati...")

        comptes_a_creer = [
            {
                'username': 'admin_it',
                'email': 'admin.it@wiqayati.tn',
                'prenom': 'Karim',
                'nom': 'Bouazizi',
                'role': Role.ADMIN_IT,
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'admin_ministere',
                'email': 'direction.prevention@sante.gov.tn',
                'prenom': 'Leila',
                'nom': 'Mansour',
                'role': Role.ADMIN_MINISTERE,
                'is_staff': False,
            },
            {
                'username': 'agent_campagne',
                'email': 'agent.campagne@wiqayati.tn',
                'prenom': 'Youssef',
                'nom': 'Ben Amor',
                'role': Role.AGENT_CAMPAGNE,
                'gouvernorat': 'Tunis',
                'expire_le': timezone.now() + timedelta(days=90),
            },
            {
                'username': 'agent_soins',
                'email': 'agent.soins@wiqayati.tn',
                'prenom': 'Nadia',
                'nom': 'Mejri',
                'role': Role.AGENT_SOINS_PRIMAIRES,
                'gouvernorat': 'Sousse',
            },
            {
                'username': 'nutritionniste1',
                'email': 'dr.nutrition@wiqayati.tn',
                'prenom': 'Sonia',
                'nom': 'Driss',
                'role': Role.NUTRITIONNISTE,
            },
        ]

        mot_de_passe_commun = "Wiqayati2026!"

        for c in comptes_a_creer:
            user, created = CompteUtilisateur.objects.get_or_create(
                username=c['username'],
                defaults=c
            )
            user.set_password(mot_de_passe_commun)
            user.is_active = True
            user.save()
            action = "créé" if created else "mis à jour"
            self.stdout.write(f"  - Compte {user.username} ({user.get_role_display()}) {action}.")

        # Création de patients de test
        agent = CompteUtilisateur.objects.get(username='agent_campagne')

        patients_demo = [
            {
                'ins': 'TUN10002001',
                'prenom': 'Moncef',
                'nom': 'Trabelsi',
                'date_naissance': date(1972, 5, 14),
                'genre': 'M',
                'gouvernorat': 'Tunis',
                'telephone': '98123456',
                'age': 54,
                'imc': 32.5,
                'tour_taille': 104,
                'famille': True,
                'ht': True,
                'sedentaire': 'FAIBLE',
                'tabac': 'FUMEUR_ACTUEL',
                'attendu': 'ELEVE'
            },
            {
                'ins': 'TUN10002002',
                'prenom': 'Samira',
                'nom': 'Chahed',
                'date_naissance': date(1985, 9, 21),
                'genre': 'F',
                'gouvernorat': 'Sfax',
                'telephone': '21456789',
                'age': 41,
                'imc': 27.2,
                'tour_taille': 86,
                'famille': True,
                'ht': False,
                'sedentaire': 'MODERE',
                'tabac': 'JAMAIS',
                'attendu': 'INTERMEDIAIRE'
            },
            {
                'ins': 'TUN10002003',
                'prenom': 'Amine',
                'nom': 'Gharbi',
                'date_naissance': date(1996, 3, 10),
                'genre': 'M',
                'gouvernorat': 'Sousse',
                'telephone': '55889900',
                'age': 30,
                'imc': 22.4,
                'tour_taille': 78,
                'famille': False,
                'ht': False,
                'sedentaire': 'ELEVE',
                'tabac': 'JAMAIS',
                'attendu': 'FAIBLE'
            }
        ]

        self.stdout.write("\nCréation des dossiers patients et dépistages...")

        for p_data in patients_demo:
            patient, created = ProfilPatient.objects.get_or_create(
                ins=p_data['ins'],
                defaults={
                    'prenom': p_data['prenom'],
                    'nom': p_data['nom'],
                    'date_naissance': p_data['date_naissance'],
                    'genre': p_data['genre'],
                    'gouvernorat': p_data['gouvernorat'],
                    'telephone': p_data['telephone'],
                    'cree_par': agent
                }
            )

            # Compte citoyen pour connexion mobile
            citoyen_user, _ = CompteUtilisateur.objects.get_or_create(
                username=patient.ins,
                defaults={
                    'email': f"{patient.ins.lower()}@citoyen.wiqayati.tn",
                    'prenom': patient.prenom,
                    'nom': patient.nom,
                    'role': Role.CITOYEN,
                    'gouvernorat': patient.gouvernorat
                }
            )
            citoyen_user.set_password("1234")  # PIN de test
            citoyen_user.save()

            donnees_screening = {
                "age": p_data['age'],
                "genre": p_data['genre'],
                "imc": p_data['imc'],
                "tour_taille_cm": p_data['tour_taille'],
                "antecedents_familiaux_diabete": p_data['famille'],
                "hypertension_diagnostiquee": p_data['ht'],
                "niveau_activite_physique": p_data['sedentaire'],
                "qualite_alimentation": "MAUVAISE" if p_data['famille'] else "BONNE",
                "statut_tabagisme": p_data['tabac'],
                "glycemie_jeun_connue": False,
                "glycemie_jeun_mmol": None,
                "diabete_gestationnel_antecedent": False,
                "medicaments_corticoides": False,
                "acanthosis_nigricans": p_data['famille'] and p_data['ht']
            }

            if not ReponseScreening.objects.filter(patient=patient).exists():
                reponse = ReponseScreening.objects.create(
                    patient=patient,
                    soumis_par=agent,
                    type_soumission=TypeSoumission.CAMPAGNE,
                    donnees=donnees_screening
                )

                res_moteur = ClientMoteurRisque.evaluer(
                    ins_patient=patient.ins,
                    donnees_questionnaire=donnees_screening,
                    contexte={
                        "type_soumission": "AGENT",
                        "role_soumetteur": "AGENT_CAMPAGNE",
                        "horodatage_soumission": timezone.now().isoformat()
                    }
                )

                evaluation = ResultatEvaluationRisque.objects.create(
                    reponse_screening=reponse,
                    patient=patient,
                    niveau_risque=res_moteur["niveau_risque"],
                    score=int(res_moteur["score"]),
                    facteurs=res_moteur.get("facteurs", []),
                    version_moteur=res_moteur.get("version_moteur", "stub-1.0")
                )

                nutrition, activite = GenerateurPlanSoin.generer_plans(
                    niveau_risqu=evaluation.niveau_risque,
                    facteurs=evaluation.facteurs
                )

                # Samira a déjà un plan validé pour tester l'app citoyenne
                est_valide = (p_data['ins'] == 'TUN10002002')

                plan = PlanSoin.objects.create(
                    patient=patient,
                    evaluation_risque=evaluation,
                    plan_nutrition=nutrition,
                    plan_activite=activite,
                    notes_nutritionniste=(
                        "Patient très réceptif aux conseils d'équilibre alimentaire." if est_valide else ""
                    ),
                    statut=StatutPlan.VALIDE if est_valide else StatutPlan.BROUILLON,
                    valide_le=timezone.now() if est_valide else None,
                    valide_par=CompteUtilisateur.objects.get(username='nutritionniste1') if est_valide else None
                )

                priorite_map = {
                    NiveauRisque.ELEVE: PrioriteTache.STAT,
                    NiveauRisque.INTERMEDIAIRE: PrioriteTache.URGENT,
                    NiveauRisque.FAIBLE: PrioriteTache.ROUTINE,
                }

                TacheNutritionniste.objects.create(
                    plan_soin=plan,
                    priorite=priorite_map[evaluation.niveau_risque],
                    statut=StatutTache.COMPLETE if est_valide else StatutTache.DEMANDE
                )

                self.stdout.write(
                    f"  - Patient {patient.ins} ({patient.prenom} {patient.nom}) : "
                    f"Risque {evaluation.niveau_risque} ({evaluation.score}/100)"
                )

        self.stdout.write(self.style.SUCCESS("\nInitialisation terminée avec succès !"))
