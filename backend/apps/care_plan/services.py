"""
Générateur de plans de soins types (nutrition et activité physique)
selon le niveau de risque de diabète de type 2 (FAIBLE, INTERMÉDIAIRE, ÉLEVÉ).
Entièrement rédigé en français et adapté au contexte tunisien.

Phase 2 : Enrichissement via protocol_engine ML si disponible.
Le moteur ML génère des items personnalisés (activité, nutrition, orientation médicale).
En cas d'indisponibilité, le générateur statique par niveau de risque est utilisé en fallback.
"""
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)


class GenerateurPlanSoin:
    """
    Produit un plan de soin initial (nutrition + activité physique) adapté au niveau de risque.

    Stratégie :
    1. Si un protocole ML est fourni (issu de protocol_engine via ServiceProtocoleML),
       extrait les items nutrition/activité personnalisés et les utilise.
    2. Sinon (fallback), applique les plans statiques par niveau de risque.
    """

    @classmethod
    def _plan_depuis_protocole_ml(cls, protocole_ml: Dict[str, Any]) -> Tuple[Optional[Dict], Optional[Dict]]:
        """
        Extrait les recommandations nutrition et activité depuis un protocole ML généré.
        Retourne (None, None) si le protocole ne contient pas les sections attendues.
        """
        if not protocole_ml or "items" not in protocole_ml:
            return None, None

        items = protocole_ml.get("items", [])
        nutrition_items = [
            i for i in items
            if i.get("category") in ("diet", "nutrition", "alimentation")
        ]
        activite_items = [
            i for i in items
            if i.get("category") in ("activity", "exercise", "activite", "activité", "activite_physique")
        ]
        medical_items = [
            i for i in items
            if i.get("category") in ("medical", "referral", "clinical", "consultation", "suivi")
        ]

        if not nutrition_items and not activite_items:
            return None, None

        # Construction du plan nutrition depuis les items ML
        nutrition_objectifs = [
            i.get("action") or i.get("recommendation", "")
            for i in nutrition_items
            if i.get("action") or i.get("recommendation")
        ]
        if not nutrition_objectifs:
            nutrition_objectifs = [i.get("text", "") for i in nutrition_items if i.get("text")]

        medical_notes = ""
        if medical_items:
            reasons = [
                i.get("action") or i.get("recommendation", "")
                for i in medical_items
                if i.get("action") or i.get("recommendation")
            ]
            if reasons:
                medical_notes = " | ".join(reasons[:2])

        nutrition = {
            "titre": protocole_ml.get("summary", "Plan nutritionnel personnalisé (IA)"),
            "objectifs": nutrition_objectifs or ["Suivre les recommandations nutritionnelles personnalisées."],
            "conseils_specifiques": medical_notes or protocole_ml.get("patient_summary", ""),
            "frequence_suivi": "Selon recommandation médicale",
            "source_moteur": "wq-ml-1.0",
            "protocole_id": protocole_ml.get("protocol_id"),
        }

        # Construction du plan activité depuis les items ML
        activite_objectifs = [
            i.get("action") or i.get("recommendation", "")
            for i in activite_items
            if i.get("action") or i.get("recommendation")
        ]
        if not activite_objectifs:
            activite_objectifs = [i.get("text", "") for i in activite_items if i.get("text")]

        activite = {
            "titre": "Programme d'activité physique personnalisé (IA)",
            "objectifs": activite_objectifs or ["Suivre le programme d'activité physique adapté."],
            "recommandations": protocole_ml.get("disclaimer", "Intensité progressive selon tolérance individuelle."),
            "source_moteur": "wq-ml-1.0",
            "urgent_flags": protocole_ml.get("urgent_flags", []),
            "requires_medical_referral": protocole_ml.get("requires_medical_referral", False),
        }

        return nutrition, activite

    @classmethod
    def generer_plans(
        cls,
        niveau_risqu: str,
        facteurs: list = None,
        protocole_ml: Dict[str, Any] = None
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Génère les plans nutrition et activité.
        Si protocole_ml est fourni (depuis ServiceProtocoleML), l'utilise en priorité.
        Sinon, applique les règles statiques par niveau de risque.
        """
        # Tentative d'utilisation du protocole ML
        if protocole_ml:
            nutrition_ml, activite_ml = cls._plan_depuis_protocole_ml(protocole_ml)
            if nutrition_ml and activite_ml:
                logger.info("Plan de soin généré depuis le moteur ML (protocol_engine).")
                return nutrition_ml, activite_ml
            else:
                logger.warning("Protocole ML présent mais items insuffisants, bascule sur règles statiques.")

        # Fallback : règles statiques par niveau de risque
        return cls._generer_plans_statiques(niveau_risqu)

    @classmethod
    def _generer_plans_statiques(cls, niveau_risqu: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Plans statiques de référence selon le niveau de risque."""
        if niveau_risqu == "FAIBLE":
            nutrition = {
                "titre": "Alimentation préventive et équilibrée",
                "objectifs": [
                    "Maintenir un apport régulier en fibres et céréales complètes",
                    "Limiter les sucres ajoutés, sodas et pâtisseries traditionnelles très sucrées",
                    "Favoriser la consommation de légumes de saison (régime méditerranéen tunisien)",
                    "Préférer l'huile d'olive comme matière grasse principale",
                    "Hydratation minimale de 1,5 à 2 litres d'eau par jour"
                ],
                "conseils_specifiques": "Adopter des repas à heures régulières sans sauter de prise alimentaire.",
                "frequence_suivi": "Auto-évaluation annuelle recommandée"
            }
            activite = {
                "titre": "Maintien d'un mode de vie actif",
                "objectifs": [
                    "Pratiquer au moins 150 minutes d'activité d'intensité modérée par semaine (marche rapide, vélo)",
                    "Réduire les périodes prolongées de position assise continue",
                    "Viser environ 7 000 à 10 000 pas quotidiens"
                ],
                "recommandations": "Privilégier la marche quotidienne pour les trajets de proximité."
            }

        elif niveau_risqu == "INTERMEDIAIRE":
            nutrition = {
                "titre": "Réajustement nutritionnel et contrôle glycémique préventif",
                "objectifs": [
                    "Contrôler la charge glycémique des repas : substituer le pain blanc par du pain complet ou de son",
                    "Augmenter significativement la part des légumineuses (lentilles, pois chiches, fèves)",
                    "Réduire les fritures et produits ultra-transformés",
                    "Consommer 2 portions de fruits frais entiers par jour en dehors des gros repas",
                    "Éviter les boissons gazeuses et jus industriels"
                ],
                "conseils_specifiques": (
                    "Structurer les assiettes selon le modèle santé : "
                    "1/2 légumes, 1/4 protéines maigres, 1/4 féculents complets."
                ),
                "frequence_suivi": "Bilan nutritionnel trimestriel conseillé"
            }
            activite = {
                "titre": "Programme régulier de reprise d'activité",
                "objectifs": [
                    "Atteindre 30 minutes de marche active ou activité cardio 5 jours sur 7",
                    "Intégrer 2 séances légères de renforcement musculaire par semaine",
                    "Interrompre la position assise toutes les 60 minutes par quelques minutes de marche"
                ],
                "recommandations": "Intensité progressive. Surveillance du souffle et confort articulaire."
            }

        else:  # ELEVE
            nutrition = {
                "titre": "Plan nutritionnel strict sous encadrement spécialisé",
                "objectifs": [
                    "Suppression complète des sucres simples rapides (sodas, sucre de table, confiseries)",
                    "Contrôle strict des portions de glucides complexes à chaque repas",
                    "Régime riche en fibres solubles pour lisser les pics postprandiaux",
                    "Privilégier les viandes blanches, poissons, légumineuses et œufs",
                    "Planification personnalisée avec le nutritionniste référent"
                ],
                "conseils_specifiques": "Tenir un carnet alimentaire hebdomadaire à présenter en consultation.",
                "frequence_suivi": "Consultation nutritionnelle mensuelle prioritaire"
            }
            activite = {
                "titre": "Programme actif structuré sous avis médical",
                "objectifs": [
                    "Activité physique modérée quotidienne : au moins 30 à 45 minutes par jour",
                    "Marche postprandiale de 10 à 15 minutes après les principaux repas",
                    "Renforcement musculaire adapté 2 à 3 fois par semaine"
                ],
                "recommandations": "Début progressif sous encadrement. Bilan cardiologique préalable si nécessaire."
            }

        return nutrition, activite
