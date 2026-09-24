import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Activity, Users, ArrowRight } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { estConnecte, utilisateur, redirigerSelonRole } = useAuth();

  const handleAction = () => {
    if (estConnecte && utilisateur) {
      navigate(redirigerSelonRole(utilisateur.role));
    } else {
      navigate('/connexion');
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Bannière d'accueil héro */}
      <div style={{
        textAlign: 'center',
        padding: '3.5rem 2rem',
        background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
        borderRadius: '24px',
        border: '1px solid #dbeafe',
        marginBottom: '3rem',
        boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.08)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          background: '#dbeafe',
          color: '#1e40af',
          borderRadius: '9999px',
          fontWeight: 700,
          fontSize: '0.85rem',
          marginBottom: '1.5rem'
        }}>
          <ShieldCheck size={18} />
          Programme National Tunisien de Santé Préventive
        </div>

        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 800,
          color: '#0f2c59',
          lineHeight: 1.2,
          marginBottom: '1.25rem',
          letterSpacing: '-0.03em'
        }}>
          Plateforme Nationale de Dépistage Précoce du Diabète de Type 2
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: '#475569',
          maxWidth: '720px',
          margin: '0 auto 2.5rem',
          lineHeight: 1.6
        }}>
          Wiqayati centralise l'évaluation des risques métaboliques par <strong>Identifiant National de Santé (INS)</strong>,
          garantissant un dossier unique sans duplication et une prise en charge nutritionnelle ciblée.
        </p>

        <button
          onClick={handleAction}
          className="btn btn-primary"
          style={{
            fontSize: '1.1rem',
            padding: '0.9rem 2.2rem',
            borderRadius: '14px',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)'
          }}
        >
          <span>{estConnecte ? "Accéder à mon espace de travail" : "Se connecter à la plateforme"}</span>
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Les 3 piliers du pipeline Wiqayati */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '3.5rem'
      }}>
        <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}>
            <ShieldCheck size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f2c59', marginBottom: '0.75rem' }}>
            Dossier Unique par INS
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Chaque citoyen est identifié par son INS national. Aucune duplication n'est permise :
            les campagnes de terrain et les centres de santé alimentent le même historique centralisé.
          </p>
        </div>

        <div className="card" style={{ borderTop: '4px solid #10b981' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}>
            <Activity size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f2c59', marginBottom: '0.75rem' }}>
            Calcul Immédiat du Risque
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Un niveau de risque unique (<strong>Faible</strong>, <strong>Intermédiaire</strong> ou <strong>Élevé</strong>)
            est calculé dès la validation du formulaire de 14 facteurs cliniques et comportementaux.
          </p>
        </div>

        <div className="card" style={{ borderTop: '4px solid #f59e0b' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#fffbeb',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}>
            <Users size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f2c59', marginBottom: '0.75rem' }}>
            File Nutritionniste Priorisée
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Les plans de soin sont immédiatement routés vers les nutritionnistes par ordre d'urgence
            (STAT pour risque élevé), validés puis synchronisés vers l'application mobile citoyenne.
          </p>
        </div>
      </div>

      {/* Guide des accès de test */}
      <div className="card" style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
          Comptes de démonstration préconfigurés (Mot de passe commun : Wiqayati2026!)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
          <div style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong>agent_campagne</strong> (Agent de campagne)
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong>agent_soins</strong> (Agent soins primaires)
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong>nutritionniste1</strong> (Nutritionniste)
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong>admin_ministere</strong> (Admin Ministère)
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong>admin_it</strong> (Admin IT)
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong>TUN10002002</strong> (Citoyen, PIN: 1234)
          </div>
        </div>
      </div>
    </div>
  );
};
