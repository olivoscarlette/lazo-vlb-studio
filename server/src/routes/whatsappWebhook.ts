import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { verifyMetaSignature, AuthenticatedMetaRequest } from '../middleware/metaSignature.js';
import { WhatsAppService, formatCoupleNames, formatWeddingDateHuman } from '../services/whatsappService.js';

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
 * Sends the final event card and attached PDF/link invitation
 */
async function sendFinalEventCardAndInvitation(guest: any, weddingId: string, phone: string) {
  const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  if (!wedding) return;

  const coupleNames = formatCoupleNames(wedding);
  const formattedDate = formatWeddingDateHuman(wedding.wedding_date);
  const places = guest.confirmed_places || (1 + (guest.companion_count || 0));

  let summary = `ASISTENCIA CONFIRMADA ✨\n\n` +
    `Boda ${coupleNames}\n` +
    `${formattedDate}\n\n`;

  if (wedding.ceremony_venue || wedding.ceremony_time) {
    summary += `• Ceremonia: ${wedding.ceremony_venue || 'Por definir'}${wedding.ceremony_time ? ` · ${wedding.ceremony_time} hrs` : ''}\n`;
  }
  if (wedding.reception_venue || wedding.reception_time) {
    summary += `• Recepción: ${wedding.reception_venue || 'Por definir'}${wedding.reception_time ? ` · ${wedding.reception_time} hrs` : ''}\n`;
  }
  if (wedding.dress_code) {
    summary += `• Código de vestimenta: ${wedding.dress_code}\n`;
  }
  if (wedding.no_children) {
    summary += `• Nota: Recepción sólo para adultos\n`;
  }
  summary += `• Pases confirmados: ${places} persona(s)\n\n`;

  if (wedding.invitation_type === 'LINK' && wedding.invitation_url) {
    summary += `💌 Tu invitación digital:\n${wedding.invitation_url}\n\n`;
  }

  summary += `¡Estamos contando los días para celebrar juntos!`;

  await WhatsAppService.sendTextMessage(phone, summary, {
    weddingId,
    guestId: guest.id,
    previewUrl: true
  });

  // If PDF invitation is configured, send the PDF document directly to WhatsApp
  if (wedding.invitation_type === 'PDF' && wedding.invitation_pdf_url) {
    const appUrl = process.env.APP_URL || 'https://lazo-vlb.up.railway.app';
    const fullPdfUrl = wedding.invitation_pdf_url.startsWith('http')
      ? wedding.invitation_pdf_url
      : `${appUrl}${wedding.invitation_pdf_url}`;

    await WhatsAppService.sendDocumentMessage(
      phone,
      fullPdfUrl,
      wedding.invitation_pdf_filename || `Invitacion_${coupleNames.replace(/\s+/g, '_')}.pdf`,
      `💌 Aquí tienes tu invitación formal para la boda de ${coupleNames}.`,
      { weddingId, guestId: guest.id }
    );
  }
}

/**
 * Multi-step Conversational RSVP Bot State Machine
 */
