"""
Modèles pour la synchronisation FHIR et la traçabilité des échanges avec HAPI FHIR.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class JournalSyncFhir(models.Model):
    """
    Historique des synchronisations avec le serveur HAPI FHIR R4.
    """

    class StatutSync(models.TextChoices):
        SUCCES = 'SUCCES', _('Succès')
        ECHEC = 'ECHEC', _('Échec')
        EN_ATTENTE = 'EN_ATTENTE', _('En attente de nouvelle tentative')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type_ressource = models.CharField(_('type de ressource FHIR'), max_length=50)
    id_local = models.CharField(_('identifiant local de la ressource'), max_length=100)
    fhir_id = models.CharField(_('identifiant FHIR distant'), max_length=100, blank=True)
    statut = models.CharField(_('statut'), max_length=20, choices=StatutSync.choices, default=StatutSync.EN_ATTENTE)
    tentatives = models.IntegerField(_('nombre de tentatives'), default=0)
    dernier_message_erreur = models.TextField(_('dernier message d\'erreur'), blank=True)
    cree_le = models.DateTimeField(_('créé le'), auto_now_add=True)
    modifie_le = models.DateTimeField(_('modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('journal de synchronisation FHIR')
        verbose_name_plural = _('journaux de synchronisation FHIR')
        ordering = ['-cree_le']

    def __str__(self):
        return f"Sync FHIR {self.type_ressource} [{self.id_local}] : {self.get_statut_display()}"
