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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          className="flex items-center space-x-6 sm:space-x-8 md:space-x-9 overflow-x-auto no-scrollbar scroll-smooth py-1"
          aria-label="Navegación Novios"
        >
          {tabs.map(tab => {
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group relative py-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 select-none outline-none focus:outline-none ${
                  isActive
                    ? 'text-[#2B2826] font-semibold'
                    : 'text-[#7D6F6B] hover:text-[#C48B81]'
                }`}
              >
                <span>{tab.label}</span>

                {/* Indicador activo: Punto y Línea en Rosa Terracota (Idéntico a la imagen editorial) */}
                {isActive && (
                  <div className="absolute left-0 right-0 -bottom-1 flex flex-col items-center pointer-events-none">
                    {/* Punto superior centrado */}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81] mb-1" />
                    {/* Línea inferior en rosa satinado */}
                    <span className="w-full h-[2px] bg-[#C48B81] rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
