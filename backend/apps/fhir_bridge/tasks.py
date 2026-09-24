"""
Tâches asynchrones Celery pour la synchronisation FHIR et la maintenance des comptes.
"""
import logging
from celery import shared_task
from django.utils import timezone

from .client import ClientHapiFhir
from .models import JournalSyncFhir

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def synchroniser_dossier_complet_fhir(self, patient_id: str, reponse_id: str, evaluation_id: str, plan_id: str, tache_id: str = None):
    """
    Synchronise le dossier de santé complet avec HAPI FHIR :
    1. Patient
    2. QuestionnaireResponse
    3. RiskAssessment
    4. CarePlan
    """
    from apps.screening.models import ProfilPatient, ReponseScreening
    from apps.risk_engine.models import ResultatEvaluationRisque
    from apps.care_plan.models import PlanSoin

    try:
        patient = ProfilPatient.objects.get(id=patient_id)
        reponse = ReponseScreening.objects.get(id=reponse_id)
        evaluation = ResultatEvaluationRisque.objects.get(id=evaluation_id)
        plan = PlanSoin.objects.get(id=plan_id)

        # 1. Synchronisation Patient
        fhir_patient_id = ClientHapiFhir.creer_ou_maj_patient({
            "ins": patient.ins,
            "prenom": patient.prenom,
            "nom": patient.nom,
            "genre": patient.genre,
            "date_naissance": patient.date_naissance,
            "gouvernorat": patient.gouvernorat,
            "telephone": patient.telephone,
        }, fhir_id=patient.fhir_resource_id)

        if fhir_patient_id and fhir_patient_id != patient.fhir_resource_id:
            patient.fhir_resource_id = fhir_patient_id
            patient.save(update_fields=['fhir_resource_id'])

        if not fhir_patient_id:
            logger.info("Serveur FHIR non joignable, ressource mise en attente.")
            return "FHIR_DIFFERE"

        # 2. Synchronisation QuestionnaireResponse
        qr_id = ClientHapiFhir.creer_questionnaire_response(fhir_patient_id, {
            "soumis_le": reponse.soumis_le.isoformat(),
            "donnees": reponse.donnees
        })
        if qr_id:
            reponse.fhir_resource_id = qr_id
            reponse.save(update_fields=['fhir_resource_id'])

        # 3. Synchronisation RiskAssessment
        ra_id = ClientHapiFhir.creer_risk_assessment(fhir_patient_id, {
            "evalue_le": evaluation.evalue_le.isoformat(),
            "niveau_risque": evaluation.niveau_risque,
            "score": evaluation.score,
            "version_moteur": evaluation.version_moteur
        })
        if ra_id:
            evaluation.fhir_resource_id = ra_id
            evaluation.save(update_fields=['fhir_resource_id'])

        # 4. Synchronisation CarePlan
        cp_id = ClientHapiFhir.creer_ou_maj_care_plan(fhir_patient_id, {
            "statut": plan.statut,
            "plan_nutrition": plan.plan_nutrition,
            "plan_activite": plan.plan_activite,
            "notes_nutritionniste": plan.notes_nutritionniste
        }, fhir_id=plan.fhir_resource_id)
        if cp_id:
            plan.fhir_resource_id = cp_id
            plan.save(update_fields=['fhir_resource_id'])

        JournalSyncFhir.objects.create(
            type_ressource="Patient/Bundle",
            id_local=str(patient.id),
            fhir_id=fhir_patient_id or "",
            statut=JournalSyncFhir.StatutSync.SUCCES,
            tentatives=self.request.retries + 1
        )
        return "SUCCES"

    except Exception as exc:
        logger.warning("Échec de la tâche synchroniser_dossier_complet_fhir (tentative %d): %s", self.request.retries, exc)
        try:
            raise self.retry(exc=exc)
        except Exception:
            JournalSyncFhir.objects.create(
                type_ressource="Patient/Bundle",
                id_local=str(patient_id),
                statut=JournalSyncFhir.StatutSync.ECHEC,
                tentatives=self.request.retries + 1,
                dernier_message_erreur=str(exc)
            )


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def synchroniser_validation_plan_fhir(self, plan_id: str):
    """
    Met à jour la ressource CarePlan sur HAPI FHIR lorsque le nutritionniste valide le plan.
    """
    from apps.care_plan.models import PlanSoin

    try:
        plan = PlanSoin.objects.select_related('patient').get(id=plan_id)
        fhir_patient_id = plan.patient.fhir_resource_id or plan.patient.ins

        cp_id = ClientHapiFhir.creer_ou_maj_care_plan(
            fhir_patient_id=fhir_patient_id,
            plan_data={
                "statut": plan.statut,
                "plan_nutrition": plan.plan_nutrition,
                "plan_activite": plan.plan_activite,
                "notes_nutritionniste": plan.notes_nutritionniste
            },
            fhir_id=plan.fhir_resource_id
        )
        if cp_id and cp_id != plan.fhir_resource_id:
            plan.fhir_resource_id = cp_id
            plan.save(update_fields=['fhir_resource_id'])

        return "SUCCES"
    except Exception as exc:
        logger.warning("Erreur synchronisation validation plan: %s", exc)
        raise self.retry(exc=exc)


@shared_task
def desactiver_comptes_expires():
    """
    Tâche périodique planifiée (Celery Beat) :
    Désactive automatiquement tous les comptes utilisateurs temporaires dont la date d'expiration est dépassée.
    """
    from apps.accounts.models import CompteUtilisateur

    maintenant = timezone.now()
    comptes_a_desactiver = CompteUtilisateur.objects.filter(
        is_active=True,
        expire_le__isnull=False,
        expire_le__lt=maintenant
    )
    nb_desactives = comptes_a_desactiver.update(is_active=False)
    logger.info("Comptes temporaires expirés désactivés : %d", nb_desactives)
    return {"comptes_desactives": nb_desactives}
