import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import wiqayatiLogo from '../assets/logo.png';

export const Navbar: React.FC = () => {
  const { utilisateur, estConnecte, deconnexion } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0.75rem 2rem',
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
        }}
      >
        {/* Logo WiQayati */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src={wiqayatiLogo}
            alt="Wiqayati"
            style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
          />
        </Link>

        {/* Section utilisateur connecté */}
        {estConnecte && utilisateur ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
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

            <button
              onClick={deconnexion}
              className="btn btn-secondary"
              title="Se déconnecter"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
              }}
            >
              <LogOut size={15} />
              <span>Déconnexion</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/connexion')}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.1rem', fontSize: '0.86rem' }}
          >
            <User size={15} />
            <span>Se connecter</span>
          </button>
        )}
      </div>
    </header>
  );
};
