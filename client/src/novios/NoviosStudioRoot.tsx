import React, { useState } from 'react';
import { WeddingProvider, useWedding } from './context/WeddingContext';
import { AppShell } from './components/AppShell';
import { HomeView } from './views/HomeView';
import { BudgetView } from './views/BudgetView';
import { GuestsView } from './views/GuestsView';
import { ChecklistView } from './views/ChecklistView';
import { MyDayView } from './views/MyDayView';
import { LazoTab } from './types/lazo';

const NoviosStudioInner: React.FC = () => {
  const { wedding, loading } = useWedding();
  const [activeTab, setActiveTab] = useState<LazoTab>('inicio');

  if (loading || !wedding) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center text-[#2B2826]">
        <div className="w-10 h-10 rounded-full border-2 border-[#EFE8E1] border-t-[#C48B81] animate-spin mb-4" />
        <span className="font-editorial text-2xl tracking-[0.26em] text-[#2B2826]">LAZO</span>
        <span className="text-[11px] text-[#8A7E72] uppercase tracking-[0.22em] mt-1">
          Preparando tu boda...
        </span>
      </div>
    );
  }

  return (
    <AppShell activeTab={activeTab} onChangeTab={setActiveTab}>
      {activeTab === 'inicio' && <HomeView onNavigate={setActiveTab} />}
      {activeTab === 'presupuesto' && <BudgetView />}
      {activeTab === 'invitados' && <GuestsView />}
      {activeTab === 'checklist' && <ChecklistView />}
      {activeTab === 'midia' && <MyDayView />}
    </AppShell>
  );
};

export const NoviosStudioRoot: React.FC = () => {
  return (
    <WeddingProvider>
      <NoviosStudioInner />
    </WeddingProvider>
  );
};
