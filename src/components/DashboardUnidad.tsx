import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import CheckLogo from '../assets/Check';

import EnviarIcon from '../assets/enviar';
import CarpetaIcon from '../assets/carpeta';
import CalendarioIcon from '../assets/calendario';



interface HojaRecibida {
  id: number;
  hoja_id: number;
  numero_hr: string;
  referencia: string;
  procedencia: string;
  prioridad: string;
  estado: string;
  fecha_envio: string;
  fecha_recepcion: string | null;
  respuesta: string | null;
  instrucciones: any;
  observaciones: string | null;
  destinatario_nombre: string;
}

interface Unidad {
  id: number;
  nombre: string;
  descripcion: string;
}

const opcionesCheckbox = [
  'Para su conocimiento',
  'Preparar respuesta o informe',
  'Analizar y emitir opinión',
  'Procesar de acuerdo a normas',
  'Dar curso si legalmente es procedente',
  'Elaborar Resolución',
  'Elaborar Contrato',
  'Archivar'
];

const DashboardUnidad: React.FC = () => {
  const { user, token: contextToken } = useAuth();
  
  const token = contextToken || sessionStorage.getItem('sedeges_token');
  const currentUser = user || (() => {
    try {
      const stored = sessionStorage.getItem('sedeges_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();
  
  const [hojas, setHojas] = useState<HojaRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnvio, setSelectedEnvio] = useState<HojaRecibida | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [modalType, setModalType] = useState<'recibir' | 'redirigir' | null>(null);
  const [unidadDestino, setUnidadDestino] = useState('');
  const [checkboxes, setCheckboxes] = useState<string[]>([]);
  const [instruccionesAdicionales, setInstruccionesAdicionales] = useState('');

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const timestamp = Date.now();
      const [enviosRes, unidadesRes] = await Promise.all([
        axios.get(`${API_ENDPOINTS.ENVIOS_MI_UNIDAD}?_t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_ENDPOINTS.UNIDADES}?_t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setHojas(enviosRes.data?.envios || []);
      setUnidades(unidadesRes.data?.unidades || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const openModal = async (envio: HojaRecibida, type: 'recibir' | 'redirigir') => {
    setSelectedEnvio(envio);
    setModalType(type);
    setUnidadDestino('');
    setCheckboxes([]);
    setInstruccionesAdicionales('');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedEnvio(null);
    setMessage({ type: '', text: '' });
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleMarcarRecibido = async () => {
    if (!selectedEnvio) return;
    setProcessing(true);
    try {
      await axios.put(
        API_ENDPOINTS.ENVIOS_RECIBIR(selectedEnvio.id),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage('success', 'Hoja de ruta marcada como recibida');
      closeModal();
      fetchData();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Error al marcar como recibido');
    } finally {
      setProcessing(false);
    }
  };

  const handleRedirigir = async () => {
    if (!selectedEnvio || !unidadDestino) {
      showMessage('error', 'Debe seleccionar una unidad destino');
      return;
    }
    setProcessing(true);
    try {
      await axios.put(
        API_ENDPOINTS.ENVIOS_REDIRIGIR(selectedEnvio.id),
        { 
          unidad_destino_id: parseInt(unidadDestino), 
          notas: instruccionesAdicionales,
          checkboxes: checkboxes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage('success', 'Hoja redirigida correctamente');
      closeModal();
      fetchData();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Error al redirigir');
    } finally {
      setProcessing(false);
    }
  };

  const toggleCheckbox = (opcion: string) => {
    setCheckboxes(prev => 
      prev.includes(opcion) 
        ? prev.filter(c => c !== opcion)
        : [...prev, opcion]
    );
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { bg: string; text: string; label: string }> = {
      pendiente: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pendiente' },
      enviado: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Nuevo' },
      recibido: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Recibido' },
      respondido: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Respondido' },
      redirigido: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Redirigido' }
    };
    const style = estados[estado] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: estado };
    return { className: `${style.bg} ${style.text}`, label: style.label };
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-BO', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1116]">
        <div className="text-center text-[#cfcfc7]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm">Cargando panel de unidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#e8e8e3] bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-300 tracking-tight mb-2">PANEL DE UNIDAD</h1>
          <p className="text-[#9ea0a9]">
            Bienvenido, {currentUser?.nombre_completo || currentUser?.username}
            {currentUser?.unidad_nombre && (
              <span className="ml-2 text-blue-400 font-medium">• {currentUser.unidad_nombre}</span>
            )}
          </p>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
            <div className="text-sm text-blue-300 mb-1">Nuevas</div>
            <div className="text-3xl font-bold text-blue-400">{hojas.filter(h => h.estado === 'enviado').length}</div>
          </div>
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
            <div className="text-sm text-green-300 mb-1">Recibidas</div>
            <div className="text-3xl font-bold text-green-400">{hojas.filter(h => h.estado === 'recibido').length}</div>
          </div>
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5">
            <div className="text-sm text-purple-300 mb-1">Respondidas</div>
            <div className="text-3xl font-bold text-purple-400">{hojas.filter(h => h.estado === 'respondido').length}</div>
          </div>
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
            <div className="text-sm text-orange-300 mb-1">Redirigidas</div>
            <div className="text-3xl font-bold text-orange-400">{hojas.filter(h => h.estado === 'redirigido').length}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#1a1f2e]/50">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <h2 className="text-lg font-semibold text-white">Hojas de Ruta Recibidas</h2>
          </div>
          
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {hojas.length > 0 ? hojas.map((envio) => {
              const badge = getEstadoBadge(envio.estado);
              return (
                <div key={envio.id} className="px-6 py-4 hover:bg-[rgba(255,255,255,0.03)] transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-white">H.R. {envio.numero_hr}</span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${badge.className}`}>{badge.label}</span>
                        {envio.prioridad === 'urgente' && (
                          <span className="px-2 py-0.5 text-xs bg-red-500/30 text-red-400 rounded">URGENTE</span>
                        )}
                      </div>
                      <div className="text-sm text-[#c4c4be] mb-1">{envio.referencia}</div>
                      <div className="text-xs text-[#8b8b86] mb-2">Procedencia: {envio.procedencia}</div>
                      
                      <div className="flex flex-wrap gap-4 text-xs text-[#9ea0a9]">
                        <span className="flex items-center gap-1"><CalendarioIcon width={14} height={14} fill="#9ea0a9" /> Enviado: {formatDate(envio.fecha_envio)}</span>
                        {envio.fecha_recepcion && (
                          <span className="text-green-400 flex items-center gap-1"><CheckLogo width={14} height={14} fill="#4ade80" /> Recibido: {formatDate(envio.fecha_recepcion)}</span>
                        )}
                      </div>
                      
                      {envio.instrucciones && envio.instrucciones.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {envio.instrucciones.map((inst: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded">{inst}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {envio.estado === 'enviado' && (
                        <button onClick={() => openModal(envio, 'recibir')} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2">
                          <CheckLogo width={16} height={16} fill="#fff" /> Marcar Recibido
                        </button>
                      )}
                      
                      {envio.estado === 'recibido' && (
                        <button onClick={() => openModal(envio, 'redirigir')} className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition flex items-center gap-2">
                          <EnviarIcon width={16} height={16} fill="#fff" /> Redirigir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="px-6 py-12 text-center text-[#9ea0a9]">
                <div className="flex justify-center mb-3"><CarpetaIcon width={48} height={48} fill="#9ea0a9" /></div>
                <div className="text-lg">No hay hojas de ruta asignadas a tu unidad</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Marcar Recibido */}
      {modalType === 'recibir' && selectedEnvio && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 w-full max-w-md border border-[rgba(255,255,255,0.1)]">
            <h3 className="text-xl font-semibold text-white mb-4">Confirmar Recepción</h3>
            <div className="mb-4 p-4 bg-[rgba(255,255,255,0.05)] rounded-lg">
              <div className="text-lg text-blue-300 font-medium">H.R. {selectedEnvio.numero_hr}</div>
              <div className="text-sm text-[#9ea0a9]">{selectedEnvio.referencia}</div>
            </div>
            <p className="text-[#c4c4be] mb-6">¿Confirma que ha recibido esta hoja de ruta? La fecha de recepción quedará registrada.</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-3 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white rounded-lg transition">Cancelar</button>
              <button onClick={handleMarcarRecibido} disabled={processing} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? 'Procesando...' : <><CheckLogo width={16} height={16} fill="#fff" /> Confirmar Recibido</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Redirigir */}
      {modalType === 'redirigir' && selectedEnvio && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[rgba(255,255,255,0.1)]">
            <h3 className="text-xl font-semibold text-white mb-4">Redirigir a Otra Unidad</h3>
            <div className="mb-4 p-4 bg-[rgba(255,255,255,0.05)] rounded-lg">
              <div className="text-lg text-orange-300 font-medium">H.R. {selectedEnvio.numero_hr}</div>
              <div className="text-sm text-[#9ea0a9]">{selectedEnvio.referencia}</div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-[#c4c4be] mb-2">Unidad Destino *</label>
              <select value={unidadDestino} onChange={(e) => setUnidadDestino(e.target.value)} className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-orange-500">
                <option value="">Seleccionar unidad...</option>
                {unidades.filter(u => u.id !== currentUser?.unidad_id).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-[#c4c4be] mb-2">Instrucciones</label>
              <div className="grid grid-cols-2 gap-2">
                {opcionesCheckbox.map((opcion) => (
                  <label key={opcion} className="flex items-center gap-2 text-sm text-[#e8e8e3] cursor-pointer hover:text-white">
                    <input type="checkbox" checked={checkboxes.includes(opcion)} onChange={() => toggleCheckbox(opcion)} className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" />
                    {opcion}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-[#c4c4be] mb-2">Instrucciones Adicionales</label>
              <textarea value={instruccionesAdicionales} onChange={(e) => setInstruccionesAdicionales(e.target.value)} placeholder="Notas o instrucciones adicionales..." className="w-full h-24 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white placeholder-[#6b6b6b] resize-none focus:outline-none focus:border-orange-500" />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 px-4 py-3 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white rounded-lg transition">Cancelar</button>
              <button onClick={handleRedirigir} disabled={processing || !unidadDestino} className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? 'Redirigiendo...' : <><EnviarIcon width={16} height={16} fill="#fff" /> Redirigir Hoja</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardUnidad;
