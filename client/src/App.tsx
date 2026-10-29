import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, WorkspaceTab } from './components/Sidebar';
import { NoviosTopNav } from './components/NoviosTopNav';
import { VersionWatcher } from './components/VersionWatcher';
import { GeneralDashboard } from './modules/GeneralDashboard';
import { ResumenModule } from './modules/ResumenModule';
import { InvitadosModule } from './modules/InvitadosModule';
import { MesasLayoutModule } from './modules/MesasLayoutModule';
import { ProveedoresPagosModule } from './modules/ProveedoresPagosModule';
import { CivilModule } from './modules/CivilModule';
import { ReligiosaModule } from './modules/ReligiosaModule';
import { ReunionesModule } from './modules/ReunionesModule';
import { TimelineModule } from './modules/TimelineModule';
import { ChecklistModule } from './modules/ChecklistModule';
import { DocumentosModule } from './modules/DocumentosModule';
import { ReportesModule } from './modules/ReportesModule';
import { DirectorioModule } from './modules/DirectorioModule';
import { BitacoraModule } from './modules/BitacoraModule';
import { WhatsAppHubModule } from './modules/WhatsAppHubModule';
import { CalendarioModule } from './modules/CalendarioModule';
import {
  Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound
} from 'lucide-react';

const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password Recovery States
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotFeedback, setForgotFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  // Reset Token from URL (e.g. ?reset_token=xyz)
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset_token');
      if (token) {
        setResetToken(token);
        setViewMode('reset');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Por favor ingresa un correo electrónico real y válido.');
      return;
    }

    setSubmitting(true);
    try {
      await login(cleanEmail, password);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotFeedback(null);

    const cleanEmail = forgotEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setForgotFeedback({ type: 'error', text: 'Por favor ingresa un correo electrónico real y válido.' });
      return;
    }

    setForgotSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la solicitud.');
      }
      setForgotFeedback({
        type: 'success',
        text: data.message || 'Si el correo está registrado, se han generado las instrucciones de recuperación.'
      });
    } catch (err: any) {
      setForgotFeedback({ type: 'error', text: err.message || 'Error de conexión.' });
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);

    if (!newPassword || newPassword.length < 6) {
      setResetFeedback({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetFeedback({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña.');
      }
      setResetFeedback({
        type: 'success',
        text: '¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.'
      });
      setTimeout(() => {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setViewMode('login');
        setPassword('');
      }, 2500);
    } catch (err: any) {
      setResetFeedback({ type: 'error', text: err.message || 'Error al restablecer contraseña.' });
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Warm Editorial Blush Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#EFE2DF]/70 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#F7F3EE]/80 blur-3xl pointer-events-none" />

      {/* Header Editorial con Lazo — Studio Planning */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <img
          src="/lazo-logo.png"
          alt="Lazo — Studio Planning"
          className="h-20 sm:h-24 w-auto mx-auto object-contain select-none"
        />
        <p className="text-xs sm:text-sm text-[#7D6F6B] mt-3 max-w-sm mx-auto leading-relaxed">
          Plataforma exclusiva para la planeación, diseño y operación integral de bodas.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 rounded-3xl border border-[#EFE8E1] shadow-xs">
          
          {/* MODO 1: LOGIN HABITUAL */}
          {viewMode === 'login' && (
            <>
              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#FBF4F3] border border-[#EAD2D0] text-[#70443D] text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#332A28] mb-1.5 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="email"
                      required
                      placeholder="nombre@ejemplo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#332A28] uppercase tracking-wider">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotFeedback(null);
                        setForgotEmail(email);
                        setViewMode('forgot');
                      }}
                      className="text-[11px] text-[#A86B60] hover:text-[#C48B81] hover:underline font-semibold cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3.5 px-4 bg-[#C48B81] hover:bg-[#A86B60] text-[#FFFFFF] text-xs font-bold uppercase tracking-widest rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{submitting ? 'Ingresando...' : 'Entrar a Lazo'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* MODO 2: RECUPERAR CONTRASEÑA */}
          {viewMode === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className="p-1.5 -ml-1.5 text-[#7D6F6B] hover:text-[#332A28] rounded-lg hover:bg-[#FAF8F5] transition cursor-pointer"
                  title="Volver al inicio de sesión"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-[#C48B81]" />
                  <h2 className="font-serif text-lg font-bold text-[#332A28]">
                    Recuperar Contraseña
                  </h2>
                </div>
              </div>

              <p className="text-xs text-[#7D6F6B] leading-relaxed">
                Ingresa tu correo electrónico registrado para enviarte las instrucciones y restablecer tu contraseña.
              </p>

              {forgotFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
                    forgotFeedback.type === 'success'
                      ? 'bg-[#E5EDE6] text-[#384C3A] border border-[#D5E2D7]'
                      : 'bg-[#FBF4F3] text-[#70443D] border border-[#EAD2D0]'
                  }`}
                >
                  {forgotFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#384C3A]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#70443D]" />
                  )}
                  <span>{forgotFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#332A28] mb-1.5 uppercase tracking-wider">
                    Correo Electrónico Registrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="email"
                      required
                      placeholder="nombre@ejemplo.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="w-full py-3 px-4 bg-[#C48B81] hover:bg-[#A86B60] text-[#FFFFFF] text-xs font-bold uppercase tracking-widest rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{forgotSubmitting ? 'Enviando...' : 'Recuperar mi contraseña'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className="text-xs text-[#7D6F6B] hover:text-[#332A28] hover:underline font-medium cursor-pointer"
                >
                  Recordé mi contraseña, volver al inicio
                </button>
              </div>
            </div>
          )}

          {/* MODO 3: NUEVA CONTRASEÑA (DESDE ENLACE DE RECUPERACIÓN) */}
          {viewMode === 'reset' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <KeyRound className="w-4 h-4 text-[#C48B81]" />
                <h2 className="font-serif text-lg font-bold text-[#332A28]">
                  Crea tu Nueva Contraseña
                </h2>
              </div>

              <p className="text-xs text-[#7D6F6B] leading-relaxed">
                Ingresa y confirma tu nueva contraseña para acceder a Lazo Studio.
              </p>

              {resetFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
                    resetFeedback.type === 'success'
                      ? 'bg-[#E5EDE6] text-[#384C3A] border border-[#D5E2D7]'
                      : 'bg-[#FBF4F3] text-[#70443D] border border-[#EAD2D0]'
                  }`}
                >
                  {resetFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#384C3A]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#70443D]" />
                  )}
                  <span>{resetFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#332A28] mb-1.5 uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#332A28] mb-1.5 uppercase tracking-wider">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="password"
                      required
                      placeholder="Repite tu nueva contraseña"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full py-3.5 px-4 bg-[#C48B81] hover:bg-[#A86B60] text-[#FFFFFF] text-xs font-bold uppercase tracking-widest rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{resetSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Footer oficial Lazo Studio */}
          <div className="mt-6 pt-5 border-t border-[#F7F3EE] text-center">
            <span className="text-xs text-[#7D6F6B]">
              Acceso exclusivo para clientes y equipo autorizado de Lazo Studio.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MainWorkspaceProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const MainWorkspace: React.FC<MainWorkspaceProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, currentWedding, activeTab, setActiveTab } = useAuth();

  // Check if today matches the wedding date
  const todayStr = new Date().toISOString().split('T')[0];
  const isDateToday = currentWedding?.wedding_date === todayStr;

  // Wedding Day Mode: default true if today is wedding date, or restored from localStorage
  const [weddingDayMode, setWeddingDayMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && currentWedding?.id) {
      const saved = localStorage.getItem(`lazo_day_mode_${currentWedding.id}`);
      if (saved !== null) return saved === 'true';
    }
    return isDateToday;
  });

  // Re-evaluate whenever wedding changes
  useEffect(() => {
    if (!currentWedding) return;
    const isToday = currentWedding.wedding_date === todayStr;
    const saved = localStorage.getItem(`lazo_day_mode_${currentWedding.id}`);
    if (saved !== null) {
      setWeddingDayMode(saved === 'true');
    } else if (isToday) {
      setWeddingDayMode(true);
    }
  }, [currentWedding?.id, currentWedding?.wedding_date, todayStr]);

  const handleToggleWeddingDayMode = () => {
    setWeddingDayMode(prev => {
      const next = !prev;
      if (currentWedding?.id) {
        localStorage.setItem(`lazo_day_mode_${currentWedding.id}`, String(next));
      }
      if (next) {
        setActiveTab('timeline');
      }
      return next;
    });
  };

  // If Admin and no specific wedding selected -> General Dashboard
  if (user?.role === 'ADMINISTRADOR' && !currentWedding) {
    return <GeneralDashboard />;
  }

  // If wedding is selected or user is Novios/Coord/Staff: render wedding workspace
  const renderModuleContent = () => {
    switch (activeTab) {
      case 'resumen':
        return <ResumenModule onNavigateTab={setActiveTab} />;
      case 'reuniones':
        return <ReunionesModule />;
      case 'invitados':
        return <InvitadosModule />;
      case 'mesas':
        return <MesasLayoutModule />;
      case 'proveedores':
        return <ProveedoresPagosModule />;
      case 'civil':
        return <CivilModule />;
      case 'religiosa':
        return <ReligiosaModule />;
      case 'timeline':
        return <TimelineModule />;
      case 'checklist':
        return <ChecklistModule />;
      case 'documentos':
        return <DocumentosModule />;
      case 'reportes':
        return <ReportesModule />;
      case 'directorio':
        return user?.role === 'NOVIOS' ? <ResumenModule onNavigateTab={setActiveTab} /> : <DirectorioModule />;
      case 'bitacora':
        return <BitacoraModule />;
      case 'whatsapp':
        return <WhatsAppHubModule />;
      case 'calendario':
        return <CalendarioModule onToggleSidebar={() => setSidebarOpen(prev => !prev)} />;
      default:
        return <ResumenModule onNavigateTab={setActiveTab} />;
    }
  };

  const isNovios = user?.role === 'NOVIOS';

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-4.5rem)] bg-[#FAF7F5] relative max-w-full">
      {/* Barra de navegación superior exclusiva para Novios (idéntica a la propuesta visual 3) */}
      {isNovios && (
        <NoviosTopNav currentTab={activeTab} onSelectTab={setActiveTab} />
      )}

      <div className="flex flex-1 relative w-full">
        {/* Sidebar Responsive: Solo para Admin, Coordinador o Staff — En desktop queda fijo y sigue el scroll */}
        {!isNovios && (
          <Sidebar
            currentTab={activeTab}
            onSelectTab={setActiveTab}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onToggle={() => setSidebarOpen(prev => !prev)}
            weddingDayMode={weddingDayMode}
            onToggleWeddingDayMode={handleToggleWeddingDayMode}
          />
        )}

        {/* Main Workspace Area: Expands smoothly to full width when sidebar is collapsed or for Novios */}
        <main
          className={`flex-1 min-w-0 w-full max-w-full transition-all duration-300 ease-in-out p-3 sm:p-6 lg:p-8 overflow-y-auto bg-[#FAF7F5] ${
            isNovios
              ? 'max-w-7xl mx-auto'
              : sidebarOpen
              ? 'lg:pl-80 xl:pl-88 max-w-none'
              : 'lg:pl-[4.75rem] max-w-none'
          }`}
        >
          {/* Banner exclusivo de Modo Día de la Boda */}
          {weddingDayMode && (
            <div className="mb-6 bg-gradient-to-r from-[#C48B81] via-[#85534A] to-[#6E433D] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0">
                  💍
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm tracking-wide uppercase">MODO DÍA DE LA BODA ACTIVO</span>
                    <span className="bg-white/20 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/30">
                      EN VIVO
                    </span>
                  </div>
                  <p className="text-xs text-stone-200 mt-0.5">
                    Herramientas operativas en tiempo real: Cronograma en vivo, Asignación de Mesas y Listado de Invitados para recepción.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                <button
                  onClick={handleToggleWeddingDayMode}
                  className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl border border-white/20 transition cursor-pointer"
                  title="Volver al menú de planeación general"
                >
                  Ver Planeación Completa
                </button>
              </div>
            </div>
          )}

          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading, currentWedding } = useAuth();

  // Initialize sidebar state: default open on desktop (>=1024px), closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lazo_sidebar_open');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('lazo_sidebar_open', String(next));
      }
      return next;
    });
  };

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] flex flex-col items-center justify-center text-[#332A28]">
        <div className="w-11 h-11 rounded-full border-2 border-[#EFE8E1] border-t-[#C48B81] animate-spin mb-4" />
        <span className="font-serif text-3xl font-semibold tracking-[0.22em] text-[#332A28]">LAZO</span>
        <span className="text-xs text-[#7D6F6B] uppercase tracking-[0.24em] mt-1">LAZO STUDIO · PLANNING</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (user.role !== 'NOVIOS' && !currentWedding) {
    return <GeneralDashboard />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-[#332A28]">
      <Navbar onToggleSidebar={handleToggleSidebar} sidebarOpen={sidebarOpen} />
      <MainWorkspace sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <VersionWatcher />
      <AppContent />
    </AuthProvider>
  );
}
