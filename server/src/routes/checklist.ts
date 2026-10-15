import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/checklist - List tasks and progress
router.get('/:weddingId/checklist', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const isNovios = req.user?.role === 'NOVIOS';

  const rawTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE wedding_id = ?
    ORDER BY
      CASE status WHEN 'Pendiente' THEN 1 WHEN 'En proceso' THEN 2 WHEN 'Completada' THEN 3 END,
      due_date ASC
  `).all(weddingId) as any[];

  // Quitar actividades de Día Boda para los novios
  const tasks = isNovios
    ? rawTasks.filter(t => {
        const cat = (t.category || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        return !cat.includes('día boda') && !cat.includes('dia boda') && !cat.includes('día b') && !cat.includes('dia b') &&
               !title.includes('día boda') && !title.includes('dia boda') && !title.includes('día b') && !title.includes('dia b');
      })
    : rawTasks;

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completada').length;
  const inProgress = tasks.filter(t => t.status === 'En proceso').length;
  const pending = tasks.filter(t => t.status === 'Pendiente').length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return res.json({
    tasks,
    stats: {
      total,
      completed,
      inProgress,
      pending,
      progressPercent
    }
  });
});

// POST /api/weddings/:weddingId/checklist/batch - Add multiple tasks
router.post('/:weddingId/checklist/batch', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { tasks } = req.body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'Se requiere una lista de tareas no vacía.' });
  }

  const now = new Date().toISOString();
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, wedding_id, title, category, responsible, due_date, priority, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let createdCount = 0;
  try {
    db.exec('BEGIN');
    for (const t of tasks) {
      if (!t.title) continue;
      const id = 'tsk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      insertTask.run(
        id,
        weddingId,
        t.title.trim(),
        t.category || 'Checklist General',
        t.responsible || null,
        t.due_date || null,
        t.priority || 'Alta',
        t.status || 'Pendiente',
        t.notes || null,
        now,
        now
      );
      createdCount++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Error batch inserting tasks:', err);
    return res.status(500).json({ error: 'Error al agregar las actividades al checklist.' });
  }

  logAudit(weddingId, req.user!.id, req.user!.name, 'CREAR_TAREAS_LOTE', 'TASK', weddingId, `Asignadas ${createdCount} tareas desde plantilla`);

  return res.status(201).json({
    message: `${createdCount} actividades agregadas correctamente al checklist.`,
    count: createdCount
  });
});

// POST /api/weddings/:weddingId/checklist - Add task
router.post('/:weddingId/checklist', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { title, category, responsible, due_date, priority, status, notes } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'El título de la tarea es obligatorio.' });
  }

  const id = 'tsk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, wedding_id, title, category, responsible, due_date, priority, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, weddingId, title.trim(), category || 'Logística',
    responsible || null, due_date || null, priority || 'Media',
    status || 'Pendiente', notes || null, now, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'CREAR_TAREA', 'TASK', id, `Nueva tarea: ${title}`);

  return res.status(201).json({
    message: 'Tarea agregada al checklist.',
    task: { id, title, category: category || 'Logística', status: status || 'Pendiente' }
  });
});

// PUT /api/weddings/:weddingId/checklist/:id - Update task
router.put('/:weddingId/checklist/:id', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, id } = req.params;
  const { title, category, responsible, due_date, priority, status, notes } = req.body;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND wedding_id = ?').get(id, weddingId) as any;
  if (!task) {
    return res.status(404).json({ error: 'Tarea no encontrada.' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE tasks SET
      title = ?, category = ?, responsible = ?, due_date = ?,
      priority = ?, status = ?, notes = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(
    title || task.title,
    category || task.category,
    responsible !== undefined ? responsible : task.responsible,
    due_date !== undefined ? due_date : task.due_date,
    priority || task.priority,
    status || task.status,
    notes !== undefined ? notes : task.notes,
    now,
    id,
    weddingId
  );

  return res.json({ message: 'Tarea actualizada correctamente.' });
});

// DELETE /api/weddings/:weddingId/checklist/:id - Delete task
router.delete('/:weddingId/checklist/:id', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, id } = req.params;

  db.prepare('DELETE FROM tasks WHERE id = ? AND wedding_id = ?').run(id, weddingId);

  return res.json({ message: 'Tarea eliminada del checklist.' });
});

export default router;
