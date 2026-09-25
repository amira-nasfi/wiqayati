/**
 * Écran Dossier Citoyen — Wiqayati Mobile
 * Profil de santé et historique des dépistages de risque diabète.
 * v2 — Ajout StatutDernierBilan + CTA adaptatif + design tokens enrichis.
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
import { useRouter } from 'expo-router';
import { useAuth } from '../api/authContext';
import apiMobile from '../api/client';
import { WiqayatiTokens } from '../constants/theme';
import { StatutDernierBilan } from '../components/StatutDernierBilan';

interface Evaluation {
  id: string;
  evalue_le: string;
  score: number;
  niveau_risque: 'FAIBLE' | 'INTERMEDIAIRE' | 'ELEVE';
  niveau_risque_libelle: string;
}

const COULEUR_RISQUE: Record<string, { fond: string; texte: string; bordure: string }> = {
  ELEVE: {
    fond: WiqayatiTokens.colors.risk.eleve.surface,
    texte: WiqayatiTokens.colors.risk.eleve.text,
    bordure: WiqayatiTokens.colors.risk.eleve.border,
  },
  INTERMEDIAIRE: {
    fond: WiqayatiTokens.colors.risk.intermediaire.surface,
    texte: WiqayatiTokens.colors.risk.intermediaire.text,
    bordure: WiqayatiTokens.colors.risk.intermediaire.border,
  },
  FAIBLE: {
    fond: WiqayatiTokens.colors.risk.faible.surface,
    texte: WiqayatiTokens.colors.risk.faible.text,
    bordure: WiqayatiTokens.colors.risk.faible.border,
  },
};

export default function DossierCitoyenScreen() {
  const { profil, seDeconnecter } = useAuth();
  const router = useRouter();
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
      setErreur("Impossible de charger l'historique médical. Tirez vers le bas pour réessayer.");
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
        <ActivityIndicator size="large" color={WiqayatiTokens.colors.primary} />
        <Text style={styles.texteChargement}>Chargement de votre dossier médical…</Text>
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
          onRefresh={handleRefresh}
          tintColor={WiqayatiTokens.colors.primary}
        />
      }
    >
      {/* ── Statut dernier bilan (C4 — CTA adaptatif) ── */}
      <StatutDernierBilan
        evaluations={historique}
        onNaviguerEvaluation={() => router.push('/autoeval')}
        onNaviguerPlan={() => router.push('/plan')}
      />

      {/* ── Fiche d'identité citoyenne ── */}
      <View style={[styles.cardIdentite, WiqayatiTokens.shadows.card]}>
        <View style={styles.avatarCercle}>
          <Text style={styles.avatarInitiales}>
            {profil?.prenom?.[0]}{profil?.nom?.[0]}
          </Text>
        </View>

        <Text style={styles.nomCitoyen}>{profil?.prenom} {profil?.nom}</Text>
        <Text style={styles.insCitoyen}>Identifiant National de Santé : {profil?.ins}</Text>

        <View style={styles.ligneDetails}>
          {profil?.gouvernorat ? (
            <Text style={styles.infoCitoyen}>Gouvernorat : {profil.gouvernorat}</Text>
          ) : null}
          {profil?.date_naissance ? (
            <Text style={styles.infoCitoyen}>
              Date de naissance : {new Date(profil.date_naissance).toLocaleDateString('fr-FR')}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Historique des évaluations ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitre}>Historique des dépistages</Text>
        <Text style={styles.sectionSousTitre}>{historique.length} évaluation(s)</Text>
      </View>

      {erreur && (
        <View style={styles.alerteErreur}>
          <Text style={styles.alerteErreurTexte}>{erreur}</Text>
        </View>
      )}

      {historique.length === 0 && !erreur && (
        <View style={styles.etiquetteVide}>
          <Text style={styles.etiquetteVideTexte}>
            Aucun dépistage enregistré dans votre dossier.{'\n'}
            Effectuez votre premier bilan dans l'onglet Évaluation.
          </Text>
        </View>
      )}

      {historique.map((h) => {
        const styleRisque = COULEUR_RISQUE[h.niveau_risque] ?? COULEUR_RISQUE.FAIBLE;
        return (
          <View key={h.id} style={styles.cardHistorique}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateEval}>
                {new Date(h.evalue_le).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.scoreEval}>Score FINDRISC : {h.score} / 100</Text>
            </View>

            <View style={[styles.badgeRisque, { backgroundColor: styleRisque.fond, borderColor: styleRisque.bordure }]}>
              <Text style={[styles.badgeRisqueTexte, { color: styleRisque.texte }]}>
                {h.niveau_risque_libelle ?? h.niveau_risque}
              </Text>
            </View>
          </View>
        );
      })}

      {/* ── Déconnexion ── */}
      <TouchableOpacity style={styles.btnDeconnexion} onPress={seDeconnecter}>
        <Text style={styles.btnDeconnexionTexte}>Fermer la session sécurisée</Text>
      </TouchableOpacity>
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
  centreChargement: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WiqayatiTokens.colors.canvas,
  },
  texteChargement: {
    marginTop: 12,
    color: WiqayatiTokens.colors.textSecondary,
    fontSize: 14,
  },

  cardIdentite: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderRadius: WiqayatiTokens.radii.lg,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  avatarCercle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: WiqayatiTokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...WiqayatiTokens.shadows.elevated,
  },
  avatarInitiales: {
    color: '#FFFFFF',
    ...WiqayatiTokens.typography.h2,
  },
  nomCitoyen: {
    ...WiqayatiTokens.typography.h2,
    color: WiqayatiTokens.colors.textPrimary,
    textAlign: 'center',
  },
  insCitoyen: {
    ...WiqayatiTokens.typography.caption,
    fontWeight: '600' as const,
    color: WiqayatiTokens.colors.textSecondary,
    marginTop: 3,
  },
  ligneDetails: {
    marginTop: 8,
    alignItems: 'center',
  },
  infoCitoyen: {
    fontSize: 12,
    color: WiqayatiTokens.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitre: {
    fontSize: 15,
    fontWeight: '700',
    color: WiqayatiTokens.colors.textPrimary,
  },
  sectionSousTitre: {
    fontSize: 12,
    color: WiqayatiTokens.colors.textSecondary,
  },

  alerteErreur: {
    backgroundColor: WiqayatiTokens.colors.risk.eleve.surface,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.risk.eleve.border,
    borderRadius: WiqayatiTokens.radii.sm,
    padding: 12,
    marginBottom: 12,
  },
  alerteErreurTexte: {
    color: WiqayatiTokens.colors.risk.eleve.text,
    fontSize: 13,
  },

  etiquetteVide: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  etiquetteVideTexte: {
    color: WiqayatiTokens.colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },

  cardHistorique: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    ...WiqayatiTokens.shadows.card,
  },
  dateEval: {
    ...WiqayatiTokens.typography.bodyMedium,
    color: WiqayatiTokens.colors.textPrimary,
  },
  scoreEval: {
    ...WiqayatiTokens.typography.caption,
    color: WiqayatiTokens.colors.textSecondary,
    marginTop: 2,
  },
  badgeRisque: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: WiqayatiTokens.radii.xs,
    borderWidth: 1,
    marginLeft: 8,
  },
  badgeRisqueTexte: {
    fontWeight: '600',
    fontSize: 11.5,
  },

  btnDeconnexion: {
    marginTop: 20,
    marginBottom: 28,
    padding: 12,
    borderRadius: WiqayatiTokens.radii.sm,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    alignItems: 'center',
    backgroundColor: WiqayatiTokens.colors.surface,
  },
  btnDeconnexionTexte: {
    color: WiqayatiTokens.colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
