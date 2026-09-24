"""
Classes de permissions personnalisées (RBAC) pour Wiqayati.
"""
from rest_framework.permissions import BasePermission
from .models import Role


class EstAuthentifieEtActif(BasePermission):
    """Vérifie que l'utilisateur est authentifié, actif et non expiré."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and
            user.is_authenticated and
            user.is_active and
            not user.est_expire
        )


class EstAgentCampagne(EstAuthentifieEtActif):
    """Accès réservé aux agents de campagne sanitaire."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == Role.AGENT_CAMPAGNE


class EstAgentSoinsPrimaires(EstAuthentifieEtActif):
    """Accès réservé aux agents des centres de soins primaires."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == Role.AGENT_SOINS_PRIMAIRES


class EstAgent(EstAuthentifieEtActif):
    """Accès autorisé pour tout agent (campagne ou soins primaires)."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.est_agent


class EstNutritionniste(EstAuthentifieEtActif):
    """Accès réservé aux nutritionnistes."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.est_nutritionniste


class EstAdminMinistere(EstAuthentifieEtActif):
    """
    Accès réservé aux administrateurs du Ministère de la Santé.
    Uniquement pour les statistiques agrégées, jamais pour les dossiers nominatifs.
    """

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.est_admin_ministere


class EstAdminIT(EstAuthentifieEtActif):
    """
    Accès réservé aux administrateurs IT.
    Gestion des comptes et audit technique uniquement, aucun accès aux données médicales.
    """

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.est_admin_it


class EstCitoyen(EstAuthentifieEtActif):
    """Accès réservé aux citoyens (accès exclusif à leur propre dossier)."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.est_citoyen
