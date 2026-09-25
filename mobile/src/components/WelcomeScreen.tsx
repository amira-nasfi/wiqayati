/**
 * Écran d'accueil (Welcome Screen) — Wiqayati Mobile
 * Présentation bienveillante et moderne de la plateforme avant la connexion.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WiqayatiTokens } from '../constants/theme';

interface WelcomeScreenProps {
  onConnexion: () => void;
}

const PILIERS = [
  {
    icone: '🔬',
    titre: 'Dépistage FINDRISC',
    description: 'Évaluez vos facteurs de risque métabolique en moins de 2 minutes avec un score clinique validé.',
    accentColor: WiqayatiTokens.colors.primary,
  },
  {
    icone: '🥗',
    titre: 'Plan Personnalisé',
    description: 'Objectifs nutritionnels et activité physique établis par votre soignant référent.',
    accentColor: WiqayatiTokens.colors.accent,
  },
  {
    icone: '📊',
    titre: 'Suivi Quotidien',
    description: 'Cochez vos habitudes jour après jour et maintenez votre équilibre de vie.',
    accentColor: WiqayatiTokens.colors.primary,
  },
  {
    icone: '🔒',
    titre: 'Espace Sécurisé',
    description: 'Accédez à votre dossier médical grâce à votre Identifiant National de Santé (INS).',
    accentColor: WiqayatiTokens.colors.accent,
  },
];

export default function WelcomeScreen({ onConnexion }: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={WiqayatiTokens.colors.canvas} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── En-tête héro ── */}
        <View style={styles.heroSection}>
          <View style={styles.badgeTop}>
            <Text style={styles.badgeTopTexte}>🛡️ Santé Publique & Prévention</Text>
          </View>

          <View style={styles.logoConteneur}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLettre}>W</Text>
            </View>
          </View>

          <Text style={styles.appNom}>Wiqayati</Text>
          <Text style={styles.heroTitre}>
            Agir aujourd'hui contre le diabète de type 2
          </Text>
          <Text style={styles.heroDescription}>
            Votre parcours complet : auto-évaluation FINDRISC, recommandations diététiques validées et suivi quotidien de vos habitudes.
          </Text>
        </View>

        {/* ── Piliers de la plateforme ── */}
        <View style={styles.piliersSection}>
          <Text style={styles.piliersTitreSection}>CE QUE PROPOSE WIQAYATI</Text>
          
          <View style={styles.piliersGrille}>
            {PILIERS.map((pilier, idx) => (
              <View
                key={idx}
                style={[styles.pilierCard, WiqayatiTokens.shadows.card]}
              >
                <View style={[styles.pilierIconeWrap, { backgroundColor: pilier.accentColor + '18' }]}>
                  <Text style={styles.pilierIcone}>{pilier.icone}</Text>
                </View>
                <View style={styles.pilierTextes}>
                  <Text style={styles.pilierTitre}>{pilier.titre}</Text>
                  <Text style={styles.pilierDescription}>{pilier.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Garanties & Confiance ── */}
        <View style={styles.garantiesRow}>
          <View style={styles.garantieItem}>
            <Text style={styles.garantieCheck}>✓</Text>
            <Text style={styles.garantieTexte}>Gratuit & Accessible</Text>
          </View>
          <View style={styles.garantieItem}>
            <Text style={styles.garantieCheck}>✓</Text>
            <Text style={styles.garantieTexte}>Validé Médicalement</Text>
          </View>
          <View style={styles.garantieItem}>
            <Text style={styles.garantieCheck}>✓</Text>
            <Text style={styles.garantieTexte}>Données Sécurisées</Text>
          </View>
        </View>

        {/* ── Bouton d'action principal ── */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.btnPrincipal, WiqayatiTokens.shadows.elevated]}
            onPress={onConnexion}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrincipalTexte}>Accéder à mon espace →</Text>
          </TouchableOpacity>

          <Text style={styles.actionAide}>
            Connexion réservée aux citoyens munis de leur INS
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WiqayatiTokens.colors.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: WiqayatiTokens.colors.canvas,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Héro
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  badgeTop: {
    backgroundColor: WiqayatiTokens.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: WiqayatiTokens.radii.full,
    marginBottom: 16,
  },
  badgeTopTexte: {
    color: WiqayatiTokens.colors.primary,
    ...WiqayatiTokens.typography.label,
  },
  logoConteneur: {
    marginBottom: 12,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: WiqayatiTokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: WiqayatiTokens.colors.surfaceHighlight,
    ...WiqayatiTokens.shadows.elevated,
  },
  logoLettre: {
    color: WiqayatiTokens.colors.textInverse,
    fontSize: 40,
    fontWeight: '900',
  },
  appNom: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.h1,
    fontSize: 28,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heroTitre: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.h2,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 10,
    maxWidth: 320,
  },
  heroDescription: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.body,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },

  // Piliers
  piliersSection: {
    marginBottom: 24,
  },
  piliersTitreSection: {
    ...WiqayatiTokens.typography.micro,
    color: WiqayatiTokens.colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 14,
    textAlign: 'center',
  },
  piliersGrille: {
    gap: 12,
  },
  pilierCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: WiqayatiTokens.colors.surface,
    borderRadius: WiqayatiTokens.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    gap: 14,
  },
  pilierIconeWrap: {
    width: 44,
    height: 44,
    borderRadius: WiqayatiTokens.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pilierIcone: {
    fontSize: 22,
  },
  pilierTextes: {
    flex: 1,
  },
  pilierTitre: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.h3,
    marginBottom: 3,
  },
  pilierDescription: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.caption,
    lineHeight: 18,
  },

  // Garanties
  garantiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    borderRadius: WiqayatiTokens.radii.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.borderSubtle,
  },
  garantieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  garantieCheck: {
    color: WiqayatiTokens.colors.accent,
    fontWeight: '900',
    fontSize: 12,
  },
  garantieTexte: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.micro,
    fontWeight: '700',
  },

  // Action
  actionContainer: {
    alignItems: 'center',
  },
  btnPrincipal: {
    backgroundColor: WiqayatiTokens.colors.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: WiqayatiTokens.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrincipalTexte: {
    color: WiqayatiTokens.colors.textInverse,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  actionAide: {
    color: WiqayatiTokens.colors.textMuted,
    ...WiqayatiTokens.typography.micro,
    marginTop: 10,
  },
});
