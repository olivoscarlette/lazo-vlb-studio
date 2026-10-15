import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/civil - Get civil ceremony details and automatically reused vendors
router.get('/:weddingId/civil', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  let civil = db.prepare('SELECT * FROM civil_ceremony WHERE wedding_id = ?').get(weddingId) as any;
  if (!civil) {
    const wedding = db.prepare('SELECT wedding_date FROM weddings WHERE id = ?').get(weddingId) as any;
    const now = new Date().toISOString();
    civil = {
      id: 'civ_' + weddingId,
      wedding_id: weddingId,
      date: wedding?.wedding_date || null,
      time: null,
      location: null,
      juez_oficial: null,
      witnesses: JSON.stringify([]),
      requirements_status: JSON.stringify([]),
      has_music: 0,
      music_songs: JSON.stringify([]),
      notes: null
    };
    db.prepare(`
      INSERT INTO civil_ceremony (id, wedding_id, date, time, location, juez_oficial, witnesses, requirements_status, has_music, music_songs, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(civil.id, weddingId, civil.date, null, null, null, civil.witnesses, civil.requirements_status, 0, civil.music_songs, null, now);
  }

  try {
    civil.witnesses = JSON.parse(civil.witnesses || '[]');
  } catch {
    civil.witnesses = [];
  }

  try {
    civil.requirements_status = JSON.parse(civil.requirements_status || '[]');
  } catch {
    civil.requirements_status = [];
  }

  try {
    civil.music_songs = JSON.parse(civil.music_songs || '[]');
  } catch {
    civil.music_songs = [];
  }
  civil.has_music = Boolean(civil.has_music);

  // AUTOMATIC VENDOR REUSE: Fetch vendors that participate in 'CIVIL'
  const vendors = db.prepare(`
    SELECT id, name, phone, type, locations, costo_real, contact_person, notes
    FROM vendors
    WHERE wedding_id = ?
  `).all(weddingId) as any[];

  const civilVendors = vendors.filter(v => {
    try {
      const locs = JSON.parse(v.locations);
      return Array.isArray(locs) && locs.includes('CIVIL');
    } catch {
      return false;
    }
  });

  return res.json({
    civil,
    reusedVendors: civilVendors
  });
});

// PUT /api/weddings/:weddingId/civil - Update civil ceremony details
router.put('/:weddingId/civil', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { date, time, location, juez_oficial, witnesses, requirements_status, has_music, music_songs, notes } = req.body;
  const now = new Date().toISOString();

  const witnessJson = JSON.stringify(Array.isArray(witnesses) ? witnesses : []);
  const reqJson = JSON.stringify(Array.isArray(requirements_status) ? requirements_status : []);
  const songsJson = JSON.stringify(Array.isArray(music_songs) ? music_songs : []);
  const hasMusicInt = has_music ? 1 : 0;

  db.prepare(`
    INSERT INTO civil_ceremony (id, wedding_id, date, time, location, juez_oficial, witnesses, requirements_status, has_music, music_songs, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(wedding_id) DO UPDATE SET
      date = excluded.date,
      time = excluded.time,
      location = excluded.location,
      juez_oficial = excluded.juez_oficial,
      witnesses = excluded.witnesses,
      requirements_status = excluded.requirements_status,
      has_music = excluded.has_music,
      music_songs = excluded.music_songs,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    'civ_' + weddingId, weddingId, date || null, time || null, location || null,
    juez_oficial || null, witnessJson, reqJson, hasMusicInt, songsJson, notes || null, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'ACTUALIZAR_CIVIL', 'CEREMONY_CIVIL', weddingId, 'Actualización de datos, testigos y música de Ceremonia Civil');

  return res.json({ message: 'Información de ceremonia civil guardada correctamente.' });
});

// GET /api/weddings/:weddingId/religious - Get religious ceremony details and automatically reused vendors
router.get('/:weddingId/religious', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  let religious = db.prepare('SELECT * FROM religious_ceremony WHERE wedding_id = ?').get(weddingId) as any;
  if (!religious) {
    const wedding = db.prepare('SELECT wedding_date FROM weddings WHERE id = ?').get(weddingId) as any;
    const now = new Date().toISOString();
    religious = {
      id: 'rel_' + weddingId,
      wedding_id: weddingId,
      date: wedding?.wedding_date || null,
      time: null,
      temple_name: null,
      officiant: null,
      music_notes: null,
      readings_notes: null,
      requirements_status: JSON.stringify([]),
      notes: null
    };
    db.prepare(`
      INSERT INTO religious_ceremony (id, wedding_id, date, time, temple_name, officiant, music_notes, readings_notes, requirements_status, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(religious.id, weddingId, religious.date, null, null, null, null, null, religious.requirements_status, null, now);
  }

  try {
    religious.requirements_status = JSON.parse(religious.requirements_status || '[]');
  } catch {
    religious.requirements_status = [];
  }

  // AUTOMATIC VENDOR REUSE: Fetch vendors that participate in 'IGLESIA'
  const vendors = db.prepare(`
    SELECT id, name, phone, type, locations, costo_real, contact_person, notes
    FROM vendors
    WHERE wedding_id = ?
  `).all(weddingId) as any[];

  const religiousVendors = vendors.filter(v => {
    try {
      const locs = JSON.parse(v.locations);
      return Array.isArray(locs) && locs.includes('IGLESIA');
    } catch {
      return false;
    }
  });

  return res.json({
    religious,
    reusedVendors: religiousVendors
  });
});

// PUT /api/weddings/:weddingId/religious - Update religious ceremony details
router.put('/:weddingId/religious', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { date, time, temple_name, officiant, music_notes, readings_notes, requirements_status, notes } = req.body;
  const now = new Date().toISOString();
  const reqJson = JSON.stringify(Array.isArray(requirements_status) ? requirements_status : []);

  db.prepare(`
    INSERT INTO religious_ceremony (id, wedding_id, date, time, temple_name, officiant, music_notes, readings_notes, requirements_status, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(wedding_id) DO UPDATE SET
      date = excluded.date,
      time = excluded.time,
      temple_name = excluded.temple_name,
      officiant = excluded.officiant,
      music_notes = excluded.music_notes,
      readings_notes = excluded.readings_notes,
      requirements_status = excluded.requirements_status,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    'rel_' + weddingId, weddingId, date || null, time || null, temple_name || null,
    officiant || null, music_notes || null, readings_notes || null, reqJson, notes || null, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'ACTUALIZAR_IGLESIA', 'CEREMONY_RELIGIOUS', weddingId, 'Actualización de datos de Ceremonia Religiosa');

  return res.json({ message: 'Información de ceremonia religiosa guardada correctamente.' });
});

export default router;
