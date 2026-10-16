import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, logAudit } from '../middleware/auth.js';

const router = Router();

/**
 * Checks for time conflicts between events on the same date
 * Returns the conflicting event if found within a 45-minute window
 */
function findTimeConflict(date: string, time: string, excludeId?: string) {
  if (!date || !time) return null;

  const [newH, newM] = time.split(':').map(Number);
  const newMinutes = newH * 60 + (newM || 0);

  // 1. Check studio calendar events
  const calEvents = db.prepare(`
    SELECT id, title, time, event_type as type, 'CALENDAR' as source
    FROM calendar_events
    WHERE date = ?
  `).all(date) as any[];

  // 2. Check wedding meetings
  const meetings = db.prepare(`
    SELECT m.id, m.title, m.time, 'PLANNING' as type, 'MEETING' as source, w.name as wedding_name
    FROM meetings m
    JOIN weddings w ON w.id = m.wedding_id
    WHERE m.date = ? AND m.status != 'CANCELADA'
  `).all(date) as any[];

  const allOnDate = [...calEvents, ...meetings].filter(e => e.id !== excludeId);

  for (const item of allOnDate) {
    if (!item.time) continue;
    const [h, m] = item.time.split(':').map(Number);
    const itemMinutes = h * 60 + (m || 0);

    // Overlap within 45 minutes
    if (Math.abs(newMinutes - itemMinutes) < 45) {
      return item;
    }
  }

  return null;
}

// GET /api/calendar - Returns unified studio calendar: Planning meetings, wedding days, and studio events
router.get('/', authenticateToken, (req, res) => {
  try {
    const { month, year, type } = req.query as { month?: string; year?: string; type?: string };

    // 1. Custom Studio Events (Citas externas, Servicios, Open house, etc.)
    const customEvents = db.prepare(`
      SELECT ce.*, w.name as wedding_name
      FROM calendar_events ce
      LEFT JOIN weddings w ON w.id = ce.wedding_id
      ORDER BY ce.date ASC, ce.time ASC
    `).all() as any[];

    // 2. Planning Meetings from all weddings
    const planningMeetings = db.prepare(`
      SELECT 
        m.id,
        m.wedding_id,
        m.title,
        'PLANNING' as event_type,
        m.date,
        m.time,
        NULL as end_time,
        'En línea / Google Meet' as location,
        m.created_by as responsible,
        m.notes,
        m.status,
        m.accepted_by,
        m.meet_url,
        m.summary,
        w.name as wedding_name
      FROM meetings m
      JOIN weddings w ON w.id = m.wedding_id
      WHERE m.status != 'CANCELADA'
      ORDER BY m.date ASC, m.time ASC
    `).all() as any[];

    // 3. Wedding Days (Bodas VLB)
    const weddingDays = db.prepare(`
      SELECT 
        'wed_day_' || id as id,
        id as wedding_id,
        'BODA VLB: ' || name as title,
        'EVENTO' as event_type,
        wedding_date as date,
        '12:00' as time,
        '23:59' as end_time,
        venue as location,
        'Equipo VLB Studio' as responsible,
        'Día oficial de la boda: ' || name as notes,
        'CONFIRMADA' as status,
        name as wedding_name
      FROM weddings
      WHERE wedding_date IS NOT NULL AND wedding_date != ''
    `).all() as any[];

    // Merge and parse accepted_by
    const formattedMeetings = planningMeetings.map(m => {
      let acceptedBy = [];
      try {
        acceptedBy = JSON.parse(m.accepted_by || '[]');
      } catch {}
      return {
        ...m,
        accepted_by: acceptedBy,
        source: 'MEETING'
      };
    });

    const formattedCustom = customEvents.map(e => ({
      ...e,
      source: 'CALENDAR_EVENT'
    }));

    const formattedWeddings = weddingDays.map(w => ({
      ...w,
      source: 'WEDDING_DAY'
    }));

    let allEvents = [...formattedCustom, ...formattedMeetings, ...formattedWeddings];

    // Filter by type if provided
    if (type && type !== 'TODOS') {
      allEvents = allEvents.filter(e => e.event_type === type);
    }

    // Sort chronologically
    allEvents.sort((a, b) => {
      const cmp = (a.date || '').localeCompare(b.date || '');
      if (cmp !== 0) return cmp;
      return (a.time || '').localeCompare(b.time || '');
    });

    res.json({ events: allEvents });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al cargar el calendario general: ' + err.message });
  }
});

