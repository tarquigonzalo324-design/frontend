import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';

interface Usuario {
  id: number;
  username: string;
  nombre_completo: string;
  rol: string;
  rol_id: number;
  unidad_id: number | null;
  unidad_nombre: string | null;
  activo: boolean;
  creado_en: string;
}

interface Unidad {
  id: number;
  nombre: string;
}

const GestionUsuarios: React.FC = () => {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre_completo: '',
    unidad_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{username: string, password: string} | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [usuariosRes, unidadesRes] = await Promise.all([
        axios.get(API_ENDPOINTS.USUARIOS, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(API_ENDPOINTS.UNIDADES, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setUsuarios(usuariosRes.data?.usuarios || []);
      setUnidades(unidadesRes.data?.unidades || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenNew = () => {
    setFormData({ username: '', password: '', nombre_completo: '', unidad_id: '' });
    setEditMode(false);
    setSelectedUsuario(null);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (usuario: Usuario) => {
    setFormData({
      username: usuario.username,
      password: '',
      nombre_completo: usuario.nombre_completo,
      unidad_id: usuario.unidad_id?.toString() || ''
    });
    setEditMode(true);
    setSelectedUsuario(usuario);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nombre_completo.trim()) {
      setError('El nombre completo es requerido');
      return;
    }
    if (!editMode && (!formData.username.trim() || !formData.password)) {
      setError('Usuario y contraseña son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editMode && selectedUsuario) {
        const updateData: any = {
          nombre_completo: formData.nombre_completo,
          unidad_id: formData.unidad_id ? parseInt(formData.unidad_id) : null
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await axios.put(
          API_ENDPOINTS.USUARIO_DETALLE(selectedUsuario.id),
          updateData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setModalOpen(false);
      } else {
        await axios.post(
          API_ENDPOINTS.USUARIOS,
          {
            username: formData.username,
            password: formData.password,
            nombre_completo: formData.nombre_completo,
            unidad_id: formData.unidad_id ? parseInt(formData.unidad_id) : null
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCreatedCredentials({
          username: formData.username,
          password: formData.password
        });
        setModalOpen(false);
      }
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar este usuario?')) return;
    try {
      await axios.delete(API_ENDPOINTS.USUARIO_DETALLE(id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const getRolBadge = (rol: string) => {
    const roles: Record<string, string> = {
      'Administrador': 'bg-red-500/20 text-red-400',
      'Desarrollador': 'bg-purple-500/20 text-purple-400',
      'Operador Unidad': 'bg-blue-500/20 text-blue-400'
    };
    return roles[rol] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1116]">
        <div className="text-center text-[#cfcfc7]">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#e8e8e3] bg-gradient-to-br from-[#0b1021] via-[#0f172a] to-[#0b0f1c]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-200 tracking-tight">Gestion de Usuarios</h1>
            <p className="text-[#9ea0a9] mt-1">Administra los usuarios del sistema</p>
          </div>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-transparent overflow-hidden">
          <table className="w-full">
            <thead className="bg-[rgba(255,255,255,0.03)]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Usuario</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Rol</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Unidad</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Estado</th>
                <th className="px-5 py-4 text-right text-xs font-semibold text-[#9ea0a9] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {usuarios.length > 0 ? usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-[rgba(255,255,255,0.03)] transition">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-white">{usuario.nombre_completo}</div>
                    <div className="text-xs text-[#8b8b86]">@{usuario.username}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRolBadge(usuario.rol)}`}>
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#a9a9a3]">
                    {usuario.unidad_nombre || '-'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${usuario.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {usuario.username !== 'admin' && usuario.username !== 'jose' && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(usuario)}
                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition mr-2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id)}
                          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#9ea0a9]">
                    No hay usuarios registrados
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
              {editMode ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!editMode && (
                <div>
                  <label className="block text-sm text-[#9ea0a9] mb-1">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Nombre de usuario"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-[#9ea0a9] mb-1">
                  {editMode ? 'Nueva Contraseña (dejar vacio para mantener)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Contraseña"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9ea0a9] mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Nombre completo del usuario"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9ea0a9] mb-1">Unidad Asignada</label>
                <select
                  value={formData.unidad_id}
                  onChange={(e) => setFormData({ ...formData, unidad_id: e.target.value })}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Sin unidad asignada</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-[rgba(255,255,255,0.03)] rounded-lg">
                <p className="text-xs text-[#9ea0a9]">
                  Los usuarios creados tendran el rol "Operador Unidad" con permisos limitados a:
                  recibir hojas, responder y redirigir.
                </p>
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

      {createdCredentials && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 w-full max-w-md border border-[rgba(255,255,255,0.1)]">
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Usuario Creado Exitosamente</h3>
              <p className="text-sm text-[#9ea0a9] mt-1">Guarde estas credenciales, la contraseña no se podra recuperar</p>
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs text-[#9ea0a9] uppercase tracking-wider">Usuario</label>
                <div className="text-lg font-mono text-amber-200">{createdCredentials.username}</div>
              </div>
              <div>
                <label className="text-xs text-[#9ea0a9] uppercase tracking-wider">Contraseña</label>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-mono text-amber-200">
                    {showPassword ? createdCredentials.password : '••••••••'}
                  </div>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-2 py-1 text-xs bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] rounded transition"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.password);
                      alert('Contraseña copiada al portapapeles');
                    }}
                    className="px-2 py-1 text-xs bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] rounded transition"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCreatedCredentials(null);
                setShowPassword(false);
              }}
              className="w-full mt-6 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;
