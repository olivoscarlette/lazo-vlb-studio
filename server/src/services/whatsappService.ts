/**
 * WhatsApp Cloud API Service (Meta Official Business API)
 * 
 * Provides modular outbound messaging:
 * - Text messages
 * - Interactive Quick-Reply Buttons (up to 3)
 * - Interactive Selectable Lists (sections & rows)
 * - Templates (e.g. RSVP Invitations)
 * - Read Receipts
 * - Phone number normalization (E.164, Mexico 52/521 handling)
 * - Database persistence (whatsapp_messages & whatsapp_contacts)
 */

import { db } from '../db/index.js';

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListRow[];
}

export interface MessageOptions {
  weddingId?: string;
  guestId?: string;
  sender?: 'BUSINESS' | 'AGENT' | 'SYSTEM';
  previewUrl?: boolean;
  headerText?: string;
  footerText?: string;
}

/**
 * Formats a raw wedding date into an elegant, natural Spanish date string.
 * e.g. "2026-10-24" -> "sábado 24 de octubre"
 */
export function formatWeddingDateHuman(dateStr?: string | null): string {
  if (!dateStr) return 'la fecha del evento';
  const trimmed = dateStr.trim();
  if (trimmed.includes('de ') || trimmed.includes('De ')) return trimmed;

  try {
    const raw = trimmed.split('T')[0];
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const d = new Date(year, month - 1, day);
      const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const dayName = daysOfWeek[d.getDay()];
      const monthName = months[month - 1];

      return `${dayName} ${day} de ${monthName}`;
    }
  } catch {}

  return trimmed;
}

/**
 * Cleans and formats couple names in natural Spanish.
 * Strips duplicate "Boda de " prefixes and converts "&" to "y".
 * e.g. "Boda Victoria & Ronnye" -> "Victoria y Ronnye"
 */
export function formatCoupleNames(coupleNamesOrWedding?: any): string {
  if (!coupleNamesOrWedding) return 'los novios';
  let str = '';
  if (typeof coupleNamesOrWedding === 'string') {
    str = coupleNamesOrWedding;
  } else if (coupleNamesOrWedding.partner_1_name && coupleNamesOrWedding.partner_2_name) {
    const p1 = coupleNamesOrWedding.partner_1_name.trim();
    const p2 = coupleNamesOrWedding.partner_2_name.trim();
    const connector = p2.toLowerCase().startsWith('i') || p2.toLowerCase().startsWith('hi') ? 'e' : 'y';
    return `${p1} ${connector} ${p2}`;
  } else if (coupleNamesOrWedding.name) {
    str = coupleNamesOrWedding.name;
  }

  let cleaned = str.replace(/^Boda\s+(de\s+)?(los\s+)?/i, '').trim();
  cleaned = cleaned.replace(/\s+&\s+/g, ' y ');
  return cleaned || 'los novios';
}

export class WhatsAppService {
  /**
   * Retrieves WhatsApp credentials and API configuration from environment variables
   */
  public static getConfig() {
    const token =
      process.env.WHATSAPP_API_TOKEN ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      '';
    const rawPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    // Use official Viva la Bride phone ID if unconfigured or pointing to old Meta sandbox test ID
    const phoneNumberId = (!rawPhoneId || rawPhoneId === '1424004584122204')
      ? '1385120218016720'
      : rawPhoneId;
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'lazo_vlb_webhook_token_2026';
    const appSecret = process.env.META_APP_SECRET || '';
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    const isConfigured = Boolean(token && phoneNumberId && token !== 'test_token');

    return {
      token,
      phoneNumberId,
      verifyToken,
      appSecret,
      apiVersion,
      isConfigured,
      baseUrl: `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`
    };
  }

  /**
   * Normalizes any phone number format into standard WhatsApp international format.
   * Handles:
   * - Stripping non-numeric characters (+, spaces, hyphens, brackets)
   * - 10-digit Mexican mobile numbers (prepends country code 52)
   * - Mexican mobile numbers with legacy mobile digit 1: '5218112345678' -> '528112345678'
   * Example: "+52 (81) 1234-5678" -> "528112345678"
   */
  public static normalizePhoneNumber(rawPhone: string): string {
    if (!rawPhone) return '';
    let cleaned = rawPhone.replace(/\D/g, '');

    // 10-digit number without country code (default to Mexico 52)
    if (cleaned.length === 10) {
      cleaned = `52${cleaned}`;
    }

    // Mexican numbers: Meta Cloud API expects 52 + 10 digits (12 digits total).
    // If incoming number is 13 digits starting with 521, remove the '1'
    if (cleaned.length === 13 && cleaned.startsWith('521')) {
      cleaned = `52${cleaned.slice(3)}`;
    }

    return cleaned;
  }

