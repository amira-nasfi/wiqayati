"""
URLs pour l'application mobile citoyenne (Expo).
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_citoyen import (
    ConnexionCitoyenView,
    CitoyenMoiView,
    CitoyenHistoriqueRisquesView,
    CitoyenPlanActifView,
    CitoyenAutoEvaluationView,
)
from apps.accounts.views import NotificationCitoyenViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationCitoyenViewSet, basename='citoyen-notifications')

urlpatterns = [
    path('auth/connexion/', ConnexionCitoyenView.as_view(), name='citoyen-connexion'),
    path('moi/', CitoyenMoiView.as_view(), name='citoyen-moi'),
    path('moi/historique-risques/', CitoyenHistoriqueRisquesView.as_view(), name='citoyen-historique-risques'),
    path('moi/plan-actif/', CitoyenPlanActifView.as_view(), name='citoyen-plan-actif'),
    path('auto-evaluation/', CitoyenAutoEvaluationView.as_view(), name='citoyen-auto-evaluation'),
    path('questionnaire/', CitoyenAutoEvaluationView.as_view(), name='citoyen-questionnaire'),
    path('', include(router.urls)),
]
