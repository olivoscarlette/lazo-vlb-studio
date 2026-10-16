import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, WorkspaceTab } from './components/Sidebar';
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
  Lock, Mail, ArrowRight, AlertCircle
} from 'lucide-react';

const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Warm Editorial Blush Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#EFE2DF]/70 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#F7F3EE]/80 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <img
          src="/lazo-logo.png"
          alt="LAZO — VLB Studio · Planning"
          className="h-24 sm:h-28 w-auto mx-auto object-contain select-none"
        />
        <p className="text-sm text-[#7D6F6B] mt-4 max-w-sm mx-auto leading-relaxed">
          Plataforma editorial y privada para la planeación, diseño y operación integral de bodas.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#FFFFFF] py-9 px-6 sm:px-10 rounded-3xl border border-[#EAE3DA] shadow-xs">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-[#FBF4F3] border border-[#EAD2D0] text-[#70443D] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#332A28] mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@vlb.studio"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#332A28] mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28] placeholder-[#7D6F6B]/60 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 px-4 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold uppercase tracking-widest rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? 'Ingresando...' : 'Entrar a LAZO'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#F7F3EE] text-center">
            <span className="text-xs text-[#7D6F6B]">
              Acceso exclusivo para clientes y equipo autorizado de VLB Studio.
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
        return <CalendarioModule />;
      default:
        return <ResumenModule onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] bg-[#FCFAF7] relative">
      {/* Sidebar Responsive: Docked on desktop, drawer on mobile */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        weddingDayMode={weddingDayMode}
        onToggleWeddingDayMode={handleToggleWeddingDayMode}
      />

      {/* Main Workspace Area: Expands smoothly to full width when sidebar is collapsed */}
      <main
        className={`flex-1 min-w-0 w-full transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#FCFAF7] ${
          !sidebarOpen ? 'max-w-none' : 'max-w-7xl mx-auto'
        }`}
      >
        {/* Banner exclusivo de Modo Día de la Boda */}
        {weddingDayMode && (
          <div className="mb-6 bg-gradient-to-r from-[#9C665C] via-[#85534A] to-[#6E433D] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0">
                💍
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm tracking-wide uppercase">MODO DÍA DE LA BODA ACTIVO</span>
                  <span className="bg-emerald-400 text-emerald-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
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
        <div className="w-11 h-11 rounded-full border-2 border-[#EAE3DA] border-t-[#9C665C] animate-spin mb-4" />
        <span className="font-serif text-3xl font-semibold tracking-[0.22em] text-[#332A28]">LAZO</span>
        <span className="text-xs text-[#7D6F6B] uppercase tracking-[0.24em] mt-1">VLB STUDIO · PLANNING</span>
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
      <AppContent />
    </AuthProvider>
  );
}
