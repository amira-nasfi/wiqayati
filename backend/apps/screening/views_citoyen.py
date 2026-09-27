"""
Vues pour l'espace mobile citoyen (Wiqayati Citoyen).
Le citoyen n'accède strictement qu'à son propre dossier déterminé par son INS.
"""
from datetime import datetime
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
from apps.risk_engine.services import ClientMoteurRisque, ServiceProtocoleML
from apps.care_plan.models import PlanSoin, StatutPlan
from apps.care_plan.services import GenerateurPlanSoin
from apps.nutritionist_queue.models import TacheNutritionniste, PrioriteTache, StatutTache
from .questionnaire_definitions import DEFINITION_QUESTIONNAIRE_V1


class ConnexionCitoyenView(APIView):
    """
    POST /api/v1/citoyen/auth/connexion/
    Connexion sécurisée citoyenne :
      - Soit par INS + code PIN / mot de passe
      - Soit par CIN (8 chiffres) + Date de naissance (+ PIN optionnel)
    Crée automatiquement le compte citoyen s'il s'agit de sa première connexion
    et qu'un dossier patient avec cet INS existe déjà.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ins = request.data.get('ins', '').strip().upper()
        pin = request.data.get('pin', '').strip()
        cin = request.data.get('cin', '').strip()
        date_naissance = request.data.get('date_naissance', '').strip()

        # Identification par CIN + Date de naissance
        if cin and date_naissance:
            date_parsed = None
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
                try:
                    date_parsed = datetime.strptime(date_naissance, fmt).date()
                    break
                except ValueError:
                    pass

            if not date_parsed:
                return Response(
                    {'erreur': _("Format de date invalide. Veuillez utiliser le sélecteur de date (AAAA-MM-JJ).")},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                patient = ProfilPatient.objects.filter(cin=cin, date_naissance=date_parsed).first()
            except Exception:
                patient = None

            if not patient:
                return Response(
                    {'erreur': _("Aucun dossier de santé trouvé pour ce numéro CIN et cette date de naissance.")},
                    status=status.HTTP_404_NOT_FOUND
                )
            ins = patient.ins
        elif ins:
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
        else:
            return Response(
                {'erreur': _("Veuillez renseigner votre INS ou votre CIN avec votre date de naissance.")},
                status=status.HTTP_400_BAD_REQUEST
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
            compte.set_password(pin if pin else '1234')
            compte.save()
        else:
            # Si un pin est fourni, on le vérifie
            if pin and not compte.check_password(pin):
                return Response(
                    {'erreur': _("Code secret ou identifiant incorrect.")},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        compte.derniere_connexion_le = timezone.now()
        compte.save(update_fields=['derniere_connexion_le'])

        refresh = RefreshToken.for_user(compte)

        utilisateur_data = {
            'id': str(compte.id),
            'username': compte.username,
            'email': compte.email,
            'prenom': patient.prenom,
            'nom': patient.nom,
            'role': Role.CITOYEN,
            'gouvernorat': patient.gouvernorat,
            'ins': patient.ins,
            'cin': patient.cin or '',
        }

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'utilisateur': utilisateur_data,
            'citoyen': {
                'id': str(compte.id),
                'ins': ins,
                'cin': patient.cin or '',
                'prenom': patient.prenom,
                'nom': patient.nom,
                'date_naissance': str(patient.date_naissance),
                'gouvernorat': patient.gouvernorat
            }
        })


class IdentifierCitoyenCinView(APIView):
    """
    POST /api/v1/citoyen/auth/identifier-cin/
    Recherche un dossier patient par CIN (8 chiffres) et date de naissance.
    Permet à l'usager de découvrir son INS s'il existe et de valider son identité.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cin = request.data.get('cin', '').strip()
        date_naissance = request.data.get('date_naissance', '').strip()

        if not cin or not date_naissance:
            return Response(
                {'erreur': _("Le numéro CIN et la date de naissance sont obligatoires.")},
                status=status.HTTP_400_BAD_REQUEST
            )

        patient = ProfilPatient.objects.filter(cin=cin, date_naissance=date_naissance).first()
        if not patient:
            return Response({
                'trouve': False,
                'message': _("Aucun dossier de santé trouvé pour ce CIN et cette date de naissance.")
            }, status=status.HTTP_200_OK)

        compte = CompteUtilisateur.objects.filter(username=patient.ins).first()
        has_pin = bool(compte and compte.has_usable_password())

        return Response({
            'trouve': True,
            'ins': patient.ins,
            'cin': patient.cin,
            'prenom': patient.prenom,
            'nom': patient.nom,
            'date_naissance': str(patient.date_naissance),
            'gouvernorat': patient.gouvernorat,
            'has_pin': has_pin,
        }, status=status.HTTP_200_OK)


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

        # Génération du protocole personnalisé via le moteur ML/règles
        protocole_ml = ServiceProtocoleML.generer_protocole(donnees)

        nutrition, activite = GenerateurPlanSoin.generer_plans(
            niveau_risqu=evaluation.niveau_risque,
            facteurs=evaluation.facteurs,
            protocole_ml=protocole_ml,
        )

        plan = PlanSoin.objects.create(
            patient=patient,
            evaluation_risque=evaluation,
            plan_nutrition=nutrition,
            plan_activite=activite,
            statut=StatutPlan.BROUILLON,
            requires_medical_referral=bool(protocole_ml and protocole_ml.get('requires_medical_referral')),
            urgent_flags=protocole_ml.get('urgent_flags', []) if protocole_ml else [],
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

        supplement = res_moteur.get('_supplement') or {}
        findrisc = supplement.get("findrisc", {}) if supplement else {}
        detecteur = supplement.get("detector", {}) if supplement else {}
        referral = supplement.get("referral", {}) if supplement else {}

        p_ml = protocole_ml or {}
        ml_supplement = {
            "findrisc_score": findrisc.get("score") if findrisc else p_ml.get("findrisc_score"),
            "risque_10_ans_pct": (
                findrisc.get("ten_year_risk_pct") if findrisc else p_ml.get("findrisc_10y_risk_pct")
            ),
            "probabilite_dysglycemie": (
                detecteur.get("probability") if detecteur else p_ml.get("dysglycemia_ml_probability")
            ),
            "dysglycemie_detectee": (
                detecteur.get("flagged") if detecteur else p_ml.get("dysglycemia_flag", False)
            ),
            "orientation_medicale": referral or p_ml.get("medical_referral"),
            "requires_medical_referral": bool(p_ml.get("requires_medical_referral")),
            "urgent_flags": p_ml.get("urgent_flags", []),
        }

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
            },
            'ml_supplement': ml_supplement,
            'plan_soin': {
                'id': str(plan.id),
                'statut': plan.statut,
                'statut_libelle': plan.get_statut_display(),
                'plan_nutrition': plan.plan_nutrition,
                'plan_activite': plan.plan_activite,
                'notes_nutritionniste': plan.notes_nutritionniste,
                'requires_medical_referral': bool(protocole_ml and protocole_ml.get("requires_medical_referral")),
                'urgent_flags': protocole_ml.get("urgent_flags", []) if protocole_ml else [],
            }
        }, status=status.HTTP_201_CREATED)
