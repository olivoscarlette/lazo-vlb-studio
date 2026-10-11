import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'lazo_vlb_studio_secret_2026_super_secure';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMINISTRADOR' | 'COORDINADOR' | 'STAFF' | 'NOVIOS';
  phone?: string;
  wedding_id?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (typeof req.query.token === 'string' && req.query.token.length > 0) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Sesión no iniciada o token ausente.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Verify user still exists in DB
    const user = db.prepare('SELECT id, name, email, role, phone, wedding_id FROM users WHERE id = ?').get(decoded.id) as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: 'Usuario no válido o eliminado.' });
    }

    // Check if Phase 2 (Portal de Novios) is active when user is NOVIOS
    if (user.role === 'NOVIOS') {
      const phaseRow = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get('system_phases') as { values_json: string } | undefined;
      if (phaseRow) {
        try {
          const phases = JSON.parse(phaseRow.values_json) as { id: string; enabled: boolean }[];
          const phase2 = phases.find(p => p.id === 'phase2_novios_portal');
          if (phase2 && phase2.enabled === false) {
            return res.status(403).json({
              error: 'El Portal de Novios (Fase 2) se encuentra desactivado por el Administrador de VLB Studio.'
            });
          }
        } catch {
          // ignore parse error
        }
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes para esta operación.' });
    }
    next();
  };
}

/**
 * Strict Multi-Wedding Isolation Enforcement:
 * - ADMINISTRADOR: Has access to all weddings.
 * - COORDINADOR / STAFF: MUST be assigned in wedding_assignments table to the specific wedding.
 * - NOVIOS: Can ONLY access their own wedding (user.wedding_id === weddingId).
 */
export function requireWeddingAccess(req: Request, res: Response, next: NextFunction) {
  const weddingId = (req.params.weddingId || req.body.weddingId || req.query.weddingId) as string;

  if (!weddingId) {
    return res.status(400).json({ error: 'ID de boda no especificado en la solicitud.' });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  // 1. ADMINISTRADOR: Full access to all weddings
  if (user.role === 'ADMINISTRADOR') {
    return next();
  }

  // 2. NOVIOS: Only their specific wedding
  if (user.role === 'NOVIOS') {
    if (user.wedding_id !== weddingId) {
      return res.status(403).json({
        error: 'Acceso denegado: Los novios solo pueden acceder a su propia boda asignada.'
      });
    }
    return next();
  }

  // 3. COORDINADOR / STAFF: Must be assigned explicitly to this wedding
  if (user.role === 'COORDINADOR' || user.role === 'STAFF') {
    const assignment = db.prepare(`
      SELECT assigned_role FROM wedding_assignments
      WHERE wedding_id = ? AND user_id = ?
    `).get(weddingId, user.id);

    if (!assignment) {
      return res.status(403).json({
        error: 'Acceso denegado: No tienes autorización ni estás asignado a esta boda en VLB Studio.'
      });
    }
    return next();
  }

  return res.status(403).json({ error: 'Rol no autorizado.' });
}

/**
 * 5-Day Lock Check:
 * If the user is NOVIOS, they cannot modify tables, layout, or table seat assignments
 * if the wedding date is within 5 days or past.
 */
export function check5DayTableLock(req: Request, res: Response, next: NextFunction) {
  const weddingId = (req.params.weddingId || req.body.weddingId || req.query.weddingId) as string;
  const user = req.user;

  if (user && user.role === 'NOVIOS') {
    const wedding = db.prepare('SELECT wedding_date FROM weddings WHERE id = ?').get(weddingId) as { wedding_date: string } | undefined;
    if (wedding && wedding.wedding_date) {
      const weddingDate = new Date(wedding.wedding_date);
      const today = new Date();
      // Set to midnight for clean comparison
      weddingDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = weddingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 5) {
        return res.status(403).json({
          error: 'Bloqueo operativo activo: A 5 días o menos del evento, la modificación de mesas y layout está bloqueada para los Novios. Por favor solicita ajustes con tu Coordinador de VLB Studio.'
        });
      }
    }
  }

  next();
}

export function logAudit(weddingId: any, userId: string, userName: string, action: string, entityType: string, entityId: any, details: string) {
  try {
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, wedding_id, user_id, user_name, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, weddingId, userId, userName, action, entityType, entityId, details, now);
  } catch (err) {
    console.error('Error logging audit:', err);
  }
}
