import { db } from '../db/index.js';
import { WhatsAppService } from './whatsappService.js';

export interface BroadcastScheduleInfo {
  weddingId: string;
  weddingDate: string;
  reminder7Days: {
    enabled: boolean;
    time: string;
    status: 'PENDING' | 'SENT' | 'DISABLED';
    sentAt: string | null;
    templateText: string;
    defaultTemplate: string;
    targetDate: string; // YYYY-MM-DD
    targetFormattedDate: string;
    eligibleCount: number;
    sentCount: number;
  };
  dayOfSeating: {
    enabled: boolean;
    time: string;
    status: 'PENDING' | 'SENT' | 'DISABLED';
    sentAt: string | null;
    templateText: string;
    defaultTemplate: string;
    targetDate: string; // YYYY-MM-DD
    targetFormattedDate: string;
    eligibleCount: number;
    sentCount: number;
  };
}

export class BroadcastScheduler {
  public static readonly DEFAULT_REMINDER_TEMPLATE = `RECORDATORIO & DETALLES ✨

Boda *{{Novios}}*
¡Estamos a solo 7 días de celebrar juntos!

Te compartimos la información esencial para que disfrutes al máximo este gran día:

• Ceremonia: *{{Ceremonia}}* · *{{HoraCeremonia}}*
• Recepción: *{{Recepcion}}* · *{{HoraRecepcion}}*
• Código de vestimenta: {{DressCode}}
• Pases confirmados: {{Lugares}} persona(s)

{{Ubicacion}}

¡Nos dará muchísimo gusto recibirte!`;

  public static readonly DEFAULT_SEATING_TEMPLATE = `¡HOY CELEBRAMOS! 🥂✨

Hola {{Nombre}},
¡El gran día de *{{Novios}}* ha llegado!

Hemos preparado tu lugar con mucho cariño:
🍽️ Tu mesa asignada: *{{Mesa}}*
🎟️ Pases reservados: *{{Lugares}} persona(s)*

Al llegar a la recepción, el equipo de coordinación de Viva la Bride Studio estará listo para darte la bienvenida y acompañarte a tu lugar.

¡A disfrutar y celebrar juntos!`;

  /**
   * Helper to format human-readable Spanish dates
   */
  public static formatDateHuman(dateStr?: string | null): string {
    if (!dateStr) return 'Fecha por definir';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch {}
    return dateStr;
  }

