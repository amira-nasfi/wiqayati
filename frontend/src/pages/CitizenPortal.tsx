import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Heart,
  Activity,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';

export const CitizenPortal: React.FC = () => {
  const [profil, setProfil] = useState<any | null>(null);
  const [planActif, setPlanActif] = useState<any | null>(null);
  const [historique, setHistorique] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  // Auto-évaluation
  const [modeAutoEval, setModeAutoEval] = useState(false);
  const [evalSoumise, setEvalSoumise] = useState<any | null>(null);
  const [donnees, setDonnees] = useState({
    age: 40,
    genre: 'M',
    imc: 24.5,
    tour_taille_cm: 82,
    antecedents_familiaux_diabete: false,
    hypertension_diagnostiquee: false,
    niveau_activite_physique: 'MODERE',
    qualite_alimentation: 'BONNE',
    statut_tabagisme: 'JAMAIS',
    glycemie_jeun_connue: false,
    diabete_gestationnel_antecedent: false,
    medicaments_corticoides: false,
    acanthosis_nigricans: false,
  });

  const chargerDonneesCitoyen = async () => {
    setChargement(true);
    try {
      const [pResp, planResp, histResp, notifResp] = await Promise.all([
        api.get('/citoyen/moi/'),
        api.get('/citoyen/moi/plan-actif/'),
        api.get('/citoyen/moi/historique-risques/'),
        api.get('/citoyen/notifications/').catch(() => ({ data: [] })),
      ]);
      setProfil(pResp.data);
      setPlanActif(planResp.data);
      setHistorique(histResp.data);
      setNotifications(notifResp.data.results || notifResp.data || []);
    } catch (err) {
      console.error("Erreur chargement dossier citoyen", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesCitoyen();
  }, []);

  const handleAutoEval = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await api.post('/citoyen/auto-evaluation/', {
        donnees: {
          ...donnees,
          age: Number(donnees.age),
          imc: Number(donnees.imc),
          tour_taille_cm: Number(donnees.tour_taille_cm),
        },
      });
      setEvalSoumise(resp.data);
      chargerDonneesCitoyen();
    } catch {
      alert("Erreur lors de l'enregistrement de l'auto-évaluation.");
    }
  };

  if (chargement) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <div>Chargement de votre dossier personnel de santé...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* Profil Citoyen */}
      <div className="card" style={{
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
        borderColor: '#bfdbfe'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Espace Citoyen Wiqayati
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f2c59' }}>
              Bonjour, {profil?.prenom} {profil?.nom}
            </h1>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
              INS : <strong>{profil?.ins}</strong> • Gouvernorat : {profil?.gouvernorat}
            </div>
          </div>
          <button
            onClick={() => setModeAutoEval(!modeAutoEval)}
            className="btn btn-primary"
          >
            <Activity size={18} />
            <span>{modeAutoEval ? "Fermer l'évaluation" : "Nouvelle auto-évaluation"}</span>
          </button>
        </div>
      </div>

      {/* Formulaire d'auto-évaluation si ouvert */}
      {modeAutoEval && (
        <div className="card" style={{ marginBottom: '2rem', border: '2px solid #2563eb' }}>
          <div className="card-header">
            <div className="card-title">Auto-évaluation rapide de votre risque</div>
          </div>

          {evalSoumise ? (
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <span className={`badge-risk ${evalSoumise.evaluation.niveau_risque}`} style={{ fontSize: '1.1rem', padding: '0.5rem 1.25rem' }}>
                  {evalSoumise.evaluation.niveau_risque_libelle} (Score: {evalSoumise.evaluation.score}/100)
                </span>
              </div>
              <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
                {evalSoumise.message}
              </p>
              <button onClick={() => setEvalSoumise(null)} className="btn btn-secondary">
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleAutoEval}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Âge</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={donnees.age}
                    onChange={(e) => setDonnees({ ...donnees, age: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">IMC (kg/m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="form-control"
                    value={donnees.imc}
                    onChange={(e) => setDonnees({ ...donnees, imc: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tour de taille (cm)</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={donnees.tour_taille_cm}
                    onChange={(e) => setDonnees({ ...donnees, tour_taille_cm: Number(e.target.value) })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                Calculer mon risque
              </button>
            </form>
          )}
        </div>
      )}

      {/* Plan de Soin Actif Validé */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Heart size={20} color="#10b981" />
            <span>Mon Plan Personnalisé de Nutrition & Activité</span>
          </div>
        </div>

        {planActif?.a_un_plan_valide ? (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              background: '#ecfdf5',
              color: '#065f46',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '1.25rem'
            }}>
              <CheckCircle size={15} />
              Validé par un nutritionniste le {new Date(planActif.valide_le).toLocaleDateString('fr-FR')}
            </div>

            {/* Nutrition */}
            <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.5rem' }}>
                🥗 {planActif.plan_nutrition?.titre}
              </h3>
              {planActif.plan_nutrition?.objectifs && (
                <ul style={{ paddingLeft: '1.25rem', color: '#475569', fontSize: '0.92rem' }}>
                  {planActif.plan_nutrition.objectifs.map((obj: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.35rem' }}>{obj}</li>
                  ))}
                </ul>
              )}
              {planActif.plan_nutrition?.conseils_specifiques && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: '#0d9488', fontWeight: 600 }}>
                  Conseil : {planActif.plan_nutrition.conseils_specifiques}
                </div>
              )}
            </div>

            {/* Activité */}
            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.5rem' }}>
                🏃‍♂️ {planActif.plan_activite?.titre}
              </h3>
              {planActif.plan_activite?.objectifs && (
                <ul style={{ paddingLeft: '1.25rem', color: '#475569', fontSize: '0.92rem' }}>
                  {planActif.plan_activite.objectifs.map((obj: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.35rem' }}>{obj}</li>
                  ))}
                </ul>
              )}
            </div>

            {planActif.notes_nutritionniste && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#eff6ff', borderRadius: '10px', color: '#1e40af', fontSize: '0.9rem' }}>
                <strong>Message de votre nutritionniste :</strong> {planActif.notes_nutritionniste}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
            <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {planActif?.message || "Aucun plan de soin validé pour l'instant."}
            </div>
            <p style={{ fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto' }}>
              Dès qu'un professionnel de santé aura examiné votre bilan et validé vos recommandations personnalisées, votre plan s'affichera ici.
            </p>
          </div>
        )}
      </div>

      {/* Historique des évaluations */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Historique de mes bilans de dépistage</div>
        </div>
        {historique.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Aucune évaluation enregistrée.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {historique.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    Évaluation du {new Date(h.evalue_le).toLocaleDateString('fr-FR')}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Score global : {h.score} / 100
                  </div>
                </div>
                <span className={`badge-risk ${h.niveau_risque}`}>
                  {h.niveau_risque_libelle}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications citoyennes */}
      {notifications.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <div className="card-title">Mes Notifications</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map((n) => (
              <div key={n.id} style={{ padding: '0.85rem 1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>{n.type_libelle}</div>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem' }}>{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
