/**
 * Écran Auto-évaluation — Wiqayati Mobile
 * Permet au citoyen de soumettre une auto-évaluation de ses facteurs de risque.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import apiMobile from '../api/client';

type NiveauActivite = 'SEDENTAIRE' | 'FAIBLE' | 'MODERE' | 'ACTIF';
type QualiteAlimentation = 'MAUVAISE' | 'MOYENNE' | 'BONNE';
type StatutTabac = 'JAMAIS' | 'ANCIEN' | 'ACTIF';
type Genre = 'M' | 'F';

const NIVEAUX_ACTIVITE: { valeur: NiveauActivite; libelle: string }[] = [
  { valeur: 'SEDENTAIRE', libelle: 'Sédentaire' },
  { valeur: 'FAIBLE',     libelle: 'Faible' },
  { valeur: 'MODERE',     libelle: 'Modéré' },
  { valeur: 'ACTIF',      libelle: 'Actif' },
];

const QUALITE_ALIM: { valeur: QualiteAlimentation; libelle: string }[] = [
  { valeur: 'MAUVAISE', libelle: 'Mauvaise' },
  { valeur: 'MOYENNE',  libelle: 'Moyenne' },
  { valeur: 'BONNE',    libelle: 'Bonne' },
];

const TABAC: { valeur: StatutTabac; libelle: string }[] = [
  { valeur: 'JAMAIS', libelle: 'Jamais' },
  { valeur: 'ANCIEN', libelle: 'Ex-fumeur' },
  { valeur: 'ACTIF',  libelle: 'Fumeur actif' },
];

function SectionChoix<T extends string>({
  label,
  options,
  valeurActuelle,
  onChange,
}: {
  label: string;
  options: { valeur: T; libelle: string }[];
  valeurActuelle: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choixRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.valeur}
            style={[
              styles.choixBtn,
              valeurActuelle === opt.valeur && styles.choixBtnActif,
            ]}
            onPress={() => onChange(opt.valeur)}
          >
            <Text
              style={[
                styles.choixBtnTexte,
                valeurActuelle === opt.valeur && styles.choixBtnTexteActif,
              ]}
            >
              {opt.libelle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const COULEUR_NIVEAU: Record<string, { fond: string; texte: string; bordure: string }> = {
  ELEVE:         { fond: '#fee2e2', texte: '#991b1b', bordure: '#fca5a5' },
  INTERMEDIAIRE: { fond: '#fef3c7', texte: '#92400e', bordure: '#fde68a' },
  FAIBLE:        { fond: '#dcfce7', texte: '#166534', bordure: '#86efac' },
};

export default function AutoEvaluationScreen() {
  // Données du formulaire
  const [genre, setGenre]       = useState<Genre>('M');
  const [age, setAge]           = useState('');
  const [imc, setImc]           = useState('');
  const [tourTaille, setTourTaille] = useState('');
  const [taille, setTaille]     = useState('');
  const [tourHanches, setTourHanches] = useState('');
  const [famille, setFamille]   = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [diabeteGest, setDiabeteGest]   = useState(false);
  const [activite, setActivite] = useState<NiveauActivite>('MODERE');
  const [alimentation, setAlimentation] = useState<QualiteAlimentation>('MOYENNE');
  const [tabac, setTabac]       = useState<StatutTabac>('JAMAIS');

  // État UI
  const [chargement, setChargement] = useState(false);
  const [resultat, setResultat]     = useState<any | null>(null);
  const [erreur, setErreur]         = useState<string | null>(null);

  const validerFormulaire = (): string | null => {
    if (!age || isNaN(Number(age)) || Number(age) < 18 || Number(age) > 120)
      return "Veuillez saisir un âge valide (18–120 ans).";
    if (!imc || isNaN(Number(imc)) || Number(imc) < 10 || Number(imc) > 80)
      return "Veuillez saisir un IMC valide (ex : 24.5).";
    return null;
  };

  const soumettre = async () => {
    const errValidation = validerFormulaire();
    if (errValidation) { setErreur(errValidation); return; }

    setChargement(true);
    setErreur(null);
    setResultat(null);
    try {
      const resp = await apiMobile.post('/citoyen/auto-evaluation/', {
        donnees: {
          genre,
          age: Number(age),
          imc: Number(imc),
          tour_taille_cm: tourTaille ? Number(tourTaille) : undefined,
          taille_cm: taille ? Number(taille) : undefined,
          tour_hanches_cm: tourHanches ? Number(tourHanches) : undefined,
          antecedents_familiaux_diabete: famille,
          hypertension_diagnostiquee: hypertension,
          diabete_gestationnel_antecedent: diabeteGest,
          niveau_activite_physique: activite,
          qualite_alimentation: alimentation,
          statut_tabagisme: tabac,
          glycemie_jeun_connue: false,
          glycemie_jeun_mmol: null,
          medicaments_corticoides: false,
          acanthosis_nigricans: false,
        },
      });
      setResultat(resp.data);
    } catch (err: any) {
      setErreur(
        err.response?.data?.erreur ||
        err.response?.data?.detail ||
        "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setChargement(false);
    }
  };

  const reinitialiser = () => {
    setResultat(null);
    setErreur(null);
  };

  // Affichage du résultat
  if (resultat) {
    const eval_ = resultat.evaluation;
    const couleurs = COULEUR_NIVEAU[eval_?.niveau_risque] ?? COULEUR_NIVEAU.FAIBLE;
    return (
      <ScrollView style={styles.container}>
        <View style={[styles.resultatCard, { backgroundColor: couleurs.fond, borderColor: couleurs.bordure }]}>
          <Text style={styles.resultatEmoji}>
            {eval_?.niveau_risque === 'ELEVE' ? '🔴' : eval_?.niveau_risque === 'INTERMEDIAIRE' ? '🟡' : '🟢'}
          </Text>
          <Text style={[styles.resultatNiveau, { color: couleurs.texte }]}>
            Niveau de risque : {eval_?.niveau_risque_libelle ?? eval_?.niveau_risque}
          </Text>
          <Text style={[styles.resultatScore, { color: couleurs.texte }]}>
            Score : {eval_?.score} / 100
          </Text>
          <Text style={[styles.resultatMsg, { color: couleurs.texte }]}>
            {resultat.message}
          </Text>
        </View>

        {/* Facteurs contributeurs */}
        {eval_?.facteurs_principaux?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitre}>Facteurs de risque identifiés</Text>
            {eval_.facteurs_principaux.map((f: string, i: number) => (
              <View key={i} style={styles.facteurRow}>
                <Text style={styles.facteurBullet}>⚠</Text>
                <Text style={styles.facteurTexte}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.btnSecondaire} onPress={reinitialiser}>
          <Text style={styles.btnSecondaireTexte}>Effectuer une nouvelle évaluation</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titrePage}>Auto-évaluation du Risque</Text>
      <Text style={styles.sousTitrePage}>
        Renseignez vos informations pour obtenir une estimation immédiate de votre niveau de risque de diabète de type 2.
      </Text>

      {erreur && (
        <View style={styles.alerteErreur}>
          <Text style={styles.alerteErreurTexte}>⚠ {erreur}</Text>
        </View>
      )}

      {/* ── Informations personnelles ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitre}>Informations générales</Text>

        <SectionChoix
          label="Genre"
          options={[{ valeur: 'M', libelle: 'Masculin' }, { valeur: 'F', libelle: 'Féminin' }]}
          valeurActuelle={genre}
          onChange={setGenre}
        />

        <Text style={styles.label}>Âge (années)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 45"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
          returnKeyType="next"
        />

        <Text style={styles.label}>Indice de Masse Corporelle — IMC (kg/m²)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 26.5"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          value={imc}
          onChangeText={setImc}
          returnKeyType="next"
        />

        <Text style={styles.label}>Tour de taille (cm) — optionnel</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 92"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={tourTaille}
          onChangeText={setTourTaille}
        />

        <Text style={styles.label}>Taille (cm) — optionnel</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 170"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={taille}
          onChangeText={setTaille}
        />

        <Text style={styles.label}>Tour de hanches (cm) — optionnel</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 100"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={tourHanches}
          onChangeText={setTourHanches}
        />
      </View>

      {/* ── Antécédents ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitre}>Antécédents médicaux</Text>

        {([
          { label: 'Antécédents familiaux de diabète (1er degré)', etat: famille, toggle: setFamille },
          { label: 'Hypertension artérielle diagnostiquée', etat: hypertension, toggle: setHypertension },
          { label: 'Diabète gestationnel (pour les femmes)', etat: diabeteGest, toggle: setDiabeteGest },
        ] as const).map(({ label, etat, toggle }: any) => (
          <TouchableOpacity
            key={label}
            style={[styles.checkBtn, etat && styles.checkBtnActif]}
            onPress={() => toggle(!etat)}
          >
            <View style={[styles.checkbox, etat && styles.checkboxActif]}>
              {etat && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
            </View>
            <Text style={[styles.checkTexte, etat && styles.checkTexteActif]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Habitudes de vie ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitre}>Habitudes de vie</Text>
        <SectionChoix label="Niveau d'activité physique" options={NIVEAUX_ACTIVITE} valeurActuelle={activite} onChange={setActivite} />
        <SectionChoix label="Qualité de l'alimentation" options={QUALITE_ALIM} valeurActuelle={alimentation} onChange={setAlimentation} />
        <SectionChoix label="Statut tabagique" options={TABAC} valeurActuelle={tabac} onChange={setTabac} />
      </View>

      <TouchableOpacity
        style={[styles.btnPrincipal, chargement && { opacity: 0.7 }]}
        onPress={soumettre}
        disabled={chargement}
      >
        {chargement ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnPrincipalTexte}>Calculer mon niveau de risque →</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f6ff', padding: 16 },
  titrePage: { fontSize: 22, fontWeight: '900', color: '#0f2c59', marginBottom: 4 },
  sousTitrePage: { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 18 },

  alerteErreur: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 },
  alerteErreurTexte: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

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
  cardTitre: { fontSize: 16, fontWeight: '800', color: '#0f2c59', marginBottom: 14 },

  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },

  choixRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choixBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  choixBtnActif: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  choixBtnTexte: { fontSize: 13, color: '#475569', fontWeight: '600' },
  choixBtnTexteActif: { color: '#1e40af', fontWeight: '800' },

  checkBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#f8fafc', marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  checkBtnActif: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxActif: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkTexte: { fontSize: 13, color: '#475569', flex: 1, lineHeight: 18 },
  checkTexteActif: { color: '#1e40af', fontWeight: '600' },

  btnPrincipal: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrincipalTexte: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  // ── Résultat ──
  resultatCard: { borderRadius: 20, padding: 24, marginBottom: 20, alignItems: 'center', borderWidth: 2 },
  resultatEmoji: { fontSize: 48, marginBottom: 12 },
  resultatNiveau: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  resultatScore: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  resultatMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  facteurRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  facteurBullet: { color: '#f59e0b', marginRight: 8, fontSize: 14 },
  facteurTexte: { fontSize: 13, color: '#475569', flex: 1, lineHeight: 18 },

  btnSecondaire: { marginTop: 8, marginBottom: 32, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#2563eb', alignItems: 'center' },
  btnSecondaireTexte: { color: '#2563eb', fontWeight: '700', fontSize: 14 },
});
