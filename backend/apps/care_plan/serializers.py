"""
Sérialiseurs pour la consultation et l'édition des plans de soins par les nutritionnistes.
"""
from rest_framework import serializers
from .models import PlanSoin
from apps.screening.serializers import ProfilPatientSerializer, ReponseScreeningSerializer
from apps.risk_engine.serializers import ResultatEvaluationRisqueSerializer


class PlanSoinDetailSerializer(serializers.ModelSerializer):
    """Dossier complet combiné pour le nutritionniste."""
    patient = ProfilPatientSerializer(read_only=True)
    evaluation_risque = ResultatEvaluationRisqueSerializer(read_only=True)
    reponse_screening = serializers.SerializerMethodField()
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)
    valide_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = PlanSoin
        fields = [
            'id', 'patient', 'evaluation_risque', 'reponse_screening',
            'plan_nutrition', 'plan_activite', 'notes_nutritionniste',
            'statut', 'statut_libelle', 'motif_rejet',
            'genere_le', 'valide_le', 'valide_par', 'valide_par_nom'
        ]
        read_only_fields = ['id', 'patient', 'evaluation_risque', 'genere_le', 'valide_le', 'valide_par']

    def get_reponse_screening(self, obj):
        reponse = obj.evaluation_risque.reponse_screening
        return {
            'id': str(reponse.id),
            'type_soumission': reponse.type_soumission,
            'donnees': reponse.donnees,
            'soumis_le': reponse.soumis_le
        }

    def get_valide_par_nom(self, obj):
        if obj.valide_par:
            return f"{obj.valide_par.prenom} {obj.valide_par.nom}".strip() or obj.valide_par.username
        return None


class ModificationPlanSoinSerializer(serializers.ModelSerializer):
    """Permet au nutritionniste d'ajuster les recommandations et d'ajouter ses notes."""

    class Meta:
        model = PlanSoin
        fields = ['plan_nutrition', 'plan_activite', 'notes_nutritionniste']


class RejetPlanSerializer(serializers.Serializer):
    """Sérialiseur pour la justification obligatoire du rejet."""
    motif = serializers.CharField(required=True, min_length=5)
