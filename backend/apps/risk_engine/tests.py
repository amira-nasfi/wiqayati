"""
Tests unitaires pour le moteur d'évaluation de risque (ML et Déterministe) et le générateur de protocoles.
Vérifie la conformité avec le contrat d'interface Wiqayati v1.0.
"""
from django.test import TestCase
from apps.risk_engine.services import ClientMoteurRisque, ServiceProtocoleML
from apps.care_plan.services import GenerateurPlanSoin


class TestMoteurRisqueML(TestCase):
    def setUp(self):
        # Profil clinique complet type "Karim" (risque élevé)
        self.donnees_karim = {
            "age": 47,
            "genre": "M",
            "imc": 29.8,
            "tour_taille_cm": 98,
            "glycemie_jeun_connue": True,
            "glycemie_jeun_mmol": 6.8,
            "niveau_activite_physique": "SEDENTAIRE",
            "qualite_alimentation": "FAIBLE",
            "statut_tabagisme": "FUMEUR",
            "antecedents_familiaux_diabete": True,
            "hypertension_diagnostiquee": True,
            "medicaments_corticoides": False,
            "acanthosis_nigricans": False,
            "diabete_gestationnel_antecedent": False,
            "high_glucose_hist": True,
        }

        # Profil sain (risque faible)
        self.donnees_sain = {
            "age": 25,
            "genre": "F",
            "imc": 21.0,
            "tour_taille_cm": 70,
            "glycemie_jeun_connue": False,
            "glycemie_jeun_mmol": None,
            "niveau_activite_physique": "INTENSE",
            "qualite_alimentation": "EXCELLENTE",
            "statut_tabagisme": "JAMAIS",
            "antecedents_familiaux_diabete": False,
            "hypertension_diagnostiquee": False,
            "medicaments_corticoides": False,
            "acanthosis_nigricans": False,
            "diabete_gestationnel_antecedent": False,
            "high_glucose_hist": False,
        }

    def test_evaluation_ml_karim_risque_eleve(self):
        """Vérifie que le profil à risque élevé produit un score élevé et les métadonnées FINDRISC."""
        res = ClientMoteurRisque.evaluer(
            ins_patient="INS-KARIM-001",
            donnees_questionnaire=self.donnees_karim,
            contexte={"source": "test_unitaire"}
        )

        self.assertIn("score", res)
        self.assertIn("niveau_risque", res)
        self.assertIn("facteurs", res)
        self.assertIn("version_moteur", res)
        self.assertIn("_supplement", res)

        self.assertEqual(res["niveau_risque"], "ELEVE")
        self.assertGreaterEqual(res["score"], 50)
        self.assertTrue(len(res["facteurs"]) > 0)

        # Vérification du supplément clinique
        supp = res["_supplement"]
        self.assertIsNotNone(supp)
        self.assertIn("findrisc", supp)
        self.assertIn("score", supp["findrisc"])
        self.assertIn("ten_year_risk_pct", supp["findrisc"])
        self.assertIn("detector", supp)
        self.assertIn("probability", supp["detector"])
        self.assertIn("referral", supp)

    def test_evaluation_ml_profil_sain(self):
        """Vérifie que le profil sain produit un niveau de risque faible."""
        res = ClientMoteurRisque.evaluer(
            ins_patient="INS-SAIN-002",
            donnees_questionnaire=self.donnees_sain,
            contexte={"source": "test_unitaire"}
        )

        self.assertEqual(res["niveau_risque"], "FAIBLE")
        self.assertLess(res["score"], 40)

    def test_service_protocole_ml(self):
        """Vérifie la génération du protocole personnalisé issu du moteur ML."""
        protocole = ServiceProtocoleML.generer_protocole(self.donnees_karim)
        self.assertIsNotNone(protocole)
        self.assertTrue(protocole.get("requires_medical_referral"))
        self.assertIn("items", protocole)
        self.assertTrue(len(protocole["items"]) > 0)

    def test_generateur_plan_soin_avec_ml(self):
        """Vérifie que GenerateurPlanSoin intègre les items ML."""
        protocole = ServiceProtocoleML.generer_protocole(self.donnees_karim)
        nutr, activ = GenerateurPlanSoin.generer_plans(
            niveau_risqu="ELEVE",
            facteurs=[{"code": "AGE_AVANCE", "libelle": "Âge"}],
            protocole_ml=protocole
        )

        self.assertIn("objectifs", nutr)
        self.assertIn("objectifs", activ)
        self.assertTrue(len(nutr["objectifs"]) > 0)
        self.assertTrue(len(activ["objectifs"]) > 0)
        self.assertEqual(nutr.get("source_moteur"), "wq-ml-1.0")


