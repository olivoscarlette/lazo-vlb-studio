import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wedding, User, AuditLog } from '../types';
import * as XLSX from 'xlsx';
import {
  Plus, Calendar, MapPin, Users2, ArrowRight, Sparkles,
  Building2, Search, AlertCircle, Shield, Settings,
  Database, History, Download, Upload, Trash2, CheckCircle2, Edit3,
  FileSpreadsheet, RefreshCw, Save, X, MessageSquare, Bell, LogOut,
  FileText, LayoutGrid, PanelLeftClose, PanelLeft, ChevronDown
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
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'BODAS' | 'DESPEDIDAS' | 'BABY_SHOWER' | 'OTROS'>('ALL');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
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
  const [masterChecklist, setMasterChecklist] = useState<{ title: string; category: string; priority: string; responsible?: string; event_type?: string }[]>([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState<'Boda Completa' | 'Boda Civil' | 'Despedida de Soltera' | 'Baby Shower' | 'XV Años' | 'Otros' | 'Requisitos Ceremoniales'>('Boda Completa');
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [showQuickAddActivity, setShowQuickAddActivity] = useState(false);
  const [allPhasesExpanded, setAllPhasesExpanded] = useState(false);
  const [showTemplateToolsDropdown, setShowTemplateToolsDropdown] = useState(false);
  const [newMasterTask, setNewMasterTask] = useState({
    title: '',
    category: 'Checklist General',
    priority: 'Alta'
  });
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState({
    title: '',
    category: 'Checklist General',
    priority: 'Alta'
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

  // New wedding / event form
  const [formData, setFormData] = useState({
    event_type: 'Boda Completa',
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

  // Edit wedding / event form
  const [editingWedding, setEditingWedding] = useState<Wedding | null>(null);
  const [editFormData, setEditFormData] = useState({
    event_type: 'Boda Completa',
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
    status: 'PLANNING',
    notes: ''
  });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Helper to compute default event name from type and celebrants
  const getAutoEventName = (type: string, p1: string, p2: string) => {
    const cleanP1 = p1.trim();
    const cleanP2 = p2.trim();
    if (type === 'Despedida de Soltera') {
      return cleanP1 ? `Despedida ${cleanP1}` : 'Despedida';
    } else if (type === 'Baby Shower') {
      return cleanP1 ? `Baby Shower ${cleanP1}` : 'Baby Shower';
    } else if (type === 'Bautizo / Primera Comunión') {
      return cleanP1 ? `Bautizo ${cleanP1}` : 'Bautizo';
    } else if (type === 'XV Años / Aniversario') {
      return cleanP1 ? `XV Años ${cleanP1}` : 'XV Años';
    } else if (type === 'Boda Civil') {
      return cleanP1 && cleanP2 ? `Boda Civil ${cleanP1} & ${cleanP2}` : (cleanP1 ? `Boda Civil ${cleanP1}` : 'Boda Civil');
    } else if (type.includes('Boda')) {
      return cleanP1 && cleanP2 ? `${cleanP1} & ${cleanP2}` : (cleanP1 || cleanP2 || '');
    }
    return cleanP1 ? `${type} ${cleanP1}` : type;
  };

  const handleOpenEditModal = (e: React.MouseEvent, w: Wedding) => {
    e.stopPropagation();
    setEditingWedding(w);
    setEditError('');
    setEditFormData({
      event_type: w.event_type || 'Boda Completa',
      name: w.name || '',
      partner_1_name: w.partner_1_name || '',
      partner_2_name: w.partner_2_name || '',
      wedding_date: w.wedding_date ? w.wedding_date.split('T')[0] : '',
      ceremony_venue: w.ceremony_venue || '',
      reception_venue: w.reception_venue || '',
      ceremony_time: w.ceremony_time || '15:00',
      reception_time: w.reception_time || '18:00',
      estimated_guests: String(w.estimated_guests || 0),
      package_type: w.package_type || 'Integral',
      status: w.status || 'PLANNING',
      notes: w.notes || ''
    });
  };

  const handleSaveEditWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWedding) return;
    setEditError('');
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/weddings/${editingWedding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editFormData,
          estimated_guests: parseInt(editFormData.estimated_guests, 10) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el evento.');
      }
      setEditingWedding(null);
      await fetchWeddings();
    } catch (err: any) {
      setEditError(err.message || 'Error al guardar los cambios.');
    } finally {
      setSavingEdit(false);
    }
  };

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
        event_type: 'Boda Completa',
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

  const getCategoriesForType = (type: string) => {
    switch (type) {
      case 'Boda Civil':
        return ['Trámites y Documentación Civil', '3 - 4 meses', '1 - 2 meses', 'Semana del evento'];
      case 'Despedida de Soltera':
        return ['Concepto y Temática', '2 - 3 meses', '1 mes', 'Semana del evento'];
      case 'Baby Shower':
        return ['Organización y Temática', '1 - 2 meses', 'Semana del evento'];
      case 'XV Años':
        return ['10 - 12 meses', '6 - 8 meses', '3 - 4 meses', '1 - 2 meses', 'Semana del evento'];
      case 'Otros':
        return ['Planeación General', 'Semana del evento'];
      case 'Requisitos Ceremoniales':
        return ['Requisitos de Ceremonia Civil', 'Requisitos de Ceremonia Religiosa'];
      default: // Boda Completa
        return [
          'Checklist General',
          '12 - 16 meses',
          '10 - 11 meses',
          '8 - 9 meses',
          '6 - 7 meses',
          '4 - 5 meses',
          '2 - 3 meses',
          '1 mes',
          '15 días',
          '1 semana'
        ];
    }
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phase]: prev[phase] === undefined ? false : !prev[phase]
    }));
  };

  const handleToggleAllPhases = () => {
    const nextState = !allPhasesExpanded;
    setAllPhasesExpanded(nextState);
    const phases = getCategoriesForType(selectedTemplateType);
    const newMap: Record<string, boolean> = {};
    phases.forEach(p => {
      newMap[p] = nextState;
    });
    setExpandedPhases(newMap);
  };

  const templateOptions: {
    key: 'Boda Completa' | 'Boda Civil' | 'Despedida de Soltera' | 'Baby Shower' | 'XV Años' | 'Otros' | 'Requisitos Ceremoniales';
    name: string;
    typeLabel: 'Plantilla' | 'Requisitos';
    desc: string;
  }[] = [
    { key: 'Boda Completa', name: 'Boda Completa', typeLabel: 'Plantilla', desc: 'Cronograma integral estándar para bodas de principio a fin.' },
    { key: 'Boda Civil', name: 'Boda Civil', typeLabel: 'Plantilla', desc: 'Trámites legales, juzgado y celebración íntima.' },
    { key: 'Despedida de Soltera', name: 'Despedida de Soltera', typeLabel: 'Plantilla', desc: 'Organización de despedida formal, brunch o viaje con amigas.' },
    { key: 'Baby Shower', name: 'Baby Shower', typeLabel: 'Plantilla', desc: 'Celebración y bienvenida del bebé con familiares y amigos.' },
    { key: 'XV Años', name: 'XV Años', typeLabel: 'Plantilla', desc: 'Planeación completa de quinceañera: ceremonia, vals y fiesta.' },
    { key: 'Otros', name: 'Otros Eventos', typeLabel: 'Plantilla', desc: 'Bautizos, aniversarios, cumpleaños y eventos corporativos.' },
    { key: 'Requisitos Ceremoniales', name: 'Requisitos Ceremoniales', typeLabel: 'Requisitos', desc: 'Trámites específicos exclusivamente para ceremonias civiles y religiosas.' },
  ];

  const getTemplateCount = (key: string) => {
    if (key === 'Requisitos Ceremoniales') {
      return masterCivilReqs.length + masterReligiousReqs.length;
    }
    return masterChecklist.filter(item => {
      const et = (item.event_type || 'Boda Completa').toLowerCase();
      const target = key.toLowerCase();
      if (target.includes('civil')) return et.includes('civil');
      if (target.includes('despedida')) return et.includes('despedida');
      if (target.includes('baby')) return et.includes('baby');
      if (target.includes('xv') || target.includes('quince')) return et.includes('xv') || et.includes('quince');
      if (target.includes('otro')) return et.includes('otro');
      return !et.includes('civil') && !et.includes('despedida') && !et.includes('baby') && !et.includes('xv') && !et.includes('quince') && !et.includes('otro');
    }).length;
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
        responsible: 'Lazo Studio',
        event_type: selectedTemplateType
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
      category: item.category || 'Checklist General',
      priority: item.priority || 'Alta'
    });
  };

  const handleSaveEditMasterTask = (idx: number) => {
    if (!editingTaskDraft.title.trim()) return;
    const updated = masterChecklist.map((item, i) =>
      i === idx
        ? {
            ...item,
            title: editingTaskDraft.title.trim(),
            category: editingTaskDraft.category,
            priority: editingTaskDraft.priority
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
        ETAPA_O_MES: item.category || 'Checklist General',
        ACTIVIDAD_O_REQUISITO: item.title,
        RESPONSABLE: item.responsible || 'Lazo Studio',
        PRIORIDAD: item.priority || 'Alta'
      });
    });
    masterCivilReqs.forEach(req => {
      rows.push({
        MODULO: 'CIVIL',
        ETAPA_O_MES: 'Requisitos Civil',
        ACTIVIDAD_O_REQUISITO: req,
        RESPONSABLE: 'Lazo Studio',
        PRIORIDAD: 'Alta'
      });
    });
    masterReligiousReqs.forEach(req => {
      rows.push({
        MODULO: 'RELIGIOSA',
        ETAPA_O_MES: 'Requisitos Iglesia',
        ACTIVIDAD_O_REQUISITO: req,
        RESPONSABLE: 'Lazo Studio',
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
    XLSX.utils.book_append_sheet(wb, ws, 'Plantillas Lazo Studio');
    XLSX.writeFile(wb, 'Plantillas_Maestras_Lazo_Studio.xlsx');
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

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(w => (w === '&' || w === 'y' ? '&' : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  };

  const renderCoupleNames = (w: Wedding) => {
    const rawName = (w.name || '').trim();
    const eventType = (w.event_type || '').toLowerCase();
    const p1Raw = (w.partner_1_name || '').trim();
    const p2Raw = (w.partner_2_name || '').trim();

    let line1 = '';
    let line2 = '';
    let hasAmpersand = false;

    const clean = (s: string) => toTitleCase(s.trim());

    // 1. Si contiene '&' o ' y ' (ej. "Sofía & Alejandro", "Boda Civil Dani & Carlos")
    if (rawName.includes('&') || rawName.includes(' y ')) {
      const isAmp = rawName.includes('&');
      const delimiter = isAmp ? '&' : ' y ';
      const parts = rawName.split(delimiter);
      line1 = clean(parts[0]);
      line2 = clean(parts.slice(1).join(delimiter));
      hasAmpersand = true;
    }
    // 2. Si ambos contrayentes están registrados y el nombre no los separa
    else if (p1Raw && p2Raw) {
      line1 = clean(p1Raw);
      line2 = clean(p2Raw);
      hasAmpersand = true;
    }
    // 3. Despedida de Soltera
    else if (eventType.includes('despedida') || rawName.toLowerCase().startsWith('despedida')) {
      line1 = 'Despedida';
      let rest = rawName.replace(/^despedida(\s+de\s+soltera|\s+de|\s+)?/i, '').trim();
      if (!rest) rest = p1Raw || 'Soltera';
      line2 = clean(rest);
    }
    // 4. Baby Shower
    else if (eventType.includes('baby') || rawName.toLowerCase().startsWith('baby')) {
      line1 = 'Baby Shower';
      let rest = rawName.replace(/^baby\s*shower(\s+de|\s+)?/i, '').trim();
      if (!rest) rest = p1Raw || 'Bebé';
      line2 = clean(rest);
    }
    // 5. Bautizo / Primera Comunión
    else if (eventType.includes('bautizo') || rawName.toLowerCase().startsWith('bautizo')) {
      line1 = 'Bautizo';
      let rest = rawName.replace(/^bautizo(\s+de|\s+)?/i, '').trim();
      if (!rest) rest = p1Raw || 'Celebración';
      line2 = clean(rest);
    }
    else if (eventType.includes('comuni') || rawName.toLowerCase().startsWith('comuni') || rawName.toLowerCase().startsWith('primera com')) {
      line1 = 'Primera Comunión';
      let rest = rawName.replace(/^(primera\s+comuni[oó]n|comuni[oó]n)(\s+de|\s+)?/i, '').trim();
      if (!rest) rest = p1Raw || 'Celebración';
      line2 = clean(rest);
    }
    // 6. XV Años / Aniversario
    else if (eventType.includes('xv') || rawName.toLowerCase().startsWith('xv') || rawName.toLowerCase().startsWith('mis xv')) {
      line1 = 'XV Años';
      let rest = rawName.replace(/^(xv\s+a[nñ]os|mis\s+xv)(\s+de|\s+)?/i, '').trim();
      if (!rest) rest = p1Raw || 'Quinceañera';
      line2 = clean(rest);
    }
    else if (eventType.includes('aniversario') || rawName.toLowerCase().startsWith('aniversario')) {
      line1 = 'Aniversario';
      let rest = rawName.replace(/^aniversario(\s+de|\s+)?/i, '').trim();
      if (!rest) rest = p1Raw || 'Celebración';
      line2 = clean(rest);
    }
    // 7. Boda Civil sin ampersand
    else if (eventType.includes('civil') || rawName.toLowerCase().startsWith('boda civil')) {
      line1 = 'Boda Civil';
      let rest = rawName.replace(/^boda\s+civil(\s+de|\s+)?/i, '').trim();
      if (!rest) rest = p1Raw || 'Civil';
      line2 = clean(rest);
    }
    // 8. Cualquier nombre con múltiples palabras
    else if (rawName.includes(' ')) {
      const words = rawName.split(' ');
      line1 = clean(words[0]);
      line2 = clean(words.slice(1).join(' '));
    }
    // 9. Nombre único
    else {
      line1 = clean(rawName || p1Raw || 'Evento');
      line2 = clean(p1Raw && p1Raw !== rawName ? p1Raw : (w.event_type || 'Exclusivo'));
    }

    return (
      <>
        <div className="truncate text-[#2B2826]">{line1}</div>
        <div className="truncate text-[#A86B60]">
          {hasAmpersand && <span className="text-[#C48B81] mr-1.5">&</span>}
          {line2}
        </div>
      </>
    );
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
    { id: 'weddings', label: 'Eventos', icon: Users2 },
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
      (w.event_type && w.event_type.toLowerCase().includes(q)) ||
      (w.partner_1_name && w.partner_1_name.toLowerCase().includes(q)) ||
      (w.partner_2_name && w.partner_2_name.toLowerCase().includes(q)) ||
      (w.ceremony_venue && w.ceremony_venue.toLowerCase().includes(q)) ||
      (w.reception_venue && w.reception_venue.toLowerCase().includes(q)) ||
      (w.wedding_date && w.wedding_date.includes(q));

    let matchesCategory = true;
    const type = (w.event_type || 'Boda Completa').toLowerCase();
    if (categoryFilter === 'BODAS') {
      matchesCategory = type.includes('boda');
    } else if (categoryFilter === 'DESPEDIDAS') {
      matchesCategory = type.includes('despedida');
    } else if (categoryFilter === 'BABY_SHOWER') {
      matchesCategory = type.includes('baby');
    } else if (categoryFilter === 'OTROS') {
      matchesCategory = !type.includes('boda') && !type.includes('despedida') && !type.includes('baby');
    }

    return matchesSearch && matchesCategory;
  });

  const countBodas = weddings.filter(w => !w.event_type || w.event_type.toLowerCase().includes('boda')).length;
  const countDespedidas = weddings.filter(w => w.event_type?.toLowerCase().includes('despedida')).length;
  const countBabyShowers = weddings.filter(w => w.event_type?.toLowerCase().includes('baby')).length;
  const countOtros = weddings.filter(w => {
    const t = (w.event_type || '').toLowerCase();
    return t && !t.includes('boda') && !t.includes('despedida') && !t.includes('baby');
  }).length;

  const getCategoryLabel = () => {
    switch (categoryFilter) {
      case 'BODAS':
        return { label: 'Bodas', count: countBodas };
      case 'DESPEDIDAS':
        return { label: 'Despedidas de Soltera', count: countDespedidas };
      case 'BABY_SHOWER':
        return { label: 'Baby Showers', count: countBabyShowers };
      case 'OTROS':
        return { label: 'Otros Eventos', count: countOtros };
      default:
        return { label: 'Todos los eventos', count: weddings.length };
    }
  };

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
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col md:flex-row text-[#2B2826] max-w-full overflow-x-hidden">
      {/* Mobile Backdrop Overlay for GeneralDashboard */}
      {sidebarOpen && (
        <div
          onClick={handleToggleSidebar}
          className="fixed inset-0 bg-[#2B2826]/40 z-40 backdrop-blur-xs md:hidden transition-opacity duration-300"
        />
      )}

      {/* 1. Sidebar Izquierdo Fijo/Acoplado — Sigue la pantalla y nunca se corta al hacer scroll */}
      <aside
        className={`shrink-0 bg-[#FAF7F5] border-r border-[#EFE8E1] flex flex-col transition-all duration-300 ${
          // Mobile: drawer
          `fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] h-full shadow-2xl z-50 md:shadow-none md:fixed md:top-0 md:bottom-0 md:left-0 md:h-screen md:z-30 ${
            sidebarOpen
              ? 'translate-x-0 opacity-100'
              : '-translate-x-full opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto'
          } ` +
          // Desktop:
          (sidebarOpen ? 'md:w-64 lg:w-72 p-6' : 'md:w-16 lg:w-[4.25rem] p-2.5')
        }`}
      >
        <div className={`mb-6 flex flex-col transition-all ${sidebarOpen ? 'px-2' : 'items-center gap-2.5'}`}>
          {sidebarOpen ? (
            <div className="w-full flex items-center justify-between">
              <div
                onClick={() => setActiveTab('weddings')}
                className="flex items-center space-x-2 cursor-pointer"
                title="Ir a Eventos · LAZO Studio"
              >
                <img
                  src="/lazo-logo.png"
                  alt="LAZO — Studio Planning"
                  className="h-9 sm:h-11 w-auto object-contain select-none"
                />
              </div>
              <button
                onClick={handleToggleSidebar}
                aria-label="Contraer menú lateral"
                className="p-1.5 text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#F2ECE7] rounded-xl transition cursor-pointer"
                title="Contraer menú lateral (⌘B)"
              >
                <PanelLeftClose className="w-5 h-5 text-[#C48B81] hidden md:block" />
                <X className="w-5 h-5 text-[#C48B81] md:hidden" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 w-full">
              <div
                onClick={() => setActiveTab('weddings')}
                className="cursor-pointer flex items-center justify-center p-1 rounded-xl hover:bg-[#F2ECE7] transition"
                title="Ir a Eventos · LAZO Studio"
              >
                <img
                  src="/lazo-logo.png"
                  alt="LAZO — Studio Planning"
                  className="h-6 sm:h-7 w-auto max-w-[46px] object-contain select-none"
                />
              </div>
              <button
                onClick={handleToggleSidebar}
                aria-label="Expandir menú lateral"
                className="p-2 text-[#7D6F6B] hover:text-[#C48B81] hover:bg-[#F2ECE7] rounded-xl transition cursor-pointer"
                title="Expandir menú lateral (⌘B)"
              >
                <PanelLeft className="w-5 h-5 text-[#C48B81]" />
              </button>
            </div>
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
                    ? 'bg-[#F7EDEB] text-[#C48B81] font-semibold shadow-xs'
                    : 'text-[#7D6F6B] hover:bg-[#F2ECE7] hover:text-[#2B2826] font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#C48B81]' : 'text-[#7D6F6B]'}`} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className={`pt-4 border-t border-[#EFE8E1] flex items-center text-xs text-[#7D6F6B] transition-all ${
          sidebarOpen ? 'px-3 justify-between' : 'justify-center p-2'
        }`}>
          {sidebarOpen && <span>Lazo Studio · Planning</span>}
          <span className="w-2 h-2 rounded-full bg-[#6E8C70]" title="Sistema Activo" />
        </div>
      </aside>

      {/* 2. Área Principal de Contenido — Adaptada al sidebar fijo */}
      <main className={`flex-1 min-w-0 max-w-full overflow-x-hidden p-3.5 sm:p-8 lg:p-10 overflow-y-auto transition-all duration-300 ${
        sidebarOpen ? 'md:ml-64 lg:ml-72' : 'md:ml-16 lg:ml-[4.25rem]'
      }`}>
        {/* Barra Superior Móvil: Siempre visible en móvil con Logo, Menú, Notificaciones y Perfil */}
        <div className="flex md:hidden items-center justify-between gap-3 pb-3 mb-5 border-b border-[#EFE8E1]">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleToggleSidebar}
              aria-label="Abrir menú"
              className="p-2 rounded-xl border border-[#EFE8E1] bg-[#FFFFFF] hover:bg-[#F2ECE7] text-[#2B2826] transition shadow-2xs cursor-pointer shrink-0"
              title="Menú"
            >
              <PanelLeft className="w-5 h-5 text-[#C48B81]" />
            </button>
            <div
              onClick={() => setActiveTab('weddings')}
              className="flex items-center cursor-pointer"
              title="LAZO Studio"
            >
              <img
                src="/lazo-logo.png"
                alt="LAZO"
                className="h-7 w-auto object-contain select-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Campana de Notificaciones Móvil */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-2 text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#F2ECE7] rounded-full transition cursor-pointer relative"
                title="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C48B81]" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EFE8E1] py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-[#F2ECE7] flex items-center justify-between">
                    <span className="font-serif text-base font-semibold text-[#2B2826]">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-[#F7EDEB] text-[#A86B60] px-2.5 py-0.5 rounded-full font-medium">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F2ECE7]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#7D6F6B]">
                        No hay notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-3 text-xs cursor-pointer hover:bg-[#FAF7F5] transition ${!n.read ? 'bg-[#F7EDEB]/50' : ''}`}
                        >
                          <div className="font-semibold text-[#2B2826] mb-0.5">{n.title}</div>
                          <div className="text-[11px] text-[#7D6F6B] leading-snug">{n.message}</div>
                          <div className="text-[10px] text-[#7D6F6B] mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                  className="w-8 h-8 rounded-full object-cover border border-[#CCDACC] shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#F7EDEB] text-[#A86B60] font-serif font-bold text-xs flex items-center justify-center border border-[#ECD9D5]">
                  {userName.charAt(0)}
                </div>
              )}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#6E8C70] border-2 border-[#FAF7F5]" />
            </div>

            {/* Salir */}
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#F2ECE7] rounded-full transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PESTAÑA PRINCIPAL: BODAS */}
        {activeTab === 'weddings' && (
          <div>
            {/* Cabecera Editorial */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#2B2826] tracking-tight">
                    Hola, {userName} 👋
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F7EDEB] text-[#A86B60] border border-[#ECD9D5] shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#C48B81]"></span>
                    {weddings.length} {weddings.length === 1 ? 'evento activo' : 'eventos activos'}
                  </span>
                </div>
                <p className="text-xs text-[#7D6F6B] mt-1 sm:mt-1.5 leading-relaxed">
                  Estudio de planeación y diseño integral · Temporada 2026-2027
                </p>
              </div>

              {/* Botón de Agregar Evento y Controles de Escritorio */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full md:w-auto inline-flex items-center justify-center bg-[#C48B81] hover:bg-[#A86B60] text-[#FFFFFF] px-6 py-2.5 rounded-full text-sm font-semibold shadow-xs hover:shadow-md hover:shadow-[#C48B81]/20 transition cursor-pointer"
                >
                  <span>Agregar evento</span>
                </button>

                {/* Controles de perfil y notificaciones visibles SOLO en escritorio */}
                <div className="hidden md:flex items-center space-x-3.5">
                  <div
                    onClick={() => setShowProfileModal(true)}
                    className="relative cursor-pointer group"
                    title={`Mi Perfil · ${user?.name || ''}`}
                  >
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user?.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#CCDACC] shadow-2xs group-hover:ring-2 group-hover:ring-[#C48B81] transition"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#F7EDEB] text-[#A86B60] font-serif font-bold text-base flex items-center justify-center border border-[#ECD9D5] shadow-2xs group-hover:ring-2 group-hover:ring-[#C48B81] transition">
                        {userName.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#6E8C70] border-2 border-[#FAF7F5]" title="En línea" />
                  </div>

                  {/* Campana de Notificaciones Escritorio */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifMenu(!showNotifMenu)}
                      className="p-2.5 text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#F2ECE7] rounded-full transition cursor-pointer relative"
                      title="Notificaciones"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C48B81]" />
                      )}
                    </button>

                    {showNotifMenu && (
                      <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EFE8E1] py-2 z-50">
                        <div className="px-4 py-2.5 border-b border-[#F2ECE7] flex items-center justify-between">
                          <span className="font-serif text-lg font-semibold text-[#2B2826]">Notificaciones</span>
                          {unreadCount > 0 && (
                            <span className="text-xs bg-[#F7EDEB] text-[#A86B60] px-2.5 py-0.5 rounded-full font-medium">
                              {unreadCount} nuevas
                            </span>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-[#F2ECE7]">
                          {notifications.length === 0 ? (
                            <div className="p-5 text-center text-sm text-[#7D6F6B]">
                              No hay notificaciones pendientes.
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div
                                key={n.id}
                                onClick={() => handleMarkAsRead(n.id)}
                                className={`p-3.5 text-sm cursor-pointer hover:bg-[#FAF7F5] transition ${!n.read ? 'bg-[#F7EDEB]/50' : ''}`}
                              >
                                <div className="font-semibold text-[#2B2826] mb-0.5">{n.title}</div>
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
                    className="p-2.5 text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#F2ECE7] rounded-full transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Barra de Búsqueda Rápida y Filtros Directos */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 sm:mb-8">
              <div className="relative flex-1 max-w-full md:max-w-md">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                <input
                  type="text"
                  placeholder="Buscar evento por nombre, tipo o fecha..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-full text-sm text-[#2B2826] placeholder-[#7D6F6B]/70 focus:outline-none focus:border-[#C48B81] shadow-2xs transition"
                />
              </div>

              {/* Selector Desplegable de Tipo de Evento (Dropdown Editorial) */}
              <div className="relative self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFFFFF] hover:bg-[#FAF7F5] border border-[#EFE8E1] rounded-full text-xs font-semibold text-[#2B2826] shadow-2xs hover:border-[#C48B81] transition cursor-pointer select-none"
                >
                  <span className="text-[#7D6F6B] font-normal">Ver:</span>
                  <span className="text-[#2B2826] font-semibold">{getCategoryLabel().label}</span>
                  <span className="bg-[#F7EDEB] text-[#A86B60] text-[11px] px-2 py-0.5 rounded-full font-bold">
                    {getCategoryLabel().count}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#C48B81] transition-transform duration-200 ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </button>

                {showCategoryMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowCategoryMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EFE8E1] p-1.5 z-30 transition-all duration-150">
                      <div className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-[#7D6F6B] border-b border-[#FAF7F5]">
                        Filtrar por tipo de evento
                      </div>

                      <div className="space-y-0.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('ALL');
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer group ${
                            categoryFilter === 'ALL'
                              ? 'bg-[#F7EDEB] text-[#A86B60] font-semibold'
                              : 'text-[#2B2826] hover:bg-[#FAF7F5] hover:text-[#C48B81]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${categoryFilter === 'ALL' ? 'bg-[#C48B81]' : 'bg-transparent group-hover:bg-[#C48B81]'}`}></span>
                            <span>Todos los eventos</span>
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${categoryFilter === 'ALL' ? 'bg-[#FFFFFF] text-[#A86B60] shadow-2xs' : 'bg-[#F7EDEB] text-[#A86B60]'}`}>
                            {weddings.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('BODAS');
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer group ${
                            categoryFilter === 'BODAS'
                              ? 'bg-[#F7EDEB] text-[#A86B60] font-semibold'
                              : 'text-[#2B2826] hover:bg-[#FAF7F5] hover:text-[#C48B81]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${categoryFilter === 'BODAS' ? 'bg-[#C48B81]' : 'bg-transparent group-hover:bg-[#C48B81]'}`}></span>
                            <span>Bodas</span>
                          </div>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-[#7D6F6B]">
                            {countBodas}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('DESPEDIDAS');
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer group ${
                            categoryFilter === 'DESPEDIDAS'
                              ? 'bg-[#F7EDEB] text-[#A86B60] font-semibold'
                              : 'text-[#2B2826] hover:bg-[#FAF7F5] hover:text-[#C48B81]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${categoryFilter === 'DESPEDIDAS' ? 'bg-[#C48B81]' : 'bg-transparent group-hover:bg-[#C48B81]'}`}></span>
                            <span>Despedidas de Soltera</span>
                          </div>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-[#7D6F6B]">
                            {countDespedidas}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('BABY_SHOWER');
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer group ${
                            categoryFilter === 'BABY_SHOWER'
                              ? 'bg-[#F7EDEB] text-[#A86B60] font-semibold'
                              : countBabyShowers === 0
                              ? 'text-[#7D6F6B] opacity-60 hover:opacity-100 hover:bg-[#FAF7F5]'
                              : 'text-[#2B2826] hover:bg-[#FAF7F5] hover:text-[#C48B81]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${categoryFilter === 'BABY_SHOWER' ? 'bg-[#C48B81]' : 'bg-transparent group-hover:bg-[#C48B81]'}`}></span>
                            <span>Baby Showers</span>
                          </div>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-[#7D6F6B]">
                            {countBabyShowers}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('OTROS');
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer group ${
                            categoryFilter === 'OTROS'
                              ? 'bg-[#F7EDEB] text-[#A86B60] font-semibold'
                              : countOtros === 0
                              ? 'text-[#7D6F6B] opacity-60 hover:opacity-100 hover:bg-[#FAF7F5]'
                              : 'text-[#2B2826] hover:bg-[#FAF7F5] hover:text-[#C48B81]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${categoryFilter === 'OTROS' ? 'bg-[#C48B81]' : 'bg-transparent group-hover:bg-[#C48B81]'}`}></span>
                            <span>Otros Eventos</span>
                          </div>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-[#7D6F6B]">
                            {countOtros}
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Grid de Tarjetas de Eventos Limpias y Claras */}
            {loading ? (
              <div className="py-20 text-center text-[#7D6F6B] text-sm">Cargando eventos...</div>
            ) : filteredWeddings.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-3xl p-12 text-center border border-dashed border-[#EFE8E1]">
                <h3 className="font-serif text-xl font-semibold text-[#2B2826]">No se encontraron eventos</h3>
                <p className="text-[#7D6F6B] text-sm mt-1">Crea un nuevo evento o ajusta tus filtros de búsqueda.</p>
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
                      className="luxury-card bg-[#FFFFFF] rounded-3xl p-6 sm:p-7 border border-[#EFE8E1] transition-all duration-300 flex flex-col justify-between group cursor-pointer hover:border-[#ECD9D5]"
                    >
                      <div>
                        {/* Fila superior: Tipo de evento, Nombre del Evento y botones de acción */}
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2">
                              <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-[#A86B60] bg-[#FAF3F0] px-2.5 py-0.5 rounded-full border border-[#ECD9D5]">
                                {w.event_type || 'Boda Completa'}
                              </span>
                            </div>
                            <div className="font-atteron text-3xl sm:text-[34px] font-normal leading-[1.2]">
                              {renderCoupleNames(w)}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {(user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR') && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditModal(e, w)}
                                className="p-1.5 text-stone-400 hover:text-[#A86B60] hover:bg-[#F7EDEB] rounded-lg transition opacity-80 group-hover:opacity-100"
                                title="Editar evento"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {user?.role === 'ADMINISTRADOR' && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteWedding(e, w)}
                                className="p-1.5 text-stone-300 hover:text-rose-600 hover:bg-[#FBF4F3] rounded-lg transition opacity-0 group-hover:opacity-100"
                                title="Eliminar este evento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Badge de cuenta regresiva */}
                        <div className="mb-3.5">
                          <span className="inline-flex items-center text-xs font-medium text-[#A86B60] bg-[#F7EDEB] border border-[#ECD9D5] px-3.5 py-1 rounded-full select-none">
                            {countdownText}
                          </span>
                        </div>

                        {/* Lugar / Sede */}
                        <div className="flex items-center space-x-1.5 text-xs text-[#7D6F6B] mb-5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#C48B81] shrink-0" />
                          <span className="truncate">{venueName}</span>
                        </div>

                        {/* Barra delgada y estética */}
                        <div className="w-full h-1.5 bg-[#F7EDEB] rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-to-r from-[#C48B81] to-[#D8A69E] rounded-full transition-all duration-500"
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
                                  className="w-7 h-7 rounded-full bg-[#F7EDEB] text-[#A86B60] flex items-center justify-center border border-[#ECD9D5] shadow-2xs select-none shrink-0"
                                >
                                  <span className="text-[11px] font-bold uppercase leading-none">
                                    {member.name?.trim()?.charAt(0) || 'V'}
                                  </span>
                                </div>
                              ))}
                              {w.team.length > 3 && (
                                <div
                                  title={`+${w.team.length - 3} miembros adicionales`}
                                  className="w-7 h-7 rounded-full bg-[#F2ECE7] text-[#7D6F6B] flex items-center justify-center border border-[#EFE8E1] shadow-2xs select-none shrink-0"
                                >
                                  <span className="text-[10px] font-bold leading-none">
                                    +{w.team.length - 3}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div
                              title="Lazo Studio"
                              className="w-7 h-7 rounded-full bg-[#F7EDEB] text-[#A86B60] flex items-center justify-center border border-[#ECD9D5] shadow-2xs select-none shrink-0"
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
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#2B2826] bg-[#FFFFFF] hover:bg-[#F7EDEB] border border-[#EFE8E1] transition shadow-2xs group-hover:border-[#C48B81] group-hover:text-[#C48B81] cursor-pointer"
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
            <div className="flex items-center justify-between pb-4 border-b border-[#EFE8E1]">
              <div className="flex items-center space-x-3.5">
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
          <div className="space-y-2">
            <div className="flex items-center justify-end pb-1 md:hidden">
              <button
                onClick={() => setActiveTab('weddings')}
                className="text-xs font-semibold text-[#C48B81] hover:underline cursor-pointer"
              >
                ← Volver a Eventos
              </button>
            </div>
            <WhatsAppHubModule />
          </div>
        )}

        {/* PESTAÑA: USUARIOS Y EQUIPO */}
        {activeTab === 'equipo' && user?.role === 'ADMINISTRADOR' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFE8E1]">
              <div className="flex items-center space-x-3.5">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#332A28]">Bitácora & Equipo Lazo</h2>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">Gestión de coordinadores, staff y accesos operativos de bodas.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('weddings')}
                className="text-xs font-semibold text-[#C48B81] hover:underline cursor-pointer"
              >
                ← Volver a Bodas
              </button>
            </div>
            <div className="luxury-card rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Seguridad y Accesos RBAC</span>
              <h2 className="font-serif text-2xl font-bold text-stone-900">Usuarios, Equipo Lazo y Cuentas de Clientes</h2>
              <p className="text-xs text-stone-500 mt-1">
                Crea, edita o elimina miembros del equipo Lazo y cuentas de clientes, y asigna a qué bodas tiene acceso cada coordinador o staff.
              </p>
            </div>
            <button
              onClick={handleOpenNewUser}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
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
                            <div className="w-9 h-9 rounded-full bg-[#EFE2DF] text-[#A86B60] font-serif font-bold text-sm flex items-center justify-center shrink-0 border border-[#EFE8E1]">
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
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'ADMINISTRADOR'
                            ? 'bg-stone-900 text-white'
                            : u.role === 'COORDINADOR'
                            ? 'bg-[#F7EDEB] text-[#A86B60] border border-[#ECD9D5]'
                            : u.role === 'STAFF'
                            ? 'bg-[#F5EFEB] text-[#7D6F6B] border border-[#EFE8E1]'
                            : 'bg-[#E5EDE6] text-[#384C3A] border border-[#D5E2D7]'
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

      {/* PESTAÑA: PLANTILLAS LAZO STUDIO */}
      {activeTab === 'plantillas' && user?.role === 'ADMINISTRADOR' && (() => {
        const activeOption = templateOptions.find(o => o.key === selectedTemplateType) || templateOptions[0];
        const isCeremonial = selectedTemplateType === 'Requisitos Ceremoniales';
        const phasesForActive = getCategoriesForType(selectedTemplateType);

        const currentTasksWithIdx = masterChecklist
          .map((item, originalIdx) => ({ item, originalIdx }))
          .filter(({ item }) => {
            const et = (item.event_type || 'Boda Completa').toLowerCase();
            const target = selectedTemplateType.toLowerCase();
            if (target.includes('civil')) return et.includes('civil');
            if (target.includes('despedida')) return et.includes('despedida');
            if (target.includes('baby')) return et.includes('baby');
            if (target.includes('xv') || target.includes('quince')) return et.includes('xv') || et.includes('quince');
            if (target.includes('otro')) return et.includes('otro');
            return !et.includes('civil') && !et.includes('despedida') && !et.includes('baby') && !et.includes('xv') && !et.includes('quince') && !et.includes('otro');
          });

        return (
          <div className="space-y-6">
            {/* Header Principal de Plantillas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE8E1]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2826]">
                    Plantillas de Actividades
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7EDEB] text-[#A86B60] border border-[#ECD9D5]">
                    Lazo Studio
                  </span>
                </div>
                <p className="text-xs text-[#7D6F6B] mt-1">
                  Consulta y personaliza rápidamente el checklist de cada tipo de evento antes de asignarlo.
                </p>
              </div>

              {/* Herramientas Secundarias Agrupadas */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplateToolsDropdown(!showTemplateToolsDropdown)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#FAF7F5] border border-[#EFE8E1] rounded-full text-xs font-semibold text-[#2B2826] transition shadow-2xs cursor-pointer select-none"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Herramientas Excel</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#C48B81] transition-transform duration-200 ${showTemplateToolsDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showTemplateToolsDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowTemplateToolsDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#EFE8E1] py-1.5 z-30 transition">
                        <button
                          type="button"
                          onClick={() => {
                            setShowTemplateToolsDropdown(false);
                            handleDownloadTemplatesExcel();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-[#FAF7F5] text-[#2B2826] flex items-center gap-2 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-[#C48B81]" />
                          <span>Descargar Excel</span>
                        </button>

                        <label className="w-full text-left px-4 py-2.5 text-xs hover:bg-[#FAF7F5] text-[#2B2826] flex items-center gap-2 transition cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-[#C48B81]" />
                          <span>{importingExcel ? 'Cargando...' : 'Subir Excel'}</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={e => {
                              setShowTemplateToolsDropdown(false);
                              handleUploadTemplatesExcel(e);
                            }}
                            disabled={importingExcel}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSyncTemplatesToWeddings}
                  disabled={syncingTemplates}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  title="Sincronizar cambios a eventos activos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingTemplates ? 'animate-spin' : ''}`} />
                  <span>{syncingTemplates ? 'Sincronizando...' : 'Aplicar a Eventos'}</span>
                </button>
              </div>
            </div>

            {catalogMsg && (
              <div className="p-4 rounded-2xl bg-[#E5EDE6] border border-[#D5E2D7] text-[#384C3A] text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#384C3A] shrink-0" />
                <span>{catalogMsg}</span>
              </div>
            )}

            {/* Selector Visual Rápido por Tipo de Evento (Cuadrícula de Tarjetas Limpias) */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#7D6F6B] mb-2.5">
                Selecciona el tipo de evento a consultar:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                {templateOptions.map(opt => {
                  const count = getTemplateCount(opt.key);
                  const active = selectedTemplateType === opt.key;
                  const phaseCount = getCategoriesForType(opt.key).length;

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateType(opt.key);
                        setShowQuickAddActivity(false);
                        const cats = getCategoriesForType(opt.key);
                        if (cats.length > 0) {
                          setNewMasterTask(prev => ({ ...prev, category: cats[0] }));
                        }
                      }}
                      className={`p-3 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between select-none ${
                        active
                          ? 'bg-white border-[#C48B81] shadow-md ring-2 ring-[#C48B81]/15'
                          : 'bg-[#FAF7F5] border-[#EFE8E1] hover:bg-white hover:border-[#CCDACC]'
                      }`}
                    >
                      <div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${
                          active ? 'text-[#C48B81]' : 'text-[#7D6F6B]'
                        }`}>
                          {opt.typeLabel}
                        </div>
                        <div className="font-serif text-sm font-bold text-[#2B2826] mt-0.5 leading-snug">
                          {opt.name}
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          active ? 'bg-[#F7EDEB] text-[#A86B60]' : 'bg-[#EFE8E1] text-[#7D6F6B]'
                        }`}>
                          {count} {opt.key === 'Requisitos Ceremoniales' ? 'req.' : 'act.'}
                        </span>
                        {opt.key !== 'Requisitos Ceremoniales' && (
                          <span className="text-[10px] text-[#A39690]">{phaseCount} fases</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PANEL ENFOCADO: 1. SI ES REQUISITOS CEREMONIALES */}
            {isCeremonial ? (
              <div className="bg-white rounded-3xl border border-[#EFE8E1] p-5 sm:p-7 shadow-2xs space-y-6">
                <div className="pb-4 border-b border-[#F2ECE7]">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2826]">
                      Requisitos Ceremoniales
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#F7EDEB] text-[#A86B60]">
                      {masterCivilReqs.length + masterReligiousReqs.length} requisitos
                    </span>
                  </div>
                  <p className="text-xs text-[#7D6F6B] mt-1">
                    Documentación oficial de Registro Civil y requisitos eclesiásticos exclusivos para bodas y ceremonias.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Requisitos Ceremonia Civil */}
                  <div className="p-5 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-serif text-base font-bold text-[#2B2826]">
                        Requisitos de Ceremonia Civil
                      </h4>
                      <span className="text-[11px] font-semibold text-[#A86B60] bg-[#F7EDEB] px-2 py-0.5 rounded-full">
                        {masterCivilReqs.length}
                      </span>
                    </div>
                    <p className="text-xs text-[#7D6F6B] mb-3">
                      Documentación requerida para el acta de matrimonio ante el Juez.
                    </p>

                    <form onSubmit={handleAddMasterCivilReq} className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Nuevo requisito civil (ej. Exámenes prenupciales)..."
                        value={newMasterCivilReq}
                        onChange={e => setNewMasterCivilReq(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-white text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#2B2826] hover:bg-[#1A1817] text-white text-xs font-semibold rounded-xl transition cursor-pointer shrink-0"
                      >
                        Agregar
                      </button>
                    </form>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 divide-y divide-[#EFE8E1]">
                      {masterCivilReqs.map((req, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                          {editingCivilIdx === idx ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingCivilText}
                                onChange={e => setEditingCivilText(e.target.value)}
                                className="flex-1 px-2.5 py-1 border border-[#EFE8E1] rounded-lg text-xs bg-white text-[#2B2826]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditCivilReq(idx)}
                                className="px-2.5 py-1 bg-[#2B2826] text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCivilIdx(null)}
                                className="p-1 text-[#7D6F6B]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81] shrink-0" />
                                <span className="text-[#2B2826] font-medium leading-relaxed">{req}</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCivilIdx(idx);
                                    setEditingCivilText(req);
                                  }}
                                  className="text-[#7D6F6B] hover:text-[#2B2826] p-1 rounded transition cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMasterCivilReq(idx)}
                                  className="text-[#7D6F6B] hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                  title="Eliminar"
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

                  {/* Requisitos Ceremonia Religiosa */}
                  <div className="p-5 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-serif text-base font-bold text-[#2B2826]">
                        Requisitos de Ceremonia Religiosa
                      </h4>
                      <span className="text-[11px] font-semibold text-[#A86B60] bg-[#F7EDEB] px-2 py-0.5 rounded-full">
                        {masterReligiousReqs.length}
                      </span>
                    </div>
                    <p className="text-xs text-[#7D6F6B] mb-3">
                      Requisitos eclesiásticos y trámites para matrimonio por la iglesia.
                    </p>

                    <form onSubmit={handleAddMasterReligiousReq} className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Nuevo requisito religioso (ej. Fe de bautismo actualizada)..."
                        value={newMasterReligiousReq}
                        onChange={e => setNewMasterReligiousReq(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-white text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#2B2826] hover:bg-[#1A1817] text-white text-xs font-semibold rounded-xl transition cursor-pointer shrink-0"
                      >
                        Agregar
                      </button>
                    </form>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 divide-y divide-[#EFE8E1]">
                      {masterReligiousReqs.map((req, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                          {editingReligiousIdx === idx ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingReligiousText}
                                onChange={e => setEditingReligiousText(e.target.value)}
                                className="flex-1 px-2.5 py-1 border border-[#EFE8E1] rounded-lg text-xs bg-white text-[#2B2826]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditReligiousReq(idx)}
                                className="px-2.5 py-1 bg-[#2B2826] text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingReligiousIdx(null)}
                                className="p-1 text-[#7D6F6B]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81] shrink-0" />
                                <span className="text-[#2B2826] font-medium leading-relaxed">{req}</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReligiousIdx(idx);
                                    setEditingReligiousText(req);
                                  }}
                                  className="text-[#7D6F6B] hover:text-[#2B2826] p-1 rounded transition cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMasterReligiousReq(idx)}
                                  className="text-[#7D6F6B] hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                  title="Eliminar"
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
            ) : (
              /* PANEL ENFOCADO: 2. PLANTILLA DEL EVENTO SELECCIONADO */
              <div className="bg-white rounded-3xl border border-[#EFE8E1] p-5 sm:p-7 shadow-2xs space-y-4">
                {/* Barra Superior de la Plantilla Activa */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2ECE7]">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2826]">
                        {activeOption.name}
                      </h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#F7EDEB] text-[#A86B60]">
                        {currentTasksWithIdx.length} actividades
                      </span>
                    </div>
                    <p className="text-xs text-[#7D6F6B] mt-1">
                      {activeOption.desc}
                    </p>
                  </div>

                  {/* Buscador interno y botón de agregar */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                      <input
                        type="text"
                        placeholder="Buscar actividad..."
                        value={templateSearchQuery}
                        onChange={e => setTemplateSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#EFE8E1] rounded-full text-xs text-[#2B2826] placeholder-[#7D6F6B]/70 focus:outline-none focus:border-[#C48B81]"
                      />
                      {templateSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTemplateSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#2B2826]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowQuickAddActivity(!showQuickAddActivity)}
                      className="px-4 py-2 bg-[#2B2826] hover:bg-[#1A1817] text-white rounded-full text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva actividad</span>
                    </button>
                  </div>
                </div>

                {/* Formulario Desplegable Rápido (Solo se abre con '+ Nueva actividad') */}
                {showQuickAddActivity && (
                  <form
                    onSubmit={e => {
                      handleAddMasterTask(e);
                      setShowQuickAddActivity(false);
                    }}
                    className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1] transition"
                  >
                    <div className="text-xs font-semibold text-[#2B2826] mb-2.5">
                      Agregar actividad a la plantilla de {activeOption.name}:
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <select
                        value={newMasterTask.category}
                        onChange={e => setNewMasterTask({ ...newMasterTask, category: e.target.value })}
                        className="sm:w-1/3 px-3 py-2 bg-white border border-[#EFE8E1] rounded-xl text-xs text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                      >
                        {phasesForActive.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Nombre de la actividad (ej. Degustación de banquete)..."
                        value={newMasterTask.title}
                        onChange={e => setNewMasterTask({ ...newMasterTask, title: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white border border-[#EFE8E1] rounded-xl text-xs text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowQuickAddActivity(false)}
                          className="px-3 py-2 bg-white border border-[#EFE8E1] text-[#7D6F6B] text-xs font-semibold rounded-xl hover:bg-[#F2ECE7] transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Fila de Resumen de Fases y Toggle de Expandir Todo */}
                <div className="flex items-center justify-between py-2 text-xs text-[#7D6F6B]">
                  <span>Fases mensuales organizadas cronológicamente:</span>
                  <button
                    type="button"
                    onClick={handleToggleAllPhases}
                    className="hover:text-[#2B2826] font-semibold underline decoration-[#C48B81]/40 transition cursor-pointer"
                  >
                    {allPhasesExpanded ? 'Colapsar todas' : 'Expandir todas'}
                  </button>
                </div>

                {/* Acordeones Mensuales por Fase */}
                <div className="space-y-3">
                  {phasesForActive.map((phase, phaseIdx) => {
                    const phaseTasks = currentTasksWithIdx.filter(({ item }) => {
                      const matchesCategory = (item.category || '').toLowerCase() === phase.toLowerCase();
                      if (!matchesCategory) return false;
                      if (!templateSearchQuery.trim()) return true;
                      return item.title.toLowerCase().includes(templateSearchQuery.toLowerCase());
                    });

                    // Si hay búsqueda activa y no hay coincidencias en esta fase, la ocultamos para despejar
                    if (templateSearchQuery.trim() && phaseTasks.length === 0) {
                      return null;
                    }

                    const isOpen = expandedPhases[phase] !== undefined ? expandedPhases[phase] : (allPhasesExpanded || phaseIdx === 0);

                    return (
                      <div
                        key={phase}
                        className="bg-white rounded-2xl border border-[#EFE8E1] overflow-hidden transition-all shadow-2xs"
                      >
                        <div
                          onClick={() => togglePhase(phase)}
                          className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[#FAF7F5] transition select-none bg-[#FAF7F5]/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-serif font-bold text-xs ${
                              isOpen ? 'bg-[#F7EDEB] text-[#A86B60]' : 'bg-[#F2ECE7] text-[#7D6F6B]'
                            }`}>
                              {phaseIdx + 1}
                            </div>
                            <h4 className="font-serif text-sm sm:text-base font-bold text-[#2B2826]">
                              {phase}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              phaseTasks.length > 0 ? 'bg-[#F7EDEB] text-[#A86B60]' : 'bg-[#F2ECE7] text-[#7D6F6B]'
                            }`}>
                              {phaseTasks.length} {phaseTasks.length === 1 ? 'actividad' : 'actividades'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-[#7D6F6B] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {isOpen && (
                          <div className="px-4 py-2 border-t border-[#F2ECE7] divide-y divide-[#F2ECE7]">
                            {phaseTasks.length === 0 ? (
                              <div className="py-3 text-center text-xs text-[#7D6F6B] italic">
                                No hay actividades en esta fase.
                              </div>
                            ) : (
                              phaseTasks.map(({ item, originalIdx }) => (
                                <div key={originalIdx} className="py-2.5 flex items-center justify-between gap-3 text-xs group">
                                  {editingTaskIdx === originalIdx ? (
                                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                                      <select
                                        value={editingTaskDraft.category}
                                        onChange={e => setEditingTaskDraft({ ...editingTaskDraft, category: e.target.value })}
                                        className="w-full sm:w-1/3 px-2.5 py-1.5 border border-[#EFE8E1] rounded-lg text-xs bg-[#FAF7F5] text-[#2B2826]"
                                      >
                                        {phasesForActive.map(cat => (
                                          <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        value={editingTaskDraft.title}
                                        onChange={e => setEditingTaskDraft({ ...editingTaskDraft, title: e.target.value })}
                                        className="w-full sm:flex-1 px-2.5 py-1.5 border border-[#EFE8E1] rounded-lg text-xs bg-[#FAF7F5] text-[#2B2826]"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEditMasterTask(originalIdx)}
                                          className="px-3 py-1 bg-[#2B2826] text-white rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingTaskIdx(null)}
                                          className="p-1 text-[#7D6F6B] hover:text-[#2B2826]"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81] shrink-0" />
                                        <span className="text-[#2B2826] font-medium leading-relaxed">
                                          {item.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditMasterTask(originalIdx)}
                                          className="text-[#7D6F6B] hover:text-[#2B2826] p-1.5 rounded-lg hover:bg-[#F2ECE7] transition cursor-pointer"
                                          title="Editar actividad"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveMasterTask(originalIdx)}
                                          className="text-[#7D6F6B] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                          title="Eliminar actividad"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* PESTAÑA: CATÁLOGOS */}
      {activeTab === 'catalogos' && user?.role === 'ADMINISTRADOR' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#EFE8E1]">
            <div className="flex items-center space-x-3.5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#332A28]">Catálogos Lazo Studio</h2>
                <p className="text-xs text-[#7D6F6B] mt-0.5">Especialidades de proveedores y paquetes de reuniones de novios.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('weddings')}
              className="text-xs font-semibold text-[#C48B81] hover:underline cursor-pointer"
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
                  className="px-4 py-2 bg-[#C48B81] text-white text-xs font-semibold rounded-xl hover:bg-[#A86B60] shadow-xs transition cursor-pointer"
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

              <form onSubmit={handleAddPackage} className="space-y-2.5 mt-4 mb-5 p-4 rounded-2xl bg-[#F9F6F2] border border-[#EFE8E1]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#A86B60]">Crear Nuevo Paquete</div>
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
                      className="w-full px-3 py-2 bg-[#C48B81] text-white text-xs font-semibold rounded-xl hover:bg-[#A86B60] shadow-xs transition cursor-pointer"
                    >
                      + Añadir Paquete
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Descripción breve (ej. 6 reuniones detalladas con equipo Lazo Studio)"
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
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#A86B60]">Editando Paquete</span>
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
                            className="px-4 py-1.5 rounded-xl bg-[#C48B81] text-white hover:bg-[#A86B60] text-xs font-semibold shadow-xs transition cursor-pointer"
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
                              <span className="text-xs font-semibold text-[#A86B60] bg-[#EFE2DF] px-2 py-0.5 rounded-full ml-1">
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
                                <span className="text-[#A86B60] font-bold">✓</span>
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
          <div className="flex items-center justify-between pb-4 border-b border-[#EFE8E1]">
            <div className="flex items-center space-x-3.5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#332A28]">Ajustes y Copias de Seguridad</h2>
                <p className="text-xs text-[#7D6F6B] mt-0.5">Respaldo general del sistema, restauración de base de datos y auditoría global.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('weddings')}
              className="text-xs font-semibold text-[#C48B81] hover:underline cursor-pointer"
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
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
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
              <div className="mt-4 p-3 rounded-xl bg-[#E5EDE6] border border-[#D5E2D7] text-[#384C3A] text-xs font-semibold">
                {restoreMsg}
              </div>
            )}
          </div>

          {/* Global Audit Trail */}
          <div className="luxury-card rounded-3xl p-6 border border-stone-200">
            <div className="flex items-center space-x-2 mb-4">
              <History className="w-5 h-5 text-stone-700" />
              <h3 className="font-serif text-xl font-bold text-stone-900">Bitácora Global de Actividad Lazo Studio</h3>
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
                      <td className="py-2.5 px-3 text-stone-600">{log.wedding_name || 'Global Lazo'}</td>
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
                  <div className="w-12 h-12 rounded-full bg-[#EFE2DF] text-[#A86B60] font-serif font-bold text-lg flex items-center justify-center border border-[#EFE8E1] shrink-0">
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
                    <label className="block text-xs font-bold text-stone-700 mb-1">Cargo / Función en el Equipo Lazo</label>
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
                  className="px-5 py-2 text-xs font-semibold bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar Evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A86B60]">Lazo Studio</span>
                <h3 className="font-serif text-2xl font-bold text-stone-900">Agregar Evento</h3>
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
              {/* Selector de Tipo de Evento */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tipo de Evento *</label>
                <select
                  value={formData.event_type}
                  onChange={e => {
                    const newType = e.target.value;
                    const autoName = getAutoEventName(newType, formData.partner_1_name, formData.partner_2_name);
                    setFormData({ ...formData, event_type: newType, name: autoName });
                  }}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs font-medium text-[#2B2826] bg-[#FAF8F5] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                >
                  <option value="Boda Completa">Boda Completa</option>
                  <option value="Boda Civil">Boda Civil</option>
                  <option value="Despedida de Soltera">Despedida de Soltera</option>
                  <option value="Baby Shower">Baby Shower</option>
                  <option value="Reunión / Fiesta Privada">Reunión / Fiesta Privada</option>
                  <option value="Bautizo / Primera Comunión">Bautizo / Primera Comunión</option>
                  <option value="XV Años / Aniversario">XV Años / Aniversario</option>
                  <option value="Otro Evento">Otro Evento</option>
                </select>
              </div>

              {/* Nombre del Evento */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre del Evento *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.event_type.includes('Boda')
                      ? 'Ej. Sofía & Alejandro'
                      : formData.event_type === 'Despedida de Soltera'
                      ? 'Ej. Despedida Mariana'
                      : formData.event_type === 'Baby Shower'
                      ? 'Ej. Baby Shower Mateo'
                      : 'Ej. Nombre del evento'
                  }
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
              </div>

              {/* Celebrantes / Novios */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {formData.event_type.toLowerCase().includes('boda')
                      ? 'Novia / Contrayente 1 *'
                      : 'Festejada(o) / Anfitrión(a) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.event_type.toLowerCase().includes('boda')
                        ? 'Sofía'
                        : 'Mariana'
                    }
                    value={formData.partner_1_name}
                    onChange={e => {
                      const newP1 = e.target.value;
                      const autoName = getAutoEventName(formData.event_type, newP1, formData.partner_2_name);
                      setFormData({ ...formData, partner_1_name: newP1, name: autoName });
                    }}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {formData.event_type.toLowerCase().includes('boda')
                      ? 'Novio / Contrayente 2'
                      : 'Acompañante / Co-anfitrión (opcional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      formData.event_type.toLowerCase().includes('boda')
                        ? 'Alejandro'
                        : 'Opcional'
                    }
                    value={formData.partner_2_name}
                    onChange={e => {
                      const newP2 = e.target.value;
                      const autoName = getAutoEventName(formData.event_type, formData.partner_1_name, newP2);
                      setFormData({ ...formData, partner_2_name: newP2, name: autoName });
                    }}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>

              {/* Fecha e Invitados Estimados */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fecha del Evento *</label>
                  <input
                    type="date"
                    required
                    value={formData.wedding_date}
                    onChange={e => setFormData({ ...formData, wedding_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Invitados Estimados</label>
                  <input
                    type="number"
                    value={formData.estimated_guests}
                    onChange={e => setFormData({ ...formData, estimated_guests: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>

              {/* Sedes / Ubicaciones */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {formData.event_type.toLowerCase().includes('boda')
                      ? 'Lugar Ceremonia'
                      : 'Sede Principal'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      formData.event_type.toLowerCase().includes('boda')
                        ? 'Parroquia o Templo'
                        : 'Salón o Terraza'
                    }
                    value={formData.ceremony_venue}
                    onChange={e => setFormData({ ...formData, ceremony_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {formData.event_type.toLowerCase().includes('boda')
                      ? 'Lugar Recepción'
                      : 'Sede Secundaria (opcional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      formData.event_type.toLowerCase().includes('boda')
                        ? 'Hacienda o Salón'
                        : 'Opcional'
                    }
                    value={formData.reception_venue}
                    onChange={e => setFormData({ ...formData, reception_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Paquete Contratado</label>
                <select
                  value={formData.package_type}
                  onChange={e => setFormData({ ...formData, package_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#FAF8F5] border border-[#EFE8E1] rounded-2xl">
                  <label
                    onClick={() => setFormData({ ...formData, checklist_option: 'full' })}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      formData.checklist_option === 'full'
                        ? 'bg-white border-[#C48B81] shadow-xs'
                        : 'bg-white/60 border-[#EFE8E1] hover:border-[#C48B81]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="checklist_option"
                      checked={formData.checklist_option === 'full'}
                      onChange={() => setFormData({ ...formData, checklist_option: 'full' })}
                      className="mt-0.5 accent-[#C48B81]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[#2B2826]">
                        Plantilla Completa Maestro
                      </div>
                      <div className="text-[11px] text-[#8A7E72] mt-0.5 leading-snug">
                        Carga Checklist General y etapas operativas.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setFormData({ ...formData, checklist_option: 'empty' })}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      formData.checklist_option === 'empty'
                        ? 'bg-white border-[#C48B81] shadow-xs'
                        : 'bg-white/60 border-[#EFE8E1] hover:border-[#C48B81]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="checklist_option"
                      checked={formData.checklist_option === 'empty'}
                      onChange={() => setFormData({ ...formData, checklist_option: 'empty' })}
                      className="mt-0.5 accent-[#C48B81]"
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
                  placeholder="Detalles de estilo, requerimientos o preferencias del evento..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
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
                  className="px-6 py-2.5 text-xs font-semibold bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Guardando...' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Evento */}
      {editingWedding && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A86B60]">Lazo Studio</span>
                <h3 className="font-serif text-2xl font-bold text-stone-900">Editar Datos del Evento</h3>
              </div>
              <button
                onClick={() => setEditingWedding(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditWedding} className="mt-6 space-y-4">
              {/* Tipo de Evento */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tipo de Evento *</label>
                <select
                  value={editFormData.event_type}
                  onChange={e => {
                    const newType = e.target.value;
                    const autoName = getAutoEventName(newType, editFormData.partner_1_name, editFormData.partner_2_name);
                    setEditFormData({ ...editFormData, event_type: newType, name: autoName });
                  }}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs font-medium text-[#2B2826] bg-[#FAF8F5] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                >
                  <option value="Boda Completa">Boda Completa</option>
                  <option value="Boda Civil">Boda Civil</option>
                  <option value="Despedida de Soltera">Despedida de Soltera</option>
                  <option value="Baby Shower">Baby Shower</option>
                  <option value="Reunión / Fiesta Privada">Reunión / Fiesta Privada</option>
                  <option value="Bautizo / Primera Comunión">Bautizo / Primera Comunión</option>
                  <option value="XV Años / Aniversario">XV Años / Aniversario</option>
                  <option value="Otro Evento">Otro Evento</option>
                </select>
              </div>

              {/* Nombre del Evento */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre del Evento *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
              </div>

              {/* Celebrantes / Novios */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {editFormData.event_type.toLowerCase().includes('boda')
                      ? 'Novia / Contrayente 1 *'
                      : 'Festejada(o) / Anfitrión(a) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.partner_1_name}
                    onChange={e => {
                      const newP1 = e.target.value;
                      const autoName = getAutoEventName(editFormData.event_type, newP1, editFormData.partner_2_name);
                      setEditFormData({ ...editFormData, partner_1_name: newP1, name: autoName });
                    }}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {editFormData.event_type.toLowerCase().includes('boda')
                      ? 'Novio / Contrayente 2'
                      : 'Acompañante / Co-anfitrión (opcional)'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.partner_2_name}
                    onChange={e => {
                      const newP2 = e.target.value;
                      const autoName = getAutoEventName(editFormData.event_type, editFormData.partner_1_name, newP2);
                      setEditFormData({ ...editFormData, partner_2_name: newP2, name: autoName });
                    }}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>

              {/* Fecha e Invitados Estimados */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fecha del Evento *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.wedding_date}
                    onChange={e => setEditFormData({ ...editFormData, wedding_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Invitados Estimados</label>
                  <input
                    type="number"
                    value={editFormData.estimated_guests}
                    onChange={e => setEditFormData({ ...editFormData, estimated_guests: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>

              {/* Sedes / Ubicaciones */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {editFormData.event_type.toLowerCase().includes('boda')
                      ? 'Lugar Ceremonia'
                      : 'Sede Principal'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.ceremony_venue}
                    onChange={e => setEditFormData({ ...editFormData, ceremony_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {editFormData.event_type.toLowerCase().includes('boda')
                      ? 'Lugar Recepción'
                      : 'Sede Secundaria (opcional)'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.reception_venue}
                    onChange={e => setEditFormData({ ...editFormData, reception_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Hora Inicio / Ceremonia</label>
                  <input
                    type="time"
                    value={editFormData.ceremony_time}
                    onChange={e => setEditFormData({ ...editFormData, ceremony_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Hora Recepción</label>
                  <input
                    type="time"
                    value={editFormData.reception_time}
                    onChange={e => setEditFormData({ ...editFormData, reception_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>

              {/* Paquete y Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Paquete Contratado</label>
                  <select
                    value={editFormData.package_type}
                    onChange={e => setEditFormData({ ...editFormData, package_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  >
                    {meetingPackages.length > 0 ? (
                      meetingPackages.map(p => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Esencial">Esencial</option>
                        <option value="Integral">Integral</option>
                        <option value="Luxury Exclusivo">Luxury Exclusivo</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Estado del Evento</label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  >
                    <option value="PLANNING">En Planeación</option>
                    <option value="UPCOMING">Próximo</option>
                    <option value="COMPLETED">Completado</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Notas del Evento</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingWedding(null)}
                  className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 text-xs font-semibold bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
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
