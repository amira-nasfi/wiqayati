import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  CheckCircle,
  FileEdit,
  Loader2,
  User,
  Activity,
  Salad,
  Scale,
  Cigarette,
  Dna,
  FlaskConical,
  Info,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Brain,
  Pill,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getPrioriteStyle = (priorite: string) => {
  switch (priorite) {
    case 'STAT':
      return { bg: '#FDF2F2', border: '#F2C2C2', color: '#8F2626', label: 'STAT · Immédiat' };
    case 'URGENT':
      return { bg: '#FCF6EC', border: '#F0D5AC', color: '#7A4608', label: 'URGENT · 48h' };
    default:
      return { bg: '#EBF7F2', border: '#BFE4D5', color: '#12543D', label: 'ROUTINE' };
  }
};

const getBadgeIMC = (imc: number) => {
  if (imc < 18.5) return { label: 'Insuffisance', color: '#1d4ed8' };
  if (imc < 25) return { label: 'Normal', color: '#15803d' };
  if (imc < 30) return { label: 'Surpoids', color: '#b45309' };
  if (imc < 35) return { label: 'Obésité I', color: '#c2410c' };
  if (imc < 40) return { label: 'Obésité II', color: '#991b1b' };
  return { label: 'Obésité III', color: '#7f1d1d' };
};

const BoolBadge: React.FC<{ val: boolean; trueLabel?: string; falseLabel?: string }> = ({
  val,
  trueLabel = 'Oui',
  falseLabel = 'Non',
}) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: val ? '#fef3c7' : '#f0f9ff',
    color: val ? '#92400e' : '#0369a1',
    border: `1px solid ${val ? '#fde68a' : '#bae6fd'}`,
  }}>
    {val ? trueLabel : falseLabel}
  </span>
);

const DataItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    <span style={{ fontSize: '0.88rem', color: 'var(--text-ink)', fontWeight: 500 }}>{value}</span>
  </div>
);

// ─── Panneau Données Cliniques Complètes du Patient ─────────────────────────

