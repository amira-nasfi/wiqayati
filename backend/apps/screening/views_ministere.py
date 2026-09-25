"""
Vues statistiques agrégées pour l'Administration du Ministère de la Santé.
STRICTEMENT ANONYMISÉ : AUCUNE DONNÉE NOMINATIVE NI INS N'EST TRANSMIS.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta

from apps.accounts.permissions import EstAdminMinistere
from apps.screening.models import ProfilPatient, ReponseScreening
from apps.risk_engine.models import ResultatEvaluationRisque, NiveauRisque
from apps.care_plan.models import PlanSoin, StatutPlan


class StatsApercuMinistereView(APIView):
    """
    GET /api/v1/admin/ministere/stats/apercu/
    Indicateurs clés de performance (KPIs) nationaux.
    """
    permission_classes = [EstAdminMinistere]

    def get(self, request):
        total_patients = ProfilPatient.objects.count()
        total_screenings = ReponseScreening.objects.count()

        # Distribution des risques
        risques = ResultatEvaluationRisque.objects.values('niveau_risque').annotate(total=Count('id'))
        dist_risques = {r['niveau_risque']: r['total'] for r in risques}

        # Statut des plans
        plans = PlanSoin.objects.values('statut').annotate(total=Count('id'))
        dist_plans = {p['statut']: p['total'] for p in plans}

        # Score moyen
        score_moyen = ResultatEvaluationRisque.objects.aggregate(avg=Avg('score'))['avg'] or 0.0

        return Response({
            'total_patients_uniques': total_patients,
            'total_depistages_realises': total_screenings,
            'score_risque_moyen': round(float(score_moyen), 1),
            'distribution_risques': {
                'FAIBLE': dist_risques.get(NiveauRisque.FAIBLE, 0),
                'INTERMEDIAIRE': dist_risques.get(NiveauRisque.INTERMEDIAIRE, 0),
                'ELEVE': dist_risques.get(NiveauRisque.ELEVE, 0),
            },
            'statuts_plans': {
                'BROUILLON': dist_plans.get(StatutPlan.BROUILLON, 0),
                'VALIDE': dist_plans.get(StatutPlan.VALIDE, 0),
                'REJETE': dist_plans.get(StatutPlan.REJETE, 0),
            }
        })


class StatsParGouvernoratView(APIView):
    """
    GET /api/v1/admin/ministere/stats/par-gouvernorat/
    Statistiques agrégées par gouvernorat tunisien.
    """
    permission_classes = [EstAdminMinistere]

    def get(self, request):
        stats = (
            ProfilPatient.objects.values('gouvernorat')
            .annotate(
                total_depistages=Count('reponses_screening'),
                eleve=Count(
                    'evaluations_risque',
                    filter=Q(evaluations_risque__niveau_risque=NiveauRisque.ELEVE)
                ),
                intermediaire=Count(
                    'evaluations_risque',
                    filter=Q(evaluations_risque__niveau_risque=NiveauRisque.INTERMEDIAIRE)
                ),
                faible=Count(
                    'evaluations_risque',
                    filter=Q(evaluations_risque__niveau_risque=NiveauRisque.FAIBLE)
                ),
            )
            .order_by('-total_depistages')
        )
        return Response(list(stats))


class StatsTendancesView(APIView):
    """
    GET /api/v1/admin/ministere/stats/tendances/
    Évolution temporelle sur les 30 derniers jours (par jour).
    """
    permission_classes = [EstAdminMinistere]

    def get(self, request):
        il_y_a_30_jours = timezone.now() - timedelta(days=30)
        evaluations = (
            ResultatEvaluationRisque.objects.filter(evalue_le__gte=il_y_a_30_jours)
            .extra(select={'jour': "date(evalue_le)"})
            .values('jour')
            .annotate(
                total=Count('id'),
                eleve=Count('id', filter=Q(niveau_risque=NiveauRisque.ELEVE)),
                intermediaire=Count('id', filter=Q(niveau_risque=NiveauRisque.INTERMEDIAIRE)),
                faible=Count('id', filter=Q(niveau_risque=NiveauRisque.FAIBLE))
            )
            .order_by('jour')
        )
        return Response(list(evaluations))


class StatsFacteursRisqueView(APIView):
    """
    GET /api/v1/admin/ministere/stats/facteurs-risque/
    Fréquence globale des différents facteurs de risque déclarés.
    """
    permission_classes = [EstAdminMinistere]

    def get(self, request):
        total = ReponseScreening.objects.count()
        if total == 0:
            return Response([])

        # Fréquences calculées sur les données JSONField
        hypertension = ReponseScreening.objects.filter(donnees__hypertension_diagnostiquee=True).count()
        famille = ReponseScreening.objects.filter(donnees__antecedents_familiaux_diabete=True).count()
        sedentarite = ReponseScreening.objects.filter(donnees__niveau_activite_physique="FAIBLE").count()
        tabac = ReponseScreening.objects.filter(donnees__statut_tabagisme="FUMEUR_ACTUEL").count()
        alimentation = ReponseScreening.objects.filter(donnees__qualite_alimentation="MAUVAISE").count()
        acanthosis = ReponseScreening.objects.filter(donnees__acanthosis_nigricans=True).count()

        def pct(count):
            return round(count / total * 100, 1)

        facteurs = [
            {"facteur": "Antécédents familiaux", "total": famille, "pourcentage": pct(famille)},
            {"facteur": "Hypertension diagnostiquée", "total": hypertension, "pourcentage": pct(hypertension)},
            {"facteur": "Sédentarité (activité faible)", "total": sedentarite, "pourcentage": pct(sedentarite)},
            {"facteur": "Tabagisme actif", "total": tabac, "pourcentage": pct(tabac)},
            {"facteur": "Alimentation déséquilibrée", "total": alimentation, "pourcentage": pct(alimentation)},
            {"facteur": "Acanthosis nigricans", "total": acanthosis, "pourcentage": pct(acanthosis)},
        ]
        return Response(facteurs)
