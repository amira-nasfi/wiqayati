/**
 * Écran Mon Plan — Wiqayati Mobile (Citoyen)
 * Plan de nutrition et d'activité physique validé par le praticien nutritionniste.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import apiMobile from '../api/client';
import { WiqayatiTokens } from '../constants/theme';

interface PlanActif {
  a_un_plan_valide: boolean;
  message?: string;
  valide_le?: string;
  notes_nutritionniste?: string;
  plan_nutrition?: {
    titre: string;
    objectifs: string[];
    conseils_specifiques?: string;
  };
  plan_activite?: {
    titre: string;
    objectifs: string[];
    frequence_hebdomadaire?: number;
    duree_seance_minutes?: number;
  };
}

export default function PlanSoinCitoyenScreen() {
  const [plan, setPlan] = useState<PlanActif | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);

  const chargerPlan = useCallback(async () => {
    try {
      const resp = await apiMobile.get('/citoyen/moi/plan-actif/');
      setPlan(resp.data);
    } catch {
      setPlan({ a_un_plan_valide: false });
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, []);

  useEffect(() => {
    chargerPlan();
  }, [chargerPlan]);

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={WiqayatiTokens.colors.primary} />
        <Text style={styles.texteChargement}>Récupération de vos recommandations médicales…</Text>
      </View>
    );
  }

  if (!plan?.a_un_plan_valide) {
    return (
      <View style={styles.centre}>
        <View style={styles.cadreAttente}>
          <Text style={styles.titreAttente}>Dossier en cours d'examen</Text>
          <Text style={styles.texteAttente}>
            {plan?.message ??
              "Votre dossier de dépistage est actuellement analysé par un nutritionniste référent."}
          </Text>
          <Text style={styles.texteConseil}>
            Vos recommandations alimentaires personnalisées et votre programme d'activité physique apparaîtront ici dès leur validation.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={() => { setRafraichissement(true); chargerPlan(); }}
          tintColor={WiqayatiTokens.colors.primary}
        />
      }
    >
      {/* ── Repère de validation clinique ── */}
      <View style={styles.bandeauValidation}>
        <View style={styles.pointValidation} />
        <Text style={styles.texteValidation}>
          Protocole validé le{' '}
          {plan.valide_le ? new Date(plan.valide_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          {' '}par le nutritionniste référent
        </Text>
      </View>

      {/* ── Volet Nutrition ── */}
      <View style={styles.ficheClinique}>
        <View style={styles.enteteFiche}>
          <Text style={styles.titreSection}>Recommandations nutritionnelles</Text>
          {plan.plan_nutrition?.titre && (
            <Text style={styles.sousTitreSection}>{plan.plan_nutrition.titre}</Text>
          )}
        </View>

        {plan.plan_nutrition?.objectifs?.map((obj, i) => (
          <View key={i} style={styles.ligneObjectif}>
            <View style={styles.indicateurObjectif} />
            <Text style={styles.texteObjectif}>{obj}</Text>
          </View>
        ))}

        {plan.plan_nutrition?.conseils_specifiques && (
          <View style={styles.encartConseil}>
            <Text style={styles.labelConseil}>Consigne diététique du praticien</Text>
            <Text style={styles.texteConseilDietetique}>
              {plan.plan_nutrition.conseils_specifiques}
            </Text>
          </View>
        )}
      </View>

      {/* ── Volet Activité Physique ── */}
      <View style={styles.ficheClinique}>
        <View style={styles.enteteFiche}>
          <Text style={styles.titreSection}>Activité physique adaptée</Text>
          {plan.plan_activite?.titre && (
            <Text style={styles.sousTitreSection}>{plan.plan_activite.titre}</Text>
          )}
        </View>

        {plan.plan_activite?.frequence_hebdomadaire !== undefined && (
          <View style={styles.grilleMetriques}>
            <View style={styles.boiteMetrique}>
              <Text style={styles.chiffreMetrique}>{plan.plan_activite.frequence_hebdomadaire}×</Text>
              <Text style={styles.legendeMetrique}>séances / semaine</Text>
            </View>
            {plan.plan_activite.duree_seance_minutes ? (
              <View style={styles.boiteMetrique}>
                <Text style={styles.chiffreMetrique}>{plan.plan_activite.duree_seance_minutes}</Text>
                <Text style={styles.legendeMetrique}>minutes / séance</Text>
              </View>
            ) : null}
          </View>
        )}

        {plan.plan_activite?.objectifs?.map((obj, i) => (
          <View key={i} style={styles.ligneObjectif}>
            <View style={styles.indicateurObjectif} />
            <Text style={styles.texteObjectif}>{obj}</Text>
          </View>
        ))}
      </View>

      {/* ── Mot du soignant ── */}
      {plan.notes_nutritionniste && (
        <View style={styles.ficheNotes}>
          <Text style={styles.titreNotes}>Observations du soignant</Text>
          <Text style={styles.texteNotes}>{plan.notes_nutritionniste}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WiqayatiTokens.colors.canvas,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: WiqayatiTokens.colors.canvas,
  },
  texteChargement: {
    marginTop: 12,
    color: WiqayatiTokens.colors.textSecondary,
    fontSize: 14,
  },
  cadreAttente: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 24,
    alignItems: 'center',
  },
  titreAttente: {
    fontSize: 17,
    fontWeight: '700',
    color: WiqayatiTokens.colors.textPrimary,
    marginBottom: 8,
  },
  texteAttente: {
    fontSize: 14,
    color: WiqayatiTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  texteConseil: {
    fontSize: 13,
    color: WiqayatiTokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Bandeau de validation clinique */
  bandeauValidation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WiqayatiTokens.colors.risk.faible.surface,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.risk.faible.border,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: WiqayatiTokens.radii.sm,
    marginBottom: 16,
  },
  pointValidation: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: WiqayatiTokens.colors.risk.faible.base,
    marginRight: 9,
  },
  texteValidation: {
    fontSize: 12,
    fontWeight: '600',
    color: WiqayatiTokens.colors.risk.faible.text,
    flex: 1,
  },

  /* Fiches de recommandations */
  ficheClinique: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 16,
    marginBottom: 14,
  },
  enteteFiche: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: WiqayatiTokens.colors.borderSubtle,
  },
  titreSection: {
    fontSize: 16,
    fontWeight: '700',
    color: WiqayatiTokens.colors.textPrimary,
  },
  sousTitreSection: {
    fontSize: 13,
    color: WiqayatiTokens.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Lignes d'objectifs */
  ligneObjectif: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  indicateurObjectif: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: WiqayatiTokens.colors.accent,
    marginTop: 7,
    marginRight: 10,
  },
  texteObjectif: {
    flex: 1,
    fontSize: 14,
    color: WiqayatiTokens.colors.textPrimary,
    lineHeight: 20,
  },

  /* Encart conseil diététique */
  encartConseil: {
    marginTop: 10,
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    borderLeftWidth: 3,
    borderLeftColor: WiqayatiTokens.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: WiqayatiTokens.radii.xs,
  },
  labelConseil: {
    fontSize: 11,
    fontWeight: '700',
    color: WiqayatiTokens.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  texteConseilDietetique: {
    fontSize: 13,
    color: WiqayatiTokens.colors.textPrimary,
    lineHeight: 19,
  },

  /* Métriques d'activité */
  grilleMetriques: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  boiteMetrique: {
    flex: 1,
    backgroundColor: WiqayatiTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: WiqayatiTokens.radii.sm,
    alignItems: 'center',
  },
  chiffreMetrique: {
    fontSize: 22,
    fontWeight: '700',
    color: WiqayatiTokens.colors.primary,
  },
  legendeMetrique: {
    fontSize: 11,
    color: WiqayatiTokens.colors.textSecondary,
    marginTop: 2,
  },

  /* Fiche note soignant */
  ficheNotes: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: WiqayatiTokens.colors.primary,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 16,
    marginBottom: 14,
  },
  titreNotes: {
    fontSize: 14,
    fontWeight: '700',
    color: WiqayatiTokens.colors.primary,
    marginBottom: 6,
  },
  texteNotes: {
    fontSize: 13.5,
    color: WiqayatiTokens.colors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
