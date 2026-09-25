/**
 * StatutDernierBilan — Composant Wiqayati Mobile
 * Carte de synthèse du dernier dépistage, affichée en haut de l'écran Dossier.
 *
 * Décisions (plan v2) :
 * - CTA adaptatif : 6 mois si ELEVE, 12 mois si FAIBLE/INTERMEDIAIRE (C4)
 * - Pas de badge "Ministère de la Santé" (demande utilisateur)
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { WiqayatiTokens } from '../constants/theme';

interface Evaluation {
  id: string;
  evalue_le: string;
  score: number;
  niveau_risque: 'FAIBLE' | 'INTERMEDIAIRE' | 'ELEVE';
  niveau_risque_libelle: string;
}

interface StatutDernierBilanProps {
  evaluations: Evaluation[];
  onNaviguerEvaluation: () => void;
  onNaviguerPlan: () => void;
}

// ── Seuils de rappel selon le niveau de risque (C4) ─────────────────────────
const SEUIL_MOIS: Record<string, number> = {
  ELEVE: 6,
  INTERMEDIAIRE: 12,
  FAIBLE: 12,
};

// ── Couleurs des badges de risque ────────────────────────────────────────────
const STYLE_RISQUE = {
  ELEVE:        WiqayatiTokens.colors.risk.eleve,
  INTERMEDIAIRE: WiqayatiTokens.colors.risk.intermediaire,
  FAIBLE:        WiqayatiTokens.colors.risk.faible,
};

const ICONE_RISQUE: Record<string, string> = {
  ELEVE: '⚠️',
  INTERMEDIAIRE: '⚡',
  FAIBLE: '✅',
};

export function StatutDernierBilan({
  evaluations,
  onNaviguerEvaluation,
  onNaviguerPlan,
}: StatutDernierBilanProps) {
  const derniere = evaluations.length > 0 ? evaluations[0] : null;

  const calculerMoisDepuis = useCallback((dateStr: string): number => {
    const debut = new Date(dateStr);
    const maintenant = new Date();
    return (
      (maintenant.getFullYear() - debut.getFullYear()) * 12 +
      (maintenant.getMonth() - debut.getMonth())
    );
  }, []);

  // Aucune évaluation encore
  if (!derniere) {
    return (
      <View style={[styles.carte, WiqayatiTokens.shadows.card]}>
        <View style={styles.enTete}>
          <Text style={styles.labelSection}>DÉPISTAGE</Text>
        </View>
        <View style={styles.contenu}>
          <Text style={styles.titreVide}>Aucun bilan réalisé</Text>
          <Text style={styles.texteVide}>
            Effectuez votre premier dépistage pour connaître votre score FINDRISC.
          </Text>
          <TouchableOpacity
            style={styles.btnPrimaire}
            onPress={onNaviguerEvaluation}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaireTexte}>🔬 Démarrer l'évaluation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const moisDepuis = calculerMoisDepuis(derniere.evalue_le);
  const seuilMois = SEUIL_MOIS[derniere.niveau_risque] ?? 12;
  const doitRefaire = moisDepuis >= seuilMois;
  const risqueStyle = STYLE_RISQUE[derniere.niveau_risque] ?? STYLE_RISQUE.FAIBLE;
  const icone = ICONE_RISQUE[derniere.niveau_risque] ?? '📋';

  const dateFormatee = new Date(derniere.evalue_le).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.carte, WiqayatiTokens.shadows.card]}>
      {/* En-tête */}
      <View style={styles.enTete}>
        <Text style={styles.labelSection}>MON DERNIER BILAN</Text>
        <Text style={styles.dateLabel}>{dateFormatee}</Text>
      </View>

      {/* Badge de risque principal */}
      <View
        style={[
          styles.badgeRisque,
          {
            backgroundColor: risqueStyle.surface,
            borderColor: risqueStyle.border,
          },
        ]}
      >
        <Text style={styles.badgeRisqueIcone}>{icone}</Text>
        <View style={styles.badgeRisqueTextes}>
          <Text style={[styles.badgeRisqueNiveau, { color: risqueStyle.text }]}>
            {derniere.niveau_risque_libelle ?? derniere.niveau_risque}
          </Text>
          <Text style={[styles.badgeRisqueScore, { color: risqueStyle.text }]}>
            Score FINDRISC : {derniere.score} / 100
          </Text>
        </View>
      </View>

      {/* CTA conditionnel adaptatif (C4) */}
      {doitRefaire && (
        <View style={styles.rappelContainer}>
          <Text style={styles.rappelTexte}>
            {derniere.niveau_risque === 'ELEVE'
              ? `⏰ Réévaluation recommandée tous les ${seuilMois} mois pour votre profil.`
              : `⏰ Une nouvelle évaluation est recommandée tous les ${seuilMois} mois.`}
          </Text>
          <TouchableOpacity
            style={styles.btnPrimaire}
            onPress={onNaviguerEvaluation}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaireTexte}>Refaire mon évaluation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lien rapide vers le plan */}
      <TouchableOpacity
        style={styles.lienPlan}
        onPress={onNaviguerPlan}
        activeOpacity={0.7}
      >
        <Text style={styles.lienPlanTexte}>📋 Consulter mon plan nutritionnel →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderRadius: WiqayatiTokens.radii.lg,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },

  enTete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelSection: {
    ...WiqayatiTokens.typography.label,
    color: WiqayatiTokens.colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  dateLabel: {
    ...WiqayatiTokens.typography.caption,
    color: WiqayatiTokens.colors.textMuted,
  },

  // Badge de risque
  badgeRisque: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: WiqayatiTokens.radii.md,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  badgeRisqueIcone: {
    fontSize: 24,
  },
  badgeRisqueTextes: {
    flex: 1,
  },
  badgeRisqueNiveau: {
    ...WiqayatiTokens.typography.h3,
  },
  badgeRisqueScore: {
    ...WiqayatiTokens.typography.caption,
    marginTop: 2,
  },

  // Rappel CTA
  rappelContainer: {
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  rappelTexte: {
    ...WiqayatiTokens.typography.caption,
    color: WiqayatiTokens.colors.textSecondary,
  },

  // Bouton principal
  btnPrimaire: {
    backgroundColor: WiqayatiTokens.colors.primary,
    borderRadius: WiqayatiTokens.radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
  },
  btnPrimaireTexte: {
    ...WiqayatiTokens.typography.bodyMedium,
    color: WiqayatiTokens.colors.textInverse,
  },

  // Lien plan
  lienPlan: {
    paddingVertical: 6,
  },
  lienPlanTexte: {
    ...WiqayatiTokens.typography.caption,
    color: WiqayatiTokens.colors.primary,
    fontWeight: '700' as const,
  },

  // État vide
  titreVide: {
    ...WiqayatiTokens.typography.h3,
    color: WiqayatiTokens.colors.textPrimary,
    marginBottom: 6,
  },
  texteVide: {
    ...WiqayatiTokens.typography.body,
    color: WiqayatiTokens.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  contenu: {
    gap: 4,
  },
});
