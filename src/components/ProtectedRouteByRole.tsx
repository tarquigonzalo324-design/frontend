import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteByRoleProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

const ProtectedRouteByRole = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/dashboard-unidad' 
}: ProtectedRouteByRoleProps) => {
  const { user, isLoading } = useAuth();
  
  // También verificar sessionStorage como fallback
  const storedUser = sessionStorage.getItem('sedeges_user');
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1116] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-[#cfcfc7]">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (currentUser.rol || '').toLowerCase();
  const isAllowed = allowedRoles.some(role => 
    userRole.includes(role.toLowerCase()) || 
    userRole === role.toLowerCase()
  );

  console.log('[ProtectedRoute] Check:', { userRole, allowedRoles, isAllowed });

  if (!isAllowed) {
    if (userRole.includes('operador')) {
      return <Navigate to="/dashboard-unidad" replace />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRouteByRole;
