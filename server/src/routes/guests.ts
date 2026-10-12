import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, check5DayTableLock, logAudit } from '../middleware/auth.js';
import * as XLSX from 'xlsx';

const router = Router();

// Helper to remove accents for search
function normalizeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// GET /api/weddings/:weddingId/guests
// Backend search, filter, sort, and pagination
router.get('/:weddingId/guests', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const search = ((req.query.search as string) || '').trim();
  const status = (req.query.status as string) || '';
  const priority = (req.query.priority as string) || '';
  const tableId = (req.query.tableId as string) || '';
  const sortBy = (req.query.sortBy as string) || 'alpha_asc';
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(5000, Math.max(10, parseInt(req.query.limit as string, 10) || 30));
  const offset = (page - 1) * limit;

  // Global counts for this wedding
  const counts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Confirmado' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'Pendiente de confirmar' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'No asistirá' THEN 1 ELSE 0 END) as declined,
      COALESCE(SUM(1 + companion_count), 0) as total_places_all,
      COALESCE(SUM(CASE WHEN status = 'Confirmado' THEN 1 + companion_count ELSE 0 END), 0) as confirmed_places,
      COALESCE(SUM(CASE WHEN status = 'Pendiente de confirmar' THEN 1 + companion_count ELSE 0 END), 0) as pending_places,
      COALESCE(SUM(CASE WHEN status = 'No asistirá' THEN 1 + companion_count ELSE 0 END), 0) as declined_places
    FROM guests
    WHERE wedding_id = ?
  `).get(weddingId) as any;

  // Query guests with optional table name
  let query = `
    SELECT
      g.id, g.wedding_id, g.first_name, g.last_name, g.phone,
      g.companion_count, COALESCE(g.priority, 'Media') as priority,
      g.status, g.table_id, g.observations,
      g.created_at, g.updated_at,
      t.name as table_name
    FROM guests g
    LEFT JOIN tables t ON t.id = g.table_id
    WHERE g.wedding_id = ?
  `;
  const params: any[] = [weddingId];

  if (status) {
    query += ` AND g.status = ?`;
    params.push(status);
  }

  if (priority) {
    query += ` AND COALESCE(g.priority, 'Media') = ?`;
    params.push(priority);
  }

  if (tableId === 'assigned') {
    query += ` AND g.table_id IS NOT NULL`;
  } else if (tableId === 'unassigned') {
    query += ` AND g.table_id IS NULL`;
  } else if (tableId) {
    query += ` AND g.table_id = ?`;
    params.push(tableId);
  }

  const allFiltered = db.prepare(query).all(...params) as any[];

  // Apply accent-insensitive search if search string is provided
  let filtered = allFiltered;
  if (search) {
    const cleanSearch = normalizeAccents(search);
    filtered = allFiltered.filter(g => {
      const full = normalizeAccents(`${g.first_name} ${g.last_name} ${g.phone}`);
      return full.includes(cleanSearch);
    });
  }

  // Sort guests by Priority or Alphabetical order
  const priorityRank: Record<string, number> = {
    'Alta': 3,
    'Media': 2,
    'Baja': 1
  };

  const compareAlphaFirst = (a: any, b: any) => {
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  };

  const compareAlphaLast = (a: any, b: any) => {
    const nameA = `${a.last_name || ''} ${a.first_name || ''}`.trim();
    const nameB = `${b.last_name || ''} ${b.first_name || ''}`.trim();
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  };

  filtered.sort((a, b) => {
    if (sortBy === 'priority_desc') {
      const diff = (priorityRank[b.priority || 'Media'] || 2) - (priorityRank[a.priority || 'Media'] || 2);
      if (diff !== 0) return diff;
      return compareAlphaFirst(a, b);
    }
    if (sortBy === 'priority_asc') {
      const diff = (priorityRank[a.priority || 'Media'] || 2) - (priorityRank[b.priority || 'Media'] || 2);
      if (diff !== 0) return diff;
      return compareAlphaFirst(a, b);
    }
    if (sortBy === 'alpha_asc') {
      return compareAlphaFirst(a, b);
    }
    if (sortBy === 'alpha_desc') {
      return compareAlphaFirst(b, a);
    }
    if (sortBy === 'lastname_asc') {
      return compareAlphaLast(a, b);
    }
    if (sortBy === 'lastname_desc') {
      return compareAlphaLast(b, a);
    }
    return 0;
  });

  const totalFiltered = filtered.length;
  const paginatedGuests = filtered.slice(offset, offset + limit);

  return res.json({
    guests: paginatedGuests,
    pagination: {
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit)
    },
    summary: {
      total: counts.total || 0,
      confirmed: counts.confirmed || 0,
      pending: counts.pending || 0,
      declined: counts.declined || 0,
      total_places_all: counts.total_places_all || 0,
      confirmed_places: counts.confirmed_places || 0,
      pending_places: counts.pending_places || 0,
      declined_places: counts.declined_places || 0
    }
  });
});

// POST /api/weddings/:weddingId/guests - Add single guest
router.post('/:weddingId/guests', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { first_name, last_name, phone, companion_count, priority, status, table_id, observations } = req.body;

  if (!first_name || !last_name || !phone) {
    return res.status(400).json({ error: 'Nombre, Apellido y WhatsApp / Teléfono son obligatorios.' });
  }

  const id = 'gst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const validStatus = status || 'Pendiente de confirmar';
  const validPriority = ['Alta', 'Media', 'Baja'].includes(priority) ? priority : 'Media';
  const compCount = Math.max(0, parseInt(companion_count, 10) || 0);

  // If status is 'No asistirá', table_id cannot be assigned
  const finalTableId = validStatus === 'No asistirá' ? null : (table_id || null);

  db.prepare(`
    INSERT INTO guests (id, wedding_id, first_name, last_name, phone, companion_count, priority, status, table_id, observations, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, weddingId, first_name.trim(), last_name.trim(), phone.trim(),
    compCount, validPriority, validStatus, finalTableId, observations ? observations.trim() : null, now, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'AGREGAR_INVITADO', 'GUEST', id, `Alta de invitado ${first_name} ${last_name}`);

  return res.status(201).json({
    message: 'Invitado registrado correctamente.',
    guest: { id, first_name, last_name, phone, companion_count: compCount, priority: validPriority, status: validStatus, table_id: finalTableId, observations }
  });
});

