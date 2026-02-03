import React from 'react';
import SedegesLogo from './SedegesLogo';

interface RespuestaUnidad {
  seccion: number;
  destino: string;
  fecha_enviado?: string;
  fecha_recepcion: string;
  instrucciones: string;
  respuesta: string;
  accion: string;
  responsable: string;
}

interface SeccionAdicionalData {
  fecha_enviado?: string;
  fecha_recepcion?: string;
  destino?: string;
  destinos?: string[];
  instrucciones_adicionales?: string;
}

interface HojaRutaPreviewProps {
  data: any;
  respuestasUnidades?: RespuestaUnidad[];
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

const HojaRutaPreview: React.FC<HojaRutaPreviewProps> = ({ data, respuestasUnidades = [] }) => {
  // data puede venir de formData (creación) o de la BD (detalle)
  // Extraer detalles si vienen de la BD
  const detalles = data.detalles || {};
  
  // Normalizar campos para que existan todos
  const hoja = {
    numero_hr: data.numero_hr || '',
    referencia: data.referencia || '',
    prioridad: data.prioridad || '',
    procedencia: data.procedencia || '',
    nombre_solicitante: data.nombre_solicitante || '',
    telefono_celular: data.telefono_celular || '',
    fecha_documento: data.fecha_documento || '',
    fecha_ingreso: data.fecha_ingreso || '',
    cite: data.cite || '',
    numero_fojas: data.numero_fojas || '',
    destino_principal: data.destino_principal || detalles.destino_principal || data.ubicacion_actual || '',
    destinos: data.destinos || detalles.destinos || [],
    instrucciones_adicionales: data.instrucciones_adicionales || detalles.instrucciones_adicionales || data.observaciones || '',
  };

  // Obtener secciones adicionales desde detalles o formato legacy
  // Filtrar secciones vacías o sin número válido
  const seccionesFromDetalles: SeccionAdicionalData[] = (detalles.secciones_adicionales || [])
    .filter((s: any) => s && s.seccion && (s.fecha_enviado || s.destino || (s.destinos && s.destinos.length > 0)));
  
  // Construir array de secciones combinando formato nuevo y legacy
  const buildSeccionesArray = (): SeccionAdicionalData[] => {
    // Si hay secciones en formato nuevo, usarlas (ya filtradas)
    if (seccionesFromDetalles.length > 0) {
      // Asegurar que haya al menos 3 secciones (las vacías solo se muestran en UI, no en PDF con datos basura)
      const resultado = [...seccionesFromDetalles];
      while (resultado.length < 3) {
        resultado.push({
          fecha_enviado: '',
          fecha_recepcion: '',
          destino: '',
          destinos: [],
          instrucciones_adicionales: ''
        });
      }
      return resultado;
    }
    
    // Sino, construir desde formato legacy (hasta 10 secciones)
    const secciones: SeccionAdicionalData[] = [];
    for (let i = 1; i <= 10; i++) {
      const fechaEnviado = detalles[`fecha_enviado_${i}`] || data[`fecha_enviado_${i}`] || '';
      const fechaRecepcion = detalles[`fecha_recepcion_${i}`] || data[`fecha_recepcion_${i}`] || '';
      const destino = detalles[`destino_${i}`] || data[`destino_${i}`] || '';
      const destinos = detalles[`destinos_${i}`] || data[`destinos_${i}`] || [];
      const instrucciones = detalles[`instrucciones_adicionales_${i}`] || data[`instrucciones_adicionales_${i}`] || '';
      
      // Solo agregar si tiene algún dato
      if (fechaEnviado || fechaRecepcion || destino || destinos.length > 0 || instrucciones) {
        secciones.push({
          fecha_enviado: fechaEnviado,
          fecha_recepcion: fechaRecepcion,
          destino,
          destinos,
          instrucciones_adicionales: instrucciones
        });
      } else if (i <= 3) {
        // Siempre mostrar al menos 3 secciones vacías
        secciones.push({
          fecha_enviado: '',
          fecha_recepcion: '',
          destino: '',
          destinos: [],
          instrucciones_adicionales: ''
        });
      }
    }
    return secciones;
  };

  const seccionesArray = buildSeccionesArray();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Parsear la fecha sin conversión de timezone
      // Si viene como "2026-02-03" o "2026-02-03T00:00:00", extraer solo la parte de fecha
      const dateOnly = dateStr.split('T')[0]; // "2026-02-03"
      const [year, month, day] = dateOnly.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      // Fallback para otros formatos
      return new Date(dateStr).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ background: '#fff', color: '#222', width: '100%' }}>
      {/* Primera página */}
      <div className="bg-white p-6">
        <div className="text-center mb-1">
          <div className="flex items-start justify-between mb-2">
            <SedegesLogo width={80} height={80} className="mt-2" />
            <div className="flex-1 text-center">
              <h2 className="text-lg font-bold">SERVICIO DEPARTAMENTAL DE GESTIÓN SOCIAL</h2>
              <h3 className="text-xl font-bold">HOJA DE RUTA</h3>
            </div>
            <div className="text-right">
              <div className="border border-black p-1 min-w-[120px]">
                <p className="text-xs font-bold text-center">NÚMERO H.R.</p>
                <p className="text-center text-sm">{hoja.numero_hr || '........................'}</p>
              </div>
            </div>
          </div>
        </div>
        {/* Tabla principal */}
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black bg-gray-100 p-1 font-bold">REFERENCIA</td>
              <td className="border border-black p-1">{hoja.referencia}</td>
              <td className="border border-black bg-gray-100 p-1 text-center">
                <div className="space-y-1">
                  <div>
                    <input type="checkbox" checked={hoja.prioridad === 'urgente'} readOnly className="mr-1" />
                    URGENTE
                  </div>
                  <div>
                    <input type="checkbox" checked={hoja.prioridad === 'prioritario'} readOnly className="mr-1" />
                    PRIORITARIO
                  </div>
                  <div>
                    <input type="checkbox" checked={hoja.prioridad === 'rutinario'} readOnly className="mr-1" />
                    RUTINARIO
                  </div>
                  <div>
                    <input type="checkbox" checked={hoja.prioridad === 'otros'} readOnly className="mr-1" />
                    OTROS
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 p-1 font-bold">PROCEDENCIA</td>
              <td className="border border-black p-1" colSpan={2}>{hoja.procedencia}</td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 p-1 font-bold">NOMBRE SOLICITANTE</td>
              <td className="border border-black p-1">{hoja.nombre_solicitante}</td>
              <td className="border border-black p-1">
                <div className="flex">
                  <span className="bg-gray-100 font-bold pr-2">TEL:</span>
                  <span>{hoja.telefono_celular}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 p-1 font-bold">FECHA DE DOCUMENTO</td>
              <td className="border border-black p-1">{hoja.fecha_documento}</td>
              <td className="border border-black p-1"></td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 p-1 font-bold">FECHA DE INGRESO</td>
              <td className="border border-black p-1">{hoja.fecha_ingreso}</td>
              <td className="border border-black p-1"></td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 p-1 font-bold">CITE:</td>
              <td className="border border-black p-1">{hoja.cite}</td>
              <td className="border border-black p-1">
                <span className="font-bold">No. FOJAS:</span> {hoja.numero_fojas}
              </td>
            </tr>
          </tbody>
        </table>
        {/* IMPORTANTE */}
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
        {/* DESTINO principal */}
        <div className="border border-black border-t-0">
          <div className="bg-gray-100 p-1">
            <span className="text-sm font-bold">DESTINO</span>
          </div>
          <div className="border-b border-black p-1">
            <div className="border border-gray-400 p-2 min-h-10 text-xs">
              {hoja.destino_principal || '...........................................................................'}
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="border-r border-black p-1">
              <div className="space-y-1 text-xs">
                {destinosOptions.map((destino) => (
                  <div key={destino}>
                    <input type="checkbox" checked={hoja.destinos.includes(destino)} readOnly className="mr-1" />{destino}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-1">
              <div className="text-center mb-1">
                <span className="text-sm font-bold">INSTRUCCIONES ADICIONALES:</span>
              </div>
              <div className="text-xs min-h-20 p-1">
                {hoja.instrucciones_adicionales}
              </div>
              <div className="mt-2 text-center text-xs">
                <div>Lic. Beatriz Churata Mamani</div>
                <div className="font-bold">Directora Técnica</div>
                <div className="font-bold">SEDEGES</div>
              </div>
            </div>
          </div>
        </div>

        {/* Secciones de la primera página (hasta 3) */}
        {seccionesArray.slice(0, 3).map((seccion, index) => {
          const section = index + 1;
          const respuestaUnidad = respuestasUnidades.find(r => r.seccion === section);
          
          const fechaEnviado = respuestaUnidad?.fecha_enviado 
            ? formatDate(respuestaUnidad.fecha_enviado)
            : (seccion.fecha_enviado ? formatDate(seccion.fecha_enviado) : '');
          const fechaRecepcion = respuestaUnidad?.fecha_recepcion 
            ? formatDate(respuestaUnidad.fecha_recepcion)
            : (seccion.fecha_recepcion ? formatDate(seccion.fecha_recepcion) : '');
          const destinoSeccion = respuestaUnidad?.destino || seccion.destino || '';
          const instruccionesSeccion = respuestaUnidad?.instrucciones || seccion.instrucciones_adicionales || '';
          const respuestaTexto = respuestaUnidad?.respuesta || '';
          const destinosSeccion = seccion.destinos || [];

          return (
            <div key={section}>
              <div className="border border-black border-t-0 p-1 grid grid-cols-3 gap-2">
                <span className="text-xs font-bold">
                  FECHA DE ENVIADO: {fechaEnviado || '________________'}
                </span>
                <span className="text-xs font-bold">
                  FECHA DE RECEPCIÓN: {fechaRecepcion || '________________'}
                </span>
                <span className="text-xs font-bold">
                  DESTINO {section}: {destinoSeccion || '..............................'}
                </span>
              </div>
              {respuestaUnidad && (
                <div className="border border-black border-t-0 p-1 bg-blue-50">
                  <span className="text-xs text-blue-700 font-semibold">
                    [{respuestaUnidad.accion} - {respuestaUnidad.responsable}]
                  </span>
                </div>
              )}
              <div className="border border-black border-t-0">
                <div className="grid grid-cols-2">
                  <div className="border-r border-black p-1">
                    <div className="space-y-1 text-xs">
                      {destinosSeccionesAdicionalesOptions.map((destino) => (
                        <div key={`sec${section}_${destino}`}>
                          <input type="checkbox" checked={destinosSeccion.includes(destino)} readOnly className="mr-1" />{destino}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-1">
                    <div className="text-xs">
                      <div className="font-bold mb-1">Instrucciones Adicionales {section}:</div>
                      <div className="min-h-[80px]">
                        {instruccionesSeccion ? (
                          <div className="whitespace-pre-wrap">{instruccionesSeccion}</div>
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
                      {respuestaTexto && (
                        <div className="mt-2 border-t border-gray-400 pt-1">
                          <div className="font-bold text-blue-700">RESPUESTA:</div>
                          <div className="whitespace-pre-wrap text-blue-800">{respuestaTexto}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Páginas adicionales para secciones 4+ */}
        {seccionesArray.length > 3 && (
          <>
            {Array.from({ length: Math.ceil((seccionesArray.length - 3) / 4) }).map((_, pageIndex) => {
              const startIdx = 3 + (pageIndex * 4);
              const endIdx = Math.min(startIdx + 4, seccionesArray.length);
              const seccionesEnPagina = seccionesArray.slice(startIdx, endIdx);
              
              return (
                <div 
                  key={`page-${pageIndex + 2}`} 
                  className="bg-white p-6"
                  style={{ marginTop: '450px' }}
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
                          <p className="text-center text-sm">{hoja.numero_hr || '........................'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="">
                    {seccionesEnPagina.map((seccion, idx) => {
                      const section = startIdx + idx + 1;
                      const respuestaUnidad = respuestasUnidades.find(r => r.seccion === section);
                      
                      const fechaEnviado = respuestaUnidad?.fecha_enviado 
                        ? formatDate(respuestaUnidad.fecha_enviado)
                        : (seccion.fecha_enviado ? formatDate(seccion.fecha_enviado) : '');
                      const fechaRecepcion = respuestaUnidad?.fecha_recepcion 
                        ? formatDate(respuestaUnidad.fecha_recepcion)
                        : (seccion.fecha_recepcion ? formatDate(seccion.fecha_recepcion) : '');
                      const destinoSeccion = respuestaUnidad?.destino || seccion.destino || '';
                      const instruccionesSeccion = respuestaUnidad?.instrucciones || seccion.instrucciones_adicionales || '';
                      const respuestaTexto = respuestaUnidad?.respuesta || '';
                      const destinosSeccion = seccion.destinos || [];

                      return (
                        <div key={section} className={idx === 0 ? '' : 'mt-2'}>
                          <div className="border border-black p-1 bg-gray-200">
                            <span className="text-xs font-bold">SECCIÓN {section}</span>
                          </div>
                          <div className="border border-black border-t-0 p-1 grid grid-cols-3 gap-2">
                            <span className="text-xs font-bold">FECHA DE ENVIADO: {fechaEnviado || '________________'}</span>
                            <span className="text-xs font-bold">FECHA DE RECEPCIÓN: {fechaRecepcion || '________________'}</span>
                            <span className="text-xs font-bold">DESTINO: {destinoSeccion || '..............................'}</span>
                          </div>
                          {respuestaUnidad && (
                            <div className="border border-black border-t-0 p-1 bg-blue-50">
                              <span className="text-xs text-blue-700 font-semibold">
                                [{respuestaUnidad.accion} - {respuestaUnidad.responsable}]
                              </span>
                            </div>
                          )}
                          <div className="border border-black border-t-0">
                            <div className="grid grid-cols-2">
                              <div className="border-r border-black p-1">
                                <div className="space-y-1 text-xs">
                                  {destinosSeccionesAdicionalesOptions.map((destino) => (
                                    <div key={`page${pageIndex}_sec${section}_${destino}`}>
                                      <input type="checkbox" checked={destinosSeccion.includes(destino)} readOnly className="mr-1" />
                                      {destino}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="p-1">
                                <div className="text-xs">
                                  <div className="font-bold mb-1">Instrucciones Adicionales:</div>
                                  <div className="min-h-[80px]">
                                    {instruccionesSeccion ? (
                                      <div className="whitespace-pre-wrap">{instruccionesSeccion}</div>
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
                                  {respuestaTexto && (
                                    <div className="mt-2 border-t border-gray-400 pt-1">
                                      <div className="font-bold text-blue-700">RESPUESTA:</div>
                                      <div className="whitespace-pre-wrap text-blue-800">{respuestaTexto}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default HojaRutaPreview;