  /**
   * Helper to persist outgoing messages and update contact state
   */
  public static recordOutboundMessage(params: {
    to: string;
    content: string;
    messageType: string;
    result: SendMessageResult;
    options?: MessageOptions;
    templateName?: string;
    rawPayload?: any;
  }) {
    const now = new Date().toISOString();
    let weddingId = params.options?.weddingId;
    if (!weddingId || weddingId === 'default_wedding') {
      const defaultWed = db.prepare('SELECT id FROM weddings ORDER BY wedding_date DESC LIMIT 1').get() as any;
      weddingId = defaultWed?.id || 'wed_default';
    }
    const guestId = params.options?.guestId || null;
    const sender = params.options?.sender || 'BUSINESS';
    const msgId = 'wmsg_out_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    try {
      // 1. Insert into whatsapp_messages
      db.prepare(`
        INSERT INTO whatsapp_messages (
          id, wedding_id, guest_id, phone, direction, message_type, content, template_name,
          status, whatsapp_message_id, sender, error_message, raw_payload, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        msgId,
        weddingId,
        guestId,
        params.to,
        'OUTBOUND',
        params.messageType,
        params.content,
        params.templateName || null,
        params.result.success ? 'SENT' : 'FAILED',
        params.result.messageId || null,
        sender,
        params.result.error || null,
        params.rawPayload ? JSON.stringify(params.rawPayload) : null,
        now
      );

      // 2. Upsert into whatsapp_contacts
      this.upsertContact({
        phoneNumber: params.to,
        weddingId: weddingId !== 'wed_default' ? weddingId : undefined,
        lastMessageAt: now,
        lastMessagePreview: params.content.slice(0, 100)
      });
    } catch (err: any) {
      console.error('[WhatsAppService] Error recording outbound message:', err);
    }

    return msgId;
  }

  /**
   * Upserts a contact in the whatsapp_contacts table
   */
  public static upsertContact(params: {
    phoneNumber: string;
    name?: string;
    weddingId?: string;
    assignedAgent?: string;
    lastMessageAt?: string;
    lastMessagePreview?: string;
    incrementUnread?: boolean;
    resetUnread?: boolean;
  }) {
    const now = new Date().toISOString();
    const normalized = this.normalizePhoneNumber(params.phoneNumber);
    if (!normalized) return;

    try {
      const existing = db.prepare('SELECT * FROM whatsapp_contacts WHERE phone_number = ?').get(normalized) as any;

      if (!existing) {
        const contactId = 'wct_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        db.prepare(`
          INSERT INTO whatsapp_contacts (
            id, phone_number, name, wedding_id, assigned_agent, unread_count,
            last_message_at, last_message_preview, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          contactId,
          normalized,
          params.name || null,
          params.weddingId || null,
          params.assignedAgent || null,
          params.incrementUnread ? 1 : 0,
          params.lastMessageAt || now,
          params.lastMessagePreview || null,
          now,
          now
        );
      } else {
        let unreadCount = existing.unread_count || 0;
        if (params.resetUnread) {
          unreadCount = 0;
        } else if (params.incrementUnread) {
          unreadCount += 1;
        }

        db.prepare(`
          UPDATE whatsapp_contacts
          SET name = COALESCE(?, name),
              wedding_id = COALESCE(?, wedding_id),
              assigned_agent = COALESCE(?, assigned_agent),
              unread_count = ?,
              last_message_at = COALESCE(?, last_message_at),
              last_message_preview = COALESCE(?, last_message_preview),
              updated_at = ?
          WHERE phone_number = ?
        `).run(
          params.name || null,
          params.weddingId || null,
          params.assignedAgent || null,
          unreadCount,
          params.lastMessageAt || null,
          params.lastMessagePreview || null,
          now,
          normalized
        );
      }
    } catch (err) {
      console.error('[WhatsAppService] Error upserting contact:', err);
    }
  }

  /**
   * Internal helper to execute HTTP requests to Meta Graph API
   */
  private static async executeMetaApiCall(payload: any): Promise<SendMessageResult> {
    const { token, baseUrl, isConfigured } = this.getConfig();

    // Sandbox / Simulation fallback when tokens are not yet configured
    if (!isConfigured) {
      console.log(`[WhatsApp Sandbox] Payload simulado para: ${payload.to}`);
      console.log('[WhatsApp Sandbox] Tipo:', payload.type);
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        success: true,
        messageId: `wamid.simulated.${Date.now()}.${Math.floor(Math.random() * 100000)}`,
        simulated: true
      };
    }

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        console.error('[WhatsApp Cloud API Error]:', JSON.stringify(data, null, 2));
        const errorMessage =
          data.error?.error_user_msg ||
          data.error?.message ||
          'Error al comunicarse con WhatsApp Cloud API';
        return {
          success: false,
          error: errorMessage
        };
      }

      const messageId = data.messages?.[0]?.id;
      return {
        success: true,
        messageId,
        simulated: false
      };
    } catch (err: any) {
      console.error('[WhatsApp Cloud API Network Exception]:', err);
      return {
        success: false,
        error: err.message || 'Error de red con Meta Cloud API'
      };
    }
  }

  /**
   * Sends a plain text message
   */
  public static async sendTextMessage(
    to: string,
    text: string,
    options?: MessageOptions
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    if (!normalizedTo || normalizedTo.length < 10) {
      return { success: false, error: 'Número de teléfono inválido.' };
    }

    if (!text || !text.trim()) {
      return { success: false, error: 'El contenido del mensaje no puede estar vacío.' };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'text',
      text: {
        body: text.trim(),
        preview_url: Boolean(options?.previewUrl)
      }
    };

    const result = await this.executeMetaApiCall(payload);
    this.recordOutboundMessage({
      to: normalizedTo,
      content: text.trim(),
      messageType: 'text',
      result,
      options,
      rawPayload: payload
    });

    return result;
  }

  /**
   * Sends an interactive message with Quick Reply buttons (up to 3 buttons)
   */
  public static async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: InteractiveButton[],
    options?: MessageOptions
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    if (!normalizedTo || normalizedTo.length < 10) {
      return { success: false, error: 'Número de teléfono inválido.' };
    }

    if (!bodyText || !bodyText.trim()) {
      return { success: false, error: 'El texto del mensaje no puede estar vacío.' };
    }

    if (!buttons || buttons.length === 0) {
      return { success: false, error: 'Debes incluir al menos un botón.' };
    }

    if (buttons.length > 3) {
      return { success: false, error: 'WhatsApp permite un máximo de 3 botones interactivos.' };
    }

    const formattedButtons = buttons.map(b => ({
      type: 'reply',
      reply: {
        id: b.id.slice(0, 256),
        title: b.title.slice(0, 20) // WhatsApp limit: 20 characters
      }
    }));

    const interactivePayload: any = {
      type: 'button',
      body: { text: bodyText.trim() },
      action: { buttons: formattedButtons }
    };

    if (options?.headerText) {
      interactivePayload.header = { type: 'text', text: options.headerText.slice(0, 60) };
    }

    if (options?.footerText) {
      interactivePayload.footer = { text: options.footerText.slice(0, 60) };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'interactive',
      interactive: interactivePayload
    };

    const result = await this.executeMetaApiCall(payload);
    this.recordOutboundMessage({
      to: normalizedTo,
      content: `${bodyText} [Botones: ${buttons.map(b => b.title).join(' | ')}]`,
      messageType: 'interactive',
      result,
      options,
      rawPayload: payload
    });

    return result;
  }

  /**
   * Sends an interactive selectable list message (up to 10 items total)
   */
  public static async sendInteractiveList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: InteractiveListSection[],
    options?: MessageOptions
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    if (!normalizedTo || normalizedTo.length < 10) {
      return { success: false, error: 'Número de teléfono inválido.' };
    }

    if (!bodyText || !bodyText.trim()) {
      return { success: false, error: 'El texto del cuerpo no puede estar vacío.' };
    }

    if (!buttonText || !buttonText.trim()) {
      return { success: false, error: 'El texto del botón desplegable es obligatorio.' };
    }

    if (!sections || sections.length === 0) {
      return { success: false, error: 'Debes incluir al menos una sección en la lista.' };
    }

    const totalRows = sections.reduce((sum, s) => sum + (s.rows?.length || 0), 0);
    if (totalRows > 10) {
      return { success: false, error: 'WhatsApp permite un máximo de 10 opciones en listas interactivas.' };
    }

    const formattedSections = sections.map(sec => ({
      title: sec.title.slice(0, 24),
      rows: sec.rows.map(r => ({
        id: r.id.slice(0, 200),
        title: r.title.slice(0, 24),
        description: r.description ? r.description.slice(0, 72) : undefined
      }))
    }));

    const interactivePayload: any = {
      type: 'list',
      body: { text: bodyText.trim() },
      action: {
        button: buttonText.slice(0, 20),
        sections: formattedSections
      }
    };

    if (options?.headerText) {
      interactivePayload.header = { type: 'text', text: options.headerText.slice(0, 60) };
    }

    if (options?.footerText) {
      interactivePayload.footer = { text: options.footerText.slice(0, 60) };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'interactive',
      interactive: interactivePayload
    };

    const result = await this.executeMetaApiCall(payload);
    this.recordOutboundMessage({
      to: normalizedTo,
      content: `${bodyText} [Menú de opciones: ${buttonText}]`,
      messageType: 'interactive',
      result,
      options,
      rawPayload: payload
    });

    return result;
  }

  /**
   * Sends a pre-approved template message
   */
  public static async sendTemplate(
    to: string,
    templateName: string,
    languageCode = 'es_MX',
    components: any[] = [],
    options?: MessageOptions & { contentSummary?: string }
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    if (!normalizedTo || normalizedTo.length < 10) {
      return { success: false, error: 'Número de teléfono inválido.' };
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode }
      }
    };

    if (components && components.length > 0) {
      payload.template.components = components;
    }

    const result = await this.executeMetaApiCall(payload);
    this.recordOutboundMessage({
      to: normalizedTo,
      content: options?.contentSummary || `[Plantilla: ${templateName}]`,
      messageType: 'template',
      templateName,
      result,
      options,
      rawPayload: payload
    });

    return result;
  }

  /**
   * Marks an incoming WhatsApp message as read
   */
  public static async markAsRead(wamid: string): Promise<boolean> {
    const { token, baseUrl, isConfigured } = this.getConfig();
    if (!isConfigured || !wamid) return true;

    try {
      await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: wamid
        })
      });
      return true;
    } catch (err) {
      console.warn('[WhatsAppService] Error sending read receipt:', err);
      return false;
    }
  }

  /**
   * Sends an RSVP confirmation invitation via WhatsApp Cloud API
   * Compatible with existing wedding RSVPs in Lazo.
   */
  public static async sendRsvpInvitation(params: {
    guestName: string;
    guestPhone: string;
    companionCount: number;
    coupleNames: string;
    weddingDate?: string;
    rsvpUrl?: string;
    weddingId?: string;
    guestId?: string;
  }): Promise<SendMessageResult> {
    const toPhone = this.normalizePhoneNumber(params.guestPhone);

    if (!toPhone || toPhone.length < 10) {
      return {
        success: false,
        error: 'Número de teléfono inválido o incompleto.'
      };
    }

    // Format wedding date and couple names in flawless, natural Spanish
    const formattedDate = formatWeddingDateHuman(params.weddingDate);
    const cleanCoupleNames = formatCoupleNames(params.coupleNames);
    const totalSeats = 1 + (params.companionCount || 0);

    const rawTemplateEnv = process.env.WHATSAPP_RSVP_TEMPLATE;
    const preferredTemplates = rawTemplateEnv && rawTemplateEnv !== 'hello_world'
      ? [rawTemplateEnv, 'rsvp_viva_la_bride', 'rsvp_confirmacion_boda']
      : ['rsvp_viva_la_bride', 'rsvp_confirmacion_boda'];

    // Deduplicate template list
    const candidateTemplates = Array.from(new Set(preferredTemplates));

    // Store the exact message that is actually sent to the guest on WhatsApp
    const contentSummary = `¡Hola ${params.guestName}! Nos llena de ilusión invitarte a la boda de ${cleanCoupleNames} este ${formattedDate}. Tienes ${totalSeats} lugar(es) reservado(s). Por favor confirma tu asistencia seleccionando una opción abajo:`;

    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.guestName },
          { type: 'text', text: cleanCoupleNames },
          { type: 'text', text: formattedDate },
          { type: 'text', text: totalSeats.toString() }
        ]
      }
    ];

    let lastResult: SendMessageResult = { success: false, error: 'No se pudo enviar ninguna plantilla.' };

    for (const tName of candidateTemplates) {
      for (const lang of ['es_MX', 'es']) {
        const result = await this.sendTemplate(toPhone, tName, lang, components, {
          weddingId: params.weddingId,
          guestId: params.guestId,
          contentSummary
        });
        if (result.success) {
          return result;
        }
        lastResult = result;
      }
    }

    return lastResult;
  }
}
