"""
Modèle pour l'évaluation du risque calculée par le moteur de risque.
Correspond à FHIR: RiskAssessment
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.screening.models import ProfilPatient, ReponseScreening


class NiveauRisque(models.TextChoices):
    FAIBLE = 'FAIBLE', _('Faible')
    INTERMEDIAIRE = 'INTERMEDIAIRE', _('Intermédiaire')
    ELEVE = 'ELEVE', _('Élevé')


class ResultatEvaluationRisque(models.Model):
    """
    Résultat d'évaluation de risque de diabète de type 2.
    Exactement 3 niveaux possibles : FAIBLE, INTERMEDIAIRE, ELEVE.
    Correspond à la ressource FHIR: RiskAssessment
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reponse_screening = models.OneToOneField(
        ReponseScreening,
        on_delete=models.CASCADE,
        related_name='evaluation_risque',
        verbose_name=_('réponse de dépistage associée')
    )
    patient = models.ForeignKey(
        ProfilPatient,
        on_delete=models.CASCADE,
        related_name='evaluations_risque',
        verbose_name=_('patient')
    )
    niveau_risque = models.CharField(
        _('niveau de risque'),
        max_length=20,
        choices=NiveauRisque.choices,
        db_index=True
    )
    score = models.IntegerField(
        _('score de risque (0-100)'),
        help_text=_("Score normalisé entre 0 et 100")
    )
    # Facteurs contributifs avec libellés et poids
    facteurs = models.JSONField(
        _('facteurs de risque contributifs'),
        default=list,
        help_text=_("Liste ordonnée des facteurs influençant le score")
    )
    version_moteur = models.CharField(
        _('version du moteur de calcul'),
        max_length=50,
        default='stub-1.0'
    )
    evalue_le = models.DateTimeField(_('évalué le'), auto_now_add=True, db_index=True)

    # Identifiant FHIR RiskAssessment
    fhir_resource_id = models.CharField(
        _('identifiant FHIR RiskAssessment'),
        max_length=100,
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = _('évaluation de risque')
        verbose_name_plural = _('évaluations de risque')
        ordering = ['-evalue_le']
        indexes = [
            models.Index(fields=['niveau_risque']),
            models.Index(fields=['patient', '-evalue_le']),
        ]

    def __str__(self):
        return f"Risque {self.get_niveau_risque_display()} ({self.score}/100) - {self.patient.ins}"
