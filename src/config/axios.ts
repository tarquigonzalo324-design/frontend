import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { apiConfig } from './api';
import logger from '../utils/logger';

// Crear instancia de Axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  withCredentials: apiConfig.withCredentials,
  headers: apiConfig.headers
});

// Interceptor de request
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Obtener token del sessionStorage y agregarlo a cada request
    const token = sessionStorage.getItem('sedeges_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    logger.debug('🔵 REQUEST', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasAuth: !!config.headers?.Authorization,
      timestamp: new Date().toISOString()
    });
    return config;
  },
  (error) => {
    logger.error('[Request] ERROR', error);
    return Promise.reject(error);
  }
);

// Interceptor de response
axiosInstance.interceptors.response.use(
  (response) => {
    logger.debug('[Response] OK', {
      status: response.status,
      url: response.config.url,
      dataLength: response.data ? Object.keys(response.data).length : 0
    });
    return response;
  },
  (error: AxiosError) => {
    // Manejar errores específicos
    if (error.response?.status === 401) {
      logger.warn('[Auth] Unauthorized - Token expirado o inválido');
      // Aquí iría la lógica para redirigir a login
      // dispatch(logout()) o similar
    } else if (error.response?.status === 403) {
      logger.warn('[Auth] Forbidden - Acceso denegado');
    } else if (error.response?.status === 404) {
      logger.warn('[HTTP] Not Found', { url: error.config?.url });
    } else if (error.response?.status === 500) {
      logger.error('[Server] Error', { message: error.response.data });
    } else if (!error.response) {
      logger.error('[Network] Error', { message: error.message });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
