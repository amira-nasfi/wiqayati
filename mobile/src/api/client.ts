/**
 * Client HTTP pour l'application mobile citoyenne Wiqayati.
 * Gère le token JWT avec persistance sécurisée (expo-secure-store).
 */
import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// URL de base :
//   - 'web'     → localhost (navigateur sur la même machine)
//   - 'android' → 10.0.2.2 (émulateur) ou IP Wi-Fi (appareil physique)
//   - 'ios'     → IP Wi-Fi de la machine hôte (Expo Go physique)
//
// ⚠️ Si vous utilisez Expo Go sur un appareil physique, vérifiez que votre
//    téléphone et votre PC sont sur le même réseau Wi-Fi.
const HOST_LAN_IP = '192.168.1.6'; // IP Wi-Fi de la machine hôte

export const BASE_API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api/v1'           // navigateur — même machine
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:8000/api/v1'          // émulateur Android
      : `http://${HOST_LAN_IP}:8000/api/v1`;  // Expo Go iOS ou Android physique

export const CLE_TOKEN_ACCES   = 'wiqayati_access';
export const CLE_TOKEN_REFRESH = 'wiqayati_refresh';

const apiMobile = axios.create({
  baseURL: BASE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Helpers Stockage (Web fallback via localStorage, SecureStore sur mobile) ───
export const sauvegarderTokens = async (access: string, refresh: string) => {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLE_TOKEN_ACCES, access);
      localStorage.setItem(CLE_TOKEN_REFRESH, refresh);
    }
    return;
  }
  await SecureStore.setItemAsync(CLE_TOKEN_ACCES,   access);
  await SecureStore.setItemAsync(CLE_TOKEN_REFRESH, refresh);
};

export const lireTokenAcces = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(CLE_TOKEN_ACCES) : null;
  }
  return SecureStore.getItemAsync(CLE_TOKEN_ACCES);
};

export const lireTokenRefresh = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(CLE_TOKEN_REFRESH) : null;
  }
  return SecureStore.getItemAsync(CLE_TOKEN_REFRESH);
};

export const supprimerTokens = async () => {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CLE_TOKEN_ACCES);
      localStorage.removeItem(CLE_TOKEN_REFRESH);
    }
    return;
  }
  await SecureStore.deleteItemAsync(CLE_TOKEN_ACCES);
  await SecureStore.deleteItemAsync(CLE_TOKEN_REFRESH);
};

// ─── Intercepteur requête : injecter le Bearer token ─────────────────────────
apiMobile.interceptors.request.use(async (config) => {
  const token = await lireTokenAcces();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Intercepteur réponse : refresh automatique sur 401 ──────────────────────
apiMobile.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await lireTokenRefresh();
        if (!refresh) throw new Error('Pas de refresh token');
        const resp = await axios.post(`${BASE_API_URL}/token/refresh/`, { refresh });
        if (Platform.OS === 'web') {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CLE_TOKEN_ACCES, resp.data.access);
          }
        } else {
          await SecureStore.setItemAsync(CLE_TOKEN_ACCES, resp.data.access);
        }
        original.headers.Authorization = `Bearer ${resp.data.access}`;
        return apiMobile(original);
      } catch {
        await supprimerTokens();
      }
    }
    return Promise.reject(error);
  }
);

export default apiMobile;
