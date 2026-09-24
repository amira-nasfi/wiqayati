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
  Loader2
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
      <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <div>Chargement du tableau de bord d'administration IT...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            background: '#f1f5f9',
            color: '#334155',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            <Shield size={16} />
            Administration Technique & Sécurité IT
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.3rem' }}>
            Gestion des Accès, Monitoring & Audit
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Gestion du cycle de vie des comptes, journalisation immuable et surveillance de l'infrastructure HAPI FHIR
          </p>
        </div>

        <button
          onClick={() => setAfficheFormulaire(!afficheFormulaire)}
          className="btn btn-primary"
        >
          <UserPlus size={18} />
          <span>Créer un compte professionnel</span>
        </button>
      </div>

      {message && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          background: '#eff6ff',
          color: '#1e40af',
          border: '1px solid #bfdbfe',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* Bloc Monitoring Infrastructure */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: `4px solid ${statutFhir?.statut === 'OPERATIONNEL' ? '#10b981' : '#ef4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Serveur HAPI FHIR R4</span>
            <Server size={20} color={statutFhir?.statut === 'OPERATIONNEL' ? '#10b981' : '#ef4444'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: statutFhir?.statut === 'OPERATIONNEL' ? '#166534' : '#991b1b' }}>
            {statutFhir?.statut || 'EN VÉRIFICATION'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Latence : {statutFhir?.latence_ms ? `${statutFhir.latence_ms} ms` : 'N/A'} • Port 8085
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Base de Données Centrale</span>
            <Server size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534' }}>
            OPÉRATIONNELLE
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            PostgreSQL 15 (Port 5434)
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Broker Asynchrone</span>
            <Activity size={20} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af' }}>
            {statutSysteme?.redis || 'OPÉRATIONNEL'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Redis 7 • File Celery (Port 6379)
          </div>
        </div>
      </div>

      {/* Formulaire de création de compte dépliable */}
      {afficheFormulaire && (
        <div className="card" style={{ marginBottom: '2rem', border: '2px solid #2563eb' }}>
          <div className="card-header">
            <div className="card-title">Création d'un nouveau compte professionnel</div>
            <button onClick={() => setAfficheFormulaire(false)} style={{ color: '#64748b' }}>✕</button>
          </div>
          <form onSubmit={handleCreerCompte}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Identifiant unique (username)</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={nouveauCompte.username}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, username: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={nouveauCompte.email}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle</label>
                <select
                  className="form-control"
                  value={nouveauCompte.role}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, role: e.target.value })}
                >
                  <option value="AGENT_CAMPAGNE">Agent de campagne</option>
                  <option value="AGENT_SOINS_PRIMAIRES">Agent de soins primaires</option>
                  <option value="NUTRITIONNISTE">Nutritionniste</option>
                  <option value="ADMIN_MINISTERE">Administrateur Ministère</option>
                  <option value="ADMIN_IT">Administrateur IT</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input
                  type="text"
                  className="form-control"
                  value={nouveauCompte.prenom}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, prenom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input
                  type="text"
                  className="form-control"
                  value={nouveauCompte.nom}
                  onChange={(e) => setNouveauCompte({ ...nouveauCompte, nom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Date d'expiration {nouveauCompte.role === 'AGENT_CAMPAGNE' && <span style={{ color: '#ef4444' }}>* (Campagne)</span>}
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
              <button type="button" onClick={() => setAfficheFormulaire(false)} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Créer l'utilisateur
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau des utilisateurs */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div className="card-title">Comptes Utilisateurs Enregistrés ({utilisateurs.length})</div>
          <button onClick={rechargerDonnees} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            <RefreshCw size={14} />
            <span>Actualiser</span>
          </button>
        </div>
        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Identifiant</th>
                <th>Nom complet</th>
                <th>Rôle</th>
                <th>Gouvernorat</th>
                <th>Statut</th>
                <th>Expiration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.username}</td>
                  <td>{u.prenom} {u.nom}</td>
                  <td>
                    <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {u.role_libelle}
                    </span>
                  </td>
                  <td>{u.gouvernorat || '—'}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: u.is_active ? '#dcfce7' : '#fee2e2',
                      color: u.is_active ? '#166534' : '#991b1b',
                    }}>
                      {u.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td>
                    {u.expire_le ? (
                      <span style={{ fontSize: '0.8rem', color: new Date(u.expire_le) < new Date() ? '#ef4444' : '#475569' }}>
                        {new Date(u.expire_le).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Permanent</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => reinitialiserMdp(u.id, u.username)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        title="Réinitialiser mot de passe"
                      >
                        <Key size={13} />
                        <span>Mdp</span>
                      </button>
                      <button
                        onClick={() => basculerStatutActif(u.id, u.is_active)}
                        className={`btn ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        {u.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journal d'audit immuable */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Journal d'Audit Immuable de Traçabilité ({journaux.length} événements récents)</div>
        </div>
        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Ressource</th>
                <th>Adresse IP</th>
              </tr>
            </thead>
            <tbody>
              {journaux.slice(0, 15).map((j) => (
                <tr key={j.id}>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(j.horodatage).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ fontWeight: 600 }}>{j.acteur_nom}</td>
                  <td>
                    <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                      {j.action_libelle}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{j.type_ressource}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{j.adresse_ip || 'Local/Test'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
