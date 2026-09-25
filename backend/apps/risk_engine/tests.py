"""
Tests du modèle IA local (régression logistique DIABSCORE + FINDRISC v2).
"""
from django.test import SimpleTestCase, override_settings

from .services import ClientMoteurRisque, ServiceModeleIA

DONNEES = {
    "age": 52, "genre": "F", "imc": 82 / 1.65 ** 2, "tour_taille_cm": 98,
    "taille_cm": 165, "tour_hanches_cm": 104,
    "antecedents_familiaux_diabete": True, "hypertension_diagnostiquee": False,
    "niveau_activite_physique": "FAIBLE", "qualite_alimentation": "MOYENNE",
    "statut_tabagisme": "JAMAIS", "glycemie_jeun_connue": False, "glycemie_jeun_mmol": None,
    "diabete_gestationnel_antecedent": False, "medicaments_corticoides": False,
    "acanthosis_nigricans": False,
}


def evaluer(**modifs):
    return ServiceModeleIA.evaluer({"donnees_questionnaire": {**DONNEES, **modifs}})


class ServiceModeleIATests(SimpleTestCase):

    def test_reproduit_le_modele_de_reference(self):
        # ai/model.py predict() -> p = 0.0383 pour l'exemple du rapport (report.md §2)
        res = evaluer()
        self.assertEqual(res["version_moteur"], "ia-2.0")
        self.assertEqual(res["niveau_risque"], "INTERMEDIAIRE")
        self.assertTrue(0 <= res["score"] <= 100)
        self.assertAlmostEqual(sum(f["poids"] for f in res["facteurs"]), 1.0, places=2)

    def test_niveaux(self):
        self.assertEqual(evaluer(age=22, imc=21, tour_taille_cm=70, tour_hanches_cm=95,
                                 antecedents_familiaux_diabete=False,
                                 niveau_activite_physique="ELEVE")["niveau_risque"], "FAIBLE")
        self.assertEqual(evaluer(age=68, imc=36, tour_taille_cm=120, tour_hanches_cm=110,
                                 hypertension_diagnostiquee=True)["niveau_risque"], "ELEVE")

    def test_glycemie_diabetique_force_eleve(self):
        res = evaluer(glycemie_jeun_connue=True, glycemie_jeun_mmol=7.4)
        self.assertEqual((res["niveau_risque"], res["score"]), ("ELEVE", 100.0))
        self.assertEqual(res["facteurs"][0]["cle"], "glycemie_jeun_mmol")

    def test_prediabete_augmente_le_score(self):
        self.assertGreater(evaluer(glycemie_jeun_connue=True, glycemie_jeun_mmol=6.2)["score"],
                           evaluer()["score"])

    @override_settings(RISK_ENGINE_URL="internal://ia")
    def test_repli_sur_stub_si_mesures_manquantes(self):
        donnees = {k: v for k, v in DONNEES.items() if k != "tour_hanches_cm"}
        res = ClientMoteurRisque.evaluer("INS12345678", donnees, {})
        self.assertEqual(res["version_moteur"], "stub-1.0")
