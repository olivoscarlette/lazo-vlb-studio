import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { authenticateToken, requireRole, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

const INVITATIONS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'invitations');
if (!fs.existsSync(INVITATIONS_DIR)) {
  fs.mkdirSync(INVITATIONS_DIR, { recursive: true });
}

const invitationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, INVITATIONS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const uniqueSuffix = 'invitation_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    cb(null, uniqueSuffix + ext);
  }
});

const uploadInvitation = multer({
  storage: invitationStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos en formato PDF para la invitación formal.'));
    }
  }
});

const FLOORPLANS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'floorplans');
if (!fs.existsSync(FLOORPLANS_DIR)) {
  fs.mkdirSync(FLOORPLANS_DIR, { recursive: true });
}

const floorPlanStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, FLOORPLANS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = 'floorplan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    cb(null, uniqueSuffix + ext);
  }
});

const uploadFloorPlan = multer({
  storage: floorPlanStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit for high-res architectural blueprints
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    const isAllowedExt = /\.(png|jpe?g|webp|pdf)$/i.test(file.originalname);
    if (allowed.includes(file.mimetype) || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos en formato PDF, PNG, JPG o WebP para el plano base.'));
    }
  }
});

const COVERS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'covers');
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, COVERS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = 'cover_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    cb(null, uniqueSuffix + ext);
  }
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    const isAllowedExt = /\.(png|jpe?g|webp|heic|heif)$/i.test(file.originalname);
    if (allowed.includes(file.mimetype) || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP o HEIC) para la portada.'));
    }
  }
});

// GET /api/weddings - General Dashboard list (scoped by role)
router.get('/', authenticateToken, (req, res) => {
  const user = req.user!;

  let weddings: any[] = [];
  if (user.role === 'ADMINISTRADOR') {
    weddings = db.prepare(`
      SELECT w.*,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id) as total_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Confirmado') as confirmed_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Pendiente de confirmar') as pending_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'No asistirá') as declined_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Confirmado') as total_confirmed_seats,
        (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id AND t.status != 'Completada') as pending_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id) as total_tasks
      FROM weddings w
      ORDER BY w.wedding_date ASC
    `).all();
  } else if (user.role === 'COORDINADOR' || user.role === 'STAFF') {
    weddings = db.prepare(`
      SELECT w.*,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id) as total_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Confirmado') as confirmed_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Pendiente de confirmar') as pending_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'No asistirá') as declined_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Confirmado') as total_confirmed_seats,
        (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id AND t.status != 'Completada') as pending_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id) as total_tasks
      FROM weddings w
      JOIN wedding_assignments a ON a.wedding_id = w.id
      WHERE a.user_id = ?
      ORDER BY w.wedding_date ASC
    `).all(user.id);
  } else if (user.role === 'NOVIOS') {
    if (!user.wedding_id) {
      return res.status(404).json({ error: 'No tienes una boda asignada.' });
    }
    weddings = db.prepare(`
      SELECT w.*,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id) as total_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Confirmado') as confirmed_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Pendiente de confirmar') as pending_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'No asistirá') as declined_guests,
        (SELECT COALESCE(SUM(1 + g.companion_count), 0) FROM guests g WHERE g.wedding_id = w.id AND g.status = 'Confirmado') as total_confirmed_seats,
        (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id AND t.status != 'Completada') as pending_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id) as total_tasks
      FROM weddings w
      WHERE w.id = ?
    `).all(user.wedding_id);
  }

  // Attach assigned team to each wedding
  for (const w of weddings) {
    w.team = db.prepare(`
      SELECT u.id, u.name, u.role, u.email, u.phone, u.avatar_url, a.assigned_role
      FROM users u
      JOIN wedding_assignments a ON a.user_id = u.id
      WHERE a.wedding_id = ?
    `).all(w.id);
  }

  return res.json({ weddings });
});

