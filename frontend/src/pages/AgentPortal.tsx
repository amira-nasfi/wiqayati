import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  UserPlus,
  Activity,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Loader2,
  Brain,
  Stethoscope,
  Clock,
  Salad,
  Dumbbell,
  FileText,
  Lock,
  Building2,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

export const AgentPortal: React.FC = () => {
  const { utilisateur } = useAuth();

  // Recherche par CIN + Date de naissance (ou INS si disponible)
  const [cinRecherche, setCinRecherche] = useState('');
  const [dateNaissanceRecherche, setDateNaissanceRecherche] = useState('');
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

  // Formulaire de screening complet (paramètres du modèle ML et FINDRISC)
  const [donneesScreening, setDonneesScreening] = useState({
    age: 45,
    genre: 'M',
    taille_cm: 170,
    poids_kg: 76.5,
    imc: 26.5,
    tour_taille_cm: 88,
    sbp: '',
    hypertension_diagnostiquee: false,
    prise_antihypertenseur: false,
    antecedents_familiaux_diabete: false,
    niveau_activite_physique: 'MODERE',
    qualite_alimentation: 'MOYENNE',
    statut_tabagisme: 'JAMAIS',
    glycemie_jeun_connue: false,
    glycemie_jeun_mmol: '',
    diabete_gestationnel_antecedent: false,
    medicaments_corticoides: false,
    acanthosis_nigricans: false,
    high_glucose_hist: false,
  });

  const [soumissionEnCours, setSoumissionEnCours] = useState(false);
  const [resultatImmediat, setResultatImmediat] = useState<any | null>(null);
  const [erreurSoumission, setErreurSoumission] = useState<string | null>(null);

  // Recherche d'un patient par CIN + Date de naissance (ou INS)
  const handleRecherche = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cin = cinRecherche.trim();
    const dn = dateNaissanceRecherche.trim();
    const ins = insRecherche.trim().toUpperCase();

    if (!cin && !ins) {
      setMessageRecherche("Veuillez saisir le numéro CIN (et la date de naissance) ou directement l'INS.");
      return;
    }

    setChargementRecherche(true);
    setMessageRecherche(null);
    setResultatImmediat(null);

    try {
      let url = '/patients/recherche/?';
      if (cin) {
        url += `cin=${encodeURIComponent(cin)}`;
        if (dn) url += `&date_naissance=${encodeURIComponent(dn)}`;
      } else {
        url += `ins=${ins}`;
      }
      const resp = await api.get(url);
      if (resp.data.trouve) {
        setPatientActif(resp.data.patient);
        setHistoriqueScreenings(resp.data.historique_screenings || []);
        setEstNouveauPatient(false);
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
        setMessageRecherche("Aucun dossier trouvé avec ces identifiants. Renseignez l'état civil ci-dessous pour créer la fiche.");
      } else {
        setMessageRecherche("Erreur lors de la recherche. Veuillez vérifier votre connexion.");
      }
    } finally {
      setChargementRecherche(false);
    }
  };

  // Création du patient si absent — génération automatique de l'INS
  const handleCreerPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await api.post('/patients/', {
        ...nouveauPatient,
        cin: cinRecherche.trim() || undefined,
        // INS sera généré automatiquement par le backend si non fourni
      });
      setPatientActif(resp.data);
      setEstNouveauPatient(false);
      setMessageRecherche(`Fiche créée — INS attribué : ${resp.data.ins}`);
    } catch (err: any) {
      setMessageRecherche(err.response?.data?.erreur || "Impossible de créer la fiche patient.");
    }
  };

  // Recalcul automatique de l'IMC lors du changement de taille/poids
  const handleChangementTaillePoids = (champ: 'taille_cm' | 'poids_kg', val: number) => {
    setDonneesScreening((prev) => {
      const nouveau = { ...prev, [champ]: val };
      const t = champ === 'taille_cm' ? val : prev.taille_cm;
      const p = champ === 'poids_kg' ? val : prev.poids_kg;
      if (t > 50 && p > 20) {
        const calImc = Number((p / ((t / 100) ** 2)).toFixed(1));
        nouveau.imc = calImc;
      }
      return nouveau;
    });
  };

  const rafraichirHistorique = async (ins: string) => {
    try {
      const resp = await api.get(`/patients/recherche/?ins=${ins}`);
      if (resp.data.trouve) {
        setHistoriqueScreenings(resp.data.historique_screenings || []);
      }
    } catch {
      // Ignorer silencieusement si l'historique ne peut pas être rechargé
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
          taille_cm: Number(donneesScreening.taille_cm),
          poids_kg: Number(donneesScreening.poids_kg),
          imc: Number(donneesScreening.imc),
          tour_taille_cm: Number(donneesScreening.tour_taille_cm),
          sbp: donneesScreening.sbp ? Number(donneesScreening.sbp) : null,
          prise_antihypertenseur: Boolean(donneesScreening.prise_antihypertenseur),
          glycemie_jeun_mmol: donneesScreening.glycemie_jeun_mmol ? Number(donneesScreening.glycemie_jeun_mmol) : null,
          high_glucose_hist: Boolean(donneesScreening.high_glucose_hist),
        },
      };

      const resp = await api.post('/screening/soumissions/', payload);
      setResultatImmediat(resp.data);
      rafraichirHistorique(patientActif.ins);
      // Remonter en haut pour afficher le rapport et le score immédiatement
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErreurSoumission(err.response?.data?.erreur || "Erreur lors du calcul du risque.");
    } finally {
      setSoumissionEnCours(false);
    }
  };

  const reinitialiserPourNouveau = () => {
    setCinRecherche('');
    setDateNaissanceRecherche('');
    setInsRecherche('');
    setPatientActif(null);
    setHistoriqueScreenings([]);
    setEstNouveauPatient(false);
    setResultatImmediat(null);
    setMessageRecherche(null);
  };

  // Bandeau identité structure
  const renderBandeauStructure = () => {
    if (!utilisateur || !utilisateur.structure_nom) return null;
    const estCampagne = utilisateur.role === 'AGENT_CAMPAGNE';
    return (
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        background: estCampagne ? 'linear-gradient(135deg, #1e3a5f 0%, #134b65 100%)' : 'linear-gradient(135deg, #0f2c59 0%, #1d4ed8 100%)',
        color: '#FFFFFF',
        display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 200px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
              {estCampagne ? '🚐 Campagne Mobile' : '🏥 Centre de Santé de Base'}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{utilisateur.structure_nom}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', flex: '2 1 400px' }}>
          {utilisateur.structure_localisation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', opacity: 0.9 }}>
              <MapPin size={14} />
              <span>{utilisateur.structure_localisation}</span>
            </div>
          )}
          {utilisateur.structure_code && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', opacity: 0.9 }}>
              <ShieldCheck size={14} />
              <span>Code : <strong>{utilisateur.structure_code}</strong></span>
            </div>
          )}
          {utilisateur.responsable_structure && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', opacity: 0.9 }}>
              <Stethoscope size={14} />
              <span>{utilisateur.responsable_structure}</span>
            </div>
          )}
          {utilisateur.campagne_date_fin && estCampagne && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', opacity: 0.9 }}>
              <Calendar size={14} />
              <span>Jusqu'au {utilisateur.campagne_date_fin}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="centered-container" style={{ padding: '1rem 0 3rem' }}>
      {/* Bandeau structure / dispensaire */}
      {renderBandeauStructure()}

      {/* En-tête centré */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.4rem' }}>
          Formulaire National de Dépistage
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Identifiant pivot : <strong>CIN + Date de naissance</strong> — L'INS est affiché automatiquement si le dossier existe
        </p>
      </div>

      {/* Étape 1 : Recherche patient par CIN + Date de naissance */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={20} color="#2563eb" />
            <span>1. Identification du Patient (CIN + Date de naissance)</span>
          </div>
          {patientActif && (
            <button onClick={reinitialiserPourNouveau} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              <RotateCcw size={14} />
              <span>Changer de patient</span>
            </button>
          )}
        </div>

        <form onSubmit={handleRecherche} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CreditCard size={13} /> N° CIN (8 chiffres)
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="ex: 12345678"
              value={cinRecherche}
              onChange={(e) => setCinRecherche(e.target.value.replace(/\D/g, '').slice(0, 8))}
              disabled={chargementRecherche}
              maxLength={8}
              style={{ fontWeight: 700, letterSpacing: '0.08em' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Date de naissance
            </label>
            <input
              type="date"
              className="form-control"
              value={dateNaissanceRecherche}
              onChange={(e) => setDateNaissanceRecherche(e.target.value)}
              disabled={chargementRecherche}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={chargementRecherche} style={{ marginBottom: 0 }}>
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
              Créer la fiche centrale — Un INS sera généré automatiquement
            </h3>
            {cinRecherche && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>
                <CreditCard size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                CIN pré-rempli : <strong>{cinRecherche}</strong>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input type="text" required className="form-control"
                  value={nouveauPatient.prenom} onChange={(e) => setNouveauPatient({ ...nouveauPatient, prenom: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input type="text" required className="form-control"
                  value={nouveauPatient.nom} onChange={(e) => setNouveauPatient({ ...nouveauPatient, nom: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Date de naissance</label>
                <input type="date" required className="form-control"
                  value={nouveauPatient.date_naissance}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, date_naissance: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Genre</label>
                <select className="form-control" value={nouveauPatient.genre}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, genre: e.target.value })}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gouvernorat</label>
                <input type="text" required className="form-control"
                  value={nouveauPatient.gouvernorat}
                  onChange={(e) => setNouveauPatient({ ...nouveauPatient, gouvernorat: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
              <UserPlus size={18} />
              <span>Enregistrer le patient et poursuivre le dépistage</span>
            </button>
          </form>
        )}
      </div>

      {/* Patient identifié : Récapitulatif et historique — INS mis en évidence */}
      {patientActif && (
        <div className="card" style={{ marginBottom: '1.75rem', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                <CheckCircle size={18} color="#16a34a" />
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534' }}>
                  {patientActif.prenom} {patientActif.nom}
                </span>
                {patientActif.cin && (
                  <span style={{ fontSize: '0.78rem', padding: '2px 7px', background: '#dbeafe', borderRadius: '4px', fontWeight: 700, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CreditCard size={11} /> CIN : {patientActif.cin}
                  </span>
                )}
              </div>
              {/* INS mis en évidence comme identifiant pivot national */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#166534', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                <ShieldCheck size={13} />
                Identifiant National de Santé (INS) : {patientActif.ins}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#166534' }}>
                Gouvernorat : <strong>{patientActif.gouvernorat}</strong> • Né(e) le : {patientActif.date_naissance} • {patientActif.genre === 'M' ? 'Masculin' : 'Féminin'}
              </div>
            </div>

            {historiqueScreenings.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#166534', flexShrink: 0 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
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
                <label className="form-label">Taille (cm)</label>
                <input
                  type="number"
                  min="100"
                  max="230"
                  required
                  className="form-control"
                  value={donneesScreening.taille_cm}
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
                  value={donneesScreening.poids_kg}
                  onChange={(e) => handleChangementTaillePoids('poids_kg', Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  IMC (kg/m²)
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', marginLeft: '0.4rem' }}>
                    (calcul automatique)
                  </span>
                </label>
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

              <div className="form-group">
                <label className="form-label">
                  Tension systolique (mmHg)
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.4rem' }}>
                    (optionnelle)
                  </span>
                </label>
                <input
                  type="number"
                  min="70"
                  max="240"
                  placeholder="ex: 120"
                  className="form-control"
                  value={donneesScreening.sbp}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, sbp: e.target.value })}
                />
              </div>
            </div>

            {/* Facteurs comportementaux */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Activité physique quotidienne</label>
                <select
                  className="form-control"
                  value={donneesScreening.niveau_activite_physique}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, niveau_activite_physique: e.target.value })}
                >
                  <option value="FAIBLE">Faible / Sédentaire (&lt; 30 min/jour)</option>
                  <option value="MODERE">Modérée (≥ 30 min la plupart des jours)</option>
                  <option value="ELEVE">Élevée (&gt; 150 min intenses/semaine)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Qualité de l'alimentation</label>
                <select
                  className="form-control"
                  value={donneesScreening.qualite_alimentation}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, qualite_alimentation: e.target.value })}
                >
                  <option value="BONNE">Équilibrée (légumes/fruits quotidiens)</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="MAUVAISE">Déséquilibrée (sucres, fritures fréquents)</option>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
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
                  checked={donneesScreening.prise_antihypertenseur}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, prise_antihypertenseur: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Prise de médicaments antihypertenseurs</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={donneesScreening.high_glucose_hist}
                  onChange={(e) => setDonneesScreening({ ...donneesScreening, high_glucose_hist: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Antécédent de glycémie élevée / prédiabète</span>
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
          {/* Bannière de Statut et Droits Cliniques */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: resultatImmediat.plan_soin?.statut === 'ACTIF' ? '#ecfdf5' : '#fef3c7',
            border: `1px solid ${resultatImmediat.plan_soin?.statut === 'ACTIF' ? '#10b981' : '#f59e0b'}`,
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            textAlign: 'left',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {resultatImmediat.plan_soin?.statut === 'ACTIF' ? (
                <CheckCircle size={26} color="#059669" />
              ) : (
                <Clock size={26} color="#d97706" />
              )}
              <div>
                <div style={{
                  fontWeight: 800,
                  color: resultatImmediat.plan_soin?.statut === 'ACTIF' ? '#065f46' : '#92400e',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {resultatImmediat.plan_soin?.statut === 'ACTIF'
                    ? "RAPPORT VÉRIFIÉ ET CERTIFIÉ PAR LE NUTRITIONNISTE"
                    : "RAPPORT GÉNÉRÉ PAR L'IA — EN ATTENTE DE VÉRIFICATION"}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: resultatImmediat.plan_soin?.statut === 'ACTIF' ? '#047857' : '#b45309',
                  marginTop: '0.2rem'
                }}>
                  <Lock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  Ce rapport est accessible en consultation à tous. Seul le <strong>nutritionniste référent</strong> est habilité à vérifier, ajuster et valider ce plan.
                </div>
              </div>
            </div>
            <span style={{
              background: resultatImmediat.plan_soin?.statut === 'ACTIF' ? '#059669' : '#d97706',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.35rem 0.85rem',
              borderRadius: '20px'
            }}>
              {resultatImmediat.plan_soin?.statut === 'ACTIF' ? "✓ Validé" : "⏳ Brouillon IA (À valider)"}
            </span>
          </div>

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

          {/* Analyse Approfondie IA & Clinique (FINDRISC & Modèle ML) */}
          {resultatImmediat.ml_supplement && (
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#f8fafc',
              textAlign: 'left',
              marginBottom: '2rem',
              border: '1px solid #334155',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
                <Brain size={22} color="#38bdf8" />
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>
                  Analyse IA & Modèle Clinique Approfondi
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  marginLeft: 'auto'
                }}>
                  Modèle ML & FINDRISC
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {/* Score FINDRISC & Risque à 10 ans */}
                {resultatImmediat.ml_supplement.risque_10_ans_pct != null && (
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Risque DT2 à 10 ans (FINDRISC)</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        color: resultatImmediat.ml_supplement.risque_10_ans_pct >= 25 ? '#f87171' : resultatImmediat.ml_supplement.risque_10_ans_pct >= 15 ? '#fbbf24' : '#4ade80'
                      }}>
                        {resultatImmediat.ml_supplement.risque_10_ans_pct}%
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                        (Score: {resultatImmediat.ml_supplement.findrisc_score}/26)
                      </span>
                    </div>
                    {/* Barre de progression */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', marginTop: '0.6rem', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(resultatImmediat.ml_supplement.risque_10_ans_pct * 2, 100)}%`,
                        height: '100%',
                        background: resultatImmediat.ml_supplement.risque_10_ans_pct >= 25 ? '#ef4444' : resultatImmediat.ml_supplement.risque_10_ans_pct >= 15 ? '#f59e0b' : '#10b981',
                        borderRadius: '3px'
                      }} />
                    </div>
                  </div>
                )}

                {/* Détecteur ML Dysglycémie (NHANES) */}
                {resultatImmediat.ml_supplement.probabilite_dysglycemie != null && (
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Probabilité dysglycémie actuelle</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        color: resultatImmediat.ml_supplement.dysglycemie_detectee ? '#f87171' : '#4ade80'
                      }}>
                        {Math.round(resultatImmediat.ml_supplement.probabilite_dysglycemie * 100)}%
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: resultatImmediat.ml_supplement.dysglycemie_detectee ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                        color: resultatImmediat.ml_supplement.dysglycemie_detectee ? '#fca5a5' : '#86efac'
                      }}>
                        {resultatImmediat.ml_supplement.dysglycemie_detectee ? 'Alerte Détectée' : 'Faible suspicion'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.6rem' }}>
                      Inférence modèle ML (calibré NHANES/ADA)
                    </div>
                  </div>
                )}
              </div>

              {/* Alerte Orientation Médicale */}
              {resultatImmediat.ml_supplement.requires_medical_referral && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.8rem'
                }}>
                  <Stethoscope size={22} color="#fca5a5" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.95rem' }}>
                      Consultation médicale et examens recommandés
                    </div>
                    {resultatImmediat.ml_supplement.orientation_medicale?.reason && (
                      <div style={{ fontSize: '0.85rem', color: '#fecaca', marginTop: '0.2rem' }}>
                        {resultatImmediat.ml_supplement.orientation_medicale.reason}
                      </div>
                    )}
                    {resultatImmediat.ml_supplement.orientation_medicale?.to && (
                      <div style={{ fontSize: '0.8rem', color: '#fed7d7', marginTop: '0.3rem', fontWeight: 600 }}>
                        Examen préconisé : {resultatImmediat.ml_supplement.orientation_medicale.to}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plan de Soins Recommandé Complet (Nutrition & Activité) */}
          {resultatImmediat.plan_soin && (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.75rem',
              textAlign: 'left',
              marginBottom: '2rem',
              border: '1.5px solid #cbd5e1',
              boxShadow: '0 4px 15px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <FileText size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f2c59' }}>
                  Plan de Prévention Personnalisé Recommandé
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {/* Volet Nutrition */}
                {resultatImmediat.plan_soin.plan_nutrition && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Salad size={20} color="#16a34a" />
                      <span style={{ fontWeight: 800, color: '#166534', fontSize: '1.05rem' }}>
                        {resultatImmediat.plan_soin.plan_nutrition.titre || "Plan Nutritionnel"}
                      </span>
                    </div>

                    {resultatImmediat.plan_soin.plan_nutrition.objectifs?.length > 0 && (
                      <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.25rem', color: '#14532d', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {resultatImmediat.plan_soin.plan_nutrition.objectifs.map((obj: string, i: number) => (
                          <li key={i} style={{ marginBottom: '0.4rem' }}>{obj}</li>
                        ))}
                      </ul>
                    )}

                    {resultatImmediat.plan_soin.plan_nutrition.conseils_specifiques && (
                      <div style={{ background: '#dcfce7', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: '#166534' }}>
                        💡 <strong>Conseil :</strong> {resultatImmediat.plan_soin.plan_nutrition.conseils_specifiques}
                      </div>
                    )}
                  </div>
                )}

                {/* Volet Activité Physique */}
                {resultatImmediat.plan_soin.plan_activite && (
                  <div style={{
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Dumbbell size={20} color="#2563eb" />
                      <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '1.05rem' }}>
                        {resultatImmediat.plan_soin.plan_activite.titre || "Programme d'Activité Physique"}
                      </span>
                    </div>

                    {resultatImmediat.plan_soin.plan_activite.objectifs?.length > 0 && (
                      <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.25rem', color: '#1e3a8a', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {resultatImmediat.plan_soin.plan_activite.objectifs.map((act: string, i: number) => (
                          <li key={i} style={{ marginBottom: '0.4rem' }}>{act}</li>
                        ))}
                      </ul>
                    )}

                    {resultatImmediat.plan_soin.plan_activite.recommandations && (
                      <div style={{ background: '#dbeafe', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: '#1e40af' }}>
                        ⏱ <strong>Recommandation :</strong> {resultatImmediat.plan_soin.plan_activite.recommandations}
                      </div>
                    )}
                  </div>
                )}
              </div>
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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setResultatImmediat(null)}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}
            >
              <RotateCcw size={16} />
              <span>Ajuster les données saisies</span>
            </button>

            <button
              onClick={reinitialiserPourNouveau}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}
            >
              <span>Dépister un nouveau patient</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
