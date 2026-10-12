import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarCheck2, Users2, Grid2x2Check,
  CreditCard, Landmark, Church, Clock3, CheckSquare,
  FileText, BarChart3, Contact2, History, X
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
  | 'bitacora';

interface SidebarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  setMobileOpen
}) => {
  const { user, currentWedding } = useAuth();
  if (!user || !currentWedding) return null;

  const isNovios = user.role === 'NOVIOS';

  const menuItems: { id: WorkspaceTab; label: string; icon: React.ElementType; hiddenForNovios?: boolean }[] = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'reuniones', label: 'Información y Reuniones', icon: CalendarCheck2 },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'invitados', label: 'Invitados y Confirmaciones', icon: Users2 },
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

  return (
    <>
      {/* Backdrop para cerrar al hacer clic fuera (Móvil, Tablet y Desktop) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-[#332C2A]/35 z-40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Menú Lateral de Hamburguesa Ocultable — Estética Rosa Quemado & Crema Editorial */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-80 bg-[#F9F6F2] text-[#332C2A] border-r border-[#DDD2C4] z-50 flex flex-col shadow-2xl transition-transform duration-250 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Encabezado del Menú con Rosa Quemado Suave y botón para ocultar */}
        <div className="p-6 bg-[#A6736E] text-[#FFFFFF] border-b border-[#94615C]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#F7EEEC]">
              Espacio de Boda
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-full bg-[#885853]/60 hover:bg-[#885853] text-[#FFFFFF] transition"
              title="Ocultar menú"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="font-serif text-2xl font-semibold text-[#FFFFFF] leading-snug truncate">
            {currentWedding.name}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#B88883]/50">
            <span className="text-sm text-[#FAF5F3] font-normal">
              {currentWedding.wedding_date}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] font-medium">
              {getCountdown(currentWedding.wedding_date)}
            </span>
          </div>
        </div>

        {/* Lista de Módulos (Tipografía Inter legible y espaciosa) */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm transition-all ${
                  active
                    ? 'bg-[#A6736E] text-[#FFFFFF] font-semibold shadow-xs'
                    : 'text-[#332C2A] hover:bg-[#EFE2DF] font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FFFFFF]' : 'text-[#A6736E]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Pie del Sidebar con logo oficial */}
        <div className="px-6 py-3.5 border-t border-[#DDD2C4] bg-[#EFE8DE]/60 flex items-center justify-between">
          <img
            src="/lazo-logo.png"
            alt="LAZO — VLB Studio"
            className="h-7 w-auto object-contain select-none"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-[#A6736E]" title="Sistema conectado" />
        </div>
      </aside>
    </>
  );
};
