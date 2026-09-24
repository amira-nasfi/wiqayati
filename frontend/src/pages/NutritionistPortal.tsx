import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  CheckCircle,
  XCircle,
  Edit3,
  ChevronRight,
  Loader2
} from 'lucide-react';

export const NutritionistPortal: React.FC = () => {
  const [taches, setTaches] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [planEnEdition, setPlanEnEdition] = useState<any | null>(null);
  const [messageAction, setMessageAction] = useState<string | null>(null);

  // Champs éditables du plan
  const [notesNutritionniste, setNotesNutritionniste] = useState('');
  const [planNutritionTitre, setPlanNutritionTitre] = useState('');
  const [planNutritionConseils, setPlanNutritionConseils] = useState('');
  const [planActiviteTitre, setPlanActiviteTitre] = useState('');
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  // Rejet
  const [motifRejet, setMotifRejet] = useState('');
  const [afficheModalRejet, setAfficheModalRejet] = useState(false);

  const chargerFile = async () => {
    setChargement(true);
    try {
      const resp = await api.get('/nutritionniste/file/');
      setTaches(resp.data.results || resp.data);
    } catch {
      setMessageAction("Erreur lors du chargement de la file.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerFile();
  }, []);

  const ouvrirDossier = async (planId: string, tacheId: string) => {
    setMessageAction(null);
    try {
      // Si la tâche est encore en DEMANDE, la prendre en charge automatiquement
      await api.post(`/nutritionniste/file/${tacheId}/prendre-en-charge/`);
      const resp = await api.get(`/nutritionniste/plans/${planId}/`);
      const plan = resp.data;
      setPlanEnEdition(plan);
      setNotesNutritionniste(plan.notes_nutritionniste || '');
      setPlanNutritionTitre(plan.plan_nutrition?.titre || '');
      setPlanNutritionConseils(plan.plan_nutrition?.conseils_specifiques || '');
      setPlanActiviteTitre(plan.plan_activite?.titre || '');
      chargerFile();
    } catch {
      setMessageAction("Erreur lors de l'ouverture du dossier.");
    }
  };

  const handleSauvegarderModifications = async () => {
    if (!planEnEdition) return;
    setSauvegardeEnCours(true);
    try {
      const resp = await api.patch(`/nutritionniste/plans/${planEnEdition.id}/modifier/`, {
        notes_nutritionniste: notesNutritionniste,
        plan_nutrition: {
          ...planEnEdition.plan_nutrition,
          titre: planNutritionTitre,
          conseils_specifiques: planNutritionConseils,
        },
        plan_activite: {
          ...planEnEdition.plan_activite,
          titre: planActiviteTitre,
        },
      });
      setPlanEnEdition(resp.data);
      setMessageAction("Modifications enregistrées en brouillon.");
    } catch {
      setMessageAction("Erreur lors de la sauvegarde.");
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const handleValiderPlan = async () => {
    if (!planEnEdition) return;
    setSauvegardeEnCours(true);
    try {
      // 1. Sauvegarder d'abord les éventuelles modifications
      await handleSauvegarderModifications();
      // 2. Valider
      const resp = await api.post(`/nutritionniste/plans/${planEnEdition.id}/valider/`);
      setMessageAction(resp.data.message || "Plan validé avec succès.");
      setPlanEnEdition(null);
      chargerFile();
    } catch {
      setMessageAction("Erreur lors de la validation du plan.");
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const handleRejeterPlan = async () => {
    if (!planEnEdition || !motifRejet.trim()) return;
    setSauvegardeEnCours(true);
    try {
      const resp = await api.post(`/nutritionniste/plans/${planEnEdition.id}/rejeter/`, {
        motif: motifRejet,
      });
      setMessageAction(resp.data.message || "Le plan a été rejeté.");
      setAfficheModalRejet(false);
      setPlanEnEdition(null);
      chargerFile();
    } catch {
      setMessageAction("Erreur lors du rejet du plan.");
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.4rem' }}>
          File de Priorité des Nutritionnistes
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Ordonnancement national par niveau de risque : <strong>STAT (Élevé)</strong> → <strong>URGENT (Intermédiaire)</strong> → <strong>ROUTINE (Faible)</strong>
        </p>
      </div>

      {messageAction && (
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
          <span>{messageAction}</span>
        </div>
      )}

      {/* Vue 2 colonnes si un dossier est ouvert */}
      <div style={{ display: 'grid', gridTemplateColumns: planEnEdition ? '1fr 1.25fr' : '1fr', gap: '2rem' }}>
        {/* Colonne Gauche : File de priorité */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Tâches en attente ({taches.length})
            </div>
            <button onClick={chargerFile} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              Actualiser
            </button>
          </div>

          {chargement ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <div>Chargement de la file...</div>
            </div>
          ) : taches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Aucune tâche en attente dans la file.
            </div>
          ) : (
            <div className="table-container">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Priorité</th>
                    <th>Patient (INS)</th>
                    <th>Risque</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {taches.map((t) => (
                    <tr
                      key={t.id}
                      style={{
                        background: planEnEdition?.id === t.plan_id ? '#eff6ff' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: t.priorite === 'STAT' ? '#fee2e2' : t.priorite === 'URGENT' ? '#fef3c7' : '#dcfce7',
                          color: t.priorite === 'STAT' ? '#991b1b' : t.priorite === 'URGENT' ? '#92400e' : '#166534',
                        }}>
                          {t.priorite}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {t.patient.prenom} {t.patient.nom}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          INS: {t.patient.ins} • {t.patient.gouvernorat}
                        </div>
                      </td>
                      <td>
                        <span className={`badge-risk ${t.niveau_risque}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          {t.niveau_risque} ({t.score_risque})
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {t.statut_libelle}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => ouvrirDossier(t.plan_id, t.id)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                        >
                          <span>Examiner</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne Droite : Examen du dossier et plan de soin */}
        {planEnEdition && (
          <div className="card" style={{ borderColor: '#93c5fd', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.1)' }}>
            <div className="card-header" style={{ background: '#f8fafc', margin: '-1.75rem -1.75rem 1.5rem', padding: '1.25rem 1.75rem', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f2c59' }}>
                  Dossier : {planEnEdition.patient.prenom} {planEnEdition.patient.nom} (INS: {planEnEdition.patient.ins})
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {planEnEdition.patient.gouvernorat} • Né(e) le {planEnEdition.patient.date_naissance} • Genre : {planEnEdition.patient.genre === 'M' ? 'Masculin' : 'Féminin'}
                </div>
              </div>
              <button
                onClick={() => setPlanEnEdition(null)}
                style={{ fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Évaluation calculée */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Évaluation initiale du risque</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2c59' }}>
                  Score : {planEnEdition.evaluation_risque.score} / 100
                </div>
              </div>
              <span className={`badge-risk ${planEnEdition.evaluation_risque.niveau_risque}`}>
                {planEnEdition.evaluation_risque.niveau_risque_libelle}
              </span>
            </div>

            {/* Facteurs contributifs */}
            {planEnEdition.evaluation_risque.facteurs?.length > 0 && (
              <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <strong style={{ color: '#334155' }}>Facteurs déterminants :</strong>
                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem', color: '#475569' }}>
                  {planEnEdition.evaluation_risque.facteurs.map((f: any, idx: number) => (
                    <li key={idx}>{f.libelle}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formulaire d'édition du plan */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Titre du plan nutritionnel</label>
                <input
                  type="text"
                  className="form-control"
                  value={planNutritionTitre}
                  onChange={(e) => setPlanNutritionTitre(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Conseils spécifiques du nutritionniste</label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={planNutritionConseils}
                  onChange={(e) => setPlanNutritionConseils(e.target.value)}
                  placeholder="Conseils et consignes personnalisées..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recommandations d'activité physique</label>
                <input
                  type="text"
                  className="form-control"
                  value={planActiviteTitre}
                  onChange={(e) => setPlanActiviteTitre(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes cliniques internes (confidentiel)</label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={notesNutritionniste}
                  onChange={(e) => setNotesNutritionniste(e.target.value)}
                  placeholder="Observations sur l'état général et tolérance..."
                />
              </div>
            </div>

            {/* Boutons d'actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setAfficheModalRejet(true)}
                className="btn btn-danger"
                disabled={sauvegardeEnCours}
              >
                <XCircle size={16} />
                <span>Rejeter le plan</span>
              </button>

              <button
                type="button"
                onClick={handleSauvegarderModifications}
                className="btn btn-secondary"
                disabled={sauvegardeEnCours}
              >
                <Edit3 size={16} />
                <span>Sauvegarder brouillon</span>
              </button>

              <button
                type="button"
                onClick={handleValiderPlan}
                className="btn btn-success"
                disabled={sauvegardeEnCours}
              >
                <CheckCircle size={16} />
                <span>Valider le plan pour le citoyen</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Rejet */}
      {afficheModalRejet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991b1b', marginBottom: '1rem' }}>
              Motif du rejet du plan de soin
            </h3>
            <div className="form-group">
              <label className="form-label">Veuillez indiquer la raison du rejet :</label>
              <textarea
                rows={3}
                required
                className="form-control"
                placeholder="ex: Données de dépistage incohérentes..."
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAfficheModalRejet(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRejeterPlan}
                className="btn btn-danger"
                disabled={!motifRejet.trim() || sauvegardeEnCours}
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
