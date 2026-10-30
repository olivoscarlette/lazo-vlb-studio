import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import { authenticateToken, requireRole, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/audit - Audit trail for a specific wedding
router.get('/weddings/:weddingId/audit', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  const logs = db.prepare(`
    SELECT * FROM audit_logs
    WHERE wedding_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(weddingId);

  return res.json({ logs });
});

// GET /api/admin/audit - Global audit trail for Admin
router.get('/admin/audit', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, w.name as wedding_name
    FROM audit_logs a
    LEFT JOIN weddings w ON w.id = a.wedding_id
    ORDER BY a.created_at DESC
    LIMIT 200
  `).all();

  return res.json({ logs });
});

// Notifications
router.get('/notifications', authenticateToken, (req, res) => {
  const user = req.user!;
  let notifs: any[] = [];

  if (user.role === 'ADMINISTRADOR') {
    notifs = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC LIMIT 30
    `).all(user.id);
  } else if (user.wedding_id) {
    notifs = db.prepare(`
      SELECT * FROM notifications
      WHERE (wedding_id = ? OR user_id = ?)
      ORDER BY created_at DESC LIMIT 30
    `).all(user.wedding_id, user.id);
  } else {
    notifs = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC LIMIT 30
    `).all(user.id);
  }

  return res.json({ notifications: notifs });
});

router.put('/notifications/:id/read', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  return res.json({ message: 'Notificación marcada como leída.' });
});

// Catalogs
router.get('/catalogs', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM catalogs').all() as any[];
  const catalogs: Record<string, any> = {};
  for (const r of rows) {
    try {
      catalogs[r.key] = JSON.parse(r.values_json);
    } catch {
      catalogs[r.key] = [];
    }
  }
  return res.json({ catalogs });
});

router.put('/catalogs/:key', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { key } = req.params;
  const { values } = req.body;

  if (!Array.isArray(values)) {
    return res.status(400).json({ error: 'Valores deben ser un arreglo.' });
  }

  db.prepare(`
    INSERT INTO catalogs (key, values_json)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET values_json = excluded.values_json
  `).run(key, JSON.stringify(values));

  logAudit(null, req.user!.id, req.user!.name, 'ACTUALIZAR_CATALOGO', 'CATALOG', key, `Actualización del catálogo ${key}`);

  return res.json({ message: 'Catálogo actualizado correctamente.' });
});

router.delete('/catalogs/master_checklist/task', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { title, category, updatedList } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Título es requerido.' });
  }

  // 1. Update catalog
  let list = updatedList;
  if (!Array.isArray(list)) {
    const row = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get('master_checklist') as any;
    const current = row ? JSON.parse(row.values_json) : [];
    list = current.filter((item: any) => !(item.title.trim().toLowerCase() === title.trim().toLowerCase() && (!category || (item.category || '').toLowerCase() === category.toLowerCase())));
  }

  db.prepare(`
    INSERT INTO catalogs (key, values_json)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET values_json = excluded.values_json
  `).run('master_checklist', JSON.stringify(list));

  // 2. Delete from tasks table where status = 'Pendiente' across all weddings
  let deletedFromWeddings = 0;
  if (category) {
    const info = db.prepare(`
      DELETE FROM tasks
      WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
        AND LOWER(TRIM(category)) = LOWER(TRIM(?))
        AND status = 'Pendiente'
    `).run(title, category);
    deletedFromWeddings = info.changes;
  } else {
    const info = db.prepare(`
      DELETE FROM tasks
      WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
        AND status = 'Pendiente'
    `).run(title);
    deletedFromWeddings = info.changes;
  }

  logAudit(null, req.user!.id, req.user!.name, 'ELIMINAR_ACTIVIDAD_PLANTILLA', 'CATALOG', 'master_checklist', `Eliminada actividad "${title}" de la plantilla y de ${deletedFromWeddings} tareas pendientes en eventos.`);

  return res.json({
    message: `Actividad eliminada de la plantilla y de ${deletedFromWeddings} tareas pendientes en eventos.`,
    deletedFromWeddings
  });
});