// PUT /api/weddings/:weddingId/guests/:guestId - Fast edit / inline status change
router.put('/:weddingId/guests/:guestId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, guestId } = req.params;
  const user = req.user!;

  const guest = db.prepare('SELECT * FROM guests WHERE id = ? AND wedding_id = ?').get(guestId, weddingId) as any;
  if (!guest) {
    return res.status(404).json({ error: 'Invitado no encontrado en esta boda.' });
  }

  const {
    first_name, last_name, phone, companion_count, priority,
    status, table_id, observations, expected_updated_at
  } = req.body;

  if (expected_updated_at && guest.updated_at !== expected_updated_at) {
    return res.status(409).json({
      error: 'Conflicto de concurrencia: El invitado fue modificado simultáneamente por otro usuario. Recarga la lista para ver el estado actual.',
      current_updated_at: guest.updated_at
    });
  }

  // Check 5-day table lock if table_id is explicitly changed by NOVIOS
  if (user.role === 'NOVIOS' && table_id !== undefined && table_id !== guest.table_id) {
    const wedding = db.prepare('SELECT wedding_date FROM weddings WHERE id = ?').get(weddingId) as any;
    if (wedding && wedding.wedding_date) {
      const weddingDate = new Date(wedding.wedding_date);
      const today = new Date();
      weddingDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 5) {
        return res.status(403).json({
          error: 'Bloqueo operativo: A 5 días o menos del evento, la asignación de mesas está bloqueada para los Novios.'
        });
      }
    }
  }

  const newStatus = status !== undefined ? status : guest.status;
  const newPriority = priority !== undefined && ['Alta', 'Media', 'Baja'].includes(priority) ? priority : (guest.priority || 'Media');
  let newTableId = table_id !== undefined ? table_id : guest.table_id;

  // RULE: If status changed to 'No asistirá', seats MUST be released (table_id = null)
  if (newStatus === 'No asistirá') {
    newTableId = null;
  }

  const newFirstName = first_name !== undefined ? first_name.trim() : guest.first_name;
  const newLastName = last_name !== undefined ? last_name.trim() : guest.last_name;
  const newPhone = phone !== undefined ? phone.trim() : guest.phone;
  const newCompCount = companion_count !== undefined ? Math.max(0, parseInt(companion_count, 10) || 0) : guest.companion_count;
  const newObs = observations !== undefined ? (observations ? observations.trim() : null) : guest.observations;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE guests SET
      first_name = ?, last_name = ?, phone = ?, companion_count = ?,
      priority = ?, status = ?, table_id = ?, observations = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(newFirstName, newLastName, newPhone, newCompCount, newPriority, newStatus, newTableId, newObs, now, guestId, weddingId);

  logAudit(weddingId, user.id, user.name, 'ACTUALIZAR_INVITADO', 'GUEST', guestId, `Actualización de ${newFirstName} ${newLastName} (Prioridad: ${newPriority}, Estatus: ${newStatus}, Mesa: ${newTableId || 'Ninguna'})`);

  return res.json({
    message: 'Invitado actualizado correctamente.',
    guest: {
      id: guestId,
      first_name: newFirstName,
      last_name: newLastName,
      phone: newPhone,
      companion_count: newCompCount,
      priority: newPriority,
      status: newStatus,
      table_id: newTableId,
      observations: newObs,
      updated_at: now
    }
  });
});

