import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Wedding, NotificationItem, UserRole } from '../types';
import { WorkspaceTab } from '../components/Sidebar';

export interface AppRoute {
  type: 'wedding' | 'dashboard';
  weddingId?: string;
  tab: string;
}

// Parses URL pathname or hash into structured route
export const parseLocation = (pathname: string, hash: string): AppRoute => {
  let path = pathname || '/';
  if (hash && hash.startsWith('#/')) {
    path = hash.slice(1);
  }

  // Remove trailing slashes
  const clean = path.replace(/\/+$/, '') || '/';
  const parts = clean.split('/').filter(Boolean);

  // Match /boda/:weddingId/:tab?
  if (parts[0] === 'boda' && parts[1]) {
    return {
      type: 'wedding',
      weddingId: parts[1],
      tab: parts[2] || 'resumen'
    };
  }

  // Known dashboard tabs: /calendario, /whatsapp, /plantillas, /catalogos, /usuarios, /equipo, /ajustes, /bodas
  const knownDashboard = ['calendario', 'whatsapp', 'plantillas', 'catalogos', 'usuarios', 'equipo', 'ajustes', 'bodas', 'weddings'];
  if (parts[0] && knownDashboard.includes(parts[0])) {
    return {
      type: 'dashboard',
      tab: parts[0] === 'bodas' ? 'weddings' : parts[0] === 'equipo' ? 'usuarios' : parts[0]
    };
  }

  if (parts[0] === 'dashboard' && parts[1]) {
    return {
      type: 'dashboard',
      tab: parts[1] === 'bodas' ? 'weddings' : parts[1]
    };
  }

  return {
    type: 'dashboard',
    tab: 'weddings'
  };
};

