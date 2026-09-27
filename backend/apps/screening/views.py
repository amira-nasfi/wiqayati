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
from apps.risk_engine.services import ClientMoteurRisque, ServiceProtocoleML
from apps.care_plan.models import PlanSoin, StatutPlan
from apps.care_plan.agent_hybride import AgentHybridePlanSoin
from apps.fhir_bridge.client import ClientHapiFhir
from apps.nutritionist_queue.models import TacheNutritionniste, PrioriteTache, StatutTache

logger = logging.getLogger(__name__)


def _generer_ins_unique():
    """Génère un INS unique tunisien au format TUN{ANNEE}{7_CHIFFRES}."""
    import random
    annee = timezone.now().year % 100
    while True:
        chiffres = random.randint(1000000, 9999999)
        ins = f"TUN{annee}{chiffres}"
        if not ProfilPatient.objects.filter(ins=ins).exists():
            return ins


class RecherchePatientView(APIView):
    """
    GET /api/v1/patients/recherche/?cin={cin}&date_naissance={date_naissance} (ou ?ins={ins})
    Recherche un patient existant prioritairement par son CIN et sa date de naissance, ou par son INS.
    Retourne le profil complet (avec l'INS mis en avant) et l'historique des dépistages.
    """
    permission_classes = [EstAgent]

    def get(self, request):
        cin = request.query_params.get('cin', '').strip()
        date_naissance = request.query_params.get('date_naissance', '').strip()
        ins = request.query_params.get('ins', '').strip().upper()

        patient = None
        if cin:
            qs = ProfilPatient.objects.filter(cin=cin)
            if date_naissance:
                qs = qs.filter(date_naissance=date_naissance)
            patient = qs.first()
        elif ins:
            patient = ProfilPatient.objects.filter(ins=ins).first()
        else:
            return Response(
                {'erreur': _("Veuillez renseigner le CIN et la date de naissance (ou l'INS).")},
                status=status.HTTP_400_BAD_REQUEST
            )

        if patient:
            patient_serializer = ProfilPatientSerializer(patient)
            historique = ReponseScreening.objects.filter(patient=patient).select_related('evaluation_risque')
            historique_serializer = ReponseScreeningSerializer(historique, many=True)

            return Response({
                'trouve': True,
                'patient': patient_serializer.data,
                'historique_screenings': historique_serializer.data
            })

        return Response(
            {
                'trouve': False,
                'message': _(
                    "Aucun dossier existant avec ces identifiants. "
                    "Vous pouvez créer la fiche patient ci-dessous."
                )
            },
            status=status.HTTP_404_NOT_FOUND
        )


