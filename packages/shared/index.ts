/**
 * Types partagés pour la plateforme Wiqayati
 * Conforme au contrat figé risk-engine-contract.json v1.0
 */

export type RoleUtilisateur =
  | 'AGENT_CAMPAGNE'
  | 'AGENT_SOINS_PRIMAIRES'
  | 'NUTRITIONNISTE'
  | 'ADMIN_MINISTERE'
  | 'ADMIN_IT'
  | 'CITOYEN';

export type NiveauRisqueType = 'FAIBLE' | 'INTERMEDIAIRE' | 'ELEVE';

export type PrioriteTacheType = 'STAT' | 'URGENT' | 'ROUTINE';

export type StatutPlanType = 'BROUILLON' | 'VALIDE' | 'REJETE';

export type StatutTacheType = 'DEMANDE' | 'EN_COURS' | 'COMPLETE' | 'REJETE';

export interface FacteurRisque {
  cle: string;
  libelle: string;
  poids: number;
  valeur: any;
  seuil: any;
  direction: 'AU_DESSUS' | 'EN_DESSOUS' | 'PRESENT' | 'ABSENT';
}

export interface EvaluationRisque {
  id: string;
  niveau_risque: NiveauRisqueType;
  niveau_risque_libelle: string;
  score: number;
  facteurs: FacteurRisque[];
  version_moteur: string;
  evalue_le: string;
}

export interface ProfilPatient {
  id: string;
  ins: string;
  prenom: string;
  nom: string;
  date_naissance: string;
  genre: 'M' | 'F';
  telephone?: string;
  gouvernorat: string;
  fhir_resource_id?: string;
  cree_le: string;
}

export interface ReponseScreening {
  id: string;
  patient: string;
  soumis_par?: string;
  type_soumission: 'CAMPAGNE' | 'SOINS_PRIMAIRES' | 'AUTO_EVALUATION';
  version_questionnaire: string;
  donnees: Record<string, any>;
  soumis_le: string;
  evaluation_risque?: EvaluationRisque;
}

export interface PlanSoin {
  id: string;
  patient: ProfilPatient;
  evaluation_risque: EvaluationRisque;
  plan_nutrition: {
    titre: string;
    objectifs: string[];
    conseils_specifiques?: string;
    frequence_suivi?: string;
  };
  plan_activite: {
    titre: string;
    objectifs: string[];
    recommandations?: string;
  };
  notes_nutritionniste?: string;
  statut: StatutPlanType;
  statut_libelle: string;
  motif_rejet?: string;
  genere_le: string;
  valide_le?: string;
  valide_par_nom?: string;
}

export interface TacheNutritionniste {
  id: string;
  plan_id: string;
  patient: {
    id: string;
    ins: string;
    prenom: string;
    nom: string;
    date_naissance: string;
    genre: 'M' | 'F';
    gouvernorat: string;
  };
  niveau_risque: NiveauRisqueType;
  score_risque: number;
  priorite: PrioriteTacheType;
  priorite_libelle: string;
  statut: StatutTacheType;
  statut_libelle: string;
  assigne_a_nom?: string;
  cree_le: string;
  pris_en_charge_le?: string;
  complete_le?: string;
}

export interface UtilisateurSession {
  id: string;
  identifiant: string;
  nom_complet: string;
  prenom: string;
  nom: string;
  email: string;
  role: RoleUtilisateur;
  role_libelle: string;
  gouvernorat?: string;
  expire_le?: string | null;
  mot_de_passe_temporaire: boolean;
}
