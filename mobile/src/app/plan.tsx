/**
 * Écran Mon Plan — Wiqayati Mobile
 * Affiche le plan nutrition + activité physique validé par le nutritionniste.
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
      // Pas encore de plan
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
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.texteChargement}>Chargement de votre plan…</Text>
      </View>
    );
  }

  if (!plan?.a_un_plan_valide) {
    return (
      <View style={styles.centre}>
        <View style={styles.iconeAttente}>
          <Text style={{ fontSize: 40 }}>📋</Text>
        </View>
        <Text style={styles.titreAttente}>Plan en cours de validation</Text>
        <Text style={styles.texteAttente}>
          {plan?.message ??
            "Votre plan nutritionnel et d'activité physique est en cours d'analyse par un nutritionniste référent."}
        </Text>
        <Text style={styles.texteConseil}>
          Dès sa validation médicale, vos recommandations personnalisées s'afficheront ici.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={() => { setRafraichissement(true); chargerPlan(); }}
        />
      }
    >
      {/* Badge de validation */}
      <View style={styles.badgeValide}>
        <Text style={styles.badgeValideTexte}>
          ✓ Validé par un nutritionniste le{' '}
          {plan.valide_le ? new Date(plan.valide_le).toLocaleDateString('fr-FR') : '—'}
        </Text>
      </View>

      {/* ── Plan Nutrition ── */}
      <View style={styles.card}>
        <View style={styles.cardTitreRow}>
          <Text style={styles.cardEmoji}>🥗</Text>
          <Text style={styles.cardTitre}>Recommandations Nutritionnelles</Text>
        </View>
        {plan.plan_nutrition?.titre && (
          <Text style={styles.cardSousTitre}>{plan.plan_nutrition.titre}</Text>
        )}
        {plan.plan_nutrition?.objectifs?.map((obj, i) => (
          <View key={i} style={styles.itemObjectifRow}>
            <Text style={styles.itemBullet}>•</Text>
            <Text style={styles.itemObjectif}>{obj}</Text>
          </View>
        ))}
        {plan.plan_nutrition?.conseils_specifiques && (
          <View style={styles.conseilBox}>
            <Text style={styles.conseilTexte}>
              💡 {plan.plan_nutrition.conseils_specifiques}
            </Text>
          </View>
        )}
      </View>

      {/* ── Plan Activité ── */}
      <View style={styles.card}>
        <View style={styles.cardTitreRow}>
          <Text style={styles.cardEmoji}>🏃‍♂️</Text>
          <Text style={styles.cardTitre}>Programme d'Activité Physique</Text>
        </View>
        {plan.plan_activite?.titre && (
          <Text style={styles.cardSousTitre}>{plan.plan_activite.titre}</Text>
        )}
        {plan.plan_activite?.frequence_hebdomadaire !== undefined && (
          <View style={styles.metaActivite}>
            <View style={styles.metaItem}>
              <Text style={styles.metaValeur}>{plan.plan_activite.frequence_hebdomadaire}×</Text>
              <Text style={styles.metaLabel}>par semaine</Text>
            </View>
            {plan.plan_activite.duree_seance_minutes && (
              <View style={styles.metaItem}>
                <Text style={styles.metaValeur}>{plan.plan_activite.duree_seance_minutes}</Text>
                <Text style={styles.metaLabel}>min/séance</Text>
              </View>
            )}
          </View>
        )}
        {plan.plan_activite?.objectifs?.map((obj, i) => (
          <View key={i} style={styles.itemObjectifRow}>
            <Text style={styles.itemBullet}>•</Text>
            <Text style={styles.itemObjectif}>{obj}</Text>
          </View>
        ))}
      </View>

      {/* ── Message nutritionniste ── */}
      {plan.notes_nutritionniste && (
        <View style={[styles.card, styles.cardNutritioniste]}>
          <Text style={styles.cardTitreNutritionniste}>
            💬 Message de votre nutritionniste
          </Text>
          <Text style={styles.msgNutritionniste}>{plan.notes_nutritionniste}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f6ff', padding: 16 },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f0f6ff',
  },
  texteChargement: { marginTop: 12, color: '#64748b', fontSize: 14 },
  iconeAttente: { marginBottom: 16 },
  titreAttente: { fontSize: 18, fontWeight: '800', color: '#0f2c59', textAlign: 'center', marginBottom: 10 },
  texteAttente: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21, marginBottom: 10 },
  texteConseil: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

  badgeValide: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  badgeValideTexte: { color: '#065f46', fontWeight: '700', fontSize: 12, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardEmoji: { fontSize: 20, marginRight: 8 },
  cardTitre: { fontSize: 16, fontWeight: '800', color: '#0f2c59', flex: 1 },
  cardSousTitre: { fontSize: 14, fontWeight: '600', color: '#2563eb', marginBottom: 10 },

  metaActivite: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 80 },
  metaValeur: { fontSize: 20, fontWeight: '900', color: '#2563eb' },
  metaLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },

  itemObjectifRow: { flexDirection: 'row', marginBottom: 5, paddingRight: 8 },
  itemBullet: { color: '#2563eb', fontWeight: '800', marginRight: 6, marginTop: 1 },
  itemObjectif: { fontSize: 13, color: '#475569', lineHeight: 19, flex: 1 },

  conseilBox: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginTop: 8 },
  conseilTexte: { fontSize: 13, color: '#065f46', fontWeight: '600', lineHeight: 18 },

  cardNutritioniste: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  cardTitreNutritionniste: { fontSize: 15, fontWeight: '800', color: '#1e40af', marginBottom: 8 },
  msgNutritionniste: { fontSize: 14, color: '#1e3a8a', lineHeight: 20 },
});
