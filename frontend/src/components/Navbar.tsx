import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, LogOut, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { utilisateur, estConnecte, deconnexion } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0.85rem 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%'
      }}>
        {/* Logo Wiqayati */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #0d9488 100%)',
            color: '#fff',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(29, 78, 216, 0.25)'
          }}>
            <HeartPulse size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2c59', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Wiqayati
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 700 }}>
                TN
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Dépistage National Diabète Type 2
            </div>
          </div>
        </Link>

        {/* Section utilisateur connecté */}
        {estConnecte && utilisateur ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                {utilisateur.nom_complet || utilisateur.identifiant}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                <span style={{
                  padding: '2px 8px',
                  background: '#f1f5f9',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  color: '#334155'
                }}>
                  {utilisateur.role_libelle}
                </span>
                {utilisateur.gouvernorat && (
                  <span>• {utilisateur.gouvernorat}</span>
                )}
              </div>
            </div>

            <button
              onClick={deconnexion}
              className="btn btn-secondary"
              title="Se déconnecter"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
            >
              <LogOut size={16} />
              <span>Déconnexion</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/connexion')}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.9rem' }}
          >
            <User size={16} />
            <span>Se connecter</span>
          </button>
        )}
      </div>
    </header>
  );
};
