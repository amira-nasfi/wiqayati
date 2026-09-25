/**
 * Écran Mon suivi quotidien — Wiqayati Mobile (Citoyen)
 * Extension secondaire du plan validé par le nutritionniste.
 *
 * Règles appliquées (plan v2) :
 * - Onglet toujours visible, état vide si pas de plan validé (C1)
 * - objectifs_coches: number[] pour badge individuel par objectif (C3)
 * - Le hook recharge les objectifs depuis plan_actif à chaque ouverture (C2 — pas d'invalidation manuelle)
 * - Design premium avec WiqayatiTokens.shadows + typography (T8a)
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useAuth } from '../api/authContext';
import apiMobile from '../api/client';
import { useSuiviQuotidien } from '../hooks/useSuiviQuotidien';
import { WiqayatiTokens } from '../constants/theme';

interface PlanActif {
  a_un_plan_valide: boolean;
  message?: string;
  valide_le?: string;
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

// ── Utilitaires date ─────────────────────────────────────────────────────────

const JOURS_SEMAINE = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function dateISO(d: Date = new Date()) {
  return d.toISOString().slice(0, 10);
}

function sept7jours(): { date: string; libelle: string; estAujourdhui: boolean }[] {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      date: dateISO(d),
      libelle: i === 0 ? "Auj." : JOURS_SEMAINE[d.getDay()],
      estAujourdhui: i === 0,
    });
  }
  return result;
}

// ── Composant ObjectifPlanBadge ───────────────────────────────────────────────

function ObjectifPlanBadge({
  texte,
  index,
  coche,
  onToggle,
}: {
  texte: string;
  index: number;
  coche: boolean;
  onToggle: (index: number) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.objectifBadge, coche && styles.objectifBadgeCoche]}
      onPress={() => onToggle(index)}
      activeOpacity={0.75}
    >
      <View style={[styles.objectifCase, coche && styles.objectifCaseCochee]}>
        {coche && <Text style={styles.objectifCoche}>✓</Text>}
      </View>
      <Text
        style={[styles.objectifTexte, coche && styles.objectifTexteCoche]}
        numberOfLines={2}
      >
        {texte}
      </Text>
    </TouchableOpacity>
  );
}

// ── Composant mini-calendrier semaine ────────────────────────────────────────

function CalendrierSemaine({
  semaine,
  planNutritionTotal,
}: {
  semaine: Record<string, any | null>;
  planNutritionTotal: number;
}) {
  const jours = sept7jours();
  return (
    <View style={styles.calendrier}>
      {jours.map(({ date, libelle, estAujourdhui }) => {
        const enreg = semaine[date];
        const activiteFaite = enreg?.activite?.faite ?? false;
        const nbCoches = enreg?.nutrition?.objectifs_coches?.length ?? 0;
        const total = planNutritionTotal || enreg?.nutrition?.total_objectifs || 1;
        const nutritionOk = total > 0 && nbCoches >= total;
        const aSaisie = enreg != null;

        let couleur = '#E4ECE9'; // vide
        if (aSaisie && activiteFaite && nutritionOk) couleur = WiqayatiTokens.colors.accent;
        else if (aSaisie) couleur = '#F0D5AC';

        return (
          <View key={date} style={styles.jourCalendrier}>
            <Text style={[styles.jourLibelle, estAujourdhui && styles.jourLibelleAujourd]}>
              {libelle}
            </Text>
            <View style={[styles.jourIndicateur, { backgroundColor: couleur }]}>
              {estAujourdhui && <View style={styles.jourIndicateurRing} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function SuiviQuotidienScreen() {
  const { profil } = useAuth();
  const ins = profil?.ins ?? '';

  const {
    suiviDuJour,
    semaineEnCours,
    chargerSuiviDuJour,
    chargerSemaineEnCours,
    toggleObjectifNutrition,
    marquerActivite,
    erreurSync,
  } = useSuiviQuotidien(ins);

  const [plan, setPlan] = useState<PlanActif | null>(null);
  const [chargementPlan, setChargementPlan] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [noteLireActivite, setNoteLibreActivite] = useState('');
  const [dureeMinutes, setDureeMinutes] = useState('');

  // Animation d'entrée
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const animer = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Chargement ────────────────────────────────────────────────────────────
  const charger = useCallback(async () => {
    try {
      // Recharger le plan depuis l'API à chaque ouverture (C2 — pas de cache invalidation manuelle)
      const resp = await apiMobile.get('/citoyen/moi/plan-actif/');
      setPlan(resp.data);
    } catch {
      setPlan({ a_un_plan_valide: false });
    } finally {
      setChargementPlan(false);
      setRafraichissement(false);
    }
    await chargerSuiviDuJour();
    await chargerSemaineEnCours();
    animer();
  }, [chargerSuiviDuJour, chargerSemaineEnCours, animer]);

  useEffect(() => {
    charger();
  }, [charger]);

  const handleRefresh = () => {
    setRafraichissement(true);
    charger();
  };

  // ── Chargement ────────────────────────────────────────────────────────────
  if (chargementPlan) {
    return (
      <View style={styles.centreChargement}>
        <ActivityIndicator size="large" color={WiqayatiTokens.colors.primary} />
        <Text style={styles.texteChargement}>Chargement de votre suivi…</Text>
      </View>
    );
  }

  // ── Pas de plan validé (C1 — écran vide, onglet toujours visible) ─────────
  if (!plan?.a_un_plan_valide) {
    return (
      <View style={styles.centreChargement}>
        <View style={[styles.carteAttente, WiqayatiTokens.shadows.card]}>
          <Text style={styles.iconeAttente}>📋</Text>
          <Text style={styles.titreAttente}>Suivi bientôt disponible</Text>
          <Text style={styles.texteAttente}>
            Votre suivi quotidien sera disponible une fois votre plan validé par le nutritionniste.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.texteAttenteIndice}>
            Vous serez notifié(e) dès la validation.
          </Text>
        </View>
      </View>
    );
  }

  // ── Données du plan ───────────────────────────────────────────────────────
  const objectifsNutrition = plan.plan_nutrition?.objectifs ?? [];
  const objetifsCoches = suiviDuJour?.nutrition?.objectifs_coches ?? [];
  const activiteFaite = suiviDuJour?.activite?.faite ?? false;
  const cibleActivite = plan.plan_activite?.duree_seance_minutes;
  const dateValidation = plan.valide_le
    ? new Date(plan.valide_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={handleRefresh}
          tintColor={WiqayatiTokens.colors.primary}
        />
      }
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Bandeau contexte plan ── */}
        <View style={styles.bandeauPlan}>
          <View style={styles.pointPlan} />
          <Text style={styles.texteBandeauPlan} numberOfLines={1}>
            Plan du {dateValidation} · Nutritionniste référent
          </Text>
          {erreurSync && (
            <View style={styles.badgeSync}>
              <Text style={styles.badgeSyncTexte}>Non sync.</Text>
            </View>
          )}
        </View>

        {/* ── Mini-calendrier semaine ── */}
        <View style={[styles.section, WiqayatiTokens.shadows.card]}>
          <Text style={styles.titreSectionLabel}>CETTE SEMAINE</Text>
          <CalendrierSemaine
            semaine={semaineEnCours}
            planNutritionTotal={objectifsNutrition.length}
          />
          <View style={styles.legendeRow}>
            <View style={[styles.legendePuce, { backgroundColor: WiqayatiTokens.colors.accent }]} />
            <Text style={styles.legendeTexte}>Journée complète</Text>
            <View style={[styles.legendePuce, { backgroundColor: '#F0D5AC', marginLeft: 12 }]} />
            <Text style={styles.legendeTexte}>Partielle</Text>
          </View>
        </View>

        {/* ── Activité physique aujourd'hui ── */}
        <View style={[styles.section, WiqayatiTokens.shadows.card]}>
          <View style={styles.enteteSection}>
            <Text style={styles.titreSectionLabel}>ACTIVITÉ PHYSIQUE</Text>
            {plan.plan_activite?.frequence_hebdomadaire != null && (
              <Text style={styles.cibleLabel}>
                Cible : {plan.plan_activite.frequence_hebdomadaire}×/sem
                {cibleActivite ? ` · ${cibleActivite} min` : ''}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.checkActivite, activiteFaite && styles.checkActiviteFaite]}
            onPress={() => marquerActivite(!activiteFaite)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkIcon, activiteFaite && styles.checkIconFait]}>
              {activiteFaite && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <View style={styles.checkTextes}>
              <Text style={[styles.checkTitre, activiteFaite && styles.checkTitreFait]}>
                {activiteFaite ? 'Séance réalisée aujourd\'hui !' : 'Marquer ma séance d\'aujourd\'hui'}
              </Text>
              <Text style={styles.checkSousTitre}>
                {plan.plan_activite?.titre ?? 'Activité physique adaptée'}
              </Text>
            </View>
          </TouchableOpacity>

          {activiteFaite && (
            <View style={styles.champDuree}>
              <Text style={styles.champDureeLabel}>Durée (min) :</Text>
              <TextInput
                style={styles.champDureeInput}
                value={dureeMinutes}
                onChangeText={setDureeMinutes}
                onBlur={() => {
                  const mins = parseInt(dureeMinutes, 10);
                  if (!isNaN(mins) && mins > 0) {
                    marquerActivite(true, mins);
                  }
                }}
                keyboardType="number-pad"
                placeholder={cibleActivite ? `${cibleActivite}` : '30'}
                placeholderTextColor={WiqayatiTokens.colors.textMuted}
                maxLength={3}
              />
            </View>
          )}
        </View>

        {/* ── Objectifs nutrition aujourd'hui ── */}
        <View style={[styles.section, WiqayatiTokens.shadows.card]}>
          <View style={styles.enteteSection}>
            <Text style={styles.titreSectionLabel}>NUTRITION</Text>
            <Text style={styles.cibleLabel}>
              {objetifsCoches.length}/{objectifsNutrition.length} objectif(s)
            </Text>
          </View>

          {objectifsNutrition.length === 0 ? (
            <Text style={styles.texteVide}>Aucun objectif défini dans votre plan.</Text>
          ) : (
            <View style={styles.listeObjectifs}>
              {objectifsNutrition.map((obj, idx) => (
                <ObjectifPlanBadge
                  key={idx}
                  texte={obj}
                  index={idx}
                  coche={objetifsCoches.includes(idx)}
                  onToggle={(i) =>
                    toggleObjectifNutrition(i, objectifsNutrition.length)
                  }
                />
              ))}
            </View>
          )}

          {plan.plan_nutrition?.conseils_specifiques && (
            <View style={styles.encartConseil}>
              <Text style={styles.encartConseilLabel}>CONSIGNE DU NUTRITIONNISTE</Text>
              <Text style={styles.encartConseilTexte}>
                {plan.plan_nutrition.conseils_specifiques}
              </Text>
            </View>
          )}
        </View>

      </Animated.View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const T = WiqayatiTokens;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.colors.canvas,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centreChargement: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: T.colors.canvas,
  },
  texteChargement: {
    marginTop: 12,
    color: T.colors.textSecondary,
    ...T.typography.body,
  },

  // Carte d'attente (pas de plan)
  carteAttente: {
    backgroundColor: T.colors.surface,
    borderRadius: T.radii.lg,
    borderWidth: 1,
    borderColor: T.colors.border,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
  },
  iconeAttente: {
    fontSize: 40,
    marginBottom: 12,
  },
  titreAttente: {
    ...T.typography.h2,
    color: T.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  texteAttente: {
    ...T.typography.body,
    color: T.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: T.colors.borderSubtle,
    width: '100%',
    marginVertical: 14,
  },
  texteAttenteIndice: {
    ...T.typography.caption,
    color: T.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Bandeau plan
  bandeauPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.accentLight,
    borderRadius: T.radii.md,
    borderWidth: 1,
    borderColor: T.colors.accent + '40',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  pointPlan: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.colors.accent,
    flexShrink: 0,
  },
  texteBandeauPlan: {
    ...T.typography.caption,
    color: T.colors.accent,
    fontWeight: '700' as const,
    flex: 1,
  },
  badgeSync: {
    backgroundColor: '#FCF6EC',
    borderRadius: T.radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F0D5AC',
  },
  badgeSyncTexte: {
    ...T.typography.micro,
    color: T.colors.risk.intermediaire.text,
  },

  // Section card générique
  section: {
    backgroundColor: T.colors.surface,
    borderRadius: T.radii.lg,
    borderWidth: 1,
    borderColor: T.colors.border,
    padding: 16,
    marginBottom: 14,
  },
  enteteSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titreSectionLabel: {
    ...T.typography.label,
    color: T.colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  cibleLabel: {
    ...T.typography.caption,
    color: T.colors.primary,
    fontWeight: '700' as const,
  },

  // Mini-calendrier
  calendrier: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jourCalendrier: {
    alignItems: 'center',
    gap: 5,
  },
  jourLibelle: {
    ...T.typography.micro,
    color: T.colors.textMuted,
  },
  jourLibelleAujourd: {
    color: T.colors.primary,
    fontWeight: '700' as const,
  },
  jourIndicateur: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jourIndicateurRing: {
    position: 'absolute' as const,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: T.colors.primary,
  },
  legendeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendePuce: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendeTexte: {
    ...T.typography.micro,
    color: T.colors.textMuted,
  },

  // Check activité
  checkActivite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.surfaceSubtle,
    borderRadius: T.radii.md,
    borderWidth: 1,
    borderColor: T.colors.border,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  checkActiviteFaite: {
    backgroundColor: T.colors.accentLight,
    borderColor: T.colors.accent + '60',
  },
  checkIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: T.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.colors.surface,
    flexShrink: 0,
  },
  checkIconFait: {
    backgroundColor: T.colors.accent,
    borderColor: T.colors.accent,
  },
  checkMark: {
    color: T.colors.textInverse,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  checkTextes: {
    flex: 1,
  },
  checkTitre: {
    ...T.typography.bodyMedium,
    color: T.colors.textPrimary,
  },
  checkTitreFait: {
    color: T.colors.accent,
  },
  checkSousTitre: {
    ...T.typography.caption,
    color: T.colors.textMuted,
    marginTop: 1,
  },

  // Champ durée
  champDuree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  champDureeLabel: {
    ...T.typography.caption,
    color: T.colors.textSecondary,
  },
  champDureeInput: {
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: T.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...T.typography.body,
    color: T.colors.textPrimary,
    backgroundColor: T.colors.surface,
    width: 70,
    textAlign: 'center',
  },

  // Objectifs nutrition
  listeObjectifs: {
    gap: 8,
  },
  objectifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.surfaceSubtle,
    borderRadius: T.radii.md,
    borderWidth: 1,
    borderColor: T.colors.border,
    padding: 12,
    gap: 10,
  },
  objectifBadgeCoche: {
    backgroundColor: T.colors.accentLight,
    borderColor: T.colors.accent + '50',
  },
  objectifCase: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: T.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.colors.surface,
    flexShrink: 0,
  },
  objectifCaseCochee: {
    backgroundColor: T.colors.accent,
    borderColor: T.colors.accent,
  },
  objectifCoche: {
    color: T.colors.textInverse,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  objectifTexte: {
    ...T.typography.body,
    color: T.colors.textPrimary,
    flex: 1,
  },
  objectifTexteCoche: {
    color: T.colors.accent,
    textDecorationLine: 'line-through' as const,
  },

  // Encart conseil
  encartConseil: {
    marginTop: 12,
    backgroundColor: T.colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: T.colors.primary,
    borderRadius: T.radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  encartConseilLabel: {
    ...T.typography.label,
    color: T.colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  encartConseilTexte: {
    ...T.typography.body,
    color: T.colors.textPrimary,
    fontStyle: 'italic',
  },

  texteVide: {
    ...T.typography.body,
    color: T.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
