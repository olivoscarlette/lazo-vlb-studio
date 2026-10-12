import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/vendors - List vendors with individual and summary financials
router.get('/:weddingId/vendors', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  const vendors = db.prepare(`
    SELECT v.*,
      COALESCE((SELECT SUM(amount) FROM payments p WHERE p.vendor_id = v.id), 0) as total_pagado
    FROM vendors v
    WHERE v.wedding_id = ?
    ORDER BY v.name ASC
  `).all(weddingId) as any[];

  let totalCostoReal = 0;
  let totalPagado = 0;

  for (const v of vendors) {
    try {
      v.locations = JSON.parse(v.locations);
    } catch {
      v.locations = [];
    }
    v.saldo_restante = Math.max(0, (v.costo_real || 0) - (v.total_pagado || 0));
    totalCostoReal += (v.costo_real || 0);
    totalPagado += (v.total_pagado || 0);
  }

  // Also include payments without vendor or total general payments
  const allPayments = db.prepare(`
    SELECT p.*, v.name as vendor_name
    FROM payments p
    LEFT JOIN vendors v ON v.id = p.vendor_id
    WHERE p.wedding_id = ?
    ORDER BY p.payment_date DESC, p.created_at DESC
  `).all(weddingId) as any[];

  const grandTotalPagado = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalRestante = Math.max(0, totalCostoReal - grandTotalPagado);

  return res.json({
    vendors,
    payments: allPayments,
    financialSummary: {
      costo_real: totalCostoReal,
      monto_pagado: grandTotalPagado,
      restante: totalRestante
    }
  });
});

// POST /api/weddings/:weddingId/vendors - Add vendor
router.post('/:weddingId/vendors', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { name, phone, type, locations, costo_real, contact_person, notes } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Nombre del proveedor y teléfono de contacto son obligatorios.' });
  }

  const id = 'vnd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const locArray = Array.isArray(locations) ? locations : ['RECEPCIÓN'];
  const cost = Math.max(0, parseFloat(costo_real) || 0);

  db.prepare(`
    INSERT INTO vendors (id, wedding_id, name, phone, type, locations, costo_real, contact_person, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, weddingId, name.trim(), phone.trim(), type || 'Otro',
    JSON.stringify(locArray), cost, contact_person || null, notes || null, now, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'AGREGAR_PROVEEDOR', 'VENDOR', id, `Alta de proveedor ${name} (${type})`);

  return res.status(201).json({
    message: 'Proveedor agregado correctamente.',
    vendor: { id, wedding_id: weddingId, name, phone, type, locations: locArray, costo_real: cost, total_pagado: 0, saldo_restante: cost }
  });
});

// PUT /api/weddings/:weddingId/vendors/:vendorId - Edit vendor
router.put('/:weddingId/vendors/:vendorId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, vendorId } = req.params;
  const { name, phone, type, locations, costo_real, contact_person, notes } = req.body;

  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ? AND wedding_id = ?').get(vendorId, weddingId) as any;
  if (!vendor) {
    return res.status(404).json({ error: 'Proveedor no encontrado.' });
  }

  const now = new Date().toISOString();
  const locArray = locations !== undefined ? (Array.isArray(locations) ? locations : [locations]) : JSON.parse(vendor.locations);
  const cost = costo_real !== undefined ? Math.max(0, parseFloat(costo_real) || 0) : vendor.costo_real;

  db.prepare(`
    UPDATE vendors SET
      name = ?, phone = ?, type = ?, locations = ?, costo_real = ?,
      contact_person = ?, notes = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(
    name || vendor.name,
    phone || vendor.phone,
    type || vendor.type,
    JSON.stringify(locArray),
    cost,
    contact_person !== undefined ? contact_person : vendor.contact_person,
    notes !== undefined ? notes : vendor.notes,
    now,
    vendorId,
    weddingId
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'EDITAR_PROVEEDOR', 'VENDOR', vendorId, `Modificación de proveedor ${name || vendor.name}`);

  return res.json({ message: 'Proveedor actualizado correctamente.' });
});

