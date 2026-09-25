/**
 * Hook useSuiviQuotidien — Wiqayati Mobile
 * Gestion du suivi quotidien local (AsyncStorage) avec sync serveur optionnelle.
 *
 * Règles métier :
 * - Source de vérité : AsyncStorage (offline-first)
 * - Les objectifs sont rechargés depuis plan_actif à chaque appel (C2 — pas d'invalidation manuelle)
 * - objectifs_coches stocke les INDEX des objectifs cochés (C3 — granularité badge individuel)
 * - Sync serveur : fire-and-forget, ne bloque jamais l'UI
 */
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiMobile from '../api/client';

// ─── Modèle de données ───────────────────────────────────────────────────────

export interface EnregistrementSuiviJournalier {
  date: string;           // 'YYYY-MM-DD'
  citoyen_ins: string;
  activite: {
    faite: boolean;
    duree_minutes?: number;
    note_libre?: string;
  };
  /** Stocke les INDEX (0-based) des objectifs du plan cochés ce jour.
   *  Ex : [0, 2] → 1er et 3e objectif cochés (permet badge individuel). */
  nutrition: {
    objectifs_coches: number[];
    total_objectifs: number;   // snapshot de plan_nutrition.objectifs.length
    note_libre?: string;
  };
  saisi_a: string;   // ISO datetime
  synced: boolean;
}

export interface SemaineSuivi {
  [dateISO: string]: EnregistrementSuiviJournalier | null;
}

// ─── Helpers clé AsyncStorage ─────────────────────────────────────────────────

const cleStorage = (ins: string, date: string) => `wq_suivi_${ins}_${date}`;

const dateISO = (d: Date = new Date()) =>
  d.toISOString().slice(0, 10);

/** Retourne les 7 derniers jours (aujourd'hui inclus) au format YYYY-MM-DD */
const septDernierJours = (): string[] => {
  const jours: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    jours.push(dateISO(d));
  }
  return jours;
};

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useSuiviQuotidien(citoyenIns: string) {
  const [suiviDuJour, setSuiviDuJour] = useState<EnregistrementSuiviJournalier | null>(null);
  const [semaineEnCours, setSemaineEnCours] = useState<SemaineSuivi>({});
  const [chargement, setChargement] = useState(false);
  const [erreurSync, setErreurSync] = useState(false);

  // ── Charger le suivi d'un jour précis ──────────────────────────────────────
  const chargerSuiviDuJour = useCallback(async (date: string = dateISO()) => {
    if (!citoyenIns) return null;
    try {
      const raw = await AsyncStorage.getItem(cleStorage(citoyenIns, date));
      const enreg = raw ? (JSON.parse(raw) as EnregistrementSuiviJournalier) : null;
      setSuiviDuJour(enreg);
      return enreg;
    } catch {
      return null;
    }
  }, [citoyenIns]);

  // ── Charger les 7 derniers jours ───────────────────────────────────────────
  const chargerSemaineEnCours = useCallback(async () => {
    if (!citoyenIns) return;
    setChargement(true);
    try {
      const jours = septDernierJours();
      const entrees = await AsyncStorage.multiGet(
        jours.map((j) => cleStorage(citoyenIns, j))
      );
      const semaine: SemaineSuivi = {};
      entrees.forEach((pair: [string, string | null], idx: number) => {
        const val = pair[1];
        semaine[jours[idx]] = val ? (JSON.parse(val) as EnregistrementSuiviJournalier) : null;
      });
      setSemaineEnCours(semaine);
    } finally {
      setChargement(false);
    }
  }, [citoyenIns]);

  // ── Sauvegarder / mettre à jour un enregistrement ─────────────────────────
  const sauvegarderSuivi = useCallback(async (
    partiel: Partial<EnregistrementSuiviJournalier> & { date?: string }
  ) => {
    if (!citoyenIns) return;
    const date = partiel.date ?? dateISO();
    const cle = cleStorage(citoyenIns, date);

    // Lire l'existant pour merger (pas d'écrasement total)
    let existant: EnregistrementSuiviJournalier | null = null;
    try {
      const raw = await AsyncStorage.getItem(cle);
      if (raw) existant = JSON.parse(raw);
    } catch { /* pas de données existantes */ }

    const enreg: EnregistrementSuiviJournalier = {
      date,
      citoyen_ins: citoyenIns,
      activite: partiel.activite ?? existant?.activite ?? { faite: false },
      nutrition: partiel.nutrition ?? existant?.nutrition ?? {
        objectifs_coches: [],
        total_objectifs: 0,
      },
      saisi_a: new Date().toISOString(),
      synced: false,
    };

    await AsyncStorage.setItem(cle, JSON.stringify(enreg));
    setSuiviDuJour(enreg);
    setSemaineEnCours((prev) => ({ ...prev, [date]: enreg }));

    // Sync serveur fire-and-forget (ne bloque pas l'UI)
    syncServerSilencieux(enreg);

    return enreg;
  }, [citoyenIns]);

  // ── Cocher / décocher un objectif nutrition ────────────────────────────────
  const toggleObjectifNutrition = useCallback(async (
    indexObjectif: number,
    totalObjectifs: number,
    date: string = dateISO()
  ) => {
    const actuel = await chargerSuiviDuJour(date);
    const cochesActuels = actuel?.nutrition?.objectifs_coches ?? [];
    const dejaCoché = cochesActuels.includes(indexObjectif);
    const nouveauxCoches = dejaCoché
      ? cochesActuels.filter((i) => i !== indexObjectif)
      : [...cochesActuels, indexObjectif].sort((a, b) => a - b);

    return sauvegarderSuivi({
      date,
      nutrition: {
        objectifs_coches: nouveauxCoches,
        total_objectifs: totalObjectifs,
        note_libre: actuel?.nutrition?.note_libre,
      },
    });
  }, [chargerSuiviDuJour, sauvegarderSuivi]);

  // ── Marquer l'activité physique ────────────────────────────────────────────
  const marquerActivite = useCallback(async (
    faite: boolean,
    dureeMinutes?: number,
    date: string = dateISO()
  ) => {
    const actuel = await chargerSuiviDuJour(date);
    return sauvegarderSuivi({
      date,
      activite: {
        faite,
        duree_minutes: dureeMinutes,
        note_libre: actuel?.activite?.note_libre,
      },
    });
  }, [chargerSuiviDuJour, sauvegarderSuivi]);

  return {
    suiviDuJour,
    semaineEnCours,
    chargement,
    erreurSync,
    chargerSuiviDuJour,
    chargerSemaineEnCours,
    sauvegarderSuivi,
    toggleObjectifNutrition,
    marquerActivite,
    dateISO,
  };
}

// ─── Sync serveur silencieuse ─────────────────────────────────────────────────

async function syncServerSilencieux(enreg: EnregistrementSuiviJournalier) {
  try {
    await apiMobile.post('/citoyen/suivi-quotidien/', {
      date: enreg.date,
      activite_faite: enreg.activite.faite,
      activite_duree_minutes: enreg.activite.duree_minutes ?? null,
      nutrition_objectifs_coches: enreg.nutrition.objectifs_coches,
      nutrition_total_objectifs: enreg.nutrition.total_objectifs,
    });
    // Marquer synced=true en local
    const cle = cleStorage(enreg.citoyen_ins, enreg.date);
    const synced: EnregistrementSuiviJournalier = { ...enreg, synced: true };
    await AsyncStorage.setItem(cle, JSON.stringify(synced));
  } catch {
    // Silencieux — l'app continue en mode offline, indicateur de sync géré par erreurSync
  }
}
