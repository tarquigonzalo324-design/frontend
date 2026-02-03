import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import sedegesLogo from '../assets/sedeges.png';

interface TopNavUnidadProps {
  children: React.ReactNode;
}

const TopNavUnidad: React.FC<TopNavUnidadProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c]">
      <header className="bg-[rgba(15,17,22,0.95)] border-b border-[rgba(255,255,255,0.06)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={sedegesLogo} alt="SEDEGES" className="h-10 w-auto" />
              <div>
                <span className="text-white font-semibold">SEDEGES</span>
                <span className="text-[#9ea0a9] text-sm ml-2">Panel de Unidad</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard-unidad')}
                className="px-3 py-2 text-sm text-[#cfcfc7] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition"
              >
                Inicio
              </button>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#cfcfc7] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-medium">
                    {(user?.nombre_completo || user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block">{user?.nombre_completo || user?.username}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1a1f2e] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                      <p className="text-sm text-white font-medium">{user?.nombre_completo}</p>
                      <p className="text-xs text-[#9ea0a9]">@{user?.username}</p>
                      <p className="text-xs text-amber-400 mt-1">Operador Unidad</p>
                      {user?.unidad_nombre && (
                        <p className="text-xs text-blue-400 mt-0.5">{user.unidad_nombre}</p>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-[rgba(255,255,255,0.05)] transition"
                    >
                      Cerrar Sesion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  );
};

export default TopNavUnidad;
