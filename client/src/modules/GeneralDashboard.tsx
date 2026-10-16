import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wedding, User, AuditLog } from '../types';
import * as XLSX from 'xlsx';
import {
  Plus, Calendar, MapPin, Users2, ArrowRight, Sparkles,
  Building2, Search, AlertCircle, Shield, Settings,
  Database, History, Download, Upload, Trash2, CheckCircle2, Edit3,
  FileSpreadsheet, RefreshCw, Save, X, MessageSquare, Bell, LogOut,
  FileText, LayoutGrid, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { WhatsAppHubModule } from './WhatsAppHubModule';
import { CalendarioModule } from './CalendarioModule';
import { UserProfileModal } from '../components/UserProfileModal';

export const GeneralDashboard: React.FC = () => {
  const { user, token, setCurrentWedding, logout, notifications, refreshNotifications, generalDashboardTab, setGeneralDashboardTab } = useAuth();
  const activeTab = generalDashboardTab || 'weddings';
  const setActiveTab = (t: string) => setGeneralDashboardTab(t);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Collapsable sidebar state (persisted)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lazo_dashboard_sidebar_open');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('lazo_dashboard_sidebar_open', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'PLANNING'>('ALL');
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
  const [meetingPackages, setMeetingPackages] = useState<{ name: string; maxMeetings: number; description: string; includes?: string[] }[]>([]);
  const [newPackage, setNewPackage] = useState({
    name: '',
    maxMeetings: 4,
    isUnlimited: false,
    description: '',
    includesText: ''
  });
  const [editingPkgIdx, setEditingPkgIdx] = useState<number | null>(null);
  const [editingPkgDraft, setEditingPkgDraft] = useState({
    name: '',
    maxMeetings: 4,
    isUnlimited: false,
    description: '',
    includesText: ''
  });
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
    notes: '',
    checklist_option: 'full' as 'full' | 'empty'
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
      const payload = {
        ...formData,
        populate_checklist: formData.checklist_option === 'full'
      };
      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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
        notes: '',
        checklist_option: 'full'
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
      avatar_url: null,
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
      avatar_url: u.avatar_url || null,
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
    const includesList = newPackage.includesText
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
    const maxMtg = newPackage.isUnlimited ? 999 : (Number(newPackage.maxMeetings) || 1);
    const desc = newPackage.description.trim() || (maxMtg >= 999 ? 'Reuniones ilimitadas de planeación' : `${maxMtg} reuniones de coordinación y avance`);
    const updated = [
      ...meetingPackages,
      {
        name: newPackage.name.trim(),
        maxMeetings: maxMtg,
        description: desc,
        includes: includesList
      }
    ];
    setMeetingPackages(updated);
    setNewPackage({ name: '', maxMeetings: 4, isUnlimited: false, description: '', includesText: '' });
    saveCatalogKey('meeting_packages', updated);
  };

  const handleStartEditPackage = (idx: number) => {
    const pkg = meetingPackages[idx];
    setEditingPkgIdx(idx);
    setEditingPkgDraft({
      name: pkg.name,
      maxMeetings: pkg.maxMeetings >= 999 ? 6 : pkg.maxMeetings,
      isUnlimited: pkg.maxMeetings >= 999,
      description: pkg.description || '',
      includesText: Array.isArray(pkg.includes) ? pkg.includes.join('\n') : ''
    });
  };

  const handleSaveEditPackage = (idx: number) => {
    if (!editingPkgDraft.name.trim()) return;
    const includesList = editingPkgDraft.includesText
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
    const maxMtg = editingPkgDraft.isUnlimited ? 999 : (Number(editingPkgDraft.maxMeetings) || 1);
    const desc = editingPkgDraft.description.trim() || (maxMtg >= 999 ? 'Reuniones ilimitadas de planeación' : `${maxMtg} reuniones de coordinación y avance`);
    const updated = meetingPackages.map((p, i) =>
      i === idx
        ? {
            name: editingPkgDraft.name.trim(),
            maxMeetings: maxMtg,
            description: desc,
            includes: includesList
          }
        : p
    );
    setMeetingPackages(updated);
    setEditingPkgIdx(null);
    saveCatalogKey('meeting_packages', updated);
  };

  const handleRemovePackage = (name: string) => {
    if (!window.confirm(`¿Eliminar el paquete "${name}"?`)) return;
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

  const formatWeddingCountdown = (dateStr: string) => {
    if (!dateStr) return 'Fecha por definir';
    const parts = dateStr.split('-');
    let target: Date;
    if (parts.length === 3) {
      target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      target = new Date(dateStr);
    }
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const formattedDate = `${target.getDate()} ${months[target.getMonth()]} ${target.getFullYear()}`;

    if (diffDays > 0) return `Faltan ${diffDays} días · ${formattedDate}`;
    if (diffDays === 0) return `¡Hoy es la boda! · ${formattedDate}`;
    return `Realizada · ${formattedDate}`;
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'Equipo';
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (refreshNotifications) await refreshNotifications();
    } catch {}
  };

  const sidebarNavItems = [
    { id: 'weddings', label: 'Bodas', icon: Users2 },
    { id: 'calendario', label: 'Calendario General', icon: Calendar },
    { id: 'whatsapp', label: 'WhatsApp Hub', icon: MessageSquare },
    { id: 'plantillas', label: 'Plantillas', icon: FileText },
    { id: 'catalogos', label: 'Catálogos', icon: LayoutGrid },
    { id: 'equipo', label: 'Bitácora & Equipo', icon: History },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  const filteredWeddings = weddings.filter(w => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (w.name && w.name.toLowerCase().includes(q)) ||
      (w.partner_1_name && w.partner_1_name.toLowerCase().includes(q)) ||
      (w.partner_2_name && w.partner_2_name.toLowerCase().includes(q)) ||
      (w.ceremony_venue && w.ceremony_venue.toLowerCase().includes(q)) ||
      (w.reception_venue && w.reception_venue.toLowerCase().includes(q)) ||
      (w.wedding_date && w.wedding_date.includes(q));

    let matchesStatus = true;
    if (statusFilter === 'UPCOMING') {
      matchesStatus = w.status === 'UPCOMING' || (w.wedding_date && new Date(w.wedding_date) >= new Date());
    } else if (statusFilter === 'PLANNING') {
      matchesStatus = w.status === 'PLANNING';
    }

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (sidebarOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[#FCFAF7] flex flex-col md:flex-row text-[#332A28] max-w-full overflow-x-hidden">
      {/* Mobile Backdrop Overlay for GeneralDashboard */}
      {sidebarOpen && (
        <div
          onClick={handleToggleSidebar}
          className="fixed inset-0 bg-[#2B2826]/40 z-40 backdrop-blur-xs md:hidden transition-opacity duration-300"
        />
      )}

      {/* 1. Sidebar Izquierdo Fijo/Acoplado — Idéntico a la maqueta editorial LAZO */}
      <aside
        className={`shrink-0 bg-[#FCFAF7] border-r border-[#EAE3DA] flex flex-col transition-all duration-300 ${
          // Mobile: drawer
          `fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] h-full shadow-2xl z-50 md:shadow-none md:sticky md:top-0 md:h-screen md:z-30 ${
            sidebarOpen
              ? 'translate-x-0 opacity-100'
              : '-translate-x-full opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto'
          } ` +
          // Desktop:
          (sidebarOpen ? 'md:w-64 lg:w-72 p-6' : 'md:w-16 lg:w-[4.25rem] p-2.5')
        }`}
      >
        <div className={`mb-8 flex items-center transition-all ${sidebarOpen ? 'px-2 justify-between' : 'justify-center'}`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center space-x-2">
                <img
                  src="/lazo-logo.png"
                  alt="LAZO — VLB Studio · Planning"
                  className="h-9 sm:h-11 w-auto object-contain select-none"
                />
              </div>
              <button
                onClick={handleToggleSidebar}
                aria-label="Contraer menú lateral"
                className="p-1.5 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#F7F3EE] rounded-xl transition cursor-pointer"
                title="Contraer menú lateral (⌘B)"
              >
                <PanelLeftClose className="w-5 h-5 text-[#9C665C] hidden md:block" />
                <X className="w-5 h-5 text-[#9C665C] md:hidden" />
              </button>
            </>
          ) : (
            <button
              onClick={handleToggleSidebar}
              aria-label="Expandir menú lateral"
              className="p-2 text-[#7D6F6B] hover:text-[#9C665C] hover:bg-[#F7F3EE] rounded-xl transition cursor-pointer"
              title="Expandir menú lateral (⌘B)"
            >
              <PanelLeft className="w-5 h-5 text-[#9C665C]" />
            </button>
          )}
        </div>

        <nav className={`space-y-1.5 flex-1 ${!sidebarOpen ? 'flex flex-col items-center' : ''}`}>
          {sidebarNavItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.id === 'equipo' || item.id === 'ajustes') {
                    fetchAuditAndBackups();
                  }
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                title={item.label}
                className={`flex items-center transition-all cursor-pointer ${
                  sidebarOpen
                    ? 'w-full space-x-3.5 px-4 py-3 rounded-2xl text-sm'
                    : 'w-10 h-10 justify-center rounded-xl p-2.5'
                } ${
                  active
                    ? 'bg-[#EFE8DE] text-[#9C665C] font-semibold shadow-2xs'
                    : 'text-[#7D6F6B] hover:bg-[#F7F3EE] hover:text-[#332A28] font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#9C665C]' : 'text-[#7D6F6B]'}`} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className={`pt-4 border-t border-[#EAE3DA] flex items-center text-xs text-[#7D6F6B] transition-all ${
          sidebarOpen ? 'px-3 justify-between' : 'justify-center p-2'
        }`}>
          {sidebarOpen && <span>VLB Studio · Planning</span>}
          <span className="w-2 h-2 rounded-full bg-[#6E8C70]" title="Sistema Activo" />
        </div>
      </aside>

      {/* 2. Área Principal de Contenido */}
      <main className="flex-1 min-w-0 max-w-full overflow-x-hidden p-3.5 sm:p-8 lg:p-10 overflow-y-auto">
        {/* PESTAÑA PRINCIPAL: BODAS */}
        {activeTab === 'weddings' && (
          <div>
            {/* Cabecera Minimalista y Cálida */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center space-x-3.5">
                {!sidebarOpen && (
                  <button
                    onClick={handleToggleSidebar}
                    aria-label="Mostrar menú lateral"
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#EAE3DA] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] transition shadow-xs cursor-pointer shrink-0"
                    title="Mostrar menú lateral (⌘B)"
                  >
                    <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                    <span className="text-sm font-semibold hidden sm:inline">Menú</span>
                  </button>
                )}
                <div>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#332A28]">
                    Hola, {userName} 👋
                  </h1>
                  <p className="text-sm text-[#7D6F6B] mt-1">
                    ¿En qué boda trabajaremos hoy? · {weddings.length} {weddings.length === 1 ? 'boda activa' : 'bodas activas'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3.5 self-start sm:self-auto">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center space-x-2 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] px-5 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Boda</span>
                </button>

                {/* Avatar circular con punto de estado */}
                <div
                  onClick={() => setShowProfileModal(true)}
                  className="relative cursor-pointer group"
                  title={`Mi Perfil · ${user?.name || ''}`}
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user?.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#CCDACC] shadow-2xs group-hover:ring-2 group-hover:ring-[#9C665C] transition"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#EFE2DF] text-[#8A574E] font-serif font-bold text-base flex items-center justify-center border border-[#CCDACC] shadow-2xs group-hover:ring-2 group-hover:ring-[#9C665C] transition">
                      {userName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#6E8C70] border-2 border-[#FCFAF7]" title="En línea" />
                </div>

                {/* Campana de Notificaciones */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifMenu(!showNotifMenu)}
                    className="p-2.5 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#F7F3EE] rounded-full transition cursor-pointer relative"
                    title="Notificaciones"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#9C665C]" />
                    )}
                  </button>

                  {showNotifMenu && (
                    <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EAE3DA] py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-[#F7F3EE] flex items-center justify-between">
                        <span className="font-serif text-lg font-semibold text-[#332A28]">Notificaciones</span>
                        {unreadCount > 0 && (
                          <span className="text-xs bg-[#EFE2DF] text-[#8A574E] px-2.5 py-0.5 rounded-full font-medium">
                            {unreadCount} nuevas
                          </span>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-[#F7F3EE]">
                        {notifications.length === 0 ? (
                          <div className="p-5 text-center text-sm text-[#7D6F6B]">
                            No hay notificaciones pendientes.
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => handleMarkAsRead(n.id)}
                              className={`p-3.5 text-sm cursor-pointer hover:bg-[#FCFAF7] transition ${!n.read ? 'bg-[#EFE2DF]/40' : ''}`}
                            >
                              <div className="font-semibold text-[#332A28] mb-0.5">{n.title}</div>
                              <div className="text-xs text-[#7D6F6B] leading-snug">{n.message}</div>
                              <div className="text-xs text-[#7D6F6B] mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Salir */}
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-2.5 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#F7F3EE] rounded-full transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda Rápida y Filtros Directos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                <input
                  type="text"
                  placeholder="Buscar boda por nombre o fecha..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-[#FFFFFF] border border-[#EAE3DA] rounded-full text-sm text-[#332A28] placeholder-[#7D6F6B]/70 focus:outline-none focus:border-[#9C665C] shadow-2xs transition"
                />
              </div>

              <div className="flex items-center space-x-1.5 bg-[#F7F3EE] p-1 rounded-full border border-[#EAE3DA] self-start sm:self-auto">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-[#FFFFFF] text-[#332A28] shadow-xs'
                      : 'text-[#7D6F6B] hover:text-[#332A28]'
                  }`}
                >
                  Todas ({weddings.length})
                </button>
                <button
                  onClick={() => setStatusFilter('UPCOMING')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    statusFilter === 'UPCOMING'
                      ? 'bg-[#FFFFFF] text-[#332A28] shadow-xs'
                      : 'text-[#7D6F6B] hover:text-[#332A28]'
                  }`}
                >
                  Próximas
                </button>
                <button
                  onClick={() => setStatusFilter('PLANNING')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    statusFilter === 'PLANNING'
                      ? 'bg-[#FFFFFF] text-[#332A28] shadow-xs'
                      : 'text-[#7D6F6B] hover:text-[#332A28]'
                  }`}
                >
                  En planeación
                </button>
              </div>
            </div>

            {/* Grid de Tarjetas de Boda Limpias y Claras (Idénticas a la imagen) */}
            {loading ? (
              <div className="py-20 text-center text-[#7D6F6B] text-sm">Cargando bodas...</div>
            ) : filteredWeddings.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-3xl p-12 text-center border border-dashed border-[#EAE3DA]">
                <h3 className="font-serif text-xl font-semibold text-[#332A28]">No se encontraron bodas</h3>
                <p className="text-[#7D6F6B] text-sm mt-1">Crea una nueva boda o ajusta tus filtros de búsqueda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWeddings.map(w => {
                  const totalGuests = w.total_guests || w.estimated_guests || 0;
                  const confirmedGuests = w.confirmed_guests || w.total_confirmed_seats || 0;
                  const confirmedPct = totalGuests > 0 ? Math.min(100, Math.round((confirmedGuests / totalGuests) * 100)) : 0;
                  const countdownText = formatWeddingCountdown(w.wedding_date);
                  const venueName = w.reception_venue || w.ceremony_venue || 'Sede por confirmar';

                  return (
                    <div
                      key={w.id}
                      onClick={() => setCurrentWedding(w)}
                      className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-7 border border-[#EAE3DA] shadow-xs hover:shadow-md hover:border-[#D6C7B7] transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        {/* Fila superior con Nombres y botón eliminar discreto */}
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="font-serif text-3xl sm:text-[32px] font-bold text-[#332A28] leading-[1.15]">
                            {w.partner_1_name && w.partner_2_name ? (
                              <>
                                <div className="truncate">{w.partner_1_name}</div>
                                <div className="truncate">& {w.partner_2_name}</div>
                              </>
                            ) : (
                              <div className="truncate">{w.name}</div>
                            )}
                          </div>

                          {user?.role === 'ADMINISTRADOR' && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteWedding(e, w)}
                              className="p-1.5 text-stone-300 hover:text-rose-600 hover:bg-[#FBF4F3] rounded-lg transition opacity-0 group-hover:opacity-100 shrink-0"
                              title="Eliminar esta boda"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Badge de cuenta regresiva */}
                        <div className="mb-3.5">
                          <span className="inline-flex items-center text-xs font-medium text-[#70443D] bg-[#F7F3EE] border border-[#EAE3DA] px-3.5 py-1 rounded-full select-none">
                            {countdownText}
                          </span>
                        </div>

                        {/* Lugar / Sede */}
                        <div className="flex items-center space-x-1.5 text-xs text-[#7D6F6B] mb-5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#9C665C] shrink-0" />
                          <span className="truncate">{venueName}</span>
                        </div>

                        {/* Barra delgada y estética */}
                        <div className="w-full h-1.5 bg-[#F7F3EE] rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-[#9C665C] rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(confirmedPct > 0 ? confirmedPct : 10, 4)}%` }}
                          />
                        </div>

                        {/* Métrica propia de la boda */}
                        <div className="text-xs text-[#7D6F6B] mb-6 font-medium">
                          {confirmedPct > 0 ? (
                            <span>{totalGuests} invitados · {confirmedPct}% confirmados</span>
                          ) : (
                            <span>{totalGuests > 0 ? `${totalGuests} invitados · ` : ''}En envío de invitaciones</span>
                          )}
                        </div>
                      </div>

                      {/* Fila Inferior: Equipo asignado + Abrir Boda */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-1.5">
                          {Array.isArray(w.team) && w.team.length > 0 ? (
                            <>
                              {w.team.slice(0, 3).map((member: any, i: number) => (
                                <div
                                  key={member.id || i}
                                  title={`${member.name} (${member.assigned_role || member.role})`}
                                  className="w-7 h-7 rounded-full bg-[#EFE2DF] text-[#8A574E] flex items-center justify-center border border-[#CCDACC] shadow-2xs select-none shrink-0"
                                >
                                  <span className="text-[11px] font-bold uppercase leading-none">
                                    {member.name?.trim()?.charAt(0) || 'V'}
                                  </span>
                                </div>
                              ))}
                              {w.team.length > 3 && (
                                <div
                                  title={`+${w.team.length - 3} miembros adicionales`}
                                  className="w-7 h-7 rounded-full bg-[#F7F3EE] text-[#7D6F6B] flex items-center justify-center border border-[#EAE3DA] shadow-2xs select-none shrink-0"
                                >
                                  <span className="text-[10px] font-bold leading-none">
                                    +{w.team.length - 3}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div
                              title="VLB Studio"
                              className="w-7 h-7 rounded-full bg-[#EFE2DF] text-[#8A574E] flex items-center justify-center border border-[#CCDACC] shadow-2xs select-none shrink-0"
                            >
                              <span className="text-[11px] font-bold uppercase leading-none">
                                V
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentWedding(w);
                          }}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#332A28] bg-[#FFFFFF] hover:bg-[#F7F3EE] border border-[#EAE3DA] transition shadow-2xs group-hover:border-[#9C665C] group-hover:text-[#9C665C] cursor-pointer"
                        >
                          <span>Abrir Boda</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: CALENDARIO GENERAL (GOOGLE CALENDAR EXPERIENCE) */}
        {/* PESTAÑA: CALENDARIO GENERAL */}
        {activeTab === 'calendario' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE3DA]">
              <div className="flex items-center space-x-3.5">
                {!sidebarOpen && (
                  <button
                    onClick={handleToggleSidebar}
                    aria-label="Mostrar menú lateral"
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#EAE3DA] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] transition shadow-xs cursor-pointer shrink-0"
                    title="Mostrar menú lateral (⌘B)"
                  >
                    <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                    <span className="text-sm font-semibold hidden sm:inline">Menú</span>
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#332A28] tracking-tight">
                    Calendario General
                  </h1>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">
                    Visión unificada de citas planning, bodas, citas externas, open houses, listas de tareas y sincronización Google Calendar.
                  </p>
                </div>
              </div>
            </div>

            <CalendarioModule onToggleSidebar={handleToggleSidebar} />
          </div>
        )}

        {/* PESTAÑA: WHATSAPP HUB */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE3DA]">
              <div className="flex items-center space-x-3.5">
                {!sidebarOpen && (
                  <button
                    onClick={handleToggleSidebar}
                    aria-label="Mostrar menú lateral"
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#EAE3DA] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] transition shadow-xs cursor-pointer shrink-0"
                    title="Mostrar menú lateral (⌘B)"
                  >
                    <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                    <span className="text-sm font-semibold hidden sm:inline">Menú</span>
                  </button>
                )}
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#332A28]">WhatsApp Hub</h2>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">Centro de mensajería ejecutiva y respuestas de confirmación de invitados.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('weddings')}
                className="text-xs font-semibold text-[#9C665C] hover:underline cursor-pointer"
              >
                ← Volver a Bodas
              </button>
            </div>
            <WhatsAppHubModule />
          </div>
        )}

        {/* PESTAÑA: USUARIOS Y EQUIPO */}
        {activeTab === 'equipo' && user?.role === 'ADMINISTRADOR' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE3DA]">
              <div className="flex items-center space-x-3.5">
                {!sidebarOpen && (
                  <button
                    onClick={handleToggleSidebar}
                    aria-label="Mostrar menú lateral"
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#EAE3DA] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] transition shadow-xs cursor-pointer shrink-0"
                    title="Mostrar menú lateral (⌘B)"
                  >
                    <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                    <span className="text-sm font-semibold hidden sm:inline">Menú</span>
                  </button>
                )}
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#332A28]">Bitácora & Equipo VLB</h2>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">Gestión de coordinadores, staff y accesos operativos de bodas.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('weddings')}
                className="text-xs font-semibold text-[#9C665C] hover:underline cursor-pointer"
              >
                ← Volver a Bodas
              </button>
            </div>
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
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
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
                    <tr key={u.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        <div className="flex items-center space-x-3">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover border border-[#CCDACC] shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#EFE2DF] text-[#8A574E] font-serif font-bold text-sm flex items-center justify-center shrink-0 border border-[#EAE3DA]">
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-900 truncate leading-snug">{u.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-mono">{u.email}</td>
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
        </div>
      )}

      {/* PESTAÑA: PLANTILLAS VLB */}
      {activeTab === 'plantillas' && user?.role === 'ADMINISTRADOR' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE3DA]">
            <div className="flex items-center space-x-3.5">
              {!sidebarOpen && (
                <button
                  onClick={handleToggleSidebar}
                  aria-label="Mostrar menú lateral"
                  className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#EAE3DA] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] transition shadow-xs cursor-pointer shrink-0"
                  title="Mostrar menú lateral (⌘B)"
                >
                  <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                  <span className="text-sm font-semibold hidden sm:inline">Menú</span>
                </button>
              )}
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#332A28]">Plantillas Maestras VLB</h2>
                <p className="text-xs text-[#7D6F6B] mt-0.5">Checklist maestro y requisitos de ceremonias civil y religiosa.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('weddings')}
              className="text-xs font-semibold text-[#9C665C] hover:underline cursor-pointer"
            >
              ← Volver a Bodas
            </button>
          </div>
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
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#9C665C] flex items-center space-x-1.5">
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
                  <Download className="w-4 h-4 text-[#9C665C]" />
                  <span>Descargar Plantilla Excel</span>
                </button>

                <label className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold cursor-pointer transition shadow-xs">
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
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#EFE2DF] hover:bg-[#DFC9C4] text-[#8a574e] border border-[#DFC9C4] text-xs font-semibold transition"
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
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#9C665C]">
                  Plantilla Global Editable · Se carga en módulo Checklist
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
                  Checklist Maestro VLB y Actividades por Mes
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Haz clic en el ícono de lápiz para modificar cualquier actividad o su mes/etapa, o agrega nuevas actividades abajo.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#8a574e] bg-[#EFE2DF] px-3 py-1 rounded-full shrink-0">
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
                        <span className="px-2.5 py-0.5 rounded-md bg-[#EFE2DF] text-[#8a574e] font-semibold text-[11px]">
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
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#9C665C]">
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
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#9C665C]">
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
        </div>
      )}

      {/* PESTAÑA: CATÁLOGOS VLB */}
      {activeTab === 'catalogos' && user?.role === 'ADMINISTRADOR' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE3DA]">
            <div className="flex items-center space-x-3.5">
              {!sidebarOpen && (
                <button
                  onClick={handleToggleSidebar}
                  aria-label="Mostrar menú lateral"
                  className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#EAE3DA] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] transition shadow-xs cursor-pointer shrink-0"
                  title="Mostrar menú lateral (⌘B)"
                >
                  <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                  <span className="text-sm font-semibold hidden sm:inline">Menú</span>
                </button>
              )}
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#332A28]">Catálogos VLB</h2>
                <p className="text-xs text-[#7D6F6B] mt-0.5">Especialidades de proveedores y paquetes de reuniones de novios.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('weddings')}
              className="text-xs font-semibold text-[#9C665C] hover:underline cursor-pointer"
            >
              ← Volver a Bodas
            </button>
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
                  className="px-4 py-2 bg-[#9C665C] text-white text-xs font-semibold rounded-xl hover:bg-[#8A574E] shadow-xs transition cursor-pointer"
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
              <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">Paquetes para Novios</h3>
              <p className="text-xs text-stone-500 mt-1">
                Configura o modifica tus paquetes, la cantidad de reuniones y todo lo que incluye cada uno.
              </p>

              <form onSubmit={handleAddPackage} className="space-y-2.5 mt-4 mb-5 p-4 rounded-2xl bg-[#F9F6F2] border border-[#DDD2C4]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8a574e]">Crear Nuevo Paquete</div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Nombre del paquete (ej. Integral)"
                      value={newPackage.name}
                      onChange={e => setNewPackage({ ...newPackage, name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                    />
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-2">
                    {!newPackage.isUnlimited && (
                      <input
                        type="number"
                        min={1}
                        placeholder="Reuniones"
                        value={newPackage.maxMeetings}
                        onChange={e => setNewPackage({ ...newPackage, maxMeetings: parseInt(e.target.value, 10) || 1 })}
                        className="w-20 px-2.5 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                      />
                    )}
                    <label className="flex items-center space-x-1.5 text-xs text-stone-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newPackage.isUnlimited}
                        onChange={e => setNewPackage({ ...newPackage, isUnlimited: e.target.checked })}
                        className="rounded border-stone-300 text-stone-900"
                      />
                      <span>Ilimitadas</span>
                    </label>
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full px-3 py-2 bg-[#9C665C] text-white text-xs font-semibold rounded-xl hover:bg-[#8A574E] shadow-xs transition cursor-pointer"
                    >
                      + Añadir Paquete
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Descripción breve (ej. 6 reuniones detalladas con equipo VLB)"
                  value={newPackage.description}
                  onChange={e => setNewPackage({ ...newPackage, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                />
                <textarea
                  rows={3}
                  placeholder={"Todo lo que incluye este paquete (escribe un punto por renglón):\n• Seguimiento de proveedores y pagos\n• Confirmación de invitados (RSVP) y layout\n• Coordinación integral Día Boda"}
                  value={newPackage.includesText}
                  onChange={e => setNewPackage({ ...newPackage, includesText: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                />
              </form>

              <div className="space-y-3">
                {meetingPackages.map((pkg, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
                    {editingPkgIdx === idx ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8a574e]">Editando Paquete</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-6">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Nombre del Paquete</label>
                            <input
                              type="text"
                              value={editingPkgDraft.name}
                              onChange={e => setEditingPkgDraft({ ...editingPkgDraft, name: e.target.value })}
                              className="w-full px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-6">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Cantidad de Reuniones</label>
                            <div className="flex items-center gap-2.5">
                              {!editingPkgDraft.isUnlimited && (
                                <input
                                  type="number"
                                  min={1}
                                  value={editingPkgDraft.maxMeetings}
                                  onChange={e => setEditingPkgDraft({ ...editingPkgDraft, maxMeetings: parseInt(e.target.value, 10) || 1 })}
                                  className="w-24 px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-white"
                                />
                              )}
                              <label className="flex items-center space-x-1.5 text-xs text-stone-700 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={editingPkgDraft.isUnlimited}
                                  onChange={e => setEditingPkgDraft({ ...editingPkgDraft, isUnlimited: e.target.checked })}
                                  className="rounded border-stone-300 text-stone-900"
                                />
                                <span>Reuniones ilimitadas</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Descripción Breve</label>
                          <input
                            type="text"
                            value={editingPkgDraft.description}
                            onChange={e => setEditingPkgDraft({ ...editingPkgDraft, description: e.target.value })}
                            placeholder="Resumen corto del paquete..."
                            className="w-full px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                            Todo lo que incluye (escribe un beneficio por renglón)
                          </label>
                          <textarea
                            rows={4}
                            value={editingPkgDraft.includesText}
                            onChange={e => setEditingPkgDraft({ ...editingPkgDraft, includesText: e.target.value })}
                            placeholder={"Escribe cada servicio o entregable en un renglón:\nSesiones de planeación\nConfirmación de invitados RSVP\nCoordinación Día Boda"}
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingPkgIdx(null)}
                            className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditPackage(idx)}
                            className="px-4 py-1.5 rounded-xl bg-[#9C665C] text-white hover:bg-[#8A574E] text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-stone-900 text-sm">
                              {pkg.name}{' '}
                              <span className="text-xs font-semibold text-[#8a574e] bg-[#EFE2DF] px-2 py-0.5 rounded-full ml-1">
                                {pkg.maxMeetings >= 999 ? 'Ilimitadas' : `${pkg.maxMeetings} reuniones`}
                              </span>
                            </div>
                            <div className="text-stone-500 text-[11px] mt-0.5">{pkg.description}</div>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditPackage(idx)}
                              className="text-stone-500 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
                              title="Editar paquete y lo que incluye"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePackage(pkg.name)}
                              className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                              title="Eliminar paquete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                          <ul className="mt-2.5 pt-2.5 border-t border-stone-200/80 space-y-1 text-[11px] text-stone-700">
                            {pkg.includes.map((inc, i) => (
                              <li key={i} className="flex items-start space-x-1.5">
                                <span className="text-[#8a574e] font-bold">✓</span>
                                <span>{inc}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: AJUSTES Y COPIAS DE SEGURIDAD */}
      {activeTab === 'ajustes' && user?.role === 'ADMINISTRADOR' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE3DA]">
            <div className="flex items-center space-x-3.5">
              {!sidebarOpen && (
                <button
                  onClick={handleToggleSidebar}
                  aria-label="Mostrar menú lateral"
                  className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#EAE3DA] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] transition shadow-xs cursor-pointer shrink-0"
                  title="Mostrar menú lateral (⌘B)"
                >
                  <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                  <span className="text-sm font-semibold hidden sm:inline">Menú</span>
                </button>
              )}
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#332A28]">Ajustes y Copias de Seguridad</h2>
                <p className="text-xs text-[#7D6F6B] mt-0.5">Respaldo general del sistema, restauración de base de datos y auditoría global.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('weddings')}
              className="text-xs font-semibold text-[#9C665C] hover:underline cursor-pointer"
            >
              ← Volver a Bodas
            </button>
          </div>
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
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
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
              <div className="flex items-center space-x-3 pb-3 border-b border-stone-100">
                {userForm.avatar_url ? (
                  <img
                    src={userForm.avatar_url}
                    alt={userForm.name}
                    className="w-12 h-12 rounded-full object-cover border border-[#CCDACC] shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#EFE2DF] text-[#8A574E] font-serif font-bold text-lg flex items-center justify-center border border-[#EAE3DA] shrink-0">
                    {userForm.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-stone-800">{userForm.name || 'Nuevo Miembro'}</div>
                  <div className="text-[11px] text-stone-500">
                    {userForm.avatar_url ? 'Foto de perfil personalizada activa' : 'Sin foto cargada (usa inicial)'}
                  </div>
                </div>
              </div>

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
                  className="px-5 py-2 text-xs font-semibold bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">
                  Asignación Inicial de Checklist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#FAF8F5] border border-[#EAE3DA] rounded-2xl">
                  <label
                    onClick={() => setFormData({ ...formData, checklist_option: 'full' })}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      formData.checklist_option === 'full'
                        ? 'bg-white border-[#9C665C] shadow-xs'
                        : 'bg-white/60 border-[#EAE3DA] hover:border-[#9C665C]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="checklist_option"
                      checked={formData.checklist_option === 'full'}
                      onChange={() => setFormData({ ...formData, checklist_option: 'full' })}
                      className="mt-0.5 accent-[#9C665C]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[#2B2826]">
                        Plantilla Completa VLB
                      </div>
                      <div className="text-[11px] text-[#8A7E72] mt-0.5 leading-snug">
                        Carga Checklist General y etapas por meses.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setFormData({ ...formData, checklist_option: 'empty' })}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      formData.checklist_option === 'empty'
                        ? 'bg-white border-[#9C665C] shadow-xs'
                        : 'bg-white/60 border-[#EAE3DA] hover:border-[#9C665C]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="checklist_option"
                      checked={formData.checklist_option === 'empty'}
                      onChange={() => setFormData({ ...formData, checklist_option: 'empty' })}
                      className="mt-0.5 accent-[#9C665C]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[#2B2826]">
                        Checklist en Blanco
                      </div>
                      <div className="text-[11px] text-[#8A7E72] mt-0.5 leading-snug">
                        Decidiré manualmente qué actividades asignar.
                      </div>
                    </div>
                  </label>
                </div>
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
                  className="px-6 py-2.5 text-xs font-semibold bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Guardando...' : 'Crear Proyecto Boda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      </main>
    </div>
  );
};
