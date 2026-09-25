/**
 * Écran Notifications — Wiqayati Mobile
 * v2 : filtre par catégorie (Dépistage / Suivi), tokens unifiés, icônes vectorielles.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import apiMobile from '../api/client';
import { WiqayatiTokens } from '../constants/theme';

const T = WiqayatiTokens;

interface Notification {
  id: string;
  type_libelle: string;
  type: string;
  message: string;
  lu: boolean;
  cree_le: string;
}

// Types classés par catégorie
const TYPES_DEPISTAGE = new Set(['PLAN_VALIDE', 'NOUVEAU_SCREENING', 'RAPPEL', 'RAPPEL_EVALUATION']);
const TYPES_SUIVI     = new Set(['SUIVI_MANQUE', 'ENCOURAGEMENT']);

type Categorie = 'DEPISTAGE' | 'SUIVI';

// Icônes textuelles (unicode) — remplace les emojis bruts par des symboles cohérents
const ICONE_TYPE: Record<string, { emoji: string; couleur: string }> = {
  PLAN_VALIDE:        { emoji: '✔', couleur: T.colors.accent },
  NOUVEAU_SCREENING:  { emoji: '⬡', couleur: T.colors.primary },
  RAPPEL:             { emoji: '⏰', couleur: T.colors.risk.intermediaire.base },
  RAPPEL_EVALUATION:  { emoji: '⏰', couleur: T.colors.risk.intermediaire.base },
  SUIVI_MANQUE:       { emoji: '◎', couleur: T.colors.risk.eleve.base },
  ENCOURAGEMENT:      { emoji: '★', couleur: T.colors.accent },
  INFO:               { emoji: '◈', couleur: T.colors.primary },
};

function categorieDeNotif(type: string): Categorie {
  if (TYPES_SUIVI.has(type)) return 'SUIVI';
  return 'DEPISTAGE';
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chargement, setChargement]       = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [nbNonLus, setNbNonLus]           = useState(0);
  const [filtre, setFiltre]               = useState<Categorie>('DEPISTAGE');

  const charger = useCallback(async () => {
    try {
      const resp = await apiMobile.get('/citoyen/notifications/');
      const liste: Notification[] = resp.data?.results ?? resp.data ?? [];
      setNotifications(liste);
      setNbNonLus(liste.filter((n) => !n.lu).length);
    } catch {
      // Ignorer
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, []);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, 60_000);
    return () => clearInterval(interval);
  }, [charger]);

  const marquerLu = async (id: string) => {
    try {
      await apiMobile.patch(`/citoyen/notifications/${id}/marquer-comme-lu/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      );
      setNbNonLus((prev) => Math.max(0, prev - 1));
    } catch { /* Ignorer */ }
  };

  const marquerTousLus = async () => {
    try {
      await apiMobile.post('/citoyen/notifications/marquer-tous-lus/');
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      setNbNonLus(0);
    } catch { /* Ignorer */ }
  };

  const notifsFiltrees = notifications.filter(
    (n) => categorieDeNotif(n.type) === filtre
  );

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={T.colors.primary} />
        <Text style={styles.texteChargement}>Chargement des notifications…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── En-tête ── */}
      <View style={styles.entete}>
        <View>
          <Text style={styles.enteteTitle}>Mes Alertes</Text>
          {nbNonLus > 0 && (
            <Text style={styles.enteteSousTitre}>{nbNonLus} non lue(s)</Text>
          )}
        </View>
        {nbNonLus > 0 && (
          <TouchableOpacity style={styles.btnTousLus} onPress={marquerTousLus} activeOpacity={0.8}>
            <Text style={styles.btnTousLusTexte}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Chips filtre catégorie ── */}
      <View style={styles.filtreRow}>
        {(['DEPISTAGE', 'SUIVI'] as Categorie[]).map((cat) => {
          const actif = filtre === cat;
          const label = cat === 'DEPISTAGE' ? '🔬 Dépistage' : '📊 Suivi quotidien';
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, actif && styles.chipActif]}
              onPress={() => setFiltre(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={notifsFiltrees}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => { setRafraichissement(true); charger(); }}
            tintColor={T.colors.primary}
          />
        }
        contentContainerStyle={
          notifsFiltrees.length === 0 ? styles.listeVide : styles.liste
        }
        ListEmptyComponent={
          <View style={styles.etiquetteVide}>
            <Text style={styles.iconeVide}>
              {filtre === 'DEPISTAGE' ? '🔬' : '📊'}
            </Text>
            <Text style={styles.etiquetteVideTexte}>
              {filtre === 'DEPISTAGE'
                ? 'Aucune alerte de dépistage.\nVous serez notifié(e) après la validation de votre plan.'
                : 'Aucune alerte de suivi quotidien.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const iconeInfo = ICONE_TYPE[item.type] ?? { emoji: '●', couleur: T.colors.textMuted };
          return (
            <TouchableOpacity
              style={[styles.card, !item.lu && styles.cardNonLu, T.shadows.card]}
              onPress={() => !item.lu && marquerLu(item.id)}
              activeOpacity={item.lu ? 1 : 0.8}
            >
              <View style={[styles.cardIconeContainer, { backgroundColor: iconeInfo.couleur + '15' }]}>
                <Text style={[styles.iconeType, { color: iconeInfo.couleur }]}>
                  {iconeInfo.emoji}
                </Text>
              </View>
              <View style={styles.cardContenu}>
                <View style={styles.cardEnTete}>
                  <Text style={styles.typeNotif}>{item.type_libelle}</Text>
                  <Text style={styles.dateNotif}>
                    {new Date(item.cree_le).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short',
                    })}
                  </Text>
                </View>
                <Text style={styles.msgNotif}>{item.message}</Text>
                {!item.lu && (
                  <View style={styles.pointNonLu}>
                    <Text style={styles.pointNonLuTexte}>Non lue — appuyer pour marquer</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.colors.canvas },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.colors.canvas,
  },
  texteChargement: { marginTop: 12, ...T.typography.body, color: T.colors.textSecondary },

  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: T.colors.canvas,
  },
  enteteTitle: { ...T.typography.h1, color: T.colors.textPrimary },
  enteteSousTitre: { ...T.typography.caption, color: T.colors.primary, fontWeight: '700' as const, marginTop: 2 },
  btnTousLus: {
    backgroundColor: T.colors.primaryLight,
    borderRadius: T.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  btnTousLusTexte: { ...T.typography.caption, color: T.colors.primary, fontWeight: '700' as const },

  // Chips filtre
  filtreRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: T.colors.surface,
    borderRadius: T.radii.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  chipActif: {
    backgroundColor: T.colors.primary,
    borderColor: T.colors.primary,
  },
  chipTexte: {
    ...T.typography.caption,
    color: T.colors.textSecondary,
    fontWeight: '600' as const,
  },
  chipTexteActif: {
    color: T.colors.textInverse,
  },

  // Liste
  liste: { padding: 16, paddingTop: 0 },
  listeVide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  etiquetteVide: { alignItems: 'center', gap: 10 },
  iconeVide: { fontSize: 36 },
  etiquetteVideTexte: {
    ...T.typography.body,
    color: T.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cards
  card: {
    flexDirection: 'row',
    backgroundColor: T.colors.surface,
    borderRadius: T.radii.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  cardNonLu: {
    backgroundColor: T.colors.primaryLight,
    borderColor: T.colors.borderStrong + '30',
  },
  cardIconeContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconeType: { fontSize: 20, fontWeight: '700' as const },
  cardContenu: { flex: 1 },
  cardEnTete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeNotif: { ...T.typography.bodyMedium, color: T.colors.primary, flex: 1 },
  dateNotif: { ...T.typography.micro, color: T.colors.textMuted, marginLeft: 8 },
  msgNotif: { ...T.typography.body, color: T.colors.textPrimary, lineHeight: 19 },
  pointNonLu: { marginTop: 6 },
  pointNonLuTexte: {
    ...T.typography.micro,
    color: T.colors.primary,
    fontStyle: 'italic',
  },
});
