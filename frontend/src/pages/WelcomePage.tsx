import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Sparkles,
  X,
  Info,
  HelpCircle,
  Mail,
  ShieldCheck,
  ChevronDown,
  ClipboardCheck,
  Salad,
  LogIn,
  ArrowRight,
  HeartPulse,
} from 'lucide-react';
import wiqayatiLogo from '../assets/logo.png';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [modalActive, setModalActive] = useState<'apropos' | 'comment' | 'contact' | null>(null);

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
        {/* ── 1. HEADER NAVIGATION (Intégré dans le background) ── */}
        <header className="welcome-header">
          {/* Logo WiQayati */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <img
              src={wiqayatiLogo}
              alt="Wiqayati"
              className="welcome-logo"
            />
          </div>

          {/* Navigation Links & Bouton Se connecter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <nav className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1.8rem' }}>
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

            {/* Bouton d'accès vers la page de connexion */}
            <button
              type="button"
              onClick={() => navigate('/connexion')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#134B65',
                color: '#FFFFFF',
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(19, 75, 101, 0.22)',
                transition: 'all 0.15s',
                minHeight: '40px',
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

        {/* ── 2. HERO SECTION ÉPURÉE & HARMONIEUSE ── */}
        <section className="welcome-hero">
          {/* Léger fondu doux pour lisibilité */}
          <div className="welcome-hero-overlay" />

          {/* Contenu textuel dans l'espace dégagé à droite */}
          <div className="welcome-hero-content">
            {/* Badge de dépistage sans mention de ministère */}
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

            {/* Description clinique */}
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
                margin: '0.3rem 0',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(19, 75, 101, 0.12)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
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

            {/* Bouton unique vers la démarche (le bouton d'accès au login est déjà clairement dans la navbar) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.6rem' }}>
              <button
                type="button"
                onClick={() => scrollToSection('comment-ca-marche')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#FFFFFF',
                  color: '#134B65',
                  padding: '0.85rem 1.4rem',
                  borderRadius: '10px',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  border: '1.5px solid rgba(19, 75, 101, 0.22)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(11, 37, 53, 0.05)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0F7FA';
                  e.currentTarget.style.borderColor = '#134B65';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = 'rgba(19, 75, 101, 0.22)';
                }}
              >
                <span>Découvrir la démarche</span>
                <ChevronDown size={17} />
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. SECTION : COMMENT ÇA MARCHE ── */}
        <section id="comment-ca-marche" className="welcome-steps-section">
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                  fontWeight: 700,
                  color: '#0B2535',
                  marginTop: '0.4rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Comment fonctionne le dépistage WiQayati ?
              </h2>
              <p style={{ color: '#4A7186', fontSize: '1rem', maxWidth: '640px', margin: '0.75rem auto 0', lineHeight: 1.5 }}>
                Un processus éprouvé en trois étapes simples pour identifier les risques silencieux
                et agir avant l’apparition du diabète.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                {
                  etape: '01',
                  titre: 'Questionnaire Clinique',
                  desc: 'Évaluation rapide des antécédents, de l’IMC, du tour de taille et des habitudes de vie (activité physique, consommation de légumes).',
                  icon: <ClipboardCheck size={24} color="#134B65" />,
                  fond: '#EDF5F9',
                },
                {
                  etape: '02',
                  titre: 'Calcul du Risque (FINDRISC)',
                  desc: 'Le modèle clinique calcule instantanément le niveau de risque à 10 ans et classe le patient : risque faible, modéré ou élevé.',
                  icon: <Activity size={24} color="#1F8A70" />,
                  fond: '#EAF6F3',
                },
                {
                  etape: '03',
                  titre: 'Plan Nutritionnel & Suivi',
                  desc: 'Le nutritionniste consulte le dossier et valide un plan d’action hygiéno-diététique personnalisé transmis directement sur le mobile.',
                  icon: <Salad size={24} color="#134B65" />,
                  fond: '#EDF5F9',
                },
              ].map((c) => (
                <div
                  key={c.etape}
                  style={{
                    backgroundColor: '#F8FCFD',
                    border: '1px solid #DCEAF0',
                    borderRadius: '16px',
                    padding: '2rem 1.65rem',
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
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#0B2535',
                      marginBottom: '0.65rem',
                    }}
                  >
                    {c.titre}
                  </h3>
                  <p style={{ color: '#4A7186', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Bannière d'accès vers la connexion en bas de page */}
            <div className="welcome-cta-banner">
              <div>
                <h3
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: '#0B2535',
                    margin: '0 0 0.35rem 0',
                  }}
                >
                  Vous disposez d'un compte WiQayati ?
                </h3>
                <p style={{ margin: 0, color: '#4A7186', fontSize: '0.92rem' }}>
                  Accédez à votre espace sécurisé pour consulter les dépistages ou renseigner un suivi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/connexion')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  backgroundColor: '#134B65',
                  color: '#FFFFFF',
                  padding: '0.8rem 1.6rem',
                  borderRadius: '10px',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(19, 75, 101, 0.2)',
                  transition: 'background-color 0.15s',
                  minHeight: '44px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0E364A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#134B65')}
              >
                <span>Accéder à l'espace de connexion</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>

        {/* ── 4. FOOTER PROFESSIONNEL ── */}
        <footer className="welcome-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>WiQayati</span>
            <span>—</span>
            <span>Plateforme de dépistage précoce du diabète de type 2</span>
          </div>
          <div style={{ display: 'flex', gap: '1.75rem', fontSize: '0.82rem' }}>
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
                    WiQayati est une solution de santé préventive dédiée à l'anticipation
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
    </>
  );
};
