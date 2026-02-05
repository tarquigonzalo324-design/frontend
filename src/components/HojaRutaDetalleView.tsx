import React, { useEffect, useRef, useState } from 'react';
import axiosAuth from '../config/axiosAuth';
import axios from 'axios';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import HojaRutaPreview from './HojaRutaPreview';

import DescargarIcon from '../assets/descargar';
import LupayIcon from '../assets/lupay';
import EditarIcon from '../assets/editar';
import PdfIcon from '../assets/pdf';
import VolverIcon from '../assets/anterior';

interface HojaRutaDetalleViewProps {
  hoja: any;
  onBack: () => void;
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

const HojaRutaDetalleView: React.FC<HojaRutaDetalleViewProps> = ({ hoja, onBack }) => {
  const { token, canEdit, user } = useAuth();

  // Funciones de permisos locales basadas en rol
  const canDelete = () => user?.rol === 'administrador' || user?.rol === 'desarrollador';
  const canUnfinalize = () => user?.rol === 'administrador' || user?.rol === 'desarrollador';

  const [hojaCompleta, setHojaCompleta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);

  const [formEdicion, setFormEdicion] = useState({
    numero_hr: '',
    nombre_solicitante: '',
    referencia: '',
    procedencia: '',
    prioridad: 'rutinario',
    fecha_limite: '',
    fecha_ingreso: '',
    cite: '',
    numero_fojas: '',
    observaciones: ''
  });

  const [destinosEditables, setDestinosEditables] = useState<string[]>([]);
  const [destinoNuevo, setDestinoNuevo] = useState('');

  const [passwordSeguro, setPasswordSeguro] = useState('');
  const [passwordFinalizar, setPasswordFinalizar] = useState('');
  const [verificandoPassword, setVerificandoPassword] = useState(false);
  const [eliminandoHR, setEliminandoHR] = useState(false);
  const [estadoObjetivo, setEstadoObjetivo] = useState<'finalizar' | 'reabrir'>('finalizar');

  // Estados para enviar a unidad
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [enviandoAUnidad, setEnviandoAUnidad] = useState(false);
  const [envioForm, setEnvioForm] = useState({
    destino_id: '',
    fecha_salida: '',
    checkboxes: [] as string[],
    instrucciones: ''
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHojaCompleta();
    fetchUnidades();
  }, [hoja?.id, token]);

  // Inicializar fecha de salida al cargar
  useEffect(() => {
    const hoy = new Date();
    const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    setEnvioForm(prev => ({ ...prev, fecha_salida: fechaLocal }));
  }, []);

  const fetchUnidades = async () => {
    try {
      const res = await axiosAuth.get(API_ENDPOINTS.UNIDADES);
      setUnidades(res.data?.unidades || []);
    } catch (err) {
      console.error('Error al cargar unidades:', err);
    }
  };

  const toggleCheckbox = (opcion: string) => {
    const nuevosCheckboxes = envioForm.checkboxes.includes(opcion)
      ? envioForm.checkboxes.filter(c => c !== opcion)
      : [...envioForm.checkboxes, opcion];
    setEnvioForm({ ...envioForm, checkboxes: nuevosCheckboxes });
  };

  const handleEnviarAUnidad = async () => {
    if (!envioForm.destino_id) {
      toast.warning('Seleccione una unidad de destino');
      return;
    }
    if (!hojaCompleta) return;

    setEnviandoAUnidad(true);
    try {
      const unidadDestino = unidades.find(u => u.id === parseInt(envioForm.destino_id));
      await axios.post(
        API_ENDPOINTS.ENVIAR_A_UNIDAD,
        {
          hoja_id: hojaCompleta.id,
          unidad_id: parseInt(envioForm.destino_id),
          observaciones: envioForm.instrucciones,
          instrucciones: envioForm.checkboxes,
          auto_fill_seccion: true,
          fecha_enviado: envioForm.fecha_salida,
          destino: unidadDestino?.nombre || '',
          destinos_checkboxes: envioForm.checkboxes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Hoja de ruta enviada a ${unidadDestino?.nombre}`);
      
      // Limpiar formulario
      const hoy = new Date();
      const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      setEnvioForm({
        destino_id: '',
        fecha_salida: fechaLocal,
        checkboxes: [],
        instrucciones: ''
      });
      
      // Recargar datos
      fetchHojaCompleta();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al enviar a unidad');
    } finally {
      setEnviandoAUnidad(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchHojaCompleta = async () => {
    if (!hoja?.id) {
      setError('No se proporcionó un ID válido de hoja de ruta');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await axiosAuth.get(API_ENDPOINTS.HOJAS_RUTA_DETALLE(Number(hoja.id)));
      const payload = res.data?.hoja || res.data?.data || res.data;
      setHojaCompleta(payload);
      setDestinosEditables(Array.isArray(payload?.destinos) ? payload.destinos : []);
      setFormEdicion({
        numero_hr: payload?.numero_hr || '',
        nombre_solicitante: payload?.nombre_solicitante || '',
        referencia: payload?.referencia || '',
        procedencia: payload?.procedencia || '',
        prioridad: payload?.prioridad || 'rutinario',
        fecha_limite: payload?.fecha_limite ? payload.fecha_limite.split('T')[0] : '',
        fecha_ingreso: payload?.fecha_ingreso ? payload.fecha_ingreso.split('T')[0] : '',
        cite: payload?.cite || '',
        numero_fojas: payload?.numero_fojas?.toString() || '',
        observaciones: payload?.observaciones || ''
      });
    } catch (err: any) {
      const mensaje = err?.response?.data?.message || 'No se pudo cargar la hoja de ruta';
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const verificarPasswordSesion = async (password: string) => {
    if (!user?.username) {
      toast.error('No se pudo validar la sesión');
      return false;
    }
    if (!password) {
      toast.warning('Ingresa la contraseña');
      return false;
    }
    try {
      setVerificandoPassword(true);
      await axiosAuth.post(API_ENDPOINTS.AUTH_LOGIN, {
        username: user.username,
        password
      });
      return true;
    } catch (err) {
      toast.error('Contraseña incorrecta');
      return false;
    } finally {
      setVerificandoPassword(false);
    }
  };

  const handleDescargarPDF = async () => {
    const element = printRef.current;
    if (!element || !hojaCompleta) return;

    try {
      toast.info('Generando PDF...', { autoClose: 1500 });

      const dataUrl = await domtoimage.toPng(element);
      const img = new window.Image();
      img.src = dataUrl;
      
      img.onload = () => {
        // Dimensiones oficio: 216mm x 330mm
        const pdfWidth = 216;
        const pdfHeight = 330;
        const imgWidth = pdfWidth;
        const imgHeight = (img.height * pdfWidth) / img.width;
        
        // Crear PDF en tamaño oficio
        const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
        
        // Si la imagen cabe en una página
        if (imgHeight <= pdfHeight) {
          pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
        } else {
          // Múltiples páginas necesarias
          let yOffset = 0;
          let pageCount = 0;
          
          while (yOffset < imgHeight) {
            if (pageCount > 0) {
              pdf.addPage();
            }
            // Posición negativa para "mover" la imagen hacia arriba en cada página
            pdf.addImage(dataUrl, 'PNG', 0, -yOffset, imgWidth, imgHeight);
            yOffset += pdfHeight;
            pageCount++;
          }
        }
        
        const filename = `hoja-ruta-${hojaCompleta.numero_hr || hojaCompleta.id}.pdf`;
        pdf.save(filename);
        toast.success('✅ PDF descargado correctamente');
      };
    } catch (err) {
      console.error('Error al generar PDF:', err);
      toast.error('❌ Error al generar PDF');
    }
  };

  const aplicarEstado = async (destino: 'finalizada' | 'en_proceso') => {
    if (!hojaCompleta) return;
    // estado = columna principal (pendiente, en_proceso, enviada, finalizada, cancelada)
    // estado_cumplimiento = columna de seguimiento (pendiente, en_proceso, completado, vencido)
    const estadoColumna = destino; // 'finalizada' o 'en_proceso'
    const estadoCumplimiento = destino === 'finalizada' ? 'completado' : 'en_proceso';

    try {
      setActualizandoEstado(true);
      await axiosAuth.patch(`${API_ENDPOINTS.HOJAS_RUTA}/${hojaCompleta.id}/estado`, {
        estado: estadoColumna,
        estado_cumplimiento: estadoCumplimiento
      });

      setHojaCompleta({ ...hojaCompleta, estado: estadoColumna, estado_cumplimiento: estadoCumplimiento });
      toast.success(`Estado actualizado a ${destino === 'finalizada' ? 'Finalizada' : 'En Proceso'}`);
    } catch (err: any) {
      const mensaje = err?.response?.data?.message || 'No se pudo actualizar el estado';
      toast.error(mensaje);
    } finally {
      setActualizandoEstado(false);
    }
  };

  const guardarEdicion = async () => {
    if (!hojaCompleta) return;
    try {
      await axiosAuth.put(`${API_ENDPOINTS.HOJAS_RUTA}/${hojaCompleta.id}`, {
        ...formEdicion,
        numero_fojas: formEdicion.numero_fojas ? Number(formEdicion.numero_fojas) : null,
        destinos: destinosEditables
      });
      toast.success('Hoja de ruta actualizada');
      setShowEditModal(false);
      fetchHojaCompleta();
    } catch (err: any) {
      const mensaje = err?.response?.data?.message || 'No se pudo guardar';
      toast.error(mensaje);
    }
  };

  const confirmarReapertura = async () => {
    if (!hojaCompleta) return;
    const ok = await verificarPasswordSesion(passwordFinalizar);
    if (!ok) return;
    try {
      setActualizandoEstado(true);
      // estado='en_proceso' (columna principal), estado_cumplimiento='en_proceso'
      await axiosAuth.patch(`${API_ENDPOINTS.HOJAS_RUTA}/${hojaCompleta.id}/estado`, {
        estado: 'en_proceso',
        estado_cumplimiento: 'en_proceso'
      });
      setHojaCompleta({ ...hojaCompleta, estado: 'en_proceso', estado_cumplimiento: 'en_proceso' });
      toast.success('Estado cambiado a En Proceso');
      setShowFinalizarModal(false);
      setPasswordFinalizar('');
    } catch (err: any) {
      const mensaje = err?.response?.data?.message || 'No se pudo cambiar estado';
      toast.error(mensaje);
    } finally {
      setActualizandoEstado(false);
    }
  };

  const confirmarFinalizar = async () => {
    await aplicarEstado('finalizada');
    setShowFinalizarModal(false);
  };

  const eliminarHojaRuta = async () => {
    if (!hojaCompleta) return;
    const ok = await verificarPasswordSesion(passwordSeguro);
    if (!ok) return;
    try {
      setEliminandoHR(true);
      await axiosAuth.delete(API_ENDPOINTS.HOJAS_RUTA_DETALLE(Number(hojaCompleta.id)));
      toast.success('Hoja de ruta eliminada');
      setShowEliminarModal(false);
      onBack();
    } catch (err: any) {
      const mensaje = err?.response?.data?.message || 'El backend no permite eliminar esta hoja todavía';
      toast.error(mensaje);
    } finally {
      setEliminandoHR(false);
    }
  };

  const agregarDestino = () => {
    if (!destinoNuevo.trim()) return;
    setDestinosEditables([...destinosEditables, destinoNuevo.trim()]);
    setDestinoNuevo('');
  };

  const quitarDestino = (nombre: string) => {
    setDestinosEditables(destinosEditables.filter((d) => d !== nombre));
  };

  const estadoEsFinalizada = (hojaCompleta?.estado || '').toLowerCase() === 'finalizada';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c] text-white">
        <div className="text-lg tracking-wide">Cargando hoja de ruta...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c] text-white flex flex-col items-center justify-center px-6">
        <p className="text-sm text-amber-200/80 mb-4">No pudimos cargar esta hoja de ruta</p>
        <div className="flex gap-3">
          <button onClick={onBack} className="px-4 py-2 rounded-full border border-white/20 hover:border-amber-300/60 text-sm transition-colors">Volver</button>
          <button onClick={fetchHojaCompleta} className="px-4 py-2 rounded-full bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition-colors">Reintentar</button>
        </div>
        <p className="mt-6 text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!hojaCompleta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c] text-white">
        <div className="text-sm text-amber-200">Sin datos</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c] text-white">
      <style>{`
        @keyframes cardPop { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalPop { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .card-fade { animation: cardPop 0.35s ease; }
        .modal-pop { animation: modalPop 0.3s ease; }
        .glass-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; box-shadow: 0 15px 50px rgba(0,0,0,0.25); }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-7">
        <div className="flex items-start justify-between gap-4 card-fade">
          <div className="flex gap-4 items-start">
            <button onClick={onBack} className="px-4 py-2 rounded-full border border-white/20 hover:border-amber-300/60 text-sm text-amber-200 transition-colors">
              ← Volver a Registros
            </button>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">Información general</p>
              <h1 className="text-4xl font-black leading-tight tracking-tight">{hojaCompleta.numero_hr}</h1>
              <p className="text-lg text-amber-200 font-semibold">{hojaCompleta.nombre_solicitante || hojaCompleta.referencia || 'Sin título'}</p>
              <div className="flex items-center gap-2 text-sm text-slate-100">
                <LupayIcon width={16} height={16} fill="#f5c565" />
                <span className="text-amber-200 font-semibold">Última ubicación:</span>
                <span>{hojaCompleta.ubicacion_actual || 'Sin ubicación registrada'}</span>
              </div>
              <p className="text-[11px] text-slate-500">Actualizado {formatDate(hojaCompleta.actualizado_en)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Solo mostrar botón reabrir si el usuario puede desmarcar finalizado */}
            {estadoEsFinalizada ? (
              canUnfinalize() && (
                <button
                  onClick={() => {
                    setEstadoObjetivo('reabrir');
                    setShowFinalizarModal(true);
                  }}
                  disabled={actualizandoEstado}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-400 transition disabled:opacity-60"
                >
                  {actualizandoEstado ? 'Guardando...' : 'Marcar En Proceso'}
                </button>
              )
            ) : (
              <button
                onClick={() => {
                  setEstadoObjetivo('finalizar');
                  setShowFinalizarModal(true);
                }}
                disabled={actualizandoEstado}
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition disabled:opacity-60"
              >
                {actualizandoEstado ? 'Guardando...' : 'Marcar Finalizada'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 card-fade">
          {canEdit() && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:border-amber-300/60 hover:bg-white/15 transition"
            >
              <EditarIcon width={18} height={18} fill="#f5c565" />
              <span className="text-sm font-semibold">Editar datos</span>
            </button>
          )}

          <button
            onClick={handleDescargarPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:border-amber-300/60 hover:bg-white/15 transition"
          >
            <PdfIcon width={18} height={18} fill="#f5c565" />
            <span className="text-sm font-semibold">Descargar PDF</span>
          </button>

          {/* Eliminar HR - Solo admin/desarrollador */}
          {canDelete() && (
            <button
              onClick={() => setShowEliminarModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7b1113] border border-white/10 hover:border-amber-300/60 hover:bg-[#9a1619] transition text-white"
            >
              <VolverIcon width={16} height={16} fill="#f5c565" />
              <span className="text-sm font-semibold">Eliminar HR</span>
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Columna izquierda - Datos clave */}
          <div className="glass-card card-fade">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70 mb-2">Datos clave</p>
            <div className="space-y-2 text-sm text-slate-100">
              <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-300">Referencia</span><span className="font-semibold text-white ml-3 text-right">{hojaCompleta.referencia || 'Sin referencia'}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-300">Procedencia</span><span className="font-semibold text-white ml-3 text-right">{hojaCompleta.procedencia || 'No especificada'}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-300">Prioridad</span><span className="font-semibold text-white ml-3 text-right capitalize">{hojaCompleta.prioridad || 'normal'}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-300">Fecha límite</span><span className="font-semibold text-white ml-3 text-right">{hojaCompleta?.fecha_limite ? formatDate(hojaCompleta.fecha_limite) : 'No especificada'}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-300">Fecha ingreso</span><span className="font-semibold text-white ml-3 text-right">{hojaCompleta?.fecha_ingreso ? formatDate(hojaCompleta.fecha_ingreso) : 'Sin fecha'}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-300">CITE</span><span className="font-semibold text-white ml-3 text-right">{hojaCompleta.cite || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-300">Fojas</span><span className="font-semibold text-white ml-3 text-right">{hojaCompleta.numero_fojas || 'Sin dato'}</span></div>
            </div>
          </div>

          {/* Columna derecha - Formulario Enviar a Unidad */}
          <div className="glass-card card-fade">
            <div className="mb-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">Enviar a Unidad</p>
              <p className="text-sm text-slate-300 mt-1">Enviar esta hoja de ruta a una unidad interna</p>
            </div>

            {/* Checkboxes de instrucciones */}
            <div className="space-y-2 mb-4">
              {opcionesCheckbox.map(opcion => (
                <label key={opcion} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envioForm.checkboxes.includes(opcion)}
                    onChange={() => toggleCheckbox(opcion)}
                    className="w-4 h-4 rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-white">{opcion}</span>
                </label>
              ))}
            </div>

            {/* Fecha de salida y Destino */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fecha de Salida</label>
                <input
                  type="date"
                  value={envioForm.fecha_salida}
                  onChange={(e) => setEnvioForm({ ...envioForm, fecha_salida: e.target.value })}
                  className="w-full bg-[#0f1116] border border-white/15 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Destino</label>
                <select
                  value={envioForm.destino_id}
                  onChange={(e) => setEnvioForm({ ...envioForm, destino_id: e.target.value })}
                  className="w-full bg-[#0f1116] border border-white/15 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-amber-500 [&>option]:bg-[#1a2236]"
                >
                  <option value="">Seleccionar...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instrucciones adicionales */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Instrucciones Adicionales</label>
              <textarea
                value={envioForm.instrucciones}
                onChange={(e) => setEnvioForm({ ...envioForm, instrucciones: e.target.value })}
                className="w-full h-16 bg-[#0f1116] border border-white/15 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-amber-500"
                placeholder="Instrucciones adicionales..."
              />
            </div>

            {/* Botón enviar */}
            <button
              onClick={handleEnviarAUnidad}
              disabled={enviandoAUnidad || !envioForm.destino_id}
              className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50 font-semibold"
            >
              {enviandoAUnidad ? 'Enviando...' : 'Enviar a Unidad'}
            </button>
          </div>
        </div>

        <div className="glass-card card-fade">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">PDF</p>
              <h3 className="text-xl font-bold">Vista lista para imprimir</h3>
            </div>
            <button
              onClick={handleDescargarPDF}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-300/40 text-amber-200 hover:bg-amber-300/10 transition"
            >
              <DescargarIcon width={16} height={16} fill="#f5c565" />
              <span className="text-sm font-semibold">Descargar</span>
            </button>
          </div>
          <div className="w-full max-w-[1200px] mx-auto">
            <div
              className="bg-white shadow-lg w-full"
              ref={printRef}
              style={{ background: '#fff', color: '#222', width: '100%' }}
            >
              {hojaCompleta && <HojaRutaPreview data={hojaCompleta} />}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1324] text-white rounded-2xl shadow-2xl border border-white/10 max-w-3xl w-full p-6 modal-pop">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300/70">Edición</p>
                <h3 className="text-xl font-bold">Editar hoja de ruta</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-300 hover:text-amber-200">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Número HR</label>
                <input value={formEdicion.numero_hr} onChange={(e) => setFormEdicion({ ...formEdicion, numero_hr: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Nombre</label>
                <input value={formEdicion.nombre_solicitante} onChange={(e) => setFormEdicion({ ...formEdicion, nombre_solicitante: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Referencia</label>
                <input value={formEdicion.referencia} onChange={(e) => setFormEdicion({ ...formEdicion, referencia: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Procedencia</label>
                <input value={formEdicion.procedencia} onChange={(e) => setFormEdicion({ ...formEdicion, procedencia: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Prioridad</label>
                <select value={formEdicion.prioridad} onChange={(e) => setFormEdicion({ ...formEdicion, prioridad: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white">
                  <option value="rutinario">Rutinario</option>
                  <option value="prioritario">Prioritario</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Fecha límite</label>
                <input type="date" value={formEdicion.fecha_limite} onChange={(e) => setFormEdicion({ ...formEdicion, fecha_limite: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Fecha ingreso</label>
                <input type="date" value={formEdicion.fecha_ingreso} onChange={(e) => setFormEdicion({ ...formEdicion, fecha_ingreso: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">CITE</label>
                <input value={formEdicion.cite} onChange={(e) => setFormEdicion({ ...formEdicion, cite: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Número de fojas</label>
                <input type="number" value={formEdicion.numero_fojas} onChange={(e) => setFormEdicion({ ...formEdicion, numero_fojas: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-amber-100">Observaciones</label>
                <textarea value={formEdicion.observaciones} onChange={(e) => setFormEdicion({ ...formEdicion, observaciones: e.target.value })} className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white" rows={3} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-amber-100">Destinos / Instrucciones</label>
                <div className="flex gap-2">
                  <input
                    value={destinoNuevo}
                    onChange={(e) => setDestinoNuevo(e.target.value)}
                    placeholder="Añadir destino"
                    className="flex-1 px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white"
                  />
                  <button onClick={agregarDestino} className="px-3 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400">Agregar</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {destinosEditables.length === 0 && <span className="text-xs text-slate-300">Sin destinos configurados</span>}
                  {destinosEditables.map((dest) => (
                    <span key={dest} className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-100 text-xs flex items-center gap-1 border border-amber-300/30">
                      {dest}
                      <button onClick={() => quitarDestino(dest)} className="text-red-200 font-bold">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 hover:border-amber-300/60">Cancelar</button>
              <button onClick={guardarEdicion} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showEliminarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1324] text-white rounded-2xl shadow-2xl border border-white/10 max-w-xl w-full p-6 modal-pop">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-red-300/80">Eliminar</p>
                <h3 className="text-xl font-bold text-red-200">Eliminar Hoja de Ruta</h3>
                <p className="text-sm text-slate-200/80">Escribe la contraseña del usuario <strong>{user?.username}</strong> para eliminar.</p>
              </div>
              <button onClick={() => setShowEliminarModal(false)} className="text-slate-300 hover:text-amber-200">✕</button>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={passwordSeguro}
                onChange={(e) => setPasswordSeguro(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white"
              />
              <p className="text-xs text-slate-300">Esta acción es irreversible.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEliminarModal(false)} className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 hover:border-amber-300/60">Cancelar</button>
              <button
                onClick={eliminarHojaRuta}
                disabled={eliminandoHR || verificandoPassword}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-60"
              >
                {eliminandoHR ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalizarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1324] text-white rounded-2xl shadow-2xl border border-white/10 max-w-xl w-full p-6 modal-pop">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300/70">Estado</p>
                <h3 className="text-xl font-bold">{estadoObjetivo === 'finalizar' ? 'Marcar como Finalizada' : 'Volver a En Proceso'}</h3>
                <p className="text-sm text-slate-200/80">
                  {estadoObjetivo === 'finalizar'
                    ? 'Al finalizar no se podrán añadir ni borrar progresos. Confirma que el expediente está cerrado.'
                    : 'Para reabrir se necesita la contraseña de la sesión actual.'}
                </p>
              </div>
              <button onClick={() => setShowFinalizarModal(false)} className="text-slate-300 hover:text-amber-200">✕</button>
            </div>

            {estadoObjetivo === 'reabrir' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-amber-100">Contraseña</label>
                <input
                  type="password"
                    value={passwordFinalizar}
                    onChange={(e) => setPasswordFinalizar(e.target.value)}
                    className="w-full px-3 py-2 border border-white/15 rounded-lg bg-white/5 text-white"
                    placeholder="Contraseña de la sesión"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowFinalizarModal(false)} className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 hover:border-amber-300/60">Cancelar</button>
                <button
                  onClick={estadoObjetivo === 'finalizar' ? confirmarFinalizar : confirmarReapertura}
                  disabled={actualizandoEstado || verificandoPassword}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 disabled:opacity-60"
                >
                  {estadoObjetivo === 'finalizar' ? 'Finalizar' : 'Reabrir'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default HojaRutaDetalleView;
