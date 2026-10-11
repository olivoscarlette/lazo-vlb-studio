import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { authenticateToken, requireRole, JWT_SECRET, logAudit } from '../middleware/auth.js';

const router = Router();

// Brute-force login rate limiter (max 10 failed attempts per 15 min window per email/IP)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const rateKey = `${req.ip || 'ip'}_${normalizedEmail}`;

  if (process.env.NODE_ENV !== 'test') {
    const attempt = loginAttempts.get(rateKey);
    const nowMs = Date.now();
    if (attempt) {
      if (nowMs - attempt.firstAttempt > 15 * 60 * 1000) {
        loginAttempts.delete(rateKey);
      } else if (attempt.count >= 10) {
        return res.status(429).json({
          error: 'Demasiados intentos fallidos. Por seguridad, espera 15 minutos antes de volver a intentar.'
        });
      }
    }
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
  if (!user) {
    if (process.env.NODE_ENV !== 'test') {
      const prev = loginAttempts.get(rateKey);
      loginAttempts.set(rateKey, { count: (prev?.count || 0) + 1, firstAttempt: prev?.firstAttempt || Date.now() });
    }
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    if (process.env.NODE_ENV !== 'test') {
      const prev = loginAttempts.get(rateKey);
      loginAttempts.set(rateKey, { count: (prev?.count || 0) + 1, firstAttempt: prev?.firstAttempt || Date.now() });
    }
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  loginAttempts.delete(rateKey);

  const tokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    wedding_id: user.wedding_id
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  // Set HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    message: 'Inicio de sesión exitoso.',
    token,
    user: tokenPayload
  });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Sesión cerrada correctamente.' });
});

// Current User Profile & Context
router.get('/me', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  let assignedWeddings: any[] = [];
  if (req.user.role === 'ADMINISTRADOR') {
    assignedWeddings = db.prepare('SELECT id, name, slug, wedding_date, status FROM weddings ORDER BY wedding_date ASC').all();
  } else if (req.user.role === 'COORDINADOR' || req.user.role === 'STAFF') {
    assignedWeddings = db.prepare(`
      SELECT w.id, w.name, w.slug, w.wedding_date, w.status, a.assigned_role
      FROM weddings w
      JOIN wedding_assignments a ON a.wedding_id = w.id
      WHERE a.user_id = ?
      ORDER BY w.wedding_date ASC
    `).all(req.user.id);
  } else if (req.user.role === 'NOVIOS' && req.user.wedding_id) {
    const wedding = db.prepare('SELECT id, name, slug, wedding_date, status FROM weddings WHERE id = ?').get(req.user.wedding_id);
    if (wedding) assignedWeddings = [wedding];
  }

  return res.json({
    user: req.user,
    assignedWeddings
  });
});

// Admin: List all users
router.get('/users', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, phone, wedding_id, created_at FROM users ORDER BY name ASC').all();
  return res.json({ users });
});

// Admin: Create User
router.post('/users', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { name, email, password, role, phone, wedding_id } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'El email ya se encuentra registrado.' });
  }

  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), email.toLowerCase().trim(), hash, role, phone || null, wedding_id || null, now, now);

  logAudit(null, req.user!.id, req.user!.name, 'CREAR_USUARIO', 'USER', id, `Creación de usuario ${name} con rol ${role}`);

  return res.status(201).json({
    message: 'Usuario creado exitosamente.',
    user: { id, name, email: email.toLowerCase().trim(), role, phone, wedding_id }
  });
});

// Admin: Edit User
router.put('/users/:id', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, phone, wedding_id } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const now = new Date().toISOString();
  let hash = user.password_hash;
  if (password && password.trim().length > 0) {
    hash = bcrypt.hashSync(password, 10);
  }

  db.prepare(`
    UPDATE users SET name = ?, email = ?, password_hash = ?, role = ?, phone = ?, wedding_id = ?, updated_at = ?
    WHERE id = ?
  `).run(name || user.name, email ? email.toLowerCase().trim() : user.email, hash, role || user.role, phone ?? user.phone, wedding_id ?? user.wedding_id, now, id);

  logAudit(null, req.user!.id, req.user!.name, 'EDITAR_USUARIO', 'USER', id, `Modificación de usuario ${name || user.name}`);

  return res.json({ message: 'Usuario actualizado correctamente.' });
});

export default router;
