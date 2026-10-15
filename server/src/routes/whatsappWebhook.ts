import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'lazo_vlb_webhook_token_2026';

/**
 * Normalizes phone numbers to compare across formats:
 * e.g. "5218110279116", "528110279116", "+52 81 1027 9116", "8110279116"
 * Returns the last 10 digits which uniquely identify the Mexican mobile number.
 */
function getPhoneLast10(phone: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * GET /api/whatsapp/webhook
 * Verification endpoint required by Meta Webhooks
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verificación exitosa de Meta Webhook.');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook] Verificación fallida: token no coincide.');
  return res.sendStatus(403);
});

/**
 * POST /api/whatsapp/webhook
 * Receives incoming messages and quick reply button clicks from WhatsApp
 */
router.post('/webhook', (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        for (const message of value.messages) {
          const from = message.from; // e.g. "5218110279116"
          const messageId = message.id;
          const msgType = message.type;
          let content = '';

          // 1. Extract content depending on message type
          if (msgType === 'text') {
            content = message.text?.body || '';
          } else if (msgType === 'interactive') {
            content = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
          } else if (msgType === 'button') {
            content = message.button?.text || message.button?.payload || '';
          } else {
            content = `[Mensaje tipo: ${msgType}]`;
          }

          console.log(`[WhatsApp Webhook] Mensaje entrante de ${from}: "${content}"`);

          const last10 = getPhoneLast10(from);
          const now = new Date().toISOString();

          // 2. Locate the guest in the database
          // Search by matching phone ending with the last 10 digits
          const allGuests = db.prepare(`
            SELECT g.*, w.name as wedding_name
            FROM guests g
            JOIN weddings w ON w.id = g.wedding_id
            WHERE g.phone IS NOT NULL AND g.phone != ''
          `).all() as any[];

          const matchedGuest = allGuests.find(g => getPhoneLast10(g.phone) === last10);

          let weddingId = matchedGuest?.wedding_id;
          let guestId = matchedGuest?.id || null;

          if (!weddingId) {
            // Fallback to most recent wedding if no guest match
            const latestWedding = db.prepare('SELECT id FROM weddings ORDER BY wedding_date DESC LIMIT 1').get() as any;
            weddingId = latestWedding?.id || 'default_wedding';
          }

          // 3. Process RSVP Intent (Automatic Status Update)
          const lowerContent = content.toLowerCase().trim();
          let newGuestStatus: string | null = null;

          if (
            lowerContent.includes('no asistiré') ||
            lowerContent.includes('no asistire') ||
            lowerContent.includes('no podré') ||
            lowerContent.includes('no podre') ||
            lowerContent.includes('no voy') ||
            lowerContent === 'no'
          ) {
            newGuestStatus = 'No asistirá';
          } else if (
            lowerContent.includes('confirmo') ||
            lowerContent.includes('asistiré') ||
            lowerContent.includes('asistire') ||
            lowerContent.includes('si asistiré') ||
            lowerContent.includes('sí asistiré') ||
            lowerContent === 'sí' ||
            lowerContent === 'si'
          ) {
            newGuestStatus = 'Confirmado';
          }

          if (matchedGuest && newGuestStatus) {
            console.log(`[WhatsApp Webhook] Actualizando estado de ${matchedGuest.first_name} ${matchedGuest.last_name} a "${newGuestStatus}"`);
            
            if (newGuestStatus === 'No asistirá') {
              // Liberar mesa si se cancela
              db.prepare(`
                UPDATE guests
                SET status = ?, table_id = NULL, updated_at = ?
                WHERE id = ?
              `).run(newGuestStatus, now, matchedGuest.id);
            } else {
              db.prepare(`
                UPDATE guests
                SET status = ?, updated_at = ?
                WHERE id = ?
              `).run(newGuestStatus, now, matchedGuest.id);
            }
          }

          // 4. Save message into whatsapp_messages table
          const wmsgId = 'wmsg_in_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          db.prepare(`
            INSERT INTO whatsapp_messages (
              id, wedding_id, guest_id, phone, direction, message_type, content, status, whatsapp_message_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            wmsgId,
            weddingId,
            guestId,
            from,
            'INBOUND',
            msgType,
            content,
            'DELIVERED',
            messageId,
            now
          );
        }
      }
    }

    // Always respond 200 OK promptly to Meta to acknowledge receipt
    res.sendStatus(200);
  } catch (err: any) {
    console.error('[WhatsApp Webhook Error]', err);
    res.sendStatus(200); // Return 200 so Meta does not retry indefinitely on internal errors
  }
});

export default router;
