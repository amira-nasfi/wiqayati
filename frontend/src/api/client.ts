/**
 * Client API HTTP avec Axios pour Wiqayati.
 * Gère l'injection du token JWT et le renouvellement automatique.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wiqayati_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 et non réessayé : tenter rafraîchissement
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('auth/connexion')) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('wiqayati_refresh_token');

      if (refresh) {
        try {
          const resp = await axios.post('/api/v1/auth/rafraichir/', { refresh });
          const newAccess = resp.data.access;
          localStorage.setItem('wiqayati_access_token', newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          // Échec du rafraîchissement -> déconnexion
          localStorage.removeItem('wiqayati_access_token');
          localStorage.removeItem('wiqayati_refresh_token');
          localStorage.removeItem('wiqayati_user');
          window.location.href = '/connexion';
        }
      } else {
        localStorage.removeItem('wiqayati_access_token');
        localStorage.removeItem('wiqayati_refresh_token');
        localStorage.removeItem('wiqayati_user');
        window.location.href = '/connexion';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
