import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon, Clock, MapPin, User,
  Plus, X, AlertTriangle, Filter, ChevronLeft,
  ChevronRight, Sparkles, Building2, ExternalLink, Trash2, Edit2,
  Copy, Check, Link2, CheckCircle2
} from 'lucide-react';

export interface CalendarEventItem {
  id: string;
  wedding_id?: string | null;
  wedding_name?: string | null;
  title: string;
  event_type: 'PLANNING' | 'CITA_EXTERNA' | 'EVENTO' | 'SERVICIO' | 'OPEN_HOUSE' | 'OTRO';
  date: string;
  time: string;
  end_time?: string | null;
  location?: string | null;
  responsible?: string | null;
  notes?: string | null;
  status?: string | null;
  accepted_by?: any[];
  meet_url?: string | null;
  source?: 'MEETING' | 'CALENDAR_EVENT' | 'WEDDING_DAY';
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

interface GeneralCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWedding?: (weddingId: string) => void;
}

export const GeneralCalendarModal: React.FC<GeneralCalendarModalProps> = ({
  isOpen,
  onClose,
  onSelectWedding
}) => {
  const { token, user, assignedWeddings } = useAuth();

  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('TODOS');
  const [search, setSearch] = useState('');

  // Current calendar view date (Year-Month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEventItem[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  // Google Calendar Sync Modal
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [copiedIcsLink, setCopiedIcsLink] = useState(false);

  // Add / Edit Event Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'CITA_EXTERNA',
    date: new Date().toISOString().split('T')[0],
    time: '11:00',
    end_time: '12:00',
    location: '',
    responsible: user?.name || '',
    notes: '',
    wedding_id: '',
    force_conflict: false
  });
  const [formError, setFormError] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Fetch unified studio calendar
  const fetchEvents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/calendar', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching general calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  // Real-time conflict detector for form
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

  const handleOpenAdd = (dayStr?: string) => {
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
      force_conflict: false
    });
    setConflictWarning(null);
    setFormError('');
    checkClientConflict(targetDate, '11:00', null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (evt: CalendarEventItem) => {
    if (evt.source !== 'CALENDAR_EVENT') {
      alert('Las reuniones de planning y bodas se editan desde sus respectivos módulos.');
      return;
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
      force_conflict: false
    });
    setConflictWarning(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('¿Deseas eliminar este evento del Calendario General?')) return;
    try {
      const res = await fetch(`/api/calendar/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEvents();
        if (selectedDayEvents) {
          setSelectedDayEvents(prev => (prev ? prev.filter(e => e.id !== id) : null));
        }
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

      setShowAddModal(false);
      fetchEvents();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  // Compute days in month
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  // Helper colors for event types
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'EVENTO':
        return 'bg-[#E4ECE5] text-[#2B5235] border-[#BDD4C1]';
      case 'PLANNING':
        return 'bg-[#FDF6F5] text-[#9C665C] border-[#F3DCD7]';
      case 'CITA_EXTERNA':
        return 'bg-[#EEF4FF] text-[#1E40AF] border-[#C7D7FE]';
      case 'OPEN_HOUSE':
        return 'bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]';
      case 'SERVICIO':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      default:
        return 'bg-[#FAF8F5] text-[#5A524C] border-[#EAE3DA]';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'EVENTO': return '💍 Boda VLB';
      case 'PLANNING': return '📋 Cita Planning';
      case 'CITA_EXTERNA': return '📍 Cita Externa';
      case 'OPEN_HOUSE': return '✨ Open House';
      case 'SERVICIO': return '⚡ Servicio';
      default: return '📌 Otro';
    }
  };

  // Filtered Events
  const filteredEvents = events.filter(e => {
    if (filterType !== 'TODOS' && e.event_type !== filterType) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchWed = (e.wedding_name || '').toLowerCase().includes(q);
      const matchResp = (e.responsible || '').toLowerCase().includes(q);
      const matchLoc = (e.location || '').toLowerCase().includes(q);
      return matchTitle || matchWed || matchResp || matchLoc;
    }
    return true;
  });

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#2B2826]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-[#FFFFFF] w-full max-w-6xl h-[92vh] max-h-[880px] rounded-3xl border border-[#EAE3DA] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#EAE3DA] bg-[#FAF8F5] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#9C665C] text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="font-serif text-2xl font-bold text-[#2B2826]">
                  Calendario General VLB Studio
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E4ECE5] text-[#2B5235] font-semibold border border-[#BDD4C1]">
                  Equipo Completo
                </span>
              </div>
              <p className="text-xs text-[#8A7E72] mt-0.5">
                Visión unificada de citas Planning, bodas, citas externas, servicios y open house.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end md:self-auto">
            <button
              onClick={() => setShowGoogleSyncModal(true)}
              className="px-2.5 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA] hover:border-[#4285F4]/40 text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer inline-flex items-center space-x-1.5"
              title="Vincular y sincronizar con Google Calendar"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#4285F4]" />
              <span className="hidden sm:inline">Google Calendar</span>
            </button>

            <button
              onClick={() => handleOpenAdd()}
              className="px-3 py-1.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar Cita</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8A7E72] hover:text-[#2B2826] hover:bg-[#FAF8F5] rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Month Switcher */}
        <div className="px-6 py-2.5 border-b border-[#EAE3DA] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-2.5">
          {/* Categories */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'PLANNING', label: 'Citas Planning' },
              { id: 'EVENTO', label: 'Bodas VLB' },
              { id: 'CITA_EXTERNA', label: 'Citas Externas' },
              { id: 'SERVICIO', label: 'Servicios' },
              { id: 'OPEN_HOUSE', label: 'Open House' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-[#2B2826] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#5A524C] hover:bg-[#F3ECE2] border border-[#EAE3DA]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Month Controller */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg border border-[#EAE3DA] hover:bg-[#FAF8F5] text-[#2B2826] transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-serif text-sm font-bold text-[#2B2826] capitalize min-w-[130px] text-center">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg border border-[#EAE3DA] hover:bg-[#FAF8F5] text-[#2B2826] transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid & Side Details View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#FCFAF7]">
          {/* Main Month Grid (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-[#EAE3DA] shadow-xs flex flex-col">
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-[#8A7E72] uppercase tracking-wider mb-2">
              <span>Dom</span>
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 gap-1.5 flex-1 auto-rows-fr">
              {/* Empty leading slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[75px] rounded-2xl bg-[#FAF8F5]/40 border border-transparent" />
              ))}

              {/* Day slots */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = filteredEvents.filter(e => e.date === dateKey);
                const isToday = new Date().toISOString().split('T')[0] === dateKey;
                const isSelected = selectedDateStr === dateKey;

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      setSelectedDateStr(dateKey);
                      setSelectedDayEvents(dayEvents);
                    }}
                    className={`min-h-[78px] p-1.5 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#9C665C] bg-[#FDF6F5] ring-2 ring-[#9C665C]/30'
                        : isToday
                        ? 'border-[#9C665C] bg-[#FFFBFB]'
                        : 'border-[#EAE3DA] bg-white hover:border-[#9C665C]/50 hover:bg-[#FCFAF7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-[#9C665C] text-white shadow-xs' : 'text-[#2B2826]'
                      }`}>
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-[#9C665C] bg-[#FDF6F5] px-1.5 rounded-full border border-[#F3DCD7]">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Micro event indicators */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map(evt => (
                        <div
                          key={evt.id}
                          className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded-md border ${getBadgeStyle(evt.event_type)}`}
                          title={`${evt.time} - ${evt.title}`}
                        >
                          {evt.time} {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-[#8A7E72] font-semibold block px-1">
                          +{dayEvents.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Panel: Selected Day Agenda / Global Agenda */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAE3DA] shadow-xs flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3DA] mb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2B2826]">
                  {selectedDateStr ? `Agenda del ${selectedDateStr}` : 'Próximos Eventos'}
                </h3>
                <span className="text-xs text-[#8A7E72]">
                  {selectedDateStr
                    ? `${(selectedDayEvents || []).length} citas programadas`
                    : `${filteredEvents.length} eventos en total`}
                </span>
              </div>
              {selectedDateStr && (
                <button
                  onClick={() => handleOpenAdd(selectedDateStr)}
                  className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#9C665C] text-xs font-bold rounded-lg border border-[#EAE3DA] transition inline-flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {((selectedDayEvents || filteredEvents).length === 0) ? (
                <div className="py-12 text-center text-[#8A7E72] space-y-2">
                  <CalendarIcon className="w-8 h-8 text-[#EAE3DA] mx-auto" />
                  <p className="text-sm font-semibold text-[#2B2826]">Sin eventos programados</p>
                  <p className="text-xs text-[#8A7E72]">
                    Selecciona un día en el calendario o haz clic en "Agendar Cita / Evento".
                  </p>
                </div>
              ) : (
                (selectedDayEvents || filteredEvents).map(evt => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl border border-[#EAE3DA] bg-[#FAF8F5] hover:bg-white hover:border-[#9C665C]/40 transition space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBadgeStyle(evt.event_type)}`}>
                        {getTypeLabel(evt.event_type)}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#2B2826] bg-white px-2 py-0.5 rounded-md border border-[#EAE3DA]">
                        {evt.time} {evt.end_time ? `- ${evt.end_time}` : ''}
                      </span>
                    </div>

                    <div className="font-serif text-base font-bold text-[#2B2826]">
                      {evt.title}
                    </div>

                    {evt.wedding_name && (
                      <div className="text-xs text-[#9C665C] font-semibold flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Boda: {evt.wedding_name}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5A524C]">
                      {evt.location && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#8A7E72]" />
                          <span>{evt.location}</span>
                        </span>
                      )}
                      {evt.responsible && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-[#8A7E72]" />
                          <span>Resp: {evt.responsible}</span>
                        </span>
                      )}
                    </div>

                    {evt.notes && (
                      <p className="text-xs text-[#7D6F6B] italic bg-white p-2 rounded-xl border border-[#EAE3DA]">
                        "{evt.notes}"
                      </p>
                    )}

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-[#EAE3DA]/60">
                      {/* 1-Click Google Calendar */}
                      <a
                        href={createGoogleCalendarUrl(evt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold text-[#1967D2] bg-[#4285F4]/10 border border-[#4285F4]/30 rounded-lg hover:bg-[#4285F4]/20 transition inline-flex items-center space-x-1"
                        title="Añadir esta cita a tu Google Calendar personal con 1 clic"
                      >
                        <CalendarIcon className="w-3 h-3 text-[#1967D2]" />
                        <span>+ Google Calendar</span>
                      </a>

                      {evt.meet_url && (
                        <a
                          href={evt.meet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition inline-flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Meet</span>
                        </a>
                      )}
                      {evt.source === 'CALENDAR_EVENT' && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(evt)}
                            className="p-1.5 text-[#7D6F6B] hover:text-[#2B2826] hover:bg-white rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal: Agendar / Editar Evento */}
        {showAddModal && (
          <div className="fixed inset-0 z-60 bg-[#2B2826]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3DA] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE3DA]">
                <h3 className="font-serif text-2xl font-bold text-[#2B2826]">
                  {editingEventId ? 'Editar Evento General' : 'Agendar Cita o Evento en Calendario'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-[#8A7E72] hover:text-[#2B2826] p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conflict Warning Alert Box */}
              {conflictWarning && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">{conflictWarning}</div>
                    <p className="text-amber-800">
                      Revisa si deseas ajustar el horario para evitar sobreponer citas del equipo.
                    </p>
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveEvent} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                    Título del Evento / Cita *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Visita Técnica Hacienda / Open House Novias"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                      Tipo de Evento *
                    </label>
                    <select
                      value={formData.event_type}
                      onChange={e => setFormData({ ...formData, event_type: e.target.value as any })}
                      className="w-full px-3 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                    >
                      <option value="CITA_EXTERNA">📍 Cita Externa (Proveedor / Locación)</option>
                      <option value="OPEN_HOUSE">✨ Open House / Showroom</option>
                      <option value="SERVICIO">⚡ Servicio / Montaje</option>
                      <option value="PLANNING">📋 Sesión de Planeación</option>
                      <option value="EVENTO">💍 Boda / Evento Social</option>
                      <option value="OTRO">📌 Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                      Boda Relacionada (Opcional)
                    </label>
                    <select
                      value={formData.wedding_id}
                      onChange={e => setFormData({ ...formData, wedding_id: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                    >
                      <option value="">General (Todo el Estudio)</option>
                      {assignedWeddings.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, date: val });
                        checkClientConflict(val, formData.time, editingEventId);
                      }}
                      className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs text-[#2B2826] bg-[#FAF8F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                      Hora Inicio *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, time: val });
                        checkClientConflict(formData.date, val, editingEventId);
                      }}
                      className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs text-[#2B2826] bg-[#FAF8F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                      Hora Fin
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs text-[#2B2826] bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                      Ubicación / Lugar
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Showroom San Pedro / Zoom"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3.5 py-2 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] bg-[#FAF8F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                      Responsable
                    </label>
                    <input
                      type="text"
                      placeholder="Coordinador o Staff"
                      value={formData.responsible}
                      onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                      className="w-full px-3.5 py-2 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1 uppercase tracking-wider">
                    Notas u Observaciones
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles, proveedores involucrados o recordatorios..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] bg-[#FAF8F5] resize-none"
                  />
                </div>

                {conflictWarning && (
                  <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.force_conflict}
                      onChange={e => setFormData({ ...formData, force_conflict: e.target.checked })}
                      className="rounded text-[#9C665C] focus:ring-[#9C665C]"
                    />
                    <span className="text-xs font-bold text-amber-900">
                      Entiendo el empalme: Deseo agendar en este horario de todas formas.
                    </span>
                  </label>
                )}

                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#EAE3DA]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs"
                  >
                    {editingEventId ? 'Actualizar Evento' : 'Agendar en Calendario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Vincular con Google Calendar */}
        {showGoogleSyncModal && (
          <div className="fixed inset-0 z-60 bg-[#2B2826]/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3DA] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE3DA]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#4285F4]/10 text-[#1967D2] flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-[#1967D2]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#2B2826]">
                      Vincular con Google Calendar
                    </h3>
                    <p className="text-xs text-[#8A7E72]">
                      Sincronización en vivo con tu celular y computadora
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGoogleSyncModal(false)}
                  className="p-1.5 text-[#8A7E72] hover:text-[#2B2826] hover:bg-[#FAF8F5] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Opción A: Suscripción en Vivo Automática */}
              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2B2826]">
                      Suscripción Automática en Vivo (Recomendada)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#1967D2] bg-[#4285F4]/10 px-2 py-0.5 rounded-full border border-[#4285F4]/20">
                    Sincronización Continua
                  </span>
                </div>
                <p className="text-xs text-[#5A524C] leading-relaxed">
                  Todas las citas de planeación, bodas y eventos de VLB Studio se sincronizarán y actualizarán automáticamente en la app de Google Calendar de tu teléfono (iPhone / Android) y computadora.
                </p>

                {/* Subscription Feed URL */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#8A7E72] uppercase tracking-wider">
                    Enlace de suscripción iCal (.ics):
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed.ics` : '/api/calendar/feed.ics'}
                      className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs font-mono bg-white text-[#2B2826] select-all focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed.ics` : '/api/calendar/feed.ics';
                        navigator.clipboard.writeText(url);
                        setCopiedIcsLink(true);
                        setTimeout(() => setCopiedIcsLink(false), 2500);
                      }}
                      className="px-3 py-2 bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA] rounded-xl text-xs font-semibold shrink-0 transition flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedIcsLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#8A7E72]" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct Action */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <a
                    href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                      typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed.ics` : ''
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 bg-[#1967D2] hover:bg-[#1557B0] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir y Añadir a Google Calendar</span>
                  </a>
                </div>
              </div>

              {/* Guía Rápida de Configuración */}
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE3DA] space-y-2">
                <div className="text-xs font-bold text-[#2B2826] uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>¿Cómo activarlo en Google Calendar?</span>
                </div>
                <ol className="text-xs text-[#5A524C] space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
                  <li>
                    Haz clic en <strong>"Abrir y Añadir a Google Calendar"</strong> (o copia el enlace de arriba).
                  </li>
                  <li>
                    En Google Calendar Web, en la barra lateral izquierda busca <strong>"Otros calendarios"</strong> y presiona el botón <strong>+ &gt; Desde URL</strong>.
                  </li>
                  <li>
                    Pega el enlace y pulsa <strong>Añadir calendario</strong>.
                  </li>
                  <li>
                    ¡Listo! En tu celular, entra a la app de <strong>Google Calendar &gt; Ajustes</strong>, selecciona <strong>LAZO VLB Studio</strong> y activa la casilla de <strong>Sincronización</strong>.
                  </li>
                </ol>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleSyncModal(false)}
                  className="px-5 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
