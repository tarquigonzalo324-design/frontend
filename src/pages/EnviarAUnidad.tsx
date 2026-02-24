import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Unidad {
  id: number;
  nombre: string;
  descripcion: string;
}

interface HojaRuta {
  id: number;
  numero_hr: string;
  referencia: string;
  procedencia: string;
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

const EnviarAUnidad: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hojaIdParam = searchParams.get('hoja_id');

  const [hojas, setHojas] = useState<HojaRuta[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [busqueda, setBusqueda] = useState('');
  
  // Nueva estructura: UNA hoja, MÚLTIPLES destinos
  const [hojaSeleccionada, setHojaSeleccionada] = useState<HojaRuta | null>(null);
  const [destinosSeleccionados, setDestinosSeleccionados] = useState<number[]>([]);
  const [fechaSalida, setFechaSalida] = useState('');
  const [checkboxes, setCheckboxes] = useState<string[]>([]);
  const [instrucciones, setInstrucciones] = useState('');
  
  // Progreso de envío
  const [progresoEnvio, setProgresoEnvio] = useState<{total: number, actual: number, mensaje: string}>({ total: 0, actual: 0, mensaje: '' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [hojasRes, unidadesRes] = await Promise.all([
        axios.get(API_ENDPOINTS.HOJAS_RUTA, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(API_ENDPOINTS.UNIDADES, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const hojasData = Array.isArray(hojasRes.data) ? hojasRes.data : hojasRes.data?.data || [];
      setHojas(hojasData.filter((h: any) => h.estado !== 'finalizada' && h.estado !== 'archivada'));
      setUnidades(unidadesRes.data?.unidades || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Inicializar fecha con fecha local
    const hoy = new Date();
    const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    setFechaSalida(fechaLocal);
  }, [token]);

  // Si viene con hoja_id en URL, seleccionarla automáticamente
  useEffect(() => {
    if (hojaIdParam && hojas.length > 0) {
      const hoja = hojas.find(h => h.id === parseInt(hojaIdParam));
      if (hoja) {
        setHojaSeleccionada(hoja);
      }
    }
  }, [hojaIdParam, hojas]);

  const seleccionarHoja = (hoja: HojaRuta) => {
    setHojaSeleccionada(hoja);
    setBusqueda('');
  };

  const quitarHoja = () => {
    setHojaSeleccionada(null);
    setDestinosSeleccionados([]);
  };

  const toggleDestino = (unidadId: number) => {
    setDestinosSeleccionados(prev => 
      prev.includes(unidadId) 
        ? prev.filter(id => id !== unidadId)
        : [...prev, unidadId]
    );
  };

  const seleccionarTodas = () => {
    if (destinosSeleccionados.length === unidades.length) {
      setDestinosSeleccionados([]);
    } else {
      setDestinosSeleccionados(unidades.map(u => u.id));
    }
  };

  const toggleCheckbox = (opcion: string) => {
    setCheckboxes(prev => 
      prev.includes(opcion) 
        ? prev.filter(c => c !== opcion)
        : [...prev, opcion]
    );
  };

  const hojasFiltradas = hojas.filter(h => 
    h.numero_hr?.toLowerCase().includes(busqueda.toLowerCase()) ||
    h.referencia?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hojaSeleccionada) {
      setError('Seleccione una hoja de ruta');
      return;
    }

    if (destinosSeleccionados.length === 0) {
      setError('Seleccione al menos una unidad de destino');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');
    setProgresoEnvio({ total: destinosSeleccionados.length, actual: 0, mensaje: 'Iniciando envíos...' });

    try {
      // Enviar secuencialmente para que las secciones se llenen en orden
      let enviados = 0;
      let errores: string[] = [];

      for (const unidadId of destinosSeleccionados) {
        const unidadDestino = unidades.find(u => u.id === unidadId);
        setProgresoEnvio({ 
          total: destinosSeleccionados.length, 
          actual: enviados + 1, 
          mensaje: `Enviando a ${unidadDestino?.nombre || 'unidad'}...` 
        });

        try {
          await axios.post(
            API_ENDPOINTS.ENVIAR_A_UNIDAD,
            {
              hoja_id: hojaSeleccionada.id,
              unidad_id: unidadId,
              observaciones: instrucciones,
              instrucciones: checkboxes,
              auto_fill_seccion: true,
              fecha_enviado: fechaSalida,
              destino: unidadDestino?.nombre || '',
              destinos_checkboxes: checkboxes
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          enviados++;
        } catch (err: any) {
          errores.push(`${unidadDestino?.nombre}: ${err.response?.data?.error || 'Error'}`);
        }
      }
      
      if (enviados === destinosSeleccionados.length) {
        setSuccess(`Hoja de ruta enviada a ${enviados} unidad(es) correctamente`);
        setTimeout(() => navigate('/registros'), 1500);
      } else if (enviados > 0) {
        setSuccess(`Enviado a ${enviados} de ${destinosSeleccionados.length} unidades. Errores: ${errores.join(', ')}`);
      } else {
        setError(`Error al enviar: ${errores.join(', ')}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar');
    } finally {
      setSending(false);
      setProgresoEnvio({ total: 0, actual: 0, mensaje: '' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1116]">
        <div className="text-center text-[#cfcfc7]">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#e8e8e3] bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-200 tracking-tight">ENVIAR A UNIDAD</h1>
          <p className="text-[#9ea0a9] mt-1">Enviar una hoja de ruta a una o múltiples unidades</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Barra de progreso durante envío */}
        {sending && progresoEnvio.total > 0 && (
          <div className="mb-4 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-300">{progresoEnvio.mensaje}</span>
              <span className="text-amber-400">{progresoEnvio.actual}/{progresoEnvio.total}</span>
            </div>
            <div className="w-full bg-[#1a2236] rounded-full h-2">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progresoEnvio.actual / progresoEnvio.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Buscador de hojas - Solo si no hay hoja seleccionada */}
        {!hojaSeleccionada && (
          <div className="mb-6">
            <label className="block text-sm text-[#9ea0a9] mb-2">Buscar Hoja de Ruta</label>
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por número o referencia..."
                className="w-full bg-[#1a2236] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
              />
              {busqueda && hojasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a2236] border border-[rgba(255,255,255,0.1)] rounded-lg max-h-48 overflow-y-auto">
                  {hojasFiltradas.slice(0, 10).map(h => (
                    <div
                      key={h.id}
                      onClick={() => seleccionarHoja(h)}
                      className="p-3 hover:bg-amber-500/20 cursor-pointer border-b border-[rgba(255,255,255,0.05)] last:border-0"
                    >
                      <span className="text-amber-300 font-medium">{h.numero_hr}</span>
                      <span className="text-white ml-2">- {h.referencia}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!hojaSeleccionada ? (
            <div className="text-center py-12 text-[#9ea0a9] border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl">
              <p>No hay hoja seleccionada</p>
              <p className="text-sm mt-1">Use el buscador para seleccionar una hoja de ruta</p>
            </div>
          ) : (
            <>
              {/* Hoja seleccionada */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#1a2236]/50 p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.1)]">
                  <div>
                    <span className="text-amber-300 font-bold text-lg">{hojaSeleccionada.numero_hr}</span>
                    <span className="text-white ml-3">{hojaSeleccionada.referencia}</span>
                  </div>
                  <button
                    type="button"
                    onClick={quitarHoja}
                    className="text-red-400 hover:text-red-300 text-xl font-bold px-2"
                  >
                    × Cambiar
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Columna izquierda: Checkboxes e instrucciones */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-[#9ea0a9] mb-2">Instrucciones</label>
                      <div className="space-y-2">
                        {opcionesCheckbox.map(opcion => (
                          <label key={opcion} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checkboxes.includes(opcion)}
                              onChange={() => toggleCheckbox(opcion)}
                              className="w-4 h-4 rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm text-white">{opcion}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#9ea0a9] mb-1">Fecha de Salida</label>
                      <input
                        type="date"
                        value={fechaSalida}
                        onChange={(e) => setFechaSalida(e.target.value)}
                        className="w-full bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg p-2 text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#9ea0a9] mb-1">Instrucciones Adicionales</label>
                      <textarea
                        value={instrucciones}
                        onChange={(e) => setInstrucciones(e.target.value)}
                        className="w-full h-20 bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-amber-500"
                        placeholder="Instrucciones adicionales..."
                      />
                    </div>
                  </div>

                  {/* Columna derecha: Selector de unidades múltiples */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm text-[#9ea0a9]">Destinos ({destinosSeleccionados.length} seleccionados)</label>
                      <button
                        type="button"
                        onClick={seleccionarTodas}
                        className="text-xs px-3 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded-lg transition"
                      >
                        {destinosSeleccionados.length === unidades.length ? 'Deseleccionar todas' : 'Seleccionar TODAS'}
                      </button>
                    </div>
                    <div className="bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 max-h-72 overflow-y-auto">
                      {unidades.map(u => (
                        <label 
                          key={u.id} 
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                            destinosSeleccionados.includes(u.id) 
                              ? 'bg-amber-500/20 border border-amber-500/50' 
                              : 'hover:bg-[rgba(255,255,255,0.05)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={destinosSeleccionados.includes(u.id)}
                            onChange={() => toggleDestino(u.id)}
                            className="w-4 h-4 rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <span className="text-white font-medium">{u.nombre}</span>
                            {u.descripcion && (
                              <span className="text-xs text-[#9ea0a9] block">{u.descripcion}</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    {destinosSeleccionados.length > 1 && (
                      <p className="text-xs text-amber-400 mt-2">
                        Se crearán {destinosSeleccionados.length} secciones automáticamente en orden
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending || !hojaSeleccionada || destinosSeleccionados.length === 0}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {sending ? 'Enviando...' : `Enviar a ${destinosSeleccionados.length} Unidad${destinosSeleccionados.length !== 1 ? 'es' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnviarAUnidad;
