"""
URLs pour l'authentification et le profil utilisateur.
"""
from django.urls import path
from .views import ConnexionView, RafraichirView, DeconnexionView, ProfilUtilisateurView

urlpatterns = [
    path('connexion/', ConnexionView.as_view(), name='auth-connexion'),
    path('rafraichir/', RafraichirView.as_view(), name='auth-rafraichir'),
    path('deconnexion/', DeconnexionView.as_view(), name='auth-deconnexion'),
    path('profil/', ProfilUtilisateurView.as_view(), name='auth-profil'),
]
