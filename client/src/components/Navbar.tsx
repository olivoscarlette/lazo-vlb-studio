import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell, BellRing, LogOut, ChevronDown, Building2,
  CheckCircle2, ShieldCheck, Menu, PanelLeft, Calendar, Heart, Sparkles
} from 'lucide-react';
import { UserRole } from '../types';
import { UserProfileModal } from './UserProfileModal';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from '../utils/browserNotifications';

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
    refreshNotifications,
    navigateToNotification,
    setActiveTab,
    setGeneralDashboardTab,
    activeModule,
    setActiveModule
  } = useAuth();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showWeddingMenu, setShowWeddingMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(getBrowserNotificationPermission());

  useEffect(() => {
    if (showNotifMenu) {
      setBrowserPermission(getBrowserNotificationPermission());
    }
  }, [showNotifMenu]);

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
        return 'bg-[#C48B81] text-[#FFFFFF] border-[#C48B81] shadow-2xs';
      case 'COORDINADOR':
        return 'bg-[#F7EDEB] text-[#A86B60] border-[#EEDAD6]';
      case 'STAFF':
        return 'bg-[#FAF7F5] text-[#2B2826] border-[#EFE8E1]';
      case 'NOVIOS':
        return 'bg-[#FAF7F5] text-[#C48B81] border-[#EEDAD6]';
    }
  };

  const showHamburger = Boolean(user.role !== 'NOVIOS' && (currentWedding || user.role !== 'ADMINISTRADOR'));

  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F5]/95 backdrop-blur-md border-b border-[#EFE8E1] h-16 sm:h-[72px] transition-all">
      <div className="w-full px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          {/* Left: Hamburger Menu Button + Brand Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            {showHamburger && onToggleSidebar && !sidebarOpen && (
              <button
                onClick={onToggleSidebar}
                aria-label="Mostrar menú lateral"
                className="inline-flex lg:hidden items-center space-x-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-[#EFE8E1] bg-[#FFFFFF] hover:bg-[#F5EFEB] text-[#2B2826] transition shadow-xs cursor-pointer shrink-0"
                title="Mostrar menú lateral"
              >
                <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#C48B81]" />
                <span className="text-sm font-semibold hidden md:inline">
                  Menú
                </span>
              </button>
            )}

            <div
              onClick={() => {
                setActiveModule('lazo');
                if (user.role !== 'NOVIOS') {
                  setCurrentWedding(null);
                  setGeneralDashboardTab('weddings');
                }
              }}
              className="cursor-pointer flex items-center group py-1 shrink-0"
              title="Ir al inicio de LAZO"
            >
              <img
                src="/lazo-logo.png"
                alt="LAZO STUDIO"
                className="h-8 sm:h-12 w-auto max-w-[105px] sm:max-w-none object-contain select-none transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>

            {/* Wedding selector dropdown if user has multiple weddings: ONLY in Lazo mode and inside a wedding */}
            {activeModule === 'lazo' && currentWedding && user.role !== 'NOVIOS' && assignedWeddings.length > 1 && (
              <div className="relative ml-1 sm:ml-2">
                <button
                  onClick={() => setShowWeddingMenu(!showWeddingMenu)}
                  className="hidden sm:flex items-center space-x-2 text-sm font-medium text-[#2B2826] bg-[#FFFFFF] hover:bg-[#FAF7F5] px-4 py-2 rounded-full border border-[#EFE8E1] transition shadow-xs"
                >
                  <Building2 className="w-4 h-4 text-[#C48B81]" />
                  <span className="truncate max-w-[180px]">
                    {currentWedding.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#7D6F6B]" />
                </button>

                {showWeddingMenu && (
                  <div className="absolute left-0 mt-2 w-72 bg-[#FFFFFF] rounded-2xl shadow-lg border border-[#EFE8E1] py-2 z-50">
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
                          !currentWedding ? 'bg-[#EFE2DF]/70 text-[#A86B60] font-semibold' : 'text-[#332A28]'
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
                          currentWedding?.id === w.id ? 'bg-[#EFE2DF]/80 text-[#A86B60] font-semibold' : 'text-[#332A28]'
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

          {/* Right Area: Calendario General (solo en Lazo), Switcher de Plataforma, Role Badge, Notifications & User Info */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Calendario General Button for Admin, Coordinador, Staff (OCULTO EN VIVA LA BRIDE) */}
            {user.role !== 'NOVIOS' && activeModule !== 'vlb' && (
              <button
                onClick={() => {
                  if (user.role === 'ADMINISTRADOR') {
                    setCurrentWedding(null);
                    setGeneralDashboardTab('calendario');
                  } else if (currentWedding) {
                    setActiveTab('calendario');
                  } else {
                    setGeneralDashboardTab('calendario');
                  }
                }}
                className="inline-flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EFE8E1] transition shadow-2xs cursor-pointer shrink-0"
                title="Abrir Calendario General"
              >
                <Calendar className="w-3.5 h-3.5 text-[#C48B81]" />
                <span className="hidden sm:inline">Calendario General</span>
              </button>
            )}

            {/* Platform Switcher: Lazo Planning ⇄ Viva la Bride (EXCLUSIVO ADMINISTRADOR - LADO DERECHO) */}
            {user.role === 'ADMINISTRADOR' && (
              <div className="flex items-center bg-[#F3EDE6] p-1 rounded-full border border-[#EAE3DA] shadow-2xs shrink-0">
                <button
                  onClick={() => {
                    setActiveModule('lazo');
                    setCurrentWedding(null);
                    setGeneralDashboardTab('weddings');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({ type: 'dashboard', tab: 'weddings' }, '', '/');
                    }
                  }}
                  className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activeModule === 'lazo'
                      ? 'bg-[#FFFFFF] text-[#332A28] shadow-xs'
                      : 'text-[#7D6F6B] hover:text-[#332A28]'
                  }`}
                  title="Ir al inicio de Lazo Planning (Home)"
                >
                  <Heart className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span className="hidden md:inline">Lazo Planning</span>
                  <span className="md:hidden">Lazo</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule('vlb');
                  }}
                  className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activeModule === 'vlb'
                      ? 'bg-[#9C665C] text-[#FFFFFF] shadow-xs'
                      : 'text-[#7D6F6B] hover:text-[#332A28]'
                  }`}
                  title="Atelier Viva la Bride (Papelería & Stands)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#CCDACC]" />
                  <span className="hidden md:inline">Viva la Bride</span>
                  <span className="md:hidden">Viva la Bride</span>
                </button>
              </div>
            )}

            {/* Authentic Role Badge */}
            <div
              className={`text-xs p-1.5 sm:px-3 sm:py-1.5 rounded-full border flex items-center space-x-1.5 font-medium select-none shrink-0 ${getRoleBadgeStyle(user.role)}`}
              title={`Rol: ${user.role}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden md:inline">{user.role}</span>
            </div>

            {/* Notifications Bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-1.5 sm:p-2.5 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#F7F3EE] rounded-full transition cursor-pointer"
                title="Notificaciones"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-[#C48B81] rounded-full" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EFE8E1] py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-[#F7F3EE] flex items-center justify-between">
                    <span className="font-serif text-lg font-semibold text-[#332A28]">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-[#EFE2DF] text-[#A86B60] px-2.5 py-0.5 rounded-full font-medium">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>

                  {/* Banner de Activación de Notificaciones de Escritorio (Web Push) */}
                  {browserPermission === 'default' && (
                    <div className="mx-3 my-2 p-3 bg-gradient-to-r from-[#FAF6F2] to-[#FBF4F3] border border-[#EAD2D0] rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="p-2 bg-[#C83460]/10 text-[#C83460] rounded-lg shrink-0">
                          <BellRing className="w-4 h-4 text-[#C83460]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#332A28] truncate">
                            Alertas en tu pantalla
                          </div>
                          <div className="text-[10px] text-[#7D6F6B] leading-tight">
                            Recibe avisos al firmar contratos o confirmar invitados
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const perm = await requestBrowserNotificationPermission();
                          setBrowserPermission(perm);
                        }}
                        className="px-2.5 py-1.5 bg-[#C83460] hover:bg-[#a6264d] text-white text-[11px] font-bold rounded-lg transition shadow-2xs shrink-0 cursor-pointer"
                      >
                        Activar
                      </button>
                    </div>
                  )}

                  {browserPermission === 'granted' && (
                    <div className="px-4 py-1.5 bg-[#F0FDF4] border-b border-[#DCFCE7] flex items-center justify-between text-[11px] text-[#166534]">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                        Alertas de escritorio activas
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendBrowserNotification('¡Prueba de Notificación Lazo Studio! ✨', {
                            body: 'Tus alertas en pantalla están funcionando al 100%. Te avisaremos aquí en tiempo real.',
                            tag: 'lazo-test-notif'
                          });
                        }}
                        className="text-[10px] font-semibold text-[#C83460] hover:underline cursor-pointer"
                      >
                        Probar alerta
                      </button>
                    </div>
                  )}

                  {browserPermission === 'denied' && (
                    <div className="px-4 py-1.5 bg-[#FFFBEB] border-b border-[#FEF3C7] text-[10px] text-[#92400E]">
                      ⚠️ Notificaciones bloqueadas en tu navegador. Puedes habilitarlas en el candado de la barra de direcciones.
                    </div>
                  )}
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F7F3EE]">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-sm text-[#7D6F6B]">
                        No hay notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            await navigateToNotification(n);
                            setShowNotifMenu(false);
                          }}
                          className={`p-3.5 text-sm cursor-pointer hover:bg-[#FCFAF7] transition group ${!n.read ? 'bg-[#EFE2DF]/40' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="font-semibold text-[#332A28] mb-0.5 group-hover:text-[#C48B81] transition">
                              {n.title}
                            </div>
                            <span className="text-[10px] text-[#C48B81] font-semibold opacity-0 group-hover:opacity-100 transition shrink-0">
                              Ver en LAZO →
                            </span>
                          </div>
                          <div className="text-xs text-[#7D6F6B] leading-snug">{n.message}</div>
                          <div className="flex items-center justify-between text-[11px] text-[#7D6F6B] mt-1.5 pt-1 border-t border-[#F7F3EE]">
                            <span>{new Date(n.created_at).toLocaleDateString('es-MX')}</span>
                            <span className="text-[#C48B81] font-semibold text-[11px] underline underline-offset-2">
                              Ir a la sección →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Logout */}
            <div className="flex items-center pl-1.5 sm:pl-3 border-l border-[#EFE8E1] space-x-1 sm:space-x-2.5 shrink-0">
              {/* Clickable Avatar */}
              <div
                onClick={() => setShowProfileModal(true)}
                className="relative cursor-pointer group shrink-0"
                title={`Mi Perfil · ${user.name}`}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-[#CCDACC] shadow-2xs group-hover:ring-2 group-hover:ring-[#C48B81] transition"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFE2DF] text-[#A86B60] font-serif font-bold text-xs sm:text-sm flex items-center justify-center border border-[#CCDACC] shadow-2xs group-hover:ring-2 group-hover:ring-[#C48B81] transition">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -top-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#6E8C70] border-2 border-[#FCFAF7]" title="En línea" />
              </div>

              <div
                onClick={() => setShowProfileModal(true)}
                className="hidden lg:block text-right cursor-pointer group"
                title="Editar mi perfil y contraseña"
              >
                <div className="text-sm font-semibold text-[#332A28] leading-tight group-hover:text-[#C48B81] transition">{user.name}</div>
                <div className="text-xs text-[#7D6F6B] leading-tight">{user.email}</div>
              </div>

              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 sm:p-2.5 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#F7F3EE] rounded-full transition cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
};
