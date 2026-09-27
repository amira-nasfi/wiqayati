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
