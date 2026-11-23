import React, { useState, useRef, useEffect } from 'react';
import { Heart, Wallet, Users, CalendarCheck2, Clock, LogOut, CalendarDays, ChevronDown, Check, Sparkles, Plus } from 'lucide-react';
import { LazoTab } from '../types/lazo';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';

interface AppShellProps {
  activeTab: LazoTab;
  onSelectTab: (tab: LazoTab) => void;
  children: React.ReactNode;
}

const BASE_TABS: Array<{ id: LazoTab; label: string; shortLabel: string; icon: React.ElementType }> = [
  { id: 'inicio', label: 'Mi Boda', shortLabel: 'Mi Boda', icon: Heart },
  { id: 'presupuesto', label: 'Presupuesto', shortLabel: 'Gastos', icon: Wallet },
  { id: 'invitados', label: 'Invitados', shortLabel: 'Invitados', icon: Users },
  { id: 'checklist', label: 'Checklist', shortLabel: 'Checklist', icon: CalendarCheck2 },
  { id: 'midia', label: 'El Gran Día', shortLabel: 'Gran Día', icon: Clock }
];

const REUNIONES_TAB = {
  id: 'reuniones' as LazoTab,
  label: 'Reuniones',
  shortLabel: 'Citas',
  icon: CalendarDays
};

