import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Heart,
  Activity,
  CheckCircle,
  Clock,
  Loader2,
  Brain,
  Stethoscope,
  Salad,
  Dumbbell,
  Lock,
  FileText
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
    taille_cm: 170,
    poids_kg: 70,
    imc: 24.2,
    tour_taille_cm: 82,
    sbp: '',
    prise_antihypertenseur: false,
    antecedents_familiaux_diabete: false,
    hypertension_diagnostiquee: false,
    niveau_activite_physique: 'MODERE',
    qualite_alimentation: 'BONNE',
    statut_tabagisme: 'JAMAIS',
    glycemie_jeun_connue: false,
    glycemie_jeun_mmol: '',
    diabete_gestationnel_antecedent: false,
    medicaments_corticoides: false,
    acanthosis_nigricans: false,
    high_glucose_hist: false,
  });

  // Recalcul auto IMC
  const handleChangementTaillePoids = (champ: 'taille_cm' | 'poids_kg', val: number) => {
    setDonnees((prev) => {
      const nouveau = { ...prev, [champ]: val };
      const t = champ === 'taille_cm' ? val : prev.taille_cm;
      const p = champ === 'poids_kg' ? val : prev.poids_kg;
      if (t > 50 && p > 20) {
        nouveau.imc = Number((p / ((t / 100) ** 2)).toFixed(1));
      }
      return nouveau;
    });
  };

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
          taille_cm: Number(donnees.taille_cm),
          poids_kg: Number(donnees.poids_kg),
          imc: Number(donnees.imc),
          tour_taille_cm: Number(donnees.tour_taille_cm),
          sbp: donnees.sbp ? Number(donnees.sbp) : null,
          prise_antihypertenseur: Boolean(donnees.prise_antihypertenseur),
          high_glucose_hist: Boolean(donnees.high_glucose_hist),
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
            <div className="card-title">Auto-évaluation complète de votre risque métabolique</div>
          </div>

          {evalSoumise ? (
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              {/* Statut de validation médicale */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: evalSoumise.plan_soin?.statut === 'ACTIF' ? '#ecfdf5' : '#fef3c7',
                border: `1px solid ${evalSoumise.plan_soin?.statut === 'ACTIF' ? '#10b981' : '#f59e0b'}`,
                borderRadius: '12px',
                padding: '0.9rem 1.2rem',
                marginBottom: '1.5rem',
                textAlign: 'left',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {evalSoumise.plan_soin?.statut === 'ACTIF' ? (
                    <CheckCircle size={24} color="#059669" />
                  ) : (
                    <Clock size={24} color="#d97706" />
                  )}
                  <div>
                    <div style={{
                      fontWeight: 800,
                      color: evalSoumise.plan_soin?.statut === 'ACTIF' ? '#065f46' : '#92400e',
                      fontSize: '0.95rem'
                    }}>
                      {evalSoumise.plan_soin?.statut === 'ACTIF'
                        ? "RAPPORT VÉRIFIÉ ET CERTIFIÉ PAR VOTRE NUTRITIONNISTE"
                        : "RAPPORT INITIAL GÉNÉRÉ PAR L'IA — EN ATTENTE DE VÉRIFICATION"}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: evalSoumise.plan_soin?.statut === 'ACTIF' ? '#047857' : '#b45309' }}>
                      <Lock size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'text-bottom' }} />
                      Vous consultez ce rapport en lecture seule. Seul votre nutritionniste référent peut valider et certifier vos recommandations.
                    </div>
                  </div>
                </div>
                <span style={{
                  background: evalSoumise.plan_soin?.statut === 'ACTIF' ? '#059669' : '#d97706',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px'
                }}>
                  {evalSoumise.plan_soin?.statut === 'ACTIF' ? "✓ Validé" : "⏳ Brouillon IA"}
                </span>
              </div>

              {/* Badge de Risque et Score */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span className={`badge-risk ${evalSoumise.evaluation.niveau_risque}`} style={{ fontSize: '1.2rem', padding: '0.5rem 1.5rem' }}>
                  {evalSoumise.evaluation.niveau_risque_libelle}
                </span>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f2c59', marginTop: '0.5rem' }}>
                  {evalSoumise.evaluation.score} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>/ 100</span>
                </div>
              </div>

              {/* Analyse IA (FINDRISC + Détection) */}
              {evalSoumise.ml_supplement && (
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  color: '#f8fafc',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  border: '1px solid #334155'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Brain size={20} color="#38bdf8" />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                      Analyse Clinique & Modèle IA
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    {evalSoumise.ml_supplement.risque_10_ans_pct != null && (
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Risque à 10 ans (FINDRISC)</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: evalSoumise.ml_supplement.risque_10_ans_pct >= 25 ? '#f87171' : '#4ade80' }}>
                          {evalSoumise.ml_supplement.risque_10_ans_pct}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                          Score: {evalSoumise.ml_supplement.findrisc_score}/26
                        </div>
                      </div>
                    )}

                    {evalSoumise.ml_supplement.probabilite_dysglycemie != null && (
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Détection dysglycémie actuelle</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: evalSoumise.ml_supplement.dysglycemie_detectee ? '#f87171' : '#4ade80' }}>
                          {Math.round(evalSoumise.ml_supplement.probabilite_dysglycemie * 100)}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                          Modèle calibré NHANES
                        </div>
                      </div>
                    )}
                  </div>

                  {evalSoumise.ml_supplement.requires_medical_referral && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      marginTop: '1rem'
                    }}>
                      <Stethoscope size={20} color="#fca5a5" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.9rem' }}>
                          Consultation médicale recommandée
                        </div>
                        {evalSoumise.ml_supplement.orientation_medicale?.reason && (
                          <div style={{ fontSize: '0.82rem', color: '#fecaca', marginTop: '0.15rem' }}>
                            {evalSoumise.ml_supplement.orientation_medicale.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Plan Recommandé Complet */}
              {evalSoumise.plan_soin && (
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  border: '1.5px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <FileText size={20} color="#2563eb" />
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f2c59' }}>
                      Recommandations de votre Plan de Prévention
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {evalSoumise.plan_soin.plan_nutrition && (
                      <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          <Salad size={18} color="#16a34a" />
                          <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                            {evalSoumise.plan_soin.plan_nutrition.titre || "Nutrition"}
                          </span>
                        </div>
                        {evalSoumise.plan_soin.plan_nutrition.objectifs?.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#14532d', fontSize: '0.85rem', lineHeight: '1.4' }}>
                            {evalSoumise.plan_soin.plan_nutrition.objectifs.map((obj: string, i: number) => (
                              <li key={i} style={{ marginBottom: '0.3rem' }}>{obj}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {evalSoumise.plan_soin.plan_activite && (
                      <div style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          <Dumbbell size={18} color="#2563eb" />
                          <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>
                            {evalSoumise.plan_soin.plan_activite.titre || "Activité Physique"}
                          </span>
                        </div>
                        {evalSoumise.plan_soin.plan_activite.objectifs?.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#1e3a8a', fontSize: '0.85rem', lineHeight: '1.4' }}>
                            {evalSoumise.plan_soin.plan_activite.objectifs.map((act: string, i: number) => (
                              <li key={i} style={{ marginBottom: '0.3rem' }}>{act}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button onClick={() => setEvalSoumise(null)} className="btn btn-secondary" style={{ padding: '0.65rem 2rem' }}>
                Fermer le rapport
              </button>
            </div>
          ) : (
            <form onSubmit={handleAutoEval} style={{ padding: '1.25rem' }}>
              {/* Facteurs biométriques */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Âge</label>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    required
                    className="form-control"
                    value={donnees.age}
                    onChange={(e) => setDonnees({ ...donnees, age: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Taille (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="230"
                    required
                    className="form-control"
                    value={donnees.taille_cm}
                    onChange={(e) => handleChangementTaillePoids('taille_cm', Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Poids (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="30"
                    max="250"
                    required
                    className="form-control"
                    value={donnees.poids_kg}
                    onChange={(e) => handleChangementTaillePoids('poids_kg', Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    IMC (kg/m²)
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', marginLeft: '0.3rem' }}>
                      (calculé)
                    </span>
                  </label>
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
                    step="0.5"
                    min="40"
                    max="200"
                    required
                    className="form-control"
                    value={donnees.tour_taille_cm}
                    onChange={(e) => setDonnees({ ...donnees, tour_taille_cm: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Tension systolique (mmHg)
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.3rem' }}>
                      (optionnelle)
                    </span>
                  </label>
                  <input
                    type="number"
                    placeholder="ex: 120"
                    className="form-control"
                    value={donnees.sbp}
                    onChange={(e) => setDonnees({ ...donnees, sbp: e.target.value })}
                  />
                </div>
              </div>

              {/* Mode de vie */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Activité physique quotidienne</label>
                  <select
                    className="form-control"
                    value={donnees.niveau_activite_physique}
                    onChange={(e) => setDonnees({ ...donnees, niveau_activite_physique: e.target.value })}
                  >
                    <option value="FAIBLE">Faible / Sédentaire (&lt; 30 min/j)</option>
                    <option value="MODERE">Modérée (≥ 30 min la plupart des jours)</option>
                    <option value="ELEVE">Élevée (&gt; 150 min intenses/semaine)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Alimentation</label>
                  <select
                    className="form-control"
                    value={donnees.qualite_alimentation}
                    onChange={(e) => setDonnees({ ...donnees, qualite_alimentation: e.target.value })}
                  >
                    <option value="BONNE">Équilibrée (légumes/fruits quotidiens)</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="MAUVAISE">Déséquilibrée (sucres, fritures fréquents)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tabagisme</label>
                  <select
                    className="form-control"
                    value={donnees.statut_tabagisme}
                    onChange={(e) => setDonnees({ ...donnees, statut_tabagisme: e.target.value })}
                  >
                    <option value="JAMAIS">Jamais fumé</option>
                    <option value="EX_FUMEUR">Ancien fumeur</option>
                    <option value="FUMEUR_ACTUEL">Fumeur actuel</option>
                  </select>
                </div>
              </div>

              {/* Antécédents */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={donnees.antecedents_familiaux_diabete}
                    onChange={(e) => setDonnees({ ...donnees, antecedents_familiaux_diabete: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Antécédent familial de diabète</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={donnees.hypertension_diagnostiquee}
                    onChange={(e) => setDonnees({ ...donnees, hypertension_diagnostiquee: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hypertension artérielle</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={donnees.prise_antihypertenseur}
                    onChange={(e) => setDonnees({ ...donnees, prise_antihypertenseur: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Traitement antihypertenseur en cours</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={donnees.high_glucose_hist}
                    onChange={(e) => setDonnees({ ...donnees, high_glucose_hist: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Antécédent de glycémie élevée / prédiabète</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', borderRadius: '10px' }}>
                Calculer mon risque et générer mon plan
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Salad size={20} color="#16a34a" />
                <span>{planActif.plan_nutrition?.titre}</span>
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} color="#0284c7" />
                <span>{planActif.plan_activite?.titre}</span>
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

            {/* Mon risque à 10 ans & Simulation */}
            {planActif.future_risk && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                border: '1.5px solid #bbf7d0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Brain size={20} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>
                    Mon risque à 10 ans
                  </h3>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'baseline', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f2c59' }}>
                    Environ {planActif.future_risk.ten_year_risk_pct ?? '—'} % sur 10 ans
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: '#dcfce7',
                    color: '#15803d',
                    textTransform: 'uppercase'
                  }}>
                    Niveau : {planActif.future_risk.findrisc_band || 'Évalué'}
                  </span>
                </div>

                {/* Caveat OBLIGATOIRE dès que le pourcentage est affiché */}
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.85rem' }}>
                  Basé sur la cohorte finlandaise — estimation non calibrée pour la Tunisie.
                </div>

                {/* Simulation de prévention */}
                {planActif.future_risk.simulation?.if_both && (
                  <div style={{
                    background: '#ffffff',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    lineHeight: '1.5'
                  }}>
                    <strong style={{ color: '#0284c7' }}>Impact de vos efforts :</strong> Si vous perdez 7 % de votre poids et marchez 30 min/jour, votre risque descend à <strong>{planActif.future_risk.simulation.if_both.ten_year_risk_pct} %</strong> (baisse absolue de {planActif.future_risk.simulation.absolute_risk_drop_both ?? 0} points).
                  </div>
                )}
              </div>
            )}

            {/* Avertissement de bien-être / Disclaimer réglementaire obligatoire */}
            {planActif.disclaimer && (
              <div style={{
                marginTop: '1.5rem',
                padding: '0.85rem 1rem',
                background: '#f8fafc',
                borderLeft: '4px solid #94a3b8',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#64748b',
                lineHeight: '1.5'
              }}>
                <p style={{ margin: 0 }}>{planActif.disclaimer.text}</p>
                {planActif.disclaimer.text_ar && (
                  <p style={{ margin: '0.35rem 0 0 0', direction: 'rtl', textAlign: 'right' }}>
                    {planActif.disclaimer.text_ar}
                  </p>
                )}
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
