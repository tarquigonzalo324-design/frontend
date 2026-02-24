import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading, token: _token } = useAuth();

  // También verificar sessionStorage como fallback
  const storedToken = sessionStorage.getItem('sedeges_token');
  const storedUser = sessionStorage.getItem('sedeges_user');
  
  const hasValidSession = !!(user || (storedToken && storedUser));

  console.log('[ProtectedRoute] Estado:', { 
    isLoading, 
    hasUser: !!user,
    hasStoredToken: !!storedToken,
    hasStoredUser: !!storedUser,
    hasValidSession
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1116] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-[#cfcfc7]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    console.log('[ProtectedRoute] Redirigiendo a login (no hay sesión válida)');
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] Acceso permitido');
  return <>{children}</>;
};

export default ProtectedRoute;