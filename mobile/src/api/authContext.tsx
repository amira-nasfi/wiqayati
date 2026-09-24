/**
 * Contexte global d'authentification pour l'app mobile Wiqayati.
 * Gère l'état de connexion du citoyen et expose les actions
 * (connexion, déconnexion) à tous les écrans.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import apiMobile, {
  sauvegarderTokens,
  supprimerTokens,
  lireTokenAcces,
} from './client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProfilCitoyen {
  ins: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  gouvernorat: string;
  email?: string;
  telephone?: string;
}

interface ContexteAuth {
  estConnecte: boolean;
  chargementInitial: boolean;
  profil: ProfilCitoyen | null;
  erreurConnexion: string | null;
  seConnecter: (ins: string, pin: string) => Promise<void>;
  seDeconnecter: () => Promise<void>;
  rafraichirProfil: () => Promise<void>;
}

// ─── Création du contexte ─────────────────────────────────────────────────────
const AuthContext = createContext<ContexteAuth>({
  estConnecte: false,
  chargementInitial: true,
  profil: null,
  erreurConnexion: null,
  seConnecter: async () => {},
  seDeconnecter: async () => {},
  rafraichirProfil: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [estConnecte, setEstConnecte]           = useState(false);
  const [chargementInitial, setChargementInitial] = useState(true);
  const [profil, setProfil]                     = useState<ProfilCitoyen | null>(null);
  const [erreurConnexion, setErreurConnexion]   = useState<string | null>(null);

  // Vérification initiale du token au lancement de l'app
  useEffect(() => {
    (async () => {
      try {
        const token = await lireTokenAcces();
        if (token) {
          await chargerProfil();
          setEstConnecte(true);
        }
      } catch {
        await supprimerTokens();
      } finally {
        setChargementInitial(false);
      }
    })();
  }, []);

  const chargerProfil = async () => {
    const resp = await apiMobile.get('/citoyen/moi/');
    setProfil(resp.data);
  };

  const seConnecter = async (ins: string, pin: string) => {
    setErreurConnexion(null);
    try {
      const resp = await apiMobile.post('/citoyen/auth/connexion/', {
        ins: ins.trim().toUpperCase(),
        pin: pin.trim(),
      });
      await sauvegarderTokens(resp.data.access, resp.data.refresh);
      await chargerProfil();
      setEstConnecte(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.erreur ||
        err.response?.data?.detail ||
        "Échec de connexion. Vérifiez votre INS et votre code PIN.";
      setErreurConnexion(msg);
      throw new Error(msg);
    }
  };

  const seDeconnecter = async () => {
    try {
      await apiMobile.post('/citoyen/auth/deconnexion/');
    } catch {
      // Ignorer les erreurs réseau lors de la déconnexion
    } finally {
      await supprimerTokens();
      setProfil(null);
      setEstConnecte(false);
    }
  };

  const rafraichirProfil = async () => {
    try {
      await chargerProfil();
    } catch {
      // Ignorer
    }
  };

  return (
    <AuthContext.Provider
      value={{
        estConnecte,
        chargementInitial,
        profil,
        erreurConnexion,
        seConnecter,
        seDeconnecter,
        rafraichirProfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => useContext(AuthContext);