// PUT /api/weddings/:weddingId/vendors/:vendorId/checkin - Toggle vendor arrival on wedding day
router.put('/:weddingId/vendors/:vendorId/checkin', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, vendorId } = req.params;
  const { arrived, arrived_at } = req.body;

  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ? AND wedding_id = ?').get(vendorId, weddingId) as any;
  if (!vendor) {
    return res.status(404).json({ error: 'Proveedor no encontrado.' });
  }

  const isArrived = arrived ? 1 : 0;
  const nowTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  const arrivalTime = isArrived ? (arrived_at || nowTime) : null;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE vendors SET arrived = ?, arrived_at = ?, updated_at = ?
    WHERE id = ? AND wedding_id = ?
  `).run(isArrived, arrivalTime, now, vendorId, weddingId);

  logAudit(
    weddingId,
    req.user!.id,
    req.user!.name,
    isArrived ? 'LLEGADA_PROVEEDOR' : 'REVERTIR_LLEGADA_PROVEEDOR',
    'VENDOR',
    vendorId,
    isArrived ? `Llegada confirmada de ${vendor.name} (${arrivalTime})` : `Se desmarcó llegada de ${vendor.name}`
  );

  return res.json({
    message: isArrived ? 'Llegada de proveedor registrada.' : 'Llegada desmarcada.',
    arrived: isArrived,
    arrived_at: arrivalTime
  });
});

// DELETE /api/weddings/:weddingId/vendors/:vendorId - Remove vendor
router.delete('/:weddingId/vendors/:vendorId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, vendorId } = req.params;

  const vendor = db.prepare('SELECT name FROM vendors WHERE id = ? AND wedding_id = ?').get(vendorId, weddingId) as any;
  if (!vendor) {
    return res.status(404).json({ error: 'Proveedor no encontrado.' });
  }

  db.prepare('DELETE FROM vendors WHERE id = ? AND wedding_id = ?').run(vendorId, weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ELIMINAR_PROVEEDOR', 'VENDOR', vendorId, `Eliminación de proveedor ${vendor.name}`);

  return res.json({ message: 'Proveedor eliminado correctamente.' });
});

// POST /api/weddings/:weddingId/payments - Register payment
router.post('/:weddingId/payments', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;
  const { vendor_id, concept, amount, payment_date, payment_method, notes, receipt_document_id } = req.body;

  if (!concept || !amount || !payment_date) {
    return res.status(400).json({ error: 'Concepto, monto y fecha de pago son requeridos.' });
  }

  const id = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const amt = Math.max(0, parseFloat(amount) || 0);

  db.prepare(`
    INSERT INTO payments (id, wedding_id, vendor_id, concept, amount, payment_date, payment_method, notes, receipt_document_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, weddingId, vendor_id || null, concept.trim(), amt, payment_date,
    payment_method || 'Transferencia', notes || null, receipt_document_id || null, now, now
  );

  logAudit(weddingId, req.user!.id, req.user!.name, 'REGISTRAR_PAGO', 'PAYMENT', id, `Pago registrado: $${amt} - ${concept}`);

  return res.status(201).json({
    message: 'Pago registrado exitosamente.',
    payment: { id, wedding_id: weddingId, vendor_id, concept, amount: amt, payment_date, payment_method, notes }
  });
});

// DELETE /api/weddings/:weddingId/payments/:paymentId - Delete payment
router.delete('/:weddingId/payments/:paymentId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, paymentId } = req.params;

  db.prepare('DELETE FROM payments WHERE id = ? AND wedding_id = ?').run(paymentId, weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ELIMINAR_PAGO', 'PAYMENT', paymentId, `Cancelación de pago ${paymentId}`);

  return res.json({ message: 'Pago eliminado correctamente.' });
});

export default router;
