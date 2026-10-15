import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell, LogOut, ChevronDown, Building2,
  CheckCircle2, ShieldCheck, Menu, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const {
    user,
    logout,
    currentWedding,
    setCurrentWedding,
    assignedWeddings,
    notifications,
    refreshNotifications
  } = useAuth();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showWeddingMenu, setShowWeddingMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('lazo_token');
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshNotifications();
    } catch {}
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'bg-[#8A574E] text-[#FFFFFF] border-[#8A574E]';
      case 'COORDINADOR':
        return 'bg-[#EFE2DF] text-[#70443D] border-[#CCDACC]';
      case 'STAFF':
        return 'bg-[#F7F3EE] text-[#332A28] border-[#EAE3DA]';
      case 'NOVIOS':
        return 'bg-[#FCFAF7] text-[#9C665C] border-[#EAE3DA]';
    }
  };

  const showHamburger = Boolean(currentWedding || user.role !== 'ADMINISTRADOR');

  return (
    <header className="sticky top-0 z-30 bg-[#FCFAF7]/95 backdrop-blur-md border-b border-[#EAE3DA]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Left: Hamburger Menu Button + Brand Logo */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {showHamburger && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                aria-label={sidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
                aria-expanded={sidebarOpen}
                className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl border transition shadow-xs cursor-pointer ${
                  sidebarOpen
                    ? 'bg-[#EFE2DF] hover:bg-[#EAD2D0] text-[#70443D] border-[#9C665C]/30'
                    : 'bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[#332A28] border-[#EAE3DA]'
                }`}
                title={sidebarOpen ? "Ocultar menú lateral para expandir pantalla" : "Mostrar menú lateral"}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5 text-[#9C665C]" />
                ) : (
                  <PanelLeft className="w-5 h-5 text-[#9C665C]" />
                )}
                <span className="text-sm font-semibold hidden md:inline">
                  {sidebarOpen ? 'Ocultar Menú' : 'Menú'}
                </span>
              </button>
            )}

            <div
              onClick={() => {
                if (user.role === 'ADMINISTRADOR') setCurrentWedding(null);
              }}
              className="cursor-pointer flex items-center group py-1"
              title="Ir al inicio de LAZO"
            >
              <img
                src="/lazo-logo.png"
                alt="LAZO — VLB Studio · Planning"
                className="h-10 sm:h-12 w-auto object-contain select-none transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>

            {/* Wedding selector dropdown if user has multiple weddings */}
            {user.role !== 'NOVIOS' && assignedWeddings.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowWeddingMenu(!showWeddingMenu)}
                  className="hidden sm:flex items-center space-x-2 text-sm font-medium text-[#332A28] bg-[#FFFFFF] hover:bg-[#F7F3EE] px-4 py-2 rounded-xl border border-[#EAE3DA] transition shadow-xs"
                >
                  <Building2 className="w-4 h-4 text-[#9C665C]" />
                  <span className="truncate max-w-[180px]">
                    {currentWedding ? currentWedding.name : 'Seleccionar Boda'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#7D6F6B]" />
                </button>

                {showWeddingMenu && (
                  <div className="absolute left-0 mt-2 w-72 bg-[#FFFFFF] rounded-2xl shadow-lg border border-[#EAE3DA] py-2 z-50">
                    <div className="px-4 py-2 text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider">
                      Bodas Asignadas
                    </div>
                    {user.role === 'ADMINISTRADOR' && (
                      <button
                        onClick={() => {
                          setCurrentWedding(null);
                          setShowWeddingMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#FCFAF7] flex items-center justify-between ${
                          !currentWedding ? 'bg-[#EFE2DF]/70 text-[#8A574E] font-semibold' : 'text-[#332A28]'
                        }`}
                      >
                        <span>Dashboard General (Todas)</span>
                      </button>
                    )}
                    {assignedWeddings.map(w => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setCurrentWedding(w);
                          setShowWeddingMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#FCFAF7] flex items-center justify-between ${
                          currentWedding?.id === w.id ? 'bg-[#EFE2DF]/80 text-[#8A574E] font-semibold' : 'text-[#332A28]'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-[#332A28]">{w.name}</div>
                          <div className="text-xs text-[#7D6F6B]">{w.wedding_date}</div>
                        </div>
                        {currentWedding?.id === w.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#6E8C70]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Area: Role Badge, Notifications & User Info */}
          <div className="flex items-center space-x-3">
            {/* Authentic Role Badge */}
            <div
              className={`text-xs px-3.5 py-1.5 rounded-full border flex items-center space-x-1.5 font-medium select-none ${getRoleBadgeStyle(user.role)}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{user.role}</span>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2.5 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#F7F3EE] rounded-full transition"
                title="Notificaciones"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#9C665C] rounded-full" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EAE3DA] py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-[#F7F3EE] flex items-center justify-between">
                    <span className="font-serif text-lg font-semibold text-[#332A28]">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-[#EFE2DF] text-[#8A574E] px-2.5 py-0.5 rounded-full font-medium">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F7F3EE]">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-sm text-[#7D6F6B]">
                        No hay notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-3.5 text-sm cursor-pointer hover:bg-[#FCFAF7] transition ${!n.read ? 'bg-[#EFE2DF]/40' : ''}`}
                        >
                          <div className="font-semibold text-[#332A28] mb-0.5">{n.title}</div>
                          <div className="text-xs text-[#7D6F6B] leading-snug">{n.message}</div>
                          <div className="text-xs text-[#7D6F6B] mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Logout */}
            <div className="flex items-center pl-3 border-l border-[#EAE3DA] space-x-2">
              <div className="hidden lg:block text-right">
                <div className="text-sm font-semibold text-[#332A28] leading-tight">{user.name}</div>
                <div className="text-xs text-[#7D6F6B] leading-tight">{user.email}</div>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-2.5 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#F7F3EE] rounded-full transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