// Helper function to sync Master Templates (Checklist, Civil, Religious) to all weddings
function syncMasterTemplatesToAllWeddings() {
  const getCatalog = (key: string) => {
    try {
      const row = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get(key) as any;
      return row ? JSON.parse(row.values_json) : [];
    } catch {
      return [];
    }
  };

  const masterChecklist: { title: string; category: string; priority: string; responsible?: string }[] = getCatalog('master_checklist');
  const masterCivil: string[] = getCatalog('master_civil_requirements');
  const masterReligious: string[] = getCatalog('master_religious_requirements');

  const masterTaskKeys = new Set(masterChecklist.map(mt => `${(mt.category || 'Checklist General').toLowerCase()}::${(mt.title || '').trim().toLowerCase()}`));

  const weddings = db.prepare('SELECT id, wedding_date FROM weddings').all() as { id: string; wedding_date: string }[];
  const now = new Date().toISOString();

  let addedTasks = 0;
  let deletedTasks = 0;
  let addedCivilReqs = 0;
  let addedReligiousReqs = 0;

  for (const w of weddings) {
    // 1. Sync Checklist Tasks - Add missing
    const existingTasks = db.prepare('SELECT id, title, category, status FROM tasks WHERE wedding_id = ?').all(w.id) as { id: string; title: string; category: string; status: string }[];
    const existingTaskKeys = new Set(existingTasks.map(t => `${(t.category || '').toLowerCase()}::${t.title.trim().toLowerCase()}`));
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, wedding_id, title, category, responsible, due_date, priority, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '', ?, 'Pendiente', ?, ?, ?)
    `);

    masterChecklist.forEach((mt: any, idx) => {
      const cat = mt.category || 'Checklist General';
      const key = `${cat.toLowerCase()}::${(mt.title || '').trim().toLowerCase()}`;
      if (mt.title && !existingTaskKeys.has(key)) {
        insertTask.run(
          `tsk_sync_${w.id}_${Date.now()}_${idx}`,
          w.id,
          mt.title.trim(),
          cat,
          mt.responsible || '',
          mt.priority || 'Alta',
          mt.notes || '',
          now,
          now
        );
        existingTaskKeys.add(key);
        addedTasks++;
      }
    });

    // 1b. Prune pending tasks that were removed from master template
    for (const t of existingTasks) {
      if (t.status === 'Pendiente') {
        const key = `${(t.category || '').toLowerCase()}::${(t.title || '').trim().toLowerCase()}`;
        if (!masterTaskKeys.has(key)) {
          db.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
          deletedTasks++;
        }
      }
    }

    // 2. Sync Civil Requirements
    let civilRow = db.prepare('SELECT * FROM civil_ceremony WHERE wedding_id = ?').get(w.id) as any;
    let civilReqs: { id: string; title: string; completed: boolean }[] = [];
    if (civilRow) {
      try { civilReqs = JSON.parse(civilRow.requirements_status || '[]'); } catch { civilReqs = []; }
    }
    const existingCivilTitles = new Set(civilReqs.map(r => r.title.trim().toLowerCase()));
    let civilChanged = false;
    masterCivil.forEach((reqTitle, idx) => {
      if (reqTitle && !existingCivilTitles.has(reqTitle.trim().toLowerCase())) {
        civilReqs.push({
          id: `req_civ_${w.id}_${Date.now()}_${idx}`,
          title: reqTitle.trim(),
          completed: false
        });
        existingCivilTitles.add(reqTitle.trim().toLowerCase());
        civilChanged = true;
        addedCivilReqs++;
      }
    });
    if (civilChanged || !civilRow) {
      db.prepare(`
        INSERT INTO civil_ceremony (id, wedding_id, date, time, location, juez_oficial, witnesses, requirements_status, notes, updated_at)
        VALUES (?, ?, ?, NULL, NULL, NULL, '[]', ?, NULL, ?)
        ON CONFLICT(wedding_id) DO UPDATE SET
          requirements_status = excluded.requirements_status,
          updated_at = excluded.updated_at
      `).run('civ_' + w.id, w.id, w.wedding_date || null, JSON.stringify(civilReqs), now);
    }

    // 3. Sync Religious Requirements
    let relRow = db.prepare('SELECT * FROM religious_ceremony WHERE wedding_id = ?').get(w.id) as any;
    let relReqs: { id: string; title: string; completed: boolean }[] = [];
    if (relRow) {
      try { relReqs = JSON.parse(relRow.requirements_status || '[]'); } catch { relReqs = []; }
    }
    const existingRelTitles = new Set(relReqs.map(r => r.title.trim().toLowerCase()));
    let relChanged = false;
    masterReligious.forEach((reqTitle, idx) => {
      if (reqTitle && !existingRelTitles.has(reqTitle.trim().toLowerCase())) {
        relReqs.push({
          id: `req_rel_${w.id}_${Date.now()}_${idx}`,
          title: reqTitle.trim(),
          completed: false
        });
        existingRelTitles.add(reqTitle.trim().toLowerCase());
        relChanged = true;
        addedReligiousReqs++;
      }
    });
    if (relChanged || !relRow) {
      db.prepare(`
        INSERT INTO religious_ceremony (id, wedding_id, date, time, temple_name, officiant, music_notes, readings_notes, requirements_status, notes, updated_at)
        VALUES (?, ?, ?, NULL, NULL, NULL, '[]', '[]', ?, NULL, ?)
        ON CONFLICT(wedding_id) DO UPDATE SET
          requirements_status = excluded.requirements_status,
          updated_at = excluded.updated_at
      `).run('rel_' + w.id, w.id, w.wedding_date || null, JSON.stringify(relReqs), now);
    }
  }

  return { weddingsCount: weddings.length, addedTasks, deletedTasks, addedCivilReqs, addedReligiousReqs };
}

// POST /api/catalogs/templates/sync - Push current VLB Master Templates to all weddings
router.post('/catalogs/templates/sync', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const result = syncMasterTemplatesToAllWeddings();
  logAudit(
    null,
    req.user!.id,
    req.user!.name,
    'SINCRONIZAR_PLANTILLAS_VLB',
    'CATALOG',
    'ALL_WEDDINGS',
    `Sincronización de plantillas en ${result.weddingsCount} eventos (+${result.addedTasks} agregadas, -${result.deletedTasks} eliminadas)`
  );
  return res.json({
    message: `Plantillas sincronizadas en ${result.weddingsCount} eventos: +${result.addedTasks} actividades agregadas y ${result.deletedTasks} actividades obsoletas eliminadas.`,
    ...result
  });
});

// POST /api/catalogs/templates/import - Import Excel rows and automatically route them to Checklist, Civil, or Religiosa
router.post('/catalogs/templates/import', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { rows, replaceExisting = false, syncToWeddings = true } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No se encontraron filas válidas en el archivo Excel.' });
  }

  const getCatalog = (key: string) => {
    if (replaceExisting) return [];
    try {
      const row = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get(key) as any;
      return row ? JSON.parse(row.values_json) : [];
    } catch {
      return [];
    }
  };

  const checklist: { title: string; category: string; priority: string; responsible: string }[] = getCatalog('master_checklist');
  const civilReqs: string[] = getCatalog('master_civil_requirements');
  const religiousReqs: string[] = getCatalog('master_religious_requirements');

  const checklistSet = new Set(checklist.map(c => c.title.trim().toLowerCase()));
  const civilSet = new Set(civilReqs.map(r => r.trim().toLowerCase()));
  const religiousSet = new Set(religiousReqs.map(r => r.trim().toLowerCase()));

  let routedChecklist = 0;
  let routedCivil = 0;
  let routedReligious = 0;

  for (const r of rows) {
    // Support flexible header names in Spanish
    const sheetOrModule = (
      r['MODULO'] || r['Módulo'] || r['modulo'] ||
      r['DESTINO'] || r['Destino'] ||
      r['TIPO'] || r['Tipo'] ||
      r['_sheet'] || ''
    ).toString().trim().toUpperCase();

    const stageOrCategory = (
      r['ETAPA_O_MES'] || r['ETAPA'] || r['Etapa'] || r['MES'] || r['Mes'] ||
      r['CATEGORIA'] || r['Categoría'] || r['categoria'] || ''
    ).toString().trim();

    const text = (
      r['ACTIVIDAD_O_REQUISITO'] || r['ACTIVIDAD'] || r['Actividad'] ||
      r['REQUISITO'] || r['Requisito'] || r['TAREA'] || r['Tarea'] ||
      r['TITULO'] || r['Título'] || r['DESCRIPCION'] || r['Descripción'] || ''
    ).toString().trim();

    const responsible = (
      r['RESPONSABLE'] || r['Responsable'] || r['responsable'] || 'VLB Studio'
    ).toString().trim();

    const priorityRaw = (
      r['PRIORIDAD'] || r['Prioridad'] || r['prioridad'] || 'Alta'
    ).toString().trim();

    if (!text) continue;

    const combinedHint = `${sheetOrModule} ${stageOrCategory}`.toUpperCase();

    if (combinedHint.includes('CIVIL') || combinedHint.includes('JUZGADO')) {
      if (!civilSet.has(text.toLowerCase())) {
        civilReqs.push(text);
        civilSet.add(text.toLowerCase());
        routedCivil++;
      }
    } else if (combinedHint.includes('RELIGIOS') || combinedHint.includes('IGLESIA') || combinedHint.includes('TEMPLO') || combinedHint.includes('PARROQUIA')) {
      if (!religiousSet.has(text.toLowerCase())) {
        religiousReqs.push(text);
        religiousSet.add(text.toLowerCase());
        routedReligious++;
      }
    } else {
      // Normalize stage/month name
      let category = stageOrCategory || 'Checklist General';
      const norm = category.toLowerCase();
      const officialStages = [
        'Checklist General',
        '12 - 16 meses',
        '10 - 11 meses',
        '8 - 9 meses',
        '6 - 7 meses',
        '4 - 5 meses',
        '2 - 3 meses',
        '1 mes',
        '15 días',
        '1 semana'
      ];
      const exactStage = officialStages.find(s => s.toLowerCase() === norm);
      if (exactStage) {
        category = exactStage;
      } else if (norm.includes('12') || norm.includes('1 año') || norm.includes('un año') || norm.includes('año antes')) {
        category = '12 Meses Antes';
      } else if (norm.includes('9') || norm.includes('8') || norm.includes('7') || norm.includes('6')) {
        category = '9 a 6 Meses Antes';
      } else if (norm.includes('5') || norm.includes('4') || norm.includes('3') || norm.includes('2')) {
        category = '3 a 2 Meses Antes';
      } else if (norm.includes('mes 1') || norm.includes('1 mes') || norm.includes('ultimo mes') || norm.includes('último mes')) {
        category = 'Mes 1';
      } else if (norm.includes('dia b') || norm.includes('día b') || norm.includes('boda')) {
        category = 'Día Boda';
      } else if (norm.includes('tramit') || norm.includes('trámit')) {
        category = 'Trámites';
      } else if (norm.includes('proveedor')) {
        category = 'Proveedores';
      } else if (norm.includes('logistic') || norm.includes('logístic')) {
        category = 'Logística';
      }

      const priority = priorityRaw.toLowerCase().includes('baja')
        ? 'Baja'
        : priorityRaw.toLowerCase().includes('media')
        ? 'Media'
        : 'Alta';

      if (!checklistSet.has(text.toLowerCase())) {
        checklist.push({
          title: text,
          category,
          priority,
          responsible: responsible || 'VLB Studio'
        });
        checklistSet.add(text.toLowerCase());
        routedChecklist++;
      }
    }
  }

  const upsertCatalog = db.prepare(`
    INSERT INTO catalogs (key, values_json)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET values_json = excluded.values_json
  `);

  upsertCatalog.run('master_checklist', JSON.stringify(checklist));
  upsertCatalog.run('master_civil_requirements', JSON.stringify(civilReqs));
  upsertCatalog.run('master_religious_requirements', JSON.stringify(religiousReqs));

  let syncResult = null;
  if (syncToWeddings) {
    syncResult = syncMasterTemplatesToAllWeddings();
  }

  logAudit(
    null,
    req.user!.id,
    req.user!.name,
    'IMPORTAR_EXCEL_PLANTILLAS_VLB',
    'CATALOG',
    'TEMPLATES',
    `Importación Excel VLB: +${routedChecklist} checklist, +${routedCivil} civil, +${routedReligious} religiosa`
  );

  return res.json({
    message: `Excel procesado y clasificado automáticamente: ${routedChecklist} actividades en Checklist por Mes, ${routedCivil} requisitos en Ceremonia Civil y ${routedReligious} requisitos en Ceremonia Religiosa.${syncResult ? ` Sincronizado además con las ${syncResult.weddingsCount} bodas activas.` : ''}`,
    routedChecklist,
    routedCivil,
    routedReligious,
    syncResult
  });
});

// Admin Backup & Recovery Tool
function generateBackupPayload(userName: string) {
  const tables = [
    'users', 'weddings', 'wedding_assignments', 'tables', 'layout_elements',
    'layout_versions', 'guests', 'vendors', 'payments', 'civil_ceremony',
    'religious_ceremony', 'meetings', 'timeline_events', 'tasks',
    'documents', 'audit_logs', 'notifications', 'catalogs'
  ];

  const dump: Record<string, any[]> = {};
  for (const t of tables) {
    dump[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }

  const backupMeta = {
    app: 'LAZO - VLB Studio · Planning',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    created_by: userName,
    total_records: Object.values(dump).reduce((acc, rows) => acc + rows.length, 0)
  };

  return {
    metadata: backupMeta,
    data: dump
  };
}

router.get('/admin/backups', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    return res.json({ backups: [] });
  }
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return res.json({ backups: files });
});

router.get('/admin/backup', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const backupPayload = generateBackupPayload(req.user!.name);
  const backupJson = JSON.stringify(backupPayload, null, 2);
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFilename = `lazo_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(backupDir, backupFilename), backupJson);

  logAudit(null, req.user!.id, req.user!.name, 'CREAR_BACKUP', 'SYSTEM', null, `Creación de respaldo: ${backupFilename}`);

  res.setHeader('Content-Disposition', `attachment; filename="${backupFilename}"`);
  res.setHeader('Content-Type', 'application/json');
  return res.send(backupJson);
});

