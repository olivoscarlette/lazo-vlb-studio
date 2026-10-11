import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell, LogOut, ChevronDown, Sparkles, Building2,
  CheckCircle2, ShieldCheck, ArrowLeft, Menu
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const {
    user,
    logout,
    currentWedding,
    setCurrentWedding,
    assignedWeddings,
    switchUserDemo,
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
        return 'bg-[#885853] text-[#FFFFFF] border-[#885853]';
      case 'COORDINADOR':
        return 'bg-[#EFE2DF] text-[#6E433F] border-[#DFC9C4]';
      case 'STAFF':
        return 'bg-[#EFE8DE] text-[#332C2A] border-[#DDD2C4]';
      case 'NOVIOS':
        return 'bg-[#F9F6F2] text-[#A6736E] border-[#DDD2C4]';
    }
  };

  const showHamburger = Boolean(currentWedding || user.role !== 'ADMINISTRADOR');

  return (
    <header className="sticky top-0 z-30 bg-[#F9F6F2]/95 backdrop-blur-md border-b border-[#DDD2C4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Left: Hamburger Menu Button + Brand Logo */}
          <div className="flex items-center space-x-4 sm:space-x-5">
            {showHamburger && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#EFE2DF] text-[#332C2A] border border-[#DDD2C4] shadow-xs transition"
                title="Abrir / Ocultar menú de módulos"
              >
                <Menu className="w-5 h-5 text-[#A6736E]" />
                <span className="text-xs font-semibold hidden sm:inline">Menú</span>
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
                className="h-11 sm:h-12 w-auto object-contain select-none transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>

            {/* Wedding selector dropdown if user has multiple weddings */}
            {user.role !== 'NOVIOS' && assignedWeddings.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowWeddingMenu(!showWeddingMenu)}
                  className="hidden sm:flex items-center space-x-2 text-xs font-medium text-[#332C2A] bg-[#FFFFFF] hover:bg-[#EFE8DE] px-4 py-2 rounded-xl border border-[#DDD2C4] transition"
                >
                  <Building2 className="w-4 h-4 text-[#A6736E]" />
                  <span className="truncate max-w-[180px]">
                    {currentWedding ? currentWedding.name : 'Seleccionar Boda'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#786C68]" />
                </button>

                {showWeddingMenu && (
                  <div className="absolute left-0 mt-2 w-72 bg-[#FFFFFF] rounded-2xl shadow-lg border border-[#DDD2C4] py-2 z-50">
                    <div className="px-4 py-2 text-[10px] font-semibold text-[#786C68] uppercase tracking-wider">
                      Bodas Asignadas
                    </div>
                    {user.role === 'ADMINISTRADOR' && (
                      <button
                        onClick={() => {
                          setCurrentWedding(null);
                          setShowWeddingMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#F9F6F2] flex items-center justify-between ${
                          !currentWedding ? 'bg-[#EFE2DF]/70 text-[#885853] font-semibold' : 'text-[#332C2A]'
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
                        className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#F9F6F2] flex items-center justify-between ${
                          currentWedding?.id === w.id ? 'bg-[#EFE2DF]/80 text-[#885853] font-semibold' : 'text-[#332C2A]'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-[#332C2A]">{w.name}</div>
                          <div className="text-[11px] text-[#786C68]">{w.wedding_date}</div>
                        </div>
                        {currentWedding?.id === w.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#A6736E]" />
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
                className="relative p-2.5 text-[#786C68] hover:text-[#332C2A] hover:bg-[#EFE8DE] rounded-full transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#A6736E] rounded-full" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#DDD2C4] py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-[#EFE8DE] flex items-center justify-between">
                    <span className="font-serif text-lg font-semibold text-[#332C2A]">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] bg-[#EFE2DF] text-[#885853] px-2.5 py-0.5 rounded-full font-medium">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#EFE8DE]">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-xs text-[#786C68]">
                        No hay notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-3.5 text-xs cursor-pointer hover:bg-[#F9F6F2] transition ${!n.read ? 'bg-[#EFE2DF]/40' : ''}`}
                        >
                          <div className="font-semibold text-[#332C2A] mb-0.5">{n.title}</div>
                          <div className="text-[#786C68] leading-snug">{n.message}</div>
                          <div className="text-[11px] text-[#786C68] mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Logout */}
            <div className="flex items-center pl-3 border-l border-[#DDD2C4] space-x-2">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-semibold text-[#332C2A] leading-tight">{user.name}</div>
                <div className="text-[11px] text-[#786C68] leading-tight">{user.email}</div>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-2.5 text-[#786C68] hover:text-[#332C2A] hover:bg-[#EFE8DE] rounded-full transition"
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
