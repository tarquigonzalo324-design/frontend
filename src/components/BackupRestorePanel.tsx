import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';

interface BackupInfo {
  tablas: Array<{ nombre: string; registros: number; error?: boolean }>;
  fecha_servidor: string;
}

const BackupRestorePanel: React.FC = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [password, setPassword] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Solo admin/desarrollador puede ver esto
  const isAdmin = user?.rol === 'Administrador' || user?.rol === 'Desarrollador';

  if (!isAdmin) {
    return null;
  }

  const fetchBackupInfo = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.BACKUP_INFO, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackupInfo(res.data);
    } catch (err) {
      console.error('Error al obtener info:', err);
    }
  };

  const handleDescargarBackup = async () => {
    setLoading(true);
    try {
      toast.info('Generando backup...', { autoClose: 2000 });
      
      const response = await axios.get(API_ENDPOINTS.BACKUP_CREAR, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Crear enlace de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Obtener nombre del archivo del header o generar uno
      const contentDisposition = response.headers['content-disposition'];
      let filename = `backup_${new Date().toISOString().split('T')[0]}.sql`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Backup descargado correctamente');
    } catch (err: any) {
      toast.error('Error al generar backup: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.sql')) {
      toast.warning('Por favor selecciona un archivo .sql');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSqlContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const verificarPassword = async (): Promise<boolean> => {
    if (!password) {
      toast.warning('Ingresa tu contraseña');
      return false;
    }
    try {
      await axios.post(API_ENDPOINTS.AUTH_LOGIN, {
        username: user?.username,
        password
      });
      return true;
    } catch {
      toast.error('Contraseña incorrecta');
      return false;
    }
  };

  const handleRestaurar = async () => {
    if (!sqlContent) {
      toast.warning('Primero selecciona un archivo de backup');
      return;
    }

    const passwordOk = await verificarPassword();
    if (!passwordOk) return;

    setLoadingRestore(true);
    try {
      const response = await axios.post(API_ENDPOINTS.BACKUP_RESTAURAR, {
        sql_content: sqlContent,
        confirmar: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(`Restauración completada: ${response.data.comandos_ejecutados} comandos ejecutados`);
        if (response.data.errores > 0) {
          toast.warning(`${response.data.errores} comandos con errores (posibles duplicados)`);
        }
      }

      setShowRestoreModal(false);
      setPassword('');
      setSqlContent('');
      setFileName('');
    } catch (err: any) {
      toast.error('Error al restaurar: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingRestore(false);
    }
  };

  return (
    <>
      <div className="glass-card card-fade">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">Base de Datos</p>
            <h3 className="text-xl font-bold">Backup y Restauración</h3>
            <p className="text-sm text-slate-400">Solo visible para administradores</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Botón Backup */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-white">Descargar Backup</h4>
                <p className="text-xs text-slate-400">Exportar todos los datos</p>
              </div>
            </div>
            <button
              onClick={handleDescargarBackup}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar Backup
                </>
              )}
            </button>
          </div>

          {/* Botón Restore */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-white">Restaurar Backup</h4>
                <p className="text-xs text-slate-400">Importar desde archivo .sql</p>
              </div>
            </div>
            <button
              onClick={() => {
                fetchBackupInfo();
                setShowRestoreModal(true);
              }}
              className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restaurar Backup
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Restauración */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1324] text-white rounded-2xl shadow-2xl border border-white/10 max-w-xl w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300/70">Restauración</p>
                <h3 className="text-xl font-bold">Restaurar Base de Datos</h3>
              </div>
              <button 
                onClick={() => {
                  setShowRestoreModal(false);
                  setPassword('');
                  setSqlContent('');
                  setFileName('');
                }}
                className="text-slate-300 hover:text-amber-200"
              >
                ✕
              </button>
            </div>

            {/* Info actual de BD */}
            {backupInfo && (
              <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs text-amber-200 mb-2">Estado actual de la base de datos:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {backupInfo.tablas.slice(0, 6).map(t => (
                    <div key={t.nombre} className="flex justify-between">
                      <span className="text-slate-400">{t.nombre}:</span>
                      <span className="text-white">{t.registros}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advertencia */}
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>Advertencia:</strong> Esta acción puede sobrescribir datos existentes. 
                Asegúrate de tener un backup reciente antes de continuar.
              </p>
            </div>

            {/* Seleccionar archivo */}
            <div className="space-y-3 mb-4">
              <label className="text-sm font-semibold text-amber-100">Archivo de Backup (.sql)</label>
              <input
                type="file"
                accept=".sql"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-500 file:text-slate-900 file:font-semibold"
              />
              {fileName && (
                <p className="text-sm text-green-400">✓ Archivo seleccionado: {fileName}</p>
              )}
            </div>

            {/* Contraseña */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-semibold text-amber-100">
                Contraseña de {user?.username} (confirmación)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setPassword('');
                  setSqlContent('');
                  setFileName('');
                }}
                className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 hover:border-amber-300/60"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestaurar}
                disabled={loadingRestore || !sqlContent || !password}
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 disabled:opacity-60"
              >
                {loadingRestore ? 'Restaurando...' : 'Confirmar Restauración'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BackupRestorePanel;
