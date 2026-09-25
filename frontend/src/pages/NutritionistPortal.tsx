import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  CheckCircle,
  XCircle,
  FileEdit,
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
      setMessageAction("Erreur lors du chargement de la file clinique.");
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
      setMessageAction("Impossible d'ouvrir ce dossier médical.");
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
      setMessageAction("Modifications enregistrées dans le dossier patient.");
    } catch {
      setMessageAction("Échec de l'enregistrement du brouillon.");
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const handleValiderPlan = async () => {
    if (!planEnEdition) return;
    setSauvegardeEnCours(true);
    try {
      await handleSauvegarderModifications();
      const resp = await api.post(`/nutritionniste/plans/${planEnEdition.id}/valider/`);
      setMessageAction(resp.data.message || "Plan de soin validé et transmis au citoyen.");
      setPlanEnEdition(null);
      chargerFile();
    } catch {
      setMessageAction("Erreur lors de la validation clinique du plan.");
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const handleRejeterPlan = async () => {
    if (!planEnEdition || !motifRejet.trim()) return;
    setSauvegardeEnCours(true);
    try {
      await api.post(`/nutritionniste/plans/${planEnEdition.id}/rejeter/`, {
        motif_rejet: motifRejet,
      });
      setMessageAction("Dossier renvoyé à l'équipe de dépistage.");
      setPlanEnEdition(null);
      setAfficheModalRejet(false);
      setMotifRejet('');
      chargerFile();
    } catch {
      setMessageAction("Erreur lors du signalement de rejet.");
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const getPrioriteStyle = (priorite: string) => {
    switch (priorite) {
      case 'STAT':
        return {
          bg: '#FDF2F2',
          border: '#F2C2C2',
          color: '#8F2626',
          label: 'STAT · Prise en charge immédiate',
        };
      case 'URGENT':
        return {
          bg: '#FCF6EC',
          border: '#F0D5AC',
          color: '#7A4608',
          label: 'URGENT · 48 heures',
        };
      default:
        return {
          bg: '#EBF7F2',
          border: '#BFE4D5',
          color: '#12543D',
          label: 'ROUTINE · Suivi programmé',
        };
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* En-tête clinique sobre et institutionnel */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-ink)', marginBottom: '0.35rem' }}>
          File de priorisation nutritionnelle
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Triage national selon l'évaluation du risque diabète : STAT (Élevé) · URGENT (Intermédiaire) · ROUTINE (Faible)
        </p>
      </div>

      {messageAction && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-highlight)',
          color: 'var(--primary-slate)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}>
          <CheckCircle size={16} color="var(--accent-mint)" />
          <span>{messageAction}</span>
        </div>
      )}

      {/* Disposition principale : File de gauche + Fiche de travail à droite */}
      <div style={{ display: 'grid', gridTemplateColumns: planEnEdition ? '1fr 1.25fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Colonne gauche : Registre des tâches */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Dossiers en attente d'arbitrage</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {taches.length} patient(s) en file d'attente
              </div>
            </div>
            <button
              onClick={chargerFile}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
            >
              Actualiser la file
            </button>
          </div>

          {chargement ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--primary-slate)' }} />
              <div style={{ fontSize: '0.9rem' }}>Actualisation du registre...</div>
            </div>
          ) : taches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Aucun dossier en attente d'évaluation dans votre file.
            </div>
          ) : (
            <div className="table-container">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Priorité</th>
                    <th>Patient</th>
                    <th>Risque calculé</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {taches.map((t) => {
                    const estSelectionne = planEnEdition?.id === t.plan_id;
                    const pStyle = getPrioriteStyle(t.priorite);

                    return (
                      <tr
                        key={t.id}
                        style={{
                          backgroundColor: estSelectionne ? 'var(--surface-highlight)' : undefined,
                          borderLeft: estSelectionne ? '3px solid var(--primary-slate)' : '3px solid transparent',
                        }}
                      >
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: pStyle.bg,
                            border: `1px solid ${pStyle.border}`,
                            color: pStyle.color,
                          }}>
                            {t.priorite}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>
                            {t.patient.prenom} {t.patient.nom}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            INS {t.patient.ins} · {t.patient.gouvernorat}
                          </div>
                        </td>
                        <td>
                          <span className={`badge-risk ${t.niveau_risque}`}>
                            {t.niveau_risque} · Score {t.score_risque}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {t.statut_libelle}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => ouvrirDossier(t.plan_id, t.id)}
                            className={estSelectionne ? "btn btn-primary" : "btn btn-secondary"}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                          >
                            {estSelectionne ? 'En cours' : 'Consulter'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne droite : Fiche de consultation du patient et plan de soin */}
        {planEnEdition && (
          <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
            <div className="card-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                  Fiche patient : {planEnEdition.patient.prenom} {planEnEdition.patient.nom}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Identifiant INS {planEnEdition.patient.ins} · {planEnEdition.patient.gouvernorat} · Né(e) le {planEnEdition.patient.date_naissance}
                </div>
              </div>
              <button
                onClick={() => setPlanEnEdition(null)}
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Fermer
              </button>
            </div>

            {/* Synthèse du dépistage */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              background: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Évaluation initiale du risque</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                  Score FINDRISC {planEnEdition.evaluation_risque.score} / 100
                </div>
              </div>
              <span className={`badge-risk ${planEnEdition.evaluation_risque.niveau_risque}`}>
                {planEnEdition.evaluation_risque.niveau_risque_libelle}
              </span>
            </div>

            {/* Facteurs cliniques déterminants */}
            {planEnEdition.evaluation_risque.facteurs?.length > 0 && (
              <div style={{
                marginBottom: '1.25rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Facteurs contributifs identifiés lors du dépistage :
                </div>
                <ul style={{ paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text-ink)' }}>
                  {planEnEdition.evaluation_risque.facteurs.map((f: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: '2px' }}>{f.libelle}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formulaire clinique du plan */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Titre du plan nutritionnel</label>
                <input
                  type="text"
                  className="form-control"
                  value={planNutritionTitre}
                  onChange={(e) => setPlanNutritionTitre(e.target.value)}
                  placeholder="Orientation diététique personnalisée"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consignes diététiques spécifiques</label>
                <textarea
                  rows={3}
                  className="form-control"
                  value={planNutritionConseils}
                  onChange={(e) => setPlanNutritionConseils(e.target.value)}
                  placeholder="Indications sur les apports, index glycémique, répartition des repas..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recommandations d'activité physique adaptée</label>
                <input
                  type="text"
                  className="form-control"
                  value={planActiviteTitre}
                  onChange={(e) => setPlanActiviteTitre(e.target.value)}
                  placeholder="ex: Marche active quotidienne, étirements ciblés"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observations médicales internes (dossier soignant)</label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={notesNutritionniste}
                  onChange={(e) => setNotesNutritionniste(e.target.value)}
                  placeholder="Notes de suivi ou contre-indications éventuelles..."
                />
              </div>
            </div>

            {/* Actions soignantes */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <button
                type="button"
                onClick={() => setAfficheModalRejet(true)}
                className="btn btn-danger"
                disabled={sauvegardeEnCours}
              >
                <XCircle size={15} />
                <span>Rejeter le dossier</span>
              </button>

              <button
                type="button"
                onClick={handleSauvegarderModifications}
                className="btn btn-secondary"
                disabled={sauvegardeEnCours}
              >
                <FileEdit size={15} />
                <span>Enregistrer brouillon</span>
              </button>

              <button
                type="button"
                onClick={handleValiderPlan}
                className="btn btn-accent"
                disabled={sauvegardeEnCours}
              >
                <CheckCircle size={15} />
                <span>Valider le plan de soin</span>
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
          background: 'rgba(20, 40, 47, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', border: '1px solid var(--border-medium)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--risk-eleve-text)', marginBottom: '0.75rem' }}>
              Motif de renvoi du dossier
            </h3>
            <div className="form-group">
              <label className="form-label">Précisez la raison pour l'équipe de dépistage :</label>
              <textarea
                rows={3}
                required
                className="form-control"
                placeholder="ex: Incohérence des mesures glycémiques ou antécédents non renseignés..."
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
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
                Confirmer le renvoi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
