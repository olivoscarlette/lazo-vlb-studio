/**
 * WhatsApp Cloud API Service for Lazo - VLB Studio
 * 
 * Supports both Official Meta Cloud API (when env vars are present)
 * and Simulation / Test Sandbox mode (when credentials are not yet configured).
 */

interface SendTemplateResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export class WhatsAppService {
  private static getCredentials() {
    const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const templateName = process.env.WHATSAPP_RSVP_TEMPLATE || 'rsvp_invitacion_vlb';
    const isConfigured = Boolean(token && phoneNumberId && token !== 'test_token');

    return { token, phoneNumberId, templateName, isConfigured };
  }

  /**
   * Cleans and formats phone number for WhatsApp international standard
   * Example: "+52 81 1234 5678" -> "528112345678"
   */
  public static sanitizePhone(rawPhone: string): string {
    const cleaned = rawPhone.replace(/[^0-9]/g, '');
    // If it's a 10-digit Mexican mobile number without country code, add 52
    if (cleaned.length === 10) {
      return `52${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Sends an RSVP confirmation invitation via WhatsApp Cloud API
   */
  public static async sendRsvpInvitation(params: {
    guestName: string;
    guestPhone: string;
    companionCount: number;
    coupleNames: string;
    weddingDate?: string;
    rsvpUrl?: string;
  }): Promise<SendTemplateResult> {
    const { token, phoneNumberId, templateName, isConfigured } = this.getCredentials();
    const toPhone = this.sanitizePhone(params.guestPhone);

    if (!toPhone || toPhone.length < 10) {
      return {
        success: false,
        error: 'Número de teléfono inválido o incompleto.'
      };
    }

    // --- Modo Simulación / Sandbox (si aún no se configuran las credenciales en Railway) ---
    if (!isConfigured) {
      console.log(`[WhatsApp Sandbox] Mensaje RSVP simulado para ${params.guestName} (${toPhone})`);
      console.log(`[WhatsApp Sandbox] Pareja: ${params.coupleNames}, Acompañantes: ${params.companionCount}`);
      
      // Simulate quick network latency
      await new Promise(resolve => setTimeout(resolve, 350));

      return {
        success: true,
        messageId: `wamid.simulated.${Date.now()}.${Math.floor(Math.random() * 10000)}`,
        simulated: true
      };
    }

    // --- Modo Oficial Meta Cloud API ---
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es_MX' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: params.guestName },
                { type: 'text', text: params.coupleNames || 'los novios' },
                { type: 'text', text: params.weddingDate || 'la fecha acordada' },
                { type: 'text', text: (1 + params.companionCount).toString() }
              ]
            }
          ]
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        console.error('[WhatsApp Cloud API Error]:', data);
        const errMsg = data.error?.message || 'Error al comunicarse con WhatsApp API';
        return { success: false, error: errMsg };
      }

      const messageId = data.messages?.[0]?.id;
      return {
        success: true,
        messageId,
        simulated: false
      };
    } catch (err: any) {
      console.error('[WhatsApp Service Exception]:', err);
      return {
        success: false,
        error: err.message || 'Error de conexión con Meta'
      };
    }
  }
}
