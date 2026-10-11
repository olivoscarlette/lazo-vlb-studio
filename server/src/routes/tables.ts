import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, check5DayTableLock, logAudit } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/tables - Get tables with assigned guests and layout elements
router.get('/:weddingId/tables', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  const tables = db.prepare('SELECT * FROM tables WHERE wedding_id = ? ORDER BY name ASC').all(weddingId) as any[];
  const elements = db.prepare('SELECT * FROM layout_elements WHERE wedding_id = ?').all(weddingId) as any[];

  // Attach guests assigned to each table, computing occupied places (guest + companions)
  for (const t of tables) {
    const assignedGuests = db.prepare(`
      SELECT id, first_name, last_name, phone, companion_count, status, observations
      FROM guests
      WHERE wedding_id = ? AND table_id = ?
    `).all(weddingId, t.id) as any[];

    let usedSeats = 0;
    for (const g of assignedGuests) {
      usedSeats += 1 + (g.companion_count || 0);
    }

    t.guests = assignedGuests;
    t.used_seats = usedSeats;
    t.available_seats = Math.max(0, t.capacity - usedSeats);
    t.is_overcapacity = usedSeats > t.capacity;
  }

  // Also calculate total unassigned guests who are confirmed or pending
  const unassigned = db.prepare(`
    SELECT id, first_name, last_name, phone, companion_count, status, observations
    FROM guests
    WHERE wedding_id = ? AND table_id IS NULL AND status != 'No asistirá'
    ORDER BY first_name ASC
  `).all(weddingId) as any[];

  return res.json({
    tables,
    elements,
    unassignedGuests: unassigned
  });
});

// POST /api/weddings/:weddingId/tables - Add table
router.post('/:weddingId/tables', authenticateToken, requireWeddingAccess, check5DayTableLock, (req, res) => {
  const { weddingId } = req.params;
  const { name, type, capacity, x, y, rotation } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Nombre y tipo de mesa son obligatorios.' });
  }

  const id = 'tbl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const cap = Math.max(1, parseInt(capacity, 10) || (type === 'imperial' ? 14 : 10));

  db.prepare(`
    INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, weddingId, name.trim(), type, cap, x ?? 150, y ?? 150, rotation ?? 0, now, now);

  logAudit(weddingId, req.user!.id, req.user!.name, 'CREAR_MESA', 'TABLE', id, `Creación de ${name} (${type}, capacidad ${cap})`);

  return res.status(201).json({
    message: 'Mesa creada exitosamente.',
    table: { id, wedding_id: weddingId, name, type, capacity: cap, x: x ?? 150, y: y ?? 150, rotation: rotation ?? 0, guests: [], used_seats: 0, available_seats: cap }
  });
});

// PUT /api/weddings/:weddingId/tables/:tableId - Update table (position, rotation, capacity, name)
router.put('/:weddingId/tables/:tableId', authenticateToken, requireWeddingAccess, check5DayTableLock, (req, res) => {
  const { weddingId, tableId } = req.params;
  const { name, type, capacity, x, y, rotation } = req.body;

  const table = db.prepare('SELECT * FROM tables WHERE id = ? AND wedding_id = ?').get(tableId, weddingId) as any;
  if (!table) {
    return res.status(404).json({ error: 'Mesa no encontrada.' });
  }

  const now = new Date().toISOString();
  const cap = capacity !== undefined ? Math.max(1, parseInt(capacity, 10)) : table.capacity;

  db.prepare(`
    UPDATE tables SET
      name = ?, type = ?, capacity = ?, x = ?, y = ?, rotation = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(
    name || table.name,
    type || table.type,
    cap,
    x !== undefined ? x : table.x,
    y !== undefined ? y : table.y,
    rotation !== undefined ? rotation : table.rotation,
    now,
    tableId,
    weddingId
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'ACTUALIZAR_MESA', 'TABLE', tableId, `Actualización de mesa ${name || table.name}`);

  return res.json({ message: 'Mesa actualizada correctamente.' });
});

// DELETE /api/weddings/:weddingId/tables/:tableId - Delete table
router.delete('/:weddingId/tables/:tableId', authenticateToken, requireWeddingAccess, check5DayTableLock, (req, res) => {
  const { weddingId, tableId } = req.params;

  const table = db.prepare('SELECT name FROM tables WHERE id = ? AND wedding_id = ?').get(tableId, weddingId) as any;
  if (!table) {
    return res.status(404).json({ error: 'Mesa no encontrada.' });
  }

  // Unassign guests
  db.prepare('UPDATE guests SET table_id = NULL WHERE table_id = ? AND wedding_id = ?').run(tableId, weddingId);
  db.prepare('DELETE FROM tables WHERE id = ? AND wedding_id = ?').run(tableId, weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ELIMINAR_MESA', 'TABLE', tableId, `Eliminación de mesa ${table.name}`);

  return res.json({ message: 'Mesa eliminada y lugares liberados.' });
});

// POST /api/weddings/:weddingId/tables/elements - Add layout element (dance floor, stage, etc.)
router.post('/:weddingId/tables/elements', authenticateToken, requireWeddingAccess, check5DayTableLock, (req, res) => {
  const { weddingId } = req.params;
  const { name, type, x, y, width, height, rotation } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Nombre y tipo de elemento son obligatorios.' });
  }

  const id = 'elt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO layout_elements (id, wedding_id, name, type, x, y, width, height, rotation, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, weddingId, name.trim(), type, x ?? 250, y ?? 250, width ?? 150, height ?? 150, rotation ?? 0, now, now);

  logAudit(weddingId, req.user!.id, req.user!.name, 'CREAR_ELEMENTO_LAYOUT', 'LAYOUT_ELEMENT', id, `Creación de elemento ${name}`);

  return res.status(201).json({
    message: 'Elemento añadido al layout.',
    element: { id, wedding_id: weddingId, name, type, x: x ?? 250, y: y ?? 250, width: width ?? 150, height: height ?? 150, rotation: rotation ?? 0 }
  });
});