  /**
   * Calculates the target date 7 days before the wedding (YYYY-MM-DD)
   */
  public static getTargetDate7DaysBefore(weddingDateStr: string): string {
    if (!weddingDateStr) return '';
    const cleanDate = weddingDateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return cleanDate;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    d.setDate(d.getDate() - 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  /**
   * Returns current date and time in Mexico Timezone (America/Monterrey / Mexico_City)
   */
  public static getMexicoCurrentDateTime(): { currentDate: string; currentTime: string } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Monterrey',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    // Format output: "YYYY-MM-DD, HH:MM"
    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value || '';
    const d = parts.find(p => p.type === 'day')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const min = parts.find(p => p.type === 'minute')?.value || '00';
    return {
      currentDate: `${y}-${m}-${d}`,
      currentTime: `${hour}:${min}`
    };
  }

  /**
   * Interpolates template tags with real event and guest data
   */
  public static interpolateTemplate(
    template: string,
    data: {
      guestName?: string;
      coupleNames?: string;
      ceremonyVenue?: string;
      ceremonyTime?: string;
      receptionVenue?: string;
      receptionTime?: string;
      dressCode?: string;
      places?: number;
      tableName?: string;
      invitationUrl?: string;
    }
  ): string {
    let result = template;

    // Upgrade templates if they don't have bold formatting for Novios, Ceremonia and Recepción
    result = result.replace(/Boda\s+(?!\*)\{\{Novios\}\}(?!\*)/gi, 'Boda *{{Novios}}*');
    result = result.replace(/Ceremonia:\s*(?!\*)\{\{Ceremonia\}\}(?!\*)/gi, 'Ceremonia: *{{Ceremonia}}*');
    result = result.replace(/·\s*(?!\*)\{\{HoraCeremonia\}\}(?!\*)/gi, '· *{{HoraCeremonia}}*');
    result = result.replace(/Recepción:\s*(?!\*)\{\{Recepcion\}\}(?!\*)/gi, 'Recepción: *{{Recepcion}}*');
    result = result.replace(/·\s*(?!\*)\{\{HoraRecepcion\}\}(?!\*)/gi, '· *{{HoraRecepcion}}*');

    result = result.replace(/\{\{Nombre\}\}/gi, data.guestName || 'Apreciable invitado(a)');
    result = result.replace(/\{\{Novios\}\}/gi, data.coupleNames || 'los novios');
    result = result.replace(/\{\{Ceremonia\}\}/gi, data.ceremonyVenue || 'Templo / Parroquia');
    result = result.replace(/\{\{HoraCeremonia\}\}/gi, data.ceremonyTime || 'Por confirmar');
    result = result.replace(/\{\{Recepcion\}\}/gi, data.receptionVenue || 'Sede de recepción');
    result = result.replace(/\{\{HoraRecepcion\}\}/gi, data.receptionTime || 'Por confirmar');
    result = result.replace(/\{\{DressCode\}\}/gi, data.dressCode || 'Rigurosa Etiqueta / Formal');
    result = result.replace(/\{\{Lugares\}\}/gi, String(data.places || 1));
    result = result.replace(/\{\{Mesa\}\}/gi, data.tableName || 'Mesa asignada');

    if (data.invitationUrl && data.invitationUrl.trim()) {
      const rawUrl = data.invitationUrl.trim();
      const appUrl = process.env.APP_URL || 'https://lazo-vlb.up.railway.app';
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${appUrl}${rawUrl}`;
      result = result.replace(
        /\{\{Ubicacion\}\}/gi,
        `📍 Ubicación / Invitación digital: ${fullUrl}`
      );
    } else {
      result = result.replace(/\{\{Ubicacion\}\}/gi, '');
    }

    // Clean multiple consecutive line breaks
    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Retrieves schedule settings and eligible recipient counts for a wedding
   */
  public static getBroadcastInfo(weddingId: string): BroadcastScheduleInfo | null {
    const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
    if (!wedding) return null;

    const weddingDate = (wedding.wedding_date || wedding.date || '').split('T')[0];
    const target7Days = this.getTargetDate7DaysBefore(weddingDate);

    // Eligible for Reminder: Confirmed guests with a valid phone number
    const eligibleReminder = db.prepare(`
      SELECT COUNT(*) as count 
      FROM guests 
      WHERE wedding_id = ? 
        AND status IN ('Confirmado', 'CONFIRMADO', 'Confirmada') 
        AND phone IS NOT NULL AND TRIM(phone) != ''
    `).get(weddingId) as any;

    const sentReminder = db.prepare(`
      SELECT COUNT(*) as count 
      FROM guests 
      WHERE wedding_id = ? 
        AND reminder_sent_at IS NOT NULL
    `).get(weddingId) as any;

    // Eligible for Seating: Confirmed guests with an assigned table
    const eligibleSeating = db.prepare(`
      SELECT COUNT(*) as count 
      FROM guests 
      WHERE wedding_id = ? 
        AND status IN ('Confirmado', 'CONFIRMADO', 'Confirmada') 
        AND table_id IS NOT NULL 
        AND phone IS NOT NULL AND TRIM(phone) != ''
    `).get(weddingId) as any;

    const sentSeating = db.prepare(`
      SELECT COUNT(*) as count 
      FROM guests 
      WHERE wedding_id = ? 
        AND seating_sent_at IS NOT NULL
    `).get(weddingId) as any;

    let reminderTemplate = wedding.reminder_template_text || this.DEFAULT_REMINDER_TEMPLATE;
    if (reminderTemplate && !reminderTemplate.includes('*{{Novios}}*')) {
      reminderTemplate = reminderTemplate.replace(/Boda\s+(?!\*)\{\{Novios\}\}(?!\*)/gi, 'Boda *{{Novios}}*');
      reminderTemplate = reminderTemplate.replace(/Ceremonia:\s*(?!\*)\{\{Ceremonia\}\}(?!\*)/gi, 'Ceremonia: *{{Ceremonia}}*');
      reminderTemplate = reminderTemplate.replace(/·\s*(?!\*)\{\{HoraCeremonia\}\}(?!\*)/gi, '· *{{HoraCeremonia}}*');
      reminderTemplate = reminderTemplate.replace(/Recepción:\s*(?!\*)\{\{Recepcion\}\}(?!\*)/gi, 'Recepción: *{{Recepcion}}*');
      reminderTemplate = reminderTemplate.replace(/·\s*(?!\*)\{\{HoraRecepcion\}\}(?!\*)/gi, '· *{{HoraRecepcion}}*');
    }

    let seatingTemplate = wedding.seating_template_text || this.DEFAULT_SEATING_TEMPLATE;
    if (seatingTemplate && !seatingTemplate.includes('*{{Novios}}*')) {
      seatingTemplate = seatingTemplate.replace(/de\s+(?!\*)\{\{Novios\}\}(?!\*)/gi, 'de *{{Novios}}*');
      seatingTemplate = seatingTemplate.replace(/asignada:\s*(?!\*)\{\{Mesa\}\}(?!\*)/gi, 'asignada: *{{Mesa}}*');
      seatingTemplate = seatingTemplate.replace(/reservados:\s*(?!\*)\{\{Lugares\}\}\s*persona\(s\)(?!\*)/gi, 'reservados: *{{Lugares}} persona(s)*');
    }

    return {
      weddingId,
      weddingDate,
      reminder7Days: {
        enabled: Boolean(wedding.reminder_7days_enabled ?? 1),
        time: wedding.reminder_7days_time || '11:00',
        status: (wedding.reminder_7days_status || 'PENDING') as any,
        sentAt: wedding.reminder_7days_sent_at || null,
        templateText: reminderTemplate,
        defaultTemplate: this.DEFAULT_REMINDER_TEMPLATE,
        targetDate: target7Days,
        targetFormattedDate: this.formatDateHuman(target7Days),
        eligibleCount: eligibleReminder?.count || 0,
        sentCount: sentReminder?.count || 0
      },
      dayOfSeating: {
        enabled: Boolean(wedding.dayof_seating_enabled ?? 1),
        time: wedding.dayof_seating_time || '12:00',
        status: (wedding.dayof_seating_status || 'PENDING') as any,
        sentAt: wedding.dayof_seating_sent_at || null,
        templateText: seatingTemplate,
        defaultTemplate: this.DEFAULT_SEATING_TEMPLATE,
        targetDate: weddingDate,
        targetFormattedDate: this.formatDateHuman(weddingDate),
        eligibleCount: eligibleSeating?.count || 0,
        sentCount: sentSeating?.count || 0
      }
    };
  }

  /**
   * Updates schedule configuration for a wedding
   */
  public static updateBroadcastSettings(
    weddingId: string,
    settings: {
      reminder7DaysEnabled?: boolean;
      reminder7DaysTime?: string;
      reminderTemplateText?: string;
      dayOfSeatingEnabled?: boolean;
      dayOfSeatingTime?: string;
      seatingTemplateText?: string;
    }
  ): void {
    const updates: string[] = [];
    const params: any[] = [];

    if (settings.reminder7DaysEnabled !== undefined) {
      updates.push('reminder_7days_enabled = ?');
      params.push(settings.reminder7DaysEnabled ? 1 : 0);
    }
    if (settings.reminder7DaysTime !== undefined) {
      updates.push('reminder_7days_time = ?');
      params.push(settings.reminder7DaysTime);
    }
    if (settings.reminderTemplateText !== undefined) {
      updates.push('reminder_template_text = ?');
      params.push(settings.reminderTemplateText);
    }

    if (settings.dayOfSeatingEnabled !== undefined) {
      updates.push('dayof_seating_enabled = ?');
      params.push(settings.dayOfSeatingEnabled ? 1 : 0);
    }
    if (settings.dayOfSeatingTime !== undefined) {
      updates.push('dayof_seating_time = ?');
      params.push(settings.dayOfSeatingTime);
    }
    if (settings.seatingTemplateText !== undefined) {
      updates.push('seating_template_text = ?');
      params.push(settings.seatingTemplateText);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(weddingId);
      db.prepare(`UPDATE weddings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
  }

  /**
   * Formats couple names
   */
  private static getCoupleNames(wedding: any): string {
    if (wedding.partner_1_name && wedding.partner_2_name) {
      return `${wedding.partner_1_name} y ${wedding.partner_2_name}`;
    }
    return wedding.name || 'los novios';
  }

  /**
   * Dispatches the 7-day reminder broadcast to confirmed guests
   */
  public static async sendReminderBroadcast(
    weddingId: string,
    options?: { isTest?: boolean; testPhone?: string }
  ): Promise<{ success: boolean; sentCount: number; errorCount: number; details: any[] }> {
    const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
    if (!wedding) throw new Error('Boda no encontrada');

    const coupleNames = this.getCoupleNames(wedding);
    const template = wedding.reminder_template_text || this.DEFAULT_REMINDER_TEMPLATE;
    const rawInvUrl = wedding.invitation_type === 'PDF' && wedding.invitation_pdf_url
      ? wedding.invitation_pdf_url
      : wedding.invitation_url;
    const appUrl = process.env.APP_URL || 'https://lazo-vlb.up.railway.app';
    const invUrl = rawInvUrl
      ? (rawInvUrl.startsWith('http') ? rawInvUrl : `${appUrl}${rawInvUrl}`)
      : '';

    // Test send to a single phone
    if (options?.isTest && options.testPhone) {
      const sampleText = this.interpolateTemplate(template, {
        guestName: 'Scarlette Olivo (Prueba)',
        coupleNames,
        ceremonyVenue: wedding.ceremony_venue || 'Catedral de Monterrey',
        ceremonyTime: wedding.ceremony_time || '4:30 PM',
        receptionVenue: wedding.reception_venue || 'Fábrica La Fama',
        receptionTime: wedding.reception_time || '7:00 PM',
        dressCode: wedding.dress_code || 'Rigurosa Etiqueta / Formal',
        places: 2,
        invitationUrl: invUrl
      });

      const res = await WhatsAppService.sendTextMessage(options.testPhone, sampleText, {
        weddingId,
        previewUrl: true,
        sender: 'BUSINESS'
      });

      return {
        success: res.success,
        sentCount: res.success ? 1 : 0,
        errorCount: res.success ? 0 : 1,
        details: [{ phone: options.testPhone, result: res }]
      };
    }

    // Mass send to all confirmed guests
    const guests = db.prepare(`
      SELECT g.*, t.name as table_name
      FROM guests g
      LEFT JOIN tables t ON t.id = g.table_id
      WHERE g.wedding_id = ?
        AND g.status IN ('Confirmado', 'CONFIRMADO', 'Confirmada')
        AND g.phone IS NOT NULL AND TRIM(g.phone) != ''
    `).all(weddingId) as any[];

    let sentCount = 0;
    let errorCount = 0;
    const details: any[] = [];
    const now = new Date().toISOString();

    for (const g of guests) {
      const places = g.confirmed_places || (1 + (g.companion_count || 0));
      const messageText = this.interpolateTemplate(template, {
        guestName: g.first_name ? `${g.first_name}`.trim() : 'Apreciable invitado(a)',
        coupleNames,
        ceremonyVenue: wedding.ceremony_venue,
        ceremonyTime: wedding.ceremony_time,
        receptionVenue: wedding.reception_venue,
        receptionTime: wedding.reception_time,
        dressCode: wedding.dress_code,
        places,
        invitationUrl: invUrl
      });

      try {
        const sendRes = await WhatsAppService.sendTextMessage(g.phone, messageText, {
          weddingId,
          guestId: g.id,
          previewUrl: true,
          sender: 'BUSINESS'
        });

        if (sendRes.success) {
          sentCount++;
          db.prepare('UPDATE guests SET reminder_sent_at = ?, updated_at = ? WHERE id = ?').run(now, now, g.id);
        } else {
          errorCount++;
        }
        details.push({ guestId: g.id, phone: g.phone, success: sendRes.success });
      } catch (err: any) {
        errorCount++;
        details.push({ guestId: g.id, phone: g.phone, success: false, error: err.message });
      }
    }

    // Mark broadcast as SENT in weddings table
    db.prepare(`
      UPDATE weddings 
      SET reminder_7days_status = 'SENT', 
          reminder_7days_sent_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, now, weddingId);

    return { success: true, sentCount, errorCount, details };
  }

  /**
   * Dispatches the day-of seating broadcast to confirmed guests with tables
   */
  public static async sendSeatingBroadcast(
    weddingId: string,
    options?: { isTest?: boolean; testPhone?: string }
  ): Promise<{ success: boolean; sentCount: number; errorCount: number; details: any[] }> {
    const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
    if (!wedding) throw new Error('Boda no encontrada');

    const coupleNames = this.getCoupleNames(wedding);
    const template = wedding.seating_template_text || this.DEFAULT_SEATING_TEMPLATE;

    // Test send to a single phone
    if (options?.isTest && options.testPhone) {
      const sampleText = this.interpolateTemplate(template, {
        guestName: 'Scarlette Olivo (Prueba)',
        coupleNames,
        tableName: 'Mesa 1 — Familia de la Novia',
        places: 2
      });

      const res = await WhatsAppService.sendTextMessage(options.testPhone, sampleText, {
        weddingId,
        sender: 'BUSINESS'
      });

      return {
        success: res.success,
        sentCount: res.success ? 1 : 0,
        errorCount: res.success ? 0 : 1,
        details: [{ phone: options.testPhone, result: res }]
      };
    }

    // Mass send to confirmed guests who have an assigned table
    const guests = db.prepare(`
      SELECT g.*, t.name as table_name
      FROM guests g
      JOIN tables t ON t.id = g.table_id
      WHERE g.wedding_id = ?
        AND g.status IN ('Confirmado', 'CONFIRMADO', 'Confirmada')
        AND g.phone IS NOT NULL AND TRIM(g.phone) != ''
    `).all(weddingId) as any[];

    let sentCount = 0;
    let errorCount = 0;
    const details: any[] = [];
    const now = new Date().toISOString();

    for (const g of guests) {
      const places = g.confirmed_places || (1 + (g.companion_count || 0));
      const messageText = this.interpolateTemplate(template, {
        guestName: g.first_name ? `${g.first_name}`.trim() : 'Apreciable invitado(a)',
        coupleNames,
        tableName: g.table_name || 'Mesa asignada',
        places
      });

      try {
        const sendRes = await WhatsAppService.sendTextMessage(g.phone, messageText, {
          weddingId,
          guestId: g.id,
          sender: 'BUSINESS'
        });

        if (sendRes.success) {
          sentCount++;
          db.prepare('UPDATE guests SET seating_sent_at = ?, updated_at = ? WHERE id = ?').run(now, now, g.id);
        } else {
          errorCount++;
        }
        details.push({ guestId: g.id, phone: g.phone, success: sendRes.success });
      } catch (err: any) {
        errorCount++;
        details.push({ guestId: g.id, phone: g.phone, success: false, error: err.message });
      }
    }

    // Mark broadcast as SENT in weddings table
    db.prepare(`
      UPDATE weddings 
      SET dayof_seating_status = 'SENT', 
          dayof_seating_sent_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, now, weddingId);

    return { success: true, sentCount, errorCount, details };
  }

  /**
   * Background routine that checks whether any scheduled broadcast is due to fire
   */
  public static async checkAndRunScheduledBroadcasts(): Promise<void> {
    try {
      const { currentDate, currentTime } = this.getMexicoCurrentDateTime();
      const weddings = db.prepare(`
        SELECT id, name, wedding_date,
               reminder_7days_enabled, reminder_7days_time, reminder_7days_status,
               dayof_seating_enabled, dayof_seating_time, dayof_seating_status
        FROM weddings
        WHERE status != 'ARCHIVED'
      `).all() as any[];

      for (const w of weddings) {
        const weddingDate = (w.wedding_date || '').split('T')[0];
        if (!weddingDate) continue;

        // 1. Check Reminder (7 days before)
        const isReminderEnabled = Boolean(w.reminder_7days_enabled ?? 1);
        const reminderStatus = w.reminder_7days_status || 'PENDING';
        if (isReminderEnabled && reminderStatus === 'PENDING') {
          const target7Days = this.getTargetDate7DaysBefore(weddingDate);
          const scheduledTime = w.reminder_7days_time || '11:00';

          // Trigger if currentDate has reached or passed target7Days, and currentTime >= scheduledTime
          if (
            (currentDate > target7Days) ||
            (currentDate === target7Days && currentTime >= scheduledTime)
          ) {
            console.log(`[BroadcastScheduler] Disparando recordatorio de 7 días para boda "${w.name}" (${w.id})...`);
            await this.sendReminderBroadcast(w.id);
          }
        }

        // 2. Check Seating (Day of event)
        const isSeatingEnabled = Boolean(w.dayof_seating_enabled ?? 1);
        const seatingStatus = w.dayof_seating_status || 'PENDING';
        if (isSeatingEnabled && seatingStatus === 'PENDING') {
          const scheduledTime = w.dayof_seating_time || '12:00';

          // Trigger if currentDate has reached or passed weddingDate, and currentTime >= scheduledTime
          if (
            (currentDate > weddingDate) ||
            (currentDate === weddingDate && currentTime >= scheduledTime)
          ) {
            console.log(`[BroadcastScheduler] Disparando asignación de mesa día boda para "${w.name}" (${w.id})...`);
            await this.sendSeatingBroadcast(w.id);
          }
        }
      }
    } catch (err) {
      console.error('[BroadcastScheduler] Error running scheduled broadcasts:', err);
    }
  }
}
