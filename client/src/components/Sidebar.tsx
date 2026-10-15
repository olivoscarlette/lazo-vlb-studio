import React, { useState, useEffect } from 'react';
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
  onClose
}) => {
  const { user, token, currentWedding, setCurrentWedding } = useAuth();
  const [rsvpPercent, setRsvpPercent] = useState<number | null>(null);
  const [pendingChecklistCount, setPendingChecklistCount] = useState<number | null>(null);

  useEffect(() => {
    if (!currentWedding || !token) return;

    // Fetch quick stats for badges
    const fetchStats = async () => {
      try {
        const [wRes, chRes] = await Promise.all([
          fetch(`/api/weddings/${currentWedding.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`/api/checklist/${currentWedding.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (wRes.ok) {
          const wData = await wRes.json();
          const stats = wData.stats?.guests || {};
          const total = stats.total_guests || wData.wedding?.estimated_guests || 0;
          const conf = stats.confirmed_count || stats.confirmed_total_seats || 0;
          if (total > 0) {
            setRsvpPercent(Math.min(100, Math.round((conf / total) * 100)));
          }
        }

        if (chRes.ok) {
          const chData = await chRes.json();
          const items = chData.items || [];
          const pending = items.filter((it: any) => !it.completed).length;
          setPendingChecklistCount(pending);
        }
      } catch (err) {
        // Silently fallback if stats not available
      }
    };

    fetchStats();
  }, [currentWedding?.id, token]);

  if (!user || !currentWedding) return null;

  const isNovios = user.role === 'NOVIOS';

  // 3 Categorías solicitadas (Proveedores en Planificación, Timeline en Logística)
  const sections: { title: string; items: MenuItemDef[] }[] = [
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
        { id: 'whatsapp', label: 'WhatsApp Hub', icon: MessageSquare, hiddenForNovios: true },
        { id: 'documentos', label: 'Documentos', icon: FileText },
        { id: 'reportes', label: 'Reportes', icon: BarChart3 },
        { id: 'directorio', label: 'Directorio', icon: Contact2, hiddenForNovios: true },
        { id: 'bitacora', label: 'Bitácora', icon: History, hiddenForNovios: true }
      ]
    }
  ];

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
          className="fixed top-[72px] inset-x-0 bottom-0 bg-[#2B2826]/35 z-30 backdrop-blur-xs lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar: Responsive dockable on desktop, slide-over drawer below navbar on mobile */}
      <aside
        className={`bg-[#FAF8F5] text-[#2B2826] border-r border-[#EAE3DA] flex flex-col transition-all duration-300 ease-in-out ${
          // Mobile classes: Fixed drawer cleanly underneath navbar (top-[72px]), exact height
          `fixed top-[72px] bottom-0 left-0 w-80 max-w-[85vw] h-[calc(100dvh-72px)] shadow-2xl z-40 lg:shadow-none ${
            isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
          } ` +
          // Desktop classes: Docked sticky column when open, collapsed when closed
          `lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto ${
            isOpen ? 'lg:w-72 xl:w-80 lg:flex' : 'lg:hidden lg:w-0'
          }`
        }`}
      >
        {/* Clean Minimal Header: Return action (without duplicate arrows) + Single Close Control */}
        <div className="px-4 py-3 border-b border-[#EAE3DA] bg-[#FCFAF7] shrink-0 flex items-center justify-between gap-3">
          {showReturnButton ? (
            <button
              onClick={() => setCurrentWedding(null)}
              className="text-xs font-semibold text-[#8A7E72] hover:text-[#9C665C] transition cursor-pointer truncate"
              title="Volver a la lista de bodas"
            >
              Volver al Dashboard General
            </button>
          ) : (
            <span className="text-xs font-semibold tracking-wider uppercase text-[#9C665C]">
              Espacio de la Boda
            </span>
          )}

          {/* Único control de cierre / ocultar sidebar */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8A7E72] hover:text-[#2B2826] hover:bg-[#EFE8E0] transition cursor-pointer shrink-0"
            title="Ocultar menú lateral"
            aria-label="Cerrar barra lateral"
          >
            <ChevronLeft className="w-4 h-4 hidden lg:block transition-transform" />
            <X className="w-4 h-4 lg:hidden" />
          </button>
        </div>

        {/* Navigation items agrupados por las 3 secciones */}
        <nav className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3.5 overscroll-contain">
          {sections.map(section => {
            const visibleItems = section.items.filter(item => !(isNovios && item.hiddenForNovios));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 pt-1 pb-0.5 text-[11px] font-bold tracking-widest text-[#8A7E72] uppercase select-none">
                  {section.title}
                </div>

                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const active = currentTab === item.id;

                  // Badges dinámicos
                  let badge = null;
                  if (item.id === 'invitados' && rsvpPercent !== null) {
                    badge = (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-semibold ${
                        active ? 'bg-[#9C665C] text-white' : 'bg-[#EAE3DA] text-[#70443D]'
                      }`}>
                        {rsvpPercent}%
                      </span>
                    );
                  } else if (item.id === 'checklist' && pendingChecklistCount !== null && pendingChecklistCount > 0) {
                    badge = (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-semibold ${
                        active ? 'bg-[#9C665C] text-white' : 'bg-[#EFE2DF] text-[#8A574E]'
                      }`}>
                        {pendingChecklistCount}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                        active
                          ? 'bg-[#EFE8E0] text-[#2B2826] font-semibold shadow-2xs'
                          : 'text-[#5E524E] hover:bg-[#F4EFEB] hover:text-[#2B2826] font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#9C665C]' : 'text-[#8A7E72]'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {badge}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {/* Bottom buffer */}
          <div className="h-6" />
        </nav>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#EAE3DA] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-medium text-[#8A7E72]">LAZO · VLB Studio</span>
          <span className="w-2 h-2 rounded-full bg-[#6E8C70]" title="Espacio activo" />
        </div>
      </aside>
    </>
  );
};
