"""
Sérialiseurs pour la file de priorité du nutritionniste.
"""
from rest_framework import serializers
from .models import TacheNutritionniste


class TacheNutritionnisteListeSerializer(serializers.ModelSerializer):
    """Vue simplifiée pour l'affichage du tableau de bord de la file d'attente."""
    patient = serializers.SerializerMethodField()
    niveau_risque = serializers.SerializerMethodField()
    score_risque = serializers.SerializerMethodField()
    plan_id = serializers.UUIDField(source='plan_soin.id', read_only=True)
    priorite_libelle = serializers.CharField(source='get_priorite_display', read_only=True)
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)
    assigne_a_nom = serializers.SerializerMethodField()

    class Meta:
        model = TacheNutritionniste
        fields = [
            'id', 'plan_id', 'patient', 'niveau_risque', 'score_risque',
            'priorite', 'priorite_libelle', 'statut', 'statut_libelle',
            'assigne_a', 'assigne_a_nom', 'cree_le', 'pris_en_charge_le', 'complete_le'
        ]

    def get_patient(self, obj):
        p = obj.plan_soin.patient
        return {
            'id': str(p.id),
            'ins': p.ins,
            'prenom': p.prenom,
            'nom': p.nom,
            'date_naissance': p.date_naissance,
            'genre': p.genre,
            'gouvernorat': p.gouvernorat
        }

    def get_niveau_risque(self, obj):
        return obj.plan_soin.evaluation_risque.niveau_risque

    def get_score_risque(self, obj):
        return obj.plan_soin.evaluation_risque.score

    def get_assigne_a_nom(self, obj):
        if obj.assigne_a:
            return f"{obj.assigne_a.prenom} {obj.assigne_a.nom}".strip() or obj.assigne_a.username
        return None
