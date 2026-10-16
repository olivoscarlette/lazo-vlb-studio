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
