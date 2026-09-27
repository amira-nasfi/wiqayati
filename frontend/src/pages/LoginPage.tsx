import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Lock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  CreditCard,
  Calendar,
  CheckCircle2,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import wiqayatiLogo from '../assets/logo.png';

type Onglet = 'citoyen' | 'professionnel';

export const LoginPage: React.FC = () => {
  const [onglet, setOnglet] = useState<Onglet>('citoyen');

  // Onglet Professionnel
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);

  // Onglet Citoyen
  const [cin, setCin] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [insDecouvert, setInsDecouvert] = useState<{ ins: string; prenom: string; nom: string; gouvernorat?: string } | null>(null);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const { connexion, connexionCitoyenCin, identifierCitoyenCin } = useAuth();
  const navigate = useNavigate();

  const handleSubmitProfessionnel = async (e: React.FormEvent) => {
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

  const handleRechercherIns = async () => {
    if (cin.length !== 8 || !dateNaissance) {
      setErreur("Veuillez saisir un CIN de 8 chiffres et une date de naissance.");
      return;
    }
    setErreur(null);
    setInsDecouvert(null);
    setRechercheEnCours(true);
    try {
      const resultat = await identifierCitoyenCin(cin, dateNaissance);
      if (resultat.trouve && resultat.ins) {
        setInsDecouvert({
          ins: resultat.ins,
          prenom: resultat.prenom || '',
          nom: resultat.nom || '',
          gouvernorat: resultat.gouvernorat,
        });
      } else {
        setErreur(resultat.message || "Aucun dossier de santé trouvé pour ce CIN et cette date de naissance.");
      }
    } catch {
      setErreur("Erreur réseau. Vérifiez que le serveur est en marche.");
    } finally {
      setRechercheEnCours(false);
    }
  };

  const handleConnexionCitoyen = async () => {
    if (!insDecouvert) return;
    setChargement(true);
    setErreur(null);
    try {
      const res = await connexionCitoyenCin(cin, dateNaissance);
      if (res.succes && res.redirection) {
        navigate(res.redirection);
      } else {
        setErreur(res.erreur || "Échec de connexion.");
      }
    } catch {
      setErreur("Erreur réseau.");
    } finally {
      setChargement(false);
    }
  };

  const preRemplir = (id: string, mdp: string = 'Wiqayati2026!') => {
    setOnglet('professionnel');
    setIdentifiant(id);
    setMotDePasse(mdp);
    setErreur(null);
  };

  const switchOnglet = (o: Onglet) => {
    setOnglet(o);
    setErreur(null);
    setInsDecouvert(null);
  };

  const inputStyle: React.CSSProperties = {
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
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.83rem',
    fontWeight: 700,
    color: '#0B2535',
    marginBottom: '0.4rem',
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
        {/* Voile dégradé */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(246,250,252,0.05) 0%, rgba(246,250,252,0.15) 25%, rgba(246,250,252,0.65) 45%, rgba(246,250,252,0.65) 55%, rgba(246,250,252,0.15) 75%, rgba(246,250,252,0.05) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* En-tête */}
        <header
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '1.2rem 3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#134B65',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(19,75,101,0.15)',
              backgroundColor: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 6px rgba(11,37,53,0.05)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0B2535';
              e.currentTarget.style.borderColor = '#134B65';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#134B65';
              e.currentTarget.style.borderColor = 'rgba(19,75,101,0.15)';
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
            }}
          >
            <ArrowLeft size={16} />
            <span>Retour à l'accueil</span>
          </Link>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={wiqayatiLogo} alt="Wiqayati" style={{ height: '65px', width: 'auto', objectFit: 'contain' }} />
          </Link>
        </header>

        {/* Corps principal */}
        <main
          style={{
            position: 'relative',
            zIndex: 10,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '20px',
              border: '1px solid rgba(19,75,101,0.14)',
              boxShadow: '0 16px 42px -10px rgba(11,37,53,0.14), 0 3px 8px rgba(11,37,53,0.04)',
              padding: '2.2rem 2.2rem',
              boxSizing: 'border-box',
            }}
          >
            {/* Badge sécurisé */}
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
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
                  marginBottom: '0.6rem',
                }}
              >
                <ShieldCheck size={14} />
                <span>Espace Sécurisé</span>
              </div>
              <h1
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.55rem',
                  fontWeight: 700,
                  color: '#0B2535',
                  letterSpacing: '-0.02em',
                  margin: '0 0 0.25rem 0',
                }}
              >
                Se connecter
              </h1>
            </div>

            {/* Sélecteur d'onglets */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#EDF5F9',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '1.5rem',
                gap: '4px',
              }}
            >
              {([
                { id: 'citoyen' as Onglet, label: 'Espace Citoyen', icon: <UserRound size={15} /> },
                { id: 'professionnel' as Onglet, label: 'Professionnel de Santé', icon: <Stethoscope size={15} /> },
              ] as { id: Onglet; label: string; icon: React.ReactNode }[]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => switchOnglet(tab.id)}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.5rem',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.79rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s',
                    backgroundColor: onglet === tab.id ? '#FFFFFF' : 'transparent',
                    color: onglet === tab.id ? '#134B65' : '#6A96A8',
                    boxShadow: onglet === tab.id ? '0 1px 4px rgba(11,37,53,0.1)' : 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
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

            {/* ─── ONGLET CITOYEN ─── */}
            {onglet === 'citoyen' && (
              <div>
                <p style={{ color: '#4A7186', fontSize: '0.85rem', margin: '0 0 1.2rem 0', lineHeight: 1.5 }}>
                  Accédez à votre dossier de santé avec votre <strong>CIN</strong> (8 chiffres) et votre <strong>date de naissance</strong>.
                </p>

                {/* CIN */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Numéro CIN (8 chiffres)</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#6A96A8', display: 'flex', pointerEvents: 'none' }}>
                      <CreditCard size={16} />
                    </div>
                    <input
                      id="cin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{8}"
                      maxLength={8}
                      style={inputStyle}
                      placeholder="Ex : 08123456"
                      value={cin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setCin(val);
                        setInsDecouvert(null);
                        setErreur(null);
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#134B65'; e.target.style.backgroundColor = '#FFFFFF'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#CADEE6'; e.target.style.backgroundColor = '#F9FCFD'; }}
                    />
                  </div>
                  {cin.length > 0 && cin.length < 8 && (
                    <p style={{ fontSize: '0.76rem', color: '#7A2626', margin: '3px 0 0 2px' }}>{8 - cin.length} chiffre(s) manquant(s)</p>
                  )}
                </div>

                {/* Date de naissance */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>Date de naissance</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#6A96A8', display: 'flex', pointerEvents: 'none' }}>
                      <Calendar size={16} />
                    </div>
                    <input
                      id="dateNaissance"
                      type="date"
                      style={{ ...inputStyle, padding: '0.68rem 0.85rem 0.68rem 2.45rem' }}
                      value={dateNaissance}
                      onChange={(e) => { setDateNaissance(e.target.value); setInsDecouvert(null); setErreur(null); }}
                      onFocus={(e) => { e.target.style.borderColor = '#134B65'; e.target.style.backgroundColor = '#FFFFFF'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#CADEE6'; e.target.style.backgroundColor = '#F9FCFD'; }}
                    />
                  </div>
                </div>

                {/* Carte INS découvert */}
                {insDecouvert && (
                  <div
                    style={{
                      backgroundColor: '#F0FBF6',
                      border: '1.5px solid #6FCF97',
                      borderRadius: '10px',
                      padding: '1rem 1.1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <CheckCircle2 size={22} style={{ color: '#1A8F4E', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1A8F4E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        Dossier National de Prévention Retrouvé
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0B2535', marginBottom: '2px' }}>
                        {insDecouvert.prenom} {insDecouvert.nom}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#4A7186' }}>
                        <strong>INS :</strong> {insDecouvert.ins}
                        {insDecouvert.gouvernorat && <span> · {insDecouvert.gouvernorat}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Boutons */}
                {!insDecouvert ? (
                  <button
                    type="button"
                    disabled={rechercheEnCours || cin.length !== 8 || !dateNaissance}
                    onClick={handleRechercherIns}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1.25rem',
                      borderRadius: '9px',
                      backgroundColor: cin.length === 8 && dateNaissance ? '#134B65' : '#9BB8C5',
                      color: '#FFFFFF',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: (rechercheEnCours || cin.length !== 8 || !dateNaissance) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontFamily: 'inherit',
                      transition: 'background-color 0.15s',
                      opacity: rechercheEnCours ? 0.7 : 1,
                      boxShadow: '0 3px 10px rgba(19,75,101,0.2)',
                    }}
                  >
                    {rechercheEnCours ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Recherche en cours...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        <span>Rechercher mon dossier</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={chargement}
                    onClick={handleConnexionCitoyen}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1.25rem',
                      borderRadius: '9px',
                      backgroundColor: '#1A8F4E',
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
                      boxShadow: '0 3px 10px rgba(26,143,78,0.25)',
                    }}
                    onMouseEnter={(e) => { if (!chargement) e.currentTarget.style.backgroundColor = '#157A40'; }}
                    onMouseLeave={(e) => { if (!chargement) e.currentTarget.style.backgroundColor = '#1A8F4E'; }}
                  >
                    {chargement ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Connexion...</span>
                      </>
                    ) : (
                      <span>Accéder à mon Espace Santé →</span>
                    )}
                  </button>
                )}

                {/* Démo citoyen */}
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { setCin('08123456'); setDateNaissance('1980-03-15'); setInsDecouvert(null); setErreur(null); }}
                    style={{
                      fontSize: '0.74rem',
                      padding: '4px 10px',
                      backgroundColor: '#EAF6F3',
                      borderRadius: '6px',
                      color: '#12543D',
                      fontWeight: 700,
                      border: '1px solid #A8D8C6',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Pré-remplir avec un compte citoyen de démo (Mohamed Haddad)
                  </button>
                </div>
              </div>
            )}

            {/* ─── ONGLET PROFESSIONNEL ─── */}
            {onglet === 'professionnel' && (
              <form onSubmit={handleSubmitProfessionnel}>
                <p style={{ color: '#4A7186', fontSize: '0.85rem', margin: '0 0 1.2rem 0', lineHeight: 1.5 }}>
                  Réservé aux agents, nutritionnistes, et administrateurs.
                </p>

                {/* Identifiant */}
                <div style={{ marginBottom: '1.15rem' }}>
                  <label htmlFor="identifiant" style={labelStyle}>Identifiant professionnel</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#6A96A8', display: 'flex', pointerEvents: 'none' }}>
                      <User size={16} />
                    </div>
                    <input
                      id="identifiant"
                      type="text"
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = '#134B65'; e.target.style.backgroundColor = '#FFFFFF'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#CADEE6'; e.target.style.backgroundColor = '#F9FCFD'; }}
                      placeholder="ex: agent_campagne"
                      value={identifiant}
                      onChange={(e) => setIdentifiant(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="motDePasse" style={labelStyle}>Mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#6A96A8', display: 'flex', pointerEvents: 'none' }}>
                      <Lock size={16} />
                    </div>
                    <input
                      id="motDePasse"
                      type={voirMdp ? 'text' : 'password'}
                      style={{ ...inputStyle, padding: '0.68rem 2.45rem 0.68rem 2.45rem' }}
                      onFocus={(e) => { e.target.style.borderColor = '#134B65'; e.target.style.backgroundColor = '#FFFFFF'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#CADEE6'; e.target.style.backgroundColor = '#F9FCFD'; }}
                      placeholder="Votre mot de passe"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setVoirMdp(!voirMdp)}
                      style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#6A96A8', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      title={voirMdp ? 'Masquer' : 'Afficher'}
                    >
                      {voirMdp ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

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
                    boxShadow: '0 3px 10px rgba(19,75,101,0.2)',
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

                {/* Comptes de démonstration */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E8F0F3' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6A96A8', textAlign: 'center', marginBottom: '0.6rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Comptes de test & démonstration
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                    {[
                      { label: 'Agent Campagne', id: 'agent.campagne.sfax', mdp: 'Agent2026!' },
                      { label: 'Agent CSP', id: 'agent.csp.tunis', mdp: 'Agent2026!' },
                      { label: 'Nutritionniste', id: 'nutri.ben_ali', mdp: 'Nutri2026!' },
                      { label: 'Admin Ministère', id: 'admin.ministere', mdp: 'Admin2026!' },
                      { label: 'Admin IT', id: 'admin.it', mdp: 'Admin2026!' },
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
                  </div>
                </div>
              </form>
            )}
          </div>
        </main>

        {/* Pied de page */}
        <footer
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '1rem 3.5rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#4A7186',
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderTop: '1px solid rgba(19,75,101,0.08)',
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
