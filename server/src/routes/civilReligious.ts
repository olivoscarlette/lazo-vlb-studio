import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

const SACRAMENT_ORDER = [
  'Entrada de novio y cortejo',
  'Entrada de la novia',
  'Rito del matrimonio',
  'Imposición de anillos, arras y lazo',
  'Ofertorio',
  'Comunión',
  'Entrega de ramo a la Virgen',
  'Firmas',
  'Salida de novios'
];

function sanitizeMusicNotes(raw: any): any {
  if (!raw || typeof raw !== 'string') return raw;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return raw;

    const normalize = (m: string) => {
      const c = (m || '').trim().toLowerCase();
      for (const s of SACRAMENT_ORDER) {
        if (c === s.toLowerCase()) return s;
      }
      if (c.includes('cortejo') || (c.includes('entrada') && c.includes('novio'))) return 'Entrada de novio y cortejo';
      if (c.includes('entrada') && c.includes('novia')) return 'Entrada de la novia';
      if (c.includes('rito') || c.includes('consentimiento')) return 'Rito del matrimonio';
      if (c.includes('anillo') || c.includes('arras') || c.includes('lazo')) return 'Imposición de anillos, arras y lazo';
      if (c.includes('ofertorio') || c.includes('dones')) return 'Ofertorio';
      if (c.includes('comunión') || c.includes('comunion')) return 'Comunión';
      if (c.includes('ramo') || c.includes('virgen')) return 'Entrega de ramo a la Virgen';
      if (c.includes('firma')) return 'Firmas';
      if (c.includes('salida')) return 'Salida de novios';
      return (m || '').trim();
    };

    const map = new Map<string, any>();
    for (const item of parsed) {
      const norm = normalize(item.moment);
      const key = norm.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item, moment: norm });
      } else {
        const hasReal = item.song && item.song.trim() && item.song.trim().toLowerCase() !== 'por definir';
        if (hasReal) {
          map.set(key, { ...existing, song: item.song });
        }
      }
    }

    const deduplicated = Array.from(map.values()).sort((a, b) => {
      const idxA = SACRAMENT_ORDER.findIndex(m => m.toLowerCase() === a.moment.toLowerCase());
      const idxB = SACRAMENT_ORDER.findIndex(m => m.toLowerCase() === b.moment.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.moment.localeCompare(b.moment);
    });

    return JSON.stringify(deduplicated);
  } catch {
    return raw;
  }
}

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

  if (religious && religious.music_notes) {
    religious.music_notes = sanitizeMusicNotes(religious.music_notes);
  }

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
  const cleanMusicNotes = sanitizeMusicNotes(music_notes);

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
    officiant || null, cleanMusicNotes || null, readings_notes || null, reqJson, notes || null, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'ACTUALIZAR_IGLESIA', 'CEREMONY_RELIGIOUS', weddingId, 'Actualización de datos de Ceremonia Religiosa');

  return res.json({ message: 'Información de ceremonia religiosa guardada correctamente.' });
});

export default router;
