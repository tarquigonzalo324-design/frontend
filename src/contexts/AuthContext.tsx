import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axiosAuth from '../config/axiosAuth';
import { API_ENDPOINTS, apiConfig } from '../config/api';

interface User {
  id: number;
  username: string;
  nombre_completo: string;
  rol?: string;
  unidad_id?: number;
  unidad_nombre?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  canEdit: () => boolean;
  canCreate: () => boolean;
  canRead: () => boolean;
  isAdmin: () => boolean;
  isDeveloper: () => boolean;
  isOperadorUnidad: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configurar axios baseURL
  useEffect(() => {
    axiosAuth.defaults.baseURL = apiConfig.baseURL;
  }, []);

  // Verificar token al cargar la app (sessionStorage)
  useEffect(() => {
    console.log('[Auth] Verificando sessionStorage...');
    const storedToken = sessionStorage.getItem('sedeges_token');
    const storedUser = sessionStorage.getItem('sedeges_user');

    console.log('[Auth] Token en sessionStorage:', storedToken ? 'existe' : 'no existe');
    console.log('[Auth] User en sessionStorage:', storedUser ? 'existe' : 'no existe');

    if (storedToken) {
      setToken(storedToken);
      console.log('[Auth] Token seteado en estado');
    }
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        console.log('[Auth] User seteado en estado:', parsed);
      } catch (err) {
        console.warn('No se pudo parsear el usuario en sessionStorage');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axiosAuth.post(
        API_ENDPOINTS.AUTH_LOGIN,
        { username, password },
        { withCredentials: true }
      );

      const { token: newToken, usuario: userData } = response.data;
      
      console.log('[Auth] Login exitoso, datos recibidos:', { 
        token: newToken?.substring(0, 20) + '...', 
        usuario: userData 
      });
      
      // Guardar en sessionStorage primero
      sessionStorage.setItem('sedeges_token', newToken);
      sessionStorage.setItem('sedeges_user', JSON.stringify(userData));
      
      // Luego actualizar el estado
      setToken(newToken);
      setUser(userData);
      
      console.log('[Auth] Estado actualizado correctamente');
      
      return true;
    } catch (error: any) {
      console.error('[Auth] Error en login:', error.response?.data || error.message);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('sedeges_token');
    sessionStorage.removeItem('sedeges_user');
  };

  // Funciones de autorización
  const canEdit = (): boolean => {
    const rol = (user?.rol || '').toLowerCase();
    return rol.includes('desarrollador') || rol.includes('admin');
  };

  const canCreate = (): boolean => {
    const rol = (user?.rol || '').toLowerCase();
    return rol.includes('desarrollador') || rol.includes('admin');
  };

  const canRead = (): boolean => {
    return !!user;
  };

  const isAdmin = (): boolean => {
    const rol = (user?.rol || '').toLowerCase();
    return rol.includes('admin') || rol.includes('desarrollador');
  };

  const isDeveloper = (): boolean => {
    const rol = (user?.rol || '').toLowerCase();
    return rol.includes('desarrollador');
  };

  const isOperadorUnidad = (): boolean => {
    const rol = (user?.rol || '').toLowerCase();
    return rol.includes('operador');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    canEdit,
    canCreate,
    canRead,
    isAdmin,
    isDeveloper,
    isOperadorUnidad
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};