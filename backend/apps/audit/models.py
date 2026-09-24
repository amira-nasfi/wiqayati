"""
Modèles pour l'audit et la traçabilité de toutes les actions sur Wiqayati.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class JournalAudit(models.Model):
    """
    Enregistrement immuable d'une action utilisateur ou système.
    """

    class Action(models.TextChoices):
        CONNEXION = 'CONNEXION', _('Connexion')
        DECONNEXION = 'DECONNEXION', _('Déconnexion')
        ECHEC_CONNEXION = 'ECHEC_CONNEXION', _('Échec de connexion')
        CREATION_PATIENT = 'CREATION_PATIENT', _('Création de profil patient')
        CONSULTATION_PATIENT = 'CONSULTATION_PATIENT', _('Consultation dossier patient')
        SOUMISSION_SCREENING = 'SOUMISSION_SCREENING', _('Soumission de dépistage')
        EVALUATION_RISQUE = 'EVALUATION_RISQUE', _('Évaluation de risque calculée')
        VALIDATION_PLAN = 'VALIDATION_PLAN', _('Validation de plan de soin')
        REJET_PLAN = 'REJET_PLAN', _('Rejet de plan de soin')
        MODIFICATION_PLAN = 'MODIFICATION_PLAN', _('Modification de plan de soin')
        PRISE_EN_CHARGE_TACHE = 'PRISE_EN_CHARGE_TACHE', _('Prise en charge tâche')
        CREATION_COMPTE = 'CREATION_COMPTE', _('Création de compte')
        MODIFICATION_COMPTE = 'MODIFICATION_COMPTE', _('Modification de compte')
        SYNCHRONISATION_FHIR = 'SYNCHRONISATION_FHIR', _('Synchronisation FHIR')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    acteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actions_audit',
        verbose_name=_('acteur')
    )
    action = models.CharField(_('action'), max_length=50, choices=Action.choices)
    type_ressource = models.CharField(_('type de ressource'), max_length=100)
    id_ressource = models.CharField(_('identifiant de la ressource'), max_length=150, blank=True)
    adresse_ip = models.GenericIPAddressField(_('adresse IP'), null=True, blank=True)
    user_agent = models.TextField(_('agent utilisateur'), blank=True)
    horodatage = models.DateTimeField(_('horodatage'), auto_now_add=True, db_index=True)
    details = models.JSONField(_('détails complémentaires'), default=dict, blank=True)

    class Meta:
        verbose_name = _("journal d'audit")
        verbose_name_plural = _("journaux d'audit")
        ordering = ['-horodatage']
        indexes = [
            models.Index(fields=['action', 'horodatage']),
            models.Index(fields=['type_ressource', 'id_ressource']),
            models.Index(fields=['acteur', 'horodatage']),
        ]

    def __str__(self):
        acteur_str = self.acteur.username if self.acteur else "Système/Anonyme"
        return f"[{self.horodatage:%Y-%m-%d %H:%M:%S}] {acteur_str} -> {self.get_action_display()} ({self.type_ressource})"
