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
import { WiqayatiTokens } from '../constants/theme';

interface ConnexionScreenProps {
  onRetour?: () => void;
}

export default function ConnexionScreen({ onRetour }: ConnexionScreenProps = {}) {
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
        {onRetour && (
          <TouchableOpacity
            style={styles.btnRetour}
            onPress={onRetour}
            activeOpacity={0.7}
          >
            <Text style={styles.btnRetourTexte}>← Accueil</Text>
          </TouchableOpacity>
        )}

        {/* En-tête épuré */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.appNom}>Wiqayati</Text>
        </View>

        {/* Carte de connexion */}
        <Animated.View
          style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
        >
          <Text style={styles.cardTitre}>Espace Citoyen</Text>
          <Text style={styles.cardSousTitre}>
            Connectez-vous avec votre Identifiant National de Santé (INS)
          </Text>

          {erreur && (
            <View style={styles.alerteErreur}>
              <Text style={styles.alerteErreurTexte}>⚠️ {erreur}</Text>
            </View>
          )}

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

          <Text style={styles.label}>Code PIN sécurisé (4 chiffres)</Text>
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
        </Animated.View>

        {/* Pied discret */}
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
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: WiqayatiTokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: WiqayatiTokens.colors.surfaceHighlight,
    ...WiqayatiTokens.shadows.elevated,
  },
  logoText: {
    color: WiqayatiTokens.colors.textInverse,
    fontSize: 34,
    fontWeight: '900',
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
    marginBottom: 4,
  },
  cardSousTitre: {
    color: WiqayatiTokens.colors.textSecondary,
    ...WiqayatiTokens.typography.caption,
    lineHeight: 18,
    marginBottom: 20,
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
  label: {
    color: WiqayatiTokens.colors.textPrimary,
    ...WiqayatiTokens.typography.caption,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: WiqayatiTokens.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
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
  pied: {
    alignItems: 'center',
    marginTop: 24,
  },
  piedVersion: {
    color: WiqayatiTokens.colors.textMuted,
    ...WiqayatiTokens.typography.micro,
  },
  piedServeur: {
    color: WiqayatiTokens.colors.textMuted,
    ...WiqayatiTokens.typography.micro,
    marginTop: 2,
    opacity: 0.8,
  },
});

