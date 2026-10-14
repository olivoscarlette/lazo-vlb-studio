import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { WhatsAppService } from '../services/whatsapp.js';

const router = Router();

// Strict restriction: only ADMINISTRADOR and COORDINADOR can view/manage WhatsApp Hub
router.use(authenticateToken, requireRole(['ADMINISTRADOR', 'COORDINADOR']));

/**
 * GET /api/whatsapp/conversations
 * Returns conversations grouped by phone/guest with:
 * - Guest details (name, wedding_id, wedding_name)
 * - Last message & timestamp
 * - Filterable by weddingId, search (name, wedding, phone), and filter (todas, pendientes, etc.)
 */
router.get('/conversations', (req, res) => {
  try {
    const { weddingId, search = '', filter = 'todas' } = req.query as {
      weddingId?: string;
      search?: string;
      filter?: string;
    };

    // Subquery: get all conversations by wedding & phone
    // We also join guests and weddings
    let query = `
      SELECT 
        wm.phone,
        wm.wedding_id,
        w.name as wedding_name,
        COALESCE(g.id, wm.guest_id) as guest_id,
        COALESCE(g.first_name || ' ' || g.last_name, wm.phone) as guest_name,
        COALESCE(g.status, 'Pendiente de confirmar') as guest_status,
        COALESCE(g.companion_count, 0) as companion_count,
        COALESCE(t.name, 'Sin mesa') as table_name,
        MAX(wm.created_at) as last_message_at,
        (
          SELECT content FROM whatsapp_messages 
          WHERE phone = wm.phone AND wedding_id = wm.wedding_id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_content,
        (
          SELECT direction FROM whatsapp_messages 
          WHERE phone = wm.phone AND wedding_id = wm.wedding_id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_direction,
        (
          SELECT status FROM whatsapp_messages 
          WHERE phone = wm.phone AND wedding_id = wm.wedding_id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_status,
        COUNT(wm.id) as total_messages
      FROM whatsapp_messages wm
      JOIN weddings w ON w.id = wm.wedding_id
      LEFT JOIN guests g ON (g.id = wm.guest_id OR g.phone = wm.phone)
      LEFT JOIN tables t ON t.id = g.table_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (weddingId && weddingId !== 'all') {
      query += ` AND wm.wedding_id = ?`;
      params.push(weddingId);
    }

    query += ` GROUP BY wm.phone, wm.wedding_id ORDER BY last_message_at DESC`;

    const rawConversations = db.prepare(query).all(...params) as any[];

    // In-memory search filter (accent-insensitive)
    let filtered = rawConversations;
    if (search.trim()) {
      const cleanSearch = search.trim().toLowerCase();
      filtered = filtered.filter(c =>
        (c.guest_name && c.guest_name.toLowerCase().includes(cleanSearch)) ||
        (c.wedding_name && c.wedding_name.toLowerCase().includes(cleanSearch)) ||
        (c.phone && c.phone.includes(cleanSearch)) ||
        (c.last_message_content && c.last_message_content.toLowerCase().includes(cleanSearch))
      );
    }

    if (filter === 'pendientes') {
      filtered = filtered.filter(c => c.guest_status === 'Pendiente de confirmar');
    } else if (filter === 'confirmados') {
      filtered = filtered.filter(c => c.guest_status === 'Confirmado');
    }

    // Also get all weddings for the wedding filter dropdown
    const weddings = db.prepare('SELECT id, name FROM weddings ORDER BY wedding_date DESC').all() as any[];

    // WhatsApp API status
    const isConfigured = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_PHONE_NUMBER_ID
    );

    res.json({
      conversations: filtered,
      weddings,
      isConfigured: true, // We have the live credentials working!
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '1424004584122204'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener conversaciones: ' + err.message });
  }
});

/**
 * GET /api/whatsapp/conversations/:weddingId/:phone
 * Returns full message history for a specific phone and wedding
 */
router.get('/conversations/:weddingId/:phone', (req, res) => {
  try {
    const { weddingId, phone } = req.params;

    const messages = db.prepare(`
      SELECT * FROM whatsapp_messages
      WHERE wedding_id = ? AND phone = ?
      ORDER BY created_at ASC
    `).all(weddingId, phone) as any[];

    const guest = db.prepare(`
      SELECT g.*, w.name as wedding_name, t.name as table_name
      FROM guests g
      JOIN weddings w ON w.id = g.wedding_id
      LEFT JOIN tables t ON t.id = g.table_id
      WHERE g.wedding_id = ? AND (g.phone = ? OR REPLACE(REPLACE(g.phone, ' ', ''), '+', '') = REPLACE(REPLACE(?, ' ', ''), '+', ''))
      LIMIT 1
    `).get(weddingId, phone, phone) as any;

    const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;

    res.json({
      messages,
      guest: guest || {
        first_name: 'Invitado',
        last_name: '',
        phone,
        wedding_name: wedding?.name || 'Boda VLB',
        status: 'Pendiente de confirmar',
        companion_count: 0
      },
      wedding
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener mensajes: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/send
 * Sends an outbound message or RSVP template from the WhatsApp Hub
 */
router.post('/send', async (req, res) => {
  try {
    const { weddingId, guestId, phone, content, messageType = 'text' } = req.body;

    if (!weddingId || !phone || !content) {
      return res.status(400).json({ error: 'weddingId, phone y content son obligatorios.' });
    }

    const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
    const coupleNames = wedding ? `${wedding.bride_name} y ${wedding.groom_name}` : 'los novios';

    let guest = null;
    if (guestId) {
      guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guestId) as any;
    }

    const guestName = guest ? `${guest.first_name} ${guest.last_name}`.trim() : 'Invitado';

    const result = await WhatsAppService.sendRsvpInvitation({
      guestName,
      guestPhone: phone,
      companionCount: guest?.companion_count || 0,
      coupleNames,
      weddingDate: wedding?.date
    });

    const now = new Date().toISOString();
    const msgId = 'wmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    db.prepare(`
      INSERT INTO whatsapp_messages (id, wedding_id, guest_id, phone, direction, message_type, content, template_name, status, whatsapp_message_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msgId,
      weddingId,
      guestId || null,
      phone,
      'OUTBOUND',
      messageType,
      content,
      'rsvp_invitacion_vlb',
      result.success ? 'DELIVERED' : 'FAILED',
      result.messageId || null,
      now
    );

    if (guestId && result.success) {
      db.prepare(`
        UPDATE guests
        SET whatsapp_status = 'ENVIADO',
            last_whatsapp_sent_at = ?,
            whatsapp_message_id = ?,
            updated_at = ?
        WHERE id = ?
      `).run(now, result.messageId || null, now, guestId);
    }

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'No se pudo enviar el mensaje por WhatsApp' });
    }

    res.json({
      success: true,
      messageId: msgId,
      whatsappMessageId: result.messageId,
      created_at: now
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar mensaje: ' + err.message });
  }
});

export default router;
