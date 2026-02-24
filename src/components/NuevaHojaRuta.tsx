import React, { useState, useRef, useEffect } from 'react';
import axiosAuth from '../config/axiosAuth';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../config/api';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image';
import GuardarIcon from '../assets/guardaron';
import VolverIcon from '../assets/Flecha down';
import OjoIcon from '../assets/ojo';
import PdfIcon from '../assets/pdf';
import SedegesLogo from './SedegesLogo';

interface SeccionAdicional {
  id: number;
  fecha_enviado: string;
  fecha_recepcion: string;
  destino: string;
  destinos: string[];
  instrucciones_adicionales: string;
  destinoPersonalizado: string;
  mostrarDestinoPersonalizado: boolean;
}

interface FormData {
  numero_hr: string;
  nombre_solicitante: string;
  telefono_celular: string;
  referencia: string;
  prioridad: 'urgente' | 'prioritario' | 'rutinario' | 'otros' | '';
  estado: 'pendiente' | 'enviada' | 'en_proceso' | 'finalizada' | 'archivada' | '';
  procedencia: string;
  fecha_limite: string;
  fecha_ingreso: string;
  cite: string;
  numero_fojas: string;
  destino_principal: string;
  destinos: string[];
  instrucciones_adicionales: string;
}

const destinosOptions = [
  'Para su conocimiento',
  'Analizar y emitir opinión',
  'Dar curso si legalmente es procedente',
  'Proceder de acuerdo a normas',
  'Preparar respuesta o informe',
  'Elaborar Resolución',
  'Elaborar Contrato',
  'Concertar reunión',
  'Asistir a reunión, invitación en mi representación',
  'Archivar'
];

const destinosSeccionesAdicionalesOptions = [
  'Para su conocimiento',
  'Preparar respuesta o informe',
  'Analizar y emitir opinión',
  'Procesar de acuerdo a normas',
  'Dar curso si legalmente es procedente',
  'Elaborar Resolución',
  'Elaborar Contrato',
  'Archivar'
];

