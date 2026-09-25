import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse,
  User,
  Lock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [voirMdp, setVoirMdp] = useState(false);

  const { connexion } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifiant.trim() || !motDePasse) {
      setErreur("Veuillez renseigner votre identifiant et votre mot de passe.");
      return;
    }
    setErreur(null);
    setChargement(true);
    try {
      const res = await connexion(identifiant, motDePasse);
      if (res.succes && res.redirection) {
        navigate(res.redirection);
      } else {
        setErreur(res.erreur || "Échec de connexion. Vérifiez vos identifiants.");
      }
    } catch {
      setErreur("Erreur réseau. Vérifiez que le serveur backend est en marche.");
    } finally {
      setChargement(false);
    }
  };

  const preRemplir = (id: string, mdp: string = 'Wiqayati2026!') => {
    setIdentifiant(id);
    setMotDePasse(mdp);
    setErreur(null);
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          color: '#0B2535',
          position: 'relative',
          backgroundColor: '#F6FAFC',
          backgroundImage: 'url(/login-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Voile doux dégradé : transparent sur les côtés pour laisser voir les instruments, légèrement adouci au centre */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(246, 250, 252, 0.05) 0%, rgba(246, 250, 252, 0.15) 25%, rgba(246, 250, 252, 0.65) 45%, rgba(246, 250, 252, 0.65) 55%, rgba(246, 250, 252, 0.15) 75%, rgba(246, 250, 252, 0.05) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* En-tête avec bouton retour vers l'accueil */}
        <header
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '1rem 3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(19, 75, 101, 0.08)',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#34576B',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '0.4rem 0.85rem',
              borderRadius: '7px',
              border: '1px solid rgba(19, 75, 101, 0.12)',
              backgroundColor: '#FFFFFF',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0B2535';
              e.currentTarget.style.borderColor = '#134B65';
              e.currentTarget.style.backgroundColor = '#F0F6F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#34576B';
              e.currentTarget.style.borderColor = 'rgba(19, 75, 101, 0.12)';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <ArrowLeft size={16} />
            <span>Retour à l'accueil</span>
          </Link>

          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                backgroundColor: '#134B65',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(19, 75, 101, 0.2)',
              }}
            >
              <HeartPulse size={19} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: '#0B2535',
                  letterSpacing: '-0.02em',
                }}
              >
                WiQayati
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  backgroundColor: '#1F8A70',
                  color: '#FFFFFF',
                  padding: '2px 5px',
                  borderRadius: '3px',
                }}
              >
                SANTÉ
              </span>
            </div>
          </Link>
        </header>

        {/* Corps principal : Carte de login CENTRÉE dans l'espace vide entre gauche et droite */}
        <main
          style={{
            position: 'relative',
            zIndex: 10,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center', // Parfaitement centré
            padding: '2rem 1.5rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: 'rgba(255, 255, 255, 0.97)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '20px',
              border: '1px solid rgba(19, 75, 101, 0.14)',
              boxShadow: '0 16px 42px -10px rgba(11, 37, 53, 0.14), 0 3px 8px rgba(11, 37, 53, 0.04)',
              padding: '2.4rem 2.2rem',
              boxSizing: 'border-box',
            }}
          >
            {/* Entête de la carte */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#EDF5F9',
                  color: '#134B65',
                  borderRadius: '16px',
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '0.85rem',
                }}
              >
                <ShieldCheck size={14} />
                <span>Espace Sécurisé</span>
              </div>
              <h1
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.65rem',
                  fontWeight: 700,
                  color: '#0B2535',
                  letterSpacing: '-0.02em',
                  margin: '0 0 0.35rem 0',
                }}
              >
                Se connecter
              </h1>
              <p style={{ color: '#4A7186', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
                Accédez à votre espace professionnel ou citoyen
              </p>
            </div>

            {/* Message d'erreur */}
            {erreur && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.55rem',
                  padding: '0.75rem 0.9rem',
                  backgroundColor: '#FDF2F2',
                  border: '1px solid #F2C2C2',
                  borderRadius: '8px',
                  color: '#7A2626',
                  fontSize: '0.84rem',
                  marginBottom: '1.25rem',
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>{erreur}</div>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit}>
              {/* Identifiant */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label
                  htmlFor="identifiant"
                  style={{
                    display: 'block',
                    fontSize: '0.83rem',
                    fontWeight: 700,
                    color: '#0B2535',
                    marginBottom: '0.4rem',
                  }}
                >
                  Identifiant / Nom d'utilisateur
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6A96A8',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <User size={16} />
                  </div>
                  <input
                    id="identifiant"
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.68rem 0.85rem 0.68rem 2.45rem',
                      border: '1.5px solid #CADEE6',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      color: '#0B2535',
                      backgroundColor: '#F9FCFD',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#134B65';
                      e.target.style.backgroundColor = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#CADEE6';
                      e.target.style.backgroundColor = '#F9FCFD';
                    }}
                    placeholder="ex: agent_campagne ou INS"
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="motDePasse"
                  style={{
                    display: 'block',
                    fontSize: '0.83rem',
                    fontWeight: 700,
                    color: '#0B2535',
                    marginBottom: '0.4rem',
                  }}
                >
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6A96A8',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Lock size={16} />
                  </div>
                  <input
                    id="motDePasse"
                    type={voirMdp ? 'text' : 'password'}
                    style={{
                      width: '100%',
                      padding: '0.68rem 2.45rem 0.68rem 2.45rem',
                      border: '1.5px solid #CADEE6',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      color: '#0B2535',
                      backgroundColor: '#F9FCFD',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#134B65';
                      e.target.style.backgroundColor = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#CADEE6';
                      e.target.style.backgroundColor = '#F9FCFD';
                    }}
                    placeholder="Votre mot de passe"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMdp(!voirMdp)}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6A96A8',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                    title={voirMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {voirMdp ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Bouton Se connecter */}
              <button
                type="submit"
                disabled={chargement}
                style={{
                  width: '100%',
                  padding: '0.8rem 1.25rem',
                  borderRadius: '9px',
                  backgroundColor: '#134B65',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: chargement ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.15s',
                  opacity: chargement ? 0.7 : 1,
                  boxShadow: '0 3px 10px rgba(19, 75, 101, 0.2)',
                }}
                onMouseEnter={(e) => { if (!chargement) e.currentTarget.style.backgroundColor = '#0E364A'; }}
                onMouseLeave={(e) => { if (!chargement) e.currentTarget.style.backgroundColor = '#134B65'; }}
              >
                {chargement ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <span>Se connecter</span>
                )}
              </button>
            </form>

            {/* Comptes de démonstration sans ministère */}
            <div
              style={{
                marginTop: '1.75rem',
                paddingTop: '1.35rem',
                borderTop: '1px solid #E8F0F3',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#6A96A8',
                  textAlign: 'center',
                  marginBottom: '0.65rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Comptes de test & démonstration
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                {[
                  { label: 'Agent Campagne', id: 'agent_campagne', mdp: 'Wiqayati2026!' },
                  { label: 'Agent Soins', id: 'agent_soins', mdp: 'Wiqayati2026!' },
                  { label: 'Nutritionniste', id: 'nutritionniste1', mdp: 'Wiqayati2026!' },
                  { label: 'Admin IT', id: 'admin_it', mdp: 'Wiqayati2026!' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => preRemplir(c.id, c.mdp)}
                    style={{
                      fontSize: '0.74rem',
                      padding: '4px 9px',
                      backgroundColor: '#EDF5F9',
                      borderRadius: '6px',
                      color: '#134B65',
                      fontWeight: 600,
                      border: '1px solid #CADEE6',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background-color 0.12s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D8EBF3')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EDF5F9')}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => preRemplir('TUN10002002', '1234')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '4px 9px',
                    backgroundColor: '#EAF6F3',
                    borderRadius: '6px',
                    color: '#12543D',
                    fontWeight: 700,
                    border: '1px solid #A8D8C6',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background-color 0.12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B8E2D5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EAF6F3')}
                >
                  Citoyen (PIN 1234)
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Pied de page confidentiel */}
        <footer
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '1rem 3.5rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#4A7186',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderTop: '1px solid rgba(19, 75, 101, 0.08)',
          }}
        >
          WiQayati Santé — Connexion sécurisée et confidentialité des données médicales.
        </footer>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
