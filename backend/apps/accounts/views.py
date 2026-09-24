"""
Vues pour l'authentification et la gestion des comptes utilisateurs.
"""
from rest_framework import status, generics, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

from .models import CompteUtilisateur, Notification
from .serializers import (
    ConnexionSerializer,
    ProfilUtilisateurSerializer,
    CompteUtilisateurAdminSerializer,
    CreationCompteSerializer,
    NotificationSerializer,
)
from .permissions import EstAdminIT, EstCitoyen


class ConnexionView(TokenObtainPairView):
    """
    POST /api/v1/auth/connexion/
    Point d'entrée unique de connexion pour tous les rôles.
    Retourne les jetons JWT (access, refresh) et les informations du profil utilisateur.
    """
    serializer_class = ConnexionSerializer
    permission_classes = [AllowAny]


class RafraichirView(TokenRefreshView):
    """
    POST /api/v1/auth/rafraichir/
    Renouvelle le jeton d'accès à partir d'un jeton de rafraîchissement valide.
    """
    permission_classes = [AllowAny]


class DeconnexionView(APIView):
    """
    POST /api/v1/auth/deconnexion/
    Révoque le jeton de rafraîchissement (mise en liste noire).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'erreur': _("Le jeton de rafraîchissement (refresh) est obligatoire.")},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': _("Déconnexion réussie.")}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {'erreur': _("Jeton invalide ou déjà révoqué.")},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProfilUtilisateurView(generics.RetrieveUpdateAPIView):
    """
    GET / PATCH /api/v1/auth/profil/
    Consultation et modification de son propre profil (nom, prénom, gouvernorat).
    """
    serializer_class = ProfilUtilisateurSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class GestionComptesAdminViewSet(viewsets.ModelViewSet):
    """
    CRUD complet des comptes utilisateurs par l'Administrateur IT.
    GET /api/v1/admin/it/utilisateurs/
    POST /api/v1/admin/it/utilisateurs/
    GET / PATCH / DELETE /api/v1/admin/it/utilisateurs/{id}/
    """
    permission_classes = [EstAdminIT]
    queryset = CompteUtilisateur.objects.all().order_by('-cree_le')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreationCompteSerializer
        return CompteUtilisateurAdminSerializer

    @action(detail=True, methods=['post'], url_path='reinitialiser-mdp')
    def reinitialiser_mot_de_passe(self, request, pk=None):
        """Réinitialise le mot de passe avec une valeur temporaire."""
        utilisateur = self.get_object()
        nouveau_mdp = "Wiqayati" + timezone.now().strftime("%Y%m") + "!"
        utilisateur.set_password(nouveau_mdp)
        utilisateur.mot_de_passe_temporaire = True
        utilisateur.save(update_fields=['password', 'mot_de_passe_temporaire'])
        return Response({
            'message': _("Le mot de passe a été réinitialisé avec succès."),
            'mot_de_passe_temporaire': nouveau_mdp
        })


class NotificationCitoyenViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation des notifications par le citoyen connecté.
    GET /api/v1/citoyen/notifications/
    """
    serializer_class = NotificationSerializer
    permission_classes = [EstCitoyen]

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user).order_by('-cree_le')

    @action(detail=True, methods=['patch'], url_path='marquer-comme-lu')
    def marquer_lu(self, request, pk=None):
        notification = self.get_object()
        notification.lu = True
        notification.lu_le = timezone.now()
        notification.save(update_fields=['lu', 'lu_le'])
        return Response({'message': _("Notification marquée comme lue.")})
