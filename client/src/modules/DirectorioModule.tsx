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
  const isPlannerVirtual =
    !currentWedding?.package_type ||
    currentWedding.package_type.toLowerCase().includes('virtual') ||
    currentWedding.package_type.toLowerCase().includes('autónomo');
  const teamBrand = isPlannerVirtual ? 'Lazo Studio' : 'Viva la Bride';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#8A7E72]">
            Contactos Rápidos y Asignación
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#2B2826] mt-1">
            Directorio y Equipo {teamBrand}
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1 leading-relaxed">
            Equipo de coordinación asignado a esta boda y proveedores con enlaces directos para llamada y WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'TEAM', 'VENDOR'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                filterType === t
                  ? 'bg-[#C48B81] text-white shadow-xs'
                  : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EFE8E1]'
              }`}
            >
              {t === 'ALL' ? 'Todos los Contactos' : t === 'TEAM' ? `Equipo ${teamBrand} (${directory.team.length})` : `Proveedores (${directory.vendors.length})`}
            </button>
          ))}

          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#C48B81] hover:bg-[#A86B60] text-white transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Asignar Miembro</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7E72]" />
        <input
          type="text"
          placeholder="Buscar por nombre, cargo, proveedor o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] placeholder:text-[#8A7E72]/60 focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="py-12 text-center text-[#8A7E72] text-sm">Cargando directorio...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-[#8A7E72] text-sm border border-dashed border-[#EFE8E1]">
          No se encontraron contactos en el directorio para los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.map((contact, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs hover:border-[#EFE8E1] flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    contact.kind === 'TEAM'
                      ? 'bg-[#F7EDEB] text-[#C48B81] border border-[#ECD9D5]'
                      : 'bg-[#FAF8F5] text-[#5A524C] border border-[#EFE8E1]'
                  }`}>
                    {contact.kind === 'TEAM' ? `Equipo ${teamBrand}` : contact.type || 'Proveedor'}
                  </span>

                  {isAdmin && contact.kind === 'TEAM' ? (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMember(contact)}
                        className="p-1.5 text-[#8A7E72] hover:text-[#2B2826] hover:bg-[#FAF8F5] rounded-lg transition"
                        title="Editar datos o cargo del miembro del equipo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnassignMember(contact)}
                        className="p-1.5 text-[#8A7E72] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        title="Quitar de esta boda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : contact.contact_person ? (
                    <span className="text-xs text-[#8A7E72]">Atención: {contact.contact_person}</span>
                  ) : null}
                </div>

                <div className="flex items-center space-x-3 mb-1">
                  {contact.kind === 'TEAM' && (
                    contact.avatar_url ? (
                      <img
                        src={contact.avatar_url}
                        alt={contact.name}
                        className="w-11 h-11 rounded-full object-cover border border-[#CCDACC] shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#EFE2DF] text-[#A86B60] font-serif font-bold text-base flex items-center justify-center shrink-0 border border-[#EFE8E1]">
                        {contact.name?.charAt(0)?.toUpperCase() || 'V'}
                      </div>
                    )
                  )}
                  <div className="min-w-0">
                    <h4 className="font-serif text-xl font-bold text-[#2B2826] truncate">{contact.name}</h4>
                    <div className="text-xs text-[#8A7E72] font-medium">
                      {contact.role || contact.category}
                    </div>
                  </div>
                </div>

                {contact.email && (
                  <div className="flex items-center space-x-2 text-sm text-[#8A7E72] mt-3">
                    <Mail className="w-4 h-4 text-[#8A7E72]/70 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Call & WhatsApp */}
              <div className="mt-5 pt-4 border-t border-[#FAF8F5] flex items-center space-x-2">
                {contact.phone ? (
                  <>
                    <a
                      href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center space-x-2 px-3 py-2.5 bg-[#E4ECE5] hover:bg-[#D5E3D7] text-[#2B5235] text-sm font-semibold rounded-xl border border-[#BDD4C1] transition"
                    >
                      <MessageSquare className="w-4 h-4 text-[#2B5235]" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center justify-center p-2.5 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] rounded-xl border border-[#EFE8E1] transition"
                      title="Llamar"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </>
                ) : (
                  <span className="text-sm text-[#8A7E72] italic py-1">Sin teléfono registrado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Asignar o Crear Miembro de Equipo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE8E1]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">Equipo {teamBrand} en esta Boda</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8A7E72] hover:text-[#2B2826] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex space-x-2 mb-4 bg-[#FAF8F5] p-1 rounded-xl border border-[#EFE8E1]">
              <button
                type="button"
                onClick={() => setAddMode('EXISTING')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  addMode === 'EXISTING' ? 'bg-[#C48B81] text-white shadow-xs' : 'text-[#5A524C]'
                }`}
              >
                Asignar Existente ({unassignedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setAddMode('NEW')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  addMode === 'NEW' ? 'bg-[#C48B81] text-white shadow-xs' : 'text-[#5A524C]'
                }`}
              >
                + Crear Nuevo Miembro
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTeamMember} className="space-y-4">
              {addMode === 'EXISTING' ? (
                unassignedUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#8A7E72] bg-[#FAF8F5] rounded-2xl border border-[#EFE8E1]">
                    Todos los miembros actuales del equipo {teamBrand} ya están asignados a esta boda. Usa la pestaña <strong>"+ Crear Nuevo Miembro"</strong> arriba.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Seleccionar Miembro {teamBrand} *</label>
                      <select
                        required
                        value={assignForm.user_id}
                        onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
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
                      <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Cargo / Función en esta Boda *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Coordinadora Principal, Staff Día Boda..."
                        value={assignForm.assigned_role}
                        onChange={e => setAssignForm({ ...assignForm, assigned_role: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                      />
                    </div>
                  </>
                )
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Valeria Lozano"
                      value={newMemberForm.name}
                      onChange={e => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Email de Acceso *</label>
                      <input
                        type="email"
                        required
                        placeholder="nombre@vlb.studio"
                        value={newMemberForm.email}
                        onChange={e => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Contraseña *</label>
                      <input
                        type="password"
                        required
                        placeholder="Contraseña"
                        value={newMemberForm.password}
                        onChange={e => setNewMemberForm({ ...newMemberForm, password: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Nivel de Permiso *</label>
                      <select
                        value={newMemberForm.role}
                        onChange={e => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                      >
                        <option value="COORDINADOR">COORDINADOR (Planner)</option>
                        <option value="STAFF">STAFF (Operativo)</option>
                        <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">WhatsApp / Teléfono</label>
                      <input
                        type="text"
                        placeholder="+52 55..."
                        value={newMemberForm.phone}
                        onChange={e => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Cargo en esta Boda *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Coordinadora Senior, Staff Recepción..."
                      value={newMemberForm.assigned_role}
                      onChange={e => setNewMemberForm({ ...newMemberForm, assigned_role: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8E1]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                {(addMode === 'NEW' || unassignedUsers.length > 0) && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-sm font-bold uppercase tracking-wider rounded-xl shadow-xs transition"
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
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE8E1]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">Editar Miembro del Equipo</h3>
              <button onClick={() => setEditingMember(null)} className="text-[#8A7E72] hover:text-[#2B2826] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editMemberForm.name}
                  onChange={e => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Cargo en esta Boda *</label>
                <input
                  type="text"
                  required
                  value={editMemberForm.assigned_role}
                  onChange={e => setEditMemberForm({ ...editMemberForm, assigned_role: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Email *</label>
                  <input
                    type="email"
                    required
                    value={editMemberForm.email}
                    onChange={e => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    value={editMemberForm.phone}
                    onChange={e => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para conservar la actual"
                  value={editMemberForm.password}
                  onChange={e => setEditMemberForm({ ...editMemberForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8E1]">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-sm font-bold uppercase tracking-wider rounded-xl shadow-xs transition"
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
