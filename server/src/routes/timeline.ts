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
  const { time, activity, location, responsible, notes, status, order_index } = req.body;

  if (!time || !activity) {
    return res.status(400).json({ error: 'Hora y actividad son obligatorias.' });
  }

  const id = 'tme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO timeline_events (id, wedding_id, time, activity, location, responsible, notes, status, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, weddingId, time.trim(), activity.trim(), location || null,
    responsible || null, notes || null, status || 'PENDIENTE', order_index || 0, now, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'CREAR_TIMELINE', 'TIMELINE', id, `Nuevo evento en timeline: ${time} ${activity}`);

  return res.status(201).json({
    message: 'Evento añadido al timeline.',
    event: { id, time, activity, location, responsible, status: status || 'PENDIENTE' }
  });
});

// PUT /api/weddings/:weddingId/timeline/:id - Update timeline event
router.put('/:weddingId/timeline/:id', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, id } = req.params;
  const { time, activity, location, responsible, notes, status, order_index } = req.body;

  const event = db.prepare('SELECT * FROM timeline_events WHERE id = ? AND wedding_id = ?').get(id, weddingId) as any;
  if (!event) {
    return res.status(404).json({ error: 'Evento no encontrado en el timeline.' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE timeline_events SET
      time = ?, activity = ?, location = ?, responsible = ?,
      notes = ?, status = ?, order_index = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(
    time || event.time,
    activity || event.activity,
    location !== undefined ? location : event.location,
    responsible !== undefined ? responsible : event.responsible,
    notes !== undefined ? notes : event.notes,
    status || event.status,
    order_index !== undefined ? order_index : event.order_index,
    now,
    id,
    weddingId
  );

  return res.json({ message: 'Evento actualizado correctamente.' });
});

// DELETE /api/weddings/:weddingId/timeline/:id - Delete event
router.delete('/:weddingId/timeline/:id', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, id } = req.params;

  db.prepare('DELETE FROM timeline_events WHERE id = ? AND wedding_id = ?').run(id, weddingId);

  return res.json({ message: 'Evento eliminado del timeline.' });
});

export default router;
