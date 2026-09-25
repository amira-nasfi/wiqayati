"""
Vues pour l'espace mobile citoyen (Wiqayati Citoyen).
Le citoyen n'accède strictement qu'à son propre dossier déterminé par son INS.
"""
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.permissions import EstCitoyen
from apps.accounts.models import CompteUtilisateur, Role
from apps.screening.models import ProfilPatient, ReponseScreening, TypeSoumission
from apps.risk_engine.models import ResultatEvaluationRisque, NiveauRisque
from apps.risk_engine.services import ClientMoteurRisque
from apps.care_plan.models import PlanSoin, StatutPlan
from apps.care_plan.services import GenerateurPlanSoin
from apps.nutritionist_queue.models import TacheNutritionniste, PrioriteTache, StatutTache
from .questionnaire_definitions import DEFINITION_QUESTIONNAIRE_V1


class ConnexionCitoyenView(APIView):
    """
    POST /api/v1/citoyen/auth/connexion/
    Connexion sécurisée citoyenne par INS et code PIN / mot de passe.
    Crée automatiquement le compte citoyen s'il s'agit de sa première connexion
    et qu'un dossier patient avec cet INS existe déjà.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ins = request.data.get('ins', '').strip().upper()
        pin = request.data.get('pin', '').strip()

        if not ins or not pin:
            return Response(
                {'erreur': _("L'INS et le code secret sont obligatoires.")},
                status=status.HTTP_400_BAD_REQUEST
            )

        patient = ProfilPatient.objects.filter(ins=ins).first()
        if not patient:
            return Response(
                {
                    'erreur': _(
                        "Aucun dossier de santé trouvé pour cet INS. "
                        "Veuillez d'abord vous faire dépister auprès d'un agent."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Recherche ou création du compte utilisateur pour ce citoyen
        compte, cree = CompteUtilisateur.objects.get_or_create(
            username=ins,
            defaults={
                'email': f"{ins.lower()}@citoyen.wiqayati.tn",
                'prenom': patient.prenom,
                'nom': patient.nom,
                'role': Role.CITOYEN,
                'gouvernorat': patient.gouvernorat,
            }
        )

        if cree:
            compte.set_password(pin)
            compte.save()
        else:
            if not compte.check_password(pin):
                return Response(
                    {'erreur': _("Code secret ou identifiant incorrect.")},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        compte.derniere_connexion_le = timezone.now()
        compte.save(update_fields=['derniere_connexion_le'])

        refresh = RefreshToken.for_user(compte)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'citoyen': {
                'id': str(compte.id),
                'ins': ins,
                'prenom': patient.prenom,
                'nom': patient.nom,
                'gouvernorat': patient.gouvernorat
            }
        })


class CitoyenMoiView(APIView):
    """
    GET /api/v1/citoyen/moi/
    Profil personnel du citoyen authentifié.
    """
    permission_classes = [EstCitoyen]

    def get(self, request):
        ins = request.user.username
        patient = ProfilPatient.objects.filter(ins=ins).first()
        if not patient:
            return Response({'erreur': _("Profil patient introuvable.")}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'ins': patient.ins,
            'prenom': patient.prenom,
            'nom': patient.nom,
            'date_naissance': patient.date_naissance,
            'genre': patient.genre,
            'gouvernorat': patient.gouvernorat,
            'telephone': patient.telephone
        })


class CitoyenHistoriqueRisquesView(APIView):
    """
    GET /api/v1/citoyen/moi/historique-risques/
    Historique des résultats de risque obtenus par le citoyen.
    """
    permission_classes = [EstCitoyen]

    def get(self, request):
        ins = request.user.username
        evaluations = ResultatEvaluationRisque.objects.filter(
            patient__ins=ins
        ).order_by('-evalue_le')

        data = [
            {
                'id': str(e.id),
                'niveau_risque': e.niveau_risque,
                'niveau_risque_libelle': e.get_niveau_risque_display(),
                'score': e.score,
                'facteurs': e.facteurs,
                'evalue_le': e.evalue_le.isoformat()
            }
            for e in evaluations
        ]
        return Response(data)


class CitoyenPlanActifView(APIView):
    """
    GET /api/v1/citoyen/moi/plan-actif/
    Retourne le dernier plan validé par le nutritionniste.
    RÈGLE ABSOLUE : Si aucun plan n'est au statut VALIDE, le brouillon n'est JAMAIS divulgué.
    """
    permission_classes = [EstCitoyen]

    def get(self, request):
        ins = request.user.username
        plan_valide = PlanSoin.objects.filter(
            patient__ins=ins,
            statut=StatutPlan.VALIDE
        ).order_by('-valide_le').first()

        if not plan_valide:
            # Vérifier s'il y a un plan en cours d'évaluation
            plan_en_attente = PlanSoin.objects.filter(
                patient__ins=ins,
                statut=StatutPlan.BROUILLON
            ).exists()

            if plan_en_attente:
                message = _(
                    "Votre plan personnalisé est actuellement en cours d'analyse "
                    "et de validation par un nutritionniste."
                )
            else:
                message = _("Vous n'avez pas encore de plan de soin actif.")

            return Response({
                'a_un_plan_valide': False,
                'en_attente_validation': plan_en_attente,
                'message': message,
            })

        return Response({
            'a_un_plan_valide': True,
            'plan_id': str(plan_valide.id),
            'plan_nutrition': plan_valide.plan_nutrition,
            'plan_activite': plan_valide.plan_activite,
            'notes_nutritionniste': plan_valide.notes_nutritionniste,
            'valide_le': plan_valide.valide_le.isoformat(),
        })


class CitoyenAutoEvaluationView(APIView):
    """
    POST /api/v1/citoyen/auto-evaluation/
    Permet au citoyen de relancer une évaluation complète de son risque.
    Crée une tâche de suivi pour le nutritionniste.
    """
    permission_classes = [EstCitoyen]

    def get(self, request):
        return Response(DEFINITION_QUESTIONNAIRE_V1)

    def post(self, request):
        ins = request.user.username
        patient = ProfilPatient.objects.filter(ins=ins).first()
        if not patient:
            return Response({'erreur': _("Profil patient introuvable.")}, status=status.HTTP_404_NOT_FOUND)

        donnees = request.data.get('donnees')
        if not donnees:
            return Response(
                {'erreur': _("Les réponses du questionnaire sont obligatoires.")},
                status=status.HTTP_400_BAD_REQUEST
            )

        reponse = ReponseScreening.objects.create(
            patient=patient,
            soumis_par=request.user,
            type_soumission=TypeSoumission.AUTO_EVALUATION,
            donnees=donnees
        )

        contexte = {
            "type_soumission": "AUTO_EVALUATION",
            "role_soumetteur": "CITOYEN",
            "horodatage_soumission": timezone.now().isoformat()
        }
        res_moteur = ClientMoteurRisque.evaluer(
            ins_patient=ins,
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

        priorite_map = {
            NiveauRisque.ELEVE: PrioriteTache.STAT,
            NiveauRisque.INTERMEDIAIRE: PrioriteTache.URGENT,
            NiveauRisque.FAIBLE: PrioriteTache.ROUTINE,
        }
        priorite = priorite_map.get(evaluation.niveau_risque, PrioriteTache.ROUTINE)

        TacheNutritionniste.objects.create(
            plan_soin=plan,
            priorite=priorite,
            statut=StatutTache.DEMANDE
        )

        return Response({
            'message': _(
                "Votre auto-évaluation a été enregistrée avec succès. "
                "Un nutritionniste révisera votre plan personnalisé."
            ),
            'evaluation': {
                'id': str(evaluation.id),
                'niveau_risque': evaluation.niveau_risque,
                'niveau_risque_libelle': evaluation.get_niveau_risque_display(),
                'score': evaluation.score,
                'facteurs': evaluation.facteurs
            }
        }, status=status.HTTP_201_CREATED)
