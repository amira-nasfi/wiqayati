"""
Modèle pour les plans de soins (nutrition et activité physique).
Correspond à FHIR: CarePlan
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.screening.models import ProfilPatient
from apps.risk_engine.models import ResultatEvaluationRisque


class StatutPlan(models.TextChoices):
    BROUILLON = 'BROUILLON', _('Brouillon (en attente de validation)')
    VALIDE = 'VALIDE', _('Validé')
    REJETE = 'REJETE', _('Rejeté')


class PlanSoin(models.Model):
    """
    Plan de soin personnalisé d'un patient comprenant nutrition et activité physique.
    Généré automatiquement en statut BROUILLON dès la soumission du dépistage,
    puis validé ou ajusté par un nutritionniste avant publication vers le citoyen.
    Correspond à la ressource FHIR: CarePlan
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        ProfilPatient,
        on_delete=models.CASCADE,
        related_name='plans_soin',
        verbose_name=_('patient')
    )
    evaluation_risque = models.ForeignKey(
        ResultatEvaluationRisque,
        on_delete=models.CASCADE,
        related_name='plans_soin',
        verbose_name=_('évaluation de risque associée')
    )
    plan_nutrition = models.JSONField(
        _('recommandations nutritionnelles'),
        default=dict,
        help_text=_("Objectifs et conseils nutritionnels structurés")
    )
    plan_activite = models.JSONField(
        _("programme d'activité physique"),
        default=dict,
        help_text=_("Objectifs d'activité physique adaptés au risque")
    )
    notes_nutritionniste = models.TextField(
        _('notes et observations du nutritionniste'),
        blank=True
    )
    statut = models.CharField(
        _('statut de validation'),
        max_length=20,
        choices=StatutPlan.choices,
        default=StatutPlan.BROUILLON,
        db_index=True
    )
    motif_rejet = models.TextField(
        _('motif de rejet'),
        blank=True,
        help_text=_("Raison spécifiée par le nutritionniste en cas de rejet")
    )

    genere_le = models.DateTimeField(_('généré le'), auto_now_add=True)
    valide_le = models.DateTimeField(_('validé le'), null=True, blank=True)
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plans_valides',
        verbose_name=_('validé par (nutritionniste)')
    )

    # Identifiant FHIR CarePlan
    fhir_resource_id = models.CharField(
        _('identifiant FHIR CarePlan'),
        max_length=100,
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = _('plan de soin')
        verbose_name_plural = _('plans de soins')
        ordering = ['-genere_le']
        indexes = [
            models.Index(fields=['statut', '-genere_le']),
            models.Index(fields=['patient', 'statut']),
        ]

    def __str__(self):
        return f"Plan de soin ({self.get_statut_display()}) - {self.patient.ins}"
