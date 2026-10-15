import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Phone, MessageSquare, Mail, Search, Plus, Edit3, Trash2, X, UserPlus
} from 'lucide-react';

export const DirectorioModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRADOR';
  const [directory, setDirectory] = useState<{ team: any[]; vendors: any[] }>({ team: [], vendors: [] });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal for assigning or creating a team member
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [assignForm, setAssignForm] = useState({ user_id: '', assigned_role: 'Coordinadora Senior' });
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'COORDINADOR',
    assigned_role: 'Coordinadora Senior'
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal for editing an assigned team member
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editMemberForm, setEditMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    assigned_role: '',
    password: ''
  });

  const fetchDirectory = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/directory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDirectory(data);
      }
    } catch (err) {
      console.error('Error fetching directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    if (!token || !isAdmin) return;
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers((data.users || []).filter((u: any) => u.role !== 'NOVIOS'));
      }
    } catch {}
  };

  useEffect(() => {
    fetchDirectory();
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [currentWedding, token, isAdmin]);

  const handleOpenAddModal = () => {
    setFormError('');
    const unassigned = allUsers.filter(u => !directory.team.some(t => t.id === u.id));
    if (unassigned.length > 0) {
      setAddMode('EXISTING');
      setAssignForm({ user_id: unassigned[0].id, assigned_role: 'Coordinadora General' });
    } else {
      setAddMode('NEW');
    }
    setShowAddModal(true);
  };

  const handleSaveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding) return;
    setFormError('');
    setSaving(true);

    try {
      if (addMode === 'EXISTING') {
        const res = await fetch(`/api/weddings/${currentWedding.id}/team`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(assignForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al asignar miembro del equipo.');
      } else {
        const res = await fetch('/api/auth/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newMemberForm.name,
            email: newMemberForm.email,
            password: newMemberForm.password,
            phone: newMemberForm.phone,
            role: newMemberForm.role,
            assigned_wedding_ids: [currentWedding.id],
            assigned_role: newMemberForm.assigned_role
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear miembro del equipo.');
      }

      setShowAddModal(false);
      setNewMemberForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'COORDINADOR',
        assigned_role: 'Coordinadora Senior'
      });
      await fetchDirectory();
      await fetchAllUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditMember = (contact: any) => {
    setFormError('');
    setEditingMember(contact);
    setEditMemberForm({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      assigned_role: contact.role || 'Coordinadora General',
      password: ''
    });
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding || !editingMember) return;
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/team/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editMemberForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar miembro.');

      if (editMemberForm.password.trim()) {
        await fetch(`/api/auth/users/${editingMember.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ password: editMemberForm.password.trim() })
        });
      }

      setEditingMember(null);
      await fetchDirectory();
      await fetchAllUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignMember = async (contact: any) => {
    if (!currentWedding) return;
    if (!window.confirm(`¿Quitar a "${contact.name}" del equipo asignado a esta boda?`)) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/team/${contact.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchDirectory();
      }
    } catch {}
  };

  const allContacts = [
    ...directory.team.map(t => ({ ...t, kind: 'TEAM' })),
    ...directory.vendors.map(v => ({ ...v, kind: 'VENDOR' }))
  ];

  const filteredContacts = allContacts.filter(c => {
    const matchesFilter = filterType === 'ALL' || c.kind === filterType;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.role && c.role.toLowerCase().includes(search.toLowerCase())) ||
      (c.type && c.type.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const unassignedUsers = allUsers.filter(u => !directory.team.some(t => t.id === u.id));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Contactos Rápidos y Asignación
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Directorio y Equipo VLB
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Equipo VLB Studio asignado a esta boda y proveedores con enlaces directos para llamada y WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'TEAM', 'VENDOR'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterType === t
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {t === 'ALL' ? 'Todos los Contactos' : t === 'TEAM' ? `Equipo VLB (${directory.team.length})` : `Proveedores (${directory.vendors.length})`}
            </button>
          ))}

          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#9C665C] hover:bg-[#8a574e] text-white transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Asignar / Nuevo Equipo VLB</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, cargo, proveedor o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="py-12 text-center text-stone-400 text-xs">Cargando directorio...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="luxury-card rounded-2xl p-8 text-center text-stone-400 text-xs border border-dashed border-stone-300">
          No se encontraron contactos en el directorio.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact, i) => (
            <div
              key={i}
              className="luxury-card rounded-2xl p-5 border border-stone-200 flex flex-col justify-between hover:border-stone-400 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    contact.kind === 'TEAM'
                      ? 'bg-[#EFE2DF] text-[#8a574e] border border-[#DFC9C4]'
                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                  }`}>
                    {contact.kind === 'TEAM' ? 'Equipo VLB' : contact.type || 'Proveedor'}
                  </span>

                  {isAdmin && contact.kind === 'TEAM' ? (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMember(contact)}
                        className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                        title="Editar datos o cargo del miembro del equipo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnassignMember(contact)}
                        className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        title="Quitar de esta boda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : contact.contact_person ? (
                    <span className="text-[10px] text-stone-400">Atención: {contact.contact_person}</span>
                  ) : null}
                </div>

                <h4 className="font-serif text-lg font-bold text-stone-900">{contact.name}</h4>
                <div className="text-xs text-stone-600 font-medium mt-0.5">
                  {contact.role || contact.category}
                </div>

                {contact.email && (
                  <div className="flex items-center space-x-1.5 text-xs text-stone-500 mt-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Call & WhatsApp */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center space-x-2">
                {contact.phone ? (
                  <>
                    <a
                      href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center justify-center p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-200 transition"
                      title="Llamar"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-stone-400 italic">Sin teléfono registrado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Asignar o Crear Miembro de Equipo VLB */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-bold text-stone-900">Equipo VLB en esta Boda</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex space-x-2 mb-4 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAddMode('EXISTING')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  addMode === 'EXISTING' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Asignar Existente ({unassignedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setAddMode('NEW')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  addMode === 'NEW' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                + Crear Nuevo Miembro
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTeamMember} className="space-y-3.5">
              {addMode === 'EXISTING' ? (
                unassignedUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                    Todos los miembros actuales del equipo VLB ya están asignados a esta boda. Usa la pestaña <strong>"+ Crear Nuevo Miembro"</strong> arriba.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Seleccionar Miembro VLB *</label>
                      <select
                        required
                        value={assignForm.user_id}
                        onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                      >
                        <option value="">Selecciona un miembro...</option>
                        {unassignedUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role} · {u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Cargo / Función en esta Boda *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Coordinadora Principal, Staff Día Boda..."
                        value={assignForm.assigned_role}
                        onChange={e => setAssignForm({ ...assignForm, assigned_role: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                      />
                    </div>
                  </>
                )
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Valeria Lozano"
                      value={newMemberForm.name}
                      onChange={e => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Email de Acceso *</label>
                      <input
                        type="email"
                        required
                        placeholder="nombre@vlb.studio"
                        value={newMemberForm.email}
                        onChange={e => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Contraseña *</label>
                      <input
                        type="password"
                        required
                        placeholder="Contraseña de acceso"
                        value={newMemberForm.password}
                        onChange={e => setNewMemberForm({ ...newMemberForm, password: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Nivel de Permiso *</label>
                      <select
                        value={newMemberForm.role}
                        onChange={e => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                      >
                        <option value="COORDINADOR">COORDINADOR (Planner)</option>
                        <option value="STAFF">STAFF (Operativo)</option>
                        <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp / Teléfono</label>
                      <input
                        type="text"
                        placeholder="+52 55..."
                        value={newMemberForm.phone}
                        onChange={e => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Cargo en esta Boda *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Coordinadora Senior, Staff Recepción..."
                      value={newMemberForm.assigned_role}
                      onChange={e => setNewMemberForm({ ...newMemberForm, assigned_role: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                {(addMode === 'NEW' || unassignedUsers.length > 0) && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow"
                  >
                    {saving ? 'Guardando...' : 'Guardar en Equipo'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Miembro del Equipo VLB */}
      {editingMember && (
        <div className="fixed inset-0 bg-stone-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-bold text-stone-900">Editar Miembro del Equipo</h3>
              <button onClick={() => setEditingMember(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editMemberForm.name}
                  onChange={e => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Cargo en esta Boda *</label>
                <input
                  type="text"
                  required
                  value={editMemberForm.assigned_role}
                  onChange={e => setEditMemberForm({ ...editMemberForm, assigned_role: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editMemberForm.email}
                    onChange={e => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    value={editMemberForm.phone}
                    onChange={e => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para conservar la actual"
                  value={editMemberForm.password}
                  onChange={e => setEditMemberForm({ ...editMemberForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
