import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

const PLANS = {
  esencial: {
    id: 'esencial',
    title: 'Lazo · Plan Esencial (Acceso Completo)',
    amount: 990,
    hasLayout2d: 0,
    hasWhatsappRsvp: 0
  },
  pro: {
    id: 'pro',
    title: 'Lazo Pro · Plano 2D + RSVP Automatizado',
    amount: 1990,
    hasLayout2d: 1,
    hasWhatsappRsvp: 1
  }
} as const;

type PlanId = keyof typeof PLANS;

function getBaseUrl(req: any): string {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'www.lazostudio.mx';
  return `${proto}://${host}`;
}

function makeSlug(partner1: string, partner2: string): string {
  const base = `${partner1}-${partner2}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'boda';
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

async function fetchMpPayment(paymentId: string): Promise<any | null> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || !paymentId) return null;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Idempotently fulfills an approved checkout order:
 * creates the wedding (`Planner Virtual` with plan flags), the NOVIOS user, and assignment.
 */
function fulfillCheckoutOrder(orderId: string, mpPaymentId?: string): { user: any; wedding: any } | null {
  const order = db.prepare('SELECT * FROM checkout_orders WHERE id = ?').get(orderId) as any;
  if (!order) return null;

  // Already fulfilled -> return existing user & wedding
  if (order.status === 'APPROVED' && order.created_user_id && order.created_wedding_id) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.created_user_id) as any;
    const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(order.created_wedding_id) as any;
    if (user && wedding) return { user, wedding };
  }

  const plan = PLANS[(order.plan_id as PlanId)] || PLANS.esencial;
  const now = new Date().toISOString();

  // Check if user already exists (safety for duplicate retries)
  let existingUser = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(order.email) as any;
  let weddingId = existingUser?.wedding_id || `wed_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  let userId = existingUser?.id || `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const coupleName = `${order.partner_1_name} & ${order.partner_2_name}`;
  const slug = makeSlug(order.partner_1_name, order.partner_2_name);

  db.exec('BEGIN');
  try {
    let wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
    if (!wedding) {
      db.prepare(`
        INSERT INTO weddings (
          id, name, slug, partner_1_name, partner_2_name, wedding_date,
          estimated_guests, status, package_type, event_type,
          has_whatsapp_rsvp, has_layout_2d, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PLANNING', 'Planner Virtual', 'Boda Completa', ?, ?, ?, ?)
      `).run(
        weddingId,
        coupleName,
        slug,
        order.partner_1_name,
        order.partner_2_name,
        order.wedding_date,
        120,
        plan.hasWhatsappRsvp,
        plan.hasLayout2d,
        now,
        now
      );
      wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
    } else {
      // Upgrade existing wedding flags if needed
      db.prepare(`
        UPDATE weddings
        SET has_whatsapp_rsvp = ?, has_layout_2d = ?, updated_at = ?
        WHERE id = ?
      `).run(plan.hasWhatsappRsvp, plan.hasLayout2d, now, weddingId);
      wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
    }

    if (!existingUser) {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'NOVIOS', ?, ?, ?, ?)
      `).run(
        userId,
        coupleName,
        order.email.toLowerCase().trim(),
        order.password_hash,
        order.phone || '',
        weddingId,
        now,
        now
      );
      existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    }

    db.prepare(`
      INSERT OR IGNORE INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at)
      VALUES (?, ?, ?, 'NOVIOS', ?)
    `).run(`wa_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`, weddingId, userId, now);

    db.prepare(`
      UPDATE checkout_orders
      SET status = 'APPROVED', mp_payment_id = COALESCE(?, mp_payment_id),
          created_user_id = ?, created_wedding_id = ?, updated_at = ?
      WHERE id = ?
    `).run(mpPaymentId || null, userId, weddingId, now, orderId);

    db.exec('COMMIT');
    return { user: existingUser, wedding };
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    console.error('Error fulfilling checkout order:', err);
    return null;
  }
}