// Helper for escaping iCalendar text
function escapeIcs(str: string = ''): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// GET /api/calendar/feed.ics - Live subscription feed for Google Calendar / Apple Calendar
router.get('/feed.ics', (req, res) => {
  try {
    const { wedding_id } = req.query as { wedding_id?: string };

    // 1. Studio Events
    let customQuery = 'SELECT ce.*, w.name as wedding_name FROM calendar_events ce LEFT JOIN weddings w ON w.id = ce.wedding_id';
    const customParams: any[] = [];
    if (wedding_id) {
      customQuery += ' WHERE ce.wedding_id = ? OR ce.wedding_id IS NULL';
      customParams.push(wedding_id);
    }
    const customEvents = db.prepare(customQuery).all(...customParams) as any[];

    // 2. Planning Meetings
    let meetQuery = `
      SELECT m.*, w.name as wedding_name
      FROM meetings m
      JOIN weddings w ON w.id = m.wedding_id
      WHERE m.status != 'CANCELADA'
    `;
    const meetParams: any[] = [];
    if (wedding_id) {
      meetQuery += ' AND m.wedding_id = ?';
      meetParams.push(wedding_id);
    }
    const meetings = db.prepare(meetQuery).all(...meetParams) as any[];

    // 3. Wedding Days
    let wedQuery = "SELECT id, name, wedding_date, venue FROM weddings WHERE wedding_date IS NOT NULL AND wedding_date != ''";
    const wedParams: any[] = [];
    if (wedding_id) {
      wedQuery += ' AND id = ?';
      wedParams.push(wedding_id);
    }
    const weddings = db.prepare(wedQuery).all(...wedParams) as any[];

    const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LAZO VLB Studio//Calendario General//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LAZO — VLB Studio',
      'X-WR-TIMEZONE:America/Mexico_City'
    ];

    // Add Custom Events
    for (const ce of customEvents) {
      const cleanDate = (ce.date || '').replace(/[^0-9]/g, '');
      if (!cleanDate) continue;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:lazo-cal-${ce.id}@vlb.studio`);
      lines.push(`DTSTAMP:${nowIso}`);

      if (ce.time) {
        const cleanStart = ce.time.replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4) + '00';
        lines.push(`DTSTART:${cleanDate}T${cleanStart}`);
        if (ce.end_time) {
          const cleanEnd = ce.end_time.replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4) + '00';
          lines.push(`DTEND:${cleanDate}T${cleanEnd}`);
        } else {
          // Default 1 hr
          const [h, m] = ce.time.split(':').map(Number);
          const endH = String((h + 1) % 24).padStart(2, '0');
          lines.push(`DTEND:${cleanDate}T${endH}${String(m || 0).padStart(2, '0')}00`);
        }
      } else {
        lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
      }

      lines.push(`SUMMARY:${escapeIcs(ce.title)}`);
      
      const desc = [
        ce.wedding_name ? `Boda: ${ce.wedding_name}` : '',
        ce.responsible ? `Responsable: ${ce.responsible}` : '',
        ce.notes ? `Notas: ${ce.notes}` : '',
        'Plataforma: LAZO VLB Studio'
      ].filter(Boolean).join('\\n');

      lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
      if (ce.location) {
        lines.push(`LOCATION:${escapeIcs(ce.location)}`);
      }
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    // Add Planning Meetings
    for (const m of meetings) {
      const cleanDate = (m.date || '').replace(/[^0-9]/g, '');
      if (!cleanDate) continue;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:lazo-meeting-${m.id}@vlb.studio`);
      lines.push(`DTSTAMP:${nowIso}`);

      if (m.time) {
        const cleanStart = m.time.replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4) + '00';
        lines.push(`DTSTART:${cleanDate}T${cleanStart}`);
        const [h, min] = m.time.split(':').map(Number);
        const endH = String((h + 1) % 24).padStart(2, '0');
        lines.push(`DTEND:${cleanDate}T${endH}${String(min || 0).padStart(2, '0')}00`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
      }

      lines.push(`SUMMARY:${escapeIcs(`Cita Planning: ${m.title} (${m.wedding_name})`)}`);

      const desc = [
        `Boda: ${m.wedding_name}`,
        `Estatus: ${m.status}`,
        m.meet_url ? `Google Meet: ${m.meet_url}` : '',
        m.notes ? `Notas: ${m.notes}` : '',
        m.agreements ? `Acuerdos: ${m.agreements}` : '',
        'Plataforma: LAZO VLB Studio'
      ].filter(Boolean).join('\\n');

      lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
      lines.push(`LOCATION:${escapeIcs(m.meet_url || 'En línea / Google Meet')}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    // Add Wedding Days
    for (const w of weddings) {
      const cleanDate = (w.wedding_date || '').replace(/[^0-9]/g, '');
      if (!cleanDate) continue;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:lazo-wedding-day-${w.id}@vlb.studio`);
      lines.push(`DTSTAMP:${nowIso}`);
      lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
      lines.push(`SUMMARY:${escapeIcs(`💍 BODA VLB: ${w.name}`)}`);
      lines.push(`DESCRIPTION:${escapeIcs(`Día oficial de celebración para la boda de ${w.name}.\\nVenue: ${w.venue || 'Por definir'}\\nPlataforma: LAZO VLB Studio`)}`);
      if (w.venue) {
        lines.push(`LOCATION:${escapeIcs(w.venue)}`);
      }
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="lazo_vlb_calendar.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(icsContent);
  } catch (err: any) {
    res.status(500).send('Error generando archivo iCalendar: ' + err.message);
  }
});

