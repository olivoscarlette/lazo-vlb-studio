import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/timeline - List timeline items
router.get('/:weddingId/timeline', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const items = db.prepare(`
    SELECT * FROM timeline_events
    WHERE wedding_id = ?
    ORDER BY time ASC, order_index ASC
  `).all(weddingId);
  return res.json({ timeline: items });
});

// POST /api/weddings/:weddingId/timeline - Add timeline event
router.post('/:weddingId/timeline', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { time, activity, location, responsible, notes, status, order_index, day_type } = req.body;

  if (!time || !activity) {
    return res.status(400).json({ error: 'Hora y actividad son obligatorias.' });
  }

  const id = 'tme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const resolvedDayType = day_type === 'CIVIL' ? 'CIVIL' : 'BODA';

  db.prepare(`
    INSERT INTO timeline_events (id, wedding_id, time, activity, location, responsible, notes, status, order_index, day_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, weddingId, time.trim(), activity.trim(), location || null,
    responsible || null, notes || null, status || 'PENDIENTE', order_index || 0, resolvedDayType, now, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'CREAR_TIMELINE', 'TIMELINE', id, `Nuevo evento en timeline (${resolvedDayType}): ${time} ${activity}`);

  return res.status(201).json({
    message: 'Evento añadido al timeline.',
    event: { id, time, activity, location, responsible, status: status || 'PENDIENTE', day_type: resolvedDayType }
  });
});

// PUT /api/weddings/:weddingId/timeline/:id - Update timeline event
router.put('/:weddingId/timeline/:id', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, id } = req.params;
  const { time, activity, location, responsible, notes, status, order_index, day_type, completed_by, completed_at } = req.body;

  const event = db.prepare('SELECT * FROM timeline_events WHERE id = ? AND wedding_id = ?').get(id, weddingId) as any;
  if (!event) {
    return res.status(404).json({ error: 'Evento no encontrado en el timeline.' });
  }

  const now = new Date().toISOString();
  const resolvedDayType = day_type !== undefined ? (day_type === 'CIVIL' ? 'CIVIL' : 'BODA') : (event.day_type || 'BODA');
  const targetStatus = status || event.status;

  let resolvedCompletedBy = event.completed_by;
  let resolvedCompletedAt = event.completed_at;

  if (targetStatus === 'COMPLETADO') {
    resolvedCompletedBy = completed_by !== undefined ? completed_by : (event.completed_by || req.user!.name);
    resolvedCompletedAt = completed_at !== undefined ? completed_at : (event.completed_at || now);
  } else if (status && status !== 'COMPLETADO') {
    resolvedCompletedBy = null;
    resolvedCompletedAt = null;
  }

  db.prepare(`
    UPDATE timeline_events SET
      time = ?, activity = ?, location = ?, responsible = ?,
      notes = ?, status = ?, order_index = ?, day_type = ?,
      completed_by = ?, completed_at = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(
    time || event.time,
    activity || event.activity,
    location !== undefined ? location : event.location,
    responsible !== undefined ? responsible : event.responsible,
    notes !== undefined ? notes : event.notes,
    targetStatus,
    order_index !== undefined ? order_index : event.order_index,
    resolvedDayType,
    resolvedCompletedBy,
    resolvedCompletedAt,
    now,
    id,
    weddingId
  );

  return res.json({
    message: 'Evento actualizado correctamente.',
    event: {
      id,
      status: targetStatus,
      completed_by: resolvedCompletedBy,
      completed_at: resolvedCompletedAt
    }
  });
});

// DELETE /api/weddings/:weddingId/timeline/:id - Delete event
router.delete('/:weddingId/timeline/:id', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, id } = req.params;

  db.prepare('DELETE FROM timeline_events WHERE id = ? AND wedding_id = ?').run(id, weddingId);

  return res.json({ message: 'Evento eliminado del timeline.' });
});

export default router;
