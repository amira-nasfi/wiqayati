import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Users,
  Activity,
  ShieldCheck,
  MapPin,
  TrendingUp,
  PieChart as PieIcon,
  Loader2,
  FileCheck
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
  Legend
} from 'recharts';

const COULEURS_RISQUE = {
  FAIBLE: '#10b981',
  INTERMEDIAIRE: '#f59e0b',
  ELEVE: '#ef4444',
};

export const MinistryAdminDashboard: React.FC = () => {
  const [apercu, setApercu] = useState<any | null>(null);
  const [gouvernorats, setGouvernorats] = useState<any[]>([]);
  const [facteurs, setFacteurs] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const chargerStats = async () => {
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
    chargerStats();
  }, []);

  if (chargement) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <div style={{ fontSize: '1.1rem' }}>Chargement des indicateurs épidémiologiques nationaux...</div>
      </div>
    );
  }

  const donneesCamembert = apercu?.distribution_risques
    ? [
        { name: 'Faible', value: apercu.distribution_risques.FAIBLE, color: COULEURS_RISQUE.FAIBLE },
        { name: 'Intermédiaire', value: apercu.distribution_risques.INTERMEDIAIRE, color: COULEURS_RISQUE.INTERMEDIAIRE },
        { name: 'Élevé', value: apercu.distribution_risques.ELEVE, color: COULEURS_RISQUE.ELEVE },
      ]
    : [];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.85rem',
          background: '#dbeafe',
          color: '#1e40af',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '0.5rem'
        }}>
          <ShieldCheck size={16} />
          Ministère de la Santé Publique • Données Agrégées Anonymisées
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f2c59', marginBottom: '0.3rem' }}>
          Tableau de Bord National du Dépistage
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Suivi épidémiologique en temps réel des risques de diabète de type 2 à l'échelle de la République Tunisienne
        </p>
      </div>

      {/* Cartes KPIs clés */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Patients Dépistés (INS)</span>
            <Users size={20} color="#2563eb" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f2c59' }}>
            {apercu?.total_patients_uniques || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
            Aucun doublon d'INS
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0d9488' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Total Évaluations</span>
            <Activity size={20} color="#0d9488" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f2c59' }}>
            {apercu?.total_depistages_realises || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Campagnes + centres de soins
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Score de Risque Moyen</span>
            <TrendingUp size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f2c59' }}>
            {apercu?.score_risque_moyen || 0} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Indice national standardisé
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Plans Validés</span>
            <FileCheck size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f2c59' }}>
            {apercu?.statuts_plans?.VALIDE || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {apercu?.statuts_plans?.BROUILLON || 0} en attente nutritionniste
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Distribution des risques */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieIcon size={18} color="#2563eb" />
              <span>Distribution Nationale des Niveaux de Risque</span>
            </div>
          </div>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donneesCamembert}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                >
                  {donneesCamembert.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par gouvernorat */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="#2563eb" />
              <span>Volume par Gouvernorat</span>
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gouvernorats}>
                <XAxis dataKey="gouvernorat" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="eleve" name="Risque Élevé" fill="#ef4444" stackId="a" />
                <Bar dataKey="intermediaire" name="Risque Intermédiaire" fill="#f59e0b" stackId="a" />
                <Bar dataKey="faible" name="Risque Faible" fill="#10b981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Facteurs de risque contributifs les plus fréquents */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Prévalence des Facteurs Déclarés dans la Population Évaluée
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {facteurs.map((f, idx) => (
            <div key={idx} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 600 }}>
                <span>{f.facteur}</span>
                <span style={{ color: '#2563eb', fontWeight: 800 }}>{f.pourcentage}%</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#2563eb', height: '100%', width: `${f.pourcentage}%`, borderRadius: '9999px' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                {f.total} patients concernés
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