// POST /api/calendar - Add an event with conflict detection
router.post('/', authenticateToken, (req, res) => {
  try {
    const user = req.user!;
    const { title, event_type, date, time, end_time, location, responsible, notes, wedding_id, force_conflict } = req.body;

    if (!title || !event_type || !date || !time) {
      return res.status(400).json({ error: 'Título, tipo de evento, fecha y hora son obligatorios.' });
    }

    // Conflict detection
    if (!force_conflict) {
      const conflict = findTimeConflict(date, time);
      if (conflict) {
        return res.status(409).json({
          conflict: true,
          message: `Alerta de empalme: Ya existe la cita/evento "${conflict.title}" programada a las ${conflict.time} hrs.`,
          conflictingEvent: conflict
        });
      }
    }

    const id = 'cal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO calendar_events (
        id, wedding_id, title, event_type, date, time, end_time,
        location, responsible, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      wedding_id || null,
      title.trim(),
      event_type,
      date,
      time,
      end_time || null,
      location || null,
      responsible || user.name,
      notes || null,
      user.name,
      now,
      now
    );

    logAudit(wedding_id || 'GENERAL', user.id, user.name, 'CREAR_EVENTO_CALENDARIO', 'CALENDAR', id, `Evento agendado: ${title} (${event_type})`);

    res.status(201).json({
      message: 'Evento añadido al Calendario General.',
      event: { id, title, event_type, date, time, location, responsible }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al agendar en el calendario: ' + err.message });
  }
});

// PUT /api/calendar/:id - Update an event with conflict check
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { title, event_type, date, time, end_time, location, responsible, notes, wedding_id, force_conflict } = req.body;

    const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Evento de calendario no encontrado.' });
    }

    // Conflict check
    if (!force_conflict && (date !== existing.date || time !== existing.time)) {
      const conflict = findTimeConflict(date || existing.date, time || existing.time, id as string);
      if (conflict) {
        return res.status(409).json({
          conflict: true,
          message: `Alerta de empalme: Ya existe la cita/evento "${conflict.title}" a las ${conflict.time} hrs.`,
          conflictingEvent: conflict
        });
      }
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE calendar_events SET
        title = ?, event_type = ?, date = ?, time = ?, end_time = ?,
        location = ?, responsible = ?, notes = ?, wedding_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title || existing.title,
      event_type || existing.event_type,
      date || existing.date,
      time || existing.time,
      end_time !== undefined ? end_time : existing.end_time,
      location !== undefined ? location : existing.location,
      responsible !== undefined ? responsible : existing.responsible,
      notes !== undefined ? notes : existing.notes,
      wedding_id !== undefined ? wedding_id : existing.wedding_id,
      now,
      id
    );

    res.json({ message: 'Evento actualizado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar evento: ' + err.message });
  }
});

// DELETE /api/calendar/:id - Delete event
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
    res.json({ message: 'Evento eliminado del calendario general.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar evento: ' + err.message });
  }
});

export default router;
