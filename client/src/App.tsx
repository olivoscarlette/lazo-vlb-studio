import React, { useState } from 'react';
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
import {
  Lock, Mail, ArrowRight, AlertCircle, Menu
} from 'lucide-react';
import { UserRole } from './types';

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
    <div className="min-h-screen bg-[#F9F6F2] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Warm Editorial Blush Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#EFE2DF]/80 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#EFE8DE]/80 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <img
          src="/lazo-logo.png"
          alt="LAZO — VLB Studio · Planning"
          className="h-24 sm:h-28 w-auto mx-auto object-contain select-none"
        />
        <p className="text-sm text-[#786C68] mt-4 max-w-sm mx-auto leading-relaxed">
          Plataforma editorial y privada para la planeación, diseño y operación integral de bodas.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#FFFFFF] py-9 px-6 sm:px-10 rounded-3xl border border-[#DDD2C4] shadow-xs">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-[#F5ECEB] border border-[#DBC1BE] text-[#6E4541] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#332C2A] mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#786C68]" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@vlb.studio"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#DDD2C4] rounded-xl text-[#332C2A] placeholder-[#786C68]/60 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#332C2A] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#786C68]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#DDD2C4] rounded-xl text-[#332C2A] placeholder-[#786C68]/60 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 px-4 bg-[#A6736E] hover:bg-[#885853] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Ingresando...' : 'Entrar a LAZO'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#EFE8DE] text-center">
            <span className="text-[11px] text-[#786C68]">
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
  const { user, currentWedding } = useAuth();
  const [currentTab, setCurrentTab] = useState<WorkspaceTab>('resumen');

  // If Admin and no specific wedding selected -> General Dashboard
  if (user?.role === 'ADMINISTRADOR' && !currentWedding) {
    return <GeneralDashboard />;
  }

  // If wedding is selected or user is Novios/Coord/Staff: render wedding workspace
  const renderModuleContent = () => {
    switch (currentTab) {
      case 'resumen':
        return <ResumenModule onNavigateTab={setCurrentTab} />;
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
        return <DirectorioModule />;
      case 'bitacora':
        return <BitacoraModule />;
      case 'whatsapp':
        return <WhatsAppHubModule />;
      default:
        return <ResumenModule onNavigateTab={setCurrentTab} />;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] bg-[#F9F6F2]">
      {/* Hamburger Sidebar Drawer (Ocultable en cualquier pantalla desde el botón Menú superior) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
      />

      {/* Main Workspace Area (Ocupa todo el ancho sin botón de menú duplicado) */}
      <main className="flex-1 min-w-0 max-w-[1440px] w-full mx-auto p-5 sm:p-7 lg:p-9 overflow-y-auto bg-[#F9F6F2]">
        {renderModuleContent()}
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F6F2] flex flex-col items-center justify-center text-[#332C2A]">
        <div className="w-11 h-11 rounded-full border-2 border-[#DDD2C4] border-t-[#A6736E] animate-spin mb-4" />
        <span className="font-serif text-3xl font-semibold tracking-[0.22em] text-[#332C2A]">LAZO</span>
        <span className="text-xs text-[#786C68] uppercase tracking-[0.24em] mt-1">VLB STUDIO · PLANNING</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F6F2] text-[#332C2A]">
      <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
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