const PanneauDonneesCliniques: React.FC<{ plan: any }> = ({ plan }) => {
  const [onglet, setOnglet] = useState<'biometrie' | 'metabolisme' | 'habitudes' | 'antecedents' | 'allergies_dmi'>('biometrie');
  // L'API retourne les données de screening sous reponse_screening.donnees
  const d = plan.reponse_screening?.donnees || plan.screening_data || plan.evaluation_risque?.donnees || {};
  const patient = plan.patient;
  const rapport = plan.rapport_agent || {};
  const meta = rapport.metadata || {};

  const imcVal = d.imc ? parseFloat(d.imc) : null;
  const imcBadge = imcVal ? getBadgeIMC(imcVal) : null;
  const tourTaille = d.tour_taille_cm ? parseFloat(d.tour_taille_cm) : null;
  const tourHanche = d.tour_hanche_cm ? parseFloat(d.tour_hanche_cm) : null;
  const ratioWHR = tourTaille && tourHanche ? (tourTaille / tourHanche).toFixed(2) : null;
  const genrePatient = d.genre || patient?.genre || 'M';
  const risqueVisceral = tourTaille
    ? (genrePatient === 'M' && tourTaille > 102) || (genrePatient === 'F' && tourTaille > 88)
    : false;

  const glycemie = d.glycemie_jeun_mmol ? parseFloat(d.glycemie_jeun_mmol) : null;
  const glycemieGL = glycemie ? (glycemie * 0.18014).toFixed(2) : null;

  const onglets = [
    { id: 'biometrie', label: 'Biométrie', icon: <Scale size={13} /> },
    { id: 'metabolisme', label: 'Glycémie / Bio', icon: <FlaskConical size={13} /> },
    { id: 'habitudes', label: 'Mode de vie', icon: <Activity size={13} /> },
    { id: 'antecedents', label: 'Antécédents', icon: <Dna size={13} /> },
    { id: 'allergies_dmi', label: 'Allergies & DMI FHIR', icon: <Pill size={13} /> },
  ] as const;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Onglets */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {onglets.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: onglet === o.id ? 700 : 500,
              border: `1px solid ${onglet === o.id ? 'var(--primary-slate)' : 'var(--border-subtle)'}`,
              backgroundColor: onglet === o.id ? 'var(--surface-highlight)' : 'transparent',
              color: onglet === o.id ? 'var(--primary-slate)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--surface-subtle)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid var(--border-subtle)' }}>
        {onglet === 'biometrie' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <DataItem label="Genre" value={genrePatient === 'M' ? 'Masculin' : 'Féminin'} />
            <DataItem label="Âge" value={d.age ? `${d.age} ans` : '—'} />
            <DataItem label="Taille" value={d.taille_cm ? `${d.taille_cm} cm` : '—'} />
            <DataItem label="Poids" value={d.poids_kg ? `${d.poids_kg} kg` : '—'} />
            <DataItem label="IMC (kg/m²)" value={
              imcVal ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {imcVal.toFixed(1)}
                  {imcBadge && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: imcBadge.color + '22', color: imcBadge.color }}>{imcBadge.label}</span>}
                </span>
              ) : '—'
            } />
            <DataItem label="Tour de taille" value={
              tourTaille ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {tourTaille} cm
                  {risqueVisceral && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#991b1b' }}>
                      <AlertTriangle size={11} /> Adiposité viscérale
                    </span>
                  )}
                </span>
              ) : '—'
            } />
            {tourHanche && <DataItem label="Tour de hanche" value={`${tourHanche} cm`} />}
            {ratioWHR && <DataItem label="Ratio Taille/Hanche" value={<span style={{ fontWeight: 700 }}>{ratioWHR}</span>} />}
            {(d.sbp || d.pression_arterielle_systolique) && (
              <DataItem label="Pression systolique" value={`${d.sbp || d.pression_arterielle_systolique} mmHg`} />
            )}
            <DataItem label="Traitement antihypertenseur" value={<BoolBadge val={!!d.prise_antihypertenseur} />} />
          </div>
        )}

        {onglet === 'metabolisme' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <DataItem label="Glycémie à jeun connue ?" value={<BoolBadge val={!!d.glycemie_jeun_connue} />} />
            {glycemie && (
              <>
                <DataItem label="Glycémie à jeun (mmol/L)" value={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {glycemie}
                    {glycemie >= 7.0 && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#991b1b' }}>Diabète suspecté</span>}
                    {glycemie >= 5.6 && glycemie < 7.0 && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e' }}>Pré-diabète</span>}
                  </span>
                } />
                <DataItem label="Glycémie à jeun (g/L)" value={glycemieGL ? `${glycemieGL} g/L` : '—'} />
              </>
            )}
            <DataItem label="HbA1c déjà dosée ?" value={<BoolBadge val={!!d.hba1c_connue} />} />
            {d.hba1c_valeur && (
              <DataItem label="Valeur HbA1c déclarée" value={
                <span style={{ fontWeight: 700, color: Number(d.hba1c_valeur) >= 6.5 ? '#dc2626' : Number(d.hba1c_valeur) >= 5.7 ? '#d97706' : '#16a34a' }}>
                  {d.hba1c_valeur} % {Number(d.hba1c_valeur) >= 6.5 ? '(Zone DT2)' : Number(d.hba1c_valeur) >= 5.7 ? '(Pré-diabète)' : '(Normal)'}
                </span>
              } />
            )}
            <DataItem label="Cholestérol total élevé" value={<BoolBadge val={!!d.cholesterol_total_eleve} />} />
            <DataItem label="Hyperglycémie antérieure" value={<BoolBadge val={!!d.high_glucose_hist} trueLabel="Antécédent documenté" falseLabel="Aucun" />} />
            <DataItem label="Acanthosis nigricans" value={<BoolBadge val={!!d.acanthosis_nigricans} trueLabel="Présent (insulinorésistance)" falseLabel="Absent" />} />
            <DataItem label="HTA diagnostiquée" value={<BoolBadge val={!!d.hypertension_diagnostiquee} />} />
            <DataItem label="Corticoïdes chroniques" value={<BoolBadge val={!!d.medicaments_corticoides} trueLabel="En cours" falseLabel="Non" />} />
          </div>
        )}

        {onglet === 'habitudes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <DataItem label="Niveau d'activité physique" value={
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                backgroundColor: d.niveau_activite_physique === 'FAIBLE' ? '#fee2e2' : d.niveau_activite_physique === 'MODERE' ? '#fef3c7' : '#dcfce7',
                color: d.niveau_activite_physique === 'FAIBLE' ? '#991b1b' : d.niveau_activite_physique === 'MODERE' ? '#92400e' : '#166534',
              }}>
                {d.niveau_activite_physique || '—'}
              </span>
            } />
            <DataItem label="Qualité de l'alimentation" value={
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                backgroundColor: d.qualite_alimentation === 'MAUVAISE' ? '#fee2e2' : d.qualite_alimentation === 'MOYENNE' ? '#fef3c7' : '#dcfce7',
                color: d.qualite_alimentation === 'MAUVAISE' ? '#991b1b' : d.qualite_alimentation === 'MOYENNE' ? '#92400e' : '#166534',
              }}>
                {d.qualite_alimentation || '—'}
              </span>
            } />
            <DataItem label="Régime méditerranéen tunisien" value={<BoolBadge val={!!d.alimentation_mediterraneenne} trueLabel="Adhérent" falseLabel="Non adhérent" />} />
            <DataItem label="Produits ultra-transformés" value={d.consommation_sucres_caches || '—'} />
            <DataItem label="Sommeil moyen" value={d.sommeil_heures ? `${d.sommeil_heures} h / nuit` : '—'} />
            <DataItem label="Stress perçu" value={
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                backgroundColor: d.stress_chronique === 'ELEVE' ? '#fee2e2' : d.stress_chronique === 'MODERE' ? '#fef3c7' : '#f0fdf4',
                color: d.stress_chronique === 'ELEVE' ? '#991b1b' : d.stress_chronique === 'MODERE' ? '#92400e' : '#166534',
              }}>
                {d.stress_chronique || '—'}
              </span>
            } />
            <DataItem label="Statut tabagique" value={
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cigarette size={13} color={d.statut_tabagisme === 'FUMEUR_ACTUEL' ? '#dc2626' : '#94a3b8'} />
                <span>{d.statut_tabagisme?.replace('_', ' ') || '—'}</span>
              </span>
            } />
            {d.prise_medicaments_liste && (
              <DataItem label="Traitements déclarés" value={<span style={{ fontStyle: 'italic' }}>{d.prise_medicaments_liste}</span>} />
            )}
          </div>
        )}

        {onglet === 'antecedents' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <DataItem label="Diabète familial (1er degré)" value={<BoolBadge val={!!d.antecedents_familiaux_diabete} trueLabel="Oui — Parents / Fratrie" falseLabel="Non" />} />
            <DataItem label="ATCD cardiovasculaires" value={<BoolBadge val={!!d.antecedents_cardiovasculaires} trueLabel="Infarctus / AVC / Angor" falseLabel="Aucun" />} />
            <DataItem label="Diabète gestationnel" value={<BoolBadge val={!!d.diabete_gestationnel_antecedent} trueLabel="Antécédent documenté" falseLabel="Non / N.A." />} />
            <DataItem label="Gouvernorat patient" value={patient?.gouvernorat || '—'} />
            <DataItem label="Né(e) le" value={patient?.date_naissance || '—'} />
          </div>
        )}

        {onglet === 'allergies_dmi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Allergies déclarées */}
            <div style={{ padding: '0.65rem 0.85rem', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                Allergies &amp; Intolérances Alimentaires Déclarées
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: d.allergie_alimentaire ? '#78350f' : '#64748b' }}>
                {d.allergie_alimentaire ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fcd34d' }}>
                    ⚠ {d.allergie_alimentaire}
                  </span>
                ) : (
                  'Aucune allergie alimentaire déclarée lors du dépistage.'
                )}
              </div>
            </div>

            {/* Statut DMI HAPI FHIR */}
            <div style={{ padding: '0.65rem 0.85rem', background: meta.dmi_utilise ? '#ecfdf5' : '#f8fafc', borderRadius: '6px', border: `1px solid ${meta.dmi_utilise ? '#a7f3d0' : '#e2e8f0'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: meta.dmi_utilise ? '#065f46' : '#475569', textTransform: 'uppercase' }}>
                  Dossier Médical Informatisé (DMI) — Serveur HAPI FHIR
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                  backgroundColor: meta.dmi_utilise ? '#d1fae5' : '#e2e8f0',
                  color: meta.dmi_utilise ? '#047857' : '#64748b',
                }}>
                  {meta.dmi_utilise ? 'DMI Synchronisé' : 'Non disponible'}
                </span>
              </div>
              {meta.dmi_fhir_id && (
                <div style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '0.3rem' }}>
                  Identifiant Ressource Patient FHIR : <code>{meta.dmi_fhir_id}</code>
                </div>
              )}
              {plan.rapport_agent?.rapport_nutritionniste?.resume_dossier && (
                <div style={{ fontSize: '0.82rem', color: '#1f2937', marginTop: '0.3rem', fontStyle: 'italic' }}>
                  « {plan.rapport_agent.rapport_nutritionniste.resume_dossier} »
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Composant Principal ─────────────────────────────────────────────────────

export const NutritionistPortal: React.FC = () => {
  const [taches, setTaches] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [planEnConsultation, setPlanEnConsultation] = useState<any | null>(null);
  const [modeEdition, setModeEdition] = useState(false);
  const [messageAction, setMessageAction] = useState<string | null>(null);
  const [typeMessage, setTypeMessage] = useState<'succes' | 'erreur'>('succes');
  const [planOriginal, setPlanOriginal] = useState<any | null>(null);

  // Champs éditables du plan
  const [notesNutritionniste, setNotesNutritionniste] = useState('');
  const [planNutritionTitre, setPlanNutritionTitre] = useState('');
  const [planNutritionConseils, setPlanNutritionConseils] = useState('');
  const [planActiviteTitre, setPlanActiviteTitre] = useState('');
  const [planActiviteRecos, setPlanActiviteRecos] = useState('');
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  // Accordéon section clinique
  const [donneesExpandees, setDonneesExpandees] = useState(true);

  const chargerFile = async () => {
    setChargement(true);
    try {
      const resp = await api.get('/nutritionniste/file/');
      setTaches(resp.data.results || resp.data);
    } catch {
      afficherMessage("Erreur lors du chargement de la file clinique.", 'erreur');
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { chargerFile(); }, []);

  const afficherMessage = (msg: string, type: 'succes' | 'erreur' = 'succes') => {
    setMessageAction(msg);
    setTypeMessage(type);
    setTimeout(() => setMessageAction(null), 5000);
  };

  const ouvrirDossier = async (planId: string, tacheId: string) => {
    setMessageAction(null);
    setModeEdition(false);
    try {
      await api.post(`/nutritionniste/file/${tacheId}/prendre-en-charge/`);
      const resp = await api.get(`/nutritionniste/plans/${planId}/`);
      const plan = resp.data;
      setPlanEnConsultation(plan);
      setPlanOriginal(plan);
      // Pré-remplir les champs
      setNotesNutritionniste(plan.notes_nutritionniste || '');
      setPlanNutritionTitre(plan.plan_nutrition?.titre || '');
      setPlanNutritionConseils(plan.plan_nutrition?.conseils_specifiques || '');
      setPlanActiviteTitre(plan.plan_activite?.titre || '');
      setPlanActiviteRecos(plan.plan_activite?.recommandations || '');
      chargerFile();
    } catch {
      afficherMessage("Impossible d'ouvrir ce dossier médical.", 'erreur');
    }
  };

  const handleSauvegarderModifications = async (silencieux = false) => {
    if (!planEnConsultation) return;
    if (!silencieux) setSauvegardeEnCours(true);
    try {
      const resp = await api.patch(`/nutritionniste/plans/${planEnConsultation.id}/modifier/`, {
        notes_nutritionniste: notesNutritionniste,
        plan_nutrition: {
          ...planEnConsultation.plan_nutrition,
          titre: planNutritionTitre,
          conseils_specifiques: planNutritionConseils,
        },
        plan_activite: {
          ...planEnConsultation.plan_activite,
          titre: planActiviteTitre,
          recommandations: planActiviteRecos,
        },
      });
      setPlanEnConsultation(resp.data);
      if (!silencieux) afficherMessage("Brouillon mis à jour dans le dossier patient.");
    } catch {
      if (!silencieux) afficherMessage("Échec de l'enregistrement du brouillon.", 'erreur');
    } finally {
      if (!silencieux) setSauvegardeEnCours(false);
    }
  };

  const handleValiderPlan = async () => {
    if (!planEnConsultation) return;
    setSauvegardeEnCours(true);
    try {
      await handleSauvegarderModifications(true);
      const resp = await api.post(`/nutritionniste/plans/${planEnConsultation.id}/valider/`);
      afficherMessage(resp.data.message || "✔ Plan de soin validé et transmis au citoyen.", 'succes');
      setPlanEnConsultation(null);
      setModeEdition(false);
      chargerFile();
    } catch {
      afficherMessage("Erreur lors de la validation clinique du plan.", 'erreur');
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const handleReinitialisierAuxSuggestions = () => {
    if (!planOriginal) return;
    setNotesNutritionniste(planOriginal.notes_nutritionniste || '');
    setPlanNutritionTitre(planOriginal.plan_nutrition?.titre || '');
    setPlanNutritionConseils(planOriginal.plan_nutrition?.conseils_specifiques || '');
    setPlanActiviteTitre(planOriginal.plan_activite?.titre || '');
    setPlanActiviteRecos(planOriginal.plan_activite?.recommandations || '');
    afficherMessage("Champs réinitialisés aux propositions de l'Agent Hybride.", 'succes');
  };

  return (
    <div style={{ maxWidth: '1420px', margin: '0 auto', padding: '1rem 1.5rem 3rem' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-ink)', marginBottom: '0.35rem' }}>
          File de priorisation nutritionnelle
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Triage clinique national · <strong>STAT</strong> (Risque Élevé) · <strong>URGENT</strong> (Intermédiaire) · <strong>ROUTINE</strong> (Faible) — Validation humaine obligatoire avant publication
        </p>
      </div>

      {/* Bandeau de retour d'action */}
      {messageAction && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: typeMessage === 'erreur' ? '#fff5f5' : 'var(--surface-highlight)',
          color: typeMessage === 'erreur' ? '#c53030' : 'var(--primary-slate)',
          border: `1px solid ${typeMessage === 'erreur' ? '#feb2b2' : 'var(--border-subtle)'}`,
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          fontSize: '0.9rem', fontWeight: 500,
        }}>
          {typeMessage === 'erreur' ? <AlertTriangle size={16} color="#c53030" /> : <CheckCircle size={16} color="var(--accent-mint)" />}
          <span>{messageAction}</span>
        </div>
      )}

      {/* Grille principale : File à gauche + Fiche à droite */}
      <div style={{ display: 'grid', gridTemplateColumns: planEnConsultation ? '38% 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Colonne gauche : Registre des tâches ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Dossiers en attente</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {taches.length} patient(s) en file
              </div>
            </div>
            <button onClick={chargerFile} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}>
              Actualiser
            </button>
          </div>

          {chargement ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--primary-slate)' }} />
              <div style={{ fontSize: '0.9rem' }}>Actualisation du registre...</div>
            </div>
          ) : taches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              <CheckCircle size={32} color="var(--accent-mint)" style={{ marginBottom: '0.5rem' }} />
              <div>Aucun dossier en attente dans votre file.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Priorité</th>
                    <th>Patient</th>
                    <th>Risque</th>
                    <th style={{ textAlign: 'right' }}>Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {taches.map((t) => {
                    const estSelectionne = planEnConsultation?.id === t.plan_id;
                    const pStyle = getPrioriteStyle(t.priorite);
                    return (
                      <tr key={t.id} style={{
                        backgroundColor: estSelectionne ? 'var(--surface-highlight)' : undefined,
                        borderLeft: estSelectionne ? '3px solid var(--primary-slate)' : '3px solid transparent',
                      }}>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 7px', borderRadius: '4px',
                            fontSize: '0.72rem', fontWeight: 700,
                            backgroundColor: pStyle.bg, border: `1px solid ${pStyle.border}`, color: pStyle.color,
                          }}>
                            {t.priorite}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{t.patient.prenom} {t.patient.nom}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            INS {t.patient.ins} · {t.patient.gouvernorat}
                          </div>
                        </td>
                        <td>
                          <span className={`badge-risk ${t.niveau_risque}`}>
                            {t.niveau_risque} · {t.score_risque}pts
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => ouvrirDossier(t.plan_id, t.id)}
                            className={estSelectionne ? 'btn btn-primary' : 'btn btn-secondary'}
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

        {/* ── Colonne droite : Fiche clinique complète + Plan ── */}
        {planEnConsultation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* En-tête patient */}
            <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
              <div className="card-header" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--surface-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} color="var(--primary-slate)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                      {planEnConsultation.patient.prenom} {planEnConsultation.patient.nom}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 700, backgroundColor: 'var(--surface-highlight)', padding: '1px 6px', borderRadius: '4px', marginRight: '6px', color: 'var(--primary-slate)' }}>
                        INS : {planEnConsultation.patient.ins}
                      </span>
                      {planEnConsultation.patient.gouvernorat} · Né(e) le {planEnConsultation.patient.date_naissance}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge-risk ${planEnConsultation.evaluation_risque.niveau_risque}`}>
                    Score {planEnConsultation.evaluation_risque.score} / 100
                  </span>
                  <button
                    onClick={() => { setPlanEnConsultation(null); setModeEdition(false); }}
                    style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>

            {/* Accordéon données cliniques */}
            <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
              <button
                onClick={() => setDonneesExpandees(!donneesExpandees)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.85rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: donneesExpandees ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-ink)', fontSize: '0.92rem' }}>
                  <Info size={16} color="var(--primary-slate)" />
                  Données Cliniques Complètes du Patient
                </div>
                {donneesExpandees ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
              </button>

              {donneesExpandees && (
                <div style={{ padding: '0.75rem 1rem 0.5rem' }}>
                  {/* Facteurs de risque contributifs */}
                  {planEnConsultation.evaluation_risque.facteurs?.length > 0 && (
                    <div style={{
                      marginBottom: '1rem', padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px',
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Facteurs FINDRISC contributifs identifiés
                      </div>
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.83rem', color: 'var(--text-ink)', margin: 0 }}>
                        {planEnConsultation.evaluation_risque.facteurs.map((f: any, i: number) => (
                          <li key={i} style={{ marginBottom: '2px' }}>{f.libelle}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <PanneauDonneesCliniques plan={planEnConsultation} />
                </div>
              )}
            </div>

            {/* ── Panneau Rapport de l'Agent Hybride IA ── */}
            {planEnConsultation.rapport_agent && Object.keys(planEnConsultation.rapport_agent).length > 0 && (
              <div className="card" style={{ border: '1px solid #bfdbfe', background: '#f8fafc', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Brain size={20} color="#2563eb" />
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f2c59' }}>
                      Rapport Clinique &amp; Justification — Agent Hybride
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {planEnConsultation.rapport_agent.metadata?.dmi_utilise ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 9px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 700,
                        backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac'
                      }}>
                        <Sparkles size={12} /> DMI FHIR Intégré
                      </span>
                    ) : (
                      <span style={{
                        padding: '3px 9px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 600,
                        backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1'
                      }}>
                        Formulaire seul
                      </span>
                    )}
                    <span style={{
                      padding: '3px 9px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 600,
                      backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe'
                    }}>
                      {planEnConsultation.rapport_agent.metadata?.llm_model || 'Modèle IA'}
                    </span>
                    {planEnConsultation.rapport_agent.metadata?.latence_ms > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {planEnConsultation.rapport_agent.metadata.latence_ms} ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Bannière Alerte Clinique / Orientation Médicale */}
                {(planEnConsultation.requires_medical_referral || (planEnConsultation.urgent_flags && planEnConsultation.urgent_flags.length > 0)) && (
                  <div style={{
                    marginBottom: '1rem', padding: '0.85rem 1rem',
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                    color: '#991b1b',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                      <AlertTriangle size={16} color="#dc2626" />
                      <span>Orientation Médicale &amp; Drapeaux Cliniques Urgents</span>
                    </div>
                    {planEnConsultation.urgent_flags && planEnConsultation.urgent_flags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '0.4rem 0' }}>
                        {planEnConsultation.urgent_flags.map((uf: string, i: number) => (
                          <span key={i} style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                            backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5'
                          }}>
                            ⚠ {uf.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                    {planEnConsultation.rapport_agent.rapport_nutritionniste?.orientation_medicale?.motif && (
                      <div style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                        <strong>Motif :</strong> {planEnConsultation.rapport_agent.rapport_nutritionniste.orientation_medicale.motif}
                        {planEnConsultation.rapport_agent.rapport_nutritionniste.orientation_medicale.specialite && (
                          <span> · <em>Filière recommandée : {planEnConsultation.rapport_agent.rapport_nutritionniste.orientation_medicale.specialite}</em></span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Résumé du dossier clinique */}
                {planEnConsultation.rapport_agent.rapport_nutritionniste?.resume_dossier && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      Synthèse Clinique Automatisée
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-ink)', lineHeight: 1.5, background: '#fff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      {planEnConsultation.rapport_agent.rapport_nutritionniste.resume_dossier}
                    </div>
                  </div>
                )}

                {/* Points d'attention identifiés par l'IA */}
                {planEnConsultation.rapport_agent.rapport_nutritionniste?.points_attention?.length > 0 && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      Points d'Attention Identifiés par l'Agent
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.83rem', color: '#78350f', background: '#fffbeb', padding: '0.6rem 0.85rem 0.6rem 1.7rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
                      {planEnConsultation.rapport_agent.rapport_nutritionniste.points_attention.map((pt: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Justification clinique IA */}
                {planEnConsultation.rapport_agent.rapport_nutritionniste?.justification_ia && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      Justification Clinique du Plan Proposé
                    </div>
                    <div style={{ fontSize: '0.83rem', color: '#334155', fontStyle: 'italic', background: '#fff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      « {planEnConsultation.rapport_agent.rapport_nutritionniste.justification_ia} »
                    </div>
                  </div>
                )}

                {/* Interactions Médicament-Aliment documentées */}
                {planEnConsultation.rapport_agent.plan_nutrition?.interactions_medicaments_aliments?.length > 0 && (
                  <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Pill size={13} color="#dc2626" />
                      Interactions Médicament-Aliment Documentées
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: '#7f1d1d' }}>
                      {planEnConsultation.rapport_agent.plan_nutrition.interactions_medicaments_aliments.map((inter: string, idx: number) => (
                        <li key={idx}>{inter}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Plan de soin — vue ou édition */}
            <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
              <div className="card-header" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-ink)', fontSize: '0.95rem' }}>
                  {modeEdition ? <FileEdit size={16} color="var(--primary-slate)" /> : <Salad size={16} color="var(--accent-mint)" />}
                  {modeEdition ? 'Mode Édition — Plan de soin' : 'Plan proposé par l\'Agent Hybride'}
                </div>
                {!modeEdition ? (
                  <button
                    onClick={() => setModeEdition(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', gap: '0.4rem', display: 'flex', alignItems: 'center' }}
                  >
                    <FileEdit size={14} />
                    Modifier le plan
                  </button>
                ) : (
                  <button
                    onClick={handleReinitialisierAuxSuggestions}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', gap: '0.4rem', display: 'flex', alignItems: 'center' }}
                  >
                    <RotateCcw size={14} />
                    Réinitialiser aux suggestions
                  </button>
                )}
              </div>

              {/* Vue lecture */}
              {!modeEdition && (
                <div style={{ padding: '0 0 0.5rem' }}>
                  {/* Plan nutrition */}
                  <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                      <Salad size={14} color="var(--accent-mint)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                        {planEnConsultation.plan_nutrition?.titre || 'Plan nutritionnel'}
                      </span>
                    </div>
                    {planEnConsultation.plan_nutrition?.objectifs?.length > 0 && (
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.83rem', color: 'var(--text-ink)', margin: '0 0 0.5rem 0' }}>
                        {planEnConsultation.plan_nutrition.objectifs.map((obj: string, i: number) => (
                          <li key={i} style={{ marginBottom: '3px' }}>{obj}</li>
                        ))}
                      </ul>
                    )}

                    {/* Aliments à privilégier et à éviter */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                      {planEnConsultation.plan_nutrition?.aliments_a_privilegier?.length > 0 && (
                        <div style={{ background: '#f0fdf4', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                            ✓ Aliments à privilégier
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {planEnConsultation.plan_nutrition.aliments_a_privilegier.map((a: string, i: number) => (
                              <span key={i} style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#14532d', padding: '2px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {planEnConsultation.plan_nutrition?.aliments_a_eviter?.length > 0 && (
                        <div style={{ background: '#fef2f2', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                            ✗ Aliments à éviter / modérer
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {planEnConsultation.plan_nutrition.aliments_a_eviter.map((a: string, i: number) => (
                              <span key={i} style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#7f1d1d', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {planEnConsultation.plan_nutrition?.conseils_specifiques && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic', margin: '0.5rem 0 0' }}>
                        {planEnConsultation.plan_nutrition.conseils_specifiques}
                      </p>
                    )}

                    {planEnConsultation.plan_nutrition?.frequence_suivi && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>
                        Suivi nutritionnel recommandé : {planEnConsultation.plan_nutrition.frequence_suivi}
                      </div>
                    )}
                  </div>

                  {/* Plan activité */}
                  <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                      <Activity size={14} color="#3B7A99" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                        {planEnConsultation.plan_activite?.titre || 'Programme d\'activité'}
                      </span>
                    </div>
                    {planEnConsultation.plan_activite?.objectifs?.length > 0 && (
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.83rem', color: 'var(--text-ink)', margin: '0 0 0.5rem 0' }}>
                        {planEnConsultation.plan_activite.objectifs.map((obj: string, i: number) => (
                          <li key={i} style={{ marginBottom: '3px' }}>{obj}</li>
                        ))}
                      </ul>
                    )}
                    {planEnConsultation.plan_activite?.programme_semaine && (
                      <div style={{ fontSize: '0.82rem', color: '#1e40af', background: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <strong>Programme :</strong> {planEnConsultation.plan_activite.programme_semaine}
                      </div>
                    )}
                    {planEnConsultation.plan_activite?.precautions && (
                      <div style={{ fontSize: '0.8rem', color: '#92400e', background: '#fef3c7', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                        <strong>Précautions :</strong> {planEnConsultation.plan_activite.precautions}
                      </div>
                    )}
                    {planEnConsultation.plan_activite?.contre_indications_dmi?.length > 0 && (
                      <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', backgroundColor: '#fff5f5', borderRadius: '4px', border: '1px solid #fed7d7' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c53030', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> Contre-indications DMI
                        </div>
                        <ul style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: '#c53030', margin: 0 }}>
                          {planEnConsultation.plan_activite.contre_indications_dmi.map((ci: string, i: number) => (
                            <li key={i}>{ci}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {planEnConsultation.notes_nutritionniste && (
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      <strong>Notes soignant :</strong> {planEnConsultation.notes_nutritionniste}
                    </div>
                  )}
                </div>
              )}

              {/* Mode édition */}
              {modeEdition && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Titre du plan nutritionnel</label>
                    <input type="text" className="form-control" value={planNutritionTitre}
                      onChange={(e) => setPlanNutritionTitre(e.target.value)}
                      placeholder="Orientation diététique personnalisée" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consignes diététiques spécifiques</label>
                    <textarea rows={3} className="form-control" value={planNutritionConseils}
                      onChange={(e) => setPlanNutritionConseils(e.target.value)}
                      placeholder="Apports, index glycémique, répartition des repas, ancrage culturel..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Titre du programme d'activité physique</label>
                    <input type="text" className="form-control" value={planActiviteTitre}
                      onChange={(e) => setPlanActiviteTitre(e.target.value)}
                      placeholder="ex: Marche active quotidienne, exercices adaptés" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recommandations d'activité personnalisées</label>
                    <textarea rows={2} className="form-control" value={planActiviteRecos}
                      onChange={(e) => setPlanActiviteRecos(e.target.value)}
                      placeholder="Fréquence, durée, intensité, précautions spécifiques au patient..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Observations médicales internes (dossier soignant)</label>
                    <textarea rows={2} className="form-control" value={notesNutritionniste}
                      onChange={(e) => setNotesNutritionniste(e.target.value)}
                      placeholder="Notes de suivi ou contre-indications éventuelles..." />
                  </div>
                </div>
              )}

              {/* Actions soignantes */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                {modeEdition ? (
                  <>
                    <button type="button" onClick={() => setModeEdition(false)} className="btn btn-secondary" disabled={sauvegardeEnCours}>
                      Annuler l'édition
                    </button>
                    <button type="button" onClick={() => handleSauvegarderModifications()} className="btn btn-secondary" disabled={sauvegardeEnCours}>
                      <FileEdit size={15} />
                      <span>Enregistrer brouillon</span>
                    </button>
                    <button type="button" onClick={handleValiderPlan} className="btn btn-accent" disabled={sauvegardeEnCours}>
                      {sauvegardeEnCours ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                      <span>Valider avec mes modifications</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setModeEdition(true)} className="btn btn-secondary">
                      <FileEdit size={15} />
                      <span>Modifier le plan</span>
                    </button>
                    <button type="button" onClick={handleValiderPlan} className="btn btn-accent" disabled={sauvegardeEnCours}>
                      {sauvegardeEnCours ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                      <span>Valider tel quel (Certifier IA)</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
