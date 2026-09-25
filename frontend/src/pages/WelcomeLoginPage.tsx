import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Sparkles,
  HeartPulse,
  User,
  Lock,
  AlertCircle,
  Loader2,
  X,
  Info,
  HelpCircle,
  Mail,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ClipboardCheck,
  Salad,
  LogIn,
} from 'lucide-react';

export const WelcomeLoginPage: React.FC = () => {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [modalActive, setModalActive] = useState<'apropos' | 'comment' | 'contact' | 'login' | null>(null);

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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* ── Polices Google Fonts ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
          backgroundColor: '#F6FAFC',
          color: '#0B2535',
          scrollBehavior: 'smooth',
        }}
      >
        {/* ── 1. HEADER NAVIGATION ── */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(19, 75, 101, 0.08)',
            padding: '1rem 3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          {/* Logo WiQayati */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#134B65',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 3px 10px rgba(19, 75, 101, 0.2)',
              }}
            >
              <HeartPulse size={22} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#0B2535',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                WiQayati
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    backgroundColor: '#1F8A70',
                    color: '#FFFFFF',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  SANTÉ
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4A7186', fontWeight: 500, marginTop: '2px' }}>
                Prévention du Diabète de Type 2
              </div>
            </div>
          </div>

          {/* Navigation Links & Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '1.8rem' }}>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#0B2535',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: '2px solid #1F8A70',
                  paddingBottom: '2px',
                }}
              >
                Accueil
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('comment-ca-marche')}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#4A7186',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0B2535')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#4A7186')}
              >
                Comment ça marche
              </button>
              <button
                type="button"
                onClick={() => setModalActive('apropos')}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#4A7186',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0B2535')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#4A7186')}
              >
                À propos
              </button>
              <button
                type="button"
                onClick={() => setModalActive('contact')}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#4A7186',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0B2535')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#4A7186')}
              >
                Contact
              </button>
            </nav>

            {/* Bouton Se Connecter Principal */}
            <button
              type="button"
              onClick={() => scrollToSection('espace-connexion')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#134B65',
                color: '#FFFFFF',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(19, 75, 101, 0.2)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0E364A';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#134B65';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <LogIn size={15} />
              <span>Se connecter</span>
            </button>
          </div>
        </header>

        {/* ── 2. HERO SECTION AVEC L'IMAGE DE FOND PROPRE ── */}
        <section
          style={{
            position: 'relative',
            minHeight: 'calc(100vh - 75px)',
            width: '100%',
            backgroundImage: 'url(/welcome-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center left',
            backgroundRepeat: 'no-repeat',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end', // Placement sur la zone claire à droite
            padding: '3rem 5rem',
            boxSizing: 'border-box',
          }}
        >
          {/* Léger dégradé subtil pour rehausser la lisibilité sans altérer la photo */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(246, 250, 252, 0) 0%, rgba(246, 250, 252, 0.1) 40%, rgba(246, 250, 252, 0.85) 65%, rgba(246, 250, 252, 0.95) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Contenu textuel & actions dans l'espace clair à droite */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              maxWidth: '560px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Badge de dépistage */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'rgba(31, 138, 112, 0.1)',
                border: '1px solid rgba(31, 138, 112, 0.25)',
                color: '#135E4B',
                borderRadius: '20px',
                padding: '0.35rem 0.9rem',
                width: 'fit-content',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.01em',
              }}
            >
              <ShieldCheck size={15} color="#1F8A70" strokeWidth={2.5} />
              <span>Dépistage Précoce & Prévention Clinique</span>
            </div>

            {/* Titre Principal */}
            <h1
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(2rem, 3.2vw, 3rem)',
                fontWeight: 800,
                color: '#0B2535',
                lineHeight: 1.18,
                letterSpacing: '-0.025em',
                margin: 0,
              }}
            >
              « Anticiper le diabète de type 2,{' '}
              <span style={{ color: '#134B65' }}>pour une vie plus saine »</span>
            </h1>

            {/* Description clinique claire */}
            <p
              style={{
                fontSize: '1.05rem',
                color: '#34576B',
                lineHeight: 1.65,
                margin: 0,
                fontWeight: 400,
              }}
            >
              WiQayati vous aide à évaluer précocement votre risque de diabète de type 2
              grâce à un questionnaire simple et des recommandations personnalisées de
              prévention adaptées à votre mode de vie.
            </p>

            {/* 3 piliers rassurants */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.65rem',
                margin: '0.5rem 0',
              }}
            >
              {[
                { label: 'Score clinique FINDRISC', icon: <Activity size={15} color="#134B65" /> },
                { label: 'Conseils personnalisés', icon: <Sparkles size={15} color="#1F8A70" /> },
                { label: 'Suivi nutritionnel', icon: <HeartPulse size={15} color="#134B65" /> },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(19, 75, 101, 0.12)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.8rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#0B2535',
                    boxShadow: '0 2px 4px rgba(11, 37, 53, 0.04)',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Actions CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => scrollToSection('espace-connexion')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: '#134B65',
                  color: '#FFFFFF',
                  padding: '0.85rem 1.6rem',
                  borderRadius: '10px',
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(19, 75, 101, 0.25)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0E364A';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#134B65';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>Accéder à mon espace</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('comment-ca-marche')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  color: '#134B65',
                  padding: '0.85rem 1.3rem',
                  borderRadius: '10px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  border: '1px solid rgba(19, 75, 101, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#134B65';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
                  e.currentTarget.style.borderColor = 'rgba(19, 75, 101, 0.2)';
                }}
              >
                <span>En savoir plus</span>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. SECTION : COMMENT ÇA MARCHE ── */}
        <section
          id="comment-ca-marche"
          style={{
            padding: '5rem 4rem',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E5EEF2',
            borderBottom: '1px solid #E5EEF2',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#1F8A70',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Démarche Clinique Préventive
              </span>
              <h2
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '2.1rem',
                  fontWeight: 700,
                  color: '#0B2535',
                  marginTop: '0.4rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Comment fonctionne le dépistage WiQayati ?
              </h2>
              <p style={{ color: '#4A7186', fontSize: '1rem', maxWidth: '620px', margin: '0.75rem auto 0' }}>
                Un processus éprouvé en trois étapes pour identifier les risques silencieux
                et agir avant l’apparition de la maladie.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
              }}
            >
              {[
                {
                  etape: '01',
                  titre: 'Questionnaire Clinique',
                  desc: 'Évaluation rapide des antécédents, de l’IMC, du périmètre ombilical et des habitudes de vie (activité physique, consommation de fruits et légumes).',
                  icon: <ClipboardCheck size={24} color="#134B65" />,
                  couleur: '#134B65',
                  fond: '#EDF5F9',
                },
                {
                  etape: '02',
                  titre: 'Calcul du Risque (FINDRISC)',
                  desc: 'Le modèle clinique calcule instantanément le score de risque à 10 ans et classe le patient : risque faible, intermédiaire ou élevé.',
                  icon: <Activity size={24} color="#1F8A70" />,
                  couleur: '#1F8A70',
                  fond: '#EAF6F3',
                },
                {
                  etape: '03',
                  titre: 'Plan Nutritionnel & Suivi',
                  desc: 'Le nutritionniste consulte le dossier et valide un plan hygiéno-diététique personnalisé transmis directement sur le mobile du patient.',
                  icon: <Salad size={24} color="#134B65" />,
                  couleur: '#134B65',
                  fond: '#EDF5F9',
                },
              ].map((c) => (
                <div
                  key={c.etape}
                  style={{
                    backgroundColor: '#F8FCFD',
                    border: '1px solid #DCEAF0',
                    borderRadius: '16px',
                    padding: '2rem 1.75rem',
                    position: 'relative',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(11, 37, 53, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: c.fond,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem',
                    }}
                  >
                    {c.icon}
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      top: '1.75rem',
                      right: '1.75rem',
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#CADEE6',
                    }}
                  >
                    {c.etape}
                  </span>
                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: '#0B2535',
                      marginBottom: '0.65rem',
                    }}
                  >
                    {c.titre}
                  </h3>
                  <p style={{ color: '#4A7186', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. SECTION : ESPACE DE CONNEXION SÉCURISÉ ── */}
        <section
          id="espace-connexion"
          style={{
            padding: '5rem 2rem',
            backgroundColor: '#F3F8FA',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2.5rem', maxWidth: '520px' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#134B65',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Accès Plateforme
            </span>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '2rem',
                fontWeight: 700,
                color: '#0B2535',
                marginTop: '0.35rem',
                letterSpacing: '-0.02em',
              }}
            >
              Espace de Connexion
            </h2>
            <p style={{ color: '#4A7186', fontSize: '0.92rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
              Connectez-vous à votre portail professionnel ou citoyen avec vos identifiants sécurisés.
            </p>
          </div>

          {/* Formulaire de connexion propre et spacieux */}
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #D6E6ED',
              boxShadow: '0 10px 30px rgba(11, 37, 53, 0.07)',
              padding: '2.25rem 2rem',
              boxSizing: 'border-box',
            }}
          >
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

            <form onSubmit={handleSubmit}>
              {/* Identifiant */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label
                  htmlFor="identifiant-form"
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
                    id="identifiant-form"
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
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="mdp-form"
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
                    id="mdp-form"
                    type="password"
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
                    placeholder="Votre mot de passe"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                  />
                </div>
              </div>

              {/* Bouton de soumission */}
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

            {/* Démo rapide sans Ministère */}
            <div
              style={{
                marginTop: '1.75rem',
                paddingTop: '1.4rem',
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
        </section>

        {/* ── 5. FOOTER PROFESSIONNEL SANS MENTION MINISTÈRE ── */}
        <footer
          style={{
            padding: '2rem 4rem',
            backgroundColor: '#0B2535',
            color: '#B0C8D4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.84rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>WiQayati</span>
            <span>—</span>
            <span>Plateforme de dépistage précoce du diabète de type 2</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
            <button
              type="button"
              onClick={() => setModalActive('apropos')}
              style={{ color: '#B0C8D4', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              À propos
            </button>
            <button
              type="button"
              onClick={() => setModalActive('comment')}
              style={{ color: '#B0C8D4', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Protocole FINDRISC
            </button>
            <button
              type="button"
              onClick={() => setModalActive('contact')}
              style={{ color: '#B0C8D4', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Support & Contact
            </button>
          </div>
        </footer>

        {/* ── MODALES D'INFORMATION ── */}
        {modalActive && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(11, 37, 53, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              padding: '1.5rem',
            }}
            onClick={() => setModalActive(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                maxWidth: '520px',
                width: '100%',
                padding: '2rem',
                boxShadow: '0 20px 40px rgba(11, 37, 53, 0.18)',
                border: '1px solid #CADEE6',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {modalActive === 'apropos' && <Info size={20} color="#134B65" />}
                  {modalActive === 'comment' && <HelpCircle size={20} color="#1F8A70" />}
                  {modalActive === 'contact' && <Mail size={20} color="#134B65" />}
                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#0B2535',
                      margin: 0,
                    }}
                  >
                    {modalActive === 'apropos' && 'À propos de WiQayati'}
                    {modalActive === 'comment' && 'Comment fonctionne le dépistage ?'}
                    {modalActive === 'contact' && 'Support et Contact'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalActive(null)}
                  style={{ color: '#6A96A8', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ fontSize: '0.92rem', color: '#2E5163', lineHeight: 1.65 }}>
                {modalActive === 'apropos' && (
                  <p>
                    WiQayati est une solution innovante de santé préventive dédiée à l'anticipation
                    et au dépistage précoce du diabète de type 2. La plateforme relie les intervenants
                    de santé de proximité, les nutritionnistes et les citoyens autour d'un suivi
                    personnalisé axé sur le bien-être durable.
                  </p>
                )}
                {modalActive === 'comment' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <p><strong style={{ color: '#0B2535' }}>1. Dépistage :</strong> Questionnaire FINDRISC (âge, IMC, tour de taille, activité physique, antécédents familiaux).</p>
                    <p><strong style={{ color: '#0B2535' }}>2. Score et Risque :</strong> Évaluation objective du niveau de risque (faible, modéré, élevé).</p>
                    <p><strong style={{ color: '#0B2535' }}>3. Plan d'accompagnement :</strong> Élaboration d'objectifs personnalisés d'alimentation et de marche par le nutritionniste.</p>
                  </div>
                )}
                {modalActive === 'contact' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <p style={{ fontWeight: 600, color: '#0B2535' }}>Équipe WiQayati Santé</p>
                    <p>Pour toute question technique ou accompagnement :</p>
                    <p>Courriel : <a href="mailto:contact@wiqayati.tn" style={{ color: '#134B65', fontWeight: 600 }}>contact@wiqayati.tn</a></p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1.75rem', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setModalActive(null)}
                  style={{
                    padding: '0.55rem 1.25rem',
                    backgroundColor: '#134B65',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    border: 'none',
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
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
