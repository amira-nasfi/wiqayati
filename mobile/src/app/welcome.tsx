/**
 * Écran /welcome — Wiqayati Mobile
 */
import React from 'react';
import { useRouter } from 'expo-router';
import WelcomeScreen from '../components/WelcomeScreen';

export default function WelcomeRoute() {
  const router = useRouter();

  return (
    <WelcomeScreen
      onConnexion={() => {
        router.push('/connexion');
      }}
    />
  );
}
