/**
 * Écran Dossier Citoyen — Wiqayati Mobile
 * Affiche le profil et l'historique des dépistages du citoyen connecté.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../api/authContext';
import apiMobile from '../api/client';

interface Evaluation {
  id: string;
  evalue_le: string;
  score: number;
  niveau_risque: 'FAIBLE' | 'INTERMEDIAIRE' | 'ELEVE';
  niveau_risque_libelle: string;
}

const COULEUR_RISQUE: Record<string, { fond: string; texte: string }> = {
  ELEVE:         { fond: '#fee2e2', texte: '#991b1b' },
  INTERMEDIAIRE: { fond: '#fef3c7', texte: '#92400e' },
  FAIBLE:        { fond: '#dcfce7', texte: '#166534' },
};

export default function DossierCitoyenScreen() {
  const { profil, seDeconnecter } = useAuth();
  const [historique, setHistorique] = useState<Evaluation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const chargerHistorique = useCallback(async () => {
    setErreur(null);
    try {
      const resp = await apiMobile.get('/citoyen/moi/historique-risques/');
      setHistorique(resp.data?.results ?? resp.data ?? []);
    } catch {
      setErreur("Impossible de charger l'historique. Tirez pour réessayer.");
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, []);

  useEffect(() => {
    chargerHistorique();
  }, [chargerHistorique]);

  const handleRefresh = () => {
    setRafraichissement(true);
    chargerHistorique();
  };

  if (chargement) {
    return (
      <View style={styles.centreChargement}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.texteChargement}>Chargement de votre dossier…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={rafraichissement} onRefresh={handleRefresh} />
      }
    >
      {/* ── En-tête identité ── */}
      <View style={styles.cardIdentite}>
        <View style={styles.badgeMinistere}>
          <Text style={styles.badgeMinistereTexte}>🇹🇳 République Tunisienne · Ministère de la Santé</Text>
        </View>
        <View style={styles.avatarCercle}>
          <Text style={styles.avatarInitiales}>
            {profil?.prenom?.[0]}{profil?.nom?.[0]}
          </Text>
        </View>
        <Text style={styles.nomCitoyen}>{profil?.prenom} {profil?.nom}</Text>
        <Text style={styles.insCitoyen}>INS : {profil?.ins}</Text>
        <Text style={styles.infoCitoyen}>
          {profil?.gouvernorat && `Gouvernorat : ${profil.gouvernorat}`}
          {profil?.date_naissance && `  ·  Né(e) le ${new Date(profil.date_naissance).toLocaleDateString('fr-FR')}`}
        </Text>
      </View>

      {/* ── Historique ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitre}>Historique des Dépistages</Text>
        <Text style={styles.sectionSousTitre}>{historique.length} évaluation(s) enregistrée(s)</Text>
      </View>

      {erreur && (
        <View style={styles.alerteErreur}>
          <Text style={styles.alerteErreurTexte}>{erreur}</Text>
        </View>
      )}

      {historique.length === 0 && !erreur && (
        <View style={styles.etiquetteVide}>
          <Text style={styles.etiquetteVideTexte}>
            Aucun dépistage enregistré pour le moment.{'\n'}
            Utilisez l'onglet Auto-évaluation pour commencer.
          </Text>
        </View>
      )}

      {historique.map((h) => {
        const couleurs = COULEUR_RISQUE[h.niveau_risque] ?? COULEUR_RISQUE.FAIBLE;
        return (
          <View key={h.id} style={styles.cardHistorique}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateEval}>
                {new Date(h.evalue_le).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric'
                })}
              </Text>
              <Text style={styles.scoreEval}>Score de risque : {h.score} / 100</Text>
            </View>
            <View style={[styles.badgeRisque, { backgroundColor: couleurs.fond }]}>
              <Text style={[styles.badgeRisqueTexte, { color: couleurs.texte }]}>
                {h.niveau_risque_libelle ?? h.niveau_risque}
              </Text>
            </View>
          </View>
        );
      })}

      {/* ── Déconnexion ── */}
      <TouchableOpacity style={styles.btnDeconnexion} onPress={seDeconnecter}>
        <Text style={styles.btnDeconnexionTexte}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f6ff', padding: 16 },
  centreChargement: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f6ff' },
  texteChargement: { marginTop: 12, color: '#64748b', fontSize: 14 },

  cardIdentite: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeMinistere: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  badgeMinistereTexte: { fontSize: 10, color: '#2563eb', fontWeight: '700' },
  avatarCercle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarInitiales: { color: '#fff', fontSize: 22, fontWeight: '900' },
  nomCitoyen: { fontSize: 22, fontWeight: '800', color: '#0f2c59', textAlign: 'center' },
  insCitoyen: { fontSize: 13, fontWeight: '700', color: '#64748b', marginTop: 4 },
  infoCitoyen: { fontSize: 12, color: '#94a3b8', marginTop: 6, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  sectionTitre: { fontSize: 17, fontWeight: '800', color: '#0f2c59' },
  sectionSousTitre: { fontSize: 12, color: '#94a3b8' },

  alerteErreur: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 12 },
  alerteErreurTexte: { color: '#b91c1c', fontSize: 13 },

  etiquetteVide: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 12 },
  etiquetteVideTexte: { color: '#94a3b8', textAlign: 'center', fontSize: 13, lineHeight: 20 },

  cardHistorique: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateEval: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  scoreEval: { fontSize: 12, color: '#64748b', marginTop: 3 },
  badgeRisque: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, marginLeft: 8 },
  badgeRisqueTexte: { fontWeight: '800', fontSize: 12 },

  btnDeconnexion: {
    marginTop: 24,
    marginBottom: 32,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  btnDeconnexionTexte: { color: '#b91c1c', fontWeight: '700', fontSize: 14 },
});