// POST /api/weddings - Admin only: Create Wedding
router.post('/', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const {
    name,
    partner_1_name,
    partner_2_name,
    wedding_date,
    ceremony_time,
    reception_time,
    ceremony_venue,
    reception_venue,
    estimated_guests,
    notes,
    package_type,
    event_type = 'Boda Completa',
    has_whatsapp_rsvp = 0,
    has_layout_2d = 0,
    allow_novios_rsvp = null,
    populate_checklist = true
  } = req.body;

  if (!name || !wedding_date) {
    return res.status(400).json({ error: 'El nombre del evento y la fecha son obligatorios.' });
  }

  const p1 = (partner_1_name || '').trim();
  const p2 = (partner_2_name || '').trim();

  const id = 'wed_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO weddings (
      id, name, slug, partner_1_name, partner_2_name, wedding_date,
      ceremony_time, reception_time, ceremony_venue, reception_venue,
      estimated_guests, status, notes, package_type, event_type,
      has_whatsapp_rsvp, has_layout_2d, allow_novios_rsvp, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLANNING', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, slug, p1, p2, wedding_date,
    ceremony_time || null, reception_time || null, ceremony_venue || null, reception_venue || null,
    estimated_guests ? parseInt(estimated_guests, 10) : 0, notes || null, package_type || 'Integral', event_type || 'Boda Completa',
    has_whatsapp_rsvp ? 1 : 0, has_layout_2d ? 1 : 0,
    allow_novios_rsvp !== null && allow_novios_rsvp !== undefined ? (allow_novios_rsvp ? 1 : 0) : null,
    now, now
  );

  // Automatically assign the admin who created it
  db.prepare(`
    INSERT INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at)
    VALUES (?, ?, ?, 'ADMINISTRADOR', ?)
  `).run('asg_' + Date.now(), id, req.user!.id, now);

  // Read VLB Master Templates from catalogs to pre-populate new wedding
  let initialCivilReqs: any[] = [];
  let initialReligiousReqs: any[] = [];
  try {
    const civilCatalog = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get('master_civil_requirements') as any;
    if (civilCatalog) {
      const titles: string[] = JSON.parse(civilCatalog.values_json);
      initialCivilReqs = titles.map((t, idx) => ({ id: `req_civ_${id}_${idx}`, title: t, completed: false }));
    }
    const relCatalog = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get('master_religious_requirements') as any;
    if (relCatalog) {
      const titles: string[] = JSON.parse(relCatalog.values_json);
      initialReligiousReqs = titles.map((t, idx) => ({ id: `req_rel_${id}_${idx}`, title: t, completed: false }));
    }
  } catch {}

  // Initialize civil and religious records with VLB templates
  db.prepare(`
    INSERT INTO civil_ceremony (id, wedding_id, date, time, location, juez_oficial, witnesses, requirements_status, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('civ_' + id, id, wedding_date, null, null, null, JSON.stringify([]), JSON.stringify(initialCivilReqs), null, now);

  db.prepare(`
    INSERT INTO religious_ceremony (id, wedding_id, date, time, temple_name, officiant, music_notes, readings_notes, requirements_status, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('rel_' + id, id, wedding_date, null, null, null, JSON.stringify([]), JSON.stringify([]), JSON.stringify(initialReligiousReqs), null, now);

  // Auto-populate wedding checklist from master_checklist catalog only if populate_checklist is not false
  if (populate_checklist !== false && populate_checklist !== 'false') {
    try {
      const checklistCatalog = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get('master_checklist') as any;
      if (checklistCatalog) {
        const masterTasks: any[] = JSON.parse(checklistCatalog.values_json);
        const eventTypeTarget = (event_type || 'Boda Completa').toLowerCase();
        const relevantTasks = masterTasks.filter((mt: any) => {
          const et = (mt.event_type || 'Boda Completa').toLowerCase();
          if (eventTypeTarget.includes('despedida')) return et.includes('despedida');
          if (eventTypeTarget.includes('baby')) return et.includes('baby');
          if (eventTypeTarget.includes('civil')) return et.includes('civil');
          if (eventTypeTarget.includes('xv') || eventTypeTarget.includes('quince')) return et.includes('xv') || et.includes('quince');
          if (eventTypeTarget.includes('otro')) return et.includes('otro');
          return !et.includes('despedida') && !et.includes('baby') && !et.includes('civil') && !et.includes('xv') && !et.includes('quince') && !et.includes('otro');
        });
        const tasksToInsert = relevantTasks.length > 0 ? relevantTasks : masterTasks.filter((mt: any) => !mt.event_type || mt.event_type === 'Boda Completa');

        const insertTask = db.prepare(`
          INSERT INTO tasks (id, wedding_id, title, category, responsible, due_date, priority, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?)
        `);
        tasksToInsert.forEach((mt: any, idx: number) => {
          insertTask.run(
            `tsk_${id}_${idx}_${Date.now()}`,
            id,
            mt.title,
            mt.category || 'Checklist General',
            mt.responsible || 'Lazo Studio',
            null,
            mt.priority || 'Media',
            mt.notes || '',
            now,
            now
          );
        });
      }
    } catch {}
  }

  logAudit(id, req.user!.id, req.user!.name, 'CREAR_BODA', 'WEDDING', id, `Creación de la boda ${name}`);

  return res.status(201).json({
    message: 'Boda creada exitosamente.',
    wedding: { id, name, slug, wedding_date }
  });
});

