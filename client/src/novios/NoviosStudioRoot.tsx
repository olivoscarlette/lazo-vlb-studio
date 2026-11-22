import React, { useEffect, useState } from 'react';
import { WeddingProvider, useWedding } from './context/WeddingContext';
import { AppShell } from './components/AppShell';
import { HomeView } from './views/HomeView';
import { BudgetView } from './views/BudgetView';
import { GuestsView } from './views/GuestsView';
import { ChecklistView } from './views/ChecklistView';
import { MyDayView } from './views/MyDayView';
import { ReunionesModule } from '../modules/ReunionesModule';
import { LazoTab } from './types/lazo';

interface NoviosStudioRootProps {
  embedded?: boolean;
  forcedTab?: LazoTab;
  onTabChange?: (tab: LazoTab) => void;
}

const EMBEDDED_TABS: Array<{ id: LazoTab; label: string }> = [
  { id: 'inicio', label: 'Mi Boda' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'invitados', label: 'Invitados & Mesas' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'midia', label: 'El Gran Día' }
];

const NoviosStudioInner: React.FC<NoviosStudioRootProps> = ({
  embedded = false,
  forcedTab,
  onTabChange
}) => {
  const { wedding, loading, saving } = useWedding();
  const [activeTab, setActiveTab] = useState<LazoTab>(forcedTab || 'inicio');

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  const handleSelectTab = (tab: LazoTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  if (loading || !wedding) {
    return (
      <div className="min-h-[60vh] bg-[#FAF8F5] flex flex-col items-center justify-center text-[#2B2826]">
        <div className="w-10 h-10 rounded-full border-2 border-[#EFE8E1] border-t-[#C48B81] animate-spin mb-4" />
        <img
          src="/lazo-logo.png"
          alt="Lazo"
          className="h-9 w-auto object-contain mb-1"
        />
        <span className="text-[11px] text-[#8A7E72] uppercase tracking-[0.22em] mt-1">
          Cargando información de la boda...
        </span>
      </div>
    );
  }

  const content = (
    <>
      {activeTab === 'inicio' && <HomeView onNavigate={handleSelectTab} />}
      {activeTab === 'presupuesto' && <BudgetView />}
      {activeTab === 'invitados' && <GuestsView />}
      {activeTab === 'checklist' && <ChecklistView />}
      {activeTab === 'midia' && <MyDayView />}
      {activeTab === 'reuniones' && <ReunionesModule />}
    </>
  );

  if (embedded) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center p-1 rounded-full bg-white border border-[#EFE8E1] shadow-2xs">
            {EMBEDDED_TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-[#2B2826] text-white shadow-2xs'
                      : 'text-[#7D6F6B] hover:text-[#2B2826]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-[#8A7E72] font-light">
            {saving ? 'Guardando cambios...' : '✓ Sincronizado en tiempo real con Novios'}
          </span>
        </div>
        {content}
      </div>
    );
  }

  return (
    <AppShell activeTab={activeTab} onSelectTab={handleSelectTab}>
      {content}
    </AppShell>
  );
};

export const NoviosStudioRoot: React.FC<NoviosStudioRootProps> = props => {
  return (
    <WeddingProvider>
      <NoviosStudioInner {...props} />
    </WeddingProvider>
  );
};
