import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarCheck2, Users2, Grid2x2Check,
  CreditCard, Landmark, Church, Clock3, CheckSquare,
  FileText, BarChart3, Contact2, History, X, MessageSquare,
  ChevronLeft, Sparkles, Calendar, PanelLeft
} from 'lucide-react';

export type WorkspaceTab =
  | 'resumen'
  | 'reuniones'
  | 'invitados'
  | 'mesas'
  | 'proveedores'
  | 'civil'
  | 'religiosa'
  | 'timeline'
  | 'checklist'
  | 'documentos'
  | 'reportes'
  | 'directorio'
  | 'bitacora'
  | 'whatsapp'
  | 'calendario';

interface SidebarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
  weddingDayMode?: boolean;
  onToggleWeddingDayMode?: () => void;
}

interface MenuItemDef {
  id: WorkspaceTab;
  label: string;
  icon: React.ElementType;
  hiddenForNovios?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  onToggle,
  weddingDayMode = false,
  onToggleWeddingDayMode
}) => {
  const { user, currentWedding, setCurrentWedding } = useAuth();

  if (!user || !currentWedding || user.role === 'NOVIOS') return null;

  const isNovios = user.role === 'NOVIOS';

  // Si weddingDayMode está activo, SOLO se muestran Modo Operación, Asignación de Mesas y Listado de Invitados
  const sections: { title: string; items: MenuItemDef[] }[] = weddingDayMode
    ? [
        {
          title: 'OPERACIÓN EN VIVO',
          items: [
            { id: 'timeline', label: 'Modo Operación', icon: Clock3 },
            { id: 'mesas', label: 'Asignación de Mesas', icon: Grid2x2Check },
            { id: 'invitados', label: 'Listado de Invitados', icon: Users2 }
          ]
        }
      ]
    : [
        {
          title: 'PLANIFICACIÓN',
          items: [
            { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
            { id: 'reuniones', label: 'Información y Reuniones', icon: CalendarCheck2 },
            { id: 'checklist', label: 'Checklist', icon: CheckSquare },
            { id: 'proveedores', label: 'Proveedores y Pagos', icon: CreditCard }
          ]
        },
        {
          title: 'LOGÍSTICA & INVITADOS',
          items: [
            { id: 'timeline', label: 'Timeline', icon: Clock3 },
            { id: 'invitados', label: 'Invitados y Confirmaciones', icon: Users2 },
            { id: 'mesas', label: 'Mesas y Layout', icon: Grid2x2Check },
            { id: 'civil', label: 'Civil', icon: Landmark },
            { id: 'religiosa', label: 'Ceremonia Religiosa', icon: Church }
          ]
        },
        {
          title: 'GESTIÓN & ARCHIVOS',
          items: [
            { id: 'calendario', label: 'Calendario General', icon: Calendar, hiddenForNovios: true },
            { id: 'whatsapp', label: 'WhatsApp Hub', icon: MessageSquare, hiddenForNovios: true },
            { id: 'documentos', label: 'Documentos', icon: FileText },
            { id: 'reportes', label: 'Reportes', icon: BarChart3 },
            { id: 'directorio', label: 'Directorio', icon: Contact2, hiddenForNovios: true },
            { id: 'bitacora', label: 'Bitácora', icon: History, hiddenForNovios: true }
          ]
        }
      ];

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleItemClick = (id: WorkspaceTab) => {
    onSelectTab(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  const showReturnButton = user.role === 'ADMINISTRADOR' || user.role === 'COORDINADOR';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#2B2826]/40 z-40 backdrop-blur-xs lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar: Responsive dockable on desktop (Full or Icon Rail), slide-over drawer on mobile */}
      <aside
        className={`bg-[#FAF7F5] text-[#2B2826] border-r border-[#EFE8E1] flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          // Mobile classes: Fixed drawer from left-0
          `fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] h-full shadow-2xl z-50 lg:shadow-none ${
            isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
          } ` +
          // Desktop classes: Fixed column adhering to the viewport top-to-bottom so it never cuts off
          `lg:fixed lg:top-16 sm:lg:top-[72px] lg:bottom-0 lg:left-0 lg:z-30 lg:h-[calc(100vh-72px)] lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto ${
            isOpen ? 'lg:w-72 xl:w-80' : 'lg:w-[4.25rem]'
          }`
        }`}
      >
        {/* Header: Full mode or Icon Rail toggle */}
        <div className={`border-b border-[#EFE8E1] bg-[#FAF7F5] shrink-0 flex items-center transition-all ${
          isOpen ? 'px-4 py-3 sm:py-3.5 justify-between gap-2' : 'p-2.5 justify-center'
        }`}>
          {isOpen ? (
            <>
              {showReturnButton ? (
                <button
                  onClick={() => {
                    setCurrentWedding(null);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-[#8A7E72] hover:text-[#C48B81] transition cursor-pointer truncate max-w-[80%]"
                  title="Volver a la lista de bodas"
                >
                  <ChevronLeft className="w-4 h-4 shrink-0 text-[#C48B81]" />
                  <span className="truncate">Volver al Dashboard</span>
                </button>
              ) : (
                <span className="text-xs font-semibold tracking-wider uppercase text-[#C48B81] truncate">
                  Espacio Boda
                </span>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-[#8A7E72] hover:text-[#2B2826] hover:bg-[#F2ECE7] transition cursor-pointer shrink-0"
                title="Cerrar menú lateral"
                aria-label="Cerrar menú lateral"
              >
                <ChevronLeft className="w-4 h-4 hidden lg:block transition-transform" />
                <X className="w-5 h-5 lg:hidden" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle || onClose}
              className="p-2 rounded-xl text-[#8A7E72] hover:text-[#C48B81] hover:bg-[#F2ECE7] transition cursor-pointer"
              title="Expandir menú lateral"
              aria-label="Expandir menú lateral"
            >
              <PanelLeft className="w-5 h-5 text-[#C48B81]" />
            </button>
          )}
        </div>

        {/* Navigation items: Full mode with labels or Icon Rail */}
        <nav className={`flex-1 overflow-y-auto overscroll-contain transition-all ${
          isOpen ? 'px-3 py-2.5 space-y-3.5' : 'px-2 py-2.5 space-y-2'
        }`}>
          {sections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => !(isNovios && item.hiddenForNovios));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className={isOpen ? 'space-y-1' : 'space-y-1.5'}>
                {isOpen ? (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.16em] text-[#8A7E7A] uppercase select-none truncate">
                    {section.title}
                  </div>
                ) : sIdx > 0 ? (
                  <div className="my-1.5 mx-auto w-6 border-t border-[#EFE8E1]" />
                ) : null}

                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const active = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      title={item.label}
                      className={`w-full flex items-center transition-all cursor-pointer ${
                        isOpen
                          ? 'px-3.5 py-2.5 rounded-xl text-sm space-x-3'
                          : 'justify-center p-2.5 rounded-xl'
                      } ${
                        active
                          ? 'bg-[#F7EDEB] text-[#A86B60] font-semibold border border-[#EEDAD6]/80 shadow-2xs'
                          : 'text-[#5E524E] hover:bg-[#F5EFEB] hover:text-[#2B2826] font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#C48B81]' : 'text-[#8A7E7A]'}`} />
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div className="h-4" />
        </nav>

        {/* Footer with Wedding Day Mode Toggle */}
        {onToggleWeddingDayMode && (user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR') && (
          <div className="p-2 border-t border-[#EFE8E1] bg-[#FAF7F5]">
            <button
              onClick={onToggleWeddingDayMode}
              title={weddingDayMode ? 'Ver Planeación Completa' : 'Activar Modo Día de Boda'}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                isOpen ? 'px-3 space-x-2' : 'p-2'
              } ${
                weddingDayMode
                  ? 'bg-white text-[#2B2826] border border-[#EFE8E1] hover:bg-[#FAF7F5] shadow-2xs'
                  : 'bg-[#C48B81]/10 text-[#C48B81] hover:bg-[#C48B81]/20 border border-[#C48B81]/25'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C48B81] shrink-0" />
              {isOpen && <span>{weddingDayMode ? 'Ver Planeación Completa' : 'Modo Día de Boda'}</span>}
            </button>
          </div>
        )}

        {/* Brand Footer */}
        <div className={`border-t border-[#EFE8E1] bg-[#FAF7F5] flex items-center shrink-0 ${
          isOpen ? 'px-4 py-2.5 justify-between' : 'p-2.5 justify-center'
        }`}>
          {isOpen && <span className="text-[11px] font-medium text-[#8A7E72]">LAZO · VLB Studio</span>}
          <span className="w-2 h-2 rounded-full bg-[#C48B81]" title="Espacio activo" />
        </div>
      </aside>
    </>
  );
};
