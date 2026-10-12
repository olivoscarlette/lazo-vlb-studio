import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/meetings - List meetings and check package limits
router.get('/:weddingId/meetings', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  const wedding = db.prepare('SELECT package_type FROM weddings WHERE id = ?').get(weddingId) as any;
  const packageType = wedding?.package_type || 'Integral';

  // Get packages catalog
  const packagesRow = db.prepare("SELECT values_json FROM catalogs WHERE key = 'meeting_packages'").get() as any;
  let packagesList: any[] = [];
  try {
    packagesList = JSON.parse(packagesRow?.values_json || '[]');
  } catch {
    packagesList = [];
  }

  const currentPkg = packagesList.find(p => p.name.toLowerCase() === packageType.toLowerCase()) || {
    name: packageType,
    maxMeetings: 6,
    description: 'Paquete de reuniones VLB'
  };

  const meetings = db.prepare(`
    SELECT * FROM meetings
    WHERE wedding_id = ?
    ORDER BY date DESC, time DESC
  `).all(weddingId) as any[];

  for (const m of meetings) {
    try {
      m.participants = JSON.parse(m.participants || '[]');
    } catch {
      m.participants = [];
    }
    try {
      m.proposed_slots = JSON.parse(m.proposed_slots || '[]');
    } catch {
      m.proposed_slots = [];
    }
  }

  // Count meetings held or scheduled
  const completedOrScheduled = meetings.filter(m => m.status !== 'CANCELADA').length;
  const remainingMeetings = Math.max(0, currentPkg.maxMeetings - completedOrScheduled);

  return res.json({
    meetings,
    packageInfo: {
      packageName: currentPkg.name,
      maxMeetings: currentPkg.maxMeetings,
      usedMeetings: completedOrScheduled,
      remainingMeetings: currentPkg.maxMeetings >= 999 ? 'Ilimitadas' : remainingMeetings,
      description: currentPkg.description,
      includes: Array.isArray(currentPkg.includes) ? currentPkg.includes : []
    }
  });
});

// POST /api/weddings/:weddingId/meetings - Schedule or request meeting
router.post('/:weddingId/meetings', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;
  const { title, date, time, participants, notes } = req.body;

  if (!title || !date || !time) {
    return res.status(400).json({ error: 'Título, fecha y hora son obligatorios.' });
  }

  const id = 'mtg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // If user is NOVIOS, initial status is SOLICITADA. If Admin/Coord, PROGRAMADA
  const status = user.role === 'NOVIOS' ? 'SOLICITADA' : 'PROGRAMADA';

  let participantsList = Array.isArray(participants) ? participants : [];
  if (participantsList.length === 0) {
    participantsList = [user.name];
  }

  db.prepare(`
    INSERT INTO meetings (id, wedding_id, title, date, time, participants, status, notes, agreements, pending_tasks, proposed_slots, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)
  `).run(
    id, weddingId, title.trim(), date, time,
    JSON.stringify(participantsList), status, notes ? notes.trim() : null,
    user.name, now, now
  );

  // If requested by Novios, notify team
  if (user.role === 'NOVIOS') {
    const notifId = 'notif_' + Date.now();
    db.prepare(`
      INSERT INTO notifications (id, wedding_id, user_id, title, message, read, link, created_at)
      VALUES (?, ?, NULL, ?, ?, 0, ?, ?)
    `).run(
      notifId, weddingId,
      'Nueva Solicitud de Reunión',
      `Los novios han solicitado una reunión: "${title}" para el ${date} a las ${time}.`,
      `/weddings/${weddingId}/meetings`,
      now
    );
  }

  logAudit(weddingId, user.id, user.name, 'AGENDAR_REUNION', 'MEETING', id, `Reunión agendada/solicitada: ${title} (${status})`);

  return res.status(201).json({
    message: user.role === 'NOVIOS'
      ? 'Solicitud de reunión enviada a tu equipo de coordinación VLB Studio.'
      : 'Reunión agendada exitosamente.',
    meeting: { id, title, date, time, status }
  });
});

// PUT /api/weddings/:weddingId/meetings/:meetingId - Update meeting / Accept / Propose 2 alternative slots
router.put('/:weddingId/meetings/:meetingId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, meetingId } = req.params;
  const user = req.user!;
  const { title, date, time, participants, status, notes, agreements, pending_tasks, proposed_slots, selected_slot } = req.body;

  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND wedding_id = ?').get(meetingId, weddingId) as any;
  if (!meeting) {
    return res.status(404).json({ error: 'Reunión no encontrada.' });
  }

  const now = new Date().toISOString();
  let finalStatus = status || meeting.status;
  let finalDate = date || meeting.date;
  let finalTime = time || meeting.time;
  let finalProposed = proposed_slots !== undefined ? JSON.stringify(proposed_slots) : meeting.proposed_slots;

  // Handle case where team sends 2 alternative slots
  if (proposed_slots && Array.isArray(proposed_slots) && proposed_slots.length > 0) {
    finalStatus = 'PROPUESTA';
    // Notify novios
    const notifId = 'notif_' + Date.now();
    db.prepare(`
      INSERT INTO notifications (id, wedding_id, user_id, title, message, read, link, created_at)
      VALUES (?, ?, NULL, ?, ?, 0, ?, ?)
    `).run(
      notifId, weddingId,
      'Opciones de Horario Alternativo',
      `El equipo VLB propuso 2 opciones de horario para la reunión "${meeting.title}". Por favor selecciona tu preferida.`,
      `/weddings/${weddingId}/meetings`,
      now
    );
  }

  // Handle case where Novios select one of the proposed slots
  if (selected_slot && typeof selected_slot === 'object') {
    finalDate = selected_slot.date;
    finalTime = selected_slot.time;
    finalStatus = 'PROGRAMADA';
    finalProposed = null;
  }

  const parts = participants !== undefined ? JSON.stringify(participants) : meeting.participants;

  db.prepare(`
    UPDATE meetings SET
      title = ?, date = ?, time = ?, participants = ?, status = ?,
      notes = ?, agreements = ?, pending_tasks = ?, proposed_slots = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(
    title || meeting.title,
    finalDate,
    finalTime,
    parts,
    finalStatus,
    notes !== undefined ? notes : meeting.notes,
    agreements !== undefined ? agreements : meeting.agreements,
    pending_tasks !== undefined ? pending_tasks : meeting.pending_tasks,
    finalProposed,
    now,
    meetingId,
    weddingId
  );

  logAudit(weddingId, user.id, user.name, 'ACTUALIZAR_REUNION', 'MEETING', meetingId, `Actualización de reunión ${meeting.title} (${finalStatus})`);

  return res.json({ message: 'Reunión actualizada correctamente.', status: finalStatus, date: finalDate, time: finalTime });
});

export default router;