// PUT /api/weddings/:weddingId/tables/elements/:elementId - Update layout element
router.put('/:weddingId/tables/elements/:elementId', authenticateToken, requireWeddingAccess, check5DayTableLock, (req, res) => {
  const { weddingId, elementId } = req.params;
  const { name, type, x, y, width, height, rotation } = req.body;

  const element = db.prepare('SELECT * FROM layout_elements WHERE id = ? AND wedding_id = ?').get(elementId, weddingId) as any;
  if (!element) {
    return res.status(404).json({ error: 'Elemento no encontrado.' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE layout_elements SET
      name = ?, type = ?, x = ?, y = ?, width = ?, height = ?, rotation = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(
    name || element.name,
    type || element.type,
    x !== undefined ? x : element.x,
    y !== undefined ? y : element.y,
    width !== undefined ? width : element.width,
    height !== undefined ? height : element.height,
    rotation !== undefined ? rotation : element.rotation,
    now,
    elementId,
    weddingId
  );

  return res.json({ message: 'Elemento actualizado correctamente.' });
});

// DELETE /api/weddings/:weddingId/tables/elements/:elementId - Delete layout element
router.delete('/:weddingId/tables/elements/:elementId', authenticateToken, requireWeddingAccess, check5DayTableLock, (req, res) => {
  const { weddingId, elementId } = req.params;

  db.prepare('DELETE FROM layout_elements WHERE id = ? AND wedding_id = ?').run(elementId, weddingId);

  return res.json({ message: 'Elemento eliminado del plano.' });
});

// Layout Versions: GET & POST
router.get('/:weddingId/tables/versions', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const versions = db.prepare('SELECT id, name, created_by, created_at FROM layout_versions WHERE wedding_id = ? ORDER BY created_at DESC').all(weddingId);
  return res.json({ versions });
});

router.post('/:weddingId/tables/versions', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nombre de la versión es requerido.' });
  }

  const tables = db.prepare('SELECT * FROM tables WHERE wedding_id = ?').all(weddingId);
  const elements = db.prepare('SELECT * FROM layout_elements WHERE wedding_id = ?').all(weddingId);

  const snapshot = { tables, elements };
  const id = 'ver_' + Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO layout_versions (id, wedding_id, name, snapshot_json, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, weddingId, name.trim(), JSON.stringify(snapshot), req.user!.name, now);

  logAudit(weddingId, req.user!.id, req.user!.name, 'GUARDAR_VERSION_LAYOUT', 'LAYOUT', id, `Guardado de versión de layout: ${name}`);

  return res.status(201).json({ message: 'Versión del layout guardada exitosamente.', version: { id, name, created_at: now } });
});

// Restore Layout Version
router.post('/:weddingId/tables/versions/:versionId/restore', authenticateToken, requireWeddingAccess, check5DayTableLock, (req, res) => {
  const { weddingId, versionId } = req.params;

  const version = db.prepare('SELECT * FROM layout_versions WHERE id = ? AND wedding_id = ?').get(versionId, weddingId) as any;
  if (!version) {
    return res.status(404).json({ error: 'Versión no encontrada.' });
  }

  const snapshot = JSON.parse(version.snapshot_json);
  const now = new Date().toISOString();

  try {
    db.exec('BEGIN TRANSACTION;');
    // Delete existing tables & elements
    db.prepare('DELETE FROM layout_elements WHERE wedding_id = ?').run(weddingId);
    db.prepare('DELETE FROM tables WHERE wedding_id = ?').run(weddingId);

    // Reinsert tables
    const insertTable = db.prepare(`
      INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of snapshot.tables) {
      insertTable.run(t.id, weddingId, t.name, t.type, t.capacity, t.x, t.y, t.rotation, now, now);
    }

    // Reinsert elements
    const insertElt = db.prepare(`
      INSERT INTO layout_elements (id, wedding_id, name, type, x, y, width, height, rotation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const e of snapshot.elements) {
      insertElt.run(e.id, weddingId, e.name, e.type, e.x, e.y, e.width, e.height, e.rotation, now, now);
    }

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ error: 'Error al restaurar versión: ' + err.message });
  }

  logAudit(weddingId, req.user!.id, req.user!.name, 'RESTAURAR_VERSION_LAYOUT', 'LAYOUT', versionId, `Restauración de versión ${version.name}`);

  return res.json({ message: `Layout restaurado exitosamente a la versión "${version.name}".` });
});

export default router;
