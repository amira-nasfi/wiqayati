import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import {
  Users,
  Activity,
  ShieldCheck,
  MapPin,
  TrendingUp,
  PieChart as PieIcon,
  Loader2,
  FileCheck,
  Download,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  BarChart3,
  Layers,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Palette BI WiQayati sophistiquée (Ni rouge, ni orange, ni vert criard)
// Utilisation d'un dégradé sémantique analytique haut de gamme :
// - Risque Élevé : Bleu Nuit / Encre Profonde (#142C3D)
// - Risque Intermédiaire : Bleu Ardoise Clinique (#3B7A99)
// - Risque Faible : Turquoise / Sarcelle Minérale Douce (#2A9D8F)
const PALETTE_BI = {
  ELEVE: '#142C3D',         // Bleu Nuit Profond / Encre
  INTERMEDIAIRE: '#3B7A99', // Bleu Acier / Ardoise
  FAIBLE: '#2A9D8F',        // Sarcelle Douce / Turquoise minéral
  NAVY: '#0B2535',
  SLATE_BLUE: '#134B65',
  MUTED_SLATE: '#64748B',
  GRID: '#E2E8F0',
};

// Tooltip personnalisé professionnel pour les graphiques BI
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#0B2535',
          color: '#FFFFFF',
          padding: '0.65rem 0.9rem',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(11, 37, 53, 0.28)',
          fontSize: '0.82rem',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {label && (
          <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#93C5FD' }}>
            {label}
          </div>
        )}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: entry.color || entry.fill,
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#CBD5E1' }}>{entry.name} :</span>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString('fr-FR') : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const MinistryAdminDashboard: React.FC = () => {
  const [apercu, setApercu] = useState<any | null>(null);
  const [gouvernorats, setGouvernorats] = useState<any[]>([]);
  const [facteurs, setFacteurs] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [ongletActif, setOngletActif] = useState<'epidemiologie' | 'territoires' | 'facteurs'>('epidemiologie');
  const [filtreGouvernorat, setFiltreGouvernorat] = useState<string>('TOUS');
  const [periodeSelectionnee, setPeriodeSelectionnee] = useState<string>('30_JOURS');

  const chargerStats = async () => {
    setChargement(true);
    try {
      const [respApercu, respGouv, respFact] = await Promise.all([
        api.get('/admin/ministere/stats/apercu/'),
        api.get('/admin/ministere/stats/par-gouvernorat/'),
        api.get('/admin/ministere/stats/facteurs-risque/'),
      ]);
      setApercu(respApercu.data);
      setGouvernorats(respGouv.data);
      setFacteurs(respFact.data);
    } catch (err) {
      console.error("Erreur de chargement des statistiques", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerStats();
  }, []);

  // Données filtrées et calculées
  const gouvernoratsFiltres = useMemo(() => {
    if (filtreGouvernorat === 'TOUS') return gouvernorats;
    return gouvernorats.filter((g) => g.gouvernorat === filtreGouvernorat);
  }, [gouvernorats, filtreGouvernorat]);

  const listeNomsGouvernorats = useMemo(() => {
    return Array.from(new Set(gouvernorats.map((g) => g.gouvernorat))).sort();
  }, [gouvernorats]);

  const totalEvaluations = apercu?.total_depistages_realises || 0;
  const totalFaible = apercu?.distribution_risques?.FAIBLE || 0;
  const totalIntermediaire = apercu?.distribution_risques?.INTERMEDIAIRE || 0;
  const totalEleve = apercu?.distribution_risques?.ELEVE || 0;

  const pctFaible = totalEvaluations ? Math.round((totalFaible / totalEvaluations) * 100) : 0;
  const pctIntermediaire = totalEvaluations ? Math.round((totalIntermediaire / totalEvaluations) * 100) : 0;
  const pctEleve = totalEvaluations ? Math.round((totalEleve / totalEvaluations) * 100) : 0;

  const donneesCamembert = [
    { name: 'Risque Faible', value: totalFaible, color: PALETTE_BI.FAIBLE, pct: pctFaible },
    { name: 'Risque Intermédiaire', value: totalIntermediaire, color: PALETTE_BI.INTERMEDIAIRE, pct: pctIntermediaire },
    { name: 'Risque Élevé', value: totalEleve, color: PALETTE_BI.ELEVE, pct: pctEleve },
  ].filter((d) => d.value > 0);

  if (chargement) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0', color: '#64748B' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', color: '#134B65' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0B2535' }}>
          Génération du tableau de bord analytique national...
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.4rem' }}>
          Consolidation des données FINDRISC et cohortes régionales
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0.5rem 0 3rem' }}>

      {/* ── BARRE DE COMMANDE BI SUPÉRIEURE ── */}
      <div className="bi-dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#EDF5F9',
                border: '1px solid #CADEE6',
                color: '#134B65',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              <ShieldCheck size={14} />
              Veille Épidémiologique Nationale · Données Anonymisées
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#EDF6F8',
                color: '#134B65',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#2A9D8F',
                  display: 'inline-block',
                }}
              />
              En direct
            </span>
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
            Tableau de Bord Épidémiologique National
          </h1>
          <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
            Indicateurs de dépistage précoce du diabète de type 2 et cartographie des risques territoriaux
          </p>
        </div>

        {/* Barre d'outils et filtres analytiques */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Sélecteur Gouvernorat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <MapPin size={15} color="#134B65" />
            <select
              value={filtreGouvernorat}
              onChange={(e) => setFiltreGouvernorat(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#0B2535',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <option value="TOUS">Tous les gouvernorats (24)</option>
              {listeNomsGouvernorats.map((gouv) => (
                <option key={gouv} value={gouv}>{gouv}</option>
              ))}
            </select>
          </div>

          {/* Sélecteur Période */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <Calendar size={15} color="#134B65" />
            <select
              value={periodeSelectionnee}
              onChange={(e) => setPeriodeSelectionnee(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#0B2535',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <option value="30_JOURS">30 derniers jours</option>
              <option value="90_JOURS">Dernier trimestre</option>
              <option value="2026">Année 2026</option>
              <option value="TOTAL">Historique global</option>
            </select>
          </div>

          {/* Bouton Actualiser */}
          <button
            type="button"
            onClick={chargerStats}
            title="Rafraîchir les données"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} />
            <span>Actualiser</span>
          </button>

          {/* Bouton Export */}
          <button
            type="button"
            onClick={() => window.print()}
            title="Imprimer / Exporter le rapport analytique"
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          >
            <Download size={14} />
            <span>Exporter Synthèse</span>
          </button>
        </div>
      </div>

      {/* ── BANDEAU DE KPIS DÉCISIONNELS ── */}
      <div className="bi-kpi-grid">
        {/* KPI 1 : Patients Dépistés */}
        <div className="bi-kpi-card" style={{ borderTop: '3px solid #142C3D' }}>
          <div>
            <div className="bi-kpi-top">
              <span className="bi-kpi-label">Cohorte Identifiée (INS)</span>
              <div className="bi-kpi-icon" style={{ backgroundColor: '#EDF5F9', color: '#134B65' }}>
                <Users size={17} />
              </div>
            </div>
            <div className="bi-kpi-value">
              {apercu?.total_patients_uniques?.toLocaleString('fr-FR') || 0}
            </div>
          </div>
          <div className="bi-kpi-footer">
            <span style={{ color: '#2A9D8F', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
              <ArrowUpRight size={14} /> 100%
            </span>
            <span>Identifiants Nationaux vérifiés</span>
          </div>
        </div>

        {/* KPI 2 : Évaluations Réalisées */}
        <div className="bi-kpi-card" style={{ borderTop: '3px solid #3B7A99' }}>
          <div>
            <div className="bi-kpi-top">
              <span className="bi-kpi-label">Volume de Dépistages</span>
              <div className="bi-kpi-icon" style={{ backgroundColor: '#EDF6F8', color: '#3B7A99' }}>
                <Activity size={17} />
              </div>
            </div>
            <div className="bi-kpi-value">
              {apercu?.total_depistages_realises?.toLocaleString('fr-FR') || 0}
            </div>
          </div>
          <div className="bi-kpi-footer">
            <span style={{ color: '#475569', fontWeight: 600 }}>
              Campagnes terrain + Soins primaires
            </span>
          </div>
        </div>

        {/* KPI 3 : Score Moyen FINDRISC */}
        <div className="bi-kpi-card" style={{ borderTop: '3px solid #142C3D' }}>
          <div>
            <div className="bi-kpi-top">
              <span className="bi-kpi-label">Score Moyen FINDRISC</span>
              <div className="bi-kpi-icon" style={{ backgroundColor: '#EDF5F9', color: '#142C3D' }}>
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="bi-kpi-value">
              {apercu?.score_risque_moyen || 0}
              <span style={{ fontSize: '1.05rem', color: '#64748B', fontWeight: 500, marginLeft: '4px' }}>/ 100</span>
            </div>
          </div>
          <div className="bi-kpi-footer">
            <span style={{ color: '#134B65', fontWeight: 700 }}>
              Indice standardisé national
            </span>
          </div>
        </div>

        {/* KPI 4 : Prise en charge Nutritionnelle */}
        <div className="bi-kpi-card" style={{ borderTop: '3px solid #2A9D8F' }}>
          <div>
            <div className="bi-kpi-top">
              <span className="bi-kpi-label">Plans Hygiéno-Diététiques</span>
              <div className="bi-kpi-icon" style={{ backgroundColor: '#EAF6F4', color: '#2A9D8F' }}>
                <FileCheck size={17} />
              </div>
            </div>
            <div className="bi-kpi-value">
              {apercu?.statuts_plans?.VALIDE || 0}
              <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500, marginLeft: '6px' }}>
                validés
              </span>
            </div>
          </div>
          <div className="bi-kpi-footer">
            <span style={{ color: '#134B65', fontWeight: 700 }}>
              {apercu?.statuts_plans?.BROUILLON || 0} en cours
            </span>
            <span>d'évaluation nutritionnelle</span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION PAR ONGLETS ANALYTIQUES ── */}
      <div className="bi-tab-nav">
        <button
          type="button"
          onClick={() => setOngletActif('epidemiologie')}
          className={`bi-tab-btn ${ongletActif === 'epidemiologie' ? 'active' : ''}`}
        >
          Vue Épidémiologique & Risques
        </button>
        <button
          type="button"
          onClick={() => setOngletActif('territoires')}
          className={`bi-tab-btn ${ongletActif === 'territoires' ? 'active' : ''}`}
        >
          Ventilation par Gouvernorat ({gouvernoratsFiltres.length})
        </button>
        <button
          type="button"
          onClick={() => setOngletActif('facteurs')}
          className={`bi-tab-btn ${ongletActif === 'facteurs' ? 'active' : ''}`}
        >
          Déterminants & Facteurs de Risque ({facteurs.length})
        </button>
      </div>

      {/* ── ONGLETS 1 : VUE ÉPIDÉMIOLOGIQUE & TENDANCES ── */}
      {ongletActif === 'epidemiologie' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Grille Donut & Histogramme empilé */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(480px, 1.6fr)', gap: '1.5rem' }}>

            {/* Carte Donut : Répartition des Risques */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <PieIcon size={18} color="#134B65" />
                    <span>Répartition des Niveaux de Risque</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                    Ventilation clinique des {totalEvaluations} évaluations
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative', height: '270px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donneesCamembert}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={98}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donneesCamembert.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Métrique centrale incrustée dans le donut */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B2535', lineHeight: 1 }}>
                    {pctEleve}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: PALETTE_BI.ELEVE, fontWeight: 700, marginTop: '2px' }}>
                    Risque Élevé
                  </div>
                </div>
              </div>

              {/* Légende analytique explicite sous le donut */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.6rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #E2E8F0',
                  marginTop: '0.5rem',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PALETTE_BI.FAIBLE }} />
                    Faible
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: PALETTE_BI.FAIBLE, marginTop: '2px' }}>
                    {pctFaible}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{totalFaible} dépistés</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PALETTE_BI.INTERMEDIAIRE }} />
                    Modéré
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: PALETTE_BI.INTERMEDIAIRE, marginTop: '2px' }}>
                    {pctIntermediaire}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{totalIntermediaire} dépistés</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PALETTE_BI.ELEVE }} />
                    Élevé
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: PALETTE_BI.ELEVE, marginTop: '2px' }}>
                    {pctEleve}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{totalEleve} dépistés</div>
                </div>
              </div>
            </div>

            {/* Carte BarChart empilé : Volume par gouvernorat */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <BarChart3 size={18} color="#134B65" />
                    <span>Dépistage par Gouvernorat & Sévérité</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                    Répartition empilée des cohortes de patients évalués
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.76rem', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: PALETTE_BI.ELEVE }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: PALETTE_BI.ELEVE, borderRadius: '2px' }} />
                    Élevé
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: PALETTE_BI.INTERMEDIAIRE }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: PALETTE_BI.INTERMEDIAIRE, borderRadius: '2px' }} />
                    Modéré
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: PALETTE_BI.FAIBLE }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: PALETTE_BI.FAIBLE, borderRadius: '2px' }} />
                    Faible
                  </span>
                </div>
              </div>

              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gouvernoratsFiltres} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE_BI.GRID} />
                    <XAxis
                      dataKey="gouvernorat"
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="eleve" name="Risque Élevé" fill={PALETTE_BI.ELEVE} stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="intermediaire" name="Risque Modéré" fill={PALETTE_BI.INTERMEDIAIRE} stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="faible" name="Risque Faible" fill={PALETTE_BI.FAIBLE} stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Synthèse analytique discrète */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '1.25rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#EDF5F9',
                  color: '#134B65',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Layers size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0B2535' }}>
                  Synthèse Épidémiologique : {pctEleve + pctIntermediaire}% des patients évalués nécessitent une prise en charge préventive
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                  Suivi personnalisé par les nutritionnistes référents et orientation des cas prioritaires.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOngletActif('territoires')}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
            >
              <span>Voir le détail par gouvernorat</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── ONGLETS 2 : ANALYSE TERRITORIALE DÉTAILLÉE ── */}
      {ongletActif === 'territoires' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <MapPin size={18} color="#134B65" />
                <span>Indicateurs Détaillés par Gouvernorat</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                Données épidémiologiques et niveau de priorité de santé publique
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
              {gouvernoratsFiltres.length} gouvernorat(s) affiché(s)
            </div>
          </div>

          <div className="table-container">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Gouvernorat</th>
                  <th style={{ textAlign: 'right' }}>Total Dépistages</th>
                  <th style={{ textAlign: 'right' }}>Risque Élevé</th>
                  <th style={{ textAlign: 'right' }}>Risque Modéré</th>
                  <th style={{ textAlign: 'right' }}>Risque Faible</th>
                  <th style={{ width: '220px' }}>Profil de Risque</th>
                  <th style={{ textAlign: 'center' }}>Statut Territorial</th>
                </tr>
              </thead>
              <tbody>
                {gouvernoratsFiltres.map((g, idx) => {
                  const total = g.total_depistages || (g.eleve + g.intermediaire + g.faible) || 1;
                  const pEleve = Math.round((g.eleve / total) * 100);
                  const pInter = Math.round((g.intermediaire / total) * 100);
                  const pFaible = Math.round((g.faible / total) * 100);

                  const estPrioritaire = pEleve >= 30;

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#0B2535' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <MapPin size={14} color="#134B65" />
                          <span>{g.gouvernorat}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0B2535' }}>
                        {g.total_depistages?.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ textAlign: 'right', color: PALETTE_BI.ELEVE, fontWeight: 700 }}>
                        {g.eleve} <span style={{ fontSize: '0.75rem', color: '#64748B' }}>({pEleve}%)</span>
                      </td>
                      <td style={{ textAlign: 'right', color: PALETTE_BI.INTERMEDIAIRE, fontWeight: 600 }}>
                        {g.intermediaire} <span style={{ fontSize: '0.75rem', color: '#64748B' }}>({pInter}%)</span>
                      </td>
                      <td style={{ textAlign: 'right', color: PALETTE_BI.FAIBLE, fontWeight: 600 }}>
                        {g.faible} <span style={{ fontSize: '0.75rem', color: '#64748B' }}>({pFaible}%)</span>
                      </td>
                      <td>
                        {/* Barre de répartition segmentée */}
                        <div
                          style={{
                            height: '10px',
                            width: '100%',
                            backgroundColor: '#E2E8F0',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            display: 'flex',
                          }}
                        >
                          <div style={{ width: `${pEleve}%`, backgroundColor: PALETTE_BI.ELEVE }} title={`Élevé: ${pEleve}%`} />
                          <div style={{ width: `${pInter}%`, backgroundColor: PALETTE_BI.INTERMEDIAIRE }} title={`Modéré: ${pInter}%`} />
                          <div style={{ width: `${pFaible}%`, backgroundColor: PALETTE_BI.FAIBLE }} title={`Faible: ${pFaible}%`} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {estPrioritaire ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              backgroundColor: '#EDF5F9',
                              color: '#142C3D',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            Cohorte Active
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            Régulier
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ONGLETS 3 : DÉTERMINANTS ET FACTEURS DE RISQUE ── */}
      {ongletActif === 'facteurs' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Activity size={18} color="#134B65" />
                <span>Prévalence des Déterminants Déclarés (FINDRISC)</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                Fréquence des facteurs étiologiques dans la population générale dépistée
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Base : {totalEvaluations} questionnaires remplis
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {facteurs.map((f, idx) => {
              const estMajeur = f.pourcentage >= 40;
              const barColor = estMajeur ? '#142C3D' : '#3B7A99';

              return (
                <div
                  key={idx}
                  style={{
                    padding: '1.25rem 1.4rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0B2535' }}>
                        {f.facteur}
                      </span>
                      <span
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: estMajeur ? '#142C3D' : '#3B7A99',
                          lineHeight: 1,
                        }}
                      >
                        {f.pourcentage}%
                      </span>
                    </div>

                    {/* Jauge horizontale */}
                    <div
                      style={{
                        backgroundColor: '#E2E8F0',
                        borderRadius: '9999px',
                        height: '8px',
                        overflow: 'hidden',
                        margin: '0.65rem 0',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: barColor,
                          height: '100%',
                          width: `${Math.min(f.pourcentage, 100)}%`,
                          borderRadius: '9999px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
                    <span>{f.total?.toLocaleString('fr-FR') || 0} personnes concernées</span>
                    {estMajeur && (
                      <span style={{ fontWeight: 700, color: '#142C3D' }}>Déterminant prépondérant</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