export const buildRouteUrl = (route: AppRoute): string => {
  if (route.type === 'wedding' && route.weddingId) {
    return `/boda/${route.weddingId}/${route.tab || 'resumen'}`;
  }
  if (route.tab && route.tab !== 'weddings') {
    return `/${route.tab}`;
  }
  return '/';
};

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
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('auth_token') || params.get('token');
      if (urlToken) {
        localStorage.setItem('lazo_token', urlToken);
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete('auth_token');
        cleanParams.delete('token');
        const searchStr = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${searchStr}`);
        return urlToken;
      }
      return localStorage.getItem('lazo_token');
    }
    return null;
  });
  const [assignedWeddings, setAssignedWeddings] = useState<Wedding[]>([]);
  const [currentWedding, setCurrentWeddingState] = useState<Wedding | null>(null);
  const [activeTab, setActiveTabState] = useState<WorkspaceTab>('resumen');
  const [generalDashboardTab, setGeneralDashboardTabState] = useState<string>('weddings');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const assignedWeddingsRef = useRef<Wedding[]>([]);
  assignedWeddingsRef.current = assignedWeddings;

  const currentWeddingRef = useRef<Wedding | null>(null);
  currentWeddingRef.current = currentWedding;

  const activeTabRef = useRef<WorkspaceTab>(activeTab);
  activeTabRef.current = activeTab;

  const generalDashboardTabRef = useRef<string>(generalDashboardTab);
  generalDashboardTabRef.current = generalDashboardTab;

  // Change active tab within wedding workspace and push to browser history
  const setActiveTab = useCallback((tab: WorkspaceTab) => {
    setActiveTabState(tab);
    const targetWedding = currentWeddingRef.current;
    if (targetWedding) {
      const newUrl = `/boda/${targetWedding.id}/${tab}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({ type: 'wedding', weddingId: targetWedding.id, tab }, '', newUrl);
      }
    }
  }, []);

  // Change general dashboard tab and push to browser history
  const setGeneralDashboardTab = useCallback((tab: string) => {
    setGeneralDashboardTabState(tab);
    const newUrl = tab === 'weddings' ? '/' : `/${tab}`;
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ type: 'dashboard', tab }, '', newUrl);
    }
  }, []);

  // Select or clear wedding and sync browser URL
  const setCurrentWedding = useCallback((wedding: Wedding | null) => {
    setCurrentWeddingState(wedding);
    if (wedding) {
      setActiveTabState('resumen');
      const tab = 'resumen';
      const newUrl = `/boda/${wedding.id}/${tab}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({ type: 'wedding', weddingId: wedding.id, tab }, '', newUrl);
      }
    } else {
      const tab = generalDashboardTabRef.current || 'weddings';
      const newUrl = tab === 'weddings' ? '/' : `/${tab}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({ type: 'dashboard', tab }, '', newUrl);
      }
    }
  }, []);

  // Fetch user profile and sync with current URL route
  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        const weddings: Wedding[] = data.assignedWeddings || [];
        setAssignedWeddings(weddings);

        // Parse initial URL from browser
        const initialRoute = parseLocation(window.location.pathname, window.location.hash);

        if (initialRoute.type === 'wedding' && initialRoute.weddingId) {
          let found = weddings.find(w => w.id === initialRoute.weddingId);
          if (!found) {
            try {
              const resWed = await fetch(`/api/weddings/${initialRoute.weddingId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
              });
              if (resWed.ok) {
                const dWed = await resWed.json();
                if (dWed.wedding) found = dWed.wedding;
              }
            } catch {}
          }
          if (found) {
            setCurrentWeddingState(found);
            setActiveTabState((initialRoute.tab as WorkspaceTab) || 'resumen');
            return;
          }
        }

        if (initialRoute.type === 'dashboard' && initialRoute.tab !== 'weddings') {
          setCurrentWeddingState(null);
          setGeneralDashboardTabState(initialRoute.tab);
          return;
        }

        // Auto select current wedding if Novios or only 1 wedding
        if (data.user.role === 'NOVIOS' && weddings.length > 0) {
          setCurrentWeddingState(weddings[0]);
          setActiveTabState('resumen');
          const targetUrl = `/boda/${weddings[0].id}/resumen`;
          if (window.location.pathname !== targetUrl) {
            window.history.replaceState({ type: 'wedding', weddingId: weddings[0].id, tab: 'resumen' }, '', targetUrl);
          }
        } else if (data.user.role !== 'ADMINISTRADOR' && weddings.length > 0) {
          const savedId = localStorage.getItem('lazo_active_wedding');
          const found = weddings.find(w => w.id === savedId) || weddings[0];
          setCurrentWeddingState(found);
          setActiveTabState('resumen');
          const targetUrl = `/boda/${found.id}/resumen`;
          if (window.location.pathname !== targetUrl && window.location.pathname === '/') {
            window.history.replaceState({ type: 'wedding', weddingId: found.id, tab: 'resumen' }, '', targetUrl);
          }
        } else {
          // Admin at root /
          setCurrentWeddingState(null);
          setGeneralDashboardTabState('weddings');
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

  // Browser Back / Forward button handler (popstate event)
  useEffect(() => {
    const handlePopState = async () => {
      const route = parseLocation(window.location.pathname, window.location.hash);

      if (route.type === 'wedding' && route.weddingId) {
        let match = assignedWeddingsRef.current.find(w => w.id === route.weddingId);
        if (!match && token) {
          try {
            const res = await fetch(`/api/weddings/${route.weddingId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.wedding) match = data.wedding;
            }
          } catch {}
        }
        if (match) {
          setCurrentWeddingState(match);
          setActiveTabState((route.tab as WorkspaceTab) || 'resumen');
        }
      } else {
        setCurrentWeddingState(null);
        setGeneralDashboardTabState(route.tab || 'weddings');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [token]);

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
    setCurrentWeddingState(null);
    setAssignedWeddings([]);
    window.history.pushState({}, '', '/');
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
    let targetWedding: Wedding | null = null;
    if (notif.wedding_id) {
      targetWedding = assignedWeddings.find(w => w.id === notif.wedding_id) || null;
      if (!targetWedding && token) {
        try {
          const res = await fetch(`/api/weddings/${notif.wedding_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.wedding) targetWedding = data.wedding;
          }
        } catch {}
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

    if (targetWedding) {
      setCurrentWeddingState(targetWedding);
      setActiveTabState(targetTab);
      const newUrl = `/boda/${targetWedding.id}/${targetTab}`;
      window.history.pushState({ type: 'wedding', weddingId: targetWedding.id, tab: targetTab }, '', newUrl);
    } else {
      setActiveTab(targetTab);
    }
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