export const AppShell: React.FC<AppShellProps> = ({ activeTab, onSelectTab, children }) => {
  const { wedding, flags, exitToLanding } = useWedding();
  const { assignedWeddings, currentWedding, setCurrentWedding, token, refreshUserData } = useAuth();
  const [eventsOpen, setEventsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newEventForm, setNewEventForm] = useState({
    event_type: 'Boda Completa',
    partner_1_name: '',
    partner_2_name: '',
    wedding_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    reception_venue: ''
  });
  const eventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (eventsRef.current && !eventsRef.current.contains(e.target as Node)) {
        setEventsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNonWedding = Boolean(wedding?.profile.eventType && !wedding.profile.eventType.toLowerCase().includes('boda'));
  const showReuniones = !flags.isAdmin && !flags.isVirtualNovios;
  const resolvedBaseTabs = BASE_TABS.map(t =>
    t.id === 'inicio' && isNonWedding ? { ...t, label: 'Mi Evento', shortLabel: 'Evento' } : t
  );
  const TABS = showReuniones ? [...resolvedBaseTabs, REUNIONES_TAB] : resolvedBaseTabs;
  const MAX_NOVIOS_EVENTS = 3;
  const remainingEvents = Math.max(0, MAX_NOVIOS_EVENTS - assignedWeddings.length);
  const newEventIsNonWedding = !newEventForm.event_type.toLowerCase().includes('boda');
  const currentTitle = wedding
    ? wedding.profile.partner2?.trim()
      ? `${wedding.profile.partner1} & ${wedding.profile.partner2}`
      : wedding.profile.partner1
    : currentWedding?.name || 'Mi Evento';

  const openCreateEventModal = () => {
    setEventsOpen(false);
    setCreateError('');
    setNewEventForm({
      event_type: isNonWedding ? 'Boda Completa' : 'Despedida de Soltera',
      partner_1_name: wedding?.profile.partner1 || '',
      partner_2_name: '',
      wedding_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      reception_venue: ''
    });
    setShowCreateModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newEventForm.partner_1_name.trim() || !newEventForm.wedding_date) return;
    setCreatingEvent(true);
    setCreateError('');
    try {
      const res = await fetch('/api/weddings/novios-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          event_type: newEventForm.event_type,
          partner_1_name: newEventForm.partner_1_name.trim(),
          partner_2_name: newEventIsNonWedding ? '' : newEventForm.partner_2_name.trim(),
          wedding_date: newEventForm.wedding_date,
          reception_venue: newEventForm.reception_venue.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || 'No se pudo crear el evento.');
        return;
      }
      await refreshUserData();
      if (data.wedding) {
        setCurrentWedding(data.wedding);
        onSelectTab('inicio');
      }
      setShowCreateModal(false);
    } catch {
      setCreateError('Error de conexión. Intenta nuevamente.');
    } finally {
      setCreatingEvent(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B2826] flex flex-col">
      {/* Top Minimalist Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5] pt-[env(safe-area-inset-top)] border-b border-[#EFE8E1]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('inicio')}
            className="flex items-center cursor-pointer"
            title="Inicio"
          >
            <img
              src="/lazo-logo.png"
              alt="Lazo — Studio Planning"
              className="h-9 sm:h-10 w-auto object-contain select-none"
            />
          </button>

          {/* Desktop 5-Tab Floating Pill Nav */}
          <nav className="hidden md:flex items-center p-1 rounded-full bg-white border border-[#EFE8E1] shadow-2xs">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-[#2B2826] text-white shadow-2xs'
                      : 'text-[#7D6F6B] hover:text-[#2B2826]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {wedding && (
              <div className="relative" ref={eventsRef}>
                <button
                  type="button"
                  onClick={() => setEventsOpen(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF8F5] border border-[#EFE8E1] text-xs text-[#2B2826] shadow-2xs transition cursor-pointer max-w-[190px]"
                  title="Mis Eventos"
                >
                  <Sparkles className="w-3 h-3 text-[#C48B81] shrink-0" />
                  <span className="truncate font-medium">{currentTitle}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#8A7E72] shrink-0 transition-transform ${eventsOpen ? 'rotate-180' : ''}`} />
                </button>

                {eventsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-[#EFE8E1] shadow-xl py-2 z-50">
                    <div className="px-3.5 py-1.5 border-b border-[#F5EFEB] flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7E72]">
                        Mis Eventos
                      </span>
                      <span className="text-[10px] font-medium text-[#C48B81]">
                        {assignedWeddings.length} de {MAX_NOVIOS_EVENTS}
                      </span>
                    </div>
                    <div className="py-1 max-h-64 overflow-y-auto">
                      {assignedWeddings.map(ev => {
                        const isActive = currentWedding?.id === ev.id;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              setCurrentWedding(ev);
                              onSelectTab('inicio');
                              setEventsOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                              isActive ? 'bg-[#F7EDEB]/70' : 'hover:bg-[#FAF8F5]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#2B2826] truncate">
                                {ev.name}
                              </div>
                              <div className="text-[11px] text-[#8A7E72] truncate">
                                {ev.event_type || 'Boda'} {ev.wedding_date ? `· ${ev.wedding_date}` : ''}
                              </div>
                            </div>
                            {isActive && <Check className="w-4 h-4 text-[#C48B81] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 px-2.5 border-t border-[#F5EFEB]">
                      {remainingEvents > 0 ? (
                        <button
                          type="button"
                          onClick={openCreateEventModal}
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3ECE6] text-left flex items-center gap-2 transition cursor-pointer"
                        >
                          <span className="w-6 h-6 rounded-full bg-[#C48B81]/15 text-[#C48B81] flex items-center justify-center shrink-0">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#2B2826]">Crear otro evento</div>
                            <div className="text-[10px] text-[#8A7E72]">
                              Te {remainingEvents === 1 ? 'queda 1 evento incluido' : `quedan ${remainingEvents} eventos incluidos`}
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="px-2 py-1.5 text-[11px] text-[#8A7E72] text-center">
                          Has utilizado tus {MAX_NOVIOS_EVENTS} eventos incluidos.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={exitToLanding}
              title="Salir a la portada"
              className="p-2 rounded-full text-[#8A7E72] hover:text-[#2B2826] hover:bg-white border border-transparent hover:border-[#EFE8E1] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* Mobile Native-Style Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#EFE8E1] pb-safe">
        <div className={`grid ${showReuniones ? 'grid-cols-6' : 'grid-cols-5'} h-16 max-w-md mx-auto`}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  active ? 'text-[#C48B81]' : 'text-[#8A7E72]'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.2]' : 'stroke-[1.7]'}`} />
                <span className="text-[10px] font-medium">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modal: Crear otro evento (hasta 3 por cuenta) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear otro evento"
        subtitle={`Tu cuenta incluye hasta ${MAX_NOVIOS_EVENTS} eventos con tu plan actual (ej. Despedida, Civil y Boda).`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-3.5">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {createError}
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
              Tipo de evento *
            </label>
            <select
              value={newEventForm.event_type}
              onChange={e => setNewEventForm({ ...newEventForm, event_type: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
            >
              <option value="Boda Completa">Boda Completa</option>
              <option value="Boda Civil">Boda Civil</option>
              <option value="Boda Religiosa">Boda Religiosa</option>
              <option value="Despedida de Soltera">Despedida de Soltera</option>
              <option value="XV Años">XV Años</option>
              <option value="Baby Shower">Baby Shower</option>
              <option value="Bautizo">Bautizo</option>
              <option value="Aniversario">Aniversario</option>
              <option value="Cumpleaños">Cumpleaños</option>
              <option value="Evento Social">Otro Evento</option>
            </select>
          </div>

          {newEventIsNonWedding ? (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                Nombre del festejado / evento *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Andrea"
                value={newEventForm.partner_1_name}
                onChange={e => setNewEventForm({ ...newEventForm, partner_1_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                  Novia / Pareja 1 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Andrea"
                  value={newEventForm.partner_1_name}
                  onChange={e => setNewEventForm({ ...newEventForm, partner_1_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                  Novio / Pareja 2 (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mateo"
                  value={newEventForm.partner_2_name}
                  onChange={e => setNewEventForm({ ...newEventForm, partner_2_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                Fecha del evento *
              </label>
              <input
                type="date"
                required
                value={newEventForm.wedding_date}
                onChange={e => setNewEventForm({ ...newEventForm, wedding_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                Ciudad / Sede (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Monterrey"
                value={newEventForm.reception_venue}
                onChange={e => setNewEventForm({ ...newEventForm, reception_venue: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          </div>

          <p className="text-[11px] text-[#8A7E72] leading-relaxed">
            Los eventos creados quedan guardados de forma permanente en tu cuenta (no se pueden eliminar) y heredan tu plan actual.
          </p>

          <button
            type="submit"
            disabled={creatingEvent}
            className="w-full py-3 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold uppercase tracking-wider shadow-2xs transition cursor-pointer disabled:opacity-60"
          >
            {creatingEvent ? 'Creando evento...' : 'Crear Evento'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
