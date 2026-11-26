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
import { RsvpAutomationModule } from './modules/RsvpAutomationModule';
import { CalendarioModule } from './modules/CalendarioModule';
import { VivaLaBrideModule } from './modules/VivaLaBrideModule';
import { PublicProposalView } from './modules/PublicProposalView';
import { NoviosStudioRoot } from './novios/NoviosStudioRoot';
import { LandingPage } from './novios/components/LandingPage';
import {
  Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, Eye, EyeOff, Sparkles, BellRing, X
} from 'lucide-react';

const LoginView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la solicitud.');
      }
      setForgotFeedback({
        type: 'success',
        text: data.message || 'Si el correo está registrado, se han generado las instrucciones de recuperación.'
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setForgotFeedback({ type: 'error', text: 'El servidor tardó en responder. Por favor revisa tu bandeja en unos minutos.' });
      } else {
        setForgotFeedback({ type: 'error', text: err.message || 'Error de conexión.' });
      }
    } finally {
      clearTimeout(timeoutId);
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
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Warm Editorial Blush Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#EFE2DF]/70 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#F7F3EE]/80 blur-3xl pointer-events-none" />

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-[#EFE8E1] text-xs text-[#7D6F6B] hover:text-[#2B2826] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Inicio</span>
        </button>
      )}

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
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
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
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28] p-1 cursor-pointer"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
  const { user, currentWedding, setCurrentWedding, activeTab, setActiveTab, activeModule, setActiveModule, setGeneralDashboardTab } = useAuth();
  const isNovios = user?.role === 'NOVIOS';

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

  const hasVlbAccess = user?.role === 'ADMINISTRADOR';

  // If in Viva la Bride Studio mode
  if (hasVlbAccess && activeModule === 'vlb') {
    return (
      <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-4.5rem)] bg-[#FAF8F5] p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <VivaLaBrideModule
          user={user}
          onBackToLazo={() => {
            setActiveModule('lazo');
            setCurrentWedding(null);
            setGeneralDashboardTab('weddings');
          }}
        />
      </div>
    );
  }

  // If Admin and no specific wedding selected -> General Dashboard
  if (user?.role === 'ADMINISTRADOR' && !currentWedding) {
    return <GeneralDashboard />;
  }

  // Map Sidebar wedding tabs to the unified Nuevo Lazo editorial interface so Admin sees the same design as Novios
  // while keeping Admin's full InvitadosModule (Meta WhatsApp invitations, Excel import, RSVP automation) intact!
  const mapSidebarToNoviosTab = (tab: WorkspaceTab): 'inicio' | 'presupuesto' | 'invitados' | 'checklist' | 'midia' | null => {
    switch (tab) {
      case 'resumen':
        return 'inicio';
      case 'proveedores':
      case 'documentos':
        return 'presupuesto';
      case 'mesas':
        return 'invitados';
      case 'checklist':
        return 'checklist';
      case 'timeline':
      case 'civil':
      case 'religiosa':
        return 'midia';
      default:
        return null;
    }
  };

  const mappedNoviosTab = mapSidebarToNoviosTab(activeTab);

  // If wedding is selected or user is Novios/Coord/Staff: render wedding workspace
  const renderModuleContent = () => {
    if (mappedNoviosTab) {
      return (
        <NoviosStudioRoot
          embedded
          forcedTab={mappedNoviosTab}
          initialGuestsSubTab={activeTab === 'mesas' ? 'mesas' : 'lista'}
          onTabChange={nextTab => {
            const reverseMap: Record<string, WorkspaceTab> = {
              inicio: 'resumen',
              presupuesto: 'proveedores',
              invitados: 'invitados',
              checklist: 'checklist',
              midia: 'timeline'
            };
            if (reverseMap[nextTab]) setActiveTab(reverseMap[nextTab]);
          }}
        />
      );
    }

    switch (activeTab) {
      case 'invitados':
        return <InvitadosModule weddingDayMode={weddingDayMode} />;
      case 'reuniones':
        return <ReunionesModule />;
      case 'rsvp_envios':
        return <RsvpAutomationModule onNavigateTab={setActiveTab} />;
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-4.5rem)] bg-[#FAF8F5] relative max-w-full">
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
          className={`flex-1 min-w-0 w-full max-w-full transition-all duration-300 ease-in-out p-3 sm:p-6 lg:p-8 overflow-y-auto bg-[#FAF8F5] ${
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
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
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
  const { user, loading, currentWedding, setCurrentWedding, activeModule, setActiveModule, setGeneralDashboardTab } = useAuth();

  // Always start with the sidebar closed on page load/reload
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeToast, setActiveToast] = useState<{ title: string; body?: string; link?: string; tag?: string } | null>(null);
  const [checkoutVerifying, setCheckoutVerifying] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).has('reset_token');
    }
    return false;
  });

  // Handle return from MercadoPago Checkout Pro (?checkout_order=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('checkout_order');
    const mpStatus = params.get('mp_status');
    const paymentId = params.get('payment_id') || params.get('collection_id') || '';
    if (!orderId) return;

    if (mpStatus === 'failure') {
      setCheckoutNotice('El pago no se completó. Puedes intentar nuevamente cuando gustes.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    setCheckoutVerifying(true);
    fetch(`/api/checkout/verify?orderId=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.approved && data.token) {
          localStorage.setItem('lazo_token', data.token);
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        } else if (data.pending) {
          setCheckoutNotice('Tu pago está en proceso de validación (ej. OXXO o SPEI). En cuanto se apruebe podrás iniciar sesión con tu correo y contraseña.');
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          setCheckoutNotice(data.error || 'No pudimos confirmar el pago aún. Si ya pagaste, contáctanos por WhatsApp.');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      })
      .catch(() => {
        setCheckoutNotice('Error al verificar el pago. Intenta iniciar sesión o escríbenos por WhatsApp.');
      })
      .finally(() => setCheckoutVerifying(false));
  }, []);

  useEffect(() => {
    let timer: any;
    const handleInAppNotif = (e: any) => {
      const detail = e.detail;
      setActiveToast(detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setActiveToast(null);
      }, 7000);
    };

    window.addEventListener('lazo-inapp-notification', handleInAppNotif);
    return () => {
      window.removeEventListener('lazo-inapp-notification', handleInAppNotif);
      if (timer) clearTimeout(timer);
    };
  }, []);

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

  // Check if viewing public proposal (without login)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const proposalToken = currentPath.startsWith('/vlb/propuesta/')
    ? currentPath.replace('/vlb/propuesta/', '').split('/')[0].trim()
    : searchParams?.get('propuesta');

  if (proposalToken) {
    return <PublicProposalView token={proposalToken} />;
  }

  if (loading || checkoutVerifying) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center text-[#332A28] px-5 text-center">
        <div className="w-11 h-11 rounded-full border-2 border-[#EFE8E1] border-t-[#C48B81] animate-spin mb-4" />
        <img src="/lazo-logo.png" alt="LAZO" className="h-10 w-auto object-contain mb-2" />
        <span className="text-xs text-[#7D6F6B] uppercase tracking-[0.22em] mt-1">
          {checkoutVerifying ? 'Confirmando tu pago y preparando tu boda...' : 'LAZO STUDIO · PLANNING'}
        </span>
      </div>
    );
  }

  if (!user) {
    if (!showLogin) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-5 py-12 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[#EFE2DF]/60 blur-3xl" />
          <div className="relative z-10 bg-white rounded-[2rem] border border-[#EFE8E1] shadow-sm max-w-md w-full px-8 py-12 space-y-5">
            <img
              src="/lazo-logo.png"
              alt="LAZO — Studio Planning"
              className="h-14 w-auto mx-auto object-contain select-none"
            />
            <div className="space-y-2">
              <span className="inline-block text-[10px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
                Acceso Privado
              </span>
              <h1 className="font-editorial text-2xl sm:text-3xl text-[#2B2826]">
                Estamos preparando algo nuevo
              </h1>
              <p className="text-xs sm:text-sm text-[#7D6F6B] font-light leading-relaxed">
                La plataforma se encuentra en actualización privada. Vuelve pronto para conocer la nueva experiencia.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#2B2826] hover:bg-[#191716] text-white text-xs font-medium transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#E5B7AE]" />
                <span>Acceso Administración</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <LoginView onBack={() => setShowLogin(false)} />;
  }

  // Bloqueo temporal: solo ADMINISTRADOR y cuentas autorizadas de prueba pueden entrar mientras se renueva el concepto
  const privateAccessAllowedEmails = new Set(['scarlette.olivorq@gmail.com']);
  const normalizedCurrentEmail = String(user.email || '').toLowerCase().trim();
  if (user.role !== 'ADMINISTRADOR' && !privateAccessAllowedEmails.has(normalizedCurrentEmail)) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="bg-white rounded-[2rem] border border-[#EFE8E1] shadow-sm max-w-md w-full px-8 py-12 space-y-5">
          <img
            src="/lazo-logo.png"
            alt="LAZO — Studio Planning"
            className="h-12 w-auto mx-auto object-contain select-none"
          />
          <div className="space-y-2">
            <span className="inline-block text-[10px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
              En actualización
            </span>
            <h1 className="font-editorial text-2xl text-[#2B2826]">
              Acceso temporalmente pausado
            </h1>
            <p className="text-xs text-[#7D6F6B] font-light leading-relaxed">
              Estamos realizando mejoras en la plataforma. En breve volveremos a habilitar el acceso.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('lazo_token');
              window.location.href = '/';
            }}
            className="px-6 py-2.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] border border-[#EFE8E1] text-xs font-medium text-[#2B2826] transition cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // Vista previa privada de la nueva portada pública (EXCLUSIVO ADMINISTRADOR con ?preview_landing=1)
  const isAdminPreviewLanding =
    user.role === 'ADMINISTRADOR' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview_landing') === '1';

  if (isAdminPreviewLanding) {
    return (
      <>
        <div className="bg-[#2B2826] text-white text-xs px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-50">
          <span className="truncate">
            Vista previa privada de tu portada pública (el sitio sigue bloqueado para los demás)
          </span>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="px-3.5 py-1 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-[11px] font-semibold shrink-0 cursor-pointer"
          >
            ← Volver al Dashboard
          </button>
        </div>
        <LandingPage onOpenLogin={() => { window.location.href = '/'; }} />
      </>
    );
  }

  return (
    <>
      {user.role === 'NOVIOS' ? (
        <NoviosStudioRoot />
      ) : user?.role === 'ADMINISTRADOR' && activeModule === 'vlb' ? (
        <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#332A28]">
          <Navbar onToggleSidebar={handleToggleSidebar} sidebarOpen={sidebarOpen} />
          <div className="flex-1 bg-[#FAF8F5] p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <VivaLaBrideModule
              user={user}
              onBackToLazo={() => {
                setActiveModule('lazo');
                setCurrentWedding(null);
                setGeneralDashboardTab('weddings');
              }}
            />
          </div>
        </div>
      ) : user.role !== 'NOVIOS' && !currentWedding ? (
        <GeneralDashboard />
      ) : (
        <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#332A28]">
          <Navbar onToggleSidebar={handleToggleSidebar} sidebarOpen={sidebarOpen} />
          <MainWorkspace sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>
      )}

      {/* Luxury In-App Floating Toast Notification */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full bg-[#FFFFFF] border border-[#EAD2D0] rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-3 duration-300 pointer-events-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 bg-[#C83460]/10 text-[#C83460] rounded-xl shrink-0 mt-0.5">
              <BellRing className="w-5 h-5 text-[#C83460] animate-pulse" />
            </div>
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                if (activeToast.link) {
                  window.location.href = activeToast.link;
                }
                setActiveToast(null);
              }}
            >
              <div className="font-serif text-sm font-bold text-[#332A28]">
                {activeToast.title}
              </div>
              <div className="text-xs text-[#7D6F6B] mt-1 leading-snug line-clamp-3">
                {activeToast.body}
              </div>
              {activeToast.link && (
                <div className="text-[11px] font-semibold text-[#C83460] mt-2 flex items-center gap-1 hover:underline">
                  Ver detalles en LAZO ➔
                </div>
              )}
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-[#7D6F6B] hover:text-[#332A28] p-1 rounded-full cursor-pointer shrink-0"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
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
