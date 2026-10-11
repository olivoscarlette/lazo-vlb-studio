import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/reports - Real-time aggregated report data
router.get('/:weddingId/reports', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  const wedding = db.prepare('SELECT * FROM weddings WHERE id = ?').get(weddingId) as any;
  if (!wedding) {
    return res.status(404).json({ error: 'Boda no encontrada.' });
  }

  // 1. Guests & RSVP breakdown
  const guestStats = db.prepare(`
    SELECT
      COUNT(*) as total_invitados,
      SUM(CASE WHEN status = 'Confirmado' THEN 1 ELSE 0 END) as confirmados,
      SUM(CASE WHEN status = 'Pendiente de confirmar' THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN status = 'No asistirá' THEN 1 ELSE 0 END) as no_asistiran,
      COALESCE(SUM(companion_count), 0) as total_acompanantes,
      COALESCE(SUM(CASE WHEN status = 'Confirmado' THEN companion_count ELSE 0 END), 0) as acompanantes_confirmados,
      COALESCE(SUM(CASE WHEN status = 'Confirmado' THEN 1 + companion_count ELSE 0 END), 0) as lugares_confirmados_totales,
      COALESCE(SUM(1 + companion_count), 0) as lugares_potenciales_totales
    FROM guests
    WHERE wedding_id = ?
  `).get(weddingId) as any;

  // 2. Tables & Capacity
  const tables = db.prepare(`SELECT * FROM tables WHERE wedding_id = ?`).all(weddingId) as any[];
  let totalCapacidadMesas = 0;
  let totalLugaresAsignados = 0;

  for (const t of tables) {
    totalCapacidadMesas += (t.capacity || 0);
    const assigned = db.prepare(`
      SELECT COALESCE(SUM(1 + companion_count), 0) as used
      FROM guests
      WHERE wedding_id = ? AND table_id = ?
    `).get(weddingId, t.id) as any;
    totalLugaresAsignados += (assigned?.used || 0);
  }

  // 3. Financial breakdown (COSTO REAL, MONTO PAGADO, RESTANTE)
  const vendors = db.prepare(`SELECT * FROM vendors WHERE wedding_id = ?`).all(weddingId) as any[];
  const totalCostoReal = vendors.reduce((acc, v) => acc + (v.costo_real || 0), 0);

  const payments = db.prepare(`SELECT amount FROM payments WHERE wedding_id = ?`).all(weddingId) as any[];
  const totalMontoPagado = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalRestante = Math.max(0, totalCostoReal - totalMontoPagado);

  // 4. Checklist breakdown
  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total_tareas,
      SUM(CASE WHEN status = 'Completada' THEN 1 ELSE 0 END) as completadas,
      SUM(CASE WHEN status = 'En proceso' THEN 1 ELSE 0 END) as en_proceso,
      SUM(CASE WHEN status = 'Pendiente' THEN 1 ELSE 0 END) as pendientes
    FROM tasks
    WHERE wedding_id = ?
  `).get(weddingId) as any;

  return res.json({
    wedding: {
      name: wedding.name,
      wedding_date: wedding.wedding_date,
      estimated_guests: wedding.estimated_guests
    },
    guests: {
      total: guestStats.total_invitados || 0,
      confirmados: guestStats.confirmados || 0,
      pendientes: guestStats.pendientes || 0,
      no_asistiran: guestStats.no_asistiran || 0,
      acompanantes_totales: guestStats.total_acompanantes || 0,
      lugares_confirmados: guestStats.lugares_confirmados_totales || 0,
      lugares_potenciales: guestStats.lugares_potenciales_totales || 0
    },
    tables: {
      total_mesas: tables.length,
      capacidad_total: totalCapacidadMesas,
      lugares_asignados: totalLugaresAsignados,
      lugares_disponibles: Math.max(0, totalCapacidadMesas - totalLugaresAsignados)
    },
    finance: {
      costo_real: totalCostoReal,
      monto_pagado: totalMontoPagado,
      restante: totalRestante,
      total_proveedores: vendors.length
    },
    tasks: {
      total: taskStats.total_tareas || 0,
      completadas: taskStats.completadas || 0,
      en_proceso: taskStats.en_proceso || 0,
      pendientes: taskStats.pendientes || 0,
      avance_porcentaje: taskStats.total_tareas > 0 ? Math.round((taskStats.completadas / taskStats.total_tareas) * 100) : 0
    }
  });
});

export default router;
