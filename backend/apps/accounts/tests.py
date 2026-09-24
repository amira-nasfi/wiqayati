"""
Tests automatisés RBAC, sécurité et expiration des comptes (Phase 14).
"""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from apps.accounts.models import CompteUtilisateur, Role
from apps.screening.models import ProfilPatient


class TestRBACEtSecurite(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Compte Agent
        self.agent = CompteUtilisateur.objects.create_user(
            username='agent_test',
            email='agent@test.tn',
            password='Password123!',
            role=Role.AGENT_CAMPAGNE,
            gouvernorat='Tunis'
        )

        # Compte Agent Expiré
        self.agent_expire = CompteUtilisateur.objects.create_user(
            username='agent_exp',
            email='agent_exp@test.tn',
            password='Password123!',
            role=Role.AGENT_CAMPAGNE,
            expire_le=timezone.now() - timedelta(days=1)
        )

        # Compte Admin Ministère
        self.admin_min = CompteUtilisateur.objects.create_user(
            username='admin_min',
            email='min@test.tn',
            password='Password123!',
            role=Role.ADMIN_MINISTERE
        )

        # Compte Nutritionniste
        self.nutritionniste = CompteUtilisateur.objects.create_user(
            username='nutri_test',
            email='nutri@test.tn',
            password='Password123!',
            role=Role.NUTRITIONNISTE
        )

        # Patient témoin
        self.patient = ProfilPatient.objects.create(
            ins='TUN99990001',
            prenom='Slim',
            nom='Riahi',
            date_naissance='1980-01-01',
            genre='M',
            gouvernorat='Tunis'
        )

    def test_connexion_et_rejet_compte_expire(self):
        """Un compte temporaire expiré doit être rejeté à la connexion."""
        resp = self.client.post('/api/v1/auth/connexion/', {
            'username': 'agent_exp',
            'password': 'Password123!'
        })
        self.assertEqual(resp.status_code, 400)

    def test_interdiction_admin_ministere_sur_dossiers_nominatifs(self):
        """L'Admin Ministère ne peut PAS accéder aux fiches individuelles de patients."""
        resp_auth = self.client.post('/api/v1/auth/connexion/', {
            'username': 'admin_min',
            'password': 'Password123!'
        })
        token = resp_auth.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Tentative d'accès à la recherche nominative par INS -> 403 Forbidden
        resp = self.client.get('/api/v1/patients/recherche/?ins=TUN99990001')
        self.assertEqual(resp.status_code, 403)

        # Accès aux statistiques agrégées -> 200 OK
        resp_stats = self.client.get('/api/v1/admin/ministere/stats/apercu/')
        self.assertEqual(resp_stats.status_code, 200)

    def test_interdiction_agent_sur_file_nutritionniste(self):
        """Un agent de screening ne peut pas valider ou modifier un plan de soin."""
        resp_auth = self.client.post('/api/v1/auth/connexion/', {
            'username': 'agent_test',
            'password': 'Password123!'
        })
        token = resp_auth.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        resp = self.client.get('/api/v1/nutritionniste/file/')
        self.assertEqual(resp.status_code, 403)