// DELETE /api/weddings/:weddingId/guests/:guestId - Remove guest
router.delete('/:weddingId/guests/:guestId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, guestId } = req.params;
  const guest = db.prepare('SELECT first_name, last_name FROM guests WHERE id = ? AND wedding_id = ?').get(guestId, weddingId) as any;
  if (!guest) {
    return res.status(404).json({ error: 'Invitado no encontrado.' });
  }

  db.prepare('DELETE FROM guests WHERE id = ? AND wedding_id = ?').run(guestId, weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ELIMINAR_INVITADO', 'GUEST', guestId, `Eliminación de invitado ${guest.first_name} ${guest.last_name}`);

  return res.json({ message: 'Invitado eliminado correctamente.' });
});

// GET /api/weddings/:weddingId/guests/template - Download updated Excel/CSV template
router.get('/:weddingId/guests/template', authenticateToken, requireWeddingAccess, (req, res) => {
  const templateData = [
    {
      'NOMBRE': 'María José',
      'APELLIDO': 'Fernández Silva',
      'WHATSAPP': '+52 55 1234 5678',
      'ACOMPAÑANTES': 1,
      'PRIORIDAD': 'Alta',
      'ESTATUS': 'Pendiente de confirmar',
      'OBSERVACIONES': 'Familia cercana de la novia. Menú vegetariano.'
    },
    {
      'NOMBRE': 'Carlos',
      'APELLIDO': 'Mendoza Lozano',
      'WHATSAPP': '+52 33 9876 5432',
      'ACOMPAÑANTES': 0,
      'PRIORIDAD': 'Media',
      'ESTATUS': 'Confirmado',
      'OBSERVACIONES': 'Viaja desde Guadalajara.'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Invitados');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Invitados_LAZO_VLB.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});

// POST /api/weddings/:weddingId/guests/import - Import guests from Excel/CSV safely
router.post('/:weddingId/guests/import', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { guests } = req.body;

  if (!Array.isArray(guests) || guests.length === 0) {
    return res.status(400).json({ error: 'No se recibieron filas para importar o el formato es incorrecto.' });
  }

  const validRows: any[] = [];
  const errors: { row: number; error: string; data: any }[] = [];

  guests.forEach((row, index) => {
    const rowNum = index + 2; // considering header as row 1
    // Handle both uppercase headers and lowercase equivalents
    const firstName = (row['NOMBRE'] || row['Nombre'] || row['nombre'] || row['first_name'] || '').toString().trim();
    const lastName = (row['APELLIDO'] || row['Apellido'] || row['apellido'] || row['last_name'] || '').toString().trim();
    const phone = (row['WHATSAPP'] || row['Whatsapp'] || row['whatsapp'] || row['TELEFONO'] || row['phone'] || '').toString().trim();
    const companionsRaw = row['ACOMPAÑANTES'] ?? row['Acompañantes'] ?? row['acompañantes'] ?? row['companion_count'] ?? 0;
    const priorityRaw = (row['PRIORIDAD'] || row['Prioridad'] || row['prioridad'] || row['priority'] || 'Media').toString().trim();
    const statusRaw = (row['ESTATUS'] || row['Estatus'] || row['estatus'] || row['status'] || 'Pendiente de confirmar').toString().trim();
    const tableRaw = (row['MESA'] || row['Mesa'] || row['mesa'] || row['table'] || '').toString().trim();
    const observations = (row['OBSERVACIONES'] || row['Observaciones'] || row['observaciones'] || row['observations'] || '').toString().trim();

    if (!firstName) {
      errors.push({ row: rowNum, error: 'El campo NOMBRE es obligatorio.', data: row });
      return;
    }
    if (!lastName) {
      errors.push({ row: rowNum, error: 'El campo APELLIDO es obligatorio.', data: row });
      return;
    }
    if (!phone) {
      errors.push({ row: rowNum, error: 'El campo WHATSAPP / TELÉFONO es obligatorio.', data: row });
      return;
    }

    let companions = parseInt(companionsRaw, 10);
    if (isNaN(companions) || companions < 0) {
      companions = 0;
    }

    let priority = 'Media';
    const prioNorm = priorityRaw.toLowerCase();
    if (prioNorm.includes('alt') || prioNorm === '1' || prioNorm === 'a' || prioNorm.includes('vip')) {
      priority = 'Alta';
    } else if (prioNorm.includes('baj') || prioNorm === '3' || prioNorm === 'c') {
      priority = 'Baja';
    }

    let status = 'Pendiente de confirmar';
    const statusNorm = statusRaw.toLowerCase();
    if (statusNorm.includes('confirmad')) {
      status = 'Confirmado';
    } else if (statusNorm.includes('no') || statusNorm.includes('cancel')) {
      status = 'No asistirá';
    }

    validRows.push({
      first_name: firstName,
      last_name: lastName,
      phone,
      companion_count: companions,
      priority,
      status,
      table_name: status === 'No asistirá' ? '' : tableRaw,
      observations: observations || null
    });
  });

  if (validRows.length === 0) {
    return res.status(400).json({
      error: 'Ninguna fila pudo ser validada correctamente.',
      errors
    });
  }

  // Insert valid rows safely inside a transaction
  const now = new Date().toISOString();
  let insertedCount = 0;

  try {
    const existingTables = db.prepare('SELECT id, name FROM tables WHERE wedding_id = ?').all(weddingId) as { id: string; name: string }[];
    const tableMap = new Map<string, string>();
    existingTables.forEach(t => {
      tableMap.set(t.name.trim().toLowerCase(), t.id);
    });

    const insertTableStmt = db.prepare(`
      INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at)
      VALUES (?, ?, ?, 'circular', 10, ?, ?, 0, ?, ?)
    `);

    const insertStmt = db.prepare(`
      INSERT INTO guests (id, wedding_id, first_name, last_name, phone, companion_count, priority, status, table_id, observations, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    for (const g of validRows) {
      let resolvedTableId: string | null = null;
      if (g.table_name) {
        const rawName = /^\d+$/.test(g.table_name) ? `Mesa ${g.table_name}` : g.table_name;
        const key = rawName.toLowerCase();
        if (tableMap.has(key)) {
          resolvedTableId = tableMap.get(key)!;
        } else {
          // Check partial match (e.g. "Mesa 1" matches "Mesa 1 - Familia Novia")
          const partial = existingTables.find(t => t.name.toLowerCase().startsWith(key));
          if (partial) {
            resolvedTableId = partial.id;
            tableMap.set(key, partial.id);
          } else {
            const newTblId = 'tbl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            const idx = tableMap.size;
            insertTableStmt.run(newTblId, weddingId, rawName, 160 + (idx % 4) * 170, 220 + Math.floor(idx / 4) * 160, now, now);
            tableMap.set(key, newTblId);
            resolvedTableId = newTblId;
          }
        }
      }

      const id = 'gst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      insertStmt.run(id, weddingId, g.first_name, g.last_name, g.phone, g.companion_count, g.priority || 'Media', g.status, resolvedTableId, g.observations, now, now);
      insertedCount++;
    }
    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ error: 'Error al persistir la importación: ' + err.message });
  }

  logAudit(weddingId, req.user!.id, req.user!.name, 'IMPORTAR_INVITADOS', 'GUEST', null, `Importación exitosa de ${insertedCount} invitados vía archivo`);

  return res.json({
    message: `Se importaron ${insertedCount} invitados exitosamente.`,
    insertedCount,
    errorsCount: errors.length,
    errors
  });
});

export default router;
