/**
 * Écran Auto-évaluation — Wiqayati Mobile
 * Outil de dépistage clinique des facteurs de risque du diabète de type 2 (FINDRISC).
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
import { WiqayatiTokens } from '../constants/theme';

type NiveauActivite = 'SEDENTAIRE' | 'FAIBLE' | 'MODERE' | 'ACTIF';
type QualiteAlimentation = 'MAUVAISE' | 'MOYENNE' | 'BONNE';
type StatutTabac = 'JAMAIS' | 'ANCIEN' | 'ACTIF';
type Genre = 'M' | 'F';

const NIVEAUX_ACTIVITE: { valeur: NiveauActivite; libelle: string; icon: string }[] = [
  { valeur: 'SEDENTAIRE', libelle: 'Sédentaire', icon: '🪑' },
  { valeur: 'FAIBLE',     libelle: 'Faible',     icon: '🚶' },
  { valeur: 'MODERE',     libelle: 'Modéré',     icon: '🏃' },
  { valeur: 'ACTIF',      libelle: 'Actif',      icon: '⚡' },
];

const QUALITE_ALIM: { valeur: QualiteAlimentation; libelle: string; icon: string }[] = [
  { valeur: 'MAUVAISE', libelle: 'À améliorer', icon: '🍟' },
  { valeur: 'MOYENNE',  libelle: 'Équilibrée',  icon: '🥗' },
  { valeur: 'BONNE',    libelle: 'Optimale',    icon: '🥑' },
];

const TABAC: { valeur: StatutTabac; libelle: string; icon: string }[] = [
  { valeur: 'JAMAIS', libelle: 'Jamais',       icon: '🌿' },
  { valeur: 'ANCIEN', libelle: 'Ex-fumeur',    icon: '⏳' },
  { valeur: 'ACTIF',  libelle: 'Fumeur actif', icon: '🚬' },
];

function SectionChoix<T extends string>({
  label,
  options,
  valeurActuelle,
  onChange,
}: {
  label: string;
  options: { valeur: T; libelle: string; icon?: string }[];
  valeurActuelle: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choixRow}>
        {options.map((opt) => {
          const estActif = valeurActuelle === opt.valeur;
          return (
            <TouchableOpacity
              key={opt.valeur}
              style={[
                styles.choixBtn,
                estActif && styles.choixBtnActif,
              ]}
              onPress={() => onChange(opt.valeur)}
              activeOpacity={0.7}
            >
              {opt.icon && <Text style={styles.choixIcon}>{opt.icon}</Text>}
              <Text
                style={[
                  styles.choixBtnTexte,
                  estActif && styles.choixBtnTexteActif,
                ]}
              >
                {opt.libelle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AutoEvaluationScreen() {
  // Données du formulaire
  const [genre, setGenre]             = useState<Genre>('M');
  const [age, setAge]                 = useState('');
  const [imc, setImc]                 = useState('');
  const [tourTaille, setTourTaille]   = useState('');
  const [famille, setFamille]         = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [diabeteGest, setDiabeteGest] = useState(false);
  const [activite, setActivite]       = useState<NiveauActivite>('MODERE');
  const [alimentation, setAlimentation] = useState<QualiteAlimentation>('MOYENNE');
  const [tabac, setTabac]             = useState<StatutTabac>('JAMAIS');

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
        "Une erreur est survenue. Veuillez vérifier votre connexion."
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
    const niveau = eval_?.niveau_risque || 'FAIBLE';
    const riskToken = niveau === 'ELEVE'
      ? WiqayatiTokens.colors.risk.eleve
      : niveau === 'INTERMEDIAIRE'
      ? WiqayatiTokens.colors.risk.intermediaire
      : WiqayatiTokens.colors.risk.faible;

    const emojiIcon = niveau === 'ELEVE' ? '⚠️' : niveau === 'INTERMEDIAIRE' ? '⚡' : '🛡️';

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Carte de score principale */}
        <View style={[styles.resultatCard, { backgroundColor: riskToken.surface, borderColor: riskToken.border }]}>
          <View style={[styles.resultatIconWrapper, { backgroundColor: riskToken.border }]}>
            <Text style={styles.resultatEmoji}>{emojiIcon}</Text>
          </View>
          
          <Text style={[styles.resultatTitreBadge, { color: riskToken.text }]}>
            NIVEAU ESTIMÉ
          </Text>

          <Text style={[styles.resultatNiveau, { color: riskToken.text }]}>
            {eval_?.niveau_risque_libelle ?? eval_?.niveau_risque}
          </Text>

          <View style={styles.scoreContainer}>
            <Text style={[styles.resultatScore, { color: riskToken.base }]}>
              {eval_?.score ?? 0}
            </Text>
            <Text style={[styles.resultatScoreMax, { color: riskToken.text }]}>/ 100</Text>
          </View>

          <Text style={[styles.resultatMsg, { color: riskToken.text }]}>
            {resultat.message}
          </Text>
        </View>

        {/* Facteurs identifiés */}
        {eval_?.facteurs_principaux?.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderIcon}>🔍</Text>
              <Text style={styles.cardTitre}>Facteurs contributifs</Text>
            </View>
            <View style={styles.facteursList}>
              {eval_.facteurs_principaux.map((f: string, i: number) => (
                <View key={i} style={styles.facteurRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.facteurTexte}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Note médicale */}
        <View style={styles.infoNoteCard}>
          <Text style={styles.infoNoteText}>
            💡 Ce dépistage est indicatif. Parlez-en à votre professionnel de santé ou consultez votre plan de prévention personnalisé.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btnSecondaire}
          onPress={reinitialiser}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSecondaireTexte}>Nouvelle auto-évaluation</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* En-tête clinique */}
      <View style={styles.header}>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>🔬 Outil FINDRISC Adapté</Text>
        </View>
        <Text style={styles.titrePage}>Auto-évaluation</Text>
        <Text style={styles.sousTitrePage}>
          Évaluez en 2 minutes vos facteurs métaboliques et prédispositions au diabète de type 2.
        </Text>
      </View>

      {/* Guide visuel des 3 étapes */}
      <View style={styles.etapesRow}>
        <View style={[styles.etapeBadge, styles.etapeBadgeActif]}>
          <Text style={styles.etapeNumero}>1</Text>
          <Text style={styles.etapeLibelle}>Général</Text>
        </View>
        <View style={styles.etapeLigne} />
        <View style={[styles.etapeBadge, styles.etapeBadgeActif]}>
          <Text style={styles.etapeNumero}>2</Text>
          <Text style={styles.etapeLibelle}>Médical</Text>
        </View>
        <View style={styles.etapeLigne} />
        <View style={[styles.etapeBadge, styles.etapeBadgeActif]}>
          <Text style={styles.etapeNumero}>3</Text>
          <Text style={styles.etapeLibelle}>Habitudes</Text>
        </View>
      </View>

      {erreur && (
        <View style={styles.alerteErreur}>
          <Text style={styles.alerteErreurTexte}>⚠️ {erreur}</Text>
        </View>
      )}

      {/* ── Section 1 : Informations personnelles ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderIcon}>👤</Text>
          <Text style={styles.cardTitre}>1. Paramètres corporels</Text>
        </View>

        <SectionChoix
          label="Genre biologique"
          options={[
            { valeur: 'M', libelle: 'Homme', icon: '♂️' },
            { valeur: 'F', libelle: 'Femme', icon: '♀️' },
          ]}
          valeurActuelle={genre}
          onChange={setGenre}
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Âge (années)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : 45"
            placeholderTextColor={WiqayatiTokens.colors.textMuted}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelWithHint}>
            <Text style={styles.label}>Indice de Masse Corporelle (IMC)</Text>
            <Text style={styles.labelHint}>Poids/(Taille)²</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ex : 26.5"
            placeholderTextColor={WiqayatiTokens.colors.textMuted}
            keyboardType="decimal-pad"
            value={imc}
            onChangeText={setImc}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelWithHint}>
            <Text style={styles.label}>Tour de taille (cm)</Text>
            <Text style={styles.labelHint}>Optionnel</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ex : 88"
            placeholderTextColor={WiqayatiTokens.colors.textMuted}
            keyboardType="numeric"
            value={tourTaille}
            onChangeText={setTourTaille}
          />
        </View>
      </View>

      {/* ── Section 2 : Antécédents ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderIcon}>🩺</Text>
          <Text style={styles.cardTitre}>2. Antécédents médicaux</Text>
        </View>

        {([
          {
            label: 'Antécédents familiaux de diabète',
            sousLabel: 'Parents, fratrie ou enfants de 1er degré',
            etat: famille,
            toggle: setFamille,
          },
          {
            label: 'Hypertension artérielle traitée ou connue',
            sousLabel: 'Pression artérielle ≥ 140/90 mmHg',
            etat: hypertension,
            toggle: setHypertension,
          },
          ...(genre === 'F'
            ? [
                {
                  label: 'Antécédent de diabète gestationnel',
                  sousLabel: 'Découvert pendant une grossesse',
                  etat: diabeteGest,
                  toggle: setDiabeteGest,
                },
              ]
            : []),
        ]).map(({ label, sousLabel, etat, toggle }: any) => (
          <TouchableOpacity
            key={label}
            style={[styles.checkBtn, etat && styles.checkBtnActif]}
            onPress={() => toggle(!etat)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, etat && styles.checkboxActif]}>
              {etat && <Text style={styles.checkCheckmark}>✓</Text>}
            </View>
            <View style={styles.checkTextGroup}>
              <Text style={[styles.checkTexte, etat && styles.checkTexteActif]}>
                {label}
              </Text>
              {sousLabel && (
                <Text style={styles.checkSousTexte}>{sousLabel}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Section 3 : Habitudes de vie ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderIcon}>🌱</Text>
          <Text style={styles.cardTitre}>3. Habitudes de vie</Text>
        </View>

        <SectionChoix
          label="Niveau d'activité physique habituel"
          options={NIVEAUX_ACTIVITE}
          valeurActuelle={activite}
          onChange={setActivite}
        />
        <SectionChoix
          label="Qualité de l'alimentation au quotidien"
          options={QUALITE_ALIM}
          valeurActuelle={alimentation}
          onChange={setAlimentation}
        />
        <SectionChoix
          label="Statut tabagique"
          options={TABAC}
          valeurActuelle={tabac}
          onChange={setTabac}
        />
      </View>

      {/* Bouton de calcul */}
      <TouchableOpacity
        style={[styles.btnPrincipal, chargement && { opacity: 0.75 }]}
        onPress={soumettre}
        disabled={chargement}
        activeOpacity={0.85}
      >
        {chargement ? (
          <ActivityIndicator color={WiqayatiTokens.colors.textInverse} size="small" />
        ) : (
          <Text style={styles.btnPrincipalTexte}>Calculer mon niveau de risque →</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
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
  },
  header: {
    marginBottom: 16,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: WiqayatiTokens.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: WiqayatiTokens.radii.full,
    marginBottom: 8,
  },
  badgePillText: {
    color: WiqayatiTokens.colors.primary,
    ...WiqayatiTokens.typography.label,
  },
  titrePage: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.h1,
    marginBottom: 4,
  },
  sousTitrePage: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.body,
    lineHeight: 20,
  },

  // Étapes
  etapesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WiqayatiTokens.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: WiqayatiTokens.radii.lg,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    marginBottom: 16,
    ...WiqayatiTokens.shadows.card,
  },
  etapeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etapeBadgeActif: {
    opacity: 1,
  },
  etapeNumero: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WiqayatiTokens.colors.primaryLight,
    color: WiqayatiTokens.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  etapeLibelle: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '600',
  },
  etapeLigne: {
    flex: 1,
    height: 1,
    backgroundColor: WiqayatiTokens.colors.borderSubtle,
    marginHorizontal: 8,
  },

  alerteErreur: {
    backgroundColor: WiqayatiTokens.colors.risk.eleve.surface,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.risk.eleve.border,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 12,
    marginBottom: 16,
  },
  alerteErreurTexte: {
    color: WiqayatiTokens.colors.risk.eleve.text,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '600',
  },

  card: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderRadius: WiqayatiTokens.radii.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    ...WiqayatiTokens.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: WiqayatiTokens.colors.surfaceSubtle,
    paddingBottom: 10,
  },
  cardHeaderIcon: {
    fontSize: 18,
  },
  cardTitre: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.h3,
  },

  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '700',
    marginBottom: 6,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelHint: {
    color: WiqayatiTokens.colors.textMuted,
    ...WiqayatiTokens.typography.micro,
  },
  input: {
    borderWidth: 1.5,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: WiqayatiTokens.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    color: WiqayatiTokens.colors.textPrimary,
  },

  // Choix boutons
  choixRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: WiqayatiTokens.radii.md,
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: WiqayatiTokens.colors.border,
    gap: 6,
  },
  choixBtnActif: {
    backgroundColor: WiqayatiTokens.colors.primaryLight,
    borderColor: WiqayatiTokens.colors.primary,
  },
  choixIcon: {
    fontSize: 14,
  },
  choixBtnTexte: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '600',
  },
  choixBtnTexteActif: {
    color: WiqayatiTokens.colors.primary,
    fontWeight: '800',
  },

  // Check buttons
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: WiqayatiTokens.radii.md,
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: WiqayatiTokens.colors.border,
  },
  checkBtnActif: {
    backgroundColor: WiqayatiTokens.colors.accentLight,
    borderColor: WiqayatiTokens.colors.accent,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: WiqayatiTokens.colors.border,
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WiqayatiTokens.colors.surface,
  },
  checkboxActif: {
    backgroundColor: WiqayatiTokens.colors.accent,
    borderColor: WiqayatiTokens.colors.accent,
  },
  checkCheckmark: {
    color: WiqayatiTokens.colors.textInverse,
    fontSize: 12,
    fontWeight: '900',
  },
  checkTextGroup: {
    flex: 1,
  },
  checkTexte: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '600',
    lineHeight: 18,
  },
  checkTexteActif: {
    color: WiqayatiTokens.colors.accent,
    fontWeight: '700',
  },
  checkSousTexte: {
    color: WiqayatiTokens.colors.textMuted,
    ...WiqayatiTokens.typography.micro,
    marginTop: 2,
  },

  // Bouton principal
  btnPrincipal: {
    backgroundColor: WiqayatiTokens.colors.primary,
    paddingVertical: 15,
    borderRadius: WiqayatiTokens.radii.lg,
    alignItems: 'center',
    marginTop: 6,
    ...WiqayatiTokens.shadows.elevated,
  },
  btnPrincipalTexte: {
    color: WiqayatiTokens.colors.textInverse,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // ── Résultat ──
  resultatCard: {
    borderRadius: WiqayatiTokens.radii.xl,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    ...WiqayatiTokens.shadows.elevated,
  },
  resultatIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultatEmoji: {
    fontSize: 28,
  },
  resultatTitreBadge: {
    ...WiqayatiTokens.typography.micro,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultatNiveau: {
    ...WiqayatiTokens.typography.h1,
    textAlign: 'center',
    marginBottom: 6,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  resultatScore: {
    fontSize: 34,
    fontWeight: '900',
  },
  resultatScoreMax: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  resultatMsg: {
    ...WiqayatiTokens.typography.body,
    textAlign: 'center',
    lineHeight: 21,
  },

  facteursList: {
    gap: 8,
  },
  facteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WiqayatiTokens.colors.accent,
  },
  facteurTexte: {
    ...WiqayatiTokens.typography.body,
    color: WiqayatiTokens.colors.textPrimary,
    flex: 1,
  },

  infoNoteCard: {
    backgroundColor: WiqayatiTokens.colors.surfaceHighlight,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
  },
  infoNoteText: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.caption,
    lineHeight: 18,
  },

  btnSecondaire: {
    padding: 14,
    borderRadius: WiqayatiTokens.radii.lg,
    borderWidth: 1.5,
    borderColor: WiqayatiTokens.colors.primary,
    backgroundColor: WiqayatiTokens.colors.surface,
    alignItems: 'center',
  },
  btnSecondaireTexte: {
    color: WiqayatiTokens.colors.primary,
    ...WiqayatiTokens.typography.bodyMedium,
    fontWeight: '700',
  },
});

