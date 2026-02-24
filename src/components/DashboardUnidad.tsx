import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import CheckLogo from '../assets/Check';
import EnviarIcon from '../assets/enviar';
import CarpetaIcon from '../assets/carpeta';

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
  fecha_respuesta: string | null;
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
  
  // Modal type: recibir, redirigir, responder, ver-respuesta
  const [modalType, setModalType] = useState<'recibir' | 'redirigir' | 'responder' | 'ver-respuesta' | null>(null);
  
  // Para redirigir a múltiples unidades
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<number[]>([]);
  const [busquedaUnidad, setBusquedaUnidad] = useState('');
  const [checkboxes, setCheckboxes] = useState<string[]>([]);
  const [instruccionesAdicionales, setInstruccionesAdicionales] = useState('');
  
  // Para respuestas
  const [respuestaTexto, setRespuestaTexto] = useState('');
  
  // Progreso de envío múltiple
  const [progresoEnvio, setProgresoEnvio] = useState<{total: number, actual: number, mensaje: string}>({ total: 0, actual: 0, mensaje: '' });
  
  // Filtros para la lista de hojas
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busquedaHoja, setBusquedaHoja] = useState('');

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

  // Filtrar hojas
  const hojasFiltradas = useMemo(() => {
    return hojas.filter(h => {
      const matchEstado = filtroEstado === 'todos' || h.estado === filtroEstado;
      const matchBusqueda = !busquedaHoja || 
        h.numero_hr?.toLowerCase().includes(busquedaHoja.toLowerCase()) ||
        h.referencia?.toLowerCase().includes(busquedaHoja.toLowerCase());
      return matchEstado && matchBusqueda;
    });
  }, [hojas, filtroEstado, busquedaHoja]);

  // Filtrar unidades para el selector
  const unidadesFiltradas = useMemo(() => {
    return unidades
      .filter(u => u.id !== currentUser?.unidad_id)
      .filter(u => !busquedaUnidad || u.nombre.toLowerCase().includes(busquedaUnidad.toLowerCase()));
  }, [unidades, busquedaUnidad, currentUser?.unidad_id]);

  const openModal = (envio: HojaRecibida, type: 'recibir' | 'redirigir' | 'responder') => {
    setSelectedEnvio(envio);
    setModalType(type);
    setUnidadesSeleccionadas([]);
    setBusquedaUnidad('');
    setCheckboxes([]);
    setInstruccionesAdicionales('');
    setRespuestaTexto('');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedEnvio(null);
    setMessage({ type: '', text: '' });
    setProgresoEnvio({ total: 0, actual: 0, mensaje: '' });
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

  // Enviar respuesta
  const handleResponder = async () => {
    if (!selectedEnvio) return;
    if (!respuestaTexto.trim()) {
      showMessage('error', 'Debe escribir una respuesta');
      return;
    }
    setProcessing(true);
    try {
      await axios.put(
        API_ENDPOINTS.ENVIOS_RESPONDER(selectedEnvio.id),
        { respuesta: respuestaTexto.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage('success', 'Respuesta enviada correctamente');
      closeModal();
      fetchData();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Error al enviar respuesta');
    } finally {
      setProcessing(false);
    }
  };

  // Redirigir a múltiples unidades
  const handleRedirigir = async () => {
    if (!selectedEnvio) return;
    if (unidadesSeleccionadas.length === 0) {
      showMessage('error', 'Debe seleccionar al menos una unidad destino');
      return;
    }
    
    setProcessing(true);
    setProgresoEnvio({ total: unidadesSeleccionadas.length, actual: 0, mensaje: 'Iniciando...' });
    
    try {
      let enviados = 0;
      let errores: string[] = [];

      for (const unidadId of unidadesSeleccionadas) {
        const unidadDestino = unidades.find(u => u.id === unidadId);
        setProgresoEnvio({ 
          total: unidadesSeleccionadas.length, 
          actual: enviados + 1, 
          mensaje: `Enviando a ${unidadDestino?.nombre || 'unidad'}...` 
        });

        try {
          await axios.put(
            API_ENDPOINTS.ENVIOS_REDIRIGIR(selectedEnvio.id),
            { 
              unidad_destino_id: unidadId, 
              notas: instruccionesAdicionales,
              checkboxes: checkboxes
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          enviados++;
        } catch (err: any) {
          errores.push(`${unidadDestino?.nombre}: ${err.response?.data?.error || 'Error'}`);
        }
      }
      
      if (enviados === unidadesSeleccionadas.length) {
        showMessage('success', `Redirigido a ${enviados} unidad(es) correctamente`);
        closeModal();
        fetchData();
      } else if (enviados > 0) {
        showMessage('success', `Enviado a ${enviados} de ${unidadesSeleccionadas.length} unidades`);
        closeModal();
        fetchData();
      } else {
        showMessage('error', `Error: ${errores.join(', ')}`);
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Error al redirigir');
    } finally {
      setProcessing(false);
      setProgresoEnvio({ total: 0, actual: 0, mensaje: '' });
    }
  };

  const toggleUnidad = (unidadId: number) => {
    setUnidadesSeleccionadas(prev => 
      prev.includes(unidadId) 
        ? prev.filter(id => id !== unidadId)
        : [...prev, unidadId]
    );
  };

  const seleccionarTodasUnidades = () => {
    if (unidadesSeleccionadas.length === unidadesFiltradas.length) {
      setUnidadesSeleccionadas([]);
    } else {
      setUnidadesSeleccionadas(unidadesFiltradas.map(u => u.id));
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-8">
        {/* Header compacto */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-blue-300">Panel de Unidad</h1>
            <p className="text-xs text-[#9ea0a9]">
              {currentUser?.nombre_completo || currentUser?.username}
              {currentUser?.unidad_nombre && <span className="text-blue-400"> • {currentUser.unidad_nombre}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {['enviado', 'recibido', 'respondido', 'redirigido'].map(estado => {
              const counts: Record<string, number> = {
                enviado: hojas.filter(h => h.estado === 'enviado').length,
                recibido: hojas.filter(h => h.estado === 'recibido').length,
                respondido: hojas.filter(h => h.estado === 'respondido').length,
                redirigido: hojas.filter(h => h.estado === 'redirigido').length
              };
              const colors: Record<string, string> = {
                enviado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                recibido: 'bg-green-500/20 text-green-400 border-green-500/30',
                respondido: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                redirigido: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              };
              const labels: Record<string, string> = { enviado: 'Nuevas', recibido: 'Recibidas', respondido: 'Respondidas', redirigido: 'Redirigidas' };
              return (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(filtroEstado === estado ? 'todos' : estado)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                    filtroEstado === estado ? colors[estado] : 'bg-[rgba(255,255,255,0.05)] text-[#9ea0a9] border-transparent hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {labels[estado]} <span className="font-bold">{counts[estado]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {message.text && (
          <div className={`mb-3 px-4 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Buscador */}
        <div className="mb-4">
          <input
            type="text"
            value={busquedaHoja}
            onChange={(e) => setBusquedaHoja(e.target.value)}
            placeholder="Buscar por número o referencia..."
            className="w-full bg-[#1a2236]/50 border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2 text-sm text-white placeholder-[#6b6b6b] focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Tabla de hojas */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1a1f2e]/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] text-[#9ea0a9] text-xs">
                <th className="text-left px-4 py-3 font-medium">H.R.</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Referencia</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Procedencia</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Fechas</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {hojasFiltradas.length > 0 ? hojasFiltradas.map((envio) => {
                const badge = getEstadoBadge(envio.estado);
                return (
                  <tr key={envio.id} className="hover:bg-[rgba(255,255,255,0.02)] transition group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{envio.numero_hr}</span>
                        {envio.prioridad === 'urgente' && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-red-500/30 text-red-400 rounded">!</span>
                        )}
                      </div>
                      <div className="sm:hidden text-xs text-[#8b8b86] mt-0.5 truncate max-w-[150px]">{envio.referencia}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-[#c4c4be] truncate max-w-[200px]">{envio.referencia}</div>
                      {envio.instrucciones?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {envio.instrucciones.slice(0, 2).map((inst: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-amber-500/15 text-amber-300/80 rounded">{inst.split(' ')[0]}</span>
                          ))}
                          {envio.instrucciones.length > 2 && <span className="text-[10px] text-[#6b6b6b]">+{envio.instrucciones.length - 2}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#8b8b86] text-xs">{envio.procedencia}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${badge.className}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[10px] text-[#8b8b86]">
                      <div>Env: {formatDate(envio.fecha_envio).split(',')[0]}</div>
                      {envio.fecha_recepcion && <div className="text-green-400/70">Rec: {formatDate(envio.fecha_recepcion).split(',')[0]}</div>}
                      {envio.fecha_respuesta && <div className="text-purple-400/70">Res: {formatDate(envio.fecha_respuesta).split(',')[0]}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition">
                        {envio.estado === 'enviado' && (
                          <button onClick={() => openModal(envio, 'recibir')} className="p-1.5 text-green-400 hover:bg-green-500/20 rounded-lg transition" title="Marcar recibido">
                            <CheckLogo width={14} height={14} fill="#4ade80" />
                          </button>
                        )}
                        {envio.estado === 'recibido' && (
                          <>
                            <button onClick={() => openModal(envio, 'responder')} className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded-lg transition" title="Responder">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                            </button>
                            <button onClick={() => openModal(envio, 'redirigir')} className="p-1.5 text-orange-400 hover:bg-orange-500/20 rounded-lg transition" title="Redirigir">
                              <EnviarIcon width={14} height={14} fill="#fb923c" />
                            </button>
                          </>
                        )}
                        {envio.respuesta && (
                          <button 
                            onClick={() => { setSelectedEnvio(envio); setModalType('ver-respuesta' as any); }}
                            className="p-1.5 text-purple-400/60 hover:bg-purple-500/20 rounded-lg transition" 
                            title="Ver respuesta"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#6b6b6b]">
                    <CarpetaIcon width={32} height={32} fill="#6b6b6b" className="mx-auto mb-2 opacity-50" />
                    <div className="text-sm">{busquedaHoja || filtroEstado !== 'todos' ? 'Sin resultados' : 'No hay documentos'}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-[#6b6b6b] text-right">{hojasFiltradas.length} de {hojas.length} documentos</div>
      </div>

      {/* Modal Marcar Recibido */}
      {modalType === 'recibir' && selectedEnvio && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-[#1a1f2e] rounded-xl p-5 w-full max-w-sm border border-[rgba(255,255,255,0.1)] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckLogo width={20} height={20} fill="#4ade80" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Confirmar Recepción</h3>
                <p className="text-xs text-[#9ea0a9]">H.R. {selectedEnvio.numero_hr}</p>
              </div>
            </div>
            <p className="text-sm text-[#c4c4be] mb-4">¿Confirma que ha recibido este documento?</p>
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 px-3 py-2 text-sm bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white rounded-lg transition">Cancelar</button>
              <button onClick={handleMarcarRecibido} disabled={processing} className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50">
                {processing ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Responder */}
      {modalType === 'responder' && selectedEnvio && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-[#1a1f2e] rounded-xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto border border-[rgba(255,255,255,0.1)] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Responder</h3>
                  <p className="text-xs text-[#9ea0a9]">H.R. {selectedEnvio.numero_hr} • {selectedEnvio.referencia?.slice(0, 30)}...</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-[#6b6b6b] hover:text-white transition">✕</button>
            </div>

            {selectedEnvio.instrucciones?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {selectedEnvio.instrucciones.map((inst: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 text-[10px] bg-amber-500/15 text-amber-300/80 rounded">{inst}</span>
                ))}
              </div>
            )}
            
            <textarea 
              value={respuestaTexto} 
              onChange={(e) => setRespuestaTexto(e.target.value)} 
              placeholder="Escriba su respuesta o informe..." 
              className="w-full h-32 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-sm text-white placeholder-[#6b6b6b] resize-none focus:outline-none focus:border-purple-500/50 mb-4" 
              autoFocus
            />
            
            <div className="flex gap-2">
              <button onClick={closeModal} className="flex-1 px-3 py-2 text-sm bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white rounded-lg transition">Cancelar</button>
              <button onClick={handleResponder} disabled={processing || !respuestaTexto.trim()} className="flex-1 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50">
                {processing ? 'Enviando...' : 'Enviar Respuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Respuesta */}
      {modalType === 'ver-respuesta' && selectedEnvio && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-[#1a1f2e] rounded-xl p-5 w-full max-w-md border border-[rgba(255,255,255,0.1)] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">Respuesta Enviada</h3>
              <button onClick={closeModal} className="text-[#6b6b6b] hover:text-white transition">✕</button>
            </div>
            <div className="text-xs text-[#9ea0a9] mb-3">H.R. {selectedEnvio.numero_hr} • {formatDate(selectedEnvio.fecha_respuesta)}</div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-white">
              {selectedEnvio.respuesta}
            </div>
          </div>
        </div>
      )}

      {/* Modal Redirigir a Múltiples Unidades */}
      {modalType === 'redirigir' && selectedEnvio && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-[#1a1f2e] rounded-xl p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-[rgba(255,255,255,0.1)] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <EnviarIcon width={16} height={16} fill="#fb923c" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Redirigir Documento</h3>
                  <p className="text-xs text-[#9ea0a9]">H.R. {selectedEnvio.numero_hr}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-[#6b6b6b] hover:text-white transition">✕</button>
            </div>

            {processing && progresoEnvio.total > 0 && (
              <div className="mb-4 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-orange-300">{progresoEnvio.mensaje}</span>
                  <span className="text-orange-400">{progresoEnvio.actual}/{progresoEnvio.total}</span>
                </div>
                <div className="w-full bg-[#1a2236] rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${(progresoEnvio.actual / progresoEnvio.total) * 100}%` }}></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Columna izquierda: Unidades */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#9ea0a9]">Destino ({unidadesSeleccionadas.length})</label>
                  <button onClick={seleccionarTodasUnidades} className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded hover:bg-orange-500/30 transition">
                    {unidadesSeleccionadas.length === unidadesFiltradas.length ? 'Ninguna' : 'Todas'}
                  </button>
                </div>
                <input
                  type="text"
                  value={busquedaUnidad}
                  onChange={(e) => setBusquedaUnidad(e.target.value)}
                  placeholder="Buscar unidad..."
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 mb-2 text-xs text-white placeholder-[#6b6b6b] focus:outline-none focus:border-orange-500/50"
                />
                <div className="bg-[#0f1116]/50 border border-[rgba(255,255,255,0.06)] rounded-lg p-1.5 max-h-40 overflow-y-auto space-y-0.5">
                  {unidadesFiltradas.map(u => (
                    <label key={u.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition text-xs ${unidadesSeleccionadas.includes(u.id) ? 'bg-orange-500/20 text-orange-300' : 'hover:bg-[rgba(255,255,255,0.05)] text-white'}`}>
                      <input type="checkbox" checked={unidadesSeleccionadas.includes(u.id)} onChange={() => toggleUnidad(u.id)} className="w-3 h-3 rounded border-orange-500/50 bg-transparent text-orange-500 focus:ring-0" />
                      {u.nombre}
                    </label>
                  ))}
                </div>
              </div>

              {/* Columna derecha: Instrucciones */}
              <div>
                <label className="text-xs text-[#9ea0a9] block mb-2">Instrucciones</label>
                <div className="grid grid-cols-1 gap-1 mb-3">
                  {opcionesCheckbox.map((opcion) => (
                    <label key={opcion} className="flex items-center gap-2 text-xs text-[#e8e8e3] cursor-pointer hover:text-white">
                      <input type="checkbox" checked={checkboxes.includes(opcion)} onChange={() => toggleCheckbox(opcion)} className="w-3 h-3 rounded border-gray-600 text-orange-500 focus:ring-0" />
                      {opcion}
                    </label>
                  ))}
                </div>
                <textarea 
                  value={instruccionesAdicionales} 
                  onChange={(e) => setInstruccionesAdicionales(e.target.value)} 
                  placeholder="Notas adicionales..." 
                  className="w-full h-16 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-xs text-white placeholder-[#6b6b6b] resize-none focus:outline-none focus:border-orange-500/50" 
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button onClick={closeModal} className="flex-1 px-3 py-2 text-sm bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white rounded-lg transition">Cancelar</button>
              <button onClick={handleRedirigir} disabled={processing || unidadesSeleccionadas.length === 0} className="flex-1 px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50">
                {processing ? 'Enviando...' : `Redirigir (${unidadesSeleccionadas.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardUnidad;
