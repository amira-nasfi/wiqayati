import React, { useState } from 'react';
import api from '../api/client';
import {
  Search,
  UserPlus,
  Activity,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Loader2
} from 'lucide-react';

export const AgentPortal: React.FC = () => {
  // Recherche par INS
  const [insRecherche, setInsRecherche] = useState('');
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [messageRecherche, setMessageRecherche] = useState<string | null>(null);

  // État du patient actif
  const [patientActif, setPatientActif] = useState<any | null>(null);
  const [historiqueScreenings, setHistoriqueScreenings] = useState<any[]>([]);
  const [estNouveauPatient, setEstNouveauPatient] = useState(false);

  // Formulaire de création de patient si non trouvé
  const [nouveauPatient, setNouveauPatient] = useState({
    prenom: '',
    nom: '',
    date_naissance: '1980-01-01',
    genre: 'M',
    gouvernorat: 'Tunis',
    telephone: '',
  });

  // Formulaire de screening (14 champs)
  const [donneesScreening, setDonneesScreening] = useState({
    age: 45,
    genre: 'M',
    imc: 26.5,
    tour_taille_cm: 88,
    antecedents_familiaux_diabete: false,
    hypertension_diagnostiquee: false,
    niveau_activite_physique: 'MODERE',
    qualite_alimentation: 'MOYENNE',
    statut_tabagisme: 'JAMAIS',
    glycemie_jeun_connue: false,
    glycemie_jeun_mmol: '',
    diabete_gestationnel_antecedent: false,
    medicaments_corticoides: false,
    acanthosis_nigricans: false,
  });

  const [soumissionEnCours, setSoumissionEnCours] = useState(false);
  const [resultatImmediat, setResultatImmediat] = useState<any | null>(null);
  const [erreurSoumission, setErreurSoumission] = useState<string | null>(null);

  // Recherche d'un patient par INS
  const handleRecherche = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ins = insRecherche.trim().toUpperCase();
    if (!ins) return;

    setChargementRecherche(true);
    setMessageRecherche(null);
    setResultatImmediat(null);

    try {
      const resp = await api.get(`/patients/recherche/?ins=${ins}`);
      if (resp.data.trouve) {
        setPatientActif(resp.data.patient);
        setHistoriqueScreenings(resp.data.historique_screenings || []);
        setEstNouveauPatient(false);
        // Synchroniser le genre et l'âge approximatif
        setDonneesScreening((prev) => ({
          ...prev,
          genre: resp.data.patient.genre,
        }));
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setPatientActif(null);
        setHistoriqueScreenings([]);
        setEstNouveauPatient(true);
        setMessageRecherche("Aucun dossier existant avec cet INS. Veuillez renseigner l'état civil ci-dessous.");
      } else {
        setMessageRecherche("Erreur lors de la recherche. Veuillez vérifier votre connexion.");
      }
    } finally {
      setChargementRecherche(false);
    }
  };

  // Création du patient si absent
  const handleCreerPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const ins = insRecherche.trim().toUpperCase();
    try {
      const resp = await api.post('/patients/', {
        ...nouveauPatient,
        ins,
      });
      setPatientActif(resp.data);
      setEstNouveauPatient(false);
      setMessageRecherche("Fiche patient créée avec succès dans le système national.");
    } catch (err: any) {
      setMessageRecherche(err.response?.data?.erreur || "Impossible de créer la fiche patient.");
    }
  };

  // Soumission du dépistage complet
  const handleSoumissionScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientActif) return;

    setSoumissionEnCours(true);
    setErreurSoumission(null);

    try {
      const payload = {
        ins_patient: patientActif.ins,
        version_questionnaire: '1.0',
        donnees: {
          ...donneesScreening,
          age: Number(donneesScreening.age),
          imc: Number(donneesScreening.imc),
          tour_taille_cm: Number(donneesScreening.tour_taille_cm),
          glycemie_jeun_mmol: donneesScreening.glycemie_jeun_mmol ? Number(donneesScreening.glycemie_jeun_mmol) : null,
        },
      };

      const resp = await api.post('/screening/soumissions/', payload);
      setResultatImmediat(resp.data);
      // Rafraîchir l'historique
      handleRecherche();
    } catch (err: any) {
      setErreurSoumission(err.response?.data?.erreur || "Erreur lors du calcul du risque.");
    } finally {
      setSoumissionEnCours(false);
    }
  };

  const reinitialiserPourNouveau = () => {
    setInsRecherche('');
    setPatientActif(null);
    setHistoriqueScreenings([]);
    setEstNouveauPatient(false);
    setResultatImmediat(null);
    setMessageRecherche(null);
  };

  return (
    <div className="centered-container" style={{ padding: '1rem 0 3rem' }}>
      {/* En-tête centré */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.4rem' }}>
          Formulaire National de Dépistage
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Identifiant pivot : <strong>INS (Identifiant National de Santé)</strong> — Enregistrement centralisé sans duplication
        </p>
      </div>

      {/* Étape 1 : Recherche patient par INS */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={20} color="#2563eb" />
            <span>1. Identification du Patient par INS</span>
          </div>
          {patientActif && (
            <button onClick={reinitialiserPourNouveau} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              <RotateCcw size={14} />
              <span>Changer de patient</span>
            </button>
          )}
        </div>

        <form onSubmit={handleRecherche} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Saisir l'INS (ex: TUN10002001, 8-15 caractères)"
            value={insRecherche}
            onChange={(e) => setInsRecherche(e.target.value)}
            disabled={chargementRecherche}
            style={{ fontWeight: 700, letterSpacing: '0.05em' }}
          />
          <button type="submit" className="btn btn-primary" disabled={chargementRecherche}>
            {chargementRecherche ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            <span>Rechercher</span>
          </button>
        </form>

        {messageRecherche && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: estNouveauPatient ? '#fffbeb' : '#ecfdf5',
            color: estNouveauPatient ? '#92400e' : '#065f46',
            fontSize: '0.9rem',
            border: `1px solid ${estNouveauPatient ? '#fde68a' : '#a7f3d0'}`
          }}>
            {messageRecherche}
          </div>
        )}

        {/* Formulaire de création si patient non trouvé */}
        {estNouveauPatient && (
          <form onSubmit={handleCreerPatient} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: '#0f2c59' }}>
              Créer la fiche centrale du patient (INS : {insRecherche.toUpperCase()})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={nouveauPatient.prenom}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, prenom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={nouveauPatient.nom}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, nom: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Date de naissance</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={nouveauPatient.date_naissance}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, date_naissance: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Genre</label>
                <select
                  className="form-control"
                  value={nouveauPatient.genre}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, genre: e.target.value })}
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gouvernorat</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={nouveauPatient.gouvernorat}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, gouvernorat: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
              <UserPlus size={18} />
              <span>Enregistrer le patient et poursuivre le dépistage</span>
            </button>
          </form>
        )}
      </div>

      {/* Patient identifié : Récapitulatif et historique */}
      {patientActif && (
        <div className="card" style={{ marginBottom: '1.75rem', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <CheckCircle size={18} color="#16a34a" />
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534' }}>
                  {patientActif.prenom} {patientActif.nom}
                </span>
                <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: '#dcfce7', borderRadius: '4px', fontWeight: 700, color: '#15803d' }}>
                  INS: {patientActif.ins}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                Gouvernorat : <strong>{patientActif.gouvernorat}</strong> • Né(e) le : {patientActif.date_naissance} • Genre : {patientActif.genre === 'M' ? 'Masculin' : 'Féminin'}
              </div>
            </div>

            {historiqueScreenings.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#166534' }}>
                <strong>{historiqueScreenings.length}</strong> dépistage(s) antérieur(s)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Étape 2 : Formulaire de screening des 14 facteurs */}
      {patientActif && !resultatImmediat && (
        <form onSubmit={handleSoumissionScreening}>
          <div className="card" style={{ marginBottom: '1.75rem' }}>
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} color="#2563eb" />
                <span>2. Évaluation des 14 Facteurs de Risque</span>
              </div>
            </div>

            {/* Facteurs biométriques */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Âge (années)</label>
                <input
                  type="number"
                  min="18"
                  max="120"
                  required
                  className="form-control"
                  value={donneesScreening.age}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, age: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Indice de Masse Corporelle (IMC)</label>
                <input
                  type="number"
                  step="0.1"
                  min="10"
                  max="80"
                  required
                  className="form-control"
                  value={donneesScreening.imc}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, imc: Number(e.target.value) })}
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
                  value={donneesScreening.tour_taille_cm}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, tour_taille_cm: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Facteurs comportementaux */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Activité physique</label>
                <select
                  className="form-control"
                  value={donneesScreening.niveau_activite_physique}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, niveau_activite_physique: e.target.value })}
                >
                  <option value="FAIBLE">Faible (sédentaire)</option>
                  <option value="MODERE">Modérée (30-150 min/sem)</option>
                  <option value="ELEVE">Élevée (&gt;150 min/sem)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Qualité de l'alimentation</label>
                <select
                  className="form-control"
                  value={donneesScreening.qualite_alimentation}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, qualite_alimentation: e.target.value })}
                >
                  <option value="BONNE">Équilibrée</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="MAUVAISE">Déséquilibrée (sucres, fritures)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Statut tabagique</label>
                <select
                  className="form-control"
                  value={donneesScreening.statut_tabagisme}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, statut_tabagisme: e.target.value })}
                >
                  <option value="JAMAIS">Jamais fumé</option>
                  <option value="EX_FUMEUR">Ancien fumeur</option>
                  <option value="FUMEUR_ACTUEL">Fumeur actuel</option>
                </select>
              </div>
            </div>

            {/* Antécédents médicaux et familiaux */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={donneesScreening.antecedents_familiaux_diabete}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, antecedents_familiaux_diabete: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Antécédent familial de diabète (1er degré)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={donneesScreening.hypertension_diagnostiquee}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, hypertension_diagnostiquee: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Hypertension artérielle diagnostiquée</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={donneesScreening.acanthosis_nigricans}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, acanthosis_nigricans: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Signe Acanthosis nigricans (cou/aisselles)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={donneesScreening.diabete_gestationnel_antecedent}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, diabete_gestationnel_antecedent: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Antécédent de diabète gestationnel (femmes)</span>
              </label>
            </div>

            {erreurSoumission && (
              <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {erreurSoumission}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={soumissionEnCours}
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', borderRadius: '12px' }}
            >
              {soumissionEnCours ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Calcul immédiat du risque...</span>
                </>
              ) : (
                <>
                  <span>Soumettre le dépistage et calculer le risque</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Étape 3 : Résultat immédiat calculé (T10.3) */}
      {resultatImmediat && (
        <div className="card" style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          border: '2px solid #2563eb',
          boxShadow: '0 12px 30px rgba(37, 99, 235, 0.15)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <span className={`badge-risk ${resultatImmediat.evaluation_risque.niveau_risque}`} style={{ fontSize: '1.25rem', padding: '0.6rem 1.5rem' }}>
              NIVEAU DE RISQUE : {resultatImmediat.evaluation_risque.niveau_risque_libelle}
            </span>
          </div>

          <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.25rem' }}>
            {resultatImmediat.evaluation_risque.score} <span style={{ fontSize: '1.5rem', color: '#64748b' }}>/ 100</span>
          </div>

          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1.75rem' }}>
            Score de risque calculé par le moteur {resultatImmediat.evaluation_risque.version_moteur}
          </p>

          {/* Facteurs contributifs */}
          {resultatImmediat.evaluation_risque.facteurs?.length > 0 && (
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '2rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
                Facteurs contributifs identifiés :
              </div>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {resultatImmediat.evaluation_risque.facteurs.map((f: any, idx: number) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
                    <AlertTriangle size={15} color="#f59e0b" />
                    <span>{f.libelle}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{
            padding: '1rem',
            background: '#eff6ff',
            borderRadius: '10px',
            color: '#1e40af',
            fontWeight: 600,
            marginBottom: '2rem'
          }}>
            ✓ {resultatImmediat.message_succes} (Priorité assignée : {resultatImmediat.priorite_tache})
          </div>

          <button
            onClick={reinitialiserPourNouveau}
            className="btn btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', margin: '0 auto' }}
          >
            <span>Dépister un nouveau patient</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
