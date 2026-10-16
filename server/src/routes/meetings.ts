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
    try {
      m.accepted_by = JSON.parse(m.accepted_by || '[]');
    } catch {
      m.accepted_by = [];
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

// POST /api/weddings/:weddingId/meetings - Schedule or request meeting with conflict detection
router.post('/:weddingId/meetings', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;
  const { title, date, time, participants, notes, meet_url, force_conflict } = req.body;

  if (!title || !date || !time) {
    return res.status(400).json({ error: 'Título, fecha y hora son obligatorios.' });
  }

  // Conflict Detection
  if (!force_conflict) {
    const [newH, newM] = time.split(':').map(Number);
    const newMinutes = newH * 60 + (newM || 0);
    const existingMeetings = db.prepare(`
      SELECT m.id, m.title, m.time, m.date, w.name as wedding_name
      FROM meetings m
      JOIN weddings w ON w.id = m.wedding_id
      WHERE m.date = ? AND m.status != 'CANCELADA'
    `).all(date) as any[];

    for (const em of existingMeetings) {
      if (!em.time) continue;
      const [h, m] = em.time.split(':').map(Number);
      const emMinutes = h * 60 + (m || 0);
      if (Math.abs(newMinutes - emMinutes) < 45) {
        return res.status(409).json({
          conflict: true,
          message: `Alerta de empalme: Ya existe la sesión "${em.title}" de ${em.wedding_name} programada a las ${em.time} hrs.`,
          conflictingMeeting: em
        });
      }
    }
  }

  const id = 'mtg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // If user is NOVIOS, initial status is SOLICITADA. If Admin/Coord, PROGRAMADA
  const status = user.role === 'NOVIOS' ? 'SOLICITADA' : 'PROGRAMADA';

  let participantsList = Array.isArray(participants) ? participants : [];
  if (participantsList.length === 0) {
    participantsList = [user.name];
  }

  // If created by Admin or Coord, add as first acceptance
  const initialAcceptedBy = (user.role === 'ADMINISTRADOR' || user.role === 'COORDINADOR')
    ? [{ userId: user.id, userName: user.name, role: user.role, acceptedAt: now }]
    : [];

  db.prepare(`
    INSERT INTO meetings (
      id, wedding_id, title, date, time, participants, status, notes,
      agreements, pending_tasks, proposed_slots, accepted_by, meet_url, summary,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, ?, ?, ?)
  `).run(
    id, weddingId, title.trim(), date, time,
    JSON.stringify(participantsList), status, notes ? notes.trim() : null,
    JSON.stringify(initialAcceptedBy), meet_url || null,
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
      `Los novios han solicitado una reunión: "${title}" para el ${date} a las ${time}. Se requieren 2 aceptaciones del equipo para confirmarla.`,
      `/weddings/${weddingId}/meetings`,
      now
    );
  }

  logAudit(weddingId, user.id, user.name, 'AGENDAR_REUNION', 'MEETING', id, `Reunión agendada/solicitada: ${title} (${status})`);

  return res.status(201).json({
    message: user.role === 'NOVIOS'
      ? 'Solicitud enviada. Se programará una vez que 2 administradores/coordinadores acepten el horario.'
      : 'Reunión agendada exitosamente.',
    meeting: { id, title, date, time, status }
  });
});

// PUT /api/weddings/:weddingId/meetings/:meetingId - Update meeting / Accept / Propose 2 alternative slots
router.put('/:weddingId/meetings/:meetingId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, meetingId } = req.params;
  const user = req.user!;
  const {
    title, date, time, participants, status, notes, agreements,
    pending_tasks, proposed_slots, selected_slot, action, meet_url, summary
  } = req.body;

  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND wedding_id = ?').get(meetingId, weddingId) as any;
  if (!meeting) {
    return res.status(404).json({ error: 'Reunión no encontrada.' });
  }

  const now = new Date().toISOString();
  let finalStatus = status || meeting.status;
  let finalDate = date || meeting.date;
  let finalTime = time || meeting.time;
  let finalProposed = proposed_slots !== undefined ? JSON.stringify(proposed_slots) : meeting.proposed_slots;

  let acceptedList: any[] = [];
  try {
    acceptedList = JSON.parse(meeting.accepted_by || '[]');
  } catch {
    acceptedList = [];
  }

  // Handle Team Acceptance Condition: Session is accepted when 2 or more admins/coordinators accept
  if (action === 'ACCEPT_HORARIO') {
    if (user.role !== 'ADMINISTRADOR' && user.role !== 'COORDINADOR') {
      return res.status(403).json({ error: 'Solo administradores y coordinadores de planeación pueden aceptar el horario.' });
    }

    if (!acceptedList.some((a: any) => a.userId === user.id)) {
      acceptedList.push({
        userId: user.id,
        userName: user.name,
        role: user.role,
        acceptedAt: now
      });
    }

    if (acceptedList.length >= 2) {
      finalStatus = 'PROGRAMADA';
      const notifId = 'notif_' + Date.now();
      db.prepare(`
        INSERT INTO notifications (id, wedding_id, user_id, title, message, read, link, created_at)
        VALUES (?, ?, NULL, ?, ?, 0, ?, ?)
      `).run(
        notifId, weddingId,
        'Horario de Reunión Confirmado (2/2)',
        `La reunión "${meeting.title}" ha sido aceptada y confirmada con 2 aprobaciones de planeación (${acceptedList.map((a: any) => a.userName).join(', ')}).`,
        `/weddings/${weddingId}/meetings`,
        now
      );
    } else {
      // 1 approval recorded, waiting for second
      const notifId = 'notif_' + Date.now();
      db.prepare(`
        INSERT INTO notifications (id, wedding_id, user_id, title, message, read, link, created_at)
        VALUES (?, ?, NULL, ?, ?, 0, ?, ?)
      `).run(
        notifId, weddingId,
        'Aceptación de Horario (1/2)',
        `${user.name} ha aceptado el horario de la reunión "${meeting.title}". Se requiere 1 aprobación adicional para programarla oficialmente.`,
        `/weddings/${weddingId}/meetings`,
        now
      );
    }
  }

  // Handle case where team sends 2 alternative slots
  if (proposed_slots && Array.isArray(proposed_slots) && proposed_slots.length > 0) {
    finalStatus = 'PROPUESTA';
    acceptedList = []; // reset acceptances for new proposal
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
    finalStatus = 'SOLICITADA'; // Novios chose slot, team will accept
    finalProposed = null;
    acceptedList = [];
  }

  const parts = participants !== undefined ? JSON.stringify(participants) : meeting.participants;
  const finalMeetUrl = meet_url !== undefined ? meet_url : meeting.meet_url;
  const finalSummary = summary !== undefined ? summary : meeting.summary;

  db.prepare(`
    UPDATE meetings SET
      title = ?, date = ?, time = ?, participants = ?, status = ?,
      notes = ?, agreements = ?, pending_tasks = ?, proposed_slots = ?,
      accepted_by = ?, meet_url = ?, summary = ?, updated_at = ?
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
    JSON.stringify(acceptedList),
    finalMeetUrl,
    finalSummary,
    now,
    meetingId,
    weddingId
  );

  logAudit(weddingId, user.id, user.name, 'ACTUALIZAR_REUNION', 'MEETING', meetingId, `Actualización de reunión ${meeting.title} (${finalStatus})`);

  return res.json({
    message: 'Reunión actualizada correctamente.',
    status: finalStatus,
    date: finalDate,
    time: finalTime,
    accepted_by: acceptedList
  });
});

export default router;
