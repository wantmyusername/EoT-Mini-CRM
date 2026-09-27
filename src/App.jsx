import React, { useEffect } from 'react';
// IMPORTANTE: Aquí importamos todo lo necesario para las rutas
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Importamos tus páginas
import ToursModule from './pages/ToursModule';
import Login from './pages/Login';
import DashboardMenu from './pages/DashboardMenu';
import TransportModule from './pages/TransportModule';
import SiteHistory from './pages/SiteHistory';
import FlotillaPage from './pages/FlotillaPage';



// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('crm_user');
  return isAuth ? children : <Navigate to="/" />;
};

// Robot cambiador de títulos
const TitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    switch (location.pathname) {
      case '/': document.title = 'Acceso | CRM Exclusive'; break;
      case '/menu': document.title = 'Menú Principal | CRM'; break;
      case '/tours': document.title = 'Cotizador de Tours | CRM'; break;
      case '/minicrm': document.title = 'Gestión de Clientes | EoT'; break;
      case '/flotilla': document.title = 'Flotilla'; break;
      default: document.title = 'CRM Exclusive On Trip';
    }
  }, [location]);

  return null;
};

function App() {
  return (
    <BrowserRouter basename="/crm">
      <TitleUpdater />
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Rutas Protegidas */}
        <Route path="/menu" element={
          <ProtectedRoute><DashboardMenu /></ProtectedRoute>
        } />
        <Route path="/tours" element={
          <ProtectedRoute><ToursModule /></ProtectedRoute>
        } />
        <Route path="/minicrm" element={
          <ProtectedRoute><TransportModule /></ProtectedRoute>
        } />
        <Route path="/flotilla" element={
          <ProtectedRoute><FlotillaPage /></ProtectedRoute>
        } />
        <Route path="/secret-history" element={
          <ProtectedRoute><SiteHistory /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
