"""
Modèle pour la file de priorité de travail des nutritionnistes.
Correspond à FHIR: Task
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.care_plan.models import PlanSoin


class PrioriteTache(models.TextChoices):
    STAT = 'STAT', _('Priorité maximale (Risque Élevé)')
    URGENT = 'URGENT', _('Urgent (Risque Intermédiaire)')
    ROUTINE = 'ROUTINE', _('Routine (Risque Faible)')


class StatutTache(models.TextChoices):
    DEMANDE = 'DEMANDE', _('En attente de prise en charge')
    EN_COURS = 'EN_COURS', _('En cours de traitement')
    COMPLETE = 'COMPLETE', _('Validé / Terminé')
    REJETE = 'REJETE', _('Rejeté')


class TacheNutritionniste(models.Model):
    """
    Tâche assignée aux nutritionnistes dans leur file de priorité.
    Triée en tête par priorité (STAT > URGENT > ROUTINE) puis par date de création.
    Correspond à la ressource FHIR: Task
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan_soin = models.OneToOneField(
        PlanSoin,
        on_delete=models.CASCADE,
        related_name='tache_nutritionniste',
        verbose_name=_('plan de soin associé')
    )
    assigne_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='taches_assignees',
        verbose_name=_('assigné à')
    )
    priorite = models.CharField(
        _('priorité'),
        max_length=20,
        choices=PrioriteTache.choices,
        default=PrioriteTache.ROUTINE,
        db_index=True
    )
    statut = models.CharField(
        _('statut de la tâche'),
        max_length=20,
        choices=StatutTache.choices,
        default=StatutTache.DEMANDE,
        db_index=True
    )
    cree_le = models.DateTimeField(_('créé le'), auto_now_add=True, db_index=True)
    pris_en_charge_le = models.DateTimeField(_('pris en charge le'), null=True, blank=True)
    complete_le = models.DateTimeField(_('terminé le'), null=True, blank=True)

    # Identifiant FHIR Task
    fhir_resource_id = models.CharField(
        _('identifiant FHIR Task'),
        max_length=100,
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = _('tâche nutritionniste')
        verbose_name_plural = _('tâches nutritionnistes')
        ordering = ['priorite', 'cree_le']
        indexes = [
            models.Index(fields=['statut', 'priorite', 'cree_le']),
            models.Index(fields=['assigne_a', 'statut']),
        ]

    def __str__(self):
        return f"Tâche [{self.get_priorite_display()}] - {self.plan_soin.patient.ins} ({self.get_statut_display()})"
