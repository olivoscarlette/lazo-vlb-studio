import React, { useState, useRef, useEffect } from 'react';
import { Heart, Wallet, Users, CalendarCheck2, Clock, LogOut, CalendarDays, ChevronDown, Check, Sparkles } from 'lucide-react';
import { LazoTab } from '../types/lazo';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../../context/AuthContext';

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
  const { assignedWeddings, currentWedding, setCurrentWedding } = useAuth();
  const [eventsOpen, setEventsOpen] = useState(false);
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
  const hasMultipleEvents = assignedWeddings.length > 1;
  const currentTitle = wedding
    ? wedding.profile.partner2?.trim()
      ? `${wedding.profile.partner1} & ${wedding.profile.partner2}`
      : wedding.profile.partner1
    : currentWedding?.name || 'Mi Evento';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B2826] flex flex-col">
      {/* Top Minimalist Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EFE8E1]">
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
            {hasMultipleEvents ? (
              <div className="relative" ref={eventsRef}>
                <button
                  type="button"
                  onClick={() => setEventsOpen(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF8F5] border border-[#EFE8E1] text-xs text-[#2B2826] shadow-2xs transition cursor-pointer max-w-[180px]"
                  title="Cambiar entre tus eventos"
                >
                  <Sparkles className="w-3 h-3 text-[#C48B81] shrink-0" />
                  <span className="truncate font-medium">{currentTitle}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#8A7E72] shrink-0 transition-transform ${eventsOpen ? 'rotate-180' : ''}`} />
                </button>

                {eventsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-[#EFE8E1] shadow-xl py-2 z-50">
                    <div className="px-3.5 py-1.5 border-b border-[#F5EFEB]">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7E72]">
                        Mis Eventos ({assignedWeddings.length})
                      </span>
                    </div>
                    <div className="py-1 max-h-72 overflow-y-auto">
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
                  </div>
                )}
              </div>
            ) : wedding ? (
              <span className="hidden sm:inline-block text-[11px] text-[#8A7E72] font-light">
                {currentTitle}
              </span>
            ) : null}
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFE8E1] pb-safe">
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
    </div>
  );
};