// GET /api/weddings/:weddingId - Single wedding workspace details (isolated!)
router.get('/:weddingId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  if (!wedding) {
    return res.status(404).json({ error: 'Boda no encontrada.' });
  }

  // Assigned team
  const team = db.prepare(`
    SELECT u.id, u.name, u.role, u.email, u.phone, u.avatar_url, a.assigned_role
    FROM users u
    JOIN wedding_assignments a ON a.user_id = u.id
    WHERE a.wedding_id = ?
  `).all(weddingId);

  // Core stats
  const guestStats = db.prepare(`
    SELECT
      COUNT(*) as total_guests,
      SUM(CASE WHEN status = 'Confirmado' THEN 1 ELSE 0 END) as confirmed_count,
      SUM(CASE WHEN status = 'Pendiente de confirmar' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'No asistirá' THEN 1 ELSE 0 END) as declined_count,
      COALESCE(SUM(CASE WHEN status = 'Confirmado' THEN 1 + companion_count ELSE 0 END), 0) as confirmed_total_seats,
      COALESCE(SUM(1 + companion_count), 0) as total_seats_potential
    FROM guests WHERE wedding_id = ?
  `).get(weddingId) as any;

  // Financial stats (Costo real, pagado, restante - NO estimated budget!)
  const financeStats = db.prepare(`
    SELECT
      COALESCE(SUM(costo_real), 0) as total_costo_real
    FROM vendors WHERE wedding_id = ?
  `).get(weddingId) as any;

  const paidStats = db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as total_pagado
    FROM payments WHERE wedding_id = ?
  `).get(weddingId) as any;

  const totalCostoReal = financeStats?.total_costo_real || 0;
  const totalPagado = paidStats?.total_pagado || 0;
  const totalRestante = Math.max(0, totalCostoReal - totalPagado);

  const vendorCategories = db.prepare(`
    SELECT 
      COALESCE(NULLIF(TRIM(v.type), ''), 'Otros') as category,
      COALESCE(SUM(v.costo_real), 0) as total_costo,
      COALESCE((
        SELECT SUM(p.amount) 
        FROM payments p 
        WHERE p.wedding_id = ? AND p.vendor_id IN (
          SELECT v2.id FROM vendors v2 WHERE v2.wedding_id = ? AND COALESCE(NULLIF(TRIM(v2.type), ''), 'Otros') = COALESCE(NULLIF(TRIM(v.type), ''), 'Otros')
        )
      ), 0) as total_pagado,
      COUNT(v.id) as vendor_count
    FROM vendors v
    WHERE v.wedding_id = ?
    GROUP BY COALESCE(NULLIF(TRIM(v.type), ''), 'Otros')
    ORDER BY total_costo DESC
  `).all(weddingId, weddingId, weddingId) as any[];

  const civilCeremony = db.prepare(`
    SELECT date, time, location, juez_oficial
    FROM civil_ceremony WHERE wedding_id = ?
  `).get(weddingId) as any;

  const religiousCeremony = db.prepare(`
    SELECT date, time, temple_name, officiant
    FROM religious_ceremony WHERE wedding_id = ?
  `).get(weddingId) as any;

  return res.json({
    wedding: {
      ...wedding,
      team,
      civil_ceremony: civilCeremony || null,
      religious_ceremony: religiousCeremony || null,
      stats: {
        guests: guestStats,
        finance: {
          costo_real: totalCostoReal,
          monto_pagado: totalPagado,
          restante: totalRestante,
          categories: vendorCategories
        }
      }
    }
  });
});

// PUT /api/weddings/:weddingId - Update wedding info
router.put('/:weddingId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;

  if (user.role === 'STAFF') {
    return res.status(403).json({ error: 'El staff no tiene permisos para modificar la configuración de la boda.' });
  }

  const {
    name, partner_1_name, partner_2_name, wedding_date,
    ceremony_time, reception_time, ceremony_venue, reception_venue,
    estimated_guests, status, notes, package_type, floor_plan_url,
    invitation_type, invitation_url, invitation_pdf_url, invitation_pdf_filename,
    dress_code, no_children, event_type,
    has_whatsapp_rsvp, has_layout_2d, whatsapp_sending_blocked,
    allow_novios_rsvp,
    expected_updated_at
  } = req.body;

  const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  if (!wedding) {
    return res.status(404).json({ error: 'Boda no encontrada.' });
  }

  if (expected_updated_at && wedding.updated_at !== expected_updated_at) {
    return res.status(409).json({
      error: 'Conflicto de concurrencia: La información de la boda fue modificada por otro usuario. Recarga la página para ver los últimos cambios.',
      current_updated_at: wedding.updated_at
    });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE weddings SET
      name = ?, partner_1_name = ?, partner_2_name = ?, wedding_date = ?,
      ceremony_time = ?, reception_time = ?, ceremony_venue = ?, reception_venue = ?,
      estimated_guests = ?, status = ?, notes = ?, package_type = ?, floor_plan_url = ?,
      invitation_type = ?, invitation_url = ?, invitation_pdf_url = ?, invitation_pdf_filename = ?,
      dress_code = ?, no_children = ?, event_type = ?,
      has_whatsapp_rsvp = ?, has_layout_2d = ?, whatsapp_sending_blocked = ?, allow_novios_rsvp = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name || wedding.name,
    partner_1_name !== undefined ? partner_1_name : wedding.partner_1_name,
    partner_2_name !== undefined ? partner_2_name : wedding.partner_2_name,
    wedding_date || wedding.wedding_date,
    ceremony_time ?? wedding.ceremony_time,
    reception_time ?? wedding.reception_time,
    ceremony_venue ?? wedding.ceremony_venue,
    reception_venue ?? wedding.reception_venue,
    estimated_guests !== undefined ? parseInt(estimated_guests, 10) : wedding.estimated_guests,
    status || wedding.status,
    notes ?? wedding.notes,
    package_type || wedding.package_type,
    floor_plan_url !== undefined ? floor_plan_url : wedding.floor_plan_url,
    invitation_type !== undefined ? invitation_type : (wedding.invitation_type || 'LINK'),
    invitation_url !== undefined ? invitation_url : wedding.invitation_url,
    invitation_pdf_url !== undefined ? invitation_pdf_url : wedding.invitation_pdf_url,
    invitation_pdf_filename !== undefined ? invitation_pdf_filename : wedding.invitation_pdf_filename,
    dress_code !== undefined ? dress_code : wedding.dress_code,
    no_children !== undefined ? (no_children ? 1 : 0) : (wedding.no_children || 0),
    event_type !== undefined ? event_type : (wedding.event_type || 'Boda Completa'),
    has_whatsapp_rsvp !== undefined ? (has_whatsapp_rsvp ? 1 : 0) : (wedding.has_whatsapp_rsvp || 0),
    has_layout_2d !== undefined ? (has_layout_2d ? 1 : 0) : (wedding.has_layout_2d || 0),
    whatsapp_sending_blocked !== undefined ? (whatsapp_sending_blocked ? 1 : 0) : (wedding.whatsapp_sending_blocked || 0),
    allow_novios_rsvp !== undefined
      ? (allow_novios_rsvp === null ? null : (allow_novios_rsvp ? 1 : 0))
      : (wedding.allow_novios_rsvp ?? null),
    now,
    weddingId
  );

  logAudit(weddingId, user.id, user.name, 'ACTUALIZAR_BODA', 'WEDDING', weddingId, `Actualización de datos operativos de la boda`);

  const updatedWedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  return res.json({ message: 'Boda actualizada correctamente.', updated_at: now, wedding: updatedWedding });
});

// PUT /api/weddings/:weddingId/whatsapp-lock - Bloquear o desbloquear envíos de WhatsApp y recordatorios (Modo Seguro)
router.put('/:weddingId/whatsapp-lock', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { blocked } = req.body;
  const user = req.user!;
  
  if (user.role !== 'ADMINISTRADOR' && user.role !== 'COORDINADOR') {
    return res.status(403).json({ error: 'Solo administradores o coordinadores pueden cambiar el bloqueo de envíos.' });
  }

  const wedding = db.prepare('SELECT id, name FROM weddings WHERE id = ?').get(weddingId) as any;
  if (!wedding) {
    return res.status(404).json({ error: 'Boda no encontrada.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE weddings SET whatsapp_sending_blocked = ?, updated_at = ? WHERE id = ?').run(
    blocked ? 1 : 0,
    now,
    weddingId
  );

  const actionMsg = blocked
    ? 'Envíos de WhatsApp y recordatorios automáticos bloqueados (Modo Seguro activado)'
    : 'Envíos de WhatsApp y recordatorios automáticos desbloqueados';

  logAudit(weddingId, user.id, user.name, blocked ? 'BLOQUEAR_WHATSAPP' : 'DESBLOQUEAR_WHATSAPP', 'WEDDING', weddingId, actionMsg);

  const updatedWedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  return res.json({
    success: true,
    whatsapp_sending_blocked: Boolean(blocked),
    message: actionMsg,
    wedding: updatedWedding
  });
});

// POST /api/weddings/:weddingId/invitation-file - Subir archivo PDF de la invitación
router.post('/:weddingId/invitation-file', authenticateToken, requireWeddingAccess, (req, res, next) => {
  uploadInvitation.single('invitation_file')(req, res, err => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir archivo de invitación.' });
    }
    next();
  });
}, (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Debes seleccionar un archivo PDF para la invitación.' });
  }

  const now = new Date().toISOString();
  const pdfUrl = `/uploads/invitations/${file.filename}`;
  const originalFilename = file.originalname;

  db.prepare(`
    UPDATE weddings
    SET invitation_type = 'PDF',
        invitation_pdf_url = ?,
        invitation_pdf_filename = ?,
        updated_at = ?
    WHERE id = ?
  `).run(pdfUrl, originalFilename, now, weddingId);

  logAudit(weddingId, user.id, user.name, 'SUBIR_INVITACION_PDF', 'WEDDING', weddingId, `Invitación formal en PDF subida: ${originalFilename}`);

  const updated = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  return res.json({
    success: true,
    message: 'Invitación en PDF guardada exitosamente.',
    invitation_type: 'PDF',
    invitation_pdf_url: pdfUrl,
    invitation_pdf_filename: originalFilename,
    wedding: updated
  });
});

// DELETE /api/weddings/:weddingId/invitation-file - Eliminar archivo PDF de la invitación
router.delete('/:weddingId/invitation-file', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;

  const wedding = db.prepare('SELECT invitation_pdf_url FROM weddings WHERE id = ?').get(weddingId) as any;
  if (wedding?.invitation_pdf_url) {
    try {
      const filePath = path.resolve(process.cwd(), 'data', wedding.invitation_pdf_url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn('Error deleting old invitation file:', e);
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE weddings
    SET invitation_type = 'LINK',
        invitation_pdf_url = NULL,
        invitation_pdf_filename = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(now, weddingId);

  logAudit(weddingId, user.id, user.name, 'ELIMINAR_INVITACION_PDF', 'WEDDING', weddingId, `Invitación en PDF eliminada`);

  return res.json({ success: true, message: 'Invitación en PDF eliminada.' });
});

// POST /api/weddings/:weddingId/floor-plan-file - Subir plano base del lugar (PDF o Imagen)
router.post('/:weddingId/floor-plan-file', authenticateToken, requireWeddingAccess, (req, res, next) => {
  uploadFloorPlan.single('floor_plan_file')(req, res, err => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir archivo del plano base.' });
    }
    next();
  });
}, (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Debes seleccionar un archivo PDF o imagen para el plano base.' });
  }

  const now = new Date().toISOString();
  const floorPlanUrl = `/uploads/floorplans/${file.filename}`;
  const originalFilename = file.originalname;

  // Remove old file if it was a local uploaded floor plan
  const existing = db.prepare('SELECT floor_plan_url FROM weddings WHERE id = ?').get(weddingId) as any;
  if (existing?.floor_plan_url && existing.floor_plan_url.startsWith('/uploads/floorplans/')) {
    try {
      const oldPath = path.resolve(process.cwd(), 'data', existing.floor_plan_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (e) {
      console.warn('Error deleting old floor plan file:', e);
    }
  }

  db.prepare(`
    UPDATE weddings
    SET floor_plan_url = ?,
        updated_at = ?
    WHERE id = ?
  `).run(floorPlanUrl, now, weddingId);

  logAudit(weddingId, user.id, user.name, 'SUBIR_PLANO_BASE', 'WEDDING', weddingId, `Plano base del lugar subido: ${originalFilename}`);

  const updated = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  return res.json({
    success: true,
    message: 'Plano base guardado exitosamente.',
    floor_plan_url: floorPlanUrl,
    floor_plan_filename: originalFilename,
    wedding: updated
  });
});

// DELETE /api/weddings/:weddingId/floor-plan-file - Remover plano base
router.delete('/:weddingId/floor-plan-file', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;

  const existing = db.prepare('SELECT floor_plan_url FROM weddings WHERE id = ?').get(weddingId) as any;
  if (existing?.floor_plan_url && existing.floor_plan_url.startsWith('/uploads/floorplans/')) {
    try {
      const oldPath = path.resolve(process.cwd(), 'data', existing.floor_plan_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (e) {
      console.warn('Error deleting floor plan file:', e);
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE weddings
    SET floor_plan_url = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(now, weddingId);

  logAudit(weddingId, user.id, user.name, 'ELIMINAR_PLANO_BASE', 'WEDDING', weddingId, `Plano base removido`);

  const updated = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  return res.json({
    success: true,
    message: 'Plano base removido exitosamente.',
    wedding: updated
  });
});

// POST /api/weddings/:weddingId/team - Assign team member
router.post('/:weddingId/team', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { weddingId } = req.params;
  const { user_id, assigned_role } = req.body;

  if (!user_id || !assigned_role) {
    return res.status(400).json({ error: 'Usuario y rol son requeridos.' });
  }

  const existing = db.prepare('SELECT id FROM wedding_assignments WHERE wedding_id = ? AND user_id = ?').get(weddingId, user_id);
  if (existing) {
    return res.status(409).json({ error: 'El usuario ya está asignado a esta boda.' });
  }

  const id = 'asg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, weddingId, user_id, assigned_role, now);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ASIGNAR_EQUIPO', 'ASSIGNMENT', id, `Asignación de usuario ${user_id} como ${assigned_role}`);

  return res.status(201).json({ message: 'Miembro asignado exitosamente al equipo de la boda.' });
});

// PUT /api/weddings/:weddingId/team/:userId - Update assigned team member role & details
router.put('/:weddingId/team/:userId', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { weddingId, userId } = req.params;
  const { assigned_role, name, email, phone } = req.body;
  const now = new Date().toISOString();

  if (assigned_role) {
    db.prepare(`UPDATE wedding_assignments SET assigned_role = ? WHERE wedding_id = ? AND user_id = ?`).run(assigned_role, weddingId, userId);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (user && (name || email || phone !== undefined)) {
    db.prepare(`UPDATE users SET name = ?, email = ?, phone = ?, updated_at = ? WHERE id = ?`).run(
      name ? name.trim() : user.name,
      email ? email.toLowerCase().trim() : user.email,
      phone !== undefined ? phone : user.phone,
      now,
      userId
    );
  }

  logAudit(weddingId, req.user!.id, req.user!.name, 'EDITAR_EQUIPO', 'ASSIGNMENT', userId, `Actualización de miembro de equipo ${name || userId}`);
  return res.json({ message: 'Miembro del equipo actualizado correctamente.' });
});

// DELETE /api/weddings/:weddingId/team/:userId - Unassign team member
router.delete('/:weddingId/team/:userId', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { weddingId, userId } = req.params;

  db.prepare(`DELETE FROM wedding_assignments WHERE wedding_id = ? AND user_id = ?`).run(weddingId, userId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'DESASIGNAR_EQUIPO', 'ASSIGNMENT', userId, `Remoción de usuario ${userId} del equipo`);

  return res.json({ message: 'Usuario removido del equipo de la boda.' });
});

// DELETE /api/weddings/:weddingId - Delete wedding (Admin only)
router.delete('/:weddingId', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { weddingId } = req.params;
  const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  if (!wedding) {
    return res.status(404).json({ error: 'Boda no encontrada.' });
  }
  db.prepare('DELETE FROM weddings WHERE id = ?').run(weddingId);
  logAudit(null, req.user!.id, req.user!.name, 'ELIMINAR_BODA', 'WEDDING', weddingId, `Eliminación de la boda ${wedding.name}`);
  return res.json({ message: 'Boda eliminada correctamente.' });
});

// POST /api/weddings/:weddingId/cover-photo - Subir foto de portada personalizada
router.post('/:weddingId/cover-photo', authenticateToken, requireWeddingAccess, uploadCover.single('cover_photo'), (req, res) => {
  const { weddingId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No se subió ningún archivo de imagen.' });
  }

  const coverUrl = `/uploads/covers/${file.filename}`;

  db.prepare(`
    UPDATE weddings
    SET cover_photo_url = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(coverUrl, weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ACTUALIZAR_PORTADA', 'WEDDING', weddingId, 'Actualización de foto de portada de la boda');

  return res.json({ success: true, cover_photo_url: coverUrl });
});

