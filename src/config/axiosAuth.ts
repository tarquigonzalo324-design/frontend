import axios from 'axios';
import { apiConfig } from './api';

// Crear instancia de Axios configurada para autenticación
const axiosAuth = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  withCredentials: true
});

// Interceptor que agrega el token en CADA request automáticamente
axiosAuth.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('sedeges_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores
axiosAuth.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      console.error('🔐 Token inválido o expirado');
      sessionStorage.removeItem('sedeges_token');
      sessionStorage.removeItem('sedeges_user');
      // Redirigir al login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosAuth;
