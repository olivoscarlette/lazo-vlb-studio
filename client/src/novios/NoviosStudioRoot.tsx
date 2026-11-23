import React, { useEffect, useState } from 'react';
import { WeddingProvider, useWedding } from './context/WeddingContext';
import { useAuth } from '../context/AuthContext';
import { AppShell } from './components/AppShell';
import { WelcomeScreen } from './components/WelcomeScreen';
import { HomeView } from './views/HomeView';
import { BudgetView } from './views/BudgetView';
import { GuestsView } from './views/GuestsView';
import { ChecklistView } from './views/ChecklistView';
import { MyDayView } from './views/MyDayView';
import { NoviosReunionesView } from './views/NoviosReunionesView';
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
  const { wedding, flags, loading, saving, updateWedding } = useWedding();
  const { user, currentWedding } = useAuth();
  const [activeTab, setActiveTab] = useState<LazoTab>(forcedTab || 'inicio');
  const [dismissedWelcomeIds, setDismissedWelcomeIds] = useState<Record<string, boolean>>({});

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
      {activeTab === 'reuniones' && <NoviosReunionesView />}
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

  // First-time exclusive welcome screen for NOVIOS only
  // (Demo/recording mode: always show on load for Andrea's Despedida test event)
  const weddingIdKey = currentWedding?.id || '';
  const isAndreaDespedidaDemo =
    weddingIdKey === 'wed_1795461449591_ik0w' ||
    (wedding.profile.partner1.trim().toLowerCase() === 'andrea' &&
      (wedding.profile.eventType || '').toLowerCase().includes('despedida'));
  const localSeen =
    typeof window !== 'undefined' && weddingIdKey
      ? localStorage.getItem(`lazo_welcome_seen_${weddingIdKey}`) === '1'
      : false;
  const shouldShowWelcome =
    user?.role === 'NOVIOS' &&
    Boolean(weddingIdKey) &&
    !dismissedWelcomeIds[weddingIdKey] &&
    (isAndreaDespedidaDemo || (!wedding.profile.welcomeSeen && !localSeen));

  if (shouldShowWelcome) {
    return (
      <WelcomeScreen
        profile={wedding.profile}
        isVirtualNovios={flags.isVirtualNovios}
        onEnter={() => {
          setDismissedWelcomeIds(prev => ({ ...prev, [weddingIdKey]: true }));
          if (!isAndreaDespedidaDemo) {
            if (typeof window !== 'undefined' && weddingIdKey) {
              localStorage.setItem(`lazo_welcome_seen_${weddingIdKey}`, '1');
            }
            updateWedding(prev => ({
              ...prev,
              profile: { ...prev.profile, welcomeSeen: true }
            }));
          }
        }}
      />
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
