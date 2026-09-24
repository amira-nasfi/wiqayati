"""
Modèles accounts — CompteUtilisateur, Notification.
Correspond à FHIR: Practitioner + PractitionerRole
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import GestionnaireCompteUtilisateur


class Role(models.TextChoices):
    AGENT_CAMPAGNE = 'AGENT_CAMPAGNE', _('Agent de campagne')
    AGENT_SOINS_PRIMAIRES = 'AGENT_SOINS_PRIMAIRES', _('Agent de soins primaires')
    NUTRITIONNISTE = 'NUTRITIONNISTE', _('Nutritionniste')
    ADMIN_MINISTERE = 'ADMIN_MINISTERE', _('Administrateur Ministère')
    ADMIN_IT = 'ADMIN_IT', _('Administrateur IT')
    CITOYEN = 'CITOYEN', _('Citoyen')


class CompteUtilisateur(AbstractBaseUser, PermissionsMixin):
    """
    Modèle utilisateur personnalisé — correspond à FHIR Practitioner (pour les agents/nutritionnistes).
    Les citoyens et admins n'ont pas de ressource FHIR associée.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(_('identifiant'), max_length=150, unique=True)
    email = models.EmailField(_('adresse e-mail'), unique=True)
    prenom = models.CharField(_('prénom'), max_length=100, blank=True)
    nom = models.CharField(_('nom'), max_length=100, blank=True)

    role = models.CharField(
        _('rôle'),
        max_length=30,
        choices=Role.choices,
        default=Role.CITOYEN,
    )

    is_active = models.BooleanField(_('compte actif'), default=True)
    is_staff = models.BooleanField(_('accès administration'), default=False)

    # Expiration automatique pour les comptes de campagne
    expire_le = models.DateTimeField(
        _("date d'expiration"),
        null=True,
        blank=True,
        help_text=_("Laisser vide pour un compte permanent. Obligatoire pour les agents de campagne.")
    )

    # Gouvernorat pour les agents (utilisé dans les stats agrégées)
    gouvernorat = models.CharField(
        _('gouvernorat'),
        max_length=100,
        blank=True,
        help_text=_("Gouvernorat d'affectation (agents uniquement)")
    )

    # Référence FHIR — null pour CITOYEN et ADMIN
    fhir_practitioner_id = models.CharField(
        _('identifiant FHIR Practitioner'),
        max_length=100,
        blank=True,
        null=True,
        help_text=_("Rempli automatiquement lors de la synchronisation FHIR")
    )

    cree_le = models.DateTimeField(_('créé le'), auto_now_add=True)
    modifie_le = models.DateTimeField(_('modifié le'), auto_now=True)
    cree_par = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='comptes_crees',
        verbose_name=_('créé par'),
    )
    derniere_connexion_le = models.DateTimeField(_('dernière connexion'), null=True, blank=True)

    # Mot de passe temporaire (doit être changé à la première connexion)
    mot_de_passe_temporaire = models.BooleanField(
        _('mot de passe temporaire'),
        default=False,
        help_text=_("Si vrai, l'utilisateur doit changer son mot de passe à la prochaine connexion")
    )

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'role']

    objects = GestionnaireCompteUtilisateur()

    class Meta:
        verbose_name = _('compte utilisateur')
        verbose_name_plural = _('comptes utilisateurs')
        ordering = ['nom', 'prenom']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['is_active', 'expire_le']),
        ]

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.get_role_display()})"

    @property
    def est_expire(self):
        """Vérifie si le compte est expiré."""
        if self.expire_le is None:
            return False
        return timezone.now() > self.expire_le

    @property
    def est_agent(self):
        return self.role in (Role.AGENT_CAMPAGNE, Role.AGENT_SOINS_PRIMAIRES)

    @property
    def est_nutritionniste(self):
        return self.role == Role.NUTRITIONNISTE

    @property
    def est_admin_ministere(self):
        return self.role == Role.ADMIN_MINISTERE

    @property
    def est_admin_it(self):
        return self.role == Role.ADMIN_IT

    @property
    def est_citoyen(self):
        return self.role == Role.CITOYEN


class Notification(models.Model):
    """Notifications pour les citoyens (ex: plan validé)."""

    class TypeNotification(models.TextChoices):
        PLAN_VALIDE = 'PLAN_VALIDE', _('Plan validé')
        PLAN_REJETE = 'PLAN_REJETE', _('Plan rejeté')
        RAPPEL_AUTO_EVALUATION = 'RAPPEL_AUTO_EVALUATION', _('Rappel auto-évaluation')
        COMPTE_EXPIRE_BIENTOT = 'COMPTE_EXPIRE_BIENTOT', _('Compte bientôt expiré')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    destinataire = models.ForeignKey(
        CompteUtilisateur,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('destinataire'),
    )
    type_notification = models.CharField(
        _('type'),
        max_length=30,
        choices=TypeNotification.choices,
    )
    message = models.TextField(_('message'))
    lu = models.BooleanField(_('lu'), default=False)
    cree_le = models.DateTimeField(_('créé le'), auto_now_add=True)
    lu_le = models.DateTimeField(_('lu le'), null=True, blank=True)

    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-cree_le']
        indexes = [
            models.Index(fields=['destinataire', 'lu']),
        ]

    def __str__(self):
        return f"Notification {self.get_type_notification_display()} → {self.destinataire}"
