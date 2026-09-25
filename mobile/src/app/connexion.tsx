/**
 * Écran de connexion citoyen — Wiqayati Mobile
 * Authentification par INS + code PIN.
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
} from 'react-native';
import { useAuth } from '../api/authContext';
import { BASE_API_URL } from '../api/client';

export default function ConnexionScreen() {
  const { seConnecter } = useAuth();
  const [ins, setIns]   = useState('');
  const [pin, setPin]   = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur]         = useState<string | null>(null);

  // Animation de shake sur erreur
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
    if (!ins.trim() || !pin.trim()) {
      setErreur("Veuillez saisir votre INS et votre code PIN.");
      shake();
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      await seConnecter(ins, pin);
    } catch (err: any) {
      setErreur(err.message);
      shake();
    } finally {
      setChargement(false);
    }
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
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.appNom}>Wiqayati</Text>
          <Text style={styles.appSlogan}>وقايتي · وقايتك من السكري</Text>
          <Text style={styles.appDesc}>
            Plateforme tunisienne de dépistage précoce du diabète de type 2
          </Text>
        </View>

        {/* Carte de connexion */}
        <Animated.View
          style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
        >
          <Text style={styles.cardTitre}>Connexion à votre espace</Text>
          <Text style={styles.cardSousTitre}>
            Utilisez votre Identifiant National de Santé (INS) et votre code PIN
          </Text>

          {erreur && (
            <View style={styles.alerteErreur}>
              <Text style={styles.alerteErreurTexte}>⚠ {erreur}</Text>
            </View>
          )}

          <Text style={styles.label}>Identifiant National de Santé (INS)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : TUN10001234"
            placeholderTextColor="#94a3b8"
            value={ins}
            onChangeText={(t) => setIns(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            editable={!chargement}
          />

          <Text style={styles.label}>Code PIN à 4 chiffres</Text>
          <TextInput
            style={styles.input}
            placeholder="• • • •"
            placeholderTextColor="#94a3b8"
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={handleConnexion}
            editable={!chargement}
          />

          <TouchableOpacity
            style={[styles.btnConnexion, chargement && styles.btnDesactive]}
            onPress={handleConnexion}
            disabled={chargement}
            activeOpacity={0.85}
          >
            {chargement ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnConnexionTexte}>Accéder à mon dossier →</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Pied */}
        <View style={styles.pied}>
          <Text style={styles.piedTexte}>
            Ministère de la Santé · République Tunisienne
          </Text>
          <Text style={styles.piedVersion}>Version 1.0.0</Text>
          <Text style={[styles.piedVersion, { fontSize: 10, marginTop: 4, color: '#64748b' }]}>
            Serveur : {BASE_API_URL}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BLEU_PRINCIPAL = '#2563eb';
const BLEU_SOMBRE    = '#0f2c59';
const GRIS_FOND      = '#f0f6ff';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: GRIS_FOND,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BLEU_PRINCIPAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: BLEU_PRINCIPAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
  },
  appNom: {
    fontSize: 30,
    fontWeight: '900',
    color: BLEU_SOMBRE,
    letterSpacing: 1,
  },
  appSlogan: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  appDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTitre: {
    fontSize: 20,
    fontWeight: '800',
    color: BLEU_SOMBRE,
    marginBottom: 4,
  },
  cardSousTitre: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 20,
  },
  alerteErreur: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  alerteErreurTexte: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  btnConnexion: {
    backgroundColor: BLEU_PRINCIPAL,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: BLEU_PRINCIPAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDesactive: {
    opacity: 0.7,
  },
  btnConnexionTexte: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  pied: {
    alignItems: 'center',
    marginTop: 32,
  },
  piedTexte: {
    fontSize: 12,
    color: '#94a3b8',
  },
  piedVersion: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 4,
  },
});