const NuevaHojaRuta: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    numero_hr: '',
    nombre_solicitante: '',
    telefono_celular: '',
    referencia: '',
    prioridad: '',
    estado: '',
    procedencia: '',
    fecha_limite: '',
    fecha_ingreso: '',
    cite: '',
    numero_fojas: '',
    destino_principal: '',
    destinos: [],
    instrucciones_adicionales: ''
  });

  // Secciones adicionales dinámicas
  const [seccionesAdicionales, setSeccionesAdicionales] = useState<SeccionAdicional[]>([
    { id: 1, fecha_enviado: '', fecha_recepcion: '', destino: '', destinos: [], instrucciones_adicionales: '', destinoPersonalizado: '', mostrarDestinoPersonalizado: false },
    { id: 2, fecha_enviado: '', fecha_recepcion: '', destino: '', destinos: [], instrucciones_adicionales: '', destinoPersonalizado: '', mostrarDestinoPersonalizado: false },
    { id: 3, fecha_enviado: '', fecha_recepcion: '', destino: '', destinos: [], instrucciones_adicionales: '', destinoPersonalizado: '', mostrarDestinoPersonalizado: false }
  ]);

  const [_destinosDisponibles, setDestinosDisponibles] = useState<any[]>([]);
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<any[]>([]);
  const [_loadingDestinos, setLoadingDestinos] = useState(true);
  const [_mostrarDestinoPrincipalPersonalizado, _setMostrarDestinoPrincipalPersonalizado] = useState(false);
  const [_destinoPrincipalPersonalizado, _setDestinoPrincipalPersonalizado] = useState('');

  // Funciones para manejar secciones adicionales
  const agregarSeccion = () => {
    const nuevoId = seccionesAdicionales.length + 1;
    setSeccionesAdicionales([
      ...seccionesAdicionales,
      { id: nuevoId, fecha_enviado: '', fecha_recepcion: '', destino: '', destinos: [], instrucciones_adicionales: '', destinoPersonalizado: '', mostrarDestinoPersonalizado: false }
    ]);
  };

  const eliminarSeccion = (id: number) => {
    if (seccionesAdicionales.length <= 1) return;
    setSeccionesAdicionales(seccionesAdicionales.filter(s => s.id !== id));
  };

  const actualizarSeccion = (id: number, campo: keyof SeccionAdicional, valor: any) => {
    setSeccionesAdicionales(seccionesAdicionales.map(s => 
      s.id === id ? { ...s, [campo]: valor } : s
    ));
  };

  const handleDestinoSeccionChange = (id: number, destino: string) => {
    setSeccionesAdicionales(seccionesAdicionales.map(s => {
      if (s.id === id) {
        const currentDestinos = s.destinos;
        return {
          ...s,
          destinos: currentDestinos.includes(destino)
            ? currentDestinos.filter(d => d !== destino)
            : [...currentDestinos, destino]
        };
      }
      return s;
    }));
  };

  useEffect(() => {
    const cargarDestinos = async () => {
      try {
        console.log('[Destinos] Cargando destinos disponibles...');
        const response = await axiosAuth.get(API_ENDPOINTS.DESTINOS);
        console.log('[Destinos] Respuesta:', response.data);
        
        let destinosAplanados: any[] = [];
        
        // Manejar diferentes formatos de respuesta
        if (response.data.success && response.data.destinos) {
          // Si es un objeto con categorías
          if (typeof response.data.destinos === 'object' && !Array.isArray(response.data.destinos)) {
            Object.keys(response.data.destinos).forEach(categoria => {
              const items = response.data.destinos[categoria];
              if (Array.isArray(items)) {
                items.forEach((destino: any) => {
                  const tipo = categoria === 'Centros de Acogida' ? 'centro_acogida' :
                              categoria === 'Direcciones Administrativas' ? 'direccion' : 'otro';
                  destinosAplanados.push({
                    ...destino,
                    tipo: tipo
                  });
                });
              }
            });
          } 
          // Si es un array directo
          else if (Array.isArray(response.data.destinos)) {
            destinosAplanados = response.data.destinos.map((destino: any) => ({
              ...destino,
              tipo: destino.tipo || 'otro'
            }));
          }
        } 
        // Si no tiene success, puede ser array directo
        else if (Array.isArray(response.data)) {
          destinosAplanados = response.data.map((destino: any) => ({
            ...destino,
            tipo: destino.tipo || 'otro'
          }));
        }

        if (destinosAplanados.length === 0) {
          console.warn('[Destinos] Sin destinos cargados, usando destinos por defecto');
          destinosAplanados = [
            { id: 1, nombre: 'Centro de Acogida', tipo: 'centro_acogida' },
            { id: 2, nombre: 'Dirección Administrativa', tipo: 'direccion' }
          ];
        }

        setDestinosDisponibles(destinosAplanados);
        console.log('[Destinos] Cargados:', destinosAplanados.length, 'destinos');
      } catch (error: any) {
        console.error('[Destinos] Error al cargar:', error?.message || error);
        console.warn('[Destinos] Usando destinos por defecto');
        // Usar destinos por defecto si falla la carga
        const destinosPorDefecto = [
          { id: 1, nombre: 'Centro de Acogida', tipo: 'centro_acogida' },
          { id: 2, nombre: 'Dirección Administrativa', tipo: 'direccion' }
        ];
        setDestinosDisponibles(destinosPorDefecto);
      } finally {
        setLoadingDestinos(false);
      }
    };

    const cargarUnidades = async () => {
      try {
        const response = await axiosAuth.get('/api/unidades');
        if (response.data.success && response.data.unidades) {
          setUnidadesDisponibles(response.data.unidades.filter((u: any) => u.activo));
          console.log('[Unidades] Cargadas:', response.data.unidades.length);
        }
      } catch (error) {
        console.error('Error al cargar unidades:', error);
        setUnidadesDisponibles([]);
      }
    };
    
    cargarDestinos();
    cargarUnidades();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDestinoChange = (destino: string) => {
    setFormData(prev => ({
      ...prev,
      destinos: prev.destinos.includes(destino)
        ? prev.destinos.filter(d => d !== destino)
        : [...prev.destinos, destino]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      toast.error('No hay sesión activa. Inicie sesión nuevamente.');
      navigate('/login');
      return;
    }
    try {
      // Preparar las secciones adicionales para enviar (solo las que tienen contenido)
      const seccionesData: any = {};
      seccionesAdicionales.forEach((seccion, index) => {
        const num = index + 1;
        // Solo agregar campos si tienen contenido real
        if (seccion.fecha_enviado) {
          seccionesData[`fecha_enviado_${num}`] = seccion.fecha_enviado;
        }
        if (seccion.fecha_recepcion) {
          seccionesData[`fecha_recepcion_${num}`] = seccion.fecha_recepcion;
        }
        if (seccion.destino || seccion.destinoPersonalizado) {
          seccionesData[`destino_${num}`] = seccion.destino || seccion.destinoPersonalizado;
        }
        if (seccion.destinos && seccion.destinos.length > 0) {
          seccionesData[`destinos_${num}`] = seccion.destinos;
        }
        if (seccion.instrucciones_adicionales) {
          seccionesData[`instrucciones_adicionales_${num}`] = seccion.instrucciones_adicionales;
        }
      });

      const payload = {
        ...formData,
        ...seccionesData,
        // Solo enviar secciones que tengan contenido, incluyendo el número de sección
        secciones_adicionales: seccionesAdicionales
          .filter(s => s.fecha_enviado || s.destino || s.destinoPersonalizado || (s.destinos && s.destinos.length > 0) || s.instrucciones_adicionales)
          .map((s, index) => ({
            seccion: index + 1,
            fecha_enviado: s.fecha_enviado,
            fecha_recepcion: s.fecha_recepcion,
            destino: s.destino || s.destinoPersonalizado,
            destinos: s.destinos,
            instrucciones_adicionales: s.instrucciones_adicionales
          })),
        estado: formData.estado || 'pendiente',
        observaciones: formData.instrucciones_adicionales,
        usuario_creador_id: user.id,
        ubicacion_actual: formData.destino_principal || 'SEDEGES - Sede Central',
        responsable_actual: formData.destino_principal ? `Responsable de ${formData.destino_principal}` : 'Sistema SEDEGES'
      };
      await axiosAuth.post(API_ENDPOINTS.HOJAS_RUTA, payload);
      toast.success('Hoja de ruta guardada exitosamente');
      setFormData({
        numero_hr: '',
        nombre_solicitante: '',
        telefono_celular: '',
        referencia: '',
        prioridad: '',
        estado: '',
        procedencia: '',
        fecha_limite: '',
        fecha_ingreso: '',
        cite: '',
        numero_fojas: '',
        destino_principal: '',
        destinos: [],
        instrucciones_adicionales: ''
      });
      // Resetear secciones adicionales
      setSeccionesAdicionales([
        { id: 1, fecha_enviado: '', fecha_recepcion: '', destino: '', destinos: [], instrucciones_adicionales: '', destinoPersonalizado: '', mostrarDestinoPersonalizado: false },
        { id: 2, fecha_enviado: '', fecha_recepcion: '', destino: '', destinos: [], instrucciones_adicionales: '', destinoPersonalizado: '', mostrarDestinoPersonalizado: false },
        { id: 3, fecha_enviado: '', fecha_recepcion: '', destino: '', destinos: [], instrucciones_adicionales: '', destinoPersonalizado: '', mostrarDestinoPersonalizado: false }
      ]);
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar la hoja de ruta');
    }
  };

  const handlePrint = async () => {
    if (!printRef.current) return;
    try {
      if (!showPreview) {
        setShowPreview(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      const element = printRef.current;
      const dataUrl = await domtoimage.toPng(element);
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const imgWidth = 216;
        const pageHeight = 330;
        const imgHeight = (img.height * imgWidth) / img.width;
        let heightLeft = imgHeight;
        const pdf = new jsPDF('p', 'mm', [216, 330]);
        let position = 0;
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `hoja-ruta-${formData.numero_hr || timestamp}.pdf`;
        pdf.save(filename);
        toast.success('PDF generado exitosamente');
      };
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF: ' + error);
    }
  };

  return (
    <div className="min-h-screen p-6 text-white bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c]">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl shadow-lg p-6 mb-6" style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/dashboard')} className="flex items-center px-4 py-2 text-amber-200 hover:text-white hover:bg-[rgba(245,197,101,0.14)] rounded-lg transition-all" style={{
              background: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              <VolverIcon width={20} height={20} className="mr-2" fill="currentColor" />
              Volver al Dashboard
            </button>
            <div className="flex items-center space-x-4">
              {showPreview && (
                <button onClick={handlePrint} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 border border-amber-400 hover:border-amber-300 rounded-lg transition-all duration-200 font-semibold">
                  Descargar PDF
                </button>
              )}
              <button onClick={() => setShowPreview(!showPreview)} className="px-4 py-2 bg-transparent text-amber-200 border border-amber-300 hover:bg-amber-300/10 rounded-lg transition-all duration-200 font-semibold">
                {showPreview ? 'Editar' : 'Vista Previa'}
              </button>
            </div>
          </div>
        </div>

        {!showPreview ? (
          <div className="rounded-2xl shadow-lg p-6" style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <h1 className="text-2xl font-bold mb-6 text-amber-200">Nueva Hoja de Ruta</h1>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Número H.R. *</label>
                  <input type="text" name="numero_hr" value={formData.numero_hr} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 text-white placeholder-white/50 rounded-lg focus:border-white/40 transition-all" style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Solicitante *</label>
                  <input type="text" name="nombre_solicitante" value={formData.nombre_solicitante} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono Celular *</label>
                  <input type="tel" name="telefono_celular" value={formData.telefono_celular} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Prioridad *</label>
                  <select name="prioridad" value={formData.prioridad} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&>option]:bg-slate-800 [&>option]:text-white">
                    <option value="" className="text-white/70">Seleccionar</option>
                    <option value="urgente">Urgente</option>
                    <option value="prioritario">Prioritario</option>
                    <option value="rutinario">Rutinario</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estado Inicial *</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&>option]:bg-slate-800 [&>option]:text-white">
                    <option value="" className="text-white/70">Seleccionar</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="enviada">Enviada</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="finalizada">Finalizada</option>
                    <option value="archivada">Archivada</option>
                  </select>
                  <p className="text-xs text-white/60 mt-1">Estado en que se registra inicialmente la hoja de ruta</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Referencia *</label>
                  <textarea name="referencia" value={formData.referencia} onChange={handleInputChange} required rows={3} className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Procedencia *</label>
                  <input type="text" name="procedencia" value={formData.procedencia} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha Límite *</label>
                  <input type="date" name="fecha_limite" value={formData.fecha_limite} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&::-webkit-calendar-picker-indicator]:filter-invert" />
                  <p className="text-xs text-white/60 mt-1">Fecha máxima para dar cumplimiento a esta hoja de ruta</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha Ingreso *</label>
                  <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleInputChange} required className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&::-webkit-calendar-picker-indicator]:filter-invert" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cite</label>
                  <input type="text" name="cite" value={formData.cite} onChange={handleInputChange} className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Número Fojas</label>
                  <input type="number" name="numero_fojas" value={formData.numero_fojas} onChange={handleInputChange} className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" />
                </div>
              </div>

              <div className="mt-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Destino Principal *</label>
                    <select 
                      name="destino_principal" 
                      value={formData.destino_principal} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="">Seleccionar unidad...</option>
                      {unidadesDisponibles.map(unidad => (
                        <option key={`dest-${unidad.id}`} value={unidad.nombre}>
                          {unidad.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="border-r border-gray-300 pr-4">
                      <div className="space-y-2">
                        {destinosOptions.map((destino) => (
                          <label key={destino} className="flex items-center">
                            <input type="checkbox" checked={formData.destinos.includes(destino)} onChange={() => handleDestinoChange(destino)} className="mr-2" />
                            <span className="text-sm">{destino}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pl-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Instrucciones Adicionales</label>
                        <textarea name="instrucciones_adicionales" value={formData.instrucciones_adicionales} onChange={handleInputChange} rows={8} className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" placeholder="Escriba las instrucciones adicionales..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <h3 className="text-lg font-medium">Secciones Adicionales ({seccionesAdicionales.length})</h3>
                
                {seccionesAdicionales.map((seccion, index) => (
                  <div key={seccion.id} className="border border-gray-200 rounded-lg p-4 relative">
                    {seccionesAdicionales.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarSeccion(seccion.id)}
                        className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                        title="Eliminar sección"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="text-xs text-amber-400 mb-3 font-semibold">SECCIÓN {index + 1}</div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="border-r border-gray-300 pr-4">
                        <div className="space-y-2">
                          {destinosSeccionesAdicionalesOptions.map((destino) => (
                            <label key={`seccion${seccion.id}_${destino}`} className="flex items-center">
                              <input 
                                type="checkbox" 
                                checked={seccion.destinos.includes(destino)}
                                onChange={() => handleDestinoSeccionChange(seccion.id, destino)}
                                className="mr-2" 
                              />
                              <span className="text-sm">{destino}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pl-4">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Fecha de Enviado {index + 1}</label>
                            <input 
                              type="date" 
                              value={seccion.fecha_enviado} 
                              onChange={(e) => actualizarSeccion(seccion.id, 'fecha_enviado', e.target.value)}
                              className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&::-webkit-calendar-picker-indicator]:filter-invert" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Fecha de Recepción {index + 1}</label>
                            <input 
                              type="date" 
                              value={seccion.fecha_recepcion} 
                              onChange={(e) => actualizarSeccion(seccion.id, 'fecha_recepcion', e.target.value)}
                              className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&::-webkit-calendar-picker-indicator]:filter-invert" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Destino {index + 1}</label>
                            <select 
                              value={seccion.destino} 
                              onChange={(e) => {
                                actualizarSeccion(seccion.id, 'destino', e.target.value);
                              }}
                              className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:border-white/40 focus:bg-white/15 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
                            >
                              <option value="">Seleccionar unidad...</option>
                              {unidadesDisponibles.map(unidad => (
                                <option key={`unidad-${unidad.id}`} value={unidad.nombre}>
                                  {unidad.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Instrucciones Adicionales {index + 1}</label>
                          <textarea 
                            value={seccion.instrucciones_adicionales} 
                            onChange={(e) => actualizarSeccion(seccion.id, 'instrucciones_adicionales', e.target.value)}
                            rows={5} 
                            className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:border-white/40 focus:bg-white/15 transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Botón agregar sección al final */}
                <button
                  type="button"
                  onClick={agregarSeccion}
                  className="w-full px-4 py-3 border border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Sección
                </button>
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button type="button" onClick={() => navigate('/dashboard')} className="px-6 py-3 border border-white/40 bg-white/5 hover:bg-white/10 text-white/90 hover:text-white rounded-lg transition-all duration-200 font-medium">Cancelar</button>
                <button type="button" onClick={() => setShowPreview(true)} className="flex items-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200 font-medium shadow-sm">
                  <OjoIcon width={16} height={16} fill="white" className="mr-2" />
                  Vista Previa
                </button>
                <button type="button" onClick={handlePrint} className="flex items-center px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white border border-slate-500 hover:border-slate-400 rounded-lg transition-all duration-200 font-medium shadow-sm">
                  <PdfIcon width={16} height={16} fill="white" className="mr-2" />
                  Descargar PDF
                </button>
                <button type="submit" className="flex items-center px-6 py-3 bg-[var(--color-esmeralda)] hover:bg-[var(--color-esmeralda)]/90 text-white border border-[var(--color-esmeralda)] hover:border-[var(--color-esmeralda)]/80 rounded-lg transition-all duration-200 font-medium shadow-sm">
                  <GuardarIcon width={16} height={16} fill="white" className="mr-2" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div
            className="bg-white shadow-lg"
            ref={printRef}
            style={{ background: '#fff', color: '#222' }}
          >
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="flex items-start justify-between mb-2">
                  <SedegesLogo width={80} height={80} className="mt-2" />
                  <div className="flex-1 text-center">
                    <h2 className="text-lg font-bold">SERVICIO DEPARTAMENTAL DE GESTIÓN SOCIAL</h2>
                    <h3 className="text-xl font-bold">HOJA DE RUTA</h3>
                  </div>
                  <div className="text-right">
                    <div className="border border-black p-1 min-w-[120px]">
                      <p className="text-xs font-bold text-center">NÚMERO H.R.</p>
                      <p className="text-center text-sm">{formData.numero_hr || '........................'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <table className="w-full border-collapse border border-black text-xs">
                <tbody>
                  <tr>
                    <td className="border border-black bg-gray-100 p-1 font-bold w-20">REFERENCIA</td>
                    <td className="border border-black p-1 w-96">{formData.referencia}</td>
                    <td className="border border-black bg-gray-100 p-1 w-20 text-center">
                      <div className="space-y-1">
                        <div><input type="checkbox" checked={formData.prioridad === 'urgente'} readOnly className="mr-1" />URGENTE</div>
                        <div><input type="checkbox" checked={formData.prioridad === 'prioritario'} readOnly className="mr-1" />PRIORITARIO</div>
                        <div><input type="checkbox" checked={formData.prioridad === 'rutinario'} readOnly className="mr-1" />RUTINARIO</div>
                        <div><input type="checkbox" checked={formData.prioridad === 'otros'} readOnly className="mr-1" />OTROS</div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black bg-gray-100 p-1 font-bold">PROCEDENCIA</td>
                    <td colSpan={2} className="border border-black p-1">{formData.procedencia}</td>
                  </tr>

                  <tr>
                    <td className="border border-black bg-gray-100 p-1 font-bold">NOMBRE SOLICITANTE</td>
                    <td className="border border-black p-1">{formData.nombre_solicitante}</td>
                    <td className="border border-black p-1">
                      <span className="bg-gray-100 font-bold pr-2">TEL:</span>
                      <span>{formData.telefono_celular}</span>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black bg-gray-100 p-1 font-bold">FECHA DE DOCUMENTO</td>
                    <td className="border border-black p-1">{formData.fecha_limite}</td>
                    <td className="border border-black p-1"></td>
                  </tr>

                  <tr>
                    <td className="border border-black bg-gray-100 p-1 font-bold">FECHA DE INGRESO</td>
                    <td className="border border-black p-1">{formData.fecha_ingreso}</td>
                    <td className="border border-black p-1"></td>
                  </tr>

                  <tr>
                    <td className="border border-black bg-gray-100 p-1 font-bold">CITE:</td>
                    <td className="border border-black p-1">{formData.cite}</td>
                    <td className="border border-black p-1">
                      <span className="font-bold">No. FOJAS:</span> {formData.numero_fojas}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-black border-t-0">
                <div className="bg-gray-100 p-2">
                  <span className="text-sm font-bold">IMPORTANTE</span>
                </div>
                <div className="p-2">
                  <ul className="list-disc ml-4 text-xs space-y-1">
                    <li>La Hoja de Ruta debe encabezar todos los documentos en cualquier tipo de trámites.</li>
                    <li>A través de la hoja de ruta se podrá determinar dónde está la obstaculización, retraso u otras anomalías</li>
                    <li>Todo trámite debe ser atendido en plazos mínimos establecidos</li>
                  </ul>
                </div>
              </div>

              <div className="border border-black border-t-0">
                <div className="bg-gray-100 p-1">
                  <span className="text-sm font-bold">DESTINO</span>
                </div>
                
                <div className="border-b border-black p-1">
                  <div className="border border-gray-400 p-2 min-h-[40px] text-xs">
                    {formData.destino_principal || '...........................................................................'}
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <div className="border-r border-black p-1">
                    <div className="space-y-1 text-xs">
                      {destinosOptions.map((destino) => (
                        <div key={destino}><input type="checkbox" checked={formData.destinos.includes(destino)} readOnly className="mr-1" />{destino}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-1">
                    <div className="text-center mb-1">
                      <span className="text-sm font-bold">INSTRUCCIONES ADICIONALES:</span>
                    </div>
                    <div className="text-xs min-h-[100px] p-1">
                      {formData.instrucciones_adicionales}
                    </div>
                    <div className="mt-2 text-center text-xs">
                      <div>Lic. Beatriz Churata Mamani</div>
                      <div className="font-bold">Directora Técnica</div>
                      <div className="font-bold">SEDEGES</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secciones adicionales de la primera página (hasta 3) */}
              {seccionesAdicionales.slice(0, 3).map((seccion, _index) => (
                <div key={seccion.id}>
                  <div className="border border-black border-t-0 p-1 grid grid-cols-3 gap-2">
                    <span className="text-xs font-bold">FECHA DE ENVIADO: {seccion.fecha_enviado || '________________'}</span>
                    <span className="text-xs font-bold">FECHA DE RECEPCIÓN: {seccion.fecha_recepcion || '________________'}</span>
                    <span className="text-xs font-bold">DESTINO: {seccion.destino || '..............................'}</span>
                  </div>
                  
                  <div className="border border-black border-t-0">
                    <div className="grid grid-cols-2">
                      <div className="border-r border-black p-1">
                        <div className="space-y-1 text-xs">
                          {destinosSeccionesAdicionalesOptions.map((destino) => (
                            <div key={`sec${seccion.id}_${destino}`}>
                              <input type="checkbox" checked={seccion.destinos.includes(destino)} readOnly className="mr-1" />
                              {destino}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="p-1">
                        <div className="text-xs">
                          <div className="font-bold mb-1">Instrucciones Adicionales:</div>
                          <div className="min-h-[80px]">
                            {seccion.instrucciones_adicionales ? (
                              <div className="whitespace-pre-wrap">{seccion.instrucciones_adicionales}</div>
                            ) : (
                              <div>
                                <div>...................................................................</div>
                                <div>...................................................................</div>
                                <div>...................................................................</div>
                                <div>...................................................................</div>
                                <div>...................................................................</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Páginas adicionales para secciones 4+ */}
            {seccionesAdicionales.length > 3 && (
              <>
                {/* Dividir en grupos de 4 secciones por página */}
                {Array.from({ length: Math.ceil((seccionesAdicionales.length - 3) / 4) }).map((_, pageIndex) => {
                  const startIdx = 3 + (pageIndex * 4);
                  const endIdx = Math.min(startIdx + 4, seccionesAdicionales.length);
                  const seccionesEnPagina = seccionesAdicionales.slice(startIdx, endIdx);
                  
                  return (
                    <div 
                      key={`page-${pageIndex + 2}`} 
                      className="bg-white p-6"
                      style={{ marginTop: '350px' }}
                    >
                      {/* Encabezado de página continuación */}
                      <div className="text-center mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <SedegesLogo width={80} height={80} className="mt-2" />
                          <div className="flex-1 text-center">
                            <h2 className="text-lg font-bold">SERVICIO DEPARTAMENTAL DE GESTIÓN SOCIAL</h2>
                            <h3 className="text-xl font-bold">HOJA DE RUTA - CONTINUACIÓN</h3>
                            <p className="text-xs text-gray-600 mt-1">Página {pageIndex + 2}</p>
                          </div>
                          <div className="text-right">
                            <div className="border border-black p-1 min-w-[120px]">
                              <p className="text-xs font-bold text-center">NÚMERO H.R.</p>
                              <p className="text-center text-sm">{formData.numero_hr || '........................'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="">
                        {/* Secciones adicionales de esta página */}
                        {seccionesEnPagina.map((seccion, idx) => (
                          <div key={seccion.id} className={idx === 0 ? '' : 'mt-2'}>
                            <div className="border border-black p-1 bg-gray-200">
                              <span className="text-xs font-bold">SECCIÓN {startIdx + idx + 1}</span>
                            </div>
                            <div className="border border-black border-t-0 p-1 grid grid-cols-3 gap-2">
                              <span className="text-xs font-bold">FECHA DE ENVIADO: {seccion.fecha_enviado || '________________'}</span>
                              <span className="text-xs font-bold">FECHA DE RECEPCIÓN: {seccion.fecha_recepcion || '________________'}</span>
                              <span className="text-xs font-bold">DESTINO: {seccion.destino || '..............................'}</span>
                            </div>
                            
                            <div className="border border-black border-t-0">
                              <div className="grid grid-cols-2">
                                <div className="border-r border-black p-1">
                                  <div className="space-y-1 text-xs">
                                    {destinosSeccionesAdicionalesOptions.map((destino) => (
                                      <div key={`page${pageIndex}_sec${seccion.id}_${destino}`}>
                                        <input type="checkbox" checked={seccion.destinos.includes(destino)} readOnly className="mr-1" />
                                        {destino}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="p-1">
                                  <div className="text-xs">
                                    <div className="font-bold mb-1">Instrucciones Adicionales:</div>
                                    <div className="min-h-[80px]">
                                      {seccion.instrucciones_adicionales ? (
                                        <div className="whitespace-pre-wrap">{seccion.instrucciones_adicionales}</div>
                                      ) : (
                                        <div>
                                          <div>...................................................................</div>
                                          <div>...................................................................</div>
                                          <div>...................................................................</div>
                                          <div>...................................................................</div>
                                          <div>...................................................................</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NuevaHojaRuta;
