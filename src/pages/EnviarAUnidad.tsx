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

interface HojaSeleccionada {
  hoja: HojaRuta;
  fecha_salida: string;
  destino_id: string;
  checkboxes: string[];
  instrucciones: string;
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
  const [hojasSeleccionadas, setHojasSeleccionadas] = useState<HojaSeleccionada[]>([]);

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
  }, [token]);

  // Si viene con hoja_id en URL, agregarla automáticamente
  useEffect(() => {
    if (hojaIdParam && hojas.length > 0) {
      const hoja = hojas.find(h => h.id === parseInt(hojaIdParam));
      if (hoja && !hojasSeleccionadas.find(hs => hs.hoja.id === hoja.id)) {
        agregarHoja(hoja);
      }
    }
  }, [hojaIdParam, hojas]);

  const agregarHoja = (hoja: HojaRuta) => {
    if (hojasSeleccionadas.find(hs => hs.hoja.id === hoja.id)) {
      setError('Esta hoja ya está agregada');
      return;
    }
    // Usar fecha local en lugar de UTC para evitar el problema del día anterior
    const hoy = new Date();
    const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    setHojasSeleccionadas([...hojasSeleccionadas, {
      hoja,
      fecha_salida: fechaLocal,
      destino_id: '',
      checkboxes: [],
      instrucciones: ''
    }]);
    setBusqueda('');
  };

  const quitarHoja = (hojaId: number) => {
    setHojasSeleccionadas(hojasSeleccionadas.filter(hs => hs.hoja.id !== hojaId));
  };

  const actualizarHoja = (hojaId: number, campo: keyof HojaSeleccionada, valor: any) => {
    setHojasSeleccionadas(hojasSeleccionadas.map(hs => 
      hs.hoja.id === hojaId ? { ...hs, [campo]: valor } : hs
    ));
  };

  const toggleCheckbox = (hojaId: number, opcion: string) => {
    const hojaActual = hojasSeleccionadas.find(hs => hs.hoja.id === hojaId);
    if (!hojaActual) return;
    
    const nuevosCheckboxes = hojaActual.checkboxes.includes(opcion)
      ? hojaActual.checkboxes.filter(c => c !== opcion)
      : [...hojaActual.checkboxes, opcion];
    
    actualizarHoja(hojaId, 'checkboxes', nuevosCheckboxes);
  };

  const hojasFiltradas = hojas.filter(h => 
    !hojasSeleccionadas.find(hs => hs.hoja.id === h.id) &&
    (h.numero_hr?.toLowerCase().includes(busqueda.toLowerCase()) ||
     h.referencia?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hojasSeleccionadas.length === 0) {
      setError('Agregue al menos una hoja de ruta');
      return;
    }

    // Validar que todas tengan destino
    const sinDestino = hojasSeleccionadas.filter(hs => !hs.destino_id);
    if (sinDestino.length > 0) {
      setError(`Seleccione destino para todas las hojas (${sinDestino.length} sin destino)`);
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const envios = hojasSeleccionadas.map(hs => {
        const unidadDestino = unidades.find(u => u.id === parseInt(hs.destino_id));
        return axios.post(
          API_ENDPOINTS.ENVIAR_A_UNIDAD,
          {
            hoja_id: hs.hoja.id,
            unidad_id: parseInt(hs.destino_id),
            observaciones: hs.instrucciones,
            instrucciones: hs.checkboxes,
            auto_fill_seccion: true,
            fecha_enviado: hs.fecha_salida,
            destino: unidadDestino?.nombre || '',
            destinos_checkboxes: hs.checkboxes
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      });
      
      await Promise.all(envios);
      
      setSuccess(`${hojasSeleccionadas.length} hoja(s) de ruta enviada(s) correctamente`);
      setTimeout(() => navigate('/registros'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar');
    } finally {
      setSending(false);
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
          <p className="text-[#9ea0a9] mt-1">Enviar hojas de ruta a unidades internas</p>
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

        {/* Buscador de hojas */}
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
                    onClick={() => agregarHoja(h)}
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

        {/* Lista de hojas seleccionadas */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {hojasSeleccionadas.length === 0 ? (
            <div className="text-center py-12 text-[#9ea0a9] border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl">
              <p>No hay hojas seleccionadas</p>
              <p className="text-sm mt-1">Use el buscador para agregar hojas de ruta</p>
            </div>
          ) : (
            hojasSeleccionadas.map((hs) => (
              <div key={hs.hoja.id} className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#1a2236]/50 p-4">
                {/* Header de la hoja */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.1)]">
                  <div>
                    <span className="text-amber-300 font-bold text-lg">{hs.hoja.numero_hr}</span>
                    <span className="text-white ml-3">{hs.hoja.referencia}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitarHoja(hs.hoja.id)}
                    className="text-red-400 hover:text-red-300 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Checkboxes */}
                  <div className="space-y-2">
                    {opcionesCheckbox.map(opcion => (
                      <label key={opcion} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hs.checkboxes.includes(opcion)}
                          onChange={() => toggleCheckbox(hs.hoja.id, opcion)}
                          className="w-4 h-4 rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm text-white">{opcion}</span>
                      </label>
                    ))}
                  </div>

                  {/* Fecha y Destino */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#9ea0a9] mb-1">Fecha de Salida</label>
                        <input
                          type="date"
                          value={hs.fecha_salida}
                          onChange={(e) => actualizarHoja(hs.hoja.id, 'fecha_salida', e.target.value)}
                          className="w-full bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg p-2 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#9ea0a9] mb-1">Destino</label>
                        <select
                          value={hs.destino_id}
                          onChange={(e) => actualizarHoja(hs.hoja.id, 'destino_id', e.target.value)}
                          className="w-full bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg p-2 text-white text-sm focus:outline-none focus:border-amber-500 [&>option]:bg-[#1a2236]"
                        >
                          <option value="">Seleccionar...</option>
                          {unidades.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#9ea0a9] mb-1">Instrucciones Adicionales</label>
                      <textarea
                        value={hs.instrucciones}
                        onChange={(e) => actualizarHoja(hs.hoja.id, 'instrucciones', e.target.value)}
                        className="w-full h-20 bg-[#0f1116] border border-[rgba(255,255,255,0.1)] rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-amber-500"
                        placeholder="Instrucciones adicionales..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
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
              disabled={sending || hojasSeleccionadas.length === 0}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {sending ? 'Enviando...' : `Enviar ${hojasSeleccionadas.length} Hoja${hojasSeleccionadas.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnviarAUnidad;
