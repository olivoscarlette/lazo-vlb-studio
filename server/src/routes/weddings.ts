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
      has_whatsapp_rsvp, has_layout_2d, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLANNING', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, slug, p1, p2, wedding_date,
    ceremony_time || null, reception_time || null, ceremony_venue || null, reception_venue || null,
    estimated_guests ? parseInt(estimated_guests, 10) : 0, notes || null, package_type || 'Integral', event_type || 'Boda Completa',
    has_whatsapp_rsvp ? 1 : 0, has_layout_2d ? 1 : 0, now, now
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
    has_whatsapp_rsvp, has_layout_2d,
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
      has_whatsapp_rsvp = ?, has_layout_2d = ?, updated_at = ?
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
    now,
    weddingId
  );

  logAudit(weddingId, user.id, user.name, 'ACTUALIZAR_BODA', 'WEDDING', weddingId, `Actualización de datos operativos de la boda`);

  const updatedWedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  return res.json({ message: 'Boda actualizada correctamente.', updated_at: now, wedding: updatedWedding });
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

export default router;
