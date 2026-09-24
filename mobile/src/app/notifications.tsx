/**
 * Écran Notifications — Wiqayati Mobile
 * Affiche les alertes et notifications du citoyen avec marquage lu/non-lu.
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

interface Notification {
  id: string;
  type_libelle: string;
  type: string;
  message: string;
  lu: boolean;
  cree_le: string;
}

const ICONE_TYPE: Record<string, string> = {
  PLAN_VALIDE:     '✅',
  NOUVEAU_SCREENING: '📋',
  RAPPEL:          '🔔',
  INFO:            '💡',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chargement, setChargement]       = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [nbNonLus, setNbNonLus]           = useState(0);

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
    // Polling léger toutes les 60 secondes
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
    } catch {
      // Ignorer
    }
  };

  const marquerTousLus = async () => {
    try {
      await apiMobile.post('/citoyen/notifications/marquer-tous-lus/');
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      setNbNonLus(0);
    } catch {
      // Ignorer
    }
  };

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.texteChargement}>Chargement des notifications…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── En-tête ── */}
      <View style={styles.entete}>
        <View>
          <Text style={styles.enteteTitle}>Mes Notifications</Text>
          {nbNonLus > 0 && (
            <Text style={styles.enteteSousTitre}>{nbNonLus} non lue(s)</Text>
          )}
        </View>
        {nbNonLus > 0 && (
          <TouchableOpacity style={styles.btnTousLus} onPress={marquerTousLus}>
            <Text style={styles.btnTousLusTexte}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => { setRafraichissement(true); charger(); }}
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.listeVide : styles.liste}
        ListEmptyComponent={
          <View style={styles.etiquetteVide}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
            <Text style={styles.etiquetteVideTexte}>
              Aucune notification pour l'instant.{'\n'}
              Vous serez alerté(e) dès qu'un nutritionniste valide votre plan.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.lu && styles.cardNonLu]}
            onPress={() => !item.lu && marquerLu(item.id)}
            activeOpacity={item.lu ? 1 : 0.8}
          >
            <View style={styles.cardGauche}>
              <Text style={styles.iconeType}>
                {ICONE_TYPE[item.type] ?? '🔔'}
              </Text>
            </View>
            <View style={styles.cardContenu}>
              <View style={styles.cardEnTete}>
                <Text style={styles.typeNotif}>{item.type_libelle}</Text>
                <Text style={styles.dateNotif}>
                  {new Date(item.cree_le).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short'
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
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f6ff' },
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  texteChargement: { marginTop: 12, color: '#64748b', fontSize: 14 },

  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f0f6ff',
  },
  enteteTitle: { fontSize: 20, fontWeight: '900', color: '#0f2c59' },
  enteteSousTitre: { fontSize: 12, color: '#2563eb', fontWeight: '700', marginTop: 2 },
  btnTousLus: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  btnTousLusTexte: { color: '#2563eb', fontWeight: '700', fontSize: 12 },

  liste: { padding: 16 },
  listeVide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  etiquetteVide: { alignItems: 'center' },
  etiquetteVideTexte: { color: '#94a3b8', textAlign: 'center', fontSize: 13, lineHeight: 20 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardNonLu: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  cardGauche: { marginRight: 12, justifyContent: 'flex-start', paddingTop: 2 },
  iconeType: { fontSize: 22 },
  cardContenu: { flex: 1 },
  cardEnTete: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  typeNotif: { fontSize: 13, fontWeight: '800', color: '#1e40af', flex: 1 },
  dateNotif: { fontSize: 11, color: '#94a3b8', marginLeft: 8 },
  msgNotif: { fontSize: 13, color: '#334155', lineHeight: 19 },
  pointNonLu: { marginTop: 6 },
  pointNonLuTexte: { fontSize: 11, color: '#2563eb', fontStyle: 'italic' },
});
