import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

export const VersionWatcher: React.FC = () => {
  const [initialBuild, setInitialBuild] = useState<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const checkingRef = useRef(false);

  const checkVersion = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        const serverBuild = data?.build;
        if (!serverBuild) return;

        setInitialBuild(prev => {
          if (!prev) {
            // Primer chequeo al iniciar la app
            return serverBuild;
          }
          if (prev !== serverBuild) {
            // El servidor tiene una nueva versión desplegada
            setHasUpdate(true);
            // Recargar automáticamente después de 1.8 segundos
            setTimeout(() => {
              window.location.reload();
            }, 1800);
          }
          return prev;
        });
      }
    } catch {
      // Ignorar errores transitorios de red
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Chequeo inicial
    checkVersion();

    // 2. Intervalo cada 20 segundos
    const interval = setInterval(checkVersion, 20000);

    // 3. Chequeo instantáneo al regresar a la pestaña
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkVersion);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkVersion);
    };
  }, []);

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-subtle pointer-events-auto">
      <div className="flex items-center space-x-3 px-5 py-3 rounded-full bg-[#2B2826] text-white shadow-2xl border border-[#C48B81]/40 backdrop-blur-md">
        <Sparkles className="w-4 h-4 text-[#C48B81] animate-spin-slow shrink-0" />
        <span className="text-xs font-semibold tracking-wide">
          Nueva versión disponible · Actualizando LAZO...
        </span>
        <button
          onClick={() => window.location.reload()}
          className="p-1 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white transition cursor-pointer"
          title="Recargar ahora"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        </button>
      </div>
    </div>
  );
};
