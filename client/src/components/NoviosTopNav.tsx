import React from 'react';
import { WorkspaceTab } from './Sidebar';

interface NoviosTopNavProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
}

interface NoviosTabDef {
  id: WorkspaceTab;
  label: string;
  aliases?: WorkspaceTab[];
}

export const NoviosTopNav: React.FC<NoviosTopNavProps> = ({ currentTab, onSelectTab }) => {
  // Los 5 elementos exactos de la propuesta visual de novios:
  // Dashboard · Invitados · Presupuesto · Timeline · Proveedores
  const tabs: NoviosTabDef[] = [
    { id: 'resumen', label: 'Dashboard', aliases: ['resumen'] },
    { id: 'invitados', label: 'Invitados', aliases: ['invitados', 'mesas'] },
    { id: 'proveedores', label: 'Presupuesto', aliases: ['proveedores'] },
    { id: 'timeline', label: 'Timeline', aliases: ['timeline'] },
    { id: 'reuniones', label: 'Proveedores', aliases: ['reuniones', 'civil', 'religiosa'] },
  ];

  return (
    <div className="w-full bg-[#FAF7F5]/95 backdrop-blur-md border-b border-[#EFE8E1] sticky top-16 sm:top-[72px] z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          className="flex items-center space-x-8 sm:space-x-12 overflow-x-auto no-scrollbar scroll-smooth py-2"
          aria-label="Navegación Novios"
        >
          {tabs.map(tab => {
            const isActive =
              currentTab === tab.id ||
              (tab.aliases && tab.aliases.includes(currentTab));

            return (
              <button
                key={tab.label}
                onClick={() => onSelectTab(tab.id)}
                className={`group relative py-3 text-sm sm:text-base font-medium transition-colors cursor-pointer shrink-0 select-none ${
                  isActive
                    ? 'text-[#2B2826] font-semibold'
                    : 'text-[#5E524E] hover:text-[#C48B81]'
                }`}
              >
                <span>{tab.label}</span>

                {/* Indicador activo: Punto y Línea en Rosa Terracota (Idéntico a la imagen 3) */}
                {isActive && (
                  <div className="absolute left-0 right-0 -bottom-2 flex flex-col items-center">
                    {/* Punto superior centrado */}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81] mb-1 animate-fadeIn" />
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
