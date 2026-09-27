/**
 * Écran de connexion citoyen — Wiqayati Mobile
 * Authentification par CIN + Date de naissance (mode principal)
 * ou par INS + code PIN (mode alternatif).
 */
import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { AlertTriangle, CreditCard, Calendar, CheckCircle, User, Lock } from 'lucide-react-native';
import { useAuth } from '../api/authContext';
import { BASE_API_URL } from '../api/client';
import { WiqayatiTokens } from '../constants/theme';
import DatePickerInput from '../components/DatePickerInput';

const LOGO = require('../../assets/images/logo.png');

type ModeConnexion = 'cin' | 'ins';

interface ConnexionScreenProps {
  onRetour?: () => void;
}

export default function ConnexionScreen({ onRetour }: ConnexionScreenProps = {}) {
  const { seConnecter, seConnecterParCin } = useAuth();

  const [mode, setMode] = useState<ModeConnexion>('cin');

  // Mode CIN
  const [cin, setCin] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');

  // Mode INS
  const [ins, setIns] = useState('');
  const [pin, setPin] = useState('');

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  };

  const handleConnexion = async () => {
    setErreur(null);

    if (mode === 'cin') {
      if (cin.length !== 8 || !dateNaissance) {
        setErreur('Veuillez saisir un CIN de 8 chiffres et une date de naissance valide.');
        shake();
        return;
      }
      setChargement(true);
      try {
        await seConnecterParCin(cin, dateNaissance);
      } catch (err: any) {
        setErreur(err.message || 'Aucun dossier trouvé pour ce CIN et cette date de naissance.');
        shake();
      } finally {
        setChargement(false);
      }
    } else {
      if (!ins.trim() || !pin.trim()) {
        setErreur('Veuillez saisir votre INS et votre code PIN.');
        shake();
        return;
      }
      setChargement(true);
      try {
        await seConnecter(ins, pin);
      } catch (err: any) {
        setErreur(err.message);
        shake();
      } finally {
        setChargement(false);
      }
    }
  };

  const switchMode = (m: ModeConnexion) => {
    setMode(m);
    setErreur(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {onRetour && (
          <TouchableOpacity
            style={styles.btnRetour}
            onPress={onRetour}
            activeOpacity={0.7}
          >
            <Text style={styles.btnRetourTexte}>← Accueil</Text>
          </TouchableOpacity>
        )}

        {/* En-tête */}
        <View style={styles.header}>
          <Image
            source={LOGO}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appNom}>Wiqayati</Text>
        </View>

        {/* Carte de connexion */}
        <Animated.View
          style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
        >
          <Text style={styles.cardTitre}>Espace Citoyen</Text>

          {/* Sélecteur de mode */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'cin' && styles.modeBtnActif]}
              onPress={() => switchMode('cin')}
              activeOpacity={0.8}
            >
              <CreditCard
                size={14}
                color={mode === 'cin' ? WiqayatiTokens.colors.primary : WiqayatiTokens.colors.textMuted}
              />
              <Text style={[styles.modeBtnTexte, mode === 'cin' && styles.modeBtnTexteActif]}>
                CIN & Date de naissance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'ins' && styles.modeBtnActif]}
              onPress={() => switchMode('ins')}
              activeOpacity={0.8}
            >
              <User
                size={14}
                color={mode === 'ins' ? WiqayatiTokens.colors.primary : WiqayatiTokens.colors.textMuted}
              />
              <Text style={[styles.modeBtnTexte, mode === 'ins' && styles.modeBtnTexteActif]}>
                Par INS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Erreur */}
          {erreur && (
            <View style={styles.alerteErreur}>
              <AlertTriangle size={16} color={WiqayatiTokens.colors.risk.eleve.text} />
              <Text style={styles.alerteErreurTexte}>{erreur}</Text>
            </View>
          )}

          {/* Mode CIN */}
          {mode === 'cin' && (
            <>
              <Text style={styles.cardSousTitre}>
                Identifiez-vous avec votre numéro de CIN et votre date de naissance.
              </Text>

              <View style={styles.champWrapper}>
                <View style={styles.champIcone}>
                  <CreditCard size={16} color={WiqayatiTokens.colors.textMuted} />
                </View>
                <Text style={styles.label}>Numéro CIN (8 chiffres)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex : 08123456"
                  placeholderTextColor={WiqayatiTokens.colors.textMuted}
                  value={cin}
                  onChangeText={(t) => { setCin(t.replace(/\D/g, '').slice(0, 8)); setErreur(null); }}
                  keyboardType="numeric"
                  maxLength={8}
                  returnKeyType="next"
                  editable={!chargement}
                />
                {cin.length > 0 && cin.length < 8 && (
                  <Text style={styles.hintTexte}>{8 - cin.length} chiffre(s) manquant(s)</Text>
                )}
              </View>

              <DatePickerInput
                value={dateNaissance}
                onChange={(d) => {
                  setDateNaissance(d);
                  setErreur(null);
                }}
                label="Date de naissance"
                disabled={chargement}
              />
            </>
          )}

          {/* Mode INS */}
          {mode === 'ins' && (
            <>
              <Text style={styles.cardSousTitre}>
                Connectez-vous avec votre Identifiant National de Santé (INS) et votre code PIN.
              </Text>

              <View style={styles.champWrapper}>
                <View style={styles.champIcone}>
                  <User size={16} color={WiqayatiTokens.colors.textMuted} />
                </View>
                <Text style={styles.label}>Identifiant National de Santé (INS)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex : TUN10001234"
                  placeholderTextColor={WiqayatiTokens.colors.textMuted}
                  value={ins}
                  onChangeText={(t) => setIns(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!chargement}
                />
              </View>

              <View style={styles.champWrapper}>
                <View style={styles.champIcone}>
                  <Lock size={16} color={WiqayatiTokens.colors.textMuted} />
                </View>
                <Text style={styles.label}>Code PIN (4 chiffres)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="• • • •"
                  placeholderTextColor={WiqayatiTokens.colors.textMuted}
                  value={pin}
                  onChangeText={setPin}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleConnexion}
                  editable={!chargement}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.btnConnexion, chargement && styles.btnDesactive]}
            onPress={handleConnexion}
            disabled={chargement}
            activeOpacity={0.85}
          >
            {chargement ? (
              <ActivityIndicator color={WiqayatiTokens.colors.textInverse} size="small" />
            ) : (
              <Text style={styles.btnConnexionTexte}>Accéder à mon espace →</Text>
            )}
          </TouchableOpacity>

          {/* Raccourcis de test / démo */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitre}>Comptes de test (remplissage automatique) :</Text>
            <View style={styles.demoBtns}>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => {
                  setMode('cin');
                  setCin('08123456');
                  setDateNaissance('1980-03-15');
                  setErreur(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.demoBtnNom}>M. Haddad (Élevé)</Text>
                <Text style={styles.demoBtnDetails}>CIN: 08123456 • 15 mars 1980</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => {
                  setMode('cin');
                  setCin('09234567');
                  setDateNaissance('1975-07-22');
                  setErreur(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.demoBtnNom}>F. Belhaj (Brouillon)</Text>
                <Text style={styles.demoBtnDetails}>CIN: 09234567 • 22 juil. 1975</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Pied */}
        <View style={styles.pied}>
          <Text style={styles.piedVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: WiqayatiTokens.colors.canvas,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  btnRetour: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: WiqayatiTokens.radii.md,
    backgroundColor: WiqayatiTokens.colors.surface,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
  },
  btnRetourTexte: {
    color: WiqayatiTokens.colors.primary,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  appNom: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.h1,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: WiqayatiTokens.colors.surface,
    borderRadius: WiqayatiTokens.radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: WiqayatiTokens.colors.border,
    ...WiqayatiTokens.shadows.card,
  },
  cardTitre: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.h2,
    marginBottom: 12,
  },
  cardSousTitre: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.caption,
    lineHeight: 18,
    marginBottom: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    borderRadius: WiqayatiTokens.radii.md,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: WiqayatiTokens.radii.sm,
  },
  modeBtnActif: {
    backgroundColor: WiqayatiTokens.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnTexte: {
    fontSize: 12,
    fontWeight: '600',
    color: WiqayatiTokens.colors.textMuted,
  },
  modeBtnTexteActif: {
    color: WiqayatiTokens.colors.primary,
  },
  alerteErreur: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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
    flex: 1,
  },
  champWrapper: {
    marginBottom: 16,
  },
  champIcone: {
    marginBottom: 4,
  },
  label: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '700',
    marginBottom: 6,
  },
  hintTexte: {
    fontSize: 11,
    color: WiqayatiTokens.colors.risk.eleve.text,
    marginTop: 3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: WiqayatiTokens.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: WiqayatiTokens.colors.surfaceSubtle,
    color: WiqayatiTokens.colors.textPrimary,
  },
  btnConnexion: {
    backgroundColor: WiqayatiTokens.colors.primary,
    paddingVertical: 15,
    borderRadius: WiqayatiTokens.radii.lg,
    alignItems: 'center',
    marginTop: 6,
    ...WiqayatiTokens.shadows.elevated,
  },
  btnDesactive: {
    opacity: 0.7,
  },
  btnConnexionTexte: {
    color: WiqayatiTokens.colors.textInverse,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: WiqayatiTokens.colors.border,
  },
  demoTitre: {
    fontSize: 11,
    fontWeight: '600',
    color: WiqayatiTokens.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoBtns: {
    flexDirection: 'column',
    gap: 8,
  },
  demoBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoBtnNom: {
    fontSize: 12,
    fontWeight: '700',
    color: WiqayatiTokens.colors.textPrimary,
  },
  demoBtnDetails: {
    fontSize: 11,
    color: WiqayatiTokens.colors.textSecondary,
    marginTop: 2,
  },
  pied: {
    alignItems: 'center',
    marginTop: 24,
  },
  piedVersion: {
    color: WiqayatiTokens.colors.textMuted,
    ...WiqayatiTokens.typography.micro,
  },
});
