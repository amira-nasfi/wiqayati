"""
Générateur de plans de soins types (nutrition et activité physique)
selon le niveau de risque de diabète de type 2 (FAIBLE, INTERMÉDIAIRE, ÉLEVÉ).
Entièrement rédigé en français et adapté au contexte tunisien.
"""
from typing import Dict, Any, Tuple


class GenerateurPlanSoin:
    """
    Produit un plan de soin initial (nutrition + activité physique) adapté au niveau de risque.
    """

    @classmethod
    def generer_plans(cls, niveau_risqu: str, facteurs: list = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
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
                "conseils_specifiques": "Structurer les assiettes selon le modèle santé : 1/2 légumes, 1/4 protéines maigres, 1/4 féculents complets.",
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
