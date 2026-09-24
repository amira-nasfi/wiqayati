import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

export interface Utilisateur {
  id: string;
  identifiant: string;
  nom_complet: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  role_libelle: string;
  gouvernorat?: string;
  expire_le?: string | null;
  mot_de_passe_temporaire: boolean;
}

interface AuthContextType {
  utilisateur: Utilisateur | null;
  estConnecte: boolean;
  estEnChargement: boolean;
  connexion: (identifiant: string, motDePasse: string) => Promise<{ succes: boolean; erreur?: string; redirection?: string }>;
  deconnexion: () => Promise<void>;
  redirigerSelonRole: (role: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const obtenirCheminRedirectionRole = (role: string): string => {
  switch (role) {
    case 'AGENT_CAMPAGNE':
    case 'AGENT_SOINS_PRIMAIRES':
      return '/agent';
    case 'NUTRITIONNISTE':
      return '/nutritionniste';
    case 'ADMIN_MINISTERE':
      return '/admin/ministere';
    case 'ADMIN_IT':
      return '/admin/it';
    case 'CITOYEN':
      return '/citoyen';
    default:
      return '/';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [estEnChargement, setEstEnChargement] = useState(true);

  useEffect(() => {
    const userJson = localStorage.getItem('wiqayati_user');
    const token = localStorage.getItem('wiqayati_access_token');
    if (userJson && token) {
      try {
        setUtilisateur(JSON.parse(userJson));
      } catch {
        localStorage.clear();
      }
    }
    setEstEnChargement(false);
  }, []);

  const connexion = async (identifiant: string, motDePasse: string) => {
    try {
      const resp = await api.post('/auth/connexion/', {
        username: identifiant.trim(),
        password: motDePasse,
      });

      const { access, refresh, utilisateur: user } = resp.data;
      localStorage.setItem('wiqayati_access_token', access);
      localStorage.setItem('wiqayati_refresh_token', refresh);
      localStorage.setItem('wiqayati_user', JSON.stringify(user));
      setUtilisateur(user);

      const redirection = obtenirCheminRedirectionRole(user.role);
      return { succes: true, redirection };
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || "Identifiants invalides ou compte inactif.";
      return { succes: false, erreur: msg };
    }
  };

  const deconnexion = async () => {
    try {
      const refresh = localStorage.getItem('wiqayati_refresh_token');
      if (refresh) {
        await api.post('/auth/deconnexion/', { refresh });
      }
    } catch {
      // Ignorer l'erreur réseau éventuelle lors du logout
    } finally {
      localStorage.removeItem('wiqayati_access_token');
      localStorage.removeItem('wiqayati_refresh_token');
      localStorage.removeItem('wiqayati_user');
      setUtilisateur(null);
      window.location.href = '/connexion';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        utilisateur,
        estConnecte: !!utilisateur,
        estEnChargement,
        connexion,
        deconnexion,
        redirigerSelonRole: obtenirCheminRedirectionRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé au sein d'un AuthProvider");
  }
  return context;
};
