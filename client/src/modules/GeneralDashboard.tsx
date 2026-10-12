import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wedding, User, AuditLog } from '../types';
import * as XLSX from 'xlsx';
import {
  Plus, Calendar, MapPin, Users, ArrowRight, Sparkles,
  Building2, Search, AlertCircle, Shield, Settings,
  Database, History, Download, Upload, Trash2, CheckCircle2, Edit3,
  FileSpreadsheet, RefreshCw, Save, X
} from 'lucide-react';

export const GeneralDashboard: React.FC = () => {
  const { user, token, setCurrentWedding } = useAuth();
  const [activeTab, setActiveTab] = useState<'weddings' | 'users' | 'catalogs' | 'audit'>('weddings');

  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Admin: Users management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'COORDINADOR' as User['role'],
    phone: '',
    wedding_id: '',
    assigned_wedding_ids: [] as string[],
    assigned_role: ''
  });
  const [userError, setUserError] = useState('');

  // Admin: Catalogs & Master VLB Templates state
  const [vendorTypes, setVendorTypes] = useState<string[]>([]);
  const [newVendorType, setNewVendorType] = useState('');
  const [meetingPackages, setMeetingPackages] = useState<{ name: string; maxMeetings: number; description: string }[]>([]);
  const [newPackage, setNewPackage] = useState({ name: '', maxMeetings: 4, description: '' });
  const [masterChecklist, setMasterChecklist] = useState<{ title: string; category: string; priority: string; responsible: string }[]>([]);
  const [newMasterTask, setNewMasterTask] = useState({
    title: '',
    category: 'Checklist General',
    priority: 'Alta',
    responsible: 'VLB Studio'
  });
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState({
    title: '',
    category: 'Checklist General',
    priority: 'Alta',
    responsible: 'VLB Studio'
  });

  const [masterCivilReqs, setMasterCivilReqs] = useState<string[]>([]);
  const [newMasterCivilReq, setNewMasterCivilReq] = useState('');
  const [editingCivilIdx, setEditingCivilIdx] = useState<number | null>(null);
  const [editingCivilText, setEditingCivilText] = useState('');

  const [masterReligiousReqs, setMasterReligiousReqs] = useState<string[]>([]);
  const [newMasterReligiousReq, setNewMasterReligiousReq] = useState('');
  const [editingReligiousIdx, setEditingReligiousIdx] = useState<number | null>(null);
  const [editingReligiousText, setEditingReligiousText] = useState('');

  const [importingExcel, setImportingExcel] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [catalogMsg, setCatalogMsg] = useState('');

  // Admin: Global Audit & Backups state
  const [globalLogs, setGlobalLogs] = useState<AuditLog[]>([]);
  const [backupsList, setBackupsList] = useState<{ filename: string; size: number; created_at: string }[]>([]);
  const [restoreMsg, setRestoreMsg] = useState('');

  // New wedding form
  const [formData, setFormData] = useState({
    name: '',
    partner_1_name: '',
    partner_2_name: '',
    wedding_date: '',
    ceremony_venue: '',
    reception_venue: '',
    ceremony_time: '15:00',
    reception_time: '18:00',
    estimated_guests: '150',
    package_type: 'Integral',
    notes: ''
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWeddings = async () => {
    try {
      const res = await fetch('/api/weddings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWeddings(data.weddings || []);
      }
    } catch (err) {
      console.error('Error fetching weddings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (user?.role !== 'ADMINISTRADOR') return;
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {}
  };

  const fetchCatalogs = async () => {
    try {
      const res = await fetch('/api/catalogs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVendorTypes(data.catalogs?.vendor_types || []);
        setMeetingPackages(data.catalogs?.meeting_packages || []);
        setMasterChecklist(data.catalogs?.master_checklist || []);
        setMasterCivilReqs(data.catalogs?.master_civil_requirements || []);
        setMasterReligiousReqs(data.catalogs?.master_religious_requirements || []);
      }
    } catch {}
  };

  const fetchAuditAndBackups = async () => {
    if (user?.role !== 'ADMINISTRADOR') return;
    try {
      const [audRes, bkpRes] = await Promise.all([
        fetch('/api/admin/audit', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/backups', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (audRes.ok) {
        const d = await audRes.json();
        setGlobalLogs(d.logs || []);
      }
      if (bkpRes.ok) {
        const b = await bkpRes.json();
        setBackupsList(b.backups || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (token) {
      fetchWeddings();
      fetchCatalogs();
      if (user?.role === 'ADMINISTRADOR') {
        fetchUsers();
        fetchAuditAndBackups();
      }
    }
  }, [token, user?.role]);

  const handleCreateWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la boda.');
      }
      setShowCreateModal(false);
      setFormData({
        name: '',
        partner_1_name: '',
        partner_2_name: '',
        wedding_date: '',
        ceremony_venue: '',
        reception_venue: '',
        ceremony_time: '15:00',
        reception_time: '18:00',
        estimated_guests: '150',
        package_type: 'Integral',
        notes: ''
      });
      await fetchWeddings();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWedding = async (e: React.MouseEvent, w: Wedding) => {
    e.stopPropagation();
    if (!window.confirm(`¿Estás segura de eliminar la boda "${w.name}"? Esta acción borrará todos sus registros.`)) return;
    try {
      const res = await fetch(`/api/weddings/${w.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchWeddings();
      }
    } catch {}
  };

  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserError('');
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'COORDINADOR',
      phone: '',
      wedding_id: '',
      assigned_wedding_ids: weddings.map(w => w.id),
      assigned_role: 'Coordinadora Senior'
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setUserError('');
    setUserForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || '',
      wedding_id: u.wedding_id || '',
      assigned_wedding_ids: Array.isArray(u.assigned_wedding_ids) ? u.assigned_wedding_ids : [],
      assigned_role: u.assignments?.[0]?.assigned_role || (u.role === 'COORDINADOR' ? 'Coordinadora General' : 'Staff Operativo Día Boda')
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (u: any) => {
    if (u.id === user?.id) {
      alert('No puedes eliminar tu propia cuenta activa de Administrador.');
      return;
    }
    if (!window.confirm(`¿Estás segura de eliminar al usuario "${u.name}" (${u.email})?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar usuario.');
        return;
      }
      await fetchUsers();
      await fetchWeddings();
    } catch {}
  };

  const handleToggleAssignedWedding = (wId: string) => {
    const exists = userForm.assigned_wedding_ids.includes(wId);
    const updated = exists
      ? userForm.assigned_wedding_ids.filter(id => id !== wId)
      : [...userForm.assigned_wedding_ids, wId];
    setUserForm({ ...userForm, assigned_wedding_ids: updated });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    try {
      const url = editingUser ? `/api/auth/users/${editingUser.id}` : '/api/auth/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...userForm,
          wedding_id: userForm.role === 'NOVIOS' ? (userForm.wedding_id || null) : null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar usuario.');
      }
      setShowUserModal(false);
      await fetchUsers();
      await fetchWeddings();
    } catch (err: any) {
      setUserError(err.message);
    }
  };

  const saveCatalogKey = async (key: string, values: any[]) => {
    try {
      const res = await fetch(`/api/catalogs/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ values })
      });
      if (res.ok) {
        setCatalogMsg('Catálogo actualizado y sincronizado en todo LAZO.');
        setTimeout(() => setCatalogMsg(''), 3000);
        await fetchCatalogs();
      }
    } catch {}
  };

  const handleAddVendorType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorType.trim()) return;
    if (vendorTypes.includes(newVendorType.trim())) return;
    const updated = [...vendorTypes, newVendorType.trim()];
    setVendorTypes(updated);
    setNewVendorType('');
    saveCatalogKey('vendor_types', updated);
  };

  const handleRemoveVendorType = (t: string) => {
    const updated = vendorTypes.filter(x => x !== t);
    setVendorTypes(updated);
    saveCatalogKey('vendor_types', updated);
  };

  const handleAddPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackage.name.trim()) return;
    const updated = [...meetingPackages, { ...newPackage, name: newPackage.name.trim() }];
    setMeetingPackages(updated);
    setNewPackage({ name: '', maxMeetings: 4, description: '' });
    saveCatalogKey('meeting_packages', updated);
  };

  const handleRemovePackage = (name: string) => {
    const updated = meetingPackages.filter(p => p.name !== name);
    setMeetingPackages(updated);
    saveCatalogKey('meeting_packages', updated);
  };

  const handleAddMasterTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterTask.title.trim()) return;
    const updated = [
      ...masterChecklist,
      {
        title: newMasterTask.title.trim(),
        category: newMasterTask.category,
        priority: newMasterTask.priority,
        responsible: newMasterTask.responsible.trim() || 'VLB Studio'
      }
    ];
    setMasterChecklist(updated);
    setNewMasterTask({ ...newMasterTask, title: '' });
    saveCatalogKey('master_checklist', updated);
  };

  const handleStartEditMasterTask = (idx: number) => {
    const item = masterChecklist[idx];
    setEditingTaskIdx(idx);
    setEditingTaskDraft({
      title: item.title,
      category: item.category || '12 Meses Antes',
      priority: item.priority || 'Alta',
      responsible: item.responsible || 'VLB Studio'
    });
  };

  const handleSaveEditMasterTask = (idx: number) => {
    if (!editingTaskDraft.title.trim()) return;
    const updated = masterChecklist.map((item, i) =>
      i === idx
        ? {
            title: editingTaskDraft.title.trim(),
            category: editingTaskDraft.category,
            priority: editingTaskDraft.priority,
            responsible: editingTaskDraft.responsible.trim() || 'VLB Studio'
          }
        : item
    );
    setMasterChecklist(updated);
    setEditingTaskIdx(null);
    saveCatalogKey('master_checklist', updated);
  };

  const handleRemoveMasterTask = (index: number) => {
    const updated = masterChecklist.filter((_, i) => i !== index);
    setMasterChecklist(updated);
    saveCatalogKey('master_checklist', updated);
  };

  const handleAddMasterCivilReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterCivilReq.trim()) return;
    const updated = [...masterCivilReqs, newMasterCivilReq.trim()];
    setMasterCivilReqs(updated);
    setNewMasterCivilReq('');
    saveCatalogKey('master_civil_requirements', updated);
  };

  const handleSaveEditCivilReq = (idx: number) => {
    if (!editingCivilText.trim()) return;
    const updated = masterCivilReqs.map((r, i) => (i === idx ? editingCivilText.trim() : r));
    setMasterCivilReqs(updated);
    setEditingCivilIdx(null);
    saveCatalogKey('master_civil_requirements', updated);
  };

  const handleRemoveMasterCivilReq = (index: number) => {
    const updated = masterCivilReqs.filter((_, i) => i !== index);
    setMasterCivilReqs(updated);
    saveCatalogKey('master_civil_requirements', updated);
  };

  const handleAddMasterReligiousReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterReligiousReq.trim()) return;
    const updated = [...masterReligiousReqs, newMasterReligiousReq.trim()];
    setMasterReligiousReqs(updated);
    setNewMasterReligiousReq('');
    saveCatalogKey('master_religious_requirements', updated);
  };

  const handleSaveEditReligiousReq = (idx: number) => {
    if (!editingReligiousText.trim()) return;
    const updated = masterReligiousReqs.map((r, i) => (i === idx ? editingReligiousText.trim() : r));
    setMasterReligiousReqs(updated);
    setEditingReligiousIdx(null);
    saveCatalogKey('master_religious_requirements', updated);
  };

  const handleRemoveMasterReligiousReq = (index: number) => {
    const updated = masterReligiousReqs.filter((_, i) => i !== index);
    setMasterReligiousReqs(updated);
    saveCatalogKey('master_religious_requirements', updated);
  };

  // Download Excel Template with current Master VLB Templates
  const handleDownloadTemplatesExcel = () => {
    const rows: any[] = [];
    masterChecklist.forEach(item => {
      rows.push({
        MODULO: 'CHECKLIST',
        ETAPA_O_MES: item.category || '12 Meses Antes',
        ACTIVIDAD_O_REQUISITO: item.title,
        RESPONSABLE: item.responsible || 'VLB Studio',
        PRIORIDAD: item.priority || 'Alta'
      });
    });
    masterCivilReqs.forEach(req => {
      rows.push({
        MODULO: 'CIVIL',
        ETAPA_O_MES: 'Requisitos Civil',
        ACTIVIDAD_O_REQUISITO: req,
        RESPONSABLE: 'Novios & VLB',
        PRIORIDAD: 'Alta'
      });
    });
    masterReligiousReqs.forEach(req => {
      rows.push({
        MODULO: 'RELIGIOSA',
        ETAPA_O_MES: 'Requisitos Iglesia',
        ACTIVIDAD_O_REQUISITO: req,
        RESPONSABLE: 'Novios & VLB',
        PRIORIDAD: 'Alta'
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 60 },
      { wch: 22 },
      { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantillas VLB');
    XLSX.writeFile(wb, 'Plantillas_Maestras_VLB_Studio.xlsx');
  };

  // Upload Excel file and automatically classify rows to Checklist, Civil, or Religiosa
  const handleUploadTemplatesExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const allRows: any[] = [];

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
          jsonRows.forEach(r => {
            allRows.push({ ...r, _sheet: sheetName });
          });
        });

        const res = await fetch('/api/catalogs/templates/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            rows: allRows,
            replaceExisting: false,
            syncToWeddings: true
          })
        });
        const result = await res.json();
        if (res.ok) {
          setCatalogMsg(result.message);
          setTimeout(() => setCatalogMsg(''), 6000);
          await fetchCatalogs();
          await fetchWeddings();
        } else {
          alert(result.error || 'Error al importar Excel de plantillas.');
        }
      } catch (err) {
        alert('Error al leer el archivo Excel.');
      } finally {
        setImportingExcel(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Push current Master Templates to all active weddings
  const handleSyncTemplatesToWeddings = async () => {
    setSyncingTemplates(true);
    try {
      const res = await fetch('/api/catalogs/templates/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCatalogMsg(data.message);
        setTimeout(() => setCatalogMsg(''), 5000);
        await fetchWeddings();
      }
    } catch {} finally {
      setSyncingTemplates(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lazo_vlb_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        await fetchAuditAndBackups();
      }
    } catch {}
  };

  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('¿Estás segura de restaurar este respaldo? Reemplazará el estado actual de la base de datos con el contenido del archivo.')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(reader.result as string);
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(json)
        });
        const data = await res.json();
        if (res.ok) {
          setRestoreMsg(data.message);
          await fetchWeddings();
          await fetchUsers();
          await fetchCatalogs();
          await fetchAuditAndBackups();
        } else {
          alert(data.error || 'Error al restaurar respaldo.');
        }
      } catch {
        alert('El archivo seleccionado no es un respaldo JSON válido de LAZO.');
      }
    };
    reader.readAsText(file);
  };

  const filteredWeddings = weddings.filter(w => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.partner_1_name.toLowerCase().includes(search.toLowerCase()) ||
      w.partner_2_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* VLB Executive Header Banner — Editorial Rosa Quemado & Crema */}
      <div className="bg-[#9E6B66] rounded-3xl p-8 text-[#FFFFFF] shadow-sm mb-8 relative overflow-hidden border border-[#8E5B56]">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#B88782]/35 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-[#F7EEEC] text-[11px] font-semibold tracking-[0.22em] uppercase mb-2">
              <Sparkles className="w-4 h-4 text-[#EFE2DF]" />
              <span>Dirección General · VLB Studio</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-[#FFFFFF]">
              LAZO · Planeación y Operación
            </h1>
            <p className="text-[#FAF5F3] text-xs sm:text-sm max-w-2xl mt-2 leading-relaxed">
              Supervisión ejecutiva de bodas activas, confirmaciones en tiempo real, control financiero y coordinación de equipo.
            </p>
          </div>

          {user?.role === 'ADMINISTRADOR' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 bg-[#FFFFFF] text-[#332C2A] hover:bg-[#EFE2DF] px-5 py-3 rounded-2xl text-xs font-semibold uppercase tracking-widest shadow-xs transition"
              >
                <Plus className="w-4 h-4 text-[#A6736E]" />
                <span>Nueva Boda</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Key Metrics Bar: Cormorant Garamond numbers + Inter operational labels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 pt-6 border-t border-[#B5837E]/60">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#F7EEEC] font-medium">Bodas en Gestión</div>
            <div className="text-3xl sm:text-4xl font-serif font-semibold text-[#FFFFFF] mt-1">{weddings.length}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#F7EEEC] font-medium">Invitados Estimados</div>
            <div className="text-3xl sm:text-4xl font-serif font-semibold text-[#FFFFFF] mt-1">
              {weddings.reduce((acc, w) => acc + (w.estimated_guests || 0), 0)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#F7EEEC] font-medium">Confirmados Totales</div>
            <div className="text-3xl sm:text-4xl font-serif font-semibold text-[#EFE2DF] mt-1">
              {weddings.reduce((acc, w) => acc + (w.confirmed_guests || 0), 0)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#F7EEEC] font-medium">Tareas Pendientes</div>
            <div className="text-3xl sm:text-4xl font-serif font-semibold text-[#FAF5F3] mt-1">
              {weddings.reduce((acc, w) => acc + (w.pending_tasks || 0), 0)}
            </div>
          </div>
        </div>

        {/* Admin Navigation Sub-Tabs */}
        {user?.role === 'ADMINISTRADOR' && (
          <div className="flex flex-wrap gap-2.5 mt-6 pt-5 border-t border-[#B5837E]/60">
            <button
              onClick={() => setActiveTab('weddings')}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'weddings'
                  ? 'bg-[#FFFFFF] text-[#332C2A] shadow-xs'
                  : 'bg-[#885853]/70 text-[#FFFFFF] hover:bg-[#885853]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Bodas VLB ({weddings.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'users'
                  ? 'bg-[#FFFFFF] text-[#332C2A] shadow-xs'
                  : 'bg-[#885853]/70 text-[#FFFFFF] hover:bg-[#885853]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Usuarios y Roles ({usersList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('catalogs')}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'catalogs'
                  ? 'bg-[#FFFFFF] text-[#332C2A] shadow-xs'
                  : 'bg-[#885853]/70 text-[#FFFFFF] hover:bg-[#885853]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Plantillas VLB y Catálogos</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('audit');
                fetchAuditAndBackups();
              }}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'audit'
                  ? 'bg-[#FFFFFF] text-[#332C2A] shadow-xs'
                  : 'bg-[#885853]/70 text-[#FFFFFF] hover:bg-[#885853]'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Bitácora de Actividad y Copias</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: BODAS ACTIVAS */}
      {activeTab === 'weddings' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#786C68]" />
              <input
                type="text"
                placeholder="Buscar por nombre de pareja o novios..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#DDD2C4] rounded-xl text-sm text-[#332C2A] placeholder-[#786C68] focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              {['ALL', 'PLANNING', 'UPCOMING', 'COMPLETED'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                    statusFilter === status
                      ? 'bg-[#A6736E] text-[#FFFFFF]'
                      : 'bg-[#FFFFFF] text-[#786C68] hover:bg-[#EFE8DE] border border-[#DDD2C4]'
                  }`}
                >
                  {status === 'ALL' ? 'Todas' : status === 'PLANNING' ? 'En Planeación' : status === 'UPCOMING' ? 'Próximas' : 'Realizadas'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-[#786C68] text-sm">Cargando bodas...</div>
          ) : filteredWeddings.length === 0 ? (
            <div className="bg-[#FFFFFF] rounded-2xl p-12 text-center border border-dashed border-[#DDD2C4]">
              <Building2 className="w-10 h-10 text-[#DDD2C4] mx-auto mb-3" />
              <h3 className="font-serif text-xl font-semibold text-[#332C2A]">No se encontraron bodas</h3>
              <p className="text-[#786C68] text-xs mt-1">Crea una nueva boda o ajusta tus filtros de búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredWeddings.map(w => (
                <div
                  key={w.id}
                  className="luxury-card rounded-2xl overflow-hidden flex flex-col justify-between group cursor-pointer border border-[#DDD2C4]"
                  onClick={() => setCurrentWedding(w)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-[#786C68] block mb-1">
                          Boda VLB · Paquete {w.package_type}
                        </span>
                        <h3 className="font-serif text-2xl font-semibold text-[#332C2A] group-hover:text-[#A6736E] transition">
                          {w.name}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${
                          w.status === 'UPCOMING'
                            ? 'bg-[#EFE8DE] text-[#6D5A43] border border-[#DDD2C4]'
                            : w.status === 'PLANNING'
                            ? 'bg-[#EFE2DF] text-[#885853] border border-[#DFC9C4]'
                            : 'bg-[#F9F6F2] text-[#786C68] border border-[#DDD2C4]'
                        }`}>
                          {w.status === 'PLANNING' ? 'Planeación' : w.status === 'UPCOMING' ? 'Próxima' : w.status}
                        </span>
                        {user?.role === 'ADMINISTRADOR' && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteWedding(e, w)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Eliminar esta boda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-[#786C68]">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-[#A6736E]" />
                        <span className="font-medium text-[#332C2A]">{w.wedding_date}</span>
                      </div>
                      {w.reception_venue && (
                        <div className="flex items-center space-x-2 truncate">
                          <MapPin className="w-4 h-4 text-[#A6736E] shrink-0" />
                          <span className="truncate">{w.reception_venue}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-[#A6736E]" />
                        <span>{w.estimated_guests} invitados estimados</span>
                      </div>
                    </div>

                    {/* RSVP Mini Progress Bar */}
                    <div className="mt-5 pt-4 border-t border-[#EFE8DE]">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
                        <span className="text-[#786C68]">Confirmaciones RSVP</span>
                        <span className="text-[#332C2A] font-semibold">
                          {w.confirmed_guests || 0} confirmados
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-[#EFE8DE] rounded-full overflow-hidden flex">
                        <div
                          className="bg-[#A6736E] h-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round(((w.confirmed_guests || 0) / Math.max(1, w.total_guests || 1)) * 100))}%`
                          }}
                        />
                        <div
                          className="bg-[#DDD2C4] h-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round(((w.pending_guests || 0) / Math.max(1, w.total_guests || 1)) * 100))}%`
                          }}
                        />
                        <div
                          className="bg-[#C7A29E] h-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round(((w.declined_guests || 0) / Math.max(1, w.total_guests || 1)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#786C68] mt-1.5">
                        <span>{w.pending_guests || 0} pendientes</span>
                        <span>{w.declined_guests || 0} no asistirán</span>
                      </div>
                    </div>

                    {/* Assigned Team */}
                    {w.team && w.team.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#EFE8DE]">
                        <div className="text-[10px] font-semibold text-[#786C68] uppercase tracking-wider mb-1.5">
                          Equipo Asignado
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {w.team.map(m => (
                            <span
                              key={m.id}
                              className="text-[10px] bg-[#F9F6F2] text-[#332C2A] border border-[#DDD2C4] px-2.5 py-0.5 rounded-md font-medium"
                            >
                              {m.name.split(' ')[0]} ({m.assigned_role.slice(0, 5)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#EFE8DE]/60 px-6 py-4 border-t border-[#DDD2C4] flex items-center justify-between text-[#332C2A] group-hover:bg-[#A6736E] group-hover:text-[#FFFFFF] transition">
                    <span className="text-xs font-semibold">Abrir Espacio de Trabajo</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: ADMINISTRACIÓN DE USUARIOS Y ROLES */}
      {activeTab === 'users' && user?.role === 'ADMINISTRADOR' && (
        <div className="luxury-card rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Seguridad y Accesos RBAC</span>
              <h2 className="font-serif text-2xl font-bold text-stone-900">Usuarios, Equipo VLB y Cuentas de Novios</h2>
              <p className="text-xs text-stone-500 mt-1">
                Crea, edita o elimina miembros del equipo VLB y cuentas de novios, y asigna a qué bodas tiene acceso cada coordinador o staff.
              </p>
            </div>
            <button
              onClick={handleOpenNewUser}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Usuario / Equipo</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Email de Acceso</th>
                  <th className="py-3 px-4">Rol en Sistema</th>
                  <th className="py-3 px-4">WhatsApp / Teléfono</th>
                  <th className="py-3 px-4">Bodas Asignadas</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {usersList.map(u => {
                  const linkedWedding = weddings.find(w => w.id === u.wedding_id);
                  const assignedWeddingNames = Array.isArray(u.assigned_wedding_ids)
                    ? weddings.filter(w => u.assigned_wedding_ids.includes(w.id)).map(w => w.name)
                    : [];
                  return (
                    <tr key={u.id} className="hover:bg-stone-50/80">
                      <td className="py-3.5 px-4 font-semibold text-stone-900">{u.name}</td>
                      <td className="py-3.5 px-4 text-stone-600 font-mono">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'ADMINISTRADOR'
                            ? 'bg-stone-900 text-white'
                            : u.role === 'COORDINADOR'
                            ? 'bg-amber-100 text-amber-900'
                            : u.role === 'STAFF'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">{u.phone || '—'}</td>
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {u.role === 'NOVIOS'
                          ? (linkedWedding ? linkedWedding.name : u.wedding_id || 'Sin asignar')
                          : u.role === 'ADMINISTRADOR'
                          ? 'Acceso total a todas las bodas'
                          : assignedWeddingNames.length > 0
                          ? assignedWeddingNames.join(', ')
                          : 'Sin bodas asignadas'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="inline-flex items-center space-x-1 text-stone-600 hover:text-stone-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-stone-100 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          {u.id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PLANTILLAS VLB Y CATÁLOGOS */}
      {activeTab === 'catalogs' && user?.role === 'ADMINISTRADOR' && (
        <div className="space-y-6">
          {catalogMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{catalogMsg}</span>
            </div>
          )}

          {/* Barra Superior: Carga por Excel y Sincronización Automática VLB */}
          <div className="luxury-card rounded-3xl p-6 border border-[#DDD2C4] bg-[#F9F6F2]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A6736E] flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Administración y Carga por Excel · VLB Studio</span>
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
                  Importar, Editar y Sincronizar Plantillas Maestras
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl">
                  Puedes editar cualquier actividad aquí mismo, agregar nuevas manualmente o <strong>subir un archivo Excel</strong>. El sistema detecta automáticamente la columna o pestaña (<em>Checklist / Mes 12, Civil o Religiosa</em>) y las carga en el módulo correspondiente de todas tus bodas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadTemplatesExcel}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFE8DE] text-[#332C2A] border border-[#DDD2C4] text-xs font-semibold transition shadow-2xs"
                  title="Descargar todas las plantillas actuales en formato Excel para editarlas o agregar filas"
                >
                  <Download className="w-4 h-4 text-[#A6736E]" />
                  <span>Descargar Plantilla Excel</span>
                </button>

                <label className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition shadow">
                  <Upload className="w-4 h-4" />
                  <span>{importingExcel ? 'Cargando Excel...' : 'Subir Excel de Plantillas'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleUploadTemplatesExcel}
                    disabled={importingExcel}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSyncTemplatesToWeddings}
                  disabled={syncingTemplates}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#EFE2DF] hover:bg-[#DFC9C4] text-[#885853] border border-[#DFC9C4] text-xs font-semibold transition"
                  title="Aplicar cambios de estas plantillas a todas las bodas activas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingTemplates ? 'animate-spin' : ''}`} />
                  <span>{syncingTemplates ? 'Sincronizando...' : 'Aplicar a Todas las Bodas'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1. Plantilla Maestra de Checklist y Actividades por Mes VLB */}
          <div className="luxury-card rounded-3xl p-6 border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A6736E]">
                  Plantilla Global Editable · Se carga en módulo Checklist
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
                  Checklist Maestro VLB y Actividades por Mes
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Haz clic en el ícono de lápiz para modificar cualquier actividad o su mes/etapa, o agrega nuevas actividades abajo.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#885853] bg-[#EFE2DF] px-3 py-1 rounded-full shrink-0">
                {masterChecklist.length} actividades maestras
              </span>
            </div>

            <form onSubmit={handleAddMasterTask} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-5 p-4 rounded-2xl bg-[#F9F6F2] border border-[#DDD2C4]">
              <div className="sm:col-span-3">
                <select
                  value={newMasterTask.category}
                  onChange={e => setNewMasterTask({ ...newMasterTask, category: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                >
                  <option value="Checklist General">Checklist General</option>
                  <option value="12 - 16 meses">12 - 16 meses</option>
                  <option value="10 - 11 meses">10 - 11 meses</option>
                  <option value="8 - 9 meses">8 - 9 meses</option>
                  <option value="6 - 7 meses">6 - 7 meses</option>
                  <option value="4 - 5 meses">4 - 5 meses</option>
                  <option value="2 - 3 meses">2 - 3 meses</option>
                  <option value="1 mes">1 mes</option>
                  <option value="15 días">15 días</option>
                  <option value="1 semana">1 semana</option>
                </select>
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Nueva actividad (ej. Definir presupuesto base e invitados)..."
                  value={newMasterTask.title}
                  onChange={e => setNewMasterTask({ ...newMasterTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Responsable (VLB / Novios)"
                  value={newMasterTask.responsible}
                  onChange={e => setNewMasterTask({ ...newMasterTask, responsible: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-stone-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-stone-800 transition"
                >
                  + Agregar
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {masterChecklist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {editingTaskIdx === idx ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-3">
                        <select
                          value={editingTaskDraft.category}
                          onChange={e => setEditingTaskDraft({ ...editingTaskDraft, category: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
                        >
                          <option value="Checklist General">Checklist General</option>
                          <option value="12 - 16 meses">12 - 16 meses</option>
                          <option value="10 - 11 meses">10 - 11 meses</option>
                          <option value="8 - 9 meses">8 - 9 meses</option>
                          <option value="6 - 7 meses">6 - 7 meses</option>
                          <option value="4 - 5 meses">4 - 5 meses</option>
                          <option value="2 - 3 meses">2 - 3 meses</option>
                          <option value="1 mes">1 mes</option>
                          <option value="15 días">15 días</option>
                          <option value="1 semana">1 semana</option>
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={editingTaskDraft.title}
                          onChange={e => setEditingTaskDraft({ ...editingTaskDraft, title: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={editingTaskDraft.responsible}
                          onChange={e => setEditingTaskDraft({ ...editingTaskDraft, responsible: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEditMasterTask(idx)}
                          className="px-2.5 py-1.5 bg-stone-900 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Guardar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskIdx(null)}
                          className="p-1.5 text-stone-500 hover:bg-stone-200 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#EFE2DF] text-[#885853] font-semibold text-[11px]">
                          {item.category}
                        </span>
                        <span className="font-semibold text-stone-900">{item.title}</span>
                        <span className="text-[11px] text-stone-500">({item.responsible})</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditMasterTask(idx)}
                          className="text-stone-400 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
                          title="Editar actividad"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMasterTask(idx)}
                          className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                          title="Eliminar de plantilla maestra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Plantillas Maestras de Requisitos (Civil y Religiosa) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requisitos Ceremonia Civil VLB */}
            <div className="luxury-card rounded-3xl p-6 border border-stone-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#A6736E]">
                Plantilla Editable · Se carga en módulo Ceremonia Civil
              </span>
              <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
                Requisitos de Ceremonia Civil
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Lista base de documentos y trámites que se carga en el módulo Civil de todas las bodas.
              </p>
              <form onSubmit={handleAddMasterCivilReq} className="flex gap-2 mt-4 mb-4">
                <input
                  type="text"
                  placeholder="Agregar requisito civil (ej. Exámenes prenupciales)..."
                  value={newMasterCivilReq}
                  onChange={e => setNewMasterCivilReq(e.target.value)}
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-stone-800"
                >
                  Agregar
                </button>
              </form>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {masterCivilReqs.map((req, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2 text-xs"
                  >
                    {editingCivilIdx === idx ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCivilText}
                          onChange={e => setEditingCivilText(e.target.value)}
                          className="flex-1 px-2.5 py-1 border border-stone-300 rounded-lg text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCivilReq(idx)}
                          className="px-2.5 py-1 bg-stone-900 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCivilIdx(null)}
                          className="p-1 text-stone-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-stone-800 font-medium">{req}</span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCivilIdx(idx);
                              setEditingCivilText(req);
                            }}
                            className="text-stone-400 hover:text-stone-900 p-1 rounded"
                            title="Editar requisito"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMasterCivilReq(idx)}
                            className="text-stone-400 hover:text-rose-600 p-1 rounded"
                            title="Eliminar requisito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Requisitos Ceremonia Religiosa VLB */}
            <div className="luxury-card rounded-3xl p-6 border border-stone-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#A6736E]">
                Plantilla Editable · Se carga en módulo Ceremonia Religiosa
              </span>
              <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
                Requisitos de Ceremonia Religiosa
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Lista base de requisitos eclesiásticos que se carga en el módulo Ceremonia Religiosa.
              </p>
              <form onSubmit={handleAddMasterReligiousReq} className="flex gap-2 mt-4 mb-4">
                <input
                  type="text"
                  placeholder="Agregar requisito religioso (ej. Fe de bautismo actualizada)..."
                  value={newMasterReligiousReq}
                  onChange={e => setNewMasterReligiousReq(e.target.value)}
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-stone-800"
                >
                  Agregar
                </button>
              </form>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {masterReligiousReqs.map((req, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2 text-xs"
                  >
                    {editingReligiousIdx === idx ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingReligiousText}
                          onChange={e => setEditingReligiousText(e.target.value)}
                          className="flex-1 px-2.5 py-1 border border-stone-300 rounded-lg text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditReligiousReq(idx)}
                          className="px-2.5 py-1 bg-stone-900 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReligiousIdx(null)}
                          className="p-1 text-stone-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-stone-800 font-medium">{req}</span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReligiousIdx(idx);
                              setEditingReligiousText(req);
                            }}
                            className="text-stone-400 hover:text-stone-900 p-1 rounded"
                            title="Editar requisito"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMasterReligiousReq(idx)}
                            className="text-stone-400 hover:text-rose-600 p-1 rounded"
                            title="Eliminar requisito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Catálogo de Tipos de Proveedor */}
            <div className="luxury-card rounded-3xl p-6 border border-stone-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Catálogo Operativo</span>
              <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">Especialidades de Proveedores</h3>
              <form onSubmit={handleAddVendorType} className="flex gap-2 mt-4 mb-4">
                <input
                  type="text"
                  placeholder="Agregar categoría (ej. Pirotecnia)..."
                  value={newVendorType}
                  onChange={e => setNewVendorType(e.target.value)}
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-stone-800"
                >
                  Agregar
                </button>
              </form>
              <div className="flex flex-wrap gap-2">
                {vendorTypes.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200"
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => handleRemoveVendorType(t)}
                      className="text-stone-400 hover:text-rose-600 ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Catálogo de Paquetes de Reuniones */}
            <div className="luxury-card rounded-3xl p-6 border border-stone-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Configuración Comercial</span>
              <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">Paquetes de Reuniones para Novios</h3>
              <form onSubmit={handleAddPackage} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 mb-4">
                <input
                  type="text"
                  placeholder="Nombre paquete"
                  value={newPackage.name}
                  onChange={e => setNewPackage({ ...newPackage, name: e.target.value })}
                  className="px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
                <input
                  type="number"
                  placeholder="Máx reuniones"
                  value={newPackage.maxMeetings}
                  onChange={e => setNewPackage({ ...newPackage, maxMeetings: parseInt(e.target.value, 10) || 1 })}
                  className="px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-stone-800"
                >
                  Añadir Paquete
                </button>
              </form>
              <div className="space-y-2">
                {meetingPackages.map(pkg => (
                  <div key={pkg.name} className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-stone-900">{pkg.name} ({pkg.maxMeetings >= 999 ? 'Ilimitadas' : `${pkg.maxMeetings} reuniones`})</div>
                      <div className="text-stone-500 text-[11px]">{pkg.description}</div>
                    </div>
                    <button
                      onClick={() => handleRemovePackage(pkg.name)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BITÁCORA DE ACTIVIDAD Y COPIAS DE SEGURIDAD */}
      {activeTab === 'audit' && user?.role === 'ADMINISTRADOR' && (
        <div className="space-y-6">
          {/* Simplified Backup Card */}
          <div className="luxury-card rounded-3xl p-6 border border-stone-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Protección de Información</span>
                <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">Copia de Seguridad de LAZO</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Descarga a tu computadora una copia de seguridad de todas tus bodas, invitados, mesas y pagos por tranquilidad, o carga una copia anterior si algún día lo necesitas.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Copia de Seguridad</span>
                </button>
                <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider rounded-xl border border-stone-300 cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>Cargar Copia Anterior</span>
                  <input type="file" accept=".json" onChange={handleRestoreBackupFile} className="hidden" />
                </label>
              </div>
            </div>

            {restoreMsg && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                {restoreMsg}
              </div>
            )}
          </div>

          {/* Global Audit Trail */}
          <div className="luxury-card rounded-3xl p-6 border border-stone-200">
            <div className="flex items-center space-x-2 mb-4">
              <History className="w-5 h-5 text-stone-700" />
              <h3 className="font-serif text-xl font-bold text-stone-900">Bitácora Global de Actividad VLB Studio</h3>
            </div>
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    <th className="py-2.5 px-3">Fecha / Hora</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Boda</th>
                    <th className="py-2.5 px-3">Acción</th>
                    <th className="py-2.5 px-3">Detalle Operativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {globalLogs.map(log => (
                    <tr key={log.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-stone-800">{log.user_name}</td>
                      <td className="py-2.5 px-3 text-stone-600">{log.wedding_name || 'Global VLB'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-700">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Usuario */}
      {showUserModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h3>
            {userError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
                {userError}
              </div>
            )}
            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {editingUser ? 'Nueva Contraseña (dejar en blanco para mantener actual)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Rol *</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value as User['role'] })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  >
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                    <option value="COORDINADOR">COORDINADOR</option>
                    <option value="STAFF">STAFF</option>
                    <option value="NOVIOS">NOVIOS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    placeholder="+52 55..."
                    value={userForm.phone}
                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              {userForm.role === 'NOVIOS' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Asignar Boda Exclusiva *</label>
                  <select
                    required
                    value={userForm.wedding_id}
                    onChange={e => setUserForm({ ...userForm, wedding_id: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  >
                    <option value="">Selecciona la boda de estos novios...</option>
                    {weddings.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.wedding_date})</option>
                    ))}
                  </select>
                </div>
              )}
              {(userForm.role === 'COORDINADOR' || userForm.role === 'STAFF') && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Cargo / Función en el Equipo VLB</label>
                    <input
                      type="text"
                      placeholder="Ej. Coordinadora Senior, Staff Día Boda..."
                      value={userForm.assigned_role}
                      onChange={e => setUserForm({ ...userForm, assigned_role: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Bodas Asignadas a este Miembro</label>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 border border-stone-200 rounded-xl bg-stone-50">
                      {weddings.map(w => (
                        <label key={w.id} className="flex items-center space-x-2 text-xs text-stone-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userForm.assigned_wedding_ids.includes(w.id)}
                            onChange={() => handleToggleAssignedWedding(w.id)}
                            className="rounded border-stone-300 text-stone-900"
                          />
                          <span>{w.name} <span className="text-stone-400">({w.wedding_date})</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nueva Boda */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">VLB Studio</span>
                <h3 className="font-serif text-2xl font-bold text-stone-900">Crear Nueva Boda</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWedding} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre de la Boda *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sofía & Alejandro"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Novia / Contrayente 1 *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sofía Villaseñor"
                    value={formData.partner_1_name}
                    onChange={e => setFormData({ ...formData, partner_1_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Novio / Contrayente 2 *</label>
                  <input
                    type="text"
                    required
                    placeholder="Alejandro De la Mora"
                    value={formData.partner_2_name}
                    onChange={e => setFormData({ ...formData, partner_2_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fecha de la Boda *</label>
                  <input
                    type="date"
                    required
                    value={formData.wedding_date}
                    onChange={e => setFormData({ ...formData, wedding_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Invitados Estimados</label>
                  <input
                    type="number"
                    value={formData.estimated_guests}
                    onChange={e => setFormData({ ...formData, estimated_guests: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Lugar Ceremonia</label>
                  <input
                    type="text"
                    placeholder="Parroquia o Templo"
                    value={formData.ceremony_venue}
                    onChange={e => setFormData({ ...formData, ceremony_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Lugar Recepción</label>
                  <input
                    type="text"
                    placeholder="Hacienda o Salón"
                    value={formData.reception_venue}
                    onChange={e => setFormData({ ...formData, reception_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Paquete Contratado</label>
                <select
                  value={formData.package_type}
                  onChange={e => setFormData({ ...formData, package_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                >
                  {meetingPackages.length > 0 ? (
                    meetingPackages.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.maxMeetings >= 999 ? 'Reuniones ilimitadas' : `${p.maxMeetings} reuniones`})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Esencial">Esencial (3 reuniones)</option>
                      <option value="Integral">Integral (6 reuniones)</option>
                      <option value="Luxury Exclusivo">Luxury Exclusivo (Reuniones ilimitadas)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Notas Iniciales</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de estilo, paleta o preferencias de los novios..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white hover:bg-stone-800 rounded-xl shadow transition disabled:opacity-50"
                >
                  {creating ? 'Guardando...' : 'Crear Proyecto Boda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
