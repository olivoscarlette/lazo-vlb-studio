import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon, Clock, MapPin, User,
  Plus, X, AlertTriangle, Filter, ChevronLeft,
  ChevronRight, Sparkles, Building2, ExternalLink, Trash2, Edit2,
  Copy, Check, Link2, CheckCircle2, CheckSquare, Square, Search,
  ListTodo, Video, CalendarDays, Eye, Tag, AlertCircle, Menu, ChevronDown,
  ShieldCheck, Users, Settings2
} from 'lucide-react';

export interface CalendarEventItem {
  id: string;
  wedding_id?: string | null;
  wedding_name?: string | null;
  title: string;
  event_type: 'PLANNING' | 'CITA_EXTERNA' | 'BODA' | 'OPEN_HOUSE' | 'SERVICIO' | 'PAPELERIA' | 'OTRO' | 'EVENTO';
  date: string;
  time: string;
  end_time?: string | null;
  location?: string | null;
  responsible?: string | null;
  notes?: string | null;
  checklist?: string | { id: string; text: string; done: boolean }[];
  status?: string | null;
  accepted_by?: any[];
  meet_url?: string | null;
  source?: 'MEETING' | 'CALENDAR_EVENT' | 'WEDDING_DAY';
}

export const CALENDAR_CATEGORIES = [
  {
    type: 'PLANNING',
    label: 'Cita planning',
    color: '#C48B81',
    dotColor: '#C48B81',
    icon: '🌸',
    description: 'Citas y reuniones de seguimiento de planeación con novios'
  },
  {
    type: 'CITA_EXTERNA',
    label: 'Cita externa',
    color: '#2563EB',
    dotColor: '#2563EB',
    icon: '💼',
    description: 'Citas externas, visitas a locaciones, degustaciones y proveedores'
  },
  {
    type: 'BODA',
    label: 'Boda',
    color: '#059669',
    dotColor: '#059669',
    icon: '💍',
    description: 'Día oficial de la boda (agregadas automáticamente desde Bodas)'
  },
  {
    type: 'OPEN_HOUSE',
    label: 'Open house',
    color: '#7C3AED',
    dotColor: '#7C3AED',
    icon: '🏛️',
    description: 'Open house de venues, showrooms y presentaciones'
  },
  {
    type: 'SERVICIO',
    label: 'Servicios',
    color: '#D97706',
    dotColor: '#D97706',
    icon: '🍸',
    description: 'Servicios'
  },
  {
    type: 'PAPELERIA',
    label: 'Papelería',
    color: '#E11D48',
    dotColor: '#E11D48',
    icon: '💌',
    description: 'Entregas, revisiones y pruebas de papelería nupcial'
  },
  {
    type: 'OTRO',
    label: 'Otro',
    color: '#78716C',
    dotColor: '#78716C',
    icon: '📌',
    description: 'Otros eventos y actividades del estudio'
  }
];

export interface CalendarTaskItem {
  id: string;
  title: string;
  notes?: string | null;
  due_date?: string | null;
  location?: string | null;
  completed: number;
  created_at: string;
}

// 1-Click Google Calendar URL Generator
export const createGoogleCalendarUrl = (event: CalendarEventItem): string => {
  const cleanDate = (event.date || '').replace(/[^0-9]/g, '');
  let start = cleanDate;
  let end = cleanDate;

  if (event.time) {
    const cleanTime = event.time.replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4) + '00';
    start = `${cleanDate}T${cleanTime}`;
    if (event.end_time) {
      const cleanEnd = event.end_time.replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4) + '00';
      end = `${cleanDate}T${cleanEnd}`;
    } else {
      const [h, m] = event.time.split(':').map(Number);
      const endH = String((h + 1) % 24).padStart(2, '0');
      end = `${cleanDate}T${endH}${String(m || 0).padStart(2, '0')}00`;
    }
  }

  const details = [
    event.wedding_name ? `Boda: ${event.wedding_name}` : '',
    event.responsible ? `Responsable: ${event.responsible}` : '',
    event.notes ? `Notas: ${event.notes}` : '',
    event.meet_url ? `Enlace Google Meet: ${event.meet_url}` : '',
    'Organizado en LAZO — VLB Studio'
  ].filter(Boolean).join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details,
    location: event.location || (event.meet_url || 'VLB Studio')
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

interface CalendarioModuleProps {
  onToggleSidebar?: () => void;
}

