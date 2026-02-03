import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/Login';
import LoginUnidad from '../components/LoginUnidad';
import Dashboard from '../components/Dashboard';
import DashboardUnidad from '../components/DashboardUnidad';
import NuevaHojaRuta from '../components/NuevaHojaRuta';
import ProtectedRoute from '../components/ProtectedRoute';
import ProtectedRouteByRole from '../components/ProtectedRouteByRole';
import RegistrosPage from '../pages/RegistrosPageClean';
import HistorialPage from '../pages/HistorialPage';
import NotificacionesPage from '../pages/NotificacionesPage';
import EnviarPage from '../pages/EnviarPage';
import GestionEnvios from '../pages/GestionEnvios';
import GestionUnidades from '../pages/GestionUnidades';
import GestionUsuarios from '../pages/GestionUsuarios';
import EnviarAUnidad from '../pages/EnviarAUnidad';
import DashboardHojaRuta from '../components/DashboardHojaRuta';
import DashboardWithTopNav from '../components/DashboardWithTopNav';
import TopNavUnidad from '../components/TopNavUnidad';
import ColorPalettePreview from '../components/ColorPalettePreview';
import { useAuth } from '../contexts/AuthContext';

const AppRoutes = () => {
  const { isOperadorUnidad: _isOperadorUnidad } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login-unidad" element={<LoginUnidad />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <Dashboard />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/dashboard-unidad" 
        element={
          <ProtectedRoute>
            <TopNavUnidad>
              <DashboardUnidad />
            </TopNavUnidad>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/nueva-hoja" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <NuevaHojaRuta />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/registros" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <RegistrosPage />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />

      <Route
        path="/hoja/:id"
        element={
          <ProtectedRoute>
            <DashboardWithTopNav>
              <DashboardHojaRuta />
            </DashboardWithTopNav>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/historial" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <HistorialPage />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/notificaciones" 
        element={
          <ProtectedRoute>
            <DashboardWithTopNav>
              <NotificacionesPage />
            </DashboardWithTopNav>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/enviar" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <EnviarPage />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/gestion-envios" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <GestionEnvios />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/unidades" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <GestionUnidades />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/usuarios" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <GestionUsuarios />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/enviar-a-unidad" 
        element={
          <ProtectedRoute>
            <ProtectedRouteByRole allowedRoles={['administrador', 'desarrollador', 'admin']}>
              <DashboardWithTopNav>
                <EnviarAUnidad />
              </DashboardWithTopNav>
            </ProtectedRouteByRole>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/color-palette-preview" 
        element={<ColorPalettePreview />}
      />
    </Routes>
  );
};

export default AppRoutes;