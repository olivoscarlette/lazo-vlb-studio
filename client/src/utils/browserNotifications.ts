/**
 * Utilidad de Notificaciones del Navegador (Web Notifications API)
 * Permite emitir alertas nativas en pantalla (Mac, Windows, Android) incluso
 * cuando la pestaña de Lazo Studio está en segundo plano o minimizada.
 */

// Sonido sutil y elegante de notificación usando Web Audio API nativo (sin dependencias externas)
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tono suave doble (campanita editorial)
    const now = ctx.currentTime;
    
    // Tono 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tono 2 (más alto, armónico)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Si el navegador bloquea audio sin interacción previa, se ignora silenciosamente
  }
}

/**
 * Consulta el estado actual de permisos en el navegador
 */
export function getBrowserNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permiso nativo al usuario para mostrar notificaciones de escritorio
 */
export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playNotificationChime();
      sendBrowserNotification('¡Notificaciones de Lazo Studio Activas! ✨', {
        body: 'Te avisaremos aquí en tiempo real cuando firmen contratos o confirmen asistencia tus invitados.',
        tag: 'lazo-welcome-notif'
      });
    }
    return permission;
  } catch (err) {
    console.warn('Error al solicitar permiso de notificaciones:', err);
    return Notification.permission;
  }
}

/**
 * Emite una notificación nativa del sistema operativo
 */
export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    link?: string;
    tag?: string;
    silent?: boolean;
  }
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    if (!options?.silent) {
      playNotificationChime();
    }

    const iconUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/pwa-192x192.png`
      : undefined;

    // Disparar evento para banner visual flotante dentro de LAZO
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lazo-inapp-notification', {
        detail: {
          title,
          body: options?.body,
          link: options?.link,
          tag: options?.tag
        }
      }));
    }

    const notif = new Notification(title, {
      body: options?.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: options?.tag,
      renotify: Boolean(options?.tag)
    });

    notif.onclick = () => {
      window.focus();
      if (options?.link) {
        if (options.link.startsWith('http')) {
          window.open(options.link, '_blank');
        } else {
          window.location.href = options.link;
        }
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('No se pudo emitir la notificación nativa:', err);
    return null;
  }
}