class TestClientMoteurRisqueWiring(TestCase):
    """
    Tests unitaires pour ClientMoteurRisque câblé au module ML :
      1. Évaluation normale renvoyant la structure de données correcte
      2. Module ML forcé en échec -> lève ConnectionError (aucun fallback sur le stub)
      3. ML_MODE=stub -> renvoie la réponse du stub
      4. evaluer_avec_dmi avec FHIR indisponible -> poursuit sans DMI (_dmi_unavailable = True)
    """

    def setUp(self):
        self.sample_payload = {
            "request_id": "test-req-001",
            "ins_patient": "TUN10001234",
            "version_questionnaire": "1.0",
            "donnees_questionnaire": {
                "age": 47,
                "genre": "M",
                "imc": 31.0,
                "tour_taille_cm": 101.0,
                "antecedents_familiaux_diabete": True,
                "hypertension_diagnostiquee": False,
                "niveau_activite_physique": "FAIBLE",
                "qualite_alimentation": "MAUVAISE",
                "statut_tabagisme": "FUMEUR_ACTUEL",
                "glycemie_jeun_connue": False,
                "glycemie_jeun_mmol": None,
                "diabete_gestationnel_antecedent": False,
                "medicaments_corticoides": False,
                "acanthosis_nigricans": False,
                "taille_cm": 174.0,
                "high_glucose_hist": False,
            },
            "contexte": {
                "type_soumission": "AGENT",
                "role_soumetteur": "AGENT_SOINS_PRIMAIRES",
            },
        }

    def test_1_normal_evaluation_returns_correct_shape(self):
        """Cas 1: L'évaluation normale retourne la structure attendue avec score, niveau_risque et _supplement."""
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {"ML_MODE": ""}):
            res = ClientMoteurRisque.evaluer(self.sample_payload)

            self.assertIsInstance(res, dict)
            self.assertIn("score", res)
            self.assertIn("niveau_risque", res)
            self.assertIn("facteurs", res)
            self.assertIn("version_moteur", res)
            self.assertIn("_supplement", res)

            supp = res["_supplement"]
            self.assertIn("findrisc", supp)
            self.assertIn("score", supp["findrisc"])
            self.assertIn("detector", supp)
            self.assertIn("probability", supp["detector"])

    def test_2_ml_failure_raises_connection_error_no_stub_fallback(self):
        """Cas 2: Règle 1 - En cas d'erreur du module ML, ConnectionError est levée SANS fallback stub."""
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {"ML_MODE": ""}):
            with patch(
                "apps.risk_engine.client._ml_adapter.run_pipeline",
                side_effect=RuntimeError("Panne ML simulée")
            ):
                with self.assertRaises(ConnectionError) as ctx:
                    ClientMoteurRisque.evaluer(self.sample_payload)
                self.assertIn("Échec de l'évaluation ML", str(ctx.exception))
                self.assertIsInstance(ctx.exception.__cause__, RuntimeError)

    def test_3_ml_mode_stub_returns_stub_response(self):
        """Cas 3: Règle 1 - Le stub est utilisé UNIQUEMENT si ML_MODE=stub explicitement défini."""
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {"ML_MODE": "stub"}):
            res = ClientMoteurRisque.evaluer(self.sample_payload)

            self.assertIsInstance(res, dict)
            self.assertIn("score", res)
            self.assertIn("niveau_risque", res)
            self.assertEqual(res.get("version_moteur"), "stub-1.0")

    def test_4_evaluer_avec_dmi_fhir_unavailable_proceeds_without_dmi(self):
        """Cas 4: evaluer_avec_dmi avec FHIR indisponible procède sans bloquer et injecte _dmi_unavailable=True."""
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {"ML_MODE": ""}):
            with patch(
                "apps.fhir_bridge.client.ClientHapiFhir.lire_dossier_patient",
                return_value={"dmi_disponible": False}
            ):
                payload = dict(self.sample_payload)
                res = ClientMoteurRisque.evaluer_avec_dmi(payload, ins="TUN10001234")

                self.assertIsInstance(res, dict)
                self.assertIn("score", res)
                self.assertTrue(payload.get("_dmi_unavailable", False))
                self.assertNotIn("_dmi", payload)

    def test_legacy_signature_compatibility(self):
        """Vérifie la compatibilité ascendante avec l'ancienne signature à 3 arguments."""
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {"ML_MODE": ""}):
            res = ClientMoteurRisque.evaluer(
                "TUN10001234",
                self.sample_payload["donnees_questionnaire"],
                self.sample_payload["contexte"]
            )
            self.assertIsInstance(res, dict)
            self.assertIn("score", res)
            self.assertIn("niveau_risque", res)
