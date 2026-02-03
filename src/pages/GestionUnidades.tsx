import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';

interface Unidad {
  id: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  telefono: string;
  activo: boolean;
  created_at: string;
}

const GestionUnidades: React.FC = () => {
  const { token } = useAuth();
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUnidad, setSelectedUnidad] = useState<Unidad | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    direccion: '',
    telefono: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUnidades = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(API_ENDPOINTS.UNIDADES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnidades(res.data?.unidades || []);
    } catch (err) {
      console.error('Error al cargar unidades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnidades();
  }, [token]);

  const handleOpenNew = () => {
    setFormData({ nombre: '', descripcion: '', direccion: '', telefono: '' });
    setEditMode(false);
    setSelectedUnidad(null);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (unidad: Unidad) => {
    setFormData({
      nombre: unidad.nombre,
      descripcion: unidad.descripcion || '',
      direccion: unidad.direccion || '',
      telefono: unidad.telefono || ''
    });
    setEditMode(true);
    setSelectedUnidad(unidad);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editMode && selectedUnidad) {
        await axios.put(
          API_ENDPOINTS.UNIDAD_DETALLE(selectedUnidad.id),
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          API_ENDPOINTS.UNIDADES,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setModalOpen(false);
      fetchUnidades();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar esta unidad?')) return;
    try {
      await axios.delete(API_ENDPOINTS.UNIDAD_DETALLE(id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUnidades();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1116]">
        <div className="text-center text-[#cfcfc7]">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm">Cargando unidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#e8e8e3] bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-200 tracking-tight">Gestion de Unidades</h1>
            <p className="text-[#9ea0a9] mt-1">Administra las unidades internas del sistema</p>
          </div>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Unidad
          </button>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-transparent overflow-hidden">
          <table className="w-full">
            <thead className="bg-[rgba(255,255,255,0.03)]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Nombre</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Descripcion</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Telefono</th>
                <th className="px-5 py-4 text-right text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {unidades.length > 0 ? unidades.map((unidad) => (
                <tr key={unidad.id} className="hover:bg-[rgba(255,255,255,0.03)] transition">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-white">{unidad.nombre}</div>
                    {unidad.direccion && (
                      <div className="text-xs text-[#8b8b86]">{unidad.direccion}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-[#a9a9a3]">
                    {unidad.descripcion || '-'}
                  </td>
                  <td className="px-5 py-4 text-sm text-[#a9a9a3]">
                    {unidad.telefono || '-'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(unidad)}
                      className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(unidad.id)}
                      className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#9ea0a9]">
                    No hay unidades registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 w-full max-w-md border border-[rgba(255,255,255,0.1)]">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editMode ? 'Editar Unidad' : 'Nueva Unidad'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9ea0a9] mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Nombre de la unidad"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9ea0a9] mb-1">Descripcion</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full h-20 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white resize-none focus:outline-none focus:border-amber-500"
                  placeholder="Descripcion opcional"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9ea0a9] mb-1">Direccion</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Direccion fisica"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9ea0a9] mb-1">Telefono</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Numero de telefono"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUnidades;
