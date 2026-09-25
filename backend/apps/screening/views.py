"""
Vues pour la gestion des patients, la consultation du questionnaire et la soumission de dépistages.
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.translation import gettext_lazy as _

from .models import ProfilPatient, ReponseScreening, TypeSoumission
from .serializers import (
    ProfilPatientSerializer,
    ReponseScreeningSerializer,
    SoumissionScreeningSerializer
)
from .questionnaire_definitions import DEFINITION_QUESTIONNAIRE_V1

from apps.accounts.permissions import EstAgent
from apps.risk_engine.models import ResultatEvaluationRisque, NiveauRisque
from apps.risk_engine.services import ClientMoteurRisque
from apps.care_plan.models import PlanSoin, StatutPlan
from apps.care_plan.services import GenerateurPlanSoin
from apps.nutritionist_queue.models import TacheNutritionniste, PrioriteTache, StatutTache

logger = logging.getLogger(__name__)


class RecherchePatientView(APIView):
    """
    GET /api/v1/patients/recherche/?ins={ins}
    Permet à un agent de rechercher un patient existant par son INS.
    Retourne le profil et l'historique complet des évaluations.
    """
    permission_classes = [EstAgent]

    def get(self, request):
        ins = request.query_params.get('ins', '').strip().upper()
        if not ins:
            return Response(
                {'erreur': _("Le paramètre INS est obligatoire.")},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            patient = ProfilPatient.objects.get(ins=ins)
            patient_serializer = ProfilPatientSerializer(patient)
            historique = ReponseScreening.objects.filter(patient=patient).select_related('evaluation_risque')
            historique_serializer = ReponseScreeningSerializer(historique, many=True)

            return Response({
                'trouve': True,
                'patient': patient_serializer.data,
                'historique_screenings': historique_serializer.data
            })
        except ProfilPatient.DoesNotExist:
            return Response(
                {
                    'trouve': False,
                    'message': _("Aucun dossier existant pour cet INS. Veuillez créer la fiche patient.")
                },
                status=status.HTTP_404_NOT_FOUND
            )


class CreationPatientView(APIView):
    """
    POST /api/v1/patients/
    Crée un nouveau profil patient identifié par son INS uniquement s'il n'existe pas déjà.
    """
    permission_classes = [EstAgent]

    def post(self, request):
        serializer = ProfilPatientSerializer(data=request.data)
        if serializer.is_valid():
            ins = serializer.validated_data['ins']
            if ProfilPatient.objects.filter(ins=ins).exists():
                return Response(
                    {'erreur': _("Un patient avec cet INS existe déjà dans le système central.")},
                    status=status.HTTP_409_CONFLICT
                )
            patient = serializer.save(cree_par=request.user)
            return Response(ProfilPatientSerializer(patient).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuestionnaireDefinitionView(APIView):
    """
    GET /api/v1/screening/questionnaire/
    Retourne la structure officielle et les libellés en français des 14 champs du formulaire.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(DEFINITION_QUESTIONNAIRE_V1)


