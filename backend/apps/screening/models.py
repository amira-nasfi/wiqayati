"""
Modèles pour le profil patient (pivot INS) et les réponses au questionnaire de dépistage.
Correspond à FHIR: Patient + QuestionnaireResponse
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator

validateur_ins = RegexValidator(
    regex=r'^[A-Z0-9]{8,15}$',
    message=_("L'INS doit comporter entre 8 et 15 caractères alphanumériques.")
)


class Genre(models.TextChoices):
    MASCULIN = 'M', _('Masculin')
    FEMININ = 'F', _('Féminin')


class ProfilPatient(models.Model):
    """
    Dossier unique du citoyen/patient identifié par son INS (Identifiant National de Santé).
    Clé d'unicité absolue : aucune duplication de dossier n'est permise.
    Correspond à la ressource FHIR: Patient
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ins = models.CharField(
        _('Identifiant National de Santé (INS)'),
        max_length=20,
        unique=True,
        validators=[validateur_ins],
        db_index=True,
        help_text=_("Clé unique nationale d'identification du patient")
    )
    prenom = models.CharField(_('prénom'), max_length=100)
    nom = models.CharField(_('nom'), max_length=100)
    date_naissance = models.DateField(_('date de naissance'))
    genre = models.CharField(_('genre'), max_length=1, choices=Genre.choices)
    telephone = models.CharField(_('numéro de téléphone'), max_length=20, blank=True)
    gouvernorat = models.CharField(_('gouvernorat'), max_length=100)

    # Identifiant FHIR distant
    fhir_resource_id = models.CharField(
        _('identifiant FHIR Patient'),
        max_length=100,
        blank=True,
        null=True,
        help_text=_("ID de la ressource Patient sur le serveur HAPI FHIR")
    )

    cree_le = models.DateTimeField(_('créé le'), auto_now_add=True)
    modifie_le = models.DateTimeField(_('modifié le'), auto_now=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patients_enregistres',
        verbose_name=_('enregistré par')
    )

    class Meta:
        verbose_name = _('profil patient')
        verbose_name_plural = _('profils patients')
        ordering = ['nom', 'prenom']
        indexes = [
            models.Index(fields=['ins']),
            models.Index(fields=['gouvernorat']),
        ]

    def __str__(self):
        return f"{self.prenom} {self.nom} (INS: {self.ins})"


class TypeSoumission(models.TextChoices):
    CAMPAGNE = 'CAMPAGNE', _('Campagne de dépistage')
    SOINS_PRIMAIRES = 'SOINS_PRIMAIRES', _('Centre de soins primaires')
    AUTO_EVALUATION = 'AUTO_EVALUATION', _('Auto-évaluation citoyenne')


class ReponseScreening(models.Model):
    """
    Réponse à un questionnaire de dépistage soumise pour un patient.
    Toutes les soumissions successives d'un même citoyen sont rattachées à son ProfilPatient unique.
    Correspond à la ressource FHIR: QuestionnaireResponse
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        ProfilPatient,
        on_delete=models.CASCADE,
        related_name='reponses_screening',
        verbose_name=_('patient')
    )
    soumis_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='screenings_soumis',
        verbose_name=_('soumis par')
    )
    type_soumission = models.CharField(
        _('type de soumission'),
        max_length=30,
        choices=TypeSoumission.choices,
        default=TypeSoumission.CAMPAGNE
    )
    version_questionnaire = models.CharField(
        _('version du questionnaire'),
        max_length=10,
        default='1.0'
    )
    # Contient les 14 réponses structurées du formulaire
    donnees = models.JSONField(
        _('données du questionnaire'),
        help_text=_("Réponses structurées aux 14 questions de dépistage")
    )
    soumis_le = models.DateTimeField(_('soumis le'), auto_now_add=True, db_index=True)

    # Identifiant FHIR QuestionnaireResponse
    fhir_resource_id = models.CharField(
        _('identifiant FHIR QuestionnaireResponse'),
        max_length=100,
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = _('réponse de dépistage')
        verbose_name_plural = _('réponses de dépistage')
        ordering = ['-soumis_le']
        indexes = [
            models.Index(fields=['patient', '-soumis_le']),
            models.Index(fields=['type_soumission']),
        ]

    def __str__(self):
        return f"Dépistage {self.patient.ins} ({self.soumis_le:%Y-%m-%d %H:%M})"
