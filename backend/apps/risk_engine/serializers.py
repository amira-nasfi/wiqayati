"""
Sérialiseurs pour les résultats d'évaluation de risque du moteur Wiqayati.
"""
from rest_framework import serializers
from .models import ResultatEvaluationRisque


class ResultatEvaluationRisqueSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la consultation du score, du niveau et des facteurs de risque."""
    niveau_risque_libelle = serializers.CharField(source='get_niveau_risque_display', read_only=True)

    class Meta:
        model = ResultatEvaluationRisque
        fields = [
            'id', 'niveau_risque', 'niveau_risque_libelle',
            'score', 'facteurs', 'version_moteur', 'evalue_le'
        ]
        read_only_fields = ['id', 'niveau_risque', 'score', 'facteurs', 'version_moteur', 'evalue_le']
