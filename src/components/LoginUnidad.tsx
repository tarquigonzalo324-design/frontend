import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import SedegesLogo from './SedegesLogo';

const LoginUnidad: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Por favor ingrese usuario y contraseña');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(API_ENDPOINTS.AUTH_LOGIN, {
        username,
        password
      });

      const { token, usuario } = response.data;
      
      console.log('[LoginUnidad] Login exitoso:', usuario);

      // Verificar que sea operador de unidad
      const rol = (usuario.rol || '').toLowerCase();
      if (!rol.includes('operador')) {
        toast.error('Este login es solo para operadores de unidad');
        setIsLoading(false);
        return;
      }

      // Guardar en sessionStorage
      sessionStorage.setItem('sedeges_token', token);
      sessionStorage.setItem('sedeges_user', JSON.stringify(usuario));

      toast.success(`¡Bienvenido ${usuario.nombre_completo}!`);
      
      // Redirigir al dashboard de unidad
      window.location.href = '/dashboard-unidad';

    } catch (error: any) {
      console.error('Error en login:', error);
      if (error.response?.status === 401) {
        toast.error('Usuario o contraseña incorrectos');
      } else {
        toast.error('Error de conexión. Intente nuevamente.');
      }
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c] relative overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-500/20 blur-[110px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-blue-400/15 blur-[120px] animate-ping"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card glow effect */}
        <div className="absolute -inset-[2px] rounded-[28px] bg-gradient-to-br from-blue-500 via-blue-400 to-blue-600 opacity-80 blur-[2px]"></div>

        <div className="relative bg-[#1a1f2e]/95 backdrop-blur-xl rounded-[24px] shadow-2xl p-10 border border-blue-500/30">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#0f1116] border border-blue-500/40">
              <SedegesLogo width={70} height={70} className="mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-blue-400 tracking-wide mt-4 mb-1">
              Portal de Unidad
            </h1>
            <p className="text-sm text-[#9ea0a9]">Ingreso para Operadores de Unidad</p>
            <div className="w-20 h-1 rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 mx-auto mt-4"></div>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfcfc7] block">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ingrese su usuario"
                className="w-full px-4 py-3 bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg 
                         text-white placeholder:text-[#6b7280] 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfcfc7] block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ingrese su contraseña"
                  className="w-full px-4 py-3 pr-12 bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg 
                           text-white placeholder:text-[#6b7280] 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-400 hover:text-blue-300"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 
                       text-white font-bold text-lg rounded-lg transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Ingresando...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Ingresar
                </span>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <Link 
              to="/login" 
              className="block text-center text-sm text-[#9ea0a9] hover:text-blue-400 transition-colors"
            >
              ← Volver al login principal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginUnidad;
