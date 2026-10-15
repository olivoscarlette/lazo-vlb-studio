import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarCheck2, Users2, Grid2x2Check,
  CreditCard, Landmark, Church, Clock3, CheckSquare,
  FileText, BarChart3, Contact2, History, X, MessageSquare,
  ChevronLeft
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
  | 'whatsapp';

interface SidebarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose
}) => {
  const { user, currentWedding } = useAuth();
  if (!user || !currentWedding) return null;

  const isNovios = user.role === 'NOVIOS';

  const menuItems: { id: WorkspaceTab; label: string; icon: React.ElementType; hiddenForNovios?: boolean }[] = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'reuniones', label: 'Información y Reuniones', icon: CalendarCheck2 },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'invitados', label: 'Invitados y Confirmaciones', icon: Users2 },
    { id: 'whatsapp', label: 'WhatsApp Hub', icon: MessageSquare, hiddenForNovios: true },
    { id: 'mesas', label: 'Mesas y Layout', icon: Grid2x2Check },
    { id: 'proveedores', label: 'Proveedores y Pagos', icon: CreditCard },
    { id: 'civil', label: 'Civil', icon: Landmark },
    { id: 'religiosa', label: 'Ceremonia Religiosa', icon: Church },
    { id: 'timeline', label: 'Timeline', icon: Clock3 },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'directorio', label: 'Directorio', icon: Contact2 },
    { id: 'bitacora', label: 'Bitácora', icon: History, hiddenForNovios: true },
  ];

  const visibleItems = menuItems.filter(item => !(isNovios && item.hiddenForNovios));

  const getCountdown = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `Faltan ${diffDays} días`;
    if (diffDays === 0) return '¡Hoy es la boda!';
    return `Realizada hace ${Math.abs(diffDays)} días`;
  };

  const handleItemClick = (id: WorkspaceTab) => {
    onSelectTab(id);
    // On mobile, close sidebar after selection
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay (only on small screens when open) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#332A28]/40 z-40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar: Responsive dockable on desktop, slide-over drawer on mobile */}
      <aside
        className={`bg-[#FCFAF7] text-[#332A28] border-r border-[#EAE3DA] flex flex-col z-40 transition-all duration-300 ease-in-out ${
          // Mobile classes: Fixed drawer
          `fixed top-0 bottom-0 left-0 w-80 shadow-2xl lg:shadow-none ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } ` +
          // Desktop classes: Docked sticky column when open, completely collapsed (w-0, hidden) when closed
          `lg:sticky lg:top-18 lg:h-[calc(100vh-4.5rem)] lg:translate-x-0 ${
            isOpen ? 'lg:w-72 xl:w-80 lg:block' : 'lg:hidden lg:w-0'
          }`
        }`}
      >
        {/* Header: Rosa Quemado Editorial con botón para colapsar */}
        <div className="p-5 sm:p-6 bg-[#9C665C] text-[#FFFFFF] border-b border-[#8A574E] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#F7EEEC]">
              Espacio de Boda
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-[#8A574E]/70 hover:bg-[#8A574E] text-[#FFFFFF] transition cursor-pointer"
              title="Ocultar menú"
            >
              <ChevronLeft className="w-4 h-4 hidden lg:block" />
              <X className="w-4 h-4 lg:hidden" />
            </button>
          </div>

          <div className="font-serif text-2xl font-bold text-[#FFFFFF] leading-snug truncate">
            {currentWedding.name}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#B88A82]/50">
            <span className="text-sm text-[#FAF5F3] font-normal">
              {currentWedding.wedding_date}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] font-medium">
              {getCountdown(currentWedding.wedding_date)}
            </span>
          </div>
        </div>

        {/* Navigation items: Sans-serif limpia, espaciosa, mínimo 14px (text-sm) */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3.5 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  active
                    ? 'bg-[#9C665C] text-[#FFFFFF] font-semibold shadow-xs'
                    : 'text-[#332A28] hover:bg-[#F7F3EE] hover:text-[#9C665C] font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FFFFFF]' : 'text-[#9C665C]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EAE3DA] bg-[#F7F3EE]/60 flex items-center justify-between shrink-0">
          <img
            src="/lazo-logo.png"
            alt="LAZO — VLB Studio"
            className="h-6 w-auto object-contain select-none"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-[#9C665C]" title="Espacio activo" />
        </div>
      </aside>
    </>
  );
};
