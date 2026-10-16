import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Wedding, NotificationItem, UserRole } from '../types';
import { WorkspaceTab } from '../components/Sidebar';

interface AuthContextType {
  user: User | null;
  token: string | null;
  assignedWeddings: Wedding[];
  currentWedding: Wedding | null;
  setCurrentWedding: (wedding: Wedding | null) => void;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  generalDashboardTab: string;
  setGeneralDashboardTab: (tab: string) => void;
  navigateToNotification: (notif: NotificationItem) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUserDemo: (role: UserRole) => Promise<void>;
  notifications: NotificationItem[];
  refreshUserData: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lazo_token'));
  const [assignedWeddings, setAssignedWeddings] = useState<Wedding[]>([]);
  const [currentWedding, setCurrentWedding] = useState<Wedding | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAssignedWeddings(data.assignedWeddings || []);

        // Auto select current wedding if Novios or only 1 wedding
        if (data.user.role === 'NOVIOS' && data.assignedWeddings.length > 0) {
          setCurrentWedding(data.assignedWeddings[0]);
        } else if (!currentWedding && data.assignedWeddings.length > 0) {
          // If we had a stored wedding id, restore it
          const savedId = localStorage.getItem('lazo_active_wedding');
          const found = data.assignedWeddings.find((w: Wedding) => w.id === savedId);
          if (found) {
            setCurrentWedding(found);
          } else if (data.user.role !== 'ADMINISTRADOR') {
            setCurrentWedding(data.assignedWeddings[0]);
          }
        }
      } else {
        localStorage.removeItem('lazo_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (currentWedding) {
      localStorage.setItem('lazo_active_wedding', currentWedding.id);
    } else {
      localStorage.removeItem('lazo_active_wedding');
    }
  }, [currentWedding]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al iniciar sesión.');
    }
    localStorage.setItem('lazo_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await fetchProfile(data.token);
    await fetchNotifications();
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('lazo_token');
    localStorage.removeItem('lazo_active_wedding');
    setToken(null);
    setUser(null);
    setCurrentWedding(null);
    setAssignedWeddings([]);
  };

  // Demo Switcher for fast test and QA
  const switchUserDemo = async (role: UserRole) => {
    const credentials: Record<UserRole, { email: string; pass: string }> = {
      ADMINISTRADOR: { email: 'admin@vlb.studio', pass: 'admin123' },
      COORDINADOR: { email: 'coordinador@vlb.studio', pass: 'coord123' },
      STAFF: { email: 'staff@vlb.studio', pass: 'staff123' },
      NOVIOS: { email: 'novios.sofia@vlb.studio', pass: 'novios123' }
    };
    const cred = credentials[role];
    if (cred) {
      await login(cred.email, cred.pass);
    }
  };

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('resumen');
  const [generalDashboardTab, setGeneralDashboardTab] = useState<string>('weddings');

  const navigateToNotification = async (notif: NotificationItem) => {
    // 1. Mark as read on server
    try {
      if (token && !notif.read) {
        await fetch(`/api/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: 1 } : n));
      }
    } catch {}

    // 2. Select the relevant wedding
    if (notif.wedding_id) {
      let targetWedding = assignedWeddings.find(w => w.id === notif.wedding_id);
      if (!targetWedding && token) {
        try {
          const res = await fetch(`/api/weddings/${notif.wedding_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.wedding) {
              targetWedding = data.wedding;
            }
          }
        } catch {}
      }
      if (targetWedding) {
        setCurrentWedding(targetWedding);
      }
    }

    // 3. Determine target workspace tab based on link or title
    const title = (notif.title || '').toLowerCase();
    const link = (notif.link || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();

    let targetTab: WorkspaceTab = 'resumen';
    if (
      link.includes('meeting') ||
      title.includes('reunión') ||
      title.includes('reunion') ||
      msg.includes('reunión') ||
      msg.includes('reunion')
    ) {
      targetTab = 'reuniones';
    } else if (link.includes('timeline') || title.includes('timeline') || title.includes('cronograma')) {
      targetTab = 'timeline';
    } else if (link.includes('guest') || title.includes('invitado') || msg.includes('invitado') || msg.includes('rsvp')) {
      targetTab = 'invitados';
    } else if (link.includes('table') || title.includes('mesa') || msg.includes('mesa')) {
      targetTab = 'mesas';
    } else if (link.includes('checklist') || title.includes('tarea') || title.includes('checklist')) {
      targetTab = 'checklist';
    } else if (link.includes('proveedor') || title.includes('proveedor') || msg.includes('pago')) {
      targetTab = 'proveedores';
    } else if (link.includes('document') || title.includes('documento')) {
      targetTab = 'documentos';
    }

    setActiveTab(targetTab);
  };

  const refreshUserData = async () => {
    if (token) await fetchProfile(token);
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        assignedWeddings,
        currentWedding,
        setCurrentWedding,
        activeTab,
        setActiveTab,
        generalDashboardTab,
        setGeneralDashboardTab,
        navigateToNotification,
        login,
        logout,
        switchUserDemo,
        notifications,
        refreshUserData,
        refreshNotifications,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
