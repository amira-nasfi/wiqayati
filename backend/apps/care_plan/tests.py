"""
backend/apps/care_plan/tests.py - Tests de sécurité et de conformité pour AgentHybridePlanSoin.

Vérifie les 3 cas exigés dans le Task 1 :
  1. Le LLM retourne un JSON valide avec action/target reformulés
     -> assert prose_source="llm", item count inchangé
  2. Le LLM retourne un JSON invalide
     -> assert fallback retourne le protocole déterministe avec prose_source="deterministic"
  3. Le LLM retourne un JSON avec un item SUPPLÉMENTAIRE non présent dans la baseline
     -> assert l'item supplémentaire est ignoré / supprimé
"""
import json
from unittest.mock import patch
from django.test import TestCase
from apps.care_plan.agent_hybride import AgentHybridePlanSoin


class TestAgentHybrideSecurite(TestCase):

    def setUp(self):
        self.assessment = {
            "niveau_risque": "INTERMEDIAIRE",
            "score": 55,
            "facteurs": [{"code": "AGE_AVANCE", "libelle": "Âge"}],
            "future_risk": {"band": "moderate", "score": 14, "ten_year_risk_pct": 17.0},
            "detect_now": {"probability": 0.42, "flagged": False},
        }
        self.form = {
            "age": 47,
            "genre": "M",
            "imc": 28.5,
            "taille_cm": 175.0,
            "tour_taille_cm": 95.0,
            "antecedents_familiaux_diabete": True,
            "hypertension_diagnostiquee": False,
            "niveau_activite_physique": "FAIBLE",
            "qualite_alimentation": "MAUVAISE",
            "statut_tabagisme": "NON_FUMEUR",
            "glycemie_jeun_connue": False,
            "glycemie_jeun_mmol": None,
            "diabete_gestationnel_antecedent": False,
            "medicaments_corticoides": False,
            "acanthosis_nigricans": False,
            "high_glucose_hist": False,
        }

    def test_1_llm_valid_json_rephrased_preserves_count_and_sets_prose_source_llm(self):
        """Cas 1: Le LLM renvoie un JSON valide reformulé -> prose_source='llm', nombre d'items inchangé."""
        agent = AgentHybridePlanSoin(self.assessment, self.form)
        baseline = agent._generer_baseline_deterministe()
        baseline_count = len(baseline["items"])
        self.assertGreater(baseline_count, 0)

        # Simuler un retour LLM qui reformule les items de la baseline
        rephrased_items = []
        for it in baseline["items"]:
            rephrased_items.append({
                "trigger": it["trigger"],
                "action": f"Action reformulée par LLM pour {it['trigger']}",
                "target": f"Cible reformulée par LLM pour {it['trigger']}",
            })

        mock_llm_response = json.dumps({"items": rephrased_items})

        with patch("apps.care_plan.agent_hybride._PROVIDER", return_value="gemini"):
            with patch.object(AgentHybridePlanSoin, "_appeler_llm", return_value=mock_llm_response):
                rapport = agent.generer_plan()

                items = rapport["protocol"]["items"]
                self.assertEqual(len(items), baseline_count)
                for it in items:
                    self.assertEqual(it["metadata"]["prose_source"], "llm")
                    self.assertTrue(it["action"].startswith("Action reformulée par LLM"))

    def test_2_llm_invalid_json_fallback_returns_deterministic_prose_source(self):
        """Cas 2: Le LLM renvoie du JSON invalide -> bascule sur la baseline déterministe
        avec prose_source='deterministic'."""
        agent = AgentHybridePlanSoin(self.assessment, self.form)
        baseline = agent._generer_baseline_deterministe()
        baseline_count = len(baseline["items"])

        # Texte non JSON
        mock_invalid = "Désolé, voici mon analyse clinique sans format JSON : faites du sport..."

        with patch("apps.care_plan.agent_hybride._PROVIDER", return_value="gemini"):
            with patch.object(AgentHybridePlanSoin, "_appeler_llm", return_value=mock_invalid):
                rapport = agent.generer_plan()

                items = rapport["protocol"]["items"]
                self.assertEqual(len(items), baseline_count)
                for it in items:
                    self.assertEqual(it["metadata"]["prose_source"], "deterministic")

    def test_3_llm_extra_item_dropped_strictly(self):
        """Cas 3: Le LLM tente d'injecter un item non présent dans la baseline -> l'item pirate est rejeté."""
        agent = AgentHybridePlanSoin(self.assessment, self.form)
        baseline = agent._generer_baseline_deterministe()
        baseline_count = len(baseline["items"])

        # Items baseline + 1 item pirate non présent
        rephrased_items = []
        for it in baseline["items"]:
            rephrased_items.append({
                "trigger": it["trigger"],
                "action": f"Reformulation de {it['trigger']}",
                "target": f"Cible de {it['trigger']}",
            })

        # Ajout pirate
        rephrased_items.append({
            "trigger": "medicament_metformine_500mg",
            "action": "Prendre 500mg de metformine chaque matin.",
            "target": "Glycémie < 100",
        })

        mock_llm_response = json.dumps({"items": rephrased_items})

        with patch("apps.care_plan.agent_hybride._PROVIDER", return_value="gemini"):
            with patch.object(AgentHybridePlanSoin, "_appeler_llm", return_value=mock_llm_response):
                rapport = agent.generer_plan()

                items = rapport["protocol"]["items"]
                self.assertEqual(len(items), baseline_count)
                triggers = [it["trigger"] for it in items]
                self.assertNotIn("medicament_metformine_500mg", triggers)