class SoumissionScreeningView(APIView):
    """
    POST /api/v1/screening/soumissions/
    Flux principal de dépistage (atomique) :
    1. Récupère ou crée le profil patient par INS (aucune duplication).
    2. Enregistre la réponse de dépistage.
    3. Évalue immédiatement le niveau de risque (FAIBLE, INTERMEDIAIRE, ELEVE).
    4. Génère le plan de soins personnalisé en statut BROUILLON.
    5. Crée une tâche ordonnancée dans la file du nutritionniste avec la priorité appropriée.
    6. Déclenche la synchronisation asynchrone FHIR.
    """
    permission_classes = [EstAgent]

    @transaction.atomic
    def post(self, request):
        serializer = SoumissionScreeningSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ins_patient = serializer.validated_data['ins_patient']
        version_questionnaire = serializer.validated_data['version_questionnaire']
        donnees = serializer.validated_data['donnees']
        patient_info = serializer.validated_data.get('patient_info', {})

        # 1. Vérification ou création du ProfilPatient
        patient = ProfilPatient.objects.filter(ins=ins_patient).first()
        if not patient:
            if not patient_info:
                return Response(
                    {'erreur': _("Ce patient n'existe pas encore. Veuillez fournir les données 'patient_info'.")},
                    status=status.HTTP_400_BAD_REQUEST
                )
            patient_serializer = ProfilPatientSerializer(data={**patient_info, 'ins': ins_patient})
            patient_serializer.is_valid(raise_exception=True)
            patient = patient_serializer.save(cree_par=request.user)

        # 2. Enregistrement de la réponse
        type_soumission = (
            TypeSoumission.CAMPAGNE
            if request.user.role == 'AGENT_CAMPAGNE'
            else TypeSoumission.SOINS_PRIMAIRES
        )

        reponse = ReponseScreening.objects.create(
            patient=patient,
            soumis_par=request.user,
            type_soumission=type_soumission,
            version_questionnaire=version_questionnaire,
            donnees=donnees
        )

        # 3. Calcul du risque via le moteur
        contexte = {
            "type_soumission": "AGENT",
            "role_soumetteur": request.user.role,
            "horodatage_soumission": timezone.now().isoformat()
        }
        res_moteur = ClientMoteurRisque.evaluer(
            ins_patient=ins_patient,
            donnees_questionnaire=donnees,
            contexte=contexte
        )

        evaluation = ResultatEvaluationRisque.objects.create(
            reponse_screening=reponse,
            patient=patient,
            niveau_risque=res_moteur["niveau_risque"],
            score=int(res_moteur["score"]),
            facteurs=res_moteur.get("facteurs", []),
            version_moteur=res_moteur.get("version_moteur", "stub-1.0")
        )

        # 4. Génération du plan de soin (statut BROUILLON)
        nutrition, activite = GenerateurPlanSoin.generer_plans(
            niveau_risqu=evaluation.niveau_risque,
            facteurs=evaluation.facteurs
        )

        plan = PlanSoin.objects.create(
            patient=patient,
            evaluation_risque=evaluation,
            plan_nutrition=nutrition,
            plan_activite=activite,
            statut=StatutPlan.BROUILLON
        )

        # 5. Création de la tâche nutritionniste ordonnancée
        priorite_map = {
            NiveauRisque.ELEVE: PrioriteTache.STAT,
            NiveauRisque.INTERMEDIAIRE: PrioriteTache.URGENT,
            NiveauRisque.FAIBLE: PrioriteTache.ROUTINE,
        }
        priorite = priorite_map.get(evaluation.niveau_risque, PrioriteTache.ROUTINE)

        tache = TacheNutritionniste.objects.create(
            plan_soin=plan,
            priorite=priorite,
            statut=StatutTache.DEMANDE
        )

        # 6. Déclenchement de la synchronisation asynchrone FHIR (si Celery dispo)
        try:
            from apps.fhir_bridge.tasks import synchroniser_dossier_complet_fhir
            synchroniser_dossier_complet_fhir.delay(
                str(patient.id), str(reponse.id), str(evaluation.id), str(plan.id), str(tache.id)
            )
        except Exception as exc:
            logger.warning("Notification Celery FHIR différée : %s", exc)

        # Réponse immédiate complète
        return Response({
            'id_soumission': str(reponse.id),
            'patient': {
                'id': str(patient.id),
                'ins': patient.ins,
                'nom_complet': f"{patient.prenom} {patient.nom}",
                'gouvernorat': patient.gouvernorat
            },
            'evaluation_risque': {
                'id': str(evaluation.id),
                'niveau_risque': evaluation.niveau_risque,
                'niveau_risque_libelle': evaluation.get_niveau_risque_display(),
                'score': evaluation.score,
                'facteurs': evaluation.facteurs,
                'version_moteur': evaluation.version_moteur
            },
            'plan_soin_id': str(plan.id),
            'statut_plan': plan.statut,
            'priorite_tache': tache.priorite,
            'message_succes': _(
                "Dépistage enregistré avec succès. Le plan a été transmis à la file des nutritionnistes."
            )
        }, status=status.HTTP_201_CREATED)