async function handleAutomatedRsvpStep(params: {
  matchedGuest: any;
  weddingId: string;
  normalizedPhone: string;
  content: string;
  selectedButtonId: string;
}) {
  const { matchedGuest, weddingId, normalizedPhone, content, selectedButtonId } = params;
  const now = new Date().toISOString();
  const lowerContent = content.toLowerCase().trim();
  const lowerButtonId = selectedButtonId.toLowerCase().trim();
  const currentStep = (matchedGuest.rsvp_step || 'NONE').toUpperCase();
  const totalSeats = 1 + (matchedGuest.companion_count || 0);

  // 1. Check for DECLINE intent across any stage
  const isDecline =
    lowerButtonId.includes('decline') ||
    lowerButtonId.includes('rsvp_decline') ||
    lowerButtonId.includes('no podré') ||
    lowerButtonId.includes('no podre') ||
    lowerContent.includes('no asistiré') ||
    lowerContent.includes('no asistire') ||
    lowerContent.includes('no podré') ||
    lowerContent.includes('no podre') ||
    lowerContent.includes('no voy') ||
    lowerContent.includes('no podré asistir') ||
    lowerContent.includes('no podre asistir') ||
    lowerContent.includes('declino') ||
    (currentStep === 'NONE' && lowerContent === 'no');

  if (isDecline) {
    console.log(`[WhatsApp RSVP Bot] Invitado ${matchedGuest.first_name} ${matchedGuest.last_name} declinó.`);
    db.prepare(`
      UPDATE guests
      SET status = 'No asistirá',
          rsvp_step = 'DECLINED',
          table_id = NULL,
          updated_at = ?
      WHERE id = ? AND wedding_id = ?
    `).run(now, matchedGuest.id, weddingId);

    await WhatsAppService.sendTextMessage(
      normalizedPhone,
      `Muchas gracias por avisarnos, ${matchedGuest.first_name}.\n\nLamentamos que no puedas acompañarnos físicamente, ¡te tendremos muy presente y te mandamos un abrazo con mucho cariño! 💕`,
      { weddingId, guestId: matchedGuest.id }
    );
    return;
  }

  // 2. Initial Confirmation (From Invitation Template or Initial Message)
  if (currentStep === 'NONE' || currentStep === 'INVITATION_SENT') {
    const isConfirm =
      lowerButtonId.includes('confirm') ||
      lowerButtonId.includes('rsvp_confirm') ||
      lowerButtonId.includes('yes') ||
      lowerContent.includes('confirmo') ||
      lowerContent.includes('confirmar') ||
      lowerContent.includes('asistiré') ||
      lowerContent.includes('asistire') ||
      lowerContent.includes('si asistiré') ||
      lowerContent.includes('sí asistiré') ||
      lowerContent.includes('confirmo asistencia') ||
      lowerContent === 'sí' ||
      lowerContent === 'si' ||
      lowerContent === 'claro';

    if (isConfirm) {
      console.log(`[WhatsApp RSVP Bot] Invitado ${matchedGuest.first_name} ${matchedGuest.last_name} confirmó asistencia inicial.`);
      db.prepare(`
        UPDATE guests
        SET status = 'Confirmado', updated_at = ?
        WHERE id = ? AND wedding_id = ?
      `).run(now, matchedGuest.id, weddingId);

      if (totalSeats > 1) {
        db.prepare(`
          UPDATE guests
          SET rsvp_step = 'CONFIRMING_PLACES', updated_at = ?
          WHERE id = ? AND wedding_id = ?
        `).run(now, matchedGuest.id, weddingId);

        await WhatsAppService.sendInteractiveButtons(
          normalizedPhone,
          `¡Qué gran noticia saber que nos acompañarás!\n\nTienes reservados ${totalSeats} lugares en total a tu nombre.\n¿Confirmas la asistencia de todas las personas?`,
          [
            { id: 'places_yes', title: 'Asistiremos todos' },
            { id: 'places_no', title: 'Modificar número' }
          ],
          { weddingId, guestId: matchedGuest.id }
        );
      } else {
        // Individual guest (1 seat)
        db.prepare(`
          UPDATE guests
          SET confirmed_places = 1, rsvp_step = 'COMPLETED', updated_at = ?
          WHERE id = ? AND wedding_id = ?
        `).run(now, matchedGuest.id, weddingId);

        const refreshed = db.prepare('SELECT * FROM guests WHERE id = ?').get(matchedGuest.id) as any;
        await sendFinalEventCardAndInvitation(refreshed || matchedGuest, weddingId, normalizedPhone);
      }
      return;
    }
  }

  // 3. Step: CONFIRMING_PLACES
  if (currentStep === 'CONFIRMING_PLACES') {
    const isYes =
      lowerButtonId === 'places_yes' ||
      lowerContent === 'sí' ||
      lowerContent === 'si' ||
      lowerContent.includes('asistiremos todos') ||
      lowerContent.includes('todos') ||
      lowerContent.includes('correcta') ||
      lowerContent.includes('es correcta') ||
      lowerContent.includes('así es') ||
      lowerContent.includes('asi es');

    const isNo =
      lowerButtonId === 'places_no' ||
      lowerContent === 'no' ||
      lowerContent.includes('modificar') ||
      lowerContent.includes('cambiar') ||
      lowerContent.includes('somos menos') ||
      lowerContent.includes('somos más');

    if (isYes) {
      db.prepare(`
        UPDATE guests
        SET confirmed_places = ?, rsvp_step = 'COMPLETED', updated_at = ?
        WHERE id = ? AND wedding_id = ?
      `).run(totalSeats, now, matchedGuest.id, weddingId);

      const refreshed = db.prepare('SELECT * FROM guests WHERE id = ?').get(matchedGuest.id) as any;
      await sendFinalEventCardAndInvitation(refreshed || matchedGuest, weddingId, normalizedPhone);
      return;
    } else if (isNo) {
      db.prepare(`
        UPDATE guests
        SET rsvp_step = 'AWAITING_PLACES_NUMBER', updated_at = ?
        WHERE id = ? AND wedding_id = ?
      `).run(now, matchedGuest.id, weddingId);

      await WhatsAppService.sendTextMessage(
        normalizedPhone,
        `Por favor indícanos cuántas personas asistirán en total (número):`,
        { weddingId, guestId: matchedGuest.id }
      );
      return;
    } else {
      // Check if user answered with a number directly
      const parsedNum = parseInt(content.replace(/\D/g, ''), 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        db.prepare(`
          UPDATE guests
          SET confirmed_places = ?, rsvp_step = 'COMPLETED', updated_at = ?
          WHERE id = ? AND wedding_id = ?
        `).run(parsedNum, now, matchedGuest.id, weddingId);

        const refreshed = db.prepare('SELECT * FROM guests WHERE id = ?').get(matchedGuest.id) as any;
        await sendFinalEventCardAndInvitation(refreshed || matchedGuest, weddingId, normalizedPhone);
        return;
      }
    }
  }

  // 4. Step: AWAITING_PLACES_NUMBER
  if (currentStep === 'AWAITING_PLACES_NUMBER') {
    const parsedNum = parseInt(content.replace(/\D/g, ''), 10);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      db.prepare(`
        UPDATE guests
        SET confirmed_places = ?, rsvp_step = 'COMPLETED', updated_at = ?
        WHERE id = ? AND wedding_id = ?
      `).run(parsedNum, now, matchedGuest.id, weddingId);

      const refreshed = db.prepare('SELECT * FROM guests WHERE id = ?').get(matchedGuest.id) as any;
      await sendFinalEventCardAndInvitation(refreshed || matchedGuest, weddingId, normalizedPhone);
      return;
    } else {
      await WhatsAppService.sendTextMessage(
        normalizedPhone,
        `Por favor escribe sólo el número de asistentes en total (por ejemplo: 1, 2):`,
        { weddingId, guestId: matchedGuest.id }
      );
      return;
    }
  }
}

/**
 * GET /webhook (or /api/whatsapp/webhook)
 * Webhook Verification required by Meta for Developers
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

            console.log(`[WhatsApp Webhook] Mensaje entrante de ${normalizedPhone}: "${content}" (Button ID: "${selectedButtonId}")`);

            const last10 = getPhoneLast10(normalizedPhone);
            const now = new Date().toISOString();

            // Locate Guest in database by matching phone number
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
              if (latestMsg?.wedding_id) {
                matchedGuest = matchingGuests.find(g => g.wedding_id === latestMsg.wedding_id);
              }
              if (!matchedGuest && latestMsg?.guest_id) {
                matchedGuest = matchingGuests.find(g => g.id === latestMsg.guest_id);
              }
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

            // Mark incoming message as read on Meta
            WhatsAppService.markAsRead(messageId).catch(() => {});

            // Process automated conversational RSVP state machine
            if (matchedGuest) {
              await handleAutomatedRsvpStep({
                matchedGuest,
                weddingId,
                normalizedPhone,
                content,
                selectedButtonId
              });
            }
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
  res.status(200).send('EVENT_RECEIVED');

  setImmediate(() => {
    processWebhookEvent(req.body);
  });
});

export default router;
