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
    Indicateurs clés de performance (KPIs) nationaux enrichis pour le Ministère.
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

        # ── Nouveaux KPIs : Canaux de dépistage (Mobile, Dispensaire, Campagne) ──
        canaux = ReponseScreening.objects.values('type_soumission').annotate(total=Count('id'))
        canaux_dict = {c['type_soumission']: c['total'] for c in canaux}
        mobile_count = canaux_dict.get('AUTO_EVALUATION', 0)
        dispensaire_count = canaux_dict.get('SOINS_PRIMAIRES', 0)
        campagne_count = canaux_dict.get('CAMPAGNE', 0)
        part_mobile_pct = round((mobile_count / total_screenings * 100), 1) if total_screenings > 0 else 0.0

        # ── Nouveau KPI : Personnes dont le risque a diminué (Suivi longitudinal) ──
        patients_multiples = ProfilPatient.objects.annotate(
            nb_evals=Count('evaluations_risque')
        ).filter(nb_evals__gte=2)
        nb_risque_diminue = 0
        total_suivis_longitudinaux = patients_multiples.count()
        for p in patients_multiples:
            evals = list(p.evaluations_risque.order_by('evalue_le'))
            if len(evals) >= 2 and evals[-1].score < evals[0].score:
                nb_risque_diminue += 1

        # ── Nouveau KPI : Pré-diabète & Statistiques Diabète détaillées ──
        nb_prediabete = 0
        nb_obesite_abdominale = 0
        nb_antecedent_famille = 0
        nb_hyperglycemie_severe = 0
        nb_femmes = 0
        nb_diabete_gestationnel = 0

        screenings = ReponseScreening.objects.all()
        for s in screenings:
            d = s.donnees or {}
            glycemie = None
            if d.get('glycemie_jeun_mmol') not in (None, ''):
                try:
                    glycemie = float(d['glycemie_jeun_mmol'])
                except (ValueError, TypeError):
                    pass

            genre = d.get('genre', '')
            tour_taille = float(d.get('tour_taille_cm') or 0)

            # Pré-diabète : glycémie 5.6-6.9 mmol/L (1.00-1.25 g/L) ou antécédent d'hyperglycémie
            est_prediabete = False
            if glycemie and 5.6 <= glycemie < 7.0:
                est_prediabete = True
            elif d.get('high_glucose_hist') is True:
                est_prediabete = True
            elif d.get('acanthosis_nigricans') is True and d.get('imc', 0) >= 28:
                est_prediabete = True

            if est_prediabete:
                nb_prediabete += 1

            # Hyperglycémie sévère suspecte diabète non diagnostiqué (>= 7.0 mmol/L)
            if glycemie and glycemie >= 7.0:
                nb_hyperglycemie_severe += 1

            # Obésité abdominale
            if (genre == 'M' and tour_taille > 102) or (genre == 'F' and tour_taille > 88):
                nb_obesite_abdominale += 1

            # Antécédent familial
            if d.get('antecedents_familiaux_diabete') is True:
                nb_antecedent_famille += 1

            # Diabète gestationnel
            if genre == 'F':
                nb_femmes += 1
                if d.get('diabete_gestationnel_antecedent') is True:
                    nb_diabete_gestationnel += 1

        pct_obesite_abdo = round((nb_obesite_abdominale / total_screenings * 100), 1) if total_screenings > 0 else 0.0
        pct_famille = round((nb_antecedent_famille / total_screenings * 100), 1) if total_screenings > 0 else 0.0
        pct_gestationnel = round((nb_diabete_gestationnel / nb_femmes * 100), 1) if nb_femmes > 0 else 0.0
        pct_eleve = round((dist_risques.get(NiveauRisque.ELEVE, 0) / total_screenings * 100), 1) if total_screenings > 0 else 0.0

        return Response({
            'total_patients_uniques': total_patients,
            'total_depistages_realises': total_screenings,
            'score_risque_moyen': round(float(score_moyen), 1),
            'nb_prediabete': nb_prediabete,
            'taux_prediabete_pct': round((nb_prediabete / total_screenings * 100), 1) if total_screenings > 0 else 0.0,
            'nb_personnes_risque_diminue': nb_risque_diminue,
            'total_suivis_longitudinaux': total_suivis_longitudinaux,
            'taux_amelioration_risque_pct': round((nb_risque_diminue / total_suivis_longitudinaux * 100), 1) if total_suivis_longitudinaux > 0 else 0.0,
            'distribution_risques': {
                'FAIBLE': dist_risques.get(NiveauRisque.FAIBLE, 0),
                'INTERMEDIAIRE': dist_risques.get(NiveauRisque.INTERMEDIAIRE, 0),
                'ELEVE': dist_risques.get(NiveauRisque.ELEVE, 0),
            },
            'statuts_plans': {
                'BROUILLON': dist_plans.get(StatutPlan.BROUILLON, 0),
                'VALIDE': dist_plans.get(StatutPlan.VALIDE, 0),
                'REJETE': dist_plans.get(StatutPlan.REJETE, 0),
            },
            'canaux_depistage': {
                'mobile': mobile_count,
                'dispensaire': dispensaire_count,
                'campagne': campagne_count,
                'part_mobile_pct': part_mobile_pct,
            },
            'statistiques_diabete': {
                'taux_risque_eleve_pct': pct_eleve,
                'cas_hyperglycemie_severe': nb_hyperglycemie_severe,
                'prevalence_obesite_abdominale_pct': pct_obesite_abdo,
                'prevalence_antecedent_familial_pct': pct_famille,
                'prevalence_diabete_gestationnel_pct': pct_gestationnel,
                'total_femmes_depistees': nb_femmes,
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
