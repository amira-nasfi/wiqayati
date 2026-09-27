"""
backend/apps/risk_engine/client.py - Client d'intégration du moteur de risque WiQayati.

Règles de fonctionnement :
1. Pas de repli silencieux sur le stub : le stub est utilisé UNIQUEMENT si ML_MODE=stub.
   Dans tout autre cas d'échec ML, raise ConnectionError avec l'exception d'origine chaînée.
2. Pas d'os.chdir() : import normal du package apps.risk_engine.ml.
3. Attribut de classe ClientMoteurRisque.available (True/False) exposé à l'import du module.
4. Double compatibilité de signature :
     evaluer(ins_patient, donnees_questionnaire, contexte) # legacy
     evaluer(payload_dict)                                 # new
5. evaluer_avec_dmi(payload, ins) : intégration FHIR avec fail-soft sur _dmi_unavailable.
6. Timeout de 12 secondes strict via ThreadPoolExecutor.
7. Journalisation structurée systématique (6 champs obligatoires).
"""
import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import concurrent.futures

logger = logging.getLogger(__name__)

# --- Règle 2 & Règle 3 : Tentative de chargement du module ML une seule fois ---
_ml_adapter = None
_ml_available = False
_ml_load_reason = ""

try:
    from apps.risk_engine.ml import wq_adapter
    # Vérification que le modèle et le schéma sont physiquement présents
    h = wq_adapter.health()
    if h.get("model_present", False):
        _ml_adapter = wq_adapter
        _ml_available = True
    else:
        _ml_available = False
        _ml_load_reason = "Fichier model.pkl introuvable dans apps/risk_engine/ml/model/"
        logger.warning(
            "ClientMoteurRisque non disponible : %s", _ml_load_reason
        )
except Exception as _load_exc:
    _ml_available = False
    _ml_load_reason = f"{_load_exc.__class__.__name__}: {_load_exc}"
    logger.warning(
        "ClientMoteurRisque non disponible (erreur d'import) : %s", _ml_load_reason
    )


class ClientMoteurRisque:
    """
    Client d'orchestration pour l'évaluation du risque de diabète.
    """
    available: bool = _ml_available
    _load_reason: str = _ml_load_reason
    TIMEOUT_SECONDS: float = 12.0

    @classmethod
    def _execute_ml(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute le pipeline ML local sans os.chdir()."""
        if not _ml_available or _ml_adapter is None:
            raise ConnectionError(
                f"Moteur ML non disponible à l'initialisation: {cls._load_reason}"
            )
        return _ml_adapter.run_pipeline(payload)

    @classmethod
    def _execute_stub(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute le stub déterministe."""
        from apps.risk_engine.services import ServiceStubMoteurRisque
        return ServiceStubMoteurRisque.evaluer(payload)

    @classmethod
    def evaluer(cls, *args, **kwargs) -> Dict[str, Any]:
        """
        Évalue le risque avec compatibilité des signatures :
          - evaluer(payload_dict)
          - evaluer(ins_patient, donnees_questionnaire, contexte)
        """
        # 1. Normalisation de la signature
        if len(args) == 1 and isinstance(args[0], dict):
            payload = args[0]
            ins_patient = payload.get("ins_patient")
        elif len(args) >= 3:
            ins_patient = args[0]
            donnees_questionnaire = args[1]
            contexte = args[2]
            payload = {
                "request_id": str(uuid.uuid4()),
                "ins_patient": ins_patient,
                "version_questionnaire": "1.0",
                "donnees_questionnaire": donnees_questionnaire,
                "contexte": contexte,
            }
        elif "donnees_questionnaire" in kwargs:
            ins_patient = kwargs.get("ins_patient")
            payload = {
                "request_id": str(uuid.uuid4()),
                "ins_patient": ins_patient,
                "version_questionnaire": "1.0",
                "donnees_questionnaire": kwargs["donnees_questionnaire"],
                "contexte": kwargs.get("contexte", {}),
            }
        elif "payload" in kwargs:
            payload = kwargs["payload"]
            ins_patient = payload.get("ins_patient")
        else:
            raise ValueError(
                "Signature invalide pour ClientMoteurRisque.evaluer. "
                "Attendu : evaluer(payload) ou evaluer(ins_patient, donnees_questionnaire, contexte)"
            )

        start_time = datetime.now(timezone.utc)
        iso_timestamp = start_time.isoformat()
        ml_mode = os.environ.get("ML_MODE", "").strip().lower()
        mode_used = "stub" if ml_mode == "stub" else "ml"

        success = False
        exc_class = None
        exc_message = None

        try:
            # Règle 1 : si ML_MODE=stub explicitement activé
            if mode_used == "stub":
                result = cls._execute_stub(payload)
                success = True
                return result

            # Règle 1 & Règle 3 : Exécution ML obligatoire avec timeout de 12s
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(cls._execute_ml, payload)
                try:
                    result = future.result(timeout=cls.TIMEOUT_SECONDS)
                    success = True
                    return result
                except concurrent.futures.TimeoutError as te:
                    raise ConnectionError("ML evaluation exceeded 12s") from te
                except Exception as eval_exc:
                    # Règle 1 : JAMAIS de repli silencieux vers le stub
                    raise ConnectionError(
                        f"Échec de l'évaluation ML: {eval_exc}"
                    ) from eval_exc

        except Exception as exc:
            exc_class = exc.__class__.__name__
            exc_message = str(exc)
            raise exc

        finally:
            end_time = datetime.now(timezone.utc)
            duration_ms = round((end_time - start_time).total_seconds() * 1000.0, 2)
            # Journalisation structurée systématique (les 6 champs requis)
            log_record = {
                "timestamp": iso_timestamp,
                "ins_patient": ins_patient,
                "duration_ms": duration_ms,
                "mode": mode_used,
                "success": success,
                "exception_class": exc_class,
                "exception_message": exc_message,
            }
            if success:
                logger.info("EvaluationRisque: %s", json.dumps(log_record, ensure_ascii=False))
            else:
                logger.error("EvaluationRisque: %s", json.dumps(log_record, ensure_ascii=False))

    @classmethod
    def evaluer_avec_dmi(cls, payload: Dict[str, Any], ins: Optional[str] = None) -> Dict[str, Any]:
        """
        Enrichit le payload avec le Dossier Médical Informatisé (DMI) depuis FHIR
        puis exécute le même pipeline interne que evaluer().
        """
        target_ins = ins or payload.get("ins_patient")
        dmi_data = None

        if target_ins:
            try:
                from apps.fhir_bridge.client import ClientHapiFhir
                dmi_data = ClientHapiFhir.lire_dossier_patient(target_ins)
            except Exception as fhir_exc:
                logger.warning(
                    "Échec lecture FHIR DMI pour ins=%s: %s (continuation sans DMI)",
                    target_ins, fhir_exc
                )
                dmi_data = {"dmi_disponible": False}

        if not dmi_data or not dmi_data.get("dmi_disponible", False):
            payload["_dmi_unavailable"] = True
        else:
            payload["_dmi"] = dmi_data

        return cls.evaluer(payload)
