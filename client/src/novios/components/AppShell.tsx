import React from 'react';
import { Heart, Wallet, Users, CalendarCheck2, Clock, LogOut, CalendarDays } from 'lucide-react';
import { LazoTab } from '../types/lazo';
import { useWedding } from '../context/WeddingContext';

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
  const isNonWedding = Boolean(wedding?.profile.eventType && !wedding.profile.eventType.toLowerCase().includes('boda'));
  const showReuniones = !flags.isAdmin && !flags.isVirtualNovios;
  const resolvedBaseTabs = BASE_TABS.map(t =>
    t.id === 'inicio' && isNonWedding ? { ...t, label: 'Mi Evento', shortLabel: 'Evento' } : t
  );
  const TABS = showReuniones ? [...resolvedBaseTabs, REUNIONES_TAB] : resolvedBaseTabs;

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
            {wedding && (
              <span className="hidden sm:inline-block text-[11px] text-[#8A7E72] font-light">
                {wedding.profile.partner2?.trim()
                  ? `${wedding.profile.partner1} & ${wedding.profile.partner2}`
                  : wedding.profile.partner1}
              </span>
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