router.post('/admin/backup', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const backupPayload = generateBackupPayload(req.user!.name);
  const backupJson = JSON.stringify(backupPayload, null, 2);
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilename = `lazo_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(backupDir, backupFilename), backupJson);

  logAudit(null, req.user!.id, req.user!.name, 'CREAR_BACKUP', 'SYSTEM', null, `Creación de respaldo: ${backupFilename}`);

  res.setHeader('Content-Disposition', `attachment; filename="${backupFilename}"`);
  res.setHeader('Content-Type', 'application/json');
  return res.send(backupJson);
});

router.post('/admin/restore', authenticateToken, requireRole(['ADMINISTRADOR']), (req, res) => {
  const { data, metadata } = req.body;
  if (!data || typeof data !== 'object' || !Array.isArray(data.users) || !Array.isArray(data.weddings)) {
    return res.status(400).json({ error: 'Archivo de respaldo inválido: faltan colecciones esenciales (users, weddings).' });
  }

  const orderedTables = [
    'catalogs', 'users', 'weddings', 'wedding_assignments', 'tables', 'layout_elements',
    'layout_versions', 'guests', 'vendors', 'payments', 'civil_ceremony',
    'religious_ceremony', 'meetings', 'timeline_events', 'tasks',
    'documents', 'audit_logs', 'notifications'
  ];

  try {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('BEGIN TRANSACTION;');

    for (const table of [...orderedTables].reverse()) {
      if (Array.isArray(data[table])) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
    }

    let restoredCount = 0;
    for (const table of orderedTables) {
      const rows = data[table];
      if (Array.isArray(rows) && rows.length > 0) {
        // Get valid columns in current schema
        const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
        const validCols = new Set(tableInfo.map(c => c.name));

        for (const row of rows) {
          const cols = Object.keys(row).filter(k => validCols.has(k));
          if (cols.length > 0) {
            const placeholders = cols.map(() => '?').join(', ');
            const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
            stmt.run(...cols.map(c => row[c]));
            restoredCount++;
          }
        }
      }
    }

    db.exec('COMMIT;');
    db.exec('PRAGMA foreign_keys = ON;');

    logAudit(null, req.user!.id, req.user!.name, 'RESTAURAR_BACKUP', 'SYSTEM', null, `Restauración de respaldo (${restoredCount} registros, origen: ${metadata?.timestamp || 'manual'})`);

    return res.json({
      message: `Respaldo restaurado exitosamente (${restoredCount} registros recuperados).`,
      restored_records: restoredCount
    });
  } catch (err: any) {
    try { db.exec('ROLLBACK;'); } catch {}
    try { db.exec('PRAGMA foreign_keys = ON;'); } catch {}
    return res.status(500).json({ error: 'Error al restaurar respaldo: ' + err.message });
  }
});

export default router;
