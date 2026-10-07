import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Home, FileText, LayoutDashboard } from 'lucide-react';
import wiqayatiLogo from '../assets/logo.png';

export const Navbar: React.FC = () => {
  const { utilisateur, estConnecte, deconnexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Déterminer la route principale selon le rôle
  const getRouteParRole = () => {
    if (!utilisateur) return '/';
    switch (utilisateur.role) {
      case 'CITOYEN':
        return '/citoyen';
      case 'AGENT_CAMPAGNE':
      case 'AGENT_SOINS_PRIMAIRES':
        return '/agent';
      case 'NUTRITIONNISTE':
        return '/nutritionniste';
      case 'ADMIN_MINISTERE':
        return '/admin/ministere';
      case 'ADMIN_IT':
        return '/admin/it';
      default:
        return '/';
    }
  };

  const routeRole = getRouteParRole();

  return (
    <>
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(11, 37, 53, 0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0.65rem 1rem',
            boxSizing: 'border-box',
          }}
        >
          {/* Logo WiQayati */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src={wiqayatiLogo}
              alt="Wiqayati"
              style={{
                height: '42px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </Link>

          {/* Section utilisateur connecté */}
          {estConnecte && utilisateur ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Infos utilisateur - Vue Desktop */}
              <div className="hide-on-mobile" style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0B2535' }}>
                  {utilisateur.nom_complet || utilisateur.identifiant}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.35rem',
                    fontSize: '0.74rem',
                    color: '#64748B',
                    marginTop: '1px',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 7px',
                      backgroundColor: '#EDF5F9',
                      borderRadius: '4px',
                      fontWeight: 700,
                      color: '#134B65',
                      fontSize: '0.72rem',
                    }}
                  >
                    {utilisateur.role_libelle}
                  </span>
                  {utilisateur.gouvernorat && (
                    <span style={{ fontWeight: 500 }}>• {utilisateur.gouvernorat}</span>
                  )}
                </div>
              </div>

              {/* Badge compact - Vue Mobile */}
              <div className="show-on-mobile" style={{ alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    backgroundColor: '#EDF5F9',
                    borderRadius: '6px',
                    fontWeight: 700,
                    color: '#134B65',
                    fontSize: '0.72rem',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {utilisateur.role_libelle}
                </span>
              </div>

              {/* Bouton de déconnexion */}
              <button
                onClick={deconnexion}
                className="btn btn-secondary"
                title="Se déconnecter"
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  minHeight: '36px',
                }}
              >
                <LogOut size={15} />
                <span className="hide-on-mobile">Déconnexion</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/connexion')}
              className="btn btn-primary"
              style={{
                padding: '0.45rem 0.95rem',
                fontSize: '0.84rem',
                minHeight: '36px',
              }}
            >
              <User size={15} />
              <span>Connexion</span>
            </button>
          )}
        </div>
      </header>

      {/* Barre d'onglets inférieure pour mobile (Bottom Navigation App-Style) */}
      {estConnecte && utilisateur && (
        <nav className="mobile-bottom-bar" aria-label="Navigation mobile">
          <Link
            to={routeRole}
            className={`mobile-bottom-bar-item ${location.pathname === routeRole ? 'active' : ''}`}
          >
            {utilisateur.role === 'CITOYEN' ? (
              <FileText size={20} />
            ) : (
              <LayoutDashboard size={20} />
            )}
            <span>Mon Espace</span>
          </Link>

          <Link
            to="/"
            className={`mobile-bottom-bar-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Home size={20} />
            <span>Accueil</span>
          </Link>

          <button
            type="button"
            onClick={deconnexion}
            className="mobile-bottom-bar-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={20} color="#DC2626" />
            <span style={{ color: '#DC2626' }}>Quitter</span>
          </button>
        </nav>
      )}
    </>
  );
};
