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
  initialGuestsSubTab?: 'lista' | 'mesas';
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
  initialGuestsSubTab,
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
      {activeTab === 'invitados' && <GuestsView initialSubTab={initialGuestsSubTab} />}
      {activeTab === 'checklist' && <ChecklistView />}
      {activeTab === 'midia' && <MyDayView />}
      {activeTab === 'reuniones' && <ReunionesModule />}
    </>
  );

  if (embedded) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 pb-12">
        <div className="flex justify-end">
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