class CreationPatientView(APIView):
    """
    POST /api/v1/patients/
    Crée un nouveau profil patient avec CIN et génération automatique d'un INS unique si non fourni.
    """
    permission_classes = [EstAgent]

    def post(self, request):
        data = request.data.copy()
        if not data.get('ins'):
            data['ins'] = _generer_ins_unique()

        cin = data.get('cin', '').strip() if data.get('cin') else None
        if cin and ProfilPatient.objects.filter(cin=cin).exists():
            return Response(
                {'erreur': _("Un dossier patient avec ce numéro CIN existe déjà dans le système central.")},
                status=status.HTTP_409_CONFLICT
            )

        serializer = ProfilPatientSerializer(data=data)
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

        # 4. Lecture DMI FHIR (optionnelle, silencieuse si indisponible)
        dmi = ClientHapiFhir.lire_dossier_patient(ins_patient)

        # 5. Agent Hybride LLM (génération du plan personnalisé)
        agent = AgentHybridePlanSoin(
            assessment=res_moteur,
            form=donnees,
            dmi=dmi,
        )
        rapport_agent = agent.generer_plan()

        nutrition = rapport_agent.get("plan_nutrition", {})
        activite = rapport_agent.get("plan_activite", {})
        rapport_nutritionniste = rapport_agent.get("rapport_nutritionniste", {})

        # Protocole ML déterministe pour flags urgents et garde-fous
        protocole_ml = None
        payload_protocole = {
            "request_id": str(evaluation.id),
            "ins_patient": ins_patient,
            "version_questionnaire": version_questionnaire,
            "donnees_questionnaire": donnees,
            "contexte": contexte,
            "dmi": dmi,
        }
        try:
            protocole_ml = ServiceProtocoleML.generer_protocole(payload_protocole)
            if protocole_ml:
                logger.info(
                    "Protocole ML généré OK | ins=%s | urgent=%s | referral=%s",
                    ins_patient,
                    protocole_ml.get("urgent_flags", []),
                    protocole_ml.get("requires_medical_referral", False)
                )
        except Exception as exc:
            logger.warning("Protocole ML non disponible: %s", exc)

        urgent_flags = list(
            protocole_ml.get("urgent_flags", []) if protocole_ml
            else rapport_agent.get("metadata", {}).get("urgent_flags", [])
        )
        requires_referral = bool(
            rapport_nutritionniste.get("requires_medical_referral")
            or (protocole_ml and protocole_ml.get("requires_medical_referral"))
        )

        # Sauvegarde du PlanSoin enrichi (statut BROUILLON)
        plan = PlanSoin.objects.create(
            patient=patient,
            evaluation_risque=evaluation,
            plan_nutrition=nutrition,
            plan_activite=activite,
            statut=StatutPlan.BROUILLON,
            rapport_agent=rapport_agent,
            requires_medical_referral=requires_referral,
            urgent_flags=urgent_flags,
        )

        # 6. Création de la tâche nutritionniste ordonnancée
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

        # 7. Déclenchement de la synchronisation asynchrone FHIR (si Celery dispo)
        try:
            from apps.fhir_bridge.tasks import synchroniser_dossier_complet_fhir
            synchroniser_dossier_complet_fhir.delay(
                str(patient.id), str(reponse.id), str(evaluation.id), str(plan.id), str(tache.id)
            )
        except Exception as exc:
            logger.warning("Notification Celery FHIR différée : %s", exc)

        # Réponse immédiate complète
        supplement = res_moteur.get("_supplement", {})
        ml_supplement = None
        if supplement or protocole_ml:
            findrisc = supplement.get("findrisc", {}) if supplement else {}
            diabscore = supplement.get("diabscore", {}) if supplement else {}
            detecteur = supplement.get("detector", {}) if supplement else {}
            referral = supplement.get("referral", {}) if supplement else {}
            p_ml = protocole_ml or {}
            ml_supplement = {
                "findrisc_score": findrisc.get("score") if findrisc else p_ml.get("findrisc_score"),
                "findrisc_band": findrisc.get("band") if findrisc else p_ml.get("findrisc_band"),
                "risque_10_ans_pct": (
                    findrisc.get("ten_year_risk_pct") if findrisc else p_ml.get("findrisc_10y_risk_pct")
                ),
                "diabscore": diabscore.get("score"),
                "prediabete_flag": diabscore.get("prediabetes_flag"),
                "probabilite_dysglycemie": (
                    detecteur.get("probability") if detecteur else p_ml.get("dysglycemia_ml_probability")
                ),
                "dysglycemie_detectee": (
                    detecteur.get("flagged") if detecteur else p_ml.get("dysglycemia_flag", False)
                ),
                "statut_clinique": supplement.get("status") if supplement else None,
                "orientation_medicale": referral or p_ml.get("medical_referral"),
                "urgent_flags": urgent_flags,
                "requires_medical_referral": requires_referral,
                "agent_metadata": rapport_agent.get("metadata", {}),
                "dmi_integre": rapport_agent.get("metadata", {}).get("dmi_utilise", False),
            }

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
                'version_moteur': evaluation.version_moteur,
                'ml_supplement': ml_supplement,
            },
            'ml_supplement': ml_supplement,
            'plan_soin': {
                'id': str(plan.id),
                'statut': plan.statut,
                'statut_libelle': plan.get_statut_display(),
                'plan_nutrition': plan.plan_nutrition,
                'plan_activite': plan.plan_activite,
                'notes_nutritionniste': plan.notes_nutritionniste,
                'requires_medical_referral': requires_referral,
                'urgent_flags': urgent_flags,
                'dmi_integre': rapport_agent.get("metadata", {}).get("dmi_utilise", False),
            },
            'plan_soin_id': str(plan.id),
            'statut_plan': plan.statut,
            'priorite_tache': tache.priorite,
            'message_succes': _(
                "Dépistage enregistré avec succès. Le plan a été transmis à la file des nutritionnistes."
            )
        }, status=status.HTTP_201_CREATED)
