import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

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
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'radial-gradient(circle at 50% 30%, #eff6ff 0%, #f8fafc 70%)'
    }}>
      <div className="card" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '2.5rem',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.1)',
        borderRadius: '20px',
        border: '1px solid #e2e8f0'
      }}>
        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #0d9488 100%)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(29, 78, 216, 0.25)',
            marginBottom: '1rem'
          }}>
            <HeartPulse size={32} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.4rem' }}>
            Connexion Unique
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Portail unifié sécurisé — tous les rôles professionnels et citoyens
          </p>
        </div>

        {/* Message d'erreur */}
        {erreur && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '0.88rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{erreur}</div>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="identifiant">
              Identifiant / Nom d'utilisateur
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}>
                <User size={18} />
              </div>
              <input
                id="identifiant"
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="ex: agent_campagne ou INS"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" htmlFor="motDePasse">
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}>
                <Lock size={18} />
              </div>
              <input
                id="motDePasse"
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Votre mot de passe"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={chargement}
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '12px' }}
          >
            {chargement ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Accès rapide pour tests de démonstration */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Remplissage rapide (comptes démo)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => preRemplir('agent_campagne')}
              style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#f1f5f9', borderRadius: '6px', color: '#334155' }}
            >
              Agent Campagne
            </button>
            <button
              type="button"
              onClick={() => preRemplir('nutritionniste1')}
              style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#f1f5f9', borderRadius: '6px', color: '#334155' }}
            >
              Nutritionniste
            </button>
            <button
              type="button"
              onClick={() => preRemplir('admin_ministere')}
              style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#f1f5f9', borderRadius: '6px', color: '#334155' }}
            >
              Admin Ministère
            </button>
            <button
              type="button"
              onClick={() => preRemplir('admin_it')}
              style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#f1f5f9', borderRadius: '6px', color: '#334155' }}
            >
              Admin IT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
