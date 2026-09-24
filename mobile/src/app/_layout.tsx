/**
 * Layout racine de l'application Wiqayati Citoyen.
 * Enveloppe toute l'app dans AuthProvider et gère la navigation
 * conditionnelle (connexion / app principale).
 */
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../api/authContext';
import AppTabs from '../components/app-tabs';
import ConnexionScreen from './connexion';

SplashScreen.preventAutoHideAsync();

function NavigateurPrincipal() {
  const { estConnecte, chargementInitial } = useAuth();

  // Masquer le splash une fois l'état d'auth déterminé
  React.useEffect(() => {
    if (!chargementInitial) {
      SplashScreen.hideAsync();
    }
  }, [chargementInitial]);

  if (chargementInitial) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!estConnecte) {
    return <ConnexionScreen />;
  }

  return <AppTabs />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigateurPrincipal />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
});
