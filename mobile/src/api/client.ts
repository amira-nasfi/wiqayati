/**
 * Client HTTP pour l'application mobile citoyenne Wiqayati.
 * Gère le token JWT avec persistance sécurisée (expo-secure-store).
 */
import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// URL de base : localhost pour web/iOS, 10.0.2.2 pour émulateur Android
export const BASE_API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api/v1'
  : 'http://localhost:8000/api/v1';

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
