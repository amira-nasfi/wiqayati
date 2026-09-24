"""
Sérialiseurs pour les patients et les dépistages (screening).
"""
import re
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import ProfilPatient, ReponseScreening
from apps.risk_engine.models import ResultatEvaluationRisque


class ProfilPatientSerializer(serializers.ModelSerializer):
    """Sérialiseur complet pour la fiche patient indexée par INS."""

    class Meta:
        model = ProfilPatient
        fields = [
            'id', 'ins', 'prenom', 'nom', 'date_naissance',
            'genre', 'telephone', 'gouvernorat',
            'fhir_resource_id', 'cree_le', 'modifie_le'
        ]
        read_only_fields = ['id', 'fhir_resource_id', 'cree_le', 'modifie_le']

    def validate_ins(self, value):
        ins_clean = value.strip().upper()
        if not re.match(r'^[A-Z0-9]{8,15}$', ins_clean):
            raise serializers.ValidationError(
                _("L'INS doit comporter entre 8 et 15 caractères alphanumériques.")
            )
        return ins_clean


class ResultatEvaluationRisqueSerializer(serializers.ModelSerializer):
    """Sérialiseur du résultat d'évaluation calculé."""
    niveau_risque_libelle = serializers.CharField(source='get_niveau_risque_display', read_only=True)

    class Meta:
        model = ResultatEvaluationRisque
        fields = [
            'id', 'niveau_risque', 'niveau_risque_libelle',
            'score', 'facteurs', 'version_moteur', 'evalue_le'
        ]


class ReponseScreeningSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la consultation d'une soumission de dépistage."""
    evaluation_risque = ResultatEvaluationRisqueSerializer(read_only=True)
    soumis_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = ReponseScreening
        fields = [
            'id', 'patient', 'soumis_par', 'soumis_par_nom',
            'type_soumission', 'version_questionnaire',
            'donnees', 'soumis_le', 'evaluation_risque'
        ]
        read_only_fields = ['id', 'soumis_le', 'evaluation_risque']

    def get_soumis_par_nom(self, obj):
        if obj.soumis_par:
            return f"{obj.soumis_par.prenom} {obj.soumis_par.nom}".strip() or obj.soumis_par.username
        return "Auto-évaluation"


class SoumissionScreeningSerializer(serializers.Serializer):
    """
    Sérialiseur de réception de la soumission de dépistage (agent ou auto-évaluation).
    Garantit l'atomicité et l'unicité par INS.
    """
    ins_patient = serializers.CharField(max_length=20)
    version_questionnaire = serializers.CharField(default='1.0', max_length=10)
    donnees = serializers.DictField()

    # Données du patient nécessaires si le patient n'existe pas encore en base
    patient_info = serializers.DictField(required=False)

    def validate_ins_patient(self, value):
        ins_clean = value.strip().upper()
        if not re.match(r'^[A-Z0-9]{8,15}$', ins_clean):
            raise serializers.ValidationError(_("Format d'INS invalide."))
        return ins_clean

    def validate_donnees(self, value):
        # Vérification minimale de la présence des champs essentiels
        champs_requis = [
            'age', 'genre', 'imc', 'tour_taille_cm',
            'antecedents_familiaux_diabete', 'hypertension_diagnostiquee',
            'niveau_activite_physique', 'qualite_alimentation', 'statut_tabagisme'
        ]
        manquants = [c for c in champs_requis if c not in value]
        if manquants:
            raise serializers.ValidationError(
                _("Champs manquants dans le formulaire : ") + ", ".join(manquants)
            )
        return value
