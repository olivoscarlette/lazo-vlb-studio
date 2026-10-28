import React from 'react';
import { WorkspaceTab } from './Sidebar';

interface NoviosTopNavProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
}

interface NoviosTabDef {
  id: WorkspaceTab;
  label: string;
}

export const NoviosTopNav: React.FC<NoviosTopNavProps> = ({ currentTab, onSelectTab }) => {
  // Orden exacto autorizado para Novios:
  // dashboard, reuniones, proveedores y pagos, checklist, invitados, civil, religiosa, documentos y timeline
  const tabs: NoviosTabDef[] = [
    { id: 'resumen', label: 'Dashboard' },
    { id: 'reuniones', label: 'Reuniones' },
    { id: 'proveedores', label: 'Proveedores y Pagos' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'invitados', label: 'Invitados' },
    { id: 'civil', label: 'Civil' },
    { id: 'religiosa', label: 'Religiosa' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="w-full bg-[#FAF7F5]/95 backdrop-blur-md border-b border-[#EFE8E1] sticky top-16 sm:top-[72px] z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <nav
          className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar scroll-smooth"
          aria-label="Navegación Novios"
        >
          {tabs.map(tab => {
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer shrink-0 select-none outline-none focus:outline-none ${
                  isActive
                    ? 'bg-white text-[#2B2826] shadow-xs border border-[#EFE8E1]'
                    : 'text-[#7D6F6B] hover:text-[#2B2826] hover:bg-white/50'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
