import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { WelcomePage } from './pages/WelcomePage';
import { LoginPage } from './pages/LoginPage';
import { AgentPortal } from './pages/AgentPortal';
import { NutritionistPortal } from './pages/NutritionistPortal';
import { MinistryAdminDashboard } from './pages/MinistryAdminDashboard';
import { ItAdminDashboard } from './pages/ItAdminDashboard';
import { CitizenPortal } from './pages/CitizenPortal';

// Garde de route par rôle
const RouteProtegee: React.FC<{
  rolesAutorises?: string[];
  children: React.ReactElement;
}> = ({ rolesAutorises, children }) => {
  const { estConnecte, estEnChargement, utilisateur } = useAuth();

  if (estEnChargement) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b' }}>
        Chargement...
      </div>
    );
  }

  if (!estConnecte || !utilisateur) {
    return <Navigate to="/connexion" replace />;
  }

  if (rolesAutorises && !rolesAutorises.includes(utilisateur.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContenu: React.FC = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Accueil public */}
          <Route path="/" element={<WelcomePage />} />

          {/* Connexion unique pour tous les rôles */}
          <Route path="/connexion" element={<LoginPage />} />

          {/* Portail Agent (Campagne & Soins Primaires) */}
          <Route
            path="/agent"
            element={
              <RouteProtegee rolesAutorises={['AGENT_CAMPAGNE', 'AGENT_SOINS_PRIMAIRES', 'ADMIN_IT']}>
                <AgentPortal />
              </RouteProtegee>
            }
          />

          {/* Portail Nutritionniste */}
          <Route
            path="/nutritionniste"
            element={
              <RouteProtegee rolesAutorises={['NUTRITIONNISTE', 'ADMIN_IT']}>
                <NutritionistPortal />
              </RouteProtegee>
            }
          />

          {/* Tableau de bord Ministère de la Santé */}
          <Route
            path="/admin/ministere"
            element={
              <RouteProtegee rolesAutorises={['ADMIN_MINISTERE', 'ADMIN_IT']}>
                <MinistryAdminDashboard />
              </RouteProtegee>
            }
          />

          {/* Portail Administration IT */}
          <Route
            path="/admin/it"
            element={
              <RouteProtegee rolesAutorises={['ADMIN_IT']}>
                <ItAdminDashboard />
              </RouteProtegee>
            }
          />

          {/* Portail Citoyen */}
          <Route
            path="/citoyen"
            element={
              <RouteProtegee rolesAutorises={['CITOYEN', 'ADMIN_IT']}>
                <CitizenPortal />
              </RouteProtegee>
            }
          />

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContenu />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
