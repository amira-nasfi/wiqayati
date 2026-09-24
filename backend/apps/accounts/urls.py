"""
Routage des URLs pour l'authentification et les comptes.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConnexionView,
    RafraichirView,
    DeconnexionView,
    ProfilUtilisateurView,
    GestionComptesAdminViewSet,
    NotificationCitoyenViewSet,
)

router_admin = DefaultRouter()
router_admin.register(r'utilisateurs', GestionComptesAdminViewSet, basename='admin-utilisateurs')

router_citoyen = DefaultRouter()
router_citoyen.register(r'notifications', NotificationCitoyenViewSet, basename='citoyen-notifications')

urlpatterns = [
    # Authentification
    path('auth/connexion/', ConnexionView.as_view(), name='connexion'),
    path('auth/rafraichir/', RafraichirView.as_view(), name='rafraichir'),
    path('auth/deconnexion/', DeconnexionView.as_view(), name='deconnexion'),
    path('auth/profil/', ProfilUtilisateurView.as_view(), name='profil'),

    # Admin IT
    path('admin/it/', include(router_admin.urls)),

    # Citoyen
    path('citoyen/', include(router_citoyen.urls)),
]
