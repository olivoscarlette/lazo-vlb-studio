import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { verifyMetaSignature, AuthenticatedMetaRequest } from '../middleware/metaSignature.js';
import { WhatsAppService } from '../services/whatsappService.js';

const router = Router();

/**
 * Normalizes phone numbers to compare across formats:
 * Returns the last 10 digits to reliably match Mexican numbers
 */
function getPhoneLast10(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * GET /webhook (or /api/whatsapp/webhook)
 * Webhook Verification required by Meta for Developers
 *
 * Meta sends:
 * - hub.mode: 'subscribe'
 * - hub.verify_token: your custom token
 * - hub.challenge: numeric challenge to echo back
 */
router.get('/webhook', (req, res) => {
  const config = WhatsAppService.getConfig();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log('[WhatsApp Webhook] Handshake exitoso con Meta Cloud API (Token verificado).');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook] Verificación rechazada: hub.verify_token no coincide.');
  return res.status(403).json({ error: 'Token de verificación inválido.' });
});

/**
 * Asynchronous event processor
 * Handles messages, button clicks, list selections, and delivery/read statuses
 */
async function processWebhookEvent(body: any) {
  try {
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // --------------------------------------------------------------------
        // 1. INCOMING MESSAGES (Text, Buttons, Lists, Media)
        // --------------------------------------------------------------------
        if (value.messages && Array.isArray(value.messages)) {
          // Extract contact profile name provided by Meta if available
          const senderProfile = value.contacts?.[0]?.profile?.name || '';

          for (const message of value.messages) {
            const rawFrom = message.from; // e.g. "5218110279116" or "528110279116"
            const normalizedPhone = WhatsAppService.normalizePhoneNumber(rawFrom);
            const messageId = message.id; // wamid.HBg...
            const msgType = message.type;
            let content = '';
            let selectedButtonId = '';

            // Extract content according to WhatsApp message type
            if (msgType === 'text') {
              content = message.text?.body || '';
            } else if (msgType === 'interactive') {
              const interactive = message.interactive;
              if (interactive.type === 'button_reply') {
                selectedButtonId = interactive.button_reply?.id || '';
                content = interactive.button_reply?.title || selectedButtonId;
              } else if (interactive.type === 'list_reply') {
                selectedButtonId = interactive.list_reply?.id || '';
                content = interactive.list_reply?.title || selectedButtonId;
              }
            } else if (msgType === 'button') {
              selectedButtonId = message.button?.payload || '';
              content = message.button?.text || selectedButtonId;
            } else if (msgType === 'image') {
              content = `[Imagen recibida: ${message.image?.caption || 'Sin descripción'}]`;
            } else if (msgType === 'document') {
              content = `[Documento recibido: ${message.document?.filename || 'Archivo adjunto'}]`;
            } else {
              content = `[Mensaje tipo: ${msgType}]`;
            }

            console.log(`[WhatsApp Webhook] Mensaje entrante de ${normalizedPhone}: "${content}"`);

            const last10 = getPhoneLast10(normalizedPhone);
            const now = new Date().toISOString();

            // Locate Guest in database by matching phone number
            // Robust multi-wedding support: If a phone belongs to guests in multiple weddings,
            // disambiguate using the most recent outbound invitation or conversation thread.
            const allGuests = db.prepare(`
              SELECT g.*, w.name as wedding_name, w.wedding_date
              FROM guests g
              JOIN weddings w ON w.id = g.wedding_id
              WHERE g.phone IS NOT NULL AND g.phone != ''
            `).all() as any[];

            const matchingGuests = allGuests.filter(g => getPhoneLast10(g.phone) === last10);

            const latestMsg = db.prepare(`
              SELECT wedding_id, guest_id FROM whatsapp_messages
              WHERE phone = ? OR phone LIKE ?
              ORDER BY created_at DESC LIMIT 1
            `).get(normalizedPhone, `%${last10}`) as any;

            let matchedGuest: any = null;
            if (matchingGuests.length === 1) {
              matchedGuest = matchingGuests[0];
            } else if (matchingGuests.length > 1) {
              // 1. Prioritize wedding of the latest conversation/invitation
              if (latestMsg?.wedding_id) {
                matchedGuest = matchingGuests.find(g => g.wedding_id === latestMsg.wedding_id);
              }
              // 2. Prioritize exact guest_id
              if (!matchedGuest && latestMsg?.guest_id) {
                matchedGuest = matchingGuests.find(g => g.id === latestMsg.guest_id);
              }
              // 3. Fallback to first matching guest
              if (!matchedGuest) {
                matchedGuest = matchingGuests[0];
              }
            }

            let weddingId = matchedGuest?.wedding_id || latestMsg?.wedding_id;
            const guestId = matchedGuest?.id || latestMsg?.guest_id || null;

            if (!weddingId) {
              const latestWedding = db.prepare('SELECT id FROM weddings ORDER BY wedding_date DESC LIMIT 1').get() as any;
              weddingId = latestWedding?.id || 'default_wedding';
            }

            // Detect and process RSVP Intent
            const lowerContent = content.toLowerCase().trim();
            const lowerButtonId = selectedButtonId.toLowerCase().trim();
            let newGuestStatus: string | null = null;

            if (
              lowerButtonId.includes('no') ||
              lowerContent.includes('no asistiré') ||
              lowerContent.includes('no asistire') ||
              lowerContent.includes('no podré') ||
              lowerContent.includes('no podre') ||
              lowerContent.includes('no voy') ||
              lowerContent === 'no'
            ) {
              newGuestStatus = 'No asistirá';
            } else if (
              lowerButtonId.includes('yes') ||
              lowerButtonId.includes('confirm') ||
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
              console.log(`[WhatsApp Webhook] Actualizando RSVP de ${matchedGuest.first_name} ${matchedGuest.last_name} (${matchedGuest.wedding_name}) -> "${newGuestStatus}"`);
              if (newGuestStatus === 'No asistirá') {
                db.prepare(`
                  UPDATE guests
                  SET status = ?, table_id = NULL, updated_at = ?
                  WHERE id = ? AND wedding_id = ?
                `).run(newGuestStatus, now, matchedGuest.id, matchedGuest.wedding_id);
              } else {
                db.prepare(`
                  UPDATE guests
                  SET status = ?, updated_at = ?
                  WHERE id = ? AND wedding_id = ?
                `).run(newGuestStatus, now, matchedGuest.id, matchedGuest.wedding_id);
              }
            }

            // Persist Message in DB
            const wmsgId = 'wmsg_in_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            db.prepare(`
              INSERT INTO whatsapp_messages (
                id, wedding_id, guest_id, phone, direction, message_type, content,
                status, whatsapp_message_id, sender, raw_payload, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              wmsgId,
              weddingId,
              guestId,
              normalizedPhone,
              'INBOUND',
              msgType,
              content,
              'DELIVERED',
              messageId,
              'CUSTOMER',
              JSON.stringify(message),
              now
            );

            // Upsert Contact & increment unread count
            const existingContact = db.prepare(`
              SELECT name FROM whatsapp_contacts
              WHERE phone_number = ? OR phone_number LIKE ?
            `).get(normalizedPhone, `%${last10}`) as any;

            const contactName = matchedGuest
              ? `${matchedGuest.first_name} ${matchedGuest.last_name}`.trim()
              : (existingContact?.name || senderProfile || normalizedPhone);

            WhatsAppService.upsertContact({
              phoneNumber: normalizedPhone,
              name: contactName,
              weddingId: weddingId !== 'default_wedding' ? weddingId : undefined,
              lastMessageAt: now,
              lastMessagePreview: content.slice(0, 100),
              incrementUnread: true
            });
          }
        }

        // --------------------------------------------------------------------
        // 2. STATUS UPDATES (sent, delivered, read, failed)
        // --------------------------------------------------------------------
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id;
            const newStatus = (statusObj.status || '').toUpperCase(); // 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
            const errorMsg = statusObj.errors?.[0]?.message || statusObj.errors?.[0]?.title || null;

            console.log(`[WhatsApp Webhook] Estado de mensaje ${wamid}: ${newStatus}`);

            try {
              // Update status in whatsapp_messages
              db.prepare(`
                UPDATE whatsapp_messages
                SET status = ?,
                    error_message = COALESCE(?, error_message)
                WHERE whatsapp_message_id = ?
              `).run(newStatus, errorMsg, wamid);

              // If linked to a guest, reflect status
              if (newStatus === 'READ' || newStatus === 'DELIVERED') {
                db.prepare(`
                  UPDATE guests
                  SET whatsapp_status = ?
                  WHERE whatsapp_message_id = ?
                `).run(newStatus === 'READ' ? 'LEIDO' : 'ENTREGADO', wamid);
              } else if (newStatus === 'FAILED') {
                db.prepare(`
                  UPDATE guests
                  SET whatsapp_status = 'ERROR'
                  WHERE whatsapp_message_id = ?
                `).run(wamid);
              }
            } catch (err) {
              console.error('[WhatsApp Webhook] Error updating status in DB:', err);
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp Webhook Async Processing Error]:', err);
  }
}

/**
 * POST /webhook (or /api/whatsapp/webhook)
 * Receives incoming messages and status events from Meta.
 * Validates cryptographic signature with META_APP_SECRET and immediately returns 200 OK.
 */
router.post('/webhook', verifyMetaSignature, (req: AuthenticatedMetaRequest, res: Response) => {
  // 1. Immediately acknowledge 200 OK to Meta to prevent retry storms and webhook timeouts
  res.status(200).send('EVENT_RECEIVED');

  // 2. Process payload asynchronously in background
  setImmediate(() => {
    processWebhookEvent(req.body);
  });
});

export default router;
