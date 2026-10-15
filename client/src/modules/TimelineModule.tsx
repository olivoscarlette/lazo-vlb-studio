import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TimelineEvent, Vendor, CivilCeremony, ReligiousCeremony } from '../types';
import {
  Clock, Plus, MapPin, User, CheckCircle2,
  Printer, Trash2, Edit3, Play, Calendar,
  Check, ArrowUpRight, MessageSquare, Users, RotateCcw
} from 'lucide-react';

export const TimelineModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const isNovios = user?.role === 'NOVIOS';
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [civilData, setCivilData] = useState<CivilCeremony | null>(null);
  const [religiousData, setReligiousData] = useState<ReligiousCeremony | null>(null);
  const [weddingDetails, setWeddingDetails] = useState<any>(null);
  const [tablesCount, setTablesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // View Mode: 'operation' (Modo Operación) vs 'planning' (Cronograma de planeación)
  const [viewMode, setViewMode] = useState<'operation' | 'planning'>('planning');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [showFullProgramInOp, setShowFullProgramInOp] = useState(false);
  const [vendorLocFilter, setVendorLocFilter] = useState<string>('ALL');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Modal for Add/Edit Timeline Event
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [formData, setFormData] = useState({
    day_type: 'BODA' as 'BODA' | 'CIVIL',
    time: '12:00',
    activity: '',
    location: '',
    responsible: '',
    notes: '',
    status: 'PENDIENTE' as TimelineEvent['status'],
    order_index: 0
  });

  // Live clock for Modo Operación
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('es-MX', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchTimelineAndOpData = async () => {
    if (!currentWedding || !token) return;
    try {
      const [tlRes, vndRes, wedRes, civRes, relRes, tblRes] = await Promise.all([
        fetch(`/api/weddings/${currentWedding.id}/timeline`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}/vendors`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}/civil`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}/religious`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}/tables`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (tlRes.ok) {
        const data = await tlRes.json();
        setTimeline(data.timeline || []);
      }
      if (vndRes.ok) {
        const data = await vndRes.json();
        setVendors(data.vendors || []);
      }
      if (wedRes.ok) {
        const data = await wedRes.json();
        setWeddingDetails(data.wedding || null);
      }
      if (civRes.ok) {
        const data = await civRes.json();
        setCivilData(data.civil || null);
      }
      if (relRes.ok) {
        const data = await relRes.json();
        setReligiousData(data.religious || null);
      }
      if (tblRes.ok) {
        const data = await tblRes.json();
        setTablesCount((data.tables || []).length);
      }
    } catch (err) {
      console.error('Error fetching timeline & operational data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineAndOpData();
  }, [currentWedding, token]);

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setFormData({
      day_type: 'BODA',
      time: '12:00',
      activity: '',
      location: '',
      responsible: '',
      notes: '',
      status: 'PENDIENTE',
      order_index: timeline.length + 1
    });
    setShowEventModal(true);
  };

  const handleOpenEdit = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      day_type: event.day_type === 'CIVIL' ? 'CIVIL' : 'BODA',
      time: event.time,
      activity: event.activity,
      location: event.location || '',
      responsible: event.responsible || '',
      notes: event.notes || '',
      status: event.status,
      order_index: event.order_index
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time || !formData.activity) return;

    try {
      const url = editingEvent
        ? `/api/weddings/${currentWedding!.id}/timeline/${editingEvent.id}`
        : `/api/weddings/${currentWedding!.id}/timeline`;
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowEventModal(false);
        await fetchTimelineAndOpData();
      }
    } catch {}
  };

  const handleSetStatus = async (event: TimelineEvent, newStatus: TimelineEvent['status']) => {
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/timeline/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchTimelineAndOpData();
    } catch {}
  };

  // Complete current activity and automatically start the next pending one if desired
  const handleCompleteAndAdvance = async (currentEvent: TimelineEvent, nextPending?: TimelineEvent | null) => {
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/timeline/${currentEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETADO' })
      });
      if (nextPending) {
        await fetch(`/api/weddings/${currentWedding!.id}/timeline/${nextPending.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'EN_CURSO' })
        });
      }
      await fetchTimelineAndOpData();
    } catch {}
  };

  const handleToggleStatus = async (event: TimelineEvent) => {
    const nextStatus: Record<TimelineEvent['status'], TimelineEvent['status']> = {
      'PENDIENTE': 'EN_CURSO',
      'EN_CURSO': 'COMPLETADO',
      'COMPLETADO': 'PENDIENTE'
    };
    await handleSetStatus(event, nextStatus[event.status]);
  };

  const handleResetProgram = async () => {
    if (!window.confirm('¿Deseas reiniciar las actividades del cronograma a PENDIENTE?')) return;
    try {
      await Promise.all(
        timeline.map(item =>
          fetch(`/api/weddings/${currentWedding!.id}/timeline/${item.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'PENDIENTE' })
          })
        )
      );
      await fetchTimelineAndOpData();
    } catch {}
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta actividad del timeline?')) return;
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/timeline/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchTimelineAndOpData();
    } catch {}
  };

  // Toggle vendor arrival check-in on Wedding Day
  const handleToggleVendorCheckin = async (vendor: Vendor) => {
    if (!currentWedding || !token) return;
    const nextArrived = !Boolean(vendor.arrived);
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/vendors/${vendor.id}/checkin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ arrived: nextArrived })
      });
      if (res.ok) {
        await fetchTimelineAndOpData();
      }
    } catch {}
  };

  const handlePrint = () => {
    window.print();
  };

  const mainWeddingDateRaw = weddingDetails?.wedding_date || currentWedding?.wedding_date || '';
  const civilDateRaw = civilData?.date || '';
  const isCivilSeparateDay = Boolean(civilDateRaw && mainWeddingDateRaw && civilDateRaw !== mainWeddingDateRaw);

  const formatDateSpanish = (rawDate?: string | null) => {
    if (!rawDate) return 'Fecha por definir';
    try {
      const [y, m, d] = rawDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return rawDate;
    }
  };

  const formattedWeddingDate = formatDateSpanish(mainWeddingDateRaw);
  const formattedCivilDate = formatDateSpanish(civilDateRaw || mainWeddingDateRaw);

  const venueLabel =
    weddingDetails?.reception_venue ||
    weddingDetails?.ceremony_venue ||
    currentWedding?.reception_venue ||
    currentWedding?.ceremony_venue ||
    'Lugar por definir';

  // Consolidated timeline sorted chronologically
  const activeTimeline = [...timeline].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const ROLE_TABS = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'COORDINACION', label: 'Coordinación' },
    { id: 'FOTO_VIDEO', label: 'Fotografía & Video' },
    { id: 'BANQUETE', label: 'Banquete' },
    { id: 'MUSICA_DJ', label: 'Música & DJ' }
  ];

  const roleFilteredTimeline = activeTimeline.filter(item => {
    if (roleFilter === 'TODOS') return true;
    const resp = (item.responsible || '').toLowerCase();
    const act = (item.activity || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const combo = `${resp} ${act} ${notes}`;

    if (roleFilter === 'COORDINACION') {
      return combo.includes('coord') || combo.includes('vlb') || combo.includes('staff') || combo.includes('montaje') || combo.includes('revisión') || combo.includes('llegada');
    }
    if (roleFilter === 'FOTO_VIDEO') {
      return combo.includes('foto') || combo.includes('video') || combo.includes('sesión') || combo.includes('first look') || combo.includes('retrato');
    }
    if (roleFilter === 'BANQUETE') {
      return combo.includes('banquet') || combo.includes('cena') || combo.includes('catering') || combo.includes('cocktail') || combo.includes('coctel') || combo.includes('brindis') || combo.includes('pastel') || combo.includes('comida');
    }
    if (roleFilter === 'MUSICA_DJ') {
      return combo.includes('dj') || combo.includes('músic') || combo.includes('banda') || combo.includes('vals') || combo.includes('baile') || combo.includes('fiesta') || combo.includes('audio');
    }
    return true;
  });

  // Operational Timeline progression logic
  const inProgressEvent = activeTimeline.find(t => t.status === 'EN_CURSO') || null;
  const pendingEvents = activeTimeline.filter(t => t.status === 'PENDIENTE');
  const activeOrReadyEvent = inProgressEvent || pendingEvents[0] || null;
  const afterEvent = inProgressEvent
    ? pendingEvents[0] || null
    : pendingEvents[1] || null;

  const completedCount = activeTimeline.filter(t => t.status === 'COMPLETADO').length;

  // Vendor filtering for check-in panel
  const filteredVendors = vendors.filter(v => {
    if (vendorLocFilter === 'ALL') return true;
    return Array.isArray(v.locations) && v.locations.includes(vendorLocFilter);
  });
  const arrivedVendorsCount = vendors.filter(v => Boolean(v.arrived)).length;

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Top Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-semibold tracking-[0.2em] text-[#8E807A] block mb-1">
            {currentWedding?.name || 'Boda VLB Studio'}
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#332C2A] tracking-tight">
            Itinerario / Timeline<span className="text-[#D4A5A5]">.</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#786C68] mt-3">
            <span className="inline-flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8E807A]" />
              <span>Fecha: {formattedWeddingDate}</span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8E807A]" />
              <span>{venueLabel}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8F5] text-[#5A524C] border border-[#DDD2C4]">
              {activeTimeline.length} {activeTimeline.length === 1 ? 'actividad' : 'actividades'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {viewMode === 'operation' && !isNovios && (
            <button
              onClick={() => setShowFullProgramInOp(!showFullProgramInOp)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#363432] hover:bg-[#242220] text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{showFullProgramInOp ? 'Ocultar programa completo' : 'Ver programa completo'}</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-[#EFE8DE] text-[#332C2A] text-xs font-medium rounded-xl border border-[#DDD2C4] transition"
          >
            <Printer className="w-3.5 h-3.5 text-[#786C68]" />
            <span>Imprimir</span>
          </button>
          {!isNovios && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#9C665C] hover:bg-[#8a574e] text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Actividad</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Bar (Hidden for Novios, no day tabs) */}
      {!isNovios && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5DEC9]">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                viewMode === 'operation' ? 'bg-[#6B8E6E] animate-pulse' : 'bg-[#9C665C]'
              }`}
            />
            <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#6E655F]">
              {viewMode === 'operation'
                ? 'MODO OPERACIÓN EN VIVO'
                : 'CRONOGRAMA DE PLANEACIÓN'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-medium text-[#5A524C]">{currentTimeStr}</span>
            <button
              onClick={() => setViewMode(viewMode === 'operation' ? 'planning' : 'operation')}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#EFECE6] hover:bg-[#E5DFD5] text-[#332C2A] border border-[#DDD2C4] transition"
            >
              {viewMode === 'operation' ? 'Ver cronograma de planeación' : '⚡ Ir a Modo Operación'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODO OPERACIÓN (Staff/Admin/Coord) vs CRONOGRAMA DE PLANEACIÓN             */}
      {/* ========================================================================= */}
      {(!isNovios && viewMode === 'operation') ? (
        <div className="space-y-8">
          {/* 1. Primary 2-Column Live Progression Cards (Identical layout to reference image) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Card: Soft Editorial Blush (#EAD8DE / #EFE2DF) */}
            <div className="lg:col-span-7 rounded-3xl p-7 sm:p-8 bg-[#EAD8DE]/85 border border-[#DFC9D0] flex flex-col justify-between min-h-[250px] shadow-2xs">
              {activeOrReadyEvent ? (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#856A72]">
                        {inProgressEvent ? 'EN CURSO AHORA' : 'LISTOS PARA COMENZAR'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/80 text-[#332C2A] font-mono text-xs font-bold border border-[#DFC9D0]">
                        {activeOrReadyEvent.time} hrs
                      </span>
                    </div>

                    <h3 className="font-serif text-3xl sm:text-4xl text-[#332C2A] mt-4 leading-tight">
                      {activeOrReadyEvent.activity}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#5E4B50] mt-3">
                      {activeOrReadyEvent.location && (
                        <span className="inline-flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{activeOrReadyEvent.location}</span>
                        </span>
                      )}
                      {activeOrReadyEvent.responsible && (
                        <span className="inline-flex items-center space-x-1.5 font-medium">
                          <User className="w-3.5 h-3.5" />
                          <span>Resp: {activeOrReadyEvent.responsible}</span>
                        </span>
                      )}
                    </div>

                    {activeOrReadyEvent.notes && (
                      <p className="mt-3 text-xs text-[#5E4B50] bg-white/60 px-3.5 py-2 rounded-xl border border-[#DFC9D0]/60">
                        {activeOrReadyEvent.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-4 border-t border-[#DFC9D0]/70">
                    {!inProgressEvent ? (
                      <>
                        <button
                          onClick={() => handleSetStatus(activeOrReadyEvent, 'EN_CURSO')}
                          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#363432] hover:bg-[#242220] text-white text-xs font-semibold rounded-xl transition shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Iniciar actividad</span>
                        </button>
                        <button
                          onClick={() => handleCompleteAndAdvance(activeOrReadyEvent, afterEvent)}
                          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white/80 hover:bg-white text-[#332C2A] text-xs font-semibold rounded-xl border border-[#DFC9D0] transition"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Marcar completada</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCompleteAndAdvance(activeOrReadyEvent, afterEvent)}
                          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#363432] hover:bg-[#242220] text-white text-xs font-semibold rounded-xl transition shadow-xs"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Completar y pasar a la siguiente</span>
                        </button>
                        <button
                          onClick={() => handleSetStatus(activeOrReadyEvent, 'PENDIENTE')}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white/75 hover:bg-white text-[#5E4B50] text-xs font-medium rounded-xl border border-[#DFC9D0] transition"
                        >
                          <span>Pausar</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#856A72]">
                      LISTOS PARA COMENZAR
                    </span>
                    <div className="text-5xl text-[#363432] mt-6 mb-4 font-serif">✓</div>
                    <h3 className="font-serif text-3xl sm:text-4xl text-[#363432]">
                      Programa completado
                    </h3>
                    <p className="text-xs text-[#6E565E] mt-2">
                      {activeTimeline.length > 0
                        ? `Se completaron las ${activeTimeline.length} actividades del cronograma.`
                        : 'Aún no hay actividades cargadas en el cronograma.'}
                    </p>
                  </div>
                  {activeTimeline.length > 0 && (
                    <div className="mt-6">
                      <button
                        onClick={handleResetProgram}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white/80 hover:bg-white text-[#363432] text-xs font-medium rounded-xl border border-[#DFC9D0] transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reiniciar programa</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Card: Warm Sand (#EFE8DE) — "DESPUÉS" */}
            <div className="lg:col-span-5 rounded-3xl p-7 sm:p-8 bg-[#EFE8DE] border border-[#DDD2C4] flex flex-col justify-between min-h-[250px] shadow-2xs">
              <div>
                <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#8E807A]">
                  DESPUÉS
                </span>

                {afterEvent ? (
                  <div className="mt-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-white/80 text-[#332C2A] font-mono text-xs font-bold border border-[#DDD2C4] mb-2">
                      {afterEvent.time} hrs
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl text-[#332C2A] leading-snug">
                      {afterEvent.activity}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E655F] mt-2.5">
                      {afterEvent.location && (
                        <span className="inline-flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{afterEvent.location}</span>
                        </span>
                      )}
                      {afterEvent.responsible && (
                        <span className="inline-flex items-center space-x-1 font-medium">
                          <User className="w-3.5 h-3.5" />
                          <span>{afterEvent.responsible}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <h3 className="font-serif text-3xl text-[#363432] mt-4 leading-snug">
                    No hay más actividades pendientes
                  </h3>
                )}
              </div>

              <div className="mt-6 pt-4 text-center">
                <button
                  onClick={() => setShowFullProgramInOp(!showFullProgramInOp)}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#6E655F] hover:text-[#332C2A] transition"
                >
                  <span>{showFullProgramInOp ? 'Ocultar todo el programa' : 'Ver todo el programa'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#786C68]">
            Las actividades avanzan cuando el equipo las inicia o completa. El horario previsto se conserva, incluso si hay retrasos.
          </p>

          {/* Collapsible Full Program inside Operation Mode */}
          {showFullProgramInOp && (
            <div className="luxury-card rounded-3xl p-6 border border-[#DDD2C4] space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DE]">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#8a574e]">
                    Programa Minuto a Minuto ({completedCount}/{activeTimeline.length} completadas)
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-[#332C2A]">
                    Control de Actividades en Vivo
                  </h3>
                </div>
                <button
                  onClick={handleResetProgram}
                  className="text-xs text-[#786C68] hover:text-[#332C2A] inline-flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar todo</span>
                </button>
              </div>

              {/* Role Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {ROLE_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRoleFilter(tab.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                      roleFilter === tab.id
                        ? 'bg-[#9C665C] text-white shadow-xs'
                        : 'bg-[#FCFAF7] text-[#5A524C] hover:bg-[#EFE8DE] border border-[#DDD2C4]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-[#EFE8DE]">
                {roleFilteredTimeline.map(item => (
                  <div
                    key={item.id}
                    className={`py-3.5 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      item.status === 'EN_CURSO'
                        ? 'bg-[#EAD8DE]/45 border border-[#DFC9D0]'
                        : item.status === 'COMPLETADO'
                        ? 'opacity-65'
                        : 'hover:bg-[#F9F6F2]'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#EFE8DE] text-[#332C2A] border border-[#DDD2C4] shrink-0">
                        {item.time}
                      </span>
                      <div>
                        <div className={`font-serif text-lg font-bold ${item.status === 'COMPLETADO' ? 'line-through text-[#786C68]' : 'text-[#332C2A]'}`}>
                          {item.activity}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#786C68]">
                          {item.location && <span>📍 {item.location}</span>}
                          {item.responsible && <span>👤 Resp: {item.responsible}</span>}
                          {item.notes && <span className="italic">“{item.notes}”</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {item.status !== 'EN_CURSO' && item.status !== 'COMPLETADO' && (
                        <button
                          onClick={() => handleSetStatus(item, 'EN_CURSO')}
                          className="px-3 py-1.5 rounded-xl bg-[#363432] text-white text-[11px] font-semibold hover:bg-[#242220] transition"
                        >
                          Iniciar
                        </button>
                      )}
                      {item.status !== 'COMPLETADO' ? (
                        <button
                          onClick={() => handleSetStatus(item, 'COMPLETADO')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 transition inline-flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Completar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetStatus(item, 'PENDIENTE')}
                          className="px-3 py-1.5 rounded-xl bg-[#EFE8DE] text-[#5A524C] text-[11px] font-medium hover:bg-[#E2D9CC] transition"
                        >
                          Reabrir
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-[#786C68] hover:text-[#332C2A] rounded-lg"
                        title="Editar actividad"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Check-in de Llegada de Proveedores (Día Boda) */}
          <div className="luxury-card rounded-3xl p-6 sm:p-7 border border-[#DDD2C4] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE8DE]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#8a574e]">
                  Recepción de Proveedores en Campo
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#332C2A] mt-0.5">
                  Check-in de Llegada de Proveedores
                </h3>
                <p className="text-xs text-[#786C68] mt-0.5">
                  Marca la llegada de cada proveedor en tiempo real. (Vista operativa sin costos ni saldos financieros).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#EFE2DF] text-[#6E433F] border border-[#DFC9C4]">
                  {arrivedVendorsCount} de {vendors.length} en sitio
                </span>
              </div>
            </div>

            {/* Location Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'IGLESIA', 'CIVIL', 'RECEPCIÓN', 'OTRO'] as const).map(loc => (
                <button
                  key={loc}
                  onClick={() => setVendorLocFilter(loc)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    vendorLocFilter === loc
                      ? 'bg-[#363432] text-white'
                      : 'bg-[#F9F6F2] text-[#786C68] border border-[#DDD2C4] hover:border-[#9C665C]'
                  }`}
                >
                  {loc === 'ALL' ? 'Todos los Proveedores' : loc}
                </button>
              ))}
            </div>

            {filteredVendors.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#786C68] bg-[#F9F6F2] rounded-2xl border border-dashed border-[#DDD2C4]">
                No hay proveedores registrados en esta ubicación.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredVendors.map(v => {
                  const isArrived = Boolean(v.arrived);
                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isArrived
                          ? 'bg-[#EFF5F0] border-[#BBD4BF]'
                          : 'bg-[#FFFFFF] border-[#DDD2C4] hover:border-[#9C665C]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EFE8DE] text-[#5A524C]">
                            {v.type}
                          </span>
                          {Array.isArray(v.locations) &&
                            v.locations.map(loc => (
                              <span
                                key={loc}
                                className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-[#F9F6F2] text-[#786C68] border border-[#DDD2C4]"
                              >
                                {loc}
                              </span>
                            ))}
                        </div>

                        <div className="font-serif text-lg font-bold text-[#332C2A] mt-1 truncate">
                          {v.name}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#786C68] mt-1">
                          {v.contact_person && <span>Contacto: {v.contact_person}</span>}
                          {v.phone && (
                            <a
                              href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-[#8a574e] hover:underline font-mono"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{v.phone}</span>
                            </a>
                          )}
                        </div>

                        {v.notes && (
                          <div className="text-[11px] text-[#786C68] italic mt-1 truncate" title={v.notes}>
                            {v.notes}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleVendorCheckin(v)}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs ${
                            isArrived
                              ? 'bg-[#3B6E45] text-white hover:bg-[#2F5937]'
                              : 'bg-[#EFE8DE] text-[#332C2A] hover:bg-[#363432] hover:text-white border border-[#DDD2C4]'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            {isArrived
                              ? `Llegó ${v.arrived_at ? `(${v.arrived_at})` : ''}`
                              : 'Marcar llegada'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Ficha Operativa Rápida (Información relevante de la operación del Día Boda) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Ceremonias y Sedes */}
            <div className="luxury-card rounded-3xl p-6 border border-[#DDD2C4] space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8a574e]">
                Sedes y Horarios Clave
              </span>
              <h4 className="font-serif text-xl font-bold text-[#332C2A]">
                Ceremonias y Recepción
              </h4>
              <div className="space-y-2.5 text-xs text-[#5A524C] pt-1">
                <div className="p-3 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                  <div className="font-bold text-[#332C2A]">Ceremonia Religiosa</div>
                  <div>📍 {religiousData?.temple_name || weddingDetails?.ceremony_venue || 'Por definir'}</div>
                  <div>🕒 {religiousData?.time || weddingDetails?.ceremony_time || 'Por definir'} hrs</div>
                  {religiousData?.officiant && <div>👤 Oficiante: {religiousData.officiant}</div>}
                </div>
                <div className={`p-3 rounded-xl border ${isCivilSeparateDay ? 'bg-[#FFF7ED] border-[#FED7AA]' : 'bg-[#F9F6F2] border border-[#EFE8DE]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#332C2A]">Ceremonia Civil</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isCivilSeparateDay
                          ? 'bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]'
                          : 'bg-[#EFF5F0] text-[#3B6E45] border border-[#BBD4BF]'
                      }`}
                    >
                      {isCivilSeparateDay ? `Otro día: ${civilData?.date}` : 'Mismo día boda'}
                    </span>
                  </div>
                  <div className="mt-1">📍 {civilData?.location || weddingDetails?.reception_venue || 'Por definir'}</div>
                  <div>🕒 {civilData?.time || 'Por definir'} hrs</div>
                  {civilData?.juez_oficial && <div>👤 Juez: {civilData.juez_oficial}</div>}
                </div>
                <div className="p-3 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                  <div className="font-bold text-[#332C2A]">Recepción</div>
                  <div>📍 {weddingDetails?.reception_venue || 'Por definir'}</div>
                  <div>🕒 {weddingDetails?.reception_time || 'Por definir'} hrs</div>
                </div>
              </div>
            </div>

            {/* Aforo Confirmado y Mesas */}
            <div className="luxury-card rounded-3xl p-6 border border-[#DDD2C4] space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8a574e]">
                Aforo en Sitio
              </span>
              <h4 className="font-serif text-xl font-bold text-[#332C2A]">
                Invitados y Mesas
              </h4>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-[#EFE2DF]/50 border border-[#DFC9C4]">
                  <div className="text-[10px] uppercase font-bold text-[#82524D]">Confirmados (+1)</div>
                  <div className="text-3xl font-serif font-bold text-[#332C2A] mt-1">
                    {weddingDetails?.stats?.guests?.confirmed_total_seats || 0}
                  </div>
                  <div className="text-[11px] text-[#786C68]">Lugares seguros</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#EFE8DE]/70 border border-[#DDD2C4]">
                  <div className="text-[10px] uppercase font-bold text-[#6D5A43]">Mesas Activas</div>
                  <div className="text-3xl font-serif font-bold text-[#332C2A] mt-1">
                    {tablesCount}
                  </div>
                  <div className="text-[11px] text-[#786C68]">En layout oficial</div>
                </div>
              </div>
              {weddingDetails?.notes && (
                <div className="p-3 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE] text-xs text-[#5A524C] mt-2">
                  <div className="font-bold text-[#332C2A] mb-0.5">Notas Generales de Boda:</div>
                  <div>{weddingDetails.notes}</div>
                </div>
              )}
            </div>

            {/* Equipo VLB Asignado en Campo */}
            <div className="luxury-card rounded-3xl p-6 border border-[#DDD2C4] space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8a574e]">
                Coordinación en Campo
              </span>
              <h4 className="font-serif text-xl font-bold text-[#332C2A]">
                Equipo VLB en Sitio
              </h4>
              <div className="space-y-2 pt-1">
                {Array.isArray(weddingDetails?.team) && weddingDetails.team.length > 0 ? (
                  weddingDetails.team.map((member: any) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#332C2A]">{member.name}</div>
                        <div className="text-[11px] text-[#786C68]">{member.assigned_role || member.role}</div>
                      </div>
                      {member.phone && (
                        <a
                          href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#EFE2DF] text-[#6E433F] font-semibold text-[11px] hover:bg-[#E2CFCB] transition inline-flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#786C68]">Equipo VLB Studio asignado.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CRONOGRAMA DE PLANEACIÓN (VISTA COMPLETA EDITABLE)                        */
        /* ========================================================================= */
        <div>
          {loading ? (
            <div className="py-12 text-center text-[#8A7E72] text-sm">Cargando timeline...</div>
          ) : roleFilteredTimeline.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-[#8A7E72] text-sm border border-dashed border-[#EAE3DA]">
              No hay actividades programadas con el filtro seleccionado en el cronograma.
            </div>
          ) : (
            <div>
              {/* Role Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-xs font-semibold text-[#8A7E72] mr-1">Filtrar por rol:</span>
                {ROLE_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRoleFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      roleFilter === tab.id
                        ? 'bg-[#9C665C] text-white shadow-xs'
                        : 'bg-white text-[#2B2826] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EAE3DA]">
                {roleFilteredTimeline.map(item => (
                  <div
                    key={item.id}
                    className="relative bg-white rounded-3xl p-5 border border-[#EAE3DA] hover:border-[#9C665C]/40 shadow-xs transition"
                  >
                    {/* Status Dot on the vertical line */}
                    <div
                      onClick={() => handleToggleStatus(item)}
                      title="Haz clic para avanzar estatus"
                      className={`absolute -left-7 sm:-left-8 top-6 w-3 h-3 rounded-full cursor-pointer ring-4 ring-white transition ${
                        item.status === 'COMPLETADO'
                          ? 'bg-[#4B7355]'
                          : item.status === 'EN_CURSO'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-[#DDD2C4]'
                      }`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-[#2B2826] bg-[#FAF8F5] px-3 py-1 rounded-xl border border-[#EAE3DA]">
                          {item.time} hrs
                        </span>
                        <h3 className="font-serif text-lg font-semibold text-[#2B2826]">
                          {item.activity}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Botón Rápido Completado para Día Boda */}
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                            item.status === 'COMPLETADO'
                              ? 'bg-[#E4ECE5] text-[#2B5235] border-[#BDD4C1]'
                              : item.status === 'EN_CURSO'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border-[#EAE3DA]'
                          }`}
                          title="Haz clic para alternar estatus en tiempo real"
                        >
                          <Check className="w-3.5 h-3.5 text-[#4B7355]" />
                          <span>{item.status === 'COMPLETADO' ? 'Completado' : item.status === 'EN_CURSO' ? 'En Curso' : 'Marcar Hecho'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-[#8A7E72] hover:text-[#2B2826] p-1.5 rounded-xl hover:bg-[#FAF8F5] transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(item.id)}
                          className="text-[#8A7E72]/60 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#8A7E72] mt-2">
                      {item.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-[#8A7E72]" />
                          <span>{item.location}</span>
                        </div>
                      )}
                      {item.responsible && (
                        <div className="flex items-center space-x-1 font-medium text-[#2B2826]">
                          <User className="w-3.5 h-3.5 text-[#8A7E72]" />
                          <span>Resp: {item.responsible}</span>
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-[#2B2826] mt-2 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE3DA] italic">
                        {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Agregar / Editar Evento */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3DA] animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-semibold text-[#2B2826] mb-4">
              {editingEvent ? 'Editar Actividad' : 'Nueva Actividad en Timeline'}
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-3">

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">Hora *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs font-mono bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">Actividad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Entrada de Novios al Salón"
                    value={formData.activity}
                    onChange={e => setFormData({ ...formData, activity: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">Ubicación</label>
                  <input
                    type="text"
                    placeholder="Salón Principal"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">Responsable</label>
                  <input
                    type="text"
                    placeholder="Mariana / DJ"
                    value={formData.responsible}
                    onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Estatus</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_CURSO">EN CURSO</option>
                  <option value="COMPLETADO">COMPLETADO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Notas Operativas</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones para el staff, música especial, etc."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#FAF8F5]">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#8A7E72] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
