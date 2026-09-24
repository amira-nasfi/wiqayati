"""
Tests d'intégration du flux de dépistage, de l'unicité par INS et du portail citoyen.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import CompteUtilisateur, Role
from apps.screening.models import ProfilPatient, ReponseScreening
from apps.care_plan.models import PlanSoin, StatutPlan
from apps.nutritionist_queue.models import TacheNutritionniste, PrioriteTache


class TestFluxDepistageEtUniciteINS(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.agent = CompteUtilisateur.objects.create_user(
            username='agent_camp',
            email='agent.camp@test.tn',
            password='Password123!',
            role=Role.AGENT_CAMPAGNE,
            gouvernorat='Tunis'
        )

        self.nutri = CompteUtilisateur.objects.create_user(
            username='nutri_pro',
            email='nutri.pro@test.tn',
            password='Password123!',
            role=Role.NUTRITIONNISTE
        )

        resp_auth = self.client.post('/api/v1/auth/connexion/', {
            'username': 'agent_camp',
            'password': 'Password123!'
        })
        self.token_agent = resp_auth.data['access']

    def test_pipeline_complet_et_unicite_ins(self):
        """
        Teste le flux complet :
        1. Soumission d'un premier dépistage avec création du patient par INS.
        2. Vérification du risque calculé (ELEVE) et de la tâche STAT créée.
        3. Deuxième soumission avec le MÊME INS -> même ProfilPatient (PAS de doublon).
        4. Validation par le nutritionniste -> plan visible par le citoyen.
        """
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token_agent)

        ins_test = "TUN88887777"

        donnees_eleve = {
            "age": 55,
            "genre": "M",
            "imc": 34.0,
            "tour_taille_cm": 108,
            "antecedents_familiaux_diabete": True,
            "hypertension_diagnostiquee": True,
            "niveau_activite_physique": "FAIBLE",
            "qualite_alimentation": "MAUVAISE",
            "statut_tabagisme": "FUMEUR_ACTUEL",
            "glycemie_jeun_connue": False,
            "glycemie_jeun_mmol": None,
            "diabete_gestationnel_antecedent": False,
            "medicaments_corticoides": False,
            "acanthosis_nigricans": True
        }

        # 1. Première soumission
        resp1 = self.client.post('/api/v1/screening/soumissions/', {
            'ins_patient': ins_test,
            'version_questionnaire': '1.0',
            'donnees': donnees_eleve,
            'patient_info': {
                'prenom': 'Kamel',
                'nom': 'Ben Youssef',
                'date_naissance': '1971-04-12',
                'genre': 'M',
                'gouvernorat': 'Tunis',
                'telephone': '98000111'
            }
        }, format='json')

        self.assertEqual(resp1.status_code, 201)
        self.assertEqual(resp1.data['evaluation_risque']['niveau_risque'], 'ELEVE')
        self.assertEqual(resp1.data['priorite_tache'], 'STAT')
        plan_id = resp1.data['plan_soin_id']

        # Vérifier qu'il y a exactement 1 ProfilPatient
        self.assertEqual(ProfilPatient.objects.filter(ins=ins_test).count(), 1)

        # 2. Deuxième soumission pour le MÊME patient
        resp2 = self.client.post('/api/v1/screening/soumissions/', {
            'ins_patient': ins_test,
            'version_questionnaire': '1.0',
            'donnees': donnees_eleve
        }, format='json')

        self.assertEqual(resp2.status_code, 201)
        # RÈGLE FONDAMENTALE : Toujours exactement 1 seul patient enregistré (aucune duplication)
        self.assertEqual(ProfilPatient.objects.filter(ins=ins_test).count(), 1)
        # Mais 2 réponses de dépistage reliées à ce même patient
        patient = ProfilPatient.objects.get(ins=ins_test)
        self.assertEqual(patient.reponses_screening.count(), 2)

        # 3. Validation du plan par le nutritionniste
        client_nutri = APIClient()
        resp_nutri = client_nutri.post('/api/v1/auth/connexion/', {
            'username': 'nutri_pro',
            'password': 'Password123!'
        })
        token_nutri = resp_nutri.data['access']
        client_nutri.credentials(HTTP_AUTHORIZATION='Bearer ' + token_nutri)

        resp_val = client_nutri.post(f'/api/v1/nutritionniste/plans/{plan_id}/valider/')
        self.assertEqual(resp_val.status_code, 200)

        plan = PlanSoin.objects.get(id=plan_id)
        self.assertEqual(plan.statut, StatutPlan.VALIDE)

        # 4. Le citoyen se connecte avec son INS et consulte son plan validé
        client_citoyen = APIClient()
        resp_citoyen_login = client_citoyen.post('/api/v1/citoyen/auth/connexion/', {
            'ins': ins_test,
            'pin': '1234'
        })
        self.assertEqual(resp_citoyen_login.status_code, 200)
        token_citoyen = resp_citoyen_login.data['access']
        client_citoyen.credentials(HTTP_AUTHORIZATION='Bearer ' + token_citoyen)

        resp_plan_citoyen = client_citoyen.get('/api/v1/citoyen/moi/plan-actif/')
        self.assertEqual(resp_plan_citoyen.status_code, 200)
        self.assertTrue(resp_plan_citoyen.data['a_un_plan_valide'])
