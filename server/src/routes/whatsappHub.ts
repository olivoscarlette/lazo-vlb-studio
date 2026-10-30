import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { WhatsAppService } from '../services/whatsappService.js';
import { BroadcastScheduler } from '../services/broadcastScheduler.js';

const router = Router();

// Strict restriction: only ADMINISTRADOR and COORDINADOR can view/manage WhatsApp Hub
router.use(authenticateToken, requireRole(['ADMINISTRADOR', 'COORDINADOR']));

/**
 * GET /api/whatsapp/contacts
 * Returns contacts registered in the system with their unread count and assigned agent
 */
router.get('/contacts', (req, res) => {
  try {
    const { weddingId, search = '' } = req.query as {
      weddingId?: string;
      search?: string;
    };

    let query = `
      SELECT 
        wc.*,
        w.name as wedding_name
      FROM whatsapp_contacts wc
      LEFT JOIN weddings w ON w.id = wc.wedding_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (weddingId && weddingId !== 'all') {
      query += ` AND wc.wedding_id = ?`;
      params.push(weddingId);
    }

    query += ` ORDER BY wc.last_message_at DESC`;

    let contacts = db.prepare(query).all(...params) as any[];

    if (search.trim()) {
      const cleanSearch = search.trim().toLowerCase();
      contacts = contacts.filter(
        c =>
          (c.name && c.name.toLowerCase().includes(cleanSearch)) ||
          (c.phone_number && c.phone_number.includes(cleanSearch)) ||
          (c.assigned_agent && c.assigned_agent.toLowerCase().includes(cleanSearch)) ||
          (c.last_message_preview && c.last_message_preview.toLowerCase().includes(cleanSearch))
      );
    }

    res.json({ contacts });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener contactos: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/assign-agent
 * Assigns an agent to a contact conversation
 */
router.post('/assign-agent', (req, res) => {
  try {
    const { phoneNumber, agentName } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber es requerido.' });
    }

    const normalized = WhatsAppService.normalizePhoneNumber(phoneNumber);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE whatsapp_contacts
      SET assigned_agent = ?, updated_at = ?
      WHERE phone_number = ?
    `).run(agentName || null, now, normalized);

    res.json({ success: true, phoneNumber: normalized, assignedAgent: agentName });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al asignar agente: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/mark-read
 * Resets unread counter for a contact
 */
router.post('/mark-read', (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber es requerido.' });
    }

    const normalized = WhatsAppService.normalizePhoneNumber(phoneNumber);
    WhatsAppService.upsertContact({
      phoneNumber: normalized,
      resetUnread: true
    });

    res.json({ success: true, phoneNumber: normalized });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al marcar como leído: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/send-text
 * Sends a modular outbound plain text message
 */
router.post('/send-text', async (req, res) => {
  try {
    const { to, text, weddingId, guestId, previewUrl } = req.body;
    if (!to || !text) {
      return res.status(400).json({ error: 'Campos obligatorios: "to" y "text".' });
    }

    const result = await WhatsAppService.sendTextMessage(to, text, {
      weddingId,
      guestId,
      previewUrl: Boolean(previewUrl),
      sender: 'AGENT'
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      simulated: result.simulated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar texto: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/send-interactive-buttons
 * Sends a modular interactive message with quick-reply buttons (up to 3)
 */
router.post('/send-interactive-buttons', async (req, res) => {
  try {
    const { to, bodyText, buttons, headerText, footerText, weddingId, guestId } = req.body;
    if (!to || !bodyText || !buttons) {
      return res.status(400).json({ error: 'Campos obligatorios: "to", "bodyText" y "buttons".' });
    }

    const result = await WhatsAppService.sendInteractiveButtons(to, bodyText, buttons, {
      headerText,
      footerText,
      weddingId,
      guestId,
      sender: 'AGENT'
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      simulated: result.simulated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar botones interactivos: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/send-interactive-list
 * Sends a modular interactive selectable list message
 */
router.post('/send-interactive-list', async (req, res) => {
  try {
    const { to, bodyText, buttonText, sections, headerText, footerText, weddingId, guestId } = req.body;
    if (!to || !bodyText || !buttonText || !sections) {
      return res.status(400).json({ error: 'Campos obligatorios: "to", "bodyText", "buttonText" y "sections".' });
    }

    const result = await WhatsAppService.sendInteractiveList(to, bodyText, buttonText, sections, {
      headerText,
      footerText,
      weddingId,
      guestId,
      sender: 'AGENT'
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      simulated: result.simulated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar lista interactiva: ' + err.message });
  }
});

/**
 * GET /api/whatsapp/conversations
 * Returns conversations grouped by phone/guest
 */
function getPhoneLast10(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * GET /api/whatsapp/conversations
 * Returns active WhatsApp conversations, aggregated by contact (last 10 digits) and wedding
 */
router.get('/conversations', (req, res) => {
  try {
    const { weddingId, search = '', filter = 'todas' } = req.query as {
      weddingId?: string;
      search?: string;
      filter?: string;
    };

    let msgQuery = `
      SELECT 
        wm.*,
        w.name as wedding_name
      FROM whatsapp_messages wm
      JOIN weddings w ON w.id = wm.wedding_id
    `;
    const params: any[] = [];
    if (weddingId && weddingId !== 'all') {
      msgQuery += ` WHERE wm.wedding_id = ?`;
      params.push(weddingId);
    }
    msgQuery += ` ORDER BY wm.created_at DESC`;

    const rawMessages = db.prepare(msgQuery).all(...params) as any[];

    const allGuests = db.prepare(`
      SELECT g.*, t.name as table_name
      FROM guests g
      LEFT JOIN tables t ON t.id = g.table_id
    `).all() as any[];

    const allUsers = db.prepare(`
      SELECT id, name, email, phone, role, wedding_id
      FROM users
      WHERE phone IS NOT NULL AND phone != ''
    `).all() as any[];

    const allVendors = db.prepare(`
      SELECT id, name, type, phone, wedding_id
      FROM vendors
      WHERE phone IS NOT NULL AND phone != ''
    `).all() as any[];

    const allContacts = db.prepare('SELECT * FROM whatsapp_contacts').all() as any[];

    const groupMap = new Map<string, {
      phone: string;
      wedding_id: string;
      wedding_name: string;
      guest_id: string | null;
      guest_name: string;
      guest_status: string;
      companion_count: number;
      table_name: string;
      contact_type: 'NOVIOS' | 'INVITADO' | 'PROVEEDOR' | 'PROSPECTO' | 'EQUIPO';
      contact_role_label: string;
      is_archived: boolean;
      last_message_at: string;
      last_message_content: string;
      last_message_direction: 'OUTBOUND' | 'INBOUND';
      last_message_status: string;
      total_messages: number;
      unread_count: number;
    }>();

    for (const msg of rawMessages) {
      const last10 = getPhoneLast10(msg.phone);

      // 1. Check if matches couple / user
      const matchedUser = allUsers.find(u => 
        (u.wedding_id === msg.wedding_id || !u.wedding_id) && getPhoneLast10(u.phone) === last10
      ) || allUsers.find(u => getPhoneLast10(u.phone) === last10);

      // 2. Check if matches guest
      const matchedGuest = allGuests.find(g => 
        g.wedding_id === msg.wedding_id && getPhoneLast10(g.phone) === last10
      ) || allGuests.find(g => getPhoneLast10(g.phone) === last10);

      // 3. Check if matches vendor
      const matchedVendor = allVendors.find(v => 
        (v.wedding_id === msg.wedding_id || !v.wedding_id) && getPhoneLast10(v.phone) === last10
      ) || allVendors.find(v => getPhoneLast10(v.phone) === last10);

      const matchedContact = allContacts.find(c => getPhoneLast10(c.phone_number) === last10);

      let contactType: 'NOVIOS' | 'INVITADO' | 'PROVEEDOR' | 'PROSPECTO' | 'EQUIPO' = 'PROSPECTO';
      let contactRoleLabel = 'Nuevo Prospecto';
      let displayName = msg.phone;

      if (matchedUser) {
        if (matchedUser.role === 'NOVIOS') {
          contactType = 'NOVIOS';
          contactRoleLabel = 'Novios';
          displayName = matchedUser.name;
        } else {
          contactType = 'EQUIPO';
          contactRoleLabel = matchedUser.role === 'ADMINISTRADOR'
            ? 'Administrador'
            : (matchedUser.role === 'COORDINADOR' ? 'Coordinación' : 'Equipo Lazo');
          displayName = matchedUser.name;
        }
      } else if (matchedGuest) {
        contactType = 'INVITADO';
        contactRoleLabel = matchedGuest.status === 'Confirmado' ? 'Invitado Confirmado' : 'Invitado';
        displayName = `${matchedGuest.first_name} ${matchedGuest.last_name}`.trim();
      } else if (matchedVendor) {
        contactType = 'PROVEEDOR';
        contactRoleLabel = matchedVendor.type || 'Proveedor';
        displayName = matchedVendor.name;
      } else if (matchedContact?.name) {
        displayName = matchedContact.name;
      }

      // Grouping key: for prospects and internal team, group strictly by phone so they are never tied to an arbitrary wedding
      const isDetached = contactType === 'PROSPECTO' || contactType === 'EQUIPO';
      const key = isDetached ? `${contactType.toLowerCase()}_${last10}` : `${msg.wedding_id}_${last10}`;
      const effectiveWeddingId = isDetached ? contactType.toLowerCase() : msg.wedding_id;
      const effectiveWeddingName = isDetached ? '' : (msg.wedding_name || '');
      const isArchived = Boolean(matchedContact?.is_archived);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          phone: WhatsAppService.normalizePhoneNumber(msg.phone) || msg.phone,
          wedding_id: effectiveWeddingId,
          wedding_name: effectiveWeddingName,
          guest_id: matchedGuest?.id || msg.guest_id || null,
          guest_name: displayName,
          guest_status: matchedGuest?.status || (contactType === 'NOVIOS' ? 'Pareja' : (contactType === 'EQUIPO' ? 'Equipo Lazo' : (matchedVendor ? 'Proveedor' : 'Sin asignar'))),
          companion_count: matchedGuest?.companion_count || 0,
          table_name: matchedGuest?.table_name || 'Sin mesa',
          contact_type: contactType,
          contact_role_label: contactRoleLabel,
          is_archived: isArchived,
          last_message_at: msg.created_at,
          last_message_content: msg.content,
          last_message_direction: msg.direction,
          last_message_status: msg.status,
          total_messages: 1,
          unread_count: (msg.direction === 'INBOUND' && msg.status !== 'READ') ? 1 : 0
        });
      } else {
        const item = groupMap.get(key)!;
        item.total_messages += 1;
        if (msg.direction === 'INBOUND' && msg.status !== 'READ') {
          item.unread_count += 1;
        }
      }
    }

    const conversations = Array.from(groupMap.values());
    const archivedCount = conversations.filter(c => c.is_archived).length;

    // Filter by archive state:
    // If user clicked 'archivados', show only archived chats; otherwise show only unarchived chats (like WhatsApp)
    let filtered = conversations;
    if (filter === 'archivados') {
      filtered = filtered.filter(c => c.is_archived);
    } else {
      filtered = filtered.filter(c => !c.is_archived);
    }

    // If filtering by a specific wedding, exclude detached contacts (prospects/equipo)
    if (weddingId && weddingId !== 'all') {
      filtered = filtered.filter(c => c.wedding_id === weddingId && c.contact_type !== 'PROSPECTO' && c.contact_type !== 'EQUIPO');
    }

    if (search.trim()) {
      const cleanSearch = search.trim().toLowerCase();
      filtered = filtered.filter(c =>
        (c.guest_name && c.guest_name.toLowerCase().includes(cleanSearch)) ||
        (c.wedding_name && c.wedding_name.toLowerCase().includes(cleanSearch)) ||
        (c.phone && c.phone.includes(cleanSearch)) ||
        (c.contact_role_label && c.contact_role_label.toLowerCase().includes(cleanSearch)) ||
        (c.last_message_content && c.last_message_content.toLowerCase().includes(cleanSearch))
      );
    }

    if (filter === 'invitados') {
      filtered = filtered.filter(c => c.contact_type === 'INVITADO');
    } else if (filter === 'novios') {
      filtered = filtered.filter(c => c.contact_type === 'NOVIOS');
    } else if (filter === 'proveedores') {
      filtered = filtered.filter(c => c.contact_type === 'PROVEEDOR');
    } else if (filter === 'prospectos') {
      filtered = filtered.filter(c => c.contact_type === 'PROSPECTO');
    } else if (filter === 'equipo') {
      filtered = filtered.filter(c => c.contact_type === 'EQUIPO');
    } else if (filter === 'pendientes') {
      filtered = filtered.filter(c => c.guest_status === 'Pendiente de confirmar');
    } else if (filter === 'confirmados') {
      filtered = filtered.filter(c => c.guest_status === 'Confirmado');
    }

    const weddings = db.prepare('SELECT id, name FROM weddings ORDER BY wedding_date DESC').all() as any[];
    const config = WhatsAppService.getConfig();

    res.json({
      conversations: filtered,
      weddings,
      archivedCount,
      isConfigured: config.isConfigured,
      phoneNumberId: config.phoneNumberId
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
    const normalized = WhatsAppService.normalizePhoneNumber(phone);
    const last10 = getPhoneLast10(phone);

    // Fetch all message history for this phone contact regardless of wedding tag
    const messages = db.prepare(`
      SELECT * FROM whatsapp_messages
      WHERE phone = ? OR phone = ? OR phone LIKE ?
      ORDER BY created_at ASC
    `).all(phone, normalized, `%${last10}`) as any[];

    const guest = (weddingId && !['prospect', 'prospecto', 'equipo', 'all', 'general'].includes(weddingId))
      ? db.prepare(`
          SELECT g.*, w.name as wedding_name, t.name as table_name
          FROM guests g
          JOIN weddings w ON w.id = g.wedding_id
          LEFT JOIN tables t ON t.id = g.table_id
          WHERE g.wedding_id = ? AND (g.phone = ? OR g.phone = ? OR g.phone LIKE ?)
          LIMIT 1
        `).get(weddingId, phone, normalized, `%${last10}`) as any
      : db.prepare(`
          SELECT g.*, w.name as wedding_name, t.name as table_name
          FROM guests g
          JOIN weddings w ON w.id = g.wedding_id
          LEFT JOIN tables t ON t.id = g.table_id
          WHERE (g.phone = ? OR g.phone = ? OR g.phone LIKE ?)
          LIMIT 1
        `).get(phone, normalized, `%${last10}`) as any;

    const wedding = (weddingId && !['prospect', 'prospecto', 'equipo', 'all', 'general'].includes(weddingId))
      ? db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any
      : (guest?.wedding_id ? db.prepare('SELECT * FROM weddings WHERE id = ?').get(guest.wedding_id) as any : null);

    // Reset contact unread count when opening chat
    WhatsAppService.upsertContact({
      phoneNumber: normalized,
      resetUnread: true
    });

    try {
      db.prepare(`
        UPDATE whatsapp_messages
        SET status = 'READ'
        WHERE (phone = ? OR phone = ? OR phone LIKE ?) AND direction = 'INBOUND'
      `).run(phone, normalized, `%${last10}`);
    } catch {
      // Ignore if table is locked
    }

    res.json({
      messages,
      guest: guest || null,
      wedding: wedding || null
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

    if (!phone || !content) {
      return res.status(400).json({ error: 'phone y content son obligatorios.' });
    }

    const isSpecialId = !weddingId || ['equipo', 'prospect', 'prospecto', 'all', 'general'].includes(weddingId);
    const wedding = !isSpecialId ? (db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any) : null;
    const coupleNames = wedding
      ? (wedding.partner_1_name && wedding.partner_2_name
          ? `${wedding.partner_1_name} & ${wedding.partner_2_name}`
          : (wedding.name || 'los novios'))
      : 'los novios';

    let guest = null;
    if (guestId) {
      guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guestId) as any;
    }

    const guestName = guest ? `${guest.first_name} ${guest.last_name}`.trim() : 'Invitado';

    let result: any;
    if (messageType === 'template') {
      result = await WhatsAppService.sendRsvpInvitation({
        guestName,
        guestPhone: phone,
        companionCount: guest?.companion_count || 0,
        coupleNames,
        weddingDate: wedding?.wedding_date || wedding?.date,
        weddingId: !isSpecialId ? weddingId : undefined,
        guestId
      });
    } else if (messageType === 'invitation') {
      if (wedding?.invitation_type === 'PDF' && wedding?.invitation_pdf_url) {
        const appUrl = process.env.APP_URL || 'https://lazo-vlb.up.railway.app';
        const fullPdfUrl = wedding.invitation_pdf_url.startsWith('http')
          ? wedding.invitation_pdf_url
          : `${appUrl}${wedding.invitation_pdf_url}`;

        result = await WhatsAppService.sendDocumentMessage(
          phone,
          fullPdfUrl,
          wedding.invitation_pdf_filename || `Invitacion_${coupleNames.replace(/\s+/g, '_')}.pdf`,
          `💌 Aquí tienes tu invitación formal para la boda de *${coupleNames}*.`,
          { weddingId: !isSpecialId ? weddingId : undefined, guestId, sender: 'AGENT' }
        );
      } else {
        const linkMsg = `💌 *Invitación de Boda - ${coupleNames}*\n\nPuedes ver la invitación digital aquí:\n${wedding?.invitation_url || 'https://labodadeferyvic.com'}`;
        result = await WhatsAppService.sendTextMessage(phone, linkMsg, {
          weddingId: !isSpecialId ? weddingId : undefined,
          guestId,
          previewUrl: true,
          sender: 'AGENT'
        });
      }
    } else {
      result = await WhatsAppService.sendTextMessage(phone, content, {
        weddingId: !isSpecialId ? weddingId : undefined,
        guestId,
        sender: 'AGENT'
      });
    }

    const now = new Date().toISOString();

    if (guestId && result.success && messageType === 'template') {
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
      messageId: result.messageId,
      created_at: now
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar mensaje: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/log-direct
 * Logs a message that was opened/sent directly via wa.me without requiring Meta Cloud API
 */
router.post('/log-direct', async (req, res) => {
  try {
    const { weddingId, guestId, phone, content, templateType } = req.body;
    if (!weddingId || !phone || !content) {
      return res.status(400).json({ error: 'weddingId, phone y content son obligatorios.' });
    }

    const now = new Date().toISOString();
    const msgId = 'wmsg_dir_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const normalized = WhatsAppService.normalizePhoneNumber(phone);

    db.prepare(`
      INSERT INTO whatsapp_messages (id, wedding_id, guest_id, phone, direction, message_type, content, template_name, status, sender, created_at)
      VALUES (?, ?, ?, ?, 'OUTBOUND', 'text', ?, ?, 'DELIVERED', 'AGENT', ?)
    `).run(
      msgId,
      weddingId,
      guestId || null,
      normalized,
      content,
      templateType || 'direct_wa_me',
      now
    );

    if (guestId) {
      db.prepare(`
        UPDATE guests
        SET whatsapp_status = 'ENVIADO',
            last_whatsapp_sent_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(now, now, guestId);
    }

    WhatsAppService.upsertContact({
      phoneNumber: normalized,
      weddingId,
      lastMessageAt: now,
      lastMessagePreview: content.slice(0, 100)
    });

    res.json({
      success: true,
      messageId: msgId,
      created_at: now
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al registrar mensaje directo: ' + err.message });
  }
});

/**
 * GET /api/whatsapp/scheduled/:weddingId
 * Returns schedule status, dates, and recipient counts
 */
router.get('/scheduled/:weddingId', (req, res) => {
  try {
    const { weddingId } = req.params;
    const info = BroadcastScheduler.getBroadcastInfo(weddingId);
    if (!info) {
      return res.status(404).json({ error: 'Boda no encontrada.' });
    }
    res.json({ success: true, schedule: info });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener programación: ' + err.message });
  }
});

/**
 * PUT /api/whatsapp/scheduled/:weddingId
 * Updates automated broadcast settings and templates
 */
router.put('/scheduled/:weddingId', (req, res) => {
  try {
    const { weddingId } = req.params;
    BroadcastScheduler.updateBroadcastSettings(weddingId, req.body);
    const updated = BroadcastScheduler.getBroadcastInfo(weddingId);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar programación: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/scheduled/:weddingId/send-test
 * Sends a single test preview to a provided phone
 */
router.post('/scheduled/:weddingId/send-test', async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { type, testPhone } = req.body;
    if (!testPhone) {
      return res.status(400).json({ error: 'El número de teléfono para la prueba es obligatorio.' });
    }

    let result;
    if (type === 'SEATING') {
      result = await BroadcastScheduler.sendSeatingBroadcast(weddingId, { isTest: true, testPhone });
    } else {
      result = await BroadcastScheduler.sendReminderBroadcast(weddingId, { isTest: true, testPhone });
    }

    res.json({ success: result.success, result });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar prueba: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/scheduled/:weddingId/send-now
 * Manually fires the batch broadcast to all eligible guests immediately
 */
router.post('/scheduled/:weddingId/send-now', async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { type } = req.body;

    let result;
    if (type === 'SEATING') {
      result = await BroadcastScheduler.sendSeatingBroadcast(weddingId);
    } else {
      result = await BroadcastScheduler.sendReminderBroadcast(weddingId);
    }

    const updated = BroadcastScheduler.getBroadcastInfo(weddingId);
    res.json({ success: true, result, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al ejecutar envío masivo: ' + err.message });
  }
});

/**
 * POST /api/whatsapp/scheduled/:weddingId/reset
 * Resets a broadcast status back to PENDING so it can fire again
 */
router.post('/scheduled/:weddingId/reset', (req, res) => {
  try {
    const { weddingId } = req.params;
    const { type } = req.body;
    const now = new Date().toISOString();

    if (type === 'SEATING') {
      db.prepare(`
        UPDATE weddings 
        SET dayof_seating_status = 'PENDING', dayof_seating_sent_at = NULL, updated_at = ? 
        WHERE id = ?
      `).run(now, weddingId);
    } else {
      db.prepare(`
        UPDATE weddings 
        SET reminder_7days_status = 'PENDING', reminder_7days_sent_at = NULL, updated_at = ? 
        WHERE id = ?
      `).run(now, weddingId);
    }

    const updated = BroadcastScheduler.getBroadcastInfo(weddingId);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al reiniciar estado: ' + err.message });
  }
});

/**
 * DELETE /api/whatsapp/messages/:messageId
 * Deletes a single message from the conversation history
 */
router.delete('/messages/:messageId', (req, res) => {
  try {
    const { messageId } = req.params;
    db.prepare('DELETE FROM whatsapp_messages WHERE id = ?').run(messageId);
    res.json({ success: true, message: 'Mensaje eliminado' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar mensaje: ' + err.message });
  }
});

/**
 * DELETE /api/whatsapp/conversations/:phone
 * Deletes all message history and removes contact from the hub
 */
router.delete('/conversations/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    const normalized = WhatsAppService.normalizePhoneNumber(phone) || phone;
    const last10 = getPhoneLast10(phone);

    // Delete all messages matching phone
    db.prepare(`
      DELETE FROM whatsapp_messages
      WHERE phone = ? OR phone = ? OR phone LIKE ?
    `).run(phone, normalized, `%${last10}`);

    // Remove contact record
    db.prepare(`
      DELETE FROM whatsapp_contacts
      WHERE phone_number = ? OR phone_number = ? OR phone_number LIKE ?
    `).run(phone, normalized, `%${last10}`);

    res.json({ success: true, message: 'Conversación eliminada exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar conversación: ' + err.message });
  }
});

/**
 * PUT /api/whatsapp/conversations/:phone/archive
 * Toggles or sets archive state for a conversation
 */
router.put('/conversations/:phone/archive', (req, res) => {
  try {
    const { phone } = req.params;
    const { isArchived } = req.body;
    const normalized = WhatsAppService.normalizePhoneNumber(phone) || phone;
    const last10 = getPhoneLast10(phone);
    const archiveVal = isArchived ? 1 : 0;
    const now = new Date().toISOString();

    const existing = db.prepare(`
      SELECT id FROM whatsapp_contacts
      WHERE phone_number = ? OR phone_number LIKE ?
    `).get(normalized, `%${last10}`) as any;

    if (existing) {
      db.prepare('UPDATE whatsapp_contacts SET is_archived = ?, updated_at = ? WHERE id = ?')
        .run(archiveVal, now, existing.id);
    } else {
      const contactId = 'wct_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      db.prepare(`
        INSERT INTO whatsapp_contacts (id, phone_number, is_archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(contactId, normalized, archiveVal, now, now);
    }

    res.json({ success: true, isArchived: Boolean(isArchived) });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar estado de archivado: ' + err.message });
  }
});

export default router;
