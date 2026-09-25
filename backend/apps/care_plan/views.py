"""
Vues pour la consultation, la modification, la validation et le rejet des plans de soins.
"""
import logging
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.translation import gettext_lazy as _

from .models import PlanSoin, StatutPlan
from .serializers import (
    PlanSoinDetailSerializer,
    ModificationPlanSoinSerializer,
    RejetPlanSerializer
)
from apps.accounts.permissions import EstNutritionniste
from apps.accounts.models import CompteUtilisateur, Notification
from apps.nutritionist_queue.models import StatutTache

logger = logging.getLogger(__name__)


class ConsultationPlanView(APIView):
    """
    GET /api/v1/nutritionniste/plans/{id}/
    Permet au nutritionniste de consulter l'ensemble du dossier (patient, risque, réponses et plan).
    """
    permission_classes = [EstNutritionniste]

    def get(self, request, pk):
        plan = get_object_or_404(
            PlanSoin.objects.select_related('patient', 'evaluation_risque__reponse_screening', 'valide_par'),
            pk=pk
        )
        serializer = PlanSoinDetailSerializer(plan)
        return Response(serializer.data)


class ModificationPlanView(APIView):
    """
    PATCH /api/v1/nutritionniste/plans/{id}/
    Ajuste les recommandations nutritionnelles, le programme d'activité et ajoute des notes.
    """
    permission_classes = [EstNutritionniste]

    def patch(self, request, pk):
        plan = get_object_or_404(PlanSoin, pk=pk)
        if plan.statut == StatutPlan.VALIDE:
            return Response(
                {'erreur': _("Ce plan est déjà validé et ne peut plus être modifié.")},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ModificationPlanSoinSerializer(plan, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(PlanSoinDetailSerializer(plan).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ValidationPlanView(APIView):
    """
    POST /api/v1/nutritionniste/plans/{id}/valider/
    Valide définitivement le plan de soin :
    1. Passe le statut à VALIDE et enregistre le validateur et l'horodatage.
    2. Marque la tâche associée comme COMPLETE.
    3. Crée une notification pour le citoyen (si compte citoyen actif lié à cet INS).
    4. Déclenche la synchronisation asynchrone FHIR (mise à jour CarePlan et Task).
    """
    permission_classes = [EstNutritionniste]

    def post(self, request, pk):
        plan = get_object_or_404(PlanSoin, pk=pk)

        if plan.statut == StatutPlan.VALIDE:
            return Response(
                {'message': _("Ce plan est déjà validé.")},
                status=status.HTTP_200_OK
            )

        # 1. Validation du plan
        plan.statut = StatutPlan.VALIDE
        plan.valide_le = timezone.now()
        plan.valide_par = request.user
        plan.save(update_fields=['statut', 'valide_le', 'valide_par'])

        # 2. Clôture de la tâche
        tache = getattr(plan, 'tache_nutritionniste', None)
        if tache:
            tache.statut = StatutTache.COMPLETE
            tache.complete_le = timezone.now()
            tache.save(update_fields=['statut', 'complete_le'])

        # 3. Notification au citoyen
        try:
            citoyen_compte = CompteUtilisateur.objects.filter(
                username=plan.patient.ins,
                role='CITOYEN'
            ).first()

            if citoyen_compte:
                Notification.objects.create(
                    destinataire=citoyen_compte,
                    type_notification=Notification.TypeNotification.PLAN_VALIDE,
                    message=_(
                        "Votre plan personnalisé de nutrition et d'activité physique a été validé "
                        "par un nutritionniste. Vous pouvez désormais le consulter dans votre espace."
                    )
                )
        except Exception as exc:
            logger.warning("Échec de création de la notification citoyen : %s", exc)

        # 4. Synchronisation FHIR (Celery)
        try:
            from apps.fhir_bridge.tasks import synchroniser_validation_plan_fhir
            synchroniser_validation_plan_fhir.delay(str(plan.id))
        except Exception as exc:
            logger.warning("Notification Celery FHIR différée : %s", exc)

        return Response({
            'message': _("Plan de soin validé avec succès. Il est désormais accessible au citoyen."),
            'plan_id': str(plan.id),
            'statut': plan.statut,
            'valide_le': plan.valide_le.isoformat()
        })


class RejetPlanView(APIView):
    """
    POST /api/v1/nutritionniste/plans/{id}/rejeter/
    Rejette le plan avec un motif explicatif.
    """
    permission_classes = [EstNutritionniste]

    def post(self, request, pk):
        plan = get_object_or_404(PlanSoin, pk=pk)
        serializer = RejetPlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        plan.statut = StatutPlan.REJETE
        plan.motif_rejet = serializer.validated_data['motif']
        plan.save(update_fields=['statut', 'motif_rejet'])

        tache = getattr(plan, 'tache_nutritionniste', None)
        if tache:
            tache.statut = StatutTache.REJETE
            tache.save(update_fields=['statut'])

        return Response({
            'message': _("Le plan a été rejeté."),
            'plan_id': str(plan.id),
            'motif': plan.motif_rejet
        })