// POST /api/checkout/mercadopago - Crear orden y preferencia de Checkout Pro
router.post('/mercadopago', async (req, res) => {
  const { planId, partner1, partner2, weddingDate, email, phone, password } = req.body || {};

  if (!planId || !(planId in PLANS)) {
    return res.status(400).json({ error: 'Plan inválido.' });
  }
  const p1 = String(partner1 || '').trim();
  const p2 = String(partner2 || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '');
  const cleanDate = String(weddingDate || '').trim();

  if (!p1 || !p2 || !cleanDate || !cleanEmail || cleanPass.length < 6) {
    return res.status(400).json({ error: 'Completa todos los campos (contraseña mínima de 6 caracteres).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Por favor ingresa un correo electrónico válido.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(cleanEmail);
  if (existing) {
    return res.status(400).json({
      error: 'Este correo ya tiene una cuenta registrada en Lazo. Inicia sesión para entrar.'
    });
  }

  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!mpToken) {
    return res.status(503).json({
      code: 'MP_NOT_CONFIGURED',
      error: 'El pago en línea con MercadoPago se está activando. Puedes solicitar tu acceso inmediato por WhatsApp.'
    });
  }

  const plan = PLANS[planId as PlanId];
  const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(cleanPass, 10);

  db.prepare(`
    INSERT INTO checkout_orders (
      id, plan_id, amount, partner_1_name, partner_2_name, wedding_date,
      email, phone, password_hash, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(
    orderId,
    plan.id,
    plan.amount,
    p1,
    p2,
    cleanDate,
    cleanEmail,
    String(phone || '').trim(),
    passwordHash,
    now,
    now
  );

  const baseUrl = getBaseUrl(req);
  const preferencePayload = {
    items: [
      {
        id: plan.id,
        title: plan.title,
        quantity: 1,
        currency_id: 'MXN',
        unit_price: plan.amount
      }
    ],
    payer: {
      name: p1,
      email: cleanEmail
    },
    external_reference: orderId,
    back_urls: {
      success: `${baseUrl}/?checkout_order=${orderId}&mp_status=success`,
      pending: `${baseUrl}/?checkout_order=${orderId}&mp_status=pending`,
      failure: `${baseUrl}/?checkout_order=${orderId}&mp_status=failure`
    },
    auto_return: 'approved',
    notification_url: `${baseUrl}/api/checkout/mercadopago/webhook`,
    payment_methods: {
      installments: 1
    },
    statement_descriptor: 'LAZO STUDIO'
  };

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpToken}`
      },
      body: JSON.stringify(preferencePayload)
    });

    const mpData: any = await mpRes.json();
    if (!mpRes.ok || !mpData.init_point) {
      console.error('MercadoPago preference error:', mpData);
      return res.status(502).json({ error: 'No se pudo iniciar el checkout con MercadoPago. Intenta nuevamente.' });
    }

    db.prepare('UPDATE checkout_orders SET mp_preference_id = ?, updated_at = ? WHERE id = ?').run(
      mpData.id || null,
      new Date().toISOString(),
      orderId
    );

    return res.json({
      orderId,
      init_point: mpData.init_point
    });
  } catch (err) {
    console.error('MercadoPago fetch exception:', err);
    return res.status(500).json({ error: 'Error al conectar con MercadoPago.' });
  }
});

// POST /api/checkout/mercadopago/webhook - Notificación automática de MercadoPago
router.post('/mercadopago/webhook', async (req, res) => {
  try {
    const topic = req.body?.type || req.query?.topic || req.query?.type;
    const paymentId = req.body?.data?.id || req.query?.['data.id'] || req.query?.id;

    if (paymentId && (!topic || String(topic).includes('payment'))) {
      const payment = await fetchMpPayment(String(paymentId));
      if (payment && payment.status === 'approved' && payment.external_reference) {
        fulfillCheckoutOrder(String(payment.external_reference), String(paymentId));
      }
    }
  } catch (err) {
    console.error('MercadoPago webhook error:', err);
  }
  return res.status(200).json({ received: true });
});

// GET /api/checkout/verify - Verifica el pago al volver de MercadoPago y devuelve JWT listo para entrar
router.get('/verify', async (req, res) => {
  const orderId = String(req.query.orderId || '').trim();
  const paymentId = String(req.query.payment_id || req.query.collection_id || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'Orden no especificada.' });
  }

  const order = db.prepare('SELECT * FROM checkout_orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    return res.status(404).json({ error: 'Orden no encontrada.' });
  }

  let result: { user: any; wedding: any } | null = null;

  if (order.status === 'APPROVED') {
    result = fulfillCheckoutOrder(orderId);
  } else if (paymentId) {
    const payment = await fetchMpPayment(paymentId);
    if (payment && payment.status === 'approved' && String(payment.external_reference) === orderId) {
      result = fulfillCheckoutOrder(orderId, paymentId);
    } else if (payment && (payment.status === 'pending' || payment.status === 'in_process')) {
      return res.json({ approved: false, pending: true });
    } else {
      return res.json({ approved: false, pending: false });
    }
  } else {
    return res.json({ approved: false, pending: true });
  }

  if (!result) {
    return res.status(500).json({ error: 'No se pudo activar tu cuenta. Contáctanos por WhatsApp.' });
  }

  const { user, wedding } = result;
  const tokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    wedding_id: user.wedding_id,
    vlb_access: 0
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    approved: true,
    token,
    user: tokenPayload,
    wedding
  });
});

export default router;