export const CalendarioModule: React.FC<CalendarioModuleProps> = ({ onToggleSidebar }) => {
  const { token, user, assignedWeddings, setCurrentWedding } = useAuth();

  // Calendar events & tasks
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [tasks, setTasks] = useState<CalendarTaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Active view
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [selectedWeddingFilter, setSelectedWeddingFilter] = useState<string>('TODAS');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState<string | null>(null);

  // Allowed categories returned by backend based on role
  const [allowedCategories, setAllowedCategories] = useState<string[]>([
    'PLANNING', 'CITA_EXTERNA', 'BODA', 'OPEN_HOUSE', 'SERVICIO', 'PAPELERIA', 'OTRO'
  ]);

  // Event category toggles (Google Calendar style color checkboxes)
  const [activeCalendars, setActiveCalendars] = useState<Record<string, boolean>>({
    PLANNING: true,
    CITA_EXTERNA: true,
    BODA: true,
    OPEN_HOUSE: true,
    SERVICIO: true,
    PAPELERIA: true,
    OTRO: true
  });

  // Team visibility permissions modal (Admin only)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    COORDINADOR: ['PLANNING', 'CITA_EXTERNA', 'BODA', 'OPEN_HOUSE', 'SERVICIO', 'PAPELERIA', 'OTRO'],
    STAFF: ['SERVICIO'],
    NOVIOS: ['PLANNING', 'BODA']
  });
  const [teamUsersList, setTeamUsersList] = useState<any[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsSuccess, setPermissionsSuccess] = useState(false);

  // Tasks filter
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showTaskAddForm, setShowTaskAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskLocation, setNewTaskLocation] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Google Calendar Sync Modal
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [copiedIcsLink, setCopiedIcsLink] = useState(false);

  // Add / Edit Event Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'CITA_EXTERNA' as CalendarEventItem['event_type'],
    date: new Date().toISOString().split('T')[0],
    time: '11:00',
    end_time: '12:00',
    location: '',
    responsible: user?.name || '',
    notes: '',
    wedding_id: '',
    force_conflict: false,
    checklist: [] as { id: string; text: string; done: boolean }[]
  });
  const [newChecklistText, setNewChecklistText] = useState('');
  const [formError, setFormError] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Fetch unified studio calendar & tasks
  const fetchEventsAndTasks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [calRes, taskRes] = await Promise.all([
        fetch('/api/calendar', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/calendar/tasks', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (calRes.ok) {
        const calData = await calRes.json();
        setEvents(calData.events || []);
        if (calData.allowedTypes && Array.isArray(calData.allowedTypes)) {
          setAllowedCategories(calData.allowedTypes);
          setActiveCalendars(prev => {
            const next = { ...prev };
            CALENDAR_CATEGORIES.forEach(cat => {
              if (!calData.allowedTypes.includes(cat.type)) {
                next[cat.type] = false;
              } else if (prev[cat.type] === undefined) {
                next[cat.type] = true;
              }
            });
            return next;
          });
        }
      }
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsAndTasks();
  }, [token]);

  // Fetch visibility permissions (Admin)
  const fetchPermissions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/calendar/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.permissions) {
          setRolePermissions(data.permissions);
        }
        if (data.teamUsers) {
          setTeamUsersList(data.teamUsers);
        }
      }
    } catch (err) {
      console.error('Error fetching calendar permissions:', err);
    }
  };

  // Save visibility permissions (Admin)
  const handleSavePermissions = async () => {
    if (!token) return;
    setSavingPermissions(true);
    setPermissionsSuccess(false);
    try {
      const res = await fetch('/api/calendar/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: rolePermissions })
      });
      if (res.ok) {
        setPermissionsSuccess(true);
        setTimeout(() => {
          setPermissionsSuccess(false);
          setShowPermissionsModal(false);
        }, 1200);
        await fetchEventsAndTasks();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar los permisos del calendario.');
      }
    } catch (err: any) {
      alert('Error de conexión al guardar los permisos.');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Conflict detector for event form
  const checkClientConflict = (date: string, time: string, excludeId?: string | null) => {
    if (!date || !time) {
      setConflictWarning(null);
      return;
    }
    const [h, m] = time.split(':').map(Number);
    const targetMin = h * 60 + (m || 0);

    const onDate = events.filter(e => e.date === date && e.id !== excludeId);
    for (const item of onDate) {
      if (!item.time) continue;
      const [ih, im] = item.time.split(':').map(Number);
      const itemMin = ih * 60 + (im || 0);
      if (Math.abs(targetMin - itemMin) < 45) {
        setConflictWarning(`⚠️ Alerta de Empalme: Ya existe "${item.title}" a las ${item.time} hrs (${item.event_type}).`);
        return;
      }
    }
    setConflictWarning(null);
  };

  const handleOpenAddEvent = (dayStr?: string) => {
    const targetDate = dayStr || new Date().toISOString().split('T')[0];
    setEditingEventId(null);
    setFormData({
      title: '',
      event_type: 'CITA_EXTERNA',
      date: targetDate,
      time: '11:00',
      end_time: '12:00',
      location: '',
      responsible: user?.name || '',
      notes: '',
      wedding_id: '',
      force_conflict: false,
      checklist: []
    });
    setNewChecklistText('');
    setConflictWarning(null);
    setFormError('');
    checkClientConflict(targetDate, '11:00', null);
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (evt: CalendarEventItem) => {
    if (evt.source !== 'CALENDAR_EVENT') {
      alert('Las reuniones de planning y bodas se editan desde sus respectivos módulos.');
      return;
    }
    let parsedChecklist: { id: string; text: string; done: boolean }[] = [];
    if (Array.isArray(evt.checklist)) {
      parsedChecklist = evt.checklist;
    } else if (typeof evt.checklist === 'string') {
      try {
        parsedChecklist = JSON.parse(evt.checklist);
      } catch {}
    }

    setEditingEventId(evt.id);
    setFormData({
      title: evt.title,
      event_type: evt.event_type,
      date: evt.date,
      time: evt.time,
      end_time: evt.end_time || '',
      location: evt.location || '',
      responsible: evt.responsible || user?.name || '',
      notes: evt.notes || '',
      wedding_id: evt.wedding_id || '',
      force_conflict: false,
      checklist: parsedChecklist
    });
    setNewChecklistText('');
    setConflictWarning(null);
    setFormError('');
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('¿Deseas eliminar este evento del Calendario General?')) return;
    try {
      const res = await fetch(`/api/calendar/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEventsAndTasks();
      }
    } catch {}
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const url = editingEventId ? `/api/calendar/${editingEventId}` : '/api/calendar';
      const method = editingEventId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.conflict) {
          setFormError(data.message + ' Activa la casilla "Confirmar empalme" para guardar de todos modos.');
          return;
        }
        throw new Error(data.error || 'Error al guardar');
      }

      setShowEventModal(false);
      fetchEventsAndTasks();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Task Handlers (Google Tasks style)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch('/api/calendar/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          due_date: newTaskDueDate || null,
          location: newTaskLocation.trim() || null,
          notes: newTaskNotes.trim() || null
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDueDate('');
        setNewTaskLocation('');
        setNewTaskNotes('');
        setShowTaskAddForm(false);
        fetchEventsAndTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTask = async (task: CalendarTaskItem) => {
    const newCompleted = task.completed ? 0 : 1;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
    try {
      await fetch(`/api/calendar/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: newCompleted })
      });
    } catch (err) {
      fetchEventsAndTasks();
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta tarea de la lista?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/calendar/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      fetchEventsAndTasks();
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Category filter
      if (!activeCalendars[evt.event_type]) return false;
      // Wedding filter
      if (selectedWeddingFilter !== 'TODAS' && evt.wedding_id !== selectedWeddingFilter) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = (evt.title || '').toLowerCase().includes(q);
        const inLoc = (evt.location || '').toLowerCase().includes(q);
        const inResp = (evt.responsible || '').toLowerCase().includes(q);
        const inNotes = (evt.notes || '').toLowerCase().includes(q);
        if (!inTitle && !inLoc && !inResp && !inNotes) return false;
      }
      return true;
    });
  }, [events, activeCalendars, selectedWeddingFilter, search]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (taskFilter === 'pending' && t.completed) return false;
      if (taskFilter === 'completed' && !t.completed) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = (t.title || '').toLowerCase().includes(q);
        const inLoc = (t.location || '').toLowerCase().includes(q);
        const inNotes = (t.notes || '').toLowerCase().includes(q);
        if (!inTitle && !inLoc && !inNotes) return false;
      }
      return true;
    });
  }, [tasks, taskFilter, search]);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month Grid Calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month filler days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthDate = new Date(year, month - 1, d);
      const dateStr = prevMonthDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currentMonthDate = new Date(year, month, d);
      const dateStr = currentMonthDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month filler days (always fill 42 grid cells / 6 full weeks like Google Calendar)
    const totalSlots = 42;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextMonthDate = new Date(year, month + 1, d);
      const dateStr = nextMonthDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  // Week View Calculations
  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    const dayOfWeek = current.getDay(); // 0 is Sun
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    const week: { dateStr: string; dateObj: Date; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      week.push({
        dateStr,
        dateObj: d,
        isToday: dateStr === todayStr
      });
    }
    return week;
  }, [currentDate]);

  // Color helper by type
  const getBadgeColors = (type: CalendarEventItem['event_type']) => {
    switch (type) {
      case 'PLANNING':
        return {
          bg: 'bg-[#FBF4F3]',
          border: 'border-[#EAD2D0]',
          text: 'text-[#A86B60]',
          dot: 'bg-[#C48B81]',
          label: 'Cita planning'
        };
      case 'BODA':
      case 'EVENTO':
        return {
          bg: 'bg-[#2B2826] text-white',
          border: 'border-[#2B2826]',
          text: 'text-white',
          dot: 'bg-[#C48B81]',
          label: 'Boda'
        };
      case 'CITA_EXTERNA':
        return {
          bg: 'bg-[#E5EDE6]',
          border: 'border-[#D5E2D7]',
          text: 'text-[#384C3A]',
          dot: 'bg-[#384C3A]',
          label: 'Cita externa'
        };
      case 'OPEN_HOUSE':
        return {
          bg: 'bg-[#F5EFEB]',
          border: 'border-[#EFE8E1]',
          text: 'text-[#7D6F6B]',
          dot: 'bg-[#A86B60]',
          label: 'Open house'
        };
      case 'SERVICIO':
        return {
          bg: 'bg-[#FAF4F0]',
          border: 'border-[#EFE8E1]',
          text: 'text-[#8A6D5E]',
          dot: 'bg-[#C48B81]',
          label: 'Servicios'
        };
      case 'PAPELERIA':
        return {
          bg: 'bg-[#F7EDEB]',
          border: 'border-[#ECD9D5]',
          text: 'text-[#A86B60]',
          dot: 'bg-[#C48B81]',
          label: 'Papelería'
        };
      default:
        return {
          bg: 'bg-stone-100',
          border: 'border-stone-200',
          text: 'text-stone-800',
          dot: 'bg-[#78716C]',
          label: 'Otro'
        };
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const fullDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Google Calendar Mobile Month Carousel
  const monthCarousel = useMemo(() => {
    const currentY = currentDate.getFullYear();
    const currentM = currentDate.getMonth();
    const items: { label: string; year: number; month: number; isYearSeparator?: boolean }[] = [];
    const shortNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    for (let offset = -2; offset <= 13; offset++) {
      const d = new Date(currentY, currentM + offset, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();

      if (mIdx === 0 && offset !== -2) {
        items.push({ label: `${y}`, year: y, month: 0, isYearSeparator: true });
      }
      items.push({ label: shortNames[mIdx], year: y, month: mIdx });
    }
    return items;
  }, [currentDate]);

  const getMobileChipColor = (type: string) => {
    switch (type) {
      case 'PLANNING':
        return 'bg-[#C48B81] text-white';
      case 'BODA':
      case 'EVENTO':
        return 'bg-[#059669] text-white';
      case 'CITA_EXTERNA':
        return 'bg-[#2563EB] text-white';
      case 'SERVICIO':
      case 'SERVICIOS':
        return 'bg-[#D97706] text-white';
      case 'OPEN_HOUSE':
        return 'bg-[#7C3AED] text-white';
      case 'PAPELERIA':
        return 'bg-[#E11D48] text-white';
      default:
        return 'bg-[#78716C] text-white';
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* 1. DESKTOP VIEW (GOOGLE CALENDAR WEB) */}
      <div className="hidden md:flex flex-col h-full bg-[#FFFFFF] rounded-2xl border border-[#EFE8E1] shadow-xs overflow-hidden">
        {/* GOOGLE CALENDAR HEADER */}
        <header className="px-5 py-3.5 border-b border-[#EFE8E1] bg-[#FCFAF7] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Today, arrows, Month/Year */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center text-[#C48B81]">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#332A28] leading-tight flex items-center space-x-2">
                <span>{monthNames[month]} {year}</span>
              </h2>
              <span className="text-[11px] text-[#7D6F6B] font-medium">
                Calendario General · VLB Studio
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 pl-2">
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#EFE8E1] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[#332A28] transition shadow-2xs cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg border border-[#EFE8E1] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[#7D6F6B] hover:text-[#332A28] transition shadow-2xs cursor-pointer"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg border border-[#EFE8E1] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[#7D6F6B] hover:text-[#332A28] transition shadow-2xs cursor-pointer"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Search bar */}
        <div className="relative flex-1 max-w-xs min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
          <input
            type="text"
            placeholder="Buscar eventos o tareas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-[#FFFFFF] border border-[#EFE8E1] rounded-lg text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Right: View switch (Mes, Semana, Agenda), Sync & Create Event */}
        <div className="flex items-center space-x-1.5">
          {/* Segmented control for Views */}
          <div className="inline-flex p-0.5 rounded-lg bg-[#FAF8F5] border border-[#EFE8E1]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition ${
                viewMode === 'month'
                  ? 'bg-[#FFFFFF] text-[#C48B81] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition ${
                viewMode === 'week'
                  ? 'bg-[#FFFFFF] text-[#C48B81] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition ${
                viewMode === 'agenda'
                  ? 'bg-[#FFFFFF] text-[#C48B81] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              Agenda
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => setShowGoogleSyncModal(true)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-[#EFE8E1] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-xs font-semibold text-[#332A28] transition shadow-2xs cursor-pointer"
            title="Vincular con Google Calendar / iCal"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="hidden md:inline">Google Calendar</span>
          </button>

          {/* Create Button (Google Style) */}
          <button
            onClick={() => handleOpenAddEvent()}
            className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-[#C48B81] hover:bg-[#85534A] text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Evento</span>
          </button>
        </div>
      </header>

      {/* GOOGLE CALENDAR MAIN LAYOUT (Left Sidebar + Calendar Grid) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Mini Month Calendar + Google Tasks Lists + Category Filters */}
        <aside className="w-72 border-r border-[#EFE8E1] bg-[#FCFAF7] p-4 flex flex-col space-y-6 overflow-y-auto shrink-0 hidden lg:flex">
          {/* MINI CALENDAR (Google Calendar style) */}
          <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#EFE8E1] shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#332A28]">
                {monthNames[month]} {year}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 text-[#7D6F6B] hover:text-[#332A28] rounded hover:bg-[#FAF8F5]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 text-[#7D6F6B] hover:text-[#332A28] rounded hover:bg-[#FAF8F5]"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#7D6F6B] font-semibold mb-1">
              {dayNames.map(d => (
                <div key={d}>{d[0]}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {calendarDays.slice(0, 35).map((d, i) => {
                const hasEvent = events.some(e => e.date === d.dateStr);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentDate(new Date(d.dateStr + 'T12:00:00'));
                    }}
                    className={`h-6 w-6 mx-auto rounded-full flex items-center justify-center transition cursor-pointer relative ${
                      d.isToday
                        ? 'bg-[#C48B81] text-white font-bold'
                        : d.isCurrentMonth
                        ? 'text-[#332A28] hover:bg-[#F3ECE2]'
                        : 'text-stone-300'
                    }`}
                  >
                    <span>{d.dayNum}</span>
                    {hasEvent && !d.isToday && (
                      <span className="w-1 h-1 rounded-full bg-[#C48B81] absolute bottom-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MIS LISTAS Y TAREAS (Google Tasks Style) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ListTodo className="w-4 h-4 text-[#C48B81]" />
                <h3 className="text-xs font-bold text-[#332A28] uppercase tracking-wider">
                  Listas & Tareas
                </h3>
              </div>
              <button
                onClick={() => setShowTaskAddForm(prev => !prev)}
                className="text-[11px] font-semibold text-[#C48B81] hover:text-[#85534A] flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Nueva</span>
              </button>
            </div>

            {/* Quick Task Add Form */}
            {showTaskAddForm && (
              <form onSubmit={handleCreateTask} className="bg-[#FFFFFF] p-3 rounded-xl border border-[#EFE8E1] shadow-2xs space-y-2">
                <input
                  type="text"
                  placeholder="Título de la tarea o pendiente..."
                  required
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-[#EFE8E1] rounded-lg focus:outline-none focus:border-[#C48B81]"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    className="w-full text-[11px] px-2 py-1 border border-[#EFE8E1] rounded-lg text-[#7D6F6B]"
                    title="Fecha límite"
                  />
                  <input
                    type="text"
                    placeholder="Ubicación (opcional)"
                    value={newTaskLocation}
                    onChange={e => setNewTaskLocation(e.target.value)}
                    className="w-full text-[11px] px-2 py-1 border border-[#EFE8E1] rounded-lg"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                  className="w-full text-[11px] px-2 py-1 border border-[#EFE8E1] rounded-lg focus:outline-none"
                />
                <div className="flex justify-end space-x-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTaskAddForm(false)}
                    className="px-2.5 py-1 text-[11px] text-[#7D6F6B] hover:text-[#332A28]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingTask}
                    className="px-3 py-1 text-[11px] font-semibold bg-[#C48B81] text-white rounded-lg hover:bg-[#85534A]"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {/* Tasks Filter Pills */}
            <div className="flex items-center space-x-1 text-[10px]">
              <button
                onClick={() => setTaskFilter('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  taskFilter === 'all' ? 'bg-[#C48B81] text-white' : 'text-[#7D6F6B] hover:bg-[#FAF8F5]'
                }`}
              >
                Todas ({tasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('pending')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  taskFilter === 'pending' ? 'bg-[#C48B81] text-white' : 'text-[#7D6F6B] hover:bg-[#FAF8F5]'
                }`}
              >
                Pendientes ({tasks.filter(t => !t.completed).length})
              </button>
              <button
                onClick={() => setTaskFilter('completed')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  taskFilter === 'completed' ? 'bg-[#C48B81] text-white' : 'text-[#7D6F6B] hover:bg-[#FAF8F5]'
                }`}
              >
                Hechas ({tasks.filter(t => t.completed).length})
              </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-3 text-[11px] text-[#7D6F6B]">
                  No hay tareas en esta vista
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div
                    key={task.id}
                    className="group bg-[#FFFFFF] p-2.5 rounded-xl border border-[#EFE8E1] hover:border-[#C48B81]/40 transition text-xs shadow-2xs flex items-start space-x-2"
                  >
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 text-[#C48B81] shrink-0 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 group-hover:text-[#C48B81]" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${task.completed ? 'line-through text-stone-400' : 'text-[#332A28]'}`}>
                        {task.title}
                      </div>
                      {task.due_date && (
                        <div className="text-[10px] text-[#7D6F6B] flex items-center space-x-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{task.due_date}</span>
                        </div>
                      )}
                      {task.location && (
                        <div className="text-[10px] text-[#2563EB] flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(task.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:underline"
                          >
                            {task.location}
                          </a>
                        </div>
                      )}
                      {task.notes && (
                        <div className="text-[10px] text-[#7D6F6B] mt-0.5 italic line-clamp-1">
                          {task.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LISTAS DE CALENDARIO (Categories Filter with Color Checkboxes) */}
          <div className="space-y-2 pt-2 border-t border-[#EFE8E1]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#332A28] uppercase tracking-wider">
                Listas de Calendario
              </h3>
              {user?.role === 'ADMINISTRADOR' && (
                <button
                  onClick={() => {
                    fetchPermissions();
                    setShowPermissionsModal(true);
                  }}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg border border-[#EFE8E1] bg-white text-[#C48B81] hover:bg-[#FAF8F5] text-[10px] font-bold shadow-2xs transition cursor-pointer"
                  title="Configurar qué listas ve cada rol del equipo"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Permisos</span>
                </button>
              )}
            </div>

            {/* Wedding Filter Dropdown */}
            <div className="mb-2">
              <label className="block text-[10px] font-semibold text-[#7D6F6B] uppercase mb-1">
                Filtrar por Boda
              </label>
              <select
                value={selectedWeddingFilter}
                onChange={e => setSelectedWeddingFilter(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-lg text-[#332A28] focus:outline-none"
              >
                <option value="TODAS">🌟 Todas las Bodas</option>
                {assignedWeddings.map(w => (
                  <option key={w.id} value={w.id}>
                    💍 {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs">
              {CALENDAR_CATEGORIES.filter(cat => allowedCategories.includes(cat.type)).map(cat => {
                const checked = !!activeCalendars[cat.type];
                return (
                  <label
                    key={cat.type}
                    className="flex items-center space-x-2 text-[#332A28] cursor-pointer hover:bg-[#FAF8F5] p-1.5 rounded-lg transition"
                    title={cat.description}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setActiveCalendars(prev => ({ ...prev, [cat.type]: !prev[cat.type] }))
                      }
                      className="rounded text-[#C48B81] focus:ring-[#C48B81]"
                      style={{ accentColor: cat.color }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN CALENDAR CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#FFFFFF]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12 text-[#7D6F6B]">
              <div className="w-8 h-8 rounded-full border-2 border-[#EFE8E1] border-t-[#C48B81] animate-spin mr-3" />
              <span className="text-sm font-medium">Cargando eventos del calendario...</span>
            </div>
          ) : viewMode === 'month' ? (
            /* MONTH VIEW (GOOGLE CALENDAR GRID) */
            <div className="flex-1 flex flex-col min-w-[700px]">
              {/* Day header */}
              <div className="grid grid-cols-7 border-b border-[#EFE8E1] bg-[#FCFAF7] text-center text-xs font-bold text-[#7D6F6B] py-2">
                {fullDayNames.map(day => (
                  <div key={day} className="uppercase tracking-wider text-[11px]">
                    {day}
                  </div>
                ))}
              </div>

              {/* 35 or 42 grid cells */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-[#EFE8E1] border-b border-[#EFE8E1]">
                {calendarDays.map((d, idx) => {
                  const dayEvents = filteredEvents.filter(e => e.date === d.dateStr);
                  const dayTasks = tasks.filter(t => t.due_date === d.dateStr && !t.completed);

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] p-1.5 flex flex-col transition relative group ${
                        !d.isCurrentMonth
                          ? 'bg-[#FAF8F5]/60 text-stone-300'
                          : 'bg-[#FFFFFF] hover:bg-[#FCFAF7]'
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-semibold inline-flex items-center justify-center rounded-full ${
                            d.isToday
                              ? 'w-6 h-6 bg-[#C48B81] text-white font-bold shadow-2xs'
                              : d.isCurrentMonth
                              ? 'text-[#332A28] px-1'
                              : 'text-stone-300 px-1'
                          }`}
                        >
                          {d.dayNum}
                        </span>

                        {/* Quick Add Button on Hover */}
                        <button
                          onClick={() => handleOpenAddEvent(d.dateStr)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#FAF8F5] text-stone-400 hover:text-[#C48B81] transition cursor-pointer"
                          title="Añadir evento este día"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Events and Tasks in this Day */}
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-24">
                        {/* Event Pills */}
                        {dayEvents.map(evt => {
                          const badge = getBadgeColors(evt.event_type);
                          return (
                            <div
                              key={evt.id}
                              onClick={() => {
                                if (evt.source === 'CALENDAR_EVENT') {
                                  handleOpenEditEvent(evt);
                                } else if (evt.wedding_id) {
                                  const wed = assignedWeddings.find(w => w.id === evt.wedding_id);
                                  if (wed) setCurrentWedding(wed);
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium border truncate cursor-pointer transition shadow-2xs flex items-center space-x-1 ${badge.bg} ${badge.border} ${badge.text}`}
                              title={`${evt.time || ''} ${evt.title} ${evt.location ? `· ${evt.location}` : ''}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                              {evt.time && <span className="font-bold shrink-0">{evt.time}</span>}
                              <span className="truncate">{evt.title}</span>
                              {evt.location && <MapPin className="w-2.5 h-2.5 shrink-0 opacity-60 ml-auto" />}
                              {evt.meet_url && <Video className="w-2.5 h-2.5 shrink-0 text-blue-600 ml-auto" />}
                            </div>
                          );
                        })}

                        {/* Day Tasks with Due Date */}
                        {dayTasks.map(t => (
                          <div
                            key={t.id}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F5EFEB] border border-[#EFE8E1] text-[#7D6F6B] truncate flex items-center space-x-1"
                            title={`Tarea pendiente: ${t.title}`}
                          >
                            <CheckSquare className="w-2.5 h-2.5 text-[#A86B60] shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'week' ? (
            /* WEEK VIEW */
            <div className="flex-1 flex flex-col p-4">
              <div className="grid grid-cols-7 gap-3 h-full">
                {weekDays.map(day => {
                  const dayEvents = filteredEvents.filter(e => e.date === day.dateStr);
                  const dayTasks = tasks.filter(t => t.due_date === day.dateStr);

                  return (
                    <div
                      key={day.dateStr}
                      className="flex flex-col bg-[#FCFAF7] rounded-xl border border-[#EFE8E1] overflow-hidden"
                    >
                      {/* Week Day Header */}
                      <div
                        className={`p-2.5 text-center border-b border-[#EFE8E1] ${
                          day.isToday ? 'bg-[#C48B81] text-white' : 'bg-[#FFFFFF] text-[#332A28]'
                        }`}
                      >
                        <div className="text-[11px] font-semibold uppercase">
                          {fullDayNames[day.dateObj.getDay()]}
                        </div>
                        <div className="text-base font-bold">
                          {day.dateObj.getDate()} {monthNames[day.dateObj.getMonth()].slice(0, 3)}
                        </div>
                      </div>

                      {/* Day body */}
                      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                        <button
                          onClick={() => handleOpenAddEvent(day.dateStr)}
                          className="w-full py-1 text-center border border-dashed border-[#EFE8E1] rounded-lg text-[11px] text-[#7D6F6B] hover:text-[#C48B81] hover:border-[#C48B81] transition flex items-center justify-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Añadir</span>
                        </button>

                        {dayEvents.map(evt => {
                          const badge = getBadgeColors(evt.event_type);
                          return (
                            <div
                              key={evt.id}
                              onClick={() => {
                                if (evt.source === 'CALENDAR_EVENT') handleOpenEditEvent(evt);
                              }}
                              className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer space-y-1 ${badge.bg} ${badge.border} ${badge.text}`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span>{evt.time || 'Todo el día'}</span>
                                <span className="text-[10px] uppercase font-semibold">{badge.label}</span>
                              </div>
                              <div className="text-xs font-bold leading-tight text-[#332A28]">
                                {evt.title}
                              </div>
                              {evt.location && (
                                <div className="text-[10px] text-[#2563EB] flex items-center space-x-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{evt.location}</span>
                                </div>
                              )}
                              {evt.meet_url && (
                                <a
                                  href={evt.meet_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-[10px] text-blue-700 font-semibold flex items-center space-x-1 hover:underline"
                                >
                                  <Video className="w-3 h-3" />
                                  <span>Google Meet</span>
                                </a>
                              )}
                            </div>
                          );
                        })}

                        {dayTasks.map(t => (
                          <div
                            key={t.id}
                            className="p-1.5 rounded-lg border border-[#EFE8E1] bg-[#F5EFEB] text-[#7D6F6B] text-xs flex items-center space-x-1.5"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-[#A86B60] shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* AGENDA / LIST VIEW */
            <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE8E1]">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#332A28]">
                    Agenda Completa de Eventos
                  </h3>
                  <p className="text-xs text-[#7D6F6B]">
                    Vista cronológica detallada con ubicación, notas, subtareas y enlaces de Google Meet.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddEvent()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#C48B81] hover:bg-[#85534A] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Evento</span>
                </button>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="text-center py-16 bg-[#FCFAF7] rounded-2xl border border-[#EFE8E1]">
                  <CalendarIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-[#332A28]">No hay eventos programados</h4>
                  <p className="text-xs text-[#7D6F6B] mt-1">Crea un evento o ajusta los filtros de búsqueda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map(evt => {
                    const badge = getBadgeColors(evt.event_type);
                    const gcalUrl = createGoogleCalendarUrl(evt);

                    let checklistItems: { id: string; text: string; done: boolean }[] = [];
                    if (Array.isArray(evt.checklist)) {
                      checklistItems = evt.checklist;
                    } else if (typeof evt.checklist === 'string') {
                      try {
                        checklistItems = JSON.parse(evt.checklist);
                      } catch {}
                    }

                    return (
                      <div
                        key={evt.id}
                        className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#EFE8E1] hover:border-[#C48B81]/40 transition shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] flex flex-col items-center justify-center text-[#C48B81] shrink-0">
                              <span className="text-[10px] font-bold uppercase">
                                {new Date(evt.date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short' })}
                              </span>
                              <span className="text-base font-black leading-none">
                                {new Date(evt.date + 'T12:00:00').getDate()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badge.bg} ${badge.border} ${badge.text}`}>
                                  {badge.label}
                                </span>
                                {evt.wedding_name && (
                                  <span className="text-xs text-[#7D6F6B] font-semibold">
                                    💍 {evt.wedding_name}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-bold text-[#332A28] mt-0.5">
                                {evt.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {/* 1-Click Google Calendar */}
                            <a
                              href={gcalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg border border-[#EFE8E1] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[11px] font-semibold text-[#2563EB] flex items-center space-x-1 shadow-2xs"
                              title="Añadir a Google Calendar"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>+ Google Calendar</span>
                            </a>

                            {evt.source === 'CALENDAR_EVENT' && (
                              <>
                                <button
                                  onClick={() => handleOpenEditEvent(evt)}
                                  className="p-1.5 text-stone-400 hover:text-[#C48B81] rounded-lg hover:bg-[#FAF8F5] transition"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(evt.id)}
                                  className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Event Details: Time, Location, Responsible, Meet */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-1 border-t border-[#FAF8F5]">
                          <div className="flex items-center space-x-1.5 text-[#7D6F6B]">
                            <Clock className="w-3.5 h-3.5 text-[#C48B81]" />
                            <span>
                              {evt.time || 'Sin hora'} {evt.end_time ? `- ${evt.end_time}` : ''} hrs
                            </span>
                          </div>

                          {evt.location && (
                            <div className="flex items-center space-x-1.5 text-[#2563EB]">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(evt.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline truncate"
                              >
                                {evt.location}
                              </a>
                            </div>
                          )}

                          {evt.responsible && (
                            <div className="flex items-center space-x-1.5 text-[#7D6F6B]">
                              <User className="w-3.5 h-3.5" />
                              <span>Resp: {evt.responsible}</span>
                            </div>
                          )}
                        </div>

                        {/* Google Meet Link */}
                        {evt.meet_url && (
                          <div className="p-2.5 rounded-xl bg-[#F7EDEB] border border-[#ECD9D5] flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2 text-[#A86B60] font-medium">
                              <Video className="w-4 h-4 text-[#C48B81]" />
                              <span>Reunión Virtual por Google Meet</span>
                            </div>
                            <a
                              href={evt.meet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-[#2B2826] hover:bg-stone-800 text-white rounded-lg font-semibold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <span>Unirme</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Notes */}
                        {evt.notes && (
                          <div className="text-xs text-[#7D6F6B] bg-[#FCFAF7] p-2.5 rounded-xl border border-[#EFE8E1]">
                            <span className="font-semibold text-[#332A28]">Notas: </span>
                            {evt.notes}
                          </div>
                        )}

                        {/* Event Checklist / Tasks list */}
                        {checklistItems.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-bold text-[#7D6F6B] uppercase tracking-wider">
                              Subtareas / Lista:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {checklistItems.map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center space-x-2 text-xs bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#EFE8E1]"
                                >
                                  {item.done ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                  )}
                                  <span className={item.done ? 'line-through text-stone-400' : 'text-[#332A28]'}>
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>

      {/* 2. MOBILE VIEW: GOOGLE CALENDAR RESPONSIVE (Alineado con el estilo de la plataforma LAZO) */}
      <div className="md:hidden flex flex-col w-full bg-white rounded-2xl border border-[#EFE8E1] shadow-xs overflow-hidden select-none relative mb-6">
        {/* Card Header: Mes / Año + Navegación (Hoy, Flechas, Buscar) */}
        <div className="flex items-center justify-between px-3.5 py-3 bg-[#FAF8F5] border-b border-[#EFE8E1]">
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-lg font-bold text-[#332A28] capitalize">
              {monthNames[month]} {year}
            </h2>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-[#EFE8E1] bg-white text-[#332A28] hover:bg-[#FAF8F5] transition shadow-2xs cursor-pointer"
              title="Ir a Hoy"
            >
              Hoy
            </button>
            <div className="flex items-center space-x-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg border border-[#EFE8E1] bg-white text-[#7D6F6B] hover:text-[#332A28] transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg border border-[#EFE8E1] bg-white text-[#7D6F6B] hover:text-[#332A28] transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowMobileSearch(prev => !prev)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                showMobileSearch ? 'bg-[#C48B81] text-white border-[#C48B81]' : 'border-[#EFE8E1] bg-white text-[#7D6F6B] hover:text-[#332A28]'
              }`}
              title="Buscar eventos"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            {user?.role === 'ADMINISTRADOR' && (
              <button
                onClick={() => {
                  fetchPermissions();
                  setShowPermissionsModal(true);
                }}
                className="p-1.5 rounded-lg border border-[#EFE8E1] bg-white text-[#C48B81] hover:bg-[#FAF8F5] transition cursor-pointer"
                title="Asignar permisos del equipo"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search bar on mobile (if toggled) */}
        {showMobileSearch && (
          <div className="p-2.5 bg-white border-b border-[#EFE8E1] flex items-center space-x-2">
            <Search className="w-4 h-4 text-stone-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar eventos o tareas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-[#FAF8F5] border border-[#EFE8E1] rounded-lg px-2.5 py-1.5 text-xs text-[#332A28] focus:outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Month Carousel Pills */}
        <div className="flex items-center space-x-2 px-3 py-2.5 overflow-x-auto no-scrollbar border-b border-[#EFE8E1] bg-[#FAF8F5]/60">
          {monthCarousel.map((item, idx) => {
            if (item.isYearSeparator) {
              return (
                <span key={`year-${idx}`} className="font-bold text-xs text-[#C48B81] px-1.5 shrink-0 select-none">
                  {item.label}
                </span>
              );
            }
            const isSelected = item.year === year && item.month === month;
            return (
              <button
                key={`m-${idx}`}
                onClick={() => setCurrentDate(new Date(item.year, item.month, 1))}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#C48B81] text-white font-bold shadow-2xs'
                    : 'border border-[#EFE8E1] bg-white text-[#7D6F6B] hover:text-[#332A28] hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Day of Week Headers (D, L, M, M, J, V, S) */}
        <div className="grid grid-cols-7 text-center py-2 bg-white border-b border-[#EFE8E1]">
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((letter, dIdx) => {
            const isTodayWeekday = dIdx === new Date().getDay() && month === new Date().getMonth() && year === new Date().getFullYear();
            return (
              <div
                key={dIdx}
                className={`text-[11px] font-semibold ${
                  isTodayWeekday ? 'text-[#C48B81] font-bold' : 'text-[#7D6F6B]'
                }`}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* Monthly Grid (Full Width, 7 Columns, 42 cells = 6 Full Rows) */}
        <div className="grid grid-cols-7 w-full divide-x divide-y divide-[#EFE8E1] bg-white">
          {calendarDays.map((d, cIdx) => {
            const dayEvents = filteredEvents.filter(e => e.date === d.dateStr);

            return (
              <div
                key={cIdx}
                onClick={() => setSelectedMobileDay(d.dateStr)}
                className={`min-h-[88px] sm:min-h-[105px] p-1 flex flex-col justify-start overflow-hidden cursor-pointer active:bg-[#FAF8F5] transition relative ${
                  !d.isCurrentMonth ? 'bg-[#FAF8F5]/50' : 'bg-white'
                }`}
              >
                {/* Day number */}
                <div className="text-center mb-0.5">
                  {d.isToday ? (
                    <div className="w-5 h-5 rounded-full bg-[#C48B81] text-white font-bold text-[11px] flex items-center justify-center mx-auto shadow-2xs">
                      {d.dayNum}
                    </div>
                  ) : (
                    <span
                      className={`text-[11px] font-medium inline-block ${
                        d.isCurrentMonth ? 'text-[#332A28]' : 'text-stone-300'
                      }`}
                    >
                      {d.dayNum}
                    </span>
                  )}
                </div>

                {/* Event indicators */}
                <div className="flex-1 flex flex-col space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map(evt => (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (evt.source === 'CALENDAR_EVENT') {
                          handleOpenEditEvent(evt);
                        } else if (evt.wedding_id) {
                          const wed = assignedWeddings.find(w => w.id === evt.wedding_id);
                          if (wed) setCurrentWedding(wed);
                        }
                      }}
                      className={`rounded-[3px] text-[9px] font-medium px-1 py-0.5 truncate text-white leading-tight shadow-2xs cursor-pointer ${getMobileChipColor(evt.event_type)}`}
                      title={`${evt.time || ''} ${evt.title}`}
                    >
                      {evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] font-bold text-[#C48B81] text-center leading-none">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Action Button (FAB) at bottom-right */}
        <div className="fixed bottom-6 right-5 z-40">
          <button
            onClick={() => handleOpenAddEvent()}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#C48B81] hover:bg-[#A86B60] text-white shadow-xl flex items-center justify-center transition active:scale-90 cursor-pointer"
            title="Crear Evento"
            aria-label="Crear Evento"
          >
            <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 3. MOBILE DAY EVENTS DETAIL BOTTOM SHEET */}
      {selectedMobileDay && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setSelectedMobileDay(null)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-h-[70vh] p-5 overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EFE8E1] pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-[#A86B60]">Detalle del Día</span>
                <h3 className="text-lg font-serif font-bold text-[#2B2826] capitalize">
                  {new Date(selectedMobileDay + 'T12:00:00').toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleOpenAddEvent(selectedMobileDay);
                    setSelectedMobileDay(null);
                  }}
                  className="p-2 rounded-xl bg-[#C48B81] text-white hover:bg-[#85534A] transition cursor-pointer"
                  title="Añadir evento a este día"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedMobileDay(null)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {filteredEvents.filter(e => e.date === selectedMobileDay).length === 0 ? (
                <div className="text-center py-6 text-sm text-[#7D6F6B]">
                  No hay eventos programados para este día.
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        handleOpenAddEvent(selectedMobileDay);
                        setSelectedMobileDay(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#C48B81] text-white text-xs font-semibold cursor-pointer"
                    >
                      + Agendar Evento
                    </button>
                  </div>
                </div>
              ) : (
                filteredEvents.filter(e => e.date === selectedMobileDay).map(evt => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setSelectedMobileDay(null);
                      if (evt.source === 'CALENDAR_EVENT') {
                        handleOpenEditEvent(evt);
                      } else if (evt.wedding_id) {
                        const wed = assignedWeddings.find(w => w.id === evt.wedding_id);
                        if (wed) setCurrentWedding(wed);
                      }
                    }}
                    className="p-3 rounded-2xl border border-[#EFE8E1] bg-[#FCFAF7] hover:bg-white transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getMobileChipColor(evt.event_type)}`}>
                          {evt.event_type}
                        </span>
                        {evt.time && <span className="text-xs font-bold text-[#2B2826]">{evt.time}</span>}
                      </div>
                      <div className="font-semibold text-sm text-[#2B2826]">{evt.title}</div>
                      {evt.wedding_name && <div className="text-xs text-[#8A7E72]">💍 {evt.wedding_name}</div>}
                      {evt.location && <div className="text-xs text-[#8A7E72]">📍 {evt.location}</div>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR EVENTO */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-3xl max-w-lg w-full border border-[#EFE8E1] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#EFE8E1] bg-[#FCFAF7] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-[#C48B81]" />
                <h3 className="font-bold text-[#332A28] text-base">
                  {editingEventId ? 'Editar Evento' : 'Nuevo Evento en Calendario'}
                </h3>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1 rounded-lg text-[#7D6F6B] hover:text-[#332A28]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 overflow-y-auto space-y-4 text-xs">
              {conflictWarning && (
                <div className="p-3 bg-[#FAF4F0] border border-[#EFE8E1] rounded-xl text-[#8A6D5E] text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#C48B81] shrink-0 mt-0.5" />
                  <div>{conflictWarning}</div>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>{formError}</div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#332A28] mb-1">Título del Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Prueba de Menú con Chef / Open House Hacienda"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Tipo de Evento / Lista *</label>
                  <select
                    value={formData.event_type}
                    onChange={e => setFormData({ ...formData, event_type: e.target.value as any })}
                    className="w-full text-xs px-3 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                  >
                    <option value="PLANNING">🌸 Cita planning</option>
                    <option value="CITA_EXTERNA">💼 Cita externa</option>
                    <option value="BODA">💍 Boda</option>
                    <option value="OPEN_HOUSE">🏛️ Open house</option>
                    <option value="SERVICIO">🍸 Servicios</option>
                    <option value="PAPELERIA">💌 Papelería</option>
                    <option value="OTRO">📌 Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Boda Asociada (opcional)</label>
                  <select
                    value={formData.wedding_id}
                    onChange={e => setFormData({ ...formData, wedding_id: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                  >
                    <option value="">(Ninguna / Evento General)</option>
                    {assignedWeddings.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => {
                      setFormData({ ...formData, date: e.target.value });
                      checkClientConflict(e.target.value, formData.time, editingEventId);
                    }}
                    className="w-full text-xs px-3 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={e => {
                      setFormData({ ...formData, time: e.target.value });
                      checkClientConflict(formData.date, e.target.value, editingEventId);
                    }}
                    className="w-full text-xs px-3 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Ubicación / Lugar</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="text"
                      placeholder="Dirección o recinto"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full text-xs pl-8 pr-3 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Responsable</label>
                  <input
                    type="text"
                    value={formData.responsible}
                    onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#332A28] mb-1">Notas y Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre la sesión, materiales a llevar, acuerdos..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none"
                />
              </div>

              {/* CHECKLIST / SUBTAREAS INTERNAS */}
              <div className="space-y-2 pt-2 border-t border-[#EFE8E1]">
                <label className="block font-bold text-[#332A28]">
                  Subtareas y Pendientes del Evento (Lista)
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="text"
                    placeholder="Agregar pendiente (ej. Llevar paleta de color)..."
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newChecklistText.trim()) {
                          setFormData({
                            ...formData,
                            checklist: [
                              ...formData.checklist,
                              { id: 'chk_' + Date.now(), text: newChecklistText.trim(), done: false }
                            ]
                          });
                          setNewChecklistText('');
                        }
                      }
                    }}
                    className="flex-1 text-xs px-3 py-1.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistText.trim()) {
                        setFormData({
                          ...formData,
                          checklist: [
                            ...formData.checklist,
                            { id: 'chk_' + Date.now(), text: newChecklistText.trim(), done: false }
                          ]
                        });
                        setNewChecklistText('');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#FAF8F5] border border-[#EFE8E1] rounded-xl text-xs font-semibold text-[#C48B81] hover:bg-[#F3ECE2]"
                  >
                    Agregar
                  </button>
                </div>

                {formData.checklist.length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {formData.checklist.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-[#FCFAF7] border border-[#EFE8E1]"
                      >
                        <label className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => {
                              const updated = [...formData.checklist];
                              updated[idx].done = !updated[idx].done;
                              setFormData({ ...formData, checklist: updated });
                            }}
                            className="rounded text-[#C48B81]"
                          />
                          <span className={`truncate text-xs ${item.done ? 'line-through text-stone-400' : 'text-[#332A28]'}`}>
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              checklist: formData.checklist.filter((_, i) => i !== idx)
                            });
                          }}
                          className="text-stone-400 hover:text-red-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {conflictWarning && (
                <div className="pt-2">
                  <label className="flex items-center space-x-2 text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.force_conflict}
                      onChange={e => setFormData({ ...formData, force_conflict: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    <span className="font-semibold text-[11px]">
                      Confirmar y agendar a pesar del empalme de horario
                    </span>
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#EFE8E1]">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE8E1] text-xs font-semibold text-[#7D6F6B] hover:text-[#332A28]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C48B81] hover:bg-[#85534A] text-white text-xs font-semibold shadow-sm"
                >
                  {editingEventId ? 'Guardar Cambios' : 'Agendar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR GOOGLE CALENDAR */}
      {showGoogleSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-3xl max-w-md w-full border border-[#EFE8E1] shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE8E1]">
              <div className="flex items-center space-x-2 text-[#2563EB]">
                <CalendarDays className="w-5 h-5" />
                <h3 className="font-bold text-[#332A28] text-base">
                  Vincular con Google Calendar
                </h3>
              </div>
              <button
                onClick={() => setShowGoogleSyncModal(false)}
                className="p-1 rounded-lg text-[#7D6F6B] hover:text-[#332A28]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#7D6F6B] leading-relaxed">
              Sincroniza todos los eventos del estudio en tiempo real con tu Google Calendar, Apple Calendar o Outlook mediante el enlace de suscripción iCal.
            </p>

            <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EFE8E1] space-y-2">
              <label className="block text-[11px] font-bold text-[#332A28] uppercase tracking-wider">
                URL de Suscripción en Vivo (.ics)
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/calendar/feed.ics`}
                  className="w-full text-xs px-2.5 py-1.5 bg-[#FFFFFF] border border-[#EFE8E1] rounded-lg text-[#7D6F6B] select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/calendar/feed.ics`);
                    setCopiedIcsLink(true);
                    setTimeout(() => setCopiedIcsLink(false), 2500);
                  }}
                  className="px-3 py-1.5 bg-[#C48B81] hover:bg-[#85534A] text-white text-xs font-semibold rounded-lg shrink-0 flex items-center space-x-1 transition cursor-pointer"
                >
                  {copiedIcsLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIcsLink ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-[#7D6F6B] space-y-1.5 bg-[#FCFAF7] p-3 rounded-xl border border-[#EFE8E1]">
              <span className="font-bold text-[#332A28]">¿Cómo agregarlo en Google Calendar?</span>
              <ol className="list-decimal list-inside space-y-1 text-[11px]">
                <li>Abre Google Calendar en tu computadora.</li>
                <li>En la barra lateral izquierda, busca <strong>Otros calendarios</strong> y haz clic en <strong>+</strong>.</li>
                <li>Selecciona <strong>Desde una URL</strong>.</li>
                <li>Pega la URL copiada arriba y haz clic en <strong>Añadir calendario</strong>.</li>
              </ol>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center space-x-1"
              >
                <span>Abrir Google Calendar Web</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setShowGoogleSyncModal(false)}
                className="px-4 py-1.5 bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-semibold text-[#332A28] rounded-xl hover:bg-[#F3ECE2]"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TEAM VISIBILITY PERMISSIONS MODAL (Admin Only) */}
      {showPermissionsModal && (
        <div
          className="fixed inset-0 z-50 bg-[#2B2826]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowPermissionsModal(false)}
        >
          <div
            className="bg-[#FFFFFF] rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#EFE8E1] space-y-5 animate-in fade-in-50 zoom-in-95 duration-200 my-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#EFE8E1]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF4F2] text-[#C48B81] flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#332A28]">
                    Permisos de Visualización del Calendario
                  </h3>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">
                    Asigna qué listas de eventos puede ver cada rol del equipo en LAZO.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick preset banner */}
            <div className="p-3 bg-[#FAF8F5] border border-[#EFE8E1] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-[#332A28] leading-relaxed">
                <span className="font-bold">Regla recomendada:</span> El <strong>Staff</strong> sólo visualiza eventos de <strong>Servicios</strong> (beerstand, memorial, mimosas, etc.) y los <strong>Coordinadores</strong> visualizan todas las listas.
              </div>
              <button
                onClick={() => {
                  setRolePermissions({
                    COORDINADOR: ['PLANNING', 'CITA_EXTERNA', 'BODA', 'OPEN_HOUSE', 'SERVICIO', 'PAPELERIA', 'OTRO'],
                    STAFF: ['SERVICIO'],
                    NOVIOS: ['PLANNING', 'BODA']
                  });
                }}
                className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F3ECE2] border border-[#EFE8E1] text-[#C48B81] font-semibold rounded-xl transition shadow-2xs whitespace-nowrap cursor-pointer shrink-0"
              >
                ✨ Aplicar Regla
              </button>
            </div>

            {/* Roles Matrix */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {/* Coordinadores */}
              <div className="border border-[#EFE8E1] rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFE2DF] text-[#70443D] border border-[#CCDACC]">
                      COORDINADORES
                    </span>
                    <span className="text-xs text-[#7D6F6B] hidden sm:inline">
                      Coordinación general de planeación y logística
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      onClick={() => {
                        setRolePermissions(prev => ({
                          ...prev,
                          COORDINADOR: CALENDAR_CATEGORIES.map(c => c.type)
                        }));
                      }}
                      className="text-[#C48B81] hover:underline font-semibold cursor-pointer"
                    >
                      Marcar todo
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                      onClick={() => {
                        setRolePermissions(prev => ({
                          ...prev,
                          COORDINADOR: []
                        }));
                      }}
                      className="text-stone-500 hover:underline cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                  {CALENDAR_CATEGORIES.map(cat => {
                    const isChecked = (rolePermissions.COORDINADOR || []).includes(cat.type);
                    return (
                      <label
                        key={cat.type}
                        className={`flex items-center space-x-2 p-2 rounded-xl border transition cursor-pointer text-xs ${
                          isChecked
                            ? 'border-[#C48B81]/40 bg-[#FAF4F2]'
                            : 'border-[#EFE8E1] bg-white opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setRolePermissions(prev => {
                              const curr = prev.COORDINADOR || [];
                              const next = isChecked
                                ? curr.filter(t => t !== cat.type)
                                : [...curr, cat.type];
                              return { ...prev, COORDINADOR: next };
                            });
                          }}
                          className="rounded text-[#C48B81] focus:ring-[#C48B81]"
                          style={{ accentColor: cat.color }}
                        />
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-[#332A28] truncate">{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Staff */}
              <div className="border border-[#EFE8E1] rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F7F3EE] text-[#332A28] border border-[#EFE8E1]">
                      STAFF
                    </span>
                    <span className="text-xs text-[#7D6F6B] hidden sm:inline">
                      Equipo operativo en sitio y servicios especiales
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      onClick={() => {
                        setRolePermissions(prev => ({
                          ...prev,
                          STAFF: ['SERVICIO']
                        }));
                      }}
                      className="text-[#C48B81] hover:underline font-semibold cursor-pointer"
                    >
                      Solo Servicios
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                      onClick={() => {
                        setRolePermissions(prev => ({
                          ...prev,
                          STAFF: CALENDAR_CATEGORIES.map(c => c.type)
                        }));
                      }}
                      className="text-[#C48B81] hover:underline cursor-pointer"
                    >
                      Marcar todo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                  {CALENDAR_CATEGORIES.map(cat => {
                    const isChecked = (rolePermissions.STAFF || []).includes(cat.type);
                    return (
                      <label
                        key={cat.type}
                        className={`flex items-center space-x-2 p-2 rounded-xl border transition cursor-pointer text-xs ${
                          isChecked
                            ? 'border-[#C48B81]/40 bg-[#FAF4F2]'
                            : 'border-[#EFE8E1] bg-white opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setRolePermissions(prev => {
                              const curr = prev.STAFF || [];
                              const next = isChecked
                                ? curr.filter(t => t !== cat.type)
                                : [...curr, cat.type];
                              return { ...prev, STAFF: next };
                            });
                          }}
                          className="rounded text-[#C48B81] focus:ring-[#C48B81]"
                          style={{ accentColor: cat.color }}
                        />
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-[#332A28] truncate">{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Novios */}
              <div className="border border-[#EFE8E1] rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FCFAF7] text-[#C48B81] border border-[#EFE8E1]">
                      NOVIOS
                    </span>
                    <span className="text-xs text-[#7D6F6B] hidden sm:inline">
                      Portal de novios (acotado exclusivamente a su boda)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                  {CALENDAR_CATEGORIES.map(cat => {
                    const isChecked = (rolePermissions.NOVIOS || []).includes(cat.type);
                    return (
                      <label
                        key={cat.type}
                        className={`flex items-center space-x-2 p-2 rounded-xl border transition cursor-pointer text-xs ${
                          isChecked
                            ? 'border-[#C48B81]/40 bg-[#FAF4F2]'
                            : 'border-[#EFE8E1] bg-white opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setRolePermissions(prev => {
                              const curr = prev.NOVIOS || [];
                              const next = isChecked
                                ? curr.filter(t => t !== cat.type)
                                : [...curr, cat.type];
                              return { ...prev, NOVIOS: next };
                            });
                          }}
                          className="rounded text-[#C48B81] focus:ring-[#C48B81]"
                          style={{ accentColor: cat.color }}
                        />
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-[#332A28] truncate">{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Administradores info banner */}
              <div className="p-3.5 rounded-2xl bg-[#E5EDE6] border border-[#D5E2D7] text-xs text-[#384C3A] flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-[#384C3A] shrink-0" />
                <span>
                  <strong>Administradores:</strong> Tienen acceso total a todas las listas del calendario y la facultad de modificar estos permisos en cualquier momento.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EFE8E1]">
              {permissionsSuccess ? (
                <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Permisos guardados y sincronizados!</span>
                </div>
              ) : (
                <span className="text-xs text-[#7D6F6B]">
                  Los cambios se aplican de inmediato a todo el equipo.
                </span>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="px-4 py-2 border border-[#EFE8E1] rounded-xl text-xs font-semibold text-[#7D6F6B] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                  className="px-5 py-2 bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingPermissions ? 'Guardando...' : 'Guardar Permisos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
