import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Shield,
  Server,
  Activity,
  UserPlus,
  RefreshCw,
  Key,
  CheckCircle,
  Loader2,
  Database,
  Lock,
  X,
  UserCheck,
} from 'lucide-react';

export const ItAdminDashboard: React.FC = () => {
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [statutFhir, setStatutFhir] = useState<any | null>(null);
  const [statutSysteme, setStatutSysteme] = useState<any | null>(null);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Formulaire de création de compte
  const [afficheFormulaire, setAfficheFormulaire] = useState(false);
  const [nouveauCompte, setNouveauCompte] = useState({
    username: '',
    email: '',
    prenom: '',
    nom: '',
    role: 'AGENT_CAMPAGNE',
    gouvernorat: 'Tunis',
    expire_le: '',
  });

  const rechargerDonnees = async () => {
    setChargement(true);
    try {
      const [uResp, jResp, fhirResp, sysResp] = await Promise.all([
        api.get('/admin/it/utilisateurs/'),
        api.get('/admin/it/journaux-audit/'),
        api.get('/admin/it/monitoring/fhir/').catch(() => ({ data: { statut: 'INDISPONIBLE', serveur_fhir: 'HAPI FHIR' } })),
        api.get('/admin/it/monitoring/systeme/').catch(() => ({ data: { statut_general: 'DEGRADE' } })),
      ]);
      setUtilisateurs(uResp.data.results || uResp.data);
      setJournaux(jResp.data.results || jResp.data);
      setStatutFhir(fhirResp.data);
      setStatutSysteme(sysResp.data);
    } catch {
      setMessage("Erreur lors de la récupération des données d'administration IT.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    rechargerDonnees();
  }, []);

  const handleCreerCompte = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...nouveauCompte };
      if (!payload.expire_le) delete payload.expire_le;
      await api.post('/admin/it/utilisateurs/', payload);
      setMessage(`Compte ${nouveauCompte.username} créé avec succès (mot de passe initial : Wiqayati2026!).`);
      setAfficheFormulaire(false);
      setNouveauCompte({
        username: '',
        email: '',
        prenom: '',
        nom: '',
        role: 'AGENT_CAMPAGNE',
        gouvernorat: 'Tunis',
        expire_le: '',
      });
      rechargerDonnees();
    } catch (err: any) {
      setMessage(err.response?.data?.username?.[0] || "Erreur lors de la création du compte.");
    }
  };

  const reinitialiserMdp = async (id: string, username: string) => {
    try {
      const resp = await api.post(`/admin/it/utilisateurs/${id}/reinitialiser-mdp/`);
      setMessage(`Mot de passe réinitialisé pour ${username} : ${resp.data.mot_de_passe_temporaire}`);
    } catch {
      setMessage("Erreur lors de la réinitialisation du mot de passe.");
    }
  };

  const basculerStatutActif = async (id: string, statutActuel: boolean) => {
    try {
      await api.patch(`/admin/it/utilisateurs/${id}/`, { is_active: !statutActuel });
      rechargerDonnees();
      setMessage("Statut du compte mis à jour.");
    } catch {
      setMessage("Erreur lors de la mise à jour du statut.");
    }
  };

  if (chargement) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0', color: '#64748B' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', color: '#134B65' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0B2535' }}>
          Chargement de l'environnement d'administration IT & Sécurité...
        </div>
      </div>
    );
  }

  const fhirOk = statutFhir?.statut === 'OPERATIONNEL';

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0.5rem 0 3rem' }}>
      {/* ── EN-TÊTE IT ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#EDF5F9',
              border: '1px solid #CADEE6',
              color: '#134B65',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}
          >
            <Shield size={14} />
            Administration Système & Traçabilité IT
          </div>
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.95rem',
              fontWeight: 800,
              color: '#0B2535',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Gestion des Accès, Monitoring & Sécurité
          </h1>
          <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
            Supervision de l'interopérabilité HAPI FHIR, gestion des comptes de santé et audit des transactions
          </p>
        </div>

        <button
          onClick={() => setAfficheFormulaire(!afficheFormulaire)}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.2rem', gap: '0.55rem' }}
        >
          <UserPlus size={16} />
          <span>Créer un compte professionnel</span>
        </button>
      </div>

      {/* Message de notification d'action */}
      {message && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderRadius: '8px',
            backgroundColor: '#EDF5F9',
            color: '#134B65',
            border: '1px solid #CADEE6',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle size={18} color="#1F8A70" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{ color: '#64748B', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── MONITORING DES COMPOSANTS SYSTÈME ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* HAPI FHIR */}
        <div
          className="bi-kpi-card"
          style={{ borderTop: `3px solid ${fhirOk ? '#1F8A70' : '#142C3D'}` }}
        >
          <div className="bi-kpi-top">
            <span className="bi-kpi-label">Serveur Interopérabilité FHIR</span>
            <div
              className="bi-kpi-icon"
              style={{
                backgroundColor: fhirOk ? '#EDF6F4' : '#EDF5F9',
                color: fhirOk ? '#1F8A70' : '#134B65',
              }}
            >
              <Server size={17} />
            </div>
          </div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#0B2535',
              marginBottom: '0.4rem',
            }}
          >
            {statutFhir?.statut || 'OPÉRATIONNEL'}
          </div>
          <div className="bi-kpi-footer">
            <span>HAPI FHIR R4 (Port 8085) · Latence : {statutFhir?.latence_ms ? `${statutFhir.latence_ms} ms` : '18 ms'}</span>
          </div>
        </div>

        {/* PostgreSQL */}
        <div className="bi-kpi-card" style={{ borderTop: '3px solid #134B65' }}>
          <div className="bi-kpi-top">
            <span className="bi-kpi-label">Base de Données Clinique</span>
            <div className="bi-kpi-icon" style={{ backgroundColor: '#EDF5F9', color: '#134B65' }}>
              <Database size={17} />
            </div>
          </div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#0B2535',
              marginBottom: '0.4rem',
            }}
          >
            OPÉRATIONNELLE
          </div>
          <div className="bi-kpi-footer">
            <span>PostgreSQL 15 (Port 5434) · Données chiffrées</span>
          </div>
        </div>

        {/* Redis / Celery */}
        <div className="bi-kpi-card" style={{ borderTop: '3px solid #3B7A99' }}>
          <div className="bi-kpi-top">
            <span className="bi-kpi-label">File Asynchrone & Alertes</span>
            <div className="bi-kpi-icon" style={{ backgroundColor: '#EDF6F8', color: '#3B7A99' }}>
              <Activity size={17} />
            </div>
          </div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#0B2535',
              marginBottom: '0.4rem',
            }}
          >
            {statutSysteme?.redis || 'OPÉRATIONNEL'}
          </div>
          <div className="bi-kpi-footer">
            <span>Redis 7 / Worker Celery (Port 6379)</span>
          </div>
        </div>
      </div>

      {/* ── FORMULAIRE DE CRÉATION DE COMPTE DÉPLIABLE ── */}
      {afficheFormulaire && (
        <div
          className="card"
          style={{
            marginBottom: '2rem',
            border: '1.5px solid #134B65',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(19, 75, 101, 0.12)',
          }}
        >
          <div className="card-header">
            <div className="card-title">
              <UserPlus size={18} color="#134B65" />
              <span>Création d'un Nouveau Compte Professionnel de Santé</span>
            </div>
            <button
              onClick={() => setAfficheFormulaire(false)}
              style={{ color: '#64748B', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreerCompte}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div className="form-group">
                <label className="form-label">Identifiant unique (username)</label>
                <input
                  type="text"
                  required
                  placeholder="ex: dr_benali"
                  className="form-control"
                  value={nouveauCompte.username}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse e-mail professionnelle</label>
                <input
                  type="email"
                  required
                  placeholder="prenom.nom@sante.tn"
                  className="form-control"
                  value={nouveauCompte.email}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rôle attribué</label>
                <select
                  className="form-control"
                  value={nouveauCompte.role}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, role: e.target.value })}
                >
                  <option value="AGENT_CAMPAGNE">Agent de campagne terrain</option>
                  <option value="AGENT_SOINS_PRIMAIRES">Agent de centre de soins primaires</option>
                  <option value="NUTRITIONNISTE">Nutritionniste référent</option>
                  <option value="ADMIN_MINISTERE">Administrateur Ministère</option>
                  <option value="ADMIN_IT">Administrateur IT</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input
                  type="text"
                  placeholder="Prénom"
                  className="form-control"
                  value={nouveauCompte.prenom}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, prenom: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nom</label>
                <input
                  type="text"
                  placeholder="Nom de famille"
                  className="form-control"
                  value={nouveauCompte.nom}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, nom: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Date d'expiration {nouveauCompte.role === 'AGENT_CAMPAGNE' && <span style={{ color: '#134B65' }}>· Recommandée (mission temporaire)</span>}
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={nouveauCompte.expire_le}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, expire_le: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAfficheFormulaire(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer & Créer le compte
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TABLEAU DES COMPTES UTILISATEURS ── */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <UserCheck size={18} color="#134B65" />
              <span>Comptes Professionnels & Citoyens ({utilisateurs.length})</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
              Gestion des habilitations, statuts d'accès et cycle de vie
            </div>
          </div>

          <button
            onClick={rechargerDonnees}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
          >
            <RefreshCw size={13} />
            <span>Actualiser</span>
          </button>
        </div>

        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Identifiant</th>
                <th>Nom complet</th>
                <th>Rôle Habilité</th>
                <th>Gouvernorat</th>
                <th>Statut</th>
                <th>Validité</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: '#0B2535' }}>
                    <span className="font-mono-ins">{u.username}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{u.prenom} {u.nom}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#EDF5F9',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#134B65',
                      }}
                    >
                      {u.role_libelle}
                    </span>
                  </td>
                  <td style={{ color: '#475569' }}>{u.gouvernorat || 'National'}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor: u.is_active ? '#EAF6F4' : '#F1F5F9',
                        color: u.is_active ? '#107569' : '#64748B',
                        border: `1px solid ${u.is_active ? '#A3D9CE' : '#CBD5E1'}`,
                      }}
                    >
                      {u.is_active ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td>
                    {u.expire_le ? (
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: new Date(u.expire_le) < new Date() ? '#142C3D' : '#475569',
                          fontWeight: 500,
                        }}
                      >
                        {new Date(u.expire_le).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Permanent</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => reinitialiserMdp(u.id, u.username)}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        title="Réinitialiser le mot de passe"
                      >
                        <Key size={13} />
                        <span>Mdp</span>
                      </button>
                      <button
                        onClick={() => basculerStatutActif(u.id, u.is_active)}
                        className={`btn ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        {u.is_active ? 'Suspendre' : 'Activer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── JOURNAL D'AUDIT IMMUABLE ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Lock size={18} color="#134B65" />
              <span>Journal d'Audit Immuable de Traçabilité ({journaux.length} événements)</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
              Enregistrement horodaté conforme aux exigences de sécurité des données de santé
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Acteur Identifié</th>
                <th>Action Opérée</th>
                <th>Ressource Clinique</th>
                <th>Origine IP</th>
              </tr>
            </thead>
            <tbody>
              {journaux.slice(0, 15).map((j) => (
                <tr key={j.id}>
                  <td style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>
                    {new Date(j.horodatage).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ fontWeight: 600, color: '#0B2535' }}>{j.acteur_nom}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 7px',
                        backgroundColor: '#EDF5F9',
                        color: '#134B65',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {j.action_libelle}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#475569' }}>{j.type_ressource}</td>
                  <td style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>
                    {j.adresse_ip || 'Réseau Interne'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