// DELETE /api/weddings/:weddingId/cover-photo - Restablecer foto de portada predeterminada
router.delete('/:weddingId/cover-photo', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  db.prepare(`
    UPDATE weddings
    SET cover_photo_url = NULL, cover_photo_position = 'center 50%', updated_at = datetime('now')
    WHERE id = ?
  `).run(weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ELIMINAR_PORTADA', 'WEDDING', weddingId, 'Restablecimiento de foto de portada predeterminada');

  return res.json({ success: true });
});

// PUT /api/weddings/:weddingId/cover-position - Guardar encuadre / posición de la foto de portada
router.put('/:weddingId/cover-position', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { cover_photo_position } = req.body;

  if (!cover_photo_position) {
    return res.status(400).json({ error: 'Posición de encuadre requerida.' });
  }

  db.prepare(`
    UPDATE weddings
    SET cover_photo_position = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(cover_photo_position, weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ACTUALIZAR_ENCUADRE_PORTADA', 'WEDDING', weddingId, `Ajuste de encuadre a ${cover_photo_position}`);

  return res.json({ success: true, cover_photo_position });
});

// GET /api/weddings/:weddingId/novios-studio - Cargar estado completo de Nuevo Lazo + hidratación real desde DB
router.get('/:weddingId/novios-studio', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  if (!wedding) {
    return res.status(404).json({ error: 'Boda no encontrada.' });
  }

  let studio: any = null;
  try {
    const parsed = wedding.novios_studio_json ? JSON.parse(wedding.novios_studio_json) : null;
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0 && parsed.profile) {
      // Always keep authoritative CRM date, event type & couple/event names in sync with weddings table
      const isNonWedding = Boolean(wedding.event_type && !String(wedding.event_type).toLowerCase().includes('boda'));
      studio = {
        ...parsed,
        profile: {
          ...parsed.profile,
          partner1: wedding.partner_1_name || parsed.profile.partner1,
          partner2: isNonWedding ? (wedding.partner_2_name || '') : (wedding.partner_2_name || parsed.profile.partner2),
          eventType: wedding.event_type || parsed.profile.eventType || 'Boda Completa',
          eventName: wedding.name || parsed.profile.eventName,
          weddingDate: wedding.wedding_date || parsed.profile.weddingDate,
          city: parsed.profile.city || wedding.reception_venue || wedding.ceremony_venue || '',
          estimatedGuests: Number(wedding.estimated_guests) || parsed.profile.estimatedGuests || 120
        }
      };
    }
  } catch {
    studio = null;
  }

  // Hydrate ALL real DB records using the exact SQLite schema table names
  let guests: any[] = [];
  let tables: any[] = [];
  let layoutElements: any[] = [];
  let vendors: any[] = [];
  let payments: any[] = [];
  let tasks: any[] = [];
  let timeline: any[] = [];
  let civil: any = null;
  let religious: any = null;
  let documents: any[] = [];

  try { guests = db.prepare('SELECT * FROM guests WHERE wedding_id = ? ORDER BY created_at DESC').all(weddingId) as any[]; } catch (e) { console.error('hydrate guests err:', e); }
  try { tables = db.prepare('SELECT * FROM tables WHERE wedding_id = ? ORDER BY created_at ASC').all(weddingId) as any[]; } catch (e) { console.error('hydrate tables err:', e); }
  try { layoutElements = db.prepare('SELECT * FROM layout_elements WHERE wedding_id = ? ORDER BY created_at ASC').all(weddingId) as any[]; } catch (e) { console.error('hydrate layout_elements err:', e); }
  try { vendors = db.prepare('SELECT * FROM vendors WHERE wedding_id = ? ORDER BY created_at DESC').all(weddingId) as any[]; } catch (e) { console.error('hydrate vendors err:', e); }
  try { payments = db.prepare('SELECT * FROM payments WHERE wedding_id = ? ORDER BY payment_date DESC').all(weddingId) as any[]; } catch (e) { console.error('hydrate payments err:', e); }
  try { tasks = db.prepare('SELECT * FROM tasks WHERE wedding_id = ? ORDER BY due_date ASC').all(weddingId) as any[]; } catch (e) { console.error('hydrate tasks err:', e); }
  try { timeline = db.prepare('SELECT * FROM timeline_events WHERE wedding_id = ? ORDER BY order_index ASC, time ASC').all(weddingId) as any[]; } catch (e) { console.error('hydrate timeline err:', e); }
  try { civil = db.prepare('SELECT * FROM civil_ceremony WHERE wedding_id = ?').get(weddingId) as any; } catch (e) { console.error('hydrate civil err:', e); }
  try { religious = db.prepare('SELECT * FROM religious_ceremony WHERE wedding_id = ?').get(weddingId) as any; } catch (e) { console.error('hydrate religious err:', e); }
  try { documents = db.prepare('SELECT * FROM documents WHERE wedding_id = ? ORDER BY created_at DESC').all(weddingId) as any[]; } catch (e) { console.error('hydrate documents err:', e); }

  return res.json({
    studio,
    wedding: {
      id: wedding.id,
      name: wedding.name,
      partner_1_name: wedding.partner_1_name,
      partner_2_name: wedding.partner_2_name,
      wedding_date: wedding.wedding_date,
      reception_venue: wedding.reception_venue,
      ceremony_venue: wedding.ceremony_venue,
      budget_estimated: wedding.budget_estimated,
      estimated_guests: wedding.estimated_guests,
      cover_photo_url: wedding.cover_photo_url,
      cover_photo_position: wedding.cover_photo_position,
      package_type: wedding.package_type,
      event_type: wedding.event_type,
      has_whatsapp_rsvp: Boolean(wedding.has_whatsapp_rsvp),
      has_layout_2d: Boolean(wedding.has_layout_2d)
    },
    seedFromDb: {
      guests,
      tables,
      layoutElements,
      vendors,
      payments,
      tasks,
      timeline,
      civil,
      religious,
      documents
    }
  });
});

// PUT /api/weddings/:weddingId/novios-studio - Sincronización bidireccional real con las tablas SQLite + extras de Nuevo Lazo
router.put('/:weddingId/novios-studio', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { studio } = req.body;

  if (!studio || typeof studio !== 'object') {
    return res.status(400).json({ error: 'Estado de estudio requerido.' });
  }

  const now = new Date().toISOString();

  try {
    // 1. Save UI extras (style, quotes, contributions, coverPhoto, budgetGoal) in novios_studio_json
    const serialized = JSON.stringify(studio);
    db.prepare(`
      UPDATE weddings
      SET novios_studio_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(serialized, weddingId);

    // 2. Sync ALL operational data bidirectionally into the real SQLite tables inside a single transaction
    db.exec('BEGIN');
    try {
      // 2a. Wedding core profile columns
      if (studio.profile) {
        const p = studio.profile;
        const updates: string[] = [];
        const params: any[] = [];
        if (typeof p.partner1 === 'string' && p.partner1.trim()) {
          updates.push('partner_1_name = ?');
          params.push(p.partner1.trim());
        }
        if (typeof p.partner2 === 'string') {
          updates.push('partner_2_name = ?');
          params.push(p.partner2.trim());
        }
        if (typeof p.partner1 === 'string' && p.partner1.trim()) {
          const p2Clean = typeof p.partner2 === 'string' ? p.partner2.trim() : '';
          updates.push('name = ?');
          params.push(p2Clean ? `${p.partner1.trim()} & ${p2Clean}` : p.partner1.trim());
        }
        if (typeof p.weddingDate === 'string' && p.weddingDate.trim()) {
          updates.push('wedding_date = ?');
          params.push(p.weddingDate.trim());
        }
        if (typeof p.city === 'string') {
          updates.push('reception_venue = ?');
          params.push(p.city.trim());
        }
        if (typeof p.estimatedGuests === 'number' && p.estimatedGuests > 0) {
          updates.push('estimated_guests = ?');
          params.push(Math.round(p.estimatedGuests));
        }
        if (typeof p.coverPositionY === 'number') {
          updates.push('cover_photo_position = ?');
          params.push(`center ${p.coverPositionY}%`);
        }
        if (updates.length > 0) {
          params.push(weddingId);
          try {
            db.prepare(`UPDATE weddings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
          } catch {}
        }
      }

      // 2b. Tables (upsert + delete removed)
      if (Array.isArray(studio.tables)) {
        const existingIds = new Set(
          (db.prepare('SELECT id FROM tables WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const keepIds = new Set<string>();
        for (const t of studio.tables) {
          const id = String(t.id);
          keepIds.add(id);
          const typeVal = t.shape || 'Redonda';
          if (existingIds.has(id)) {
            db.prepare(`
              UPDATE tables SET name = ?, type = ?, capacity = ?, x = ?, y = ?, rotation = ?, updated_at = ?
              WHERE id = ? AND wedding_id = ?
            `).run(t.name || 'Mesa', typeVal, Number(t.capacity) || 10, Number(t.x) || 150, Number(t.y) || 150, Number(t.rotation) || 0, now, id, weddingId);
          } else {
            db.prepare(`
              INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, weddingId, t.name || 'Mesa', typeVal, Number(t.capacity) || 10, Number(t.x) || 150, Number(t.y) || 150, Number(t.rotation) || 0, now, now);
          }
        }
        for (const oldId of existingIds) {
          if (!keepIds.has(oldId)) {
            db.prepare('DELETE FROM tables WHERE id = ? AND wedding_id = ?').run(oldId, weddingId);
          }
        }
      }

      // 2c. Layout Elements (upsert + delete removed)
      if (Array.isArray(studio.floorElements)) {
        const existingIds = new Set(
          (db.prepare('SELECT id FROM layout_elements WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const keepIds = new Set<string>();
        for (const el of studio.floorElements) {
          const id = String(el.id);
          keepIds.add(id);
          if (existingIds.has(id)) {
            db.prepare(`
              UPDATE layout_elements SET name = ?, type = ?, x = ?, y = ?, width = ?, height = ?, rotation = ?, updated_at = ?
              WHERE id = ? AND wedding_id = ?
            `).run(el.label || 'Elemento', el.type || 'otro', Number(el.x) || 300, Number(el.y) || 250, Number(el.width) || 120, Number(el.height) || 50, Number(el.rotation) || 0, now, id, weddingId);
          } else {
            db.prepare(`
              INSERT INTO layout_elements (id, wedding_id, name, type, x, y, width, height, rotation, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, weddingId, el.label || 'Elemento', el.type || 'otro', Number(el.x) || 300, Number(el.y) || 250, Number(el.width) || 120, Number(el.height) || 50, Number(el.rotation) || 0, now, now);
          }
        }
        for (const oldId of existingIds) {
          if (!keepIds.has(oldId)) {
            db.prepare('DELETE FROM layout_elements WHERE id = ? AND wedding_id = ?').run(oldId, weddingId);
          }
        }
      }

      // 2d. Guests (lossless UPDATE for existing to preserve WhatsApp RSVP columns, INSERT for new, DELETE removed)
      if (Array.isArray(studio.guests)) {
        const validTableIds = new Set(
          (db.prepare('SELECT id FROM tables WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const existingIds = new Set(
          (db.prepare('SELECT id FROM guests WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const keepIds = new Set<string>();
        for (const g of studio.guests) {
          const id = String(g.id);
          keepIds.add(id);
          const parts = String(g.name || 'Invitado').trim().split(/\s+/);
          const fn = (g.firstName || parts[0] || 'Invitado').trim();
          const ln = (g.lastName ?? parts.slice(1).join(' ')).trim();
          const phone = String(g.phone || '').trim();
          const comp = Math.max(0, (Number(g.passes) || 1) - 1);
          const dbStatus =
            g.status === 'Confirmado'
              ? 'Confirmado'
              : g.status === 'No asistirá'
              ? 'No asistirá'
              : 'Pendiente de confirmar';
          const tableId = g.tableId && validTableIds.has(String(g.tableId)) ? String(g.tableId) : null;
          const obs = String(g.dietary || '').trim();

          if (existingIds.has(id)) {
            db.prepare(`
              UPDATE guests
              SET first_name = ?, last_name = ?, phone = ?, companion_count = ?, status = ?, table_id = ?, observations = ?, updated_at = ?
              WHERE id = ? AND wedding_id = ?
            `).run(fn, ln, phone, comp, dbStatus, tableId, obs, now, id, weddingId);
          } else {
            db.prepare(`
              INSERT INTO guests (id, wedding_id, first_name, last_name, phone, companion_count, status, table_id, observations, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, weddingId, fn, ln, phone, comp, dbStatus, tableId, obs, now, now);
          }
        }
        for (const oldId of existingIds) {
          if (!keepIds.has(oldId)) {
            db.prepare('DELETE FROM guests WHERE id = ? AND wedding_id = ?').run(oldId, weddingId);
          }
        }
      }

      // 2e. Vendors & Payments (lossless upsert + delete removed)
      if (Array.isArray(studio.vendors)) {
        const existingVendorIds = new Set(
          (db.prepare('SELECT id FROM vendors WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const existingPaymentIds = new Set(
          (db.prepare('SELECT id FROM payments WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const keepVendorIds = new Set<string>();
        const keepPaymentIds = new Set<string>();

        for (const v of studio.vendors) {
          const vid = String(v.id);
          const isVirtualOrphanBucket = vid === 'v_general_payments';
          if (!isVirtualOrphanBucket) {
            keepVendorIds.add(vid);
            if (existingVendorIds.has(vid)) {
              db.prepare(`
                UPDATE vendors
                SET name = ?, phone = ?, type = ?, costo_real = ?, payment_due_date = ?, notes = ?, updated_at = ?
                WHERE id = ? AND wedding_id = ?
              `).run(v.name || 'Proveedor', v.phone || '', v.category || 'Otro', Number(v.totalCost) || 0, v.nextDueDate || null, v.notes || '', now, vid, weddingId);
            } else {
              db.prepare(`
                INSERT INTO vendors (id, wedding_id, name, phone, type, locations, costo_real, payment_due_date, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(vid, weddingId, v.name || 'Proveedor', v.phone || '', v.category || 'Otro', '["Recepción"]', Number(v.totalCost) || 0, v.nextDueDate || null, v.notes || '', now, now);
            }
          }

          if (Array.isArray(v.payments)) {
            for (const pay of v.payments) {
              const pid = String(pay.id);
              keepPaymentIds.add(pid);
              const linkedVendorId = isVirtualOrphanBucket ? null : vid;
              if (existingPaymentIds.has(pid)) {
                db.prepare(`
                  UPDATE payments
                  SET vendor_id = ?, concept = ?, amount = ?, payment_date = ?, payment_method = ?, notes = ?, updated_at = ?
                  WHERE id = ? AND wedding_id = ?
                `).run(linkedVendorId, pay.concept || 'Abono', Number(pay.amount) || 0, pay.date || now.split('T')[0], pay.method || 'Transferencia', pay.notes || '', now, pid, weddingId);
              } else {
                db.prepare(`
                  INSERT INTO payments (id, wedding_id, vendor_id, concept, amount, payment_date, payment_method, notes, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(pid, weddingId, linkedVendorId, pay.concept || 'Abono', Number(pay.amount) || 0, pay.date || now.split('T')[0], pay.method || 'Transferencia', pay.notes || '', now, now);
              }
            }
          }
        }

        for (const oldPid of existingPaymentIds) {
          if (!keepPaymentIds.has(oldPid)) {
            db.prepare('DELETE FROM payments WHERE id = ? AND wedding_id = ?').run(oldPid, weddingId);
          }
        }
        for (const oldVid of existingVendorIds) {
          if (!keepVendorIds.has(oldVid)) {
            db.prepare('DELETE FROM vendors WHERE id = ? AND wedding_id = ?').run(oldVid, weddingId);
          }
        }
      }

      // 2f. Tasks / Checklist
      if (Array.isArray(studio.checklist)) {
        const existingTaskIds = new Set(
          (db.prepare('SELECT id FROM tasks WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const keepTaskIds = new Set<string>();
        for (const t of studio.checklist) {
          const tid = String(t.id);
          keepTaskIds.add(tid);
          const dbStatus = t.completed ? 'Completada' : 'Pendiente';
          if (existingTaskIds.has(tid)) {
            db.prepare(`
              UPDATE tasks SET title = ?, category = ?, responsible = ?, due_date = ?, status = ?, notes = ?, updated_at = ?
              WHERE id = ? AND wedding_id = ?
            `).run(t.title || 'Tarea', t.category || 'General', t.owner || 'Ambos', t.dueDate || null, dbStatus, t.notes || '', now, tid, weddingId);
          } else {
            db.prepare(`
              INSERT INTO tasks (id, wedding_id, title, category, responsible, due_date, priority, status, notes, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'Media', ?, ?, ?, ?)
            `).run(tid, weddingId, t.title || 'Tarea', t.category || 'General', t.owner || 'Ambos', t.dueDate || null, dbStatus, t.notes || '', now, now);
          }
        }
        for (const oldTid of existingTaskIds) {
          if (!keepTaskIds.has(oldTid)) {
            db.prepare('DELETE FROM tasks WHERE id = ? AND wedding_id = ?').run(oldTid, weddingId);
          }
        }
      }

      // 2g. Timeline Events
      if (Array.isArray(studio.timeline)) {
        const existingTlIds = new Set(
          (db.prepare('SELECT id FROM timeline_events WHERE wedding_id = ?').all(weddingId) as any[]).map(r => String(r.id))
        );
        const keepTlIds = new Set<string>();
        studio.timeline.forEach((ev: any, idx: number) => {
          const eid = String(ev.id);
          keepTlIds.add(eid);
          if (existingTlIds.has(eid)) {
            db.prepare(`
              UPDATE timeline_events SET time = ?, activity = ?, location = ?, notes = ?, order_index = ?, updated_at = ?
              WHERE id = ? AND wedding_id = ?
            `).run(ev.time || '18:00', ev.title || 'Momento', ev.location || '', ev.notes || '', idx, now, eid, weddingId);
          } else {
            db.prepare(`
              INSERT INTO timeline_events (id, wedding_id, time, activity, location, notes, order_index, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(eid, weddingId, ev.time || '18:00', ev.title || 'Momento', ev.location || '', ev.notes || '', idx, now, now);
          }
        });
        for (const oldEid of existingTlIds) {
          if (!keepTlIds.has(oldEid)) {
            db.prepare('DELETE FROM timeline_events WHERE id = ? AND wedding_id = ?').run(oldEid, weddingId);
          }
        }
      }

      // 2h. Civil & Religious Ceremonies
      if (studio.ceremonies) {
        const c = studio.ceremonies;
        const existingCivil = db.prepare('SELECT id FROM civil_ceremony WHERE wedding_id = ?').get(weddingId) as any;
        const witnessesJson = JSON.stringify(c.civilWitnessList || []);
        const civilReqsJson = JSON.stringify(c.civilRequirements || []);
        const civilSongsJson = JSON.stringify(c.civilMusicSongs || []);
        if (existingCivil) {
          db.prepare(`
            UPDATE civil_ceremony
            SET date = ?, time = ?, location = ?, juez_oficial = ?, witnesses = ?, requirements_status = ?, has_music = ?, music_songs = ?, notes = ?, updated_at = ?
            WHERE wedding_id = ?
          `).run(c.civilDate || '', c.civilTime || '', c.civilVenue || '', c.civilJudge || '', witnessesJson, civilReqsJson, c.civilHasMusic ? 1 : 0, civilSongsJson, c.civilNotes || '', now, weddingId);
        } else if (c.civilEnabled) {
          db.prepare(`
            INSERT INTO civil_ceremony (id, wedding_id, date, time, location, juez_oficial, witnesses, requirements_status, has_music, music_songs, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(`civ_${Date.now()}`, weddingId, c.civilDate || '', c.civilTime || '', c.civilVenue || '', c.civilJudge || '', witnessesJson, civilReqsJson, c.civilHasMusic ? 1 : 0, civilSongsJson, c.civilNotes || '', now);
        }

        const existingRel = db.prepare('SELECT id FROM religious_ceremony WHERE wedding_id = ?').get(weddingId) as any;
        const relSongsJson = JSON.stringify((c.religiousMusicList || []).map((m: any) => ({ id: m.id, moment: m.moment, song: m.title, artist: m.artist })));
        const relReadingsJson = JSON.stringify(c.religiousReadingsList || []);
        const relReqsJson = JSON.stringify(c.religiousRequirements || []);
        if (existingRel) {
          db.prepare(`
            UPDATE religious_ceremony
            SET date = ?, time = ?, temple_name = ?, officiant = ?, music_notes = ?, readings_notes = ?, requirements_status = ?, notes = ?, updated_at = ?
            WHERE wedding_id = ?
          `).run(c.religiousDate || '', c.religiousTime || '', c.religiousVenue || '', c.religiousOfficiant || '', relSongsJson, relReadingsJson, relReqsJson, c.religiousNotes || '', now, weddingId);
        } else if (c.religiousEnabled) {
          db.prepare(`
            INSERT INTO religious_ceremony (id, wedding_id, date, time, temple_name, officiant, music_notes, readings_notes, requirements_status, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(`rel_${Date.now()}`, weddingId, c.religiousDate || '', c.religiousTime || '', c.religiousVenue || '', c.religiousOfficiant || '', relSongsJson, relReadingsJson, relReqsJson, c.religiousNotes || '', now);
        }
      }
      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving novios-studio:', err);
    return res.status(500).json({ error: 'No se pudo guardar el estado de la boda.' });
  }
});

export default router;
