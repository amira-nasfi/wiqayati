"""
Signaux pour l'application accounts (audit de connexion, initialisation).
"""
import logging
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.dispatch import receiver
from apps.audit.models import JournalAudit

logger = logging.getLogger(__name__)


@receiver(user_logged_in)
def auditer_connexion_reussie(sender, request, user, **kwargs):
    """Enregistre l'événement de connexion réussie."""
    try:
        ip = getattr(request, 'ip_client', None) if request else None
        ua = getattr(request, 'user_agent', '') if request else ''
        JournalAudit.objects.create(
            acteur=user,
            action=JournalAudit.Action.CONNEXION,
            type_ressource='CompteUtilisateur',
            id_ressource=str(user.id),
            adresse_ip=ip,
            user_agent=ua[:500],
            details={'role': user.role, 'username': user.username}
        )
    except Exception as exc:
        logger.warning("Échec d'audit de connexion : %s", exc)


@receiver(user_login_failed)
def auditer_echec_connexion(sender, credentials, request, **kwargs):
    """Enregistre les tentatives de connexion infructueuses."""
    try:
        ip = getattr(request, 'ip_client', None) if request else None
        ua = getattr(request, 'user_agent', '') if request else ''
        JournalAudit.objects.create(
            action=JournalAudit.Action.ECHEC_CONNEXION,
            type_ressource='CompteUtilisateur',
            id_ressource=credentials.get('username', ''),
            adresse_ip=ip,
            user_agent=ua[:500],
            details={'identifiant_tente': credentials.get('username', '')}
        )
    except Exception as exc:
        logger.warning("Échec d'audit d'échec de connexion : %s", exc)
