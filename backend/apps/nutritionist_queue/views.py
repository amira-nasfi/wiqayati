"""
Vues pour la file de priorité de travail des nutritionnistes.
"""
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.translation import gettext_lazy as _

from .models import TacheNutritionniste, StatutTache
from .serializers import TacheNutritionnisteListeSerializer
from apps.accounts.permissions import EstNutritionniste
from apps.screening.models import ProfilPatient, ReponseScreening
from apps.screening.serializers import ReponseScreeningSerializer, ProfilPatientSerializer


class FilePrioriteNutritionnisteView(generics.ListAPIView):
    """
    GET /api/v1/nutritionniste/file/
    Affiche la file d'attente triée par niveau de priorité :
    1. STAT (Risque Élevé)
    2. URGENT (Risque Intermédiaire)
    3. ROUTINE (Risque Faible)
    Puis par date de création.
    """
    serializer_class = TacheNutritionnisteListeSerializer
    permission_classes = [EstNutritionniste]

    def get_queryset(self):
        queryset = TacheNutritionniste.objects.select_related(
            'plan_soin__patient',
            'plan_soin__evaluation_risque',
            'assigne_a'
        ).all()

        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        else:
            # Par défaut, afficher les tâches non terminées
            queryset = queryset.filter(statut__in=[StatutTache.DEMANDE, StatutTache.EN_COURS])

        return queryset.order_by('priorite', 'cree_le')


class PrendreEnChargeTacheView(APIView):
    """
    POST /api/v1/nutritionniste/file/{id}/prendre-en-charge/
    Le nutritionniste s'assigne la tâche et la passe à l'état EN_COURS.
    """
    permission_classes = [EstNutritionniste]

    def post(self, request, pk):
        tache = get_object_or_404(TacheNutritionniste, pk=pk)

        tache.assigne_a = request.user
        tache.statut = StatutTache.EN_COURS
        tache.pris_en_charge_le = timezone.now()
        tache.save(update_fields=['assigne_a', 'statut', 'pris_en_charge_le'])

        return Response({
            'message': _("La tâche a été prise en charge."),
            'tache_id': str(tache.id),
            'statut': tache.statut,
            'plan_soin_id': str(tache.plan_soin.id)
        })


class HistoriquePatientNutritionnisteView(APIView):
    """
    GET /api/v1/nutritionniste/patients/{ins}/historique/
    Permet au nutritionniste de consulter l'historique complet des évaluations et plans d'un patient.
    """
    permission_classes = [EstNutritionniste]

    def get(self, request, ins):
        ins_clean = ins.strip().upper()
        patient = get_object_or_404(ProfilPatient, ins=ins_clean)

        reponses = ReponseScreening.objects.filter(patient=patient).select_related('evaluation_risque')

        return Response({
            'patient': ProfilPatientSerializer(patient).data,
            'historique': ReponseScreeningSerializer(reponses, many=True).data
        })
