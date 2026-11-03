import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Ensure upload directory exists
const VLB_UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'vlb');
if (!fs.existsSync(VLB_UPLOADS_DIR)) {
  fs.mkdirSync(VLB_UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VLB_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = 'vlb_doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit for large editorial proofs & contracts
});

// All VLB routes require authentication and strictly ADMINISTRADOR role
router.use(authenticateToken);
router.use((req, res, next) => {
  if (req.user?.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Acceso restringido: Módulo exclusivo para Administrador.' });
  }
  next();
});

// ==========================================
// 1. CATALOG ROUTES (Artículos y Precios)
// ==========================================

// GET /api/vlb/catalog - List all catalog items
router.get('/catalog', (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM vlb_catalog WHERE 1=1';
    const params: any[] = [];

    if (category && (category === 'PAPELERIA' || category === 'STANDS_EXPERIENCIAS')) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && typeof search === 'string') {
      query += ' AND (name LIKE ? OR description LIKE ? OR subcategory LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY category ASC, subcategory ASC, name ASC';
    const items = db.prepare(query).all(...params);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener catálogo de Viva la Bride.' });
  }
});

// POST /api/vlb/catalog - Create catalog item
router.post('/catalog', (req, res) => {
  try {
    const {
      category,
      subcategory,
      name,
      description,
      pricing_type,
      base_price,
      min_pieces,
      specs_json,
      image_url
    } = req.body;

    if (!category || !name || base_price === undefined || !pricing_type) {
      return res.status(400).json({ error: 'Categoría, nombre, precio base y tipo de cobro son obligatorios.' });
    }

    const id = 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO vlb_catalog (
        id, category, subcategory, name, description, pricing_type, base_price,
        min_pieces, specs_json, image_url, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      category,
      subcategory || 'General',
      name.trim(),
      description || '',
      pricing_type,
      Number(base_price),
      min_pieces ? Number(min_pieces) : 1,
      typeof specs_json === 'string' ? specs_json : JSON.stringify(specs_json || {}),
      image_url || '',
      1,
      now,
      now
    );

    const item = db.prepare('SELECT * FROM vlb_catalog WHERE id = ?').get(id);
    res.status(201).json({ item });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al crear artículo en catálogo.' });
  }
});

// PUT /api/vlb/catalog/:id - Update catalog item
router.put('/catalog/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      subcategory,
      name,
      description,
      pricing_type,
      base_price,
      min_pieces,
      specs_json,
      image_url,
      is_active
    } = req.body;

    const existing = db.prepare('SELECT * FROM vlb_catalog WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Artículo no encontrado.' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE vlb_catalog SET
        category = COALESCE(?, category),
        subcategory = COALESCE(?, subcategory),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        pricing_type = COALESCE(?, pricing_type),
        base_price = COALESCE(?, base_price),
        min_pieces = COALESCE(?, min_pieces),
        specs_json = COALESCE(?, specs_json),
        image_url = COALESCE(?, image_url),
        is_active = COALESCE(?, is_active),
        updated_at = ?
      WHERE id = ?
    `).run(
      category,
      subcategory,
      name ? name.trim() : null,
      description,
      pricing_type,
      base_price !== undefined ? Number(base_price) : null,
      min_pieces !== undefined ? Number(min_pieces) : null,
      typeof specs_json === 'object' ? JSON.stringify(specs_json) : specs_json,
      image_url,
      is_active !== undefined ? Number(is_active) : null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM vlb_catalog WHERE id = ?').get(id);
    res.json({ item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar artículo.' });
  }
});

// DELETE /api/vlb/catalog/:id - Soft-delete or remove item
router.delete('/catalog/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM vlb_catalog WHERE id = ?').run(id);
    res.json({ message: 'Artículo eliminado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar artículo.' });
  }
});

// ==========================================
// 2. QUOTES ROUTES (Cotizador Rápido)
// ==========================================

// GET /api/vlb/quotes - List quotes
router.get('/quotes', (req, res) => {
  try {
    const quotes = db.prepare(`
      SELECT q.*,
        (SELECT COUNT(*) FROM vlb_quote_items WHERE quote_id = q.id) as items_count
      FROM vlb_quotes q
      ORDER BY q.created_at DESC
    `).all();

    res.json({ quotes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener cotizaciones.' });
  }
});

// GET /api/vlb/quotes/:id - Get single quote with full items
router.get('/quotes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const quote = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(id) as any;
    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada.' });
    }

    const items = db.prepare(`
      SELECT * FROM vlb_quote_items
      WHERE quote_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(id);

    res.json({ quote, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al consultar cotización.' });
  }
});

// POST /api/vlb/quotes - Create quote with items
router.post('/quotes', (req, res) => {
  try {
    const {
      client_name,
      partner_name,
      client_email,
      client_phone,
      event_date,
      event_venue,
      discount = 0,
      down_payment_pct = 50,
      notes,
      valid_until,
      items = []
    } = req.body;

    if (!client_name || !client_name.trim()) {
      return res.status(400).json({ error: 'El nombre de la clienta/pareja es obligatorio.' });
    }

    const id = 'quote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    
    // Generate official Viva la Bride quote number (PS-26-XXXX for Papelería Social, SV-26-XXXX for Stands)
    const currentYearShort = new Date().getFullYear().toString().slice(-2);
    const hasStands = Array.isArray(items) && items.some((i: any) => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT');
    const prefix = hasStands ? 'SV' : 'PS';
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const quote_number = req.body.quote_number || `${prefix}-${currentYearShort}-${randCode}`;

    // Calculate subtotal from items
    let subtotal = 0;
    const processedItems = items.map((item: any, idx: number) => {
      const unit_price = Number(item.unit_price) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const total_price = unit_price * quantity;
      subtotal += total_price;
      return {
        id: 'qitem_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 5),
        catalog_id: item.catalog_id || null,
        category: item.category || 'PAPELERIA',
        item_name: item.item_name || 'Servicio Personalizado',
        description: item.description || '',
        pricing_type: item.pricing_type || 'PER_PIECE',
        unit_price,
        quantity,
        total_price,
        custom_options_json: typeof item.custom_options_json === 'object' ? JSON.stringify(item.custom_options_json) : (item.custom_options_json || '{}'),
        sort_order: idx + 1
      };
    });

    const discountAmount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - discountAmount);
    const pct = Number(down_payment_pct) || 50;
    const down_payment_amount = (total * pct) / 100;
    const balance_due = total - down_payment_amount;
    const now = new Date().toISOString();
    const created_by = req.user?.name || 'VLB Studio';

    db.prepare(`
      INSERT INTO vlb_quotes (
        id, quote_number, client_name, partner_name, client_email, client_phone,
        event_date, event_venue, status, subtotal, discount, total,
        down_payment_pct, down_payment_amount, balance_due, notes, valid_until, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      quote_number,
      client_name.trim(),
      partner_name ? partner_name.trim() : null,
      client_email ? client_email.trim() : null,
      client_phone ? client_phone.trim() : null,
      event_date || null,
      event_venue || null,
      'BORRADOR',
      subtotal,
      discountAmount,
      total,
      pct,
      down_payment_amount,
      balance_due,
      notes || null,
      valid_until || null,
      created_by,
      now,
      now
    );

    const insertItemStmt = db.prepare(`
      INSERT INTO vlb_quote_items (
        id, quote_id, catalog_id, category, item_name, description, pricing_type,
        unit_price, quantity, total_price, custom_options_json, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertItemStmt.run(
        item.id,
        id,
        item.catalog_id,
        item.category,
        item.item_name,
        item.description,
        item.pricing_type,
        item.unit_price,
        item.quantity,
        item.total_price,
        item.custom_options_json,
        item.sort_order
      );
    }

    const quote = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(id);
    res.status(201).json({ quote, items: processedItems });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al crear cotización.' });
  }
});

// PUT /api/vlb/quotes/:id - Update quote
router.put('/quotes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Cotización no encontrada.' });
    }

    const {
      client_name,
      partner_name,
      client_email,
      client_phone,
      event_date,
      event_venue,
      status,
      discount = 0,
      down_payment_pct = 50,
      notes,
      valid_until,
      items
    } = req.body;

    const now = new Date().toISOString();

    let subtotal = existing.subtotal;
    if (Array.isArray(items)) {
      // Re-calculate
      db.prepare('DELETE FROM vlb_quote_items WHERE quote_id = ?').run(id);
      subtotal = 0;
      const insertItemStmt = db.prepare(`
        INSERT INTO vlb_quote_items (
          id, quote_id, catalog_id, category, item_name, description, pricing_type,
          unit_price, quantity, total_price, custom_options_json, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      items.forEach((item: any, idx: number) => {
        const unit_price = Number(item.unit_price) || 0;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const total_price = unit_price * quantity;
        subtotal += total_price;
        const itemId = item.id || ('qitem_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 5));
        insertItemStmt.run(
          itemId,
          id,
          item.catalog_id || null,
          item.category || 'PAPELERIA',
          item.item_name || 'Servicio',
          item.description || '',
          item.pricing_type || 'PER_PIECE',
          unit_price,
          quantity,
          total_price,
          typeof item.custom_options_json === 'object' ? JSON.stringify(item.custom_options_json) : (item.custom_options_json || '{}'),
          idx + 1
        );
      });
    }

    const discountAmount = Number(discount) !== undefined ? Number(discount) : existing.discount;
    const total = Math.max(0, subtotal - discountAmount);
    const pct = Number(down_payment_pct) !== undefined ? Number(down_payment_pct) : existing.down_payment_pct;
    const down_payment_amount = (total * pct) / 100;
    const balance_due = total - down_payment_amount;

    db.prepare(`
      UPDATE vlb_quotes SET
        client_name = COALESCE(?, client_name),
        partner_name = COALESCE(?, partner_name),
        client_email = COALESCE(?, client_email),
        client_phone = COALESCE(?, client_phone),
        event_date = COALESCE(?, event_date),
        event_venue = COALESCE(?, event_venue),
        status = COALESCE(?, status),
        subtotal = ?,
        discount = ?,
        total = ?,
        down_payment_pct = ?,
        down_payment_amount = ?,
        balance_due = ?,
        notes = COALESCE(?, notes),
        valid_until = COALESCE(?, valid_until),
        updated_at = ?
      WHERE id = ?
    `).run(
      client_name ? client_name.trim() : null,
      partner_name,
      client_email,
      client_phone,
      event_date,
      event_venue,
      status,
      subtotal,
      discountAmount,
      total,
      pct,
      down_payment_amount,
      balance_due,
      notes,
      valid_until,
      now,
      id
    );

    const updatedQuote = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(id);
    const updatedItems = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ? ORDER BY sort_order ASC').all(id);

    res.json({ quote: updatedQuote, items: updatedItems });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar cotización.' });
  }
});

// DELETE /api/vlb/quotes/:id
router.delete('/quotes/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM vlb_quotes WHERE id = ?').run(id);
    res.json({ message: 'Cotización eliminada correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar cotización.' });
  }
});

// POST /api/vlb/quotes/:id/convert-to-order - Convert quote to active CRM Order
router.post('/quotes/:id/convert-to-order', (req, res) => {
  try {
    const { id } = req.params;
    const quote = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(id) as any;
    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada.' });
    }

    const currentYear = new Date().getFullYear();
    const countRow = db.prepare("SELECT COUNT(*) as count FROM vlb_orders WHERE order_number LIKE ?").get(`ORD-VLB-${currentYear}-%`) as { count: number };
    const nextSeq = String(countRow.count + 1).padStart(3, '0');
    const order_number = `ORD-VLB-${currentYear}-${nextSeq}`;

    const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const quoteItems = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ? ORDER BY sort_order ASC').all(id) as any[];
    const hasPapeleria = quoteItems.some(i => i.category === 'PAPELERIA');
    const hasStands = quoteItems.some(i => i.category === 'STANDS_EXPERIENCIAS');
    const service_type = (hasPapeleria && hasStands) ? 'MIXTO' : hasStands ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA';

    // Default dates derived from event_date
    let voboDeadline: string | null = null;
    let deliveryDate: string | null = null;
    let setupDate = quote.event_date || null;
    let setupTime = '14:00';

    const evtTime = quote.event_date ? new Date(quote.event_date).getTime() : Date.now();
    if (quote.event_date) {
      // VoBo 21 days before event
      const vobo = new Date(evtTime - 21 * 24 * 60 * 60 * 1000);
      voboDeadline = vobo.toISOString().split('T')[0];
      // Physical delivery 5 days before event
      const delivery = new Date(evtTime - 5 * 24 * 60 * 60 * 1000);
      deliveryDate = delivery.toISOString().split('T')[0];
    }

    // Dynamic initial tasks based on service type
    const initialTasks: any[] = [];
    if (hasPapeleria) {
      initialTasks.push({
        id: 't_vobo_' + Date.now() + '_1',
        title: 'Aprobación de Diseño Digital (VoBo)',
        due_date: voboDeadline,
        completed: false,
        category: 'PAPELERIA',
        notes: 'Fecha límite previa a entrar a imprenta'
      });
      initialTasks.push({
        id: 't_taller_' + Date.now() + '_2',
        title: 'Entrada a Taller / Imprenta & Caligrafía',
        due_date: new Date(evtTime - 14 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'PAPELERIA',
        notes: 'Impresión en algodón, rasgado a mano y lacrado'
      });
      initialTasks.push({
        id: 't_entrega_' + Date.now() + '_3',
        title: 'Entrega Física de Papelería',
        due_date: deliveryDate,
        completed: false,
        category: 'PAPELERIA',
        notes: 'En atelier o envío a domicilio'
      });
    }

    if (hasStands) {
      initialTasks.push({
        id: 't_insumos_' + Date.now() + '_4',
        title: 'Compra de bebidas e insumos',
        due_date: new Date(evtTime - 7 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'SERVICIO',
        notes: 'Licores, jarabes, botánicos o cristalería'
      });
      initialTasks.push({
        id: 't_vinil_' + Date.now() + '_5',
        title: 'Armado e impresión de vinil personalizado',
        due_date: new Date(evtTime - 4 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'SERVICIO',
        notes: 'Barras, letreros de bienvenida o copas'
      });
      initialTasks.push({
        id: 't_audio_' + Date.now() + '_6',
        title: 'Pruebas técnicas de Audio Guestbook / saludo',
        due_date: new Date(evtTime - 2 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'SERVICIO',
        notes: 'Grabación del saludo de los novios y prueba de carga'
      });
      initialTasks.push({
        id: 't_montaje_' + Date.now() + '_7',
        title: 'Montaje de Stands en el Venue',
        due_date: setupDate,
        due_time: setupTime,
        completed: false,
        category: 'SERVICIO',
        notes: 'Welcome Drinks, Audio Guestbook, Seating'
      });
    }

    db.prepare(`
      INSERT INTO vlb_orders (
        id, order_number, quote_id, client_name, partner_name, client_email, client_phone,
        event_date, event_venue, total_amount, down_payment_required, total_paid, balance_pending,
        payment_status, production_status, vobo_design_deadline, physical_delivery_date,
        stand_setup_date, stand_setup_time, notes, service_type, tasks_json, items_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      order_number,
      quote.id,
      quote.client_name,
      quote.partner_name,
      quote.client_email,
      quote.client_phone,
      quote.event_date || new Date().toISOString().split('T')[0],
      quote.event_venue,
      quote.total,
      quote.down_payment_amount,
      0, // Initially unpaid until payment is added
      quote.total,
      'ANTICIPO_PENDIENTE',
      'DISENO_EN_PROCESO',
      voboDeadline,
      deliveryDate,
      setupDate,
      setupTime,
      `Convertido desde cotización ${quote.quote_number}.`,
      service_type,
      JSON.stringify(initialTasks),
      JSON.stringify(quoteItems),
      now,
      now
    );

    // Update quote status to CONVERTIDA
    db.prepare("UPDATE vlb_quotes SET status = 'CONVERTIDA', updated_at = ? WHERE id = ?").run(now, id);

    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(orderId);
    res.status(201).json({ order, message: `Cotización ${quote.quote_number} convertida con éxito en el pedido ${order_number}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al convertir cotización a pedido.' });
  }
});

// ==========================================
// 3. CRM ORDERS ROUTES (Parejas & Operación)
// ==========================================

// GET /api/vlb/orders - List all CRM orders
router.get('/orders', (req, res) => {
  try {
    const { search, payment_status, production_status } = req.query;
    let query = `
      SELECT o.*,
        (SELECT COUNT(*) FROM vlb_documents WHERE order_id = o.id) as docs_count,
        (SELECT COUNT(*) FROM vlb_payments WHERE order_id = o.id) as payments_count
      FROM vlb_orders o
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string') {
      query += ' AND (o.client_name LIKE ? OR o.partner_name LIKE ? OR o.order_number LIKE ? OR o.event_venue LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (payment_status && typeof payment_status === 'string') {
      query += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    if (production_status && typeof production_status === 'string') {
      query += ' AND o.production_status = ?';
      params.push(production_status);
    }

    query += ' ORDER BY o.event_date ASC, o.created_at DESC';
    const rawOrders = db.prepare(query).all(...params) as any[];

    const orders = rawOrders.map(o => {
      let items: any[] = [];
      try {
        if (o.items_json) {
          items = JSON.parse(o.items_json);
        } else if (o.quote_id) {
          items = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ? ORDER BY sort_order ASC').all(o.quote_id);
        }
      } catch {}

      let service_type = o.service_type;
      if (!service_type) {
        const hasPap = items.some(i => i.category === 'PAPELERIA');
        const hasStands = items.some(i => i.category === 'STANDS_EXPERIENCIAS');
        service_type = (hasPap && hasStands) ? 'MIXTO' : hasStands ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA';
      }

      let tasks: any[] = [];
      try {
        if (o.tasks_json) {
          tasks = JSON.parse(o.tasks_json);
        }
      } catch {}

      if (tasks.length === 0) {
        const evt = o.event_date ? new Date(o.event_date).getTime() : Date.now();
        if (service_type === 'PAPELERIA' || service_type === 'MIXTO') {
          tasks.push({
            id: 't_vobo_' + o.id,
            title: 'Aprobación de Diseño Digital (VoBo)',
            due_date: o.vobo_design_deadline || new Date(evt - 21 * 86400000).toISOString().split('T')[0],
            completed: false,
            category: 'PAPELERIA',
            notes: 'Fecha límite previa a entrar a imprenta'
          });
          tasks.push({
            id: 't_entrega_' + o.id,
            title: 'Entrega Física de Papelería',
            due_date: o.physical_delivery_date || new Date(evt - 5 * 86400000).toISOString().split('T')[0],
            completed: false,
            category: 'PAPELERIA',
            notes: 'En atelier o envío a domicilio'
          });
        }
        if (service_type === 'STANDS_EXPERIENCIAS' || service_type === 'MIXTO') {
          tasks.push({
            id: 't_insumos_' + o.id,
            title: 'Compra de bebidas e insumos',
            due_date: new Date(evt - 7 * 86400000).toISOString().split('T')[0],
            completed: false,
            category: 'SERVICIO',
            notes: 'Licores, jarabes, botánicos o cristalería'
          });
          tasks.push({
            id: 't_vinil_' + o.id,
            title: 'Armado e impresión de vinil',
            due_date: new Date(evt - 4 * 86400000).toISOString().split('T')[0],
            completed: false,
            category: 'SERVICIO',
            notes: 'Barras, letreros o copas'
          });
          tasks.push({
            id: 't_montaje_' + o.id,
            title: 'Montaje de Stands en el Venue',
            due_date: o.stand_setup_date || o.event_date,
            due_time: o.stand_setup_time || '14:00',
            completed: false,
            category: 'SERVICIO',
            notes: 'Welcome Drinks, Audio Guestbook, Seating'
          });
        }
      }

      return {
        ...o,
        service_type,
        items,
        tasks
      };
    });

    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al listar proyectos de CRM.' });
  }
});

// GET /api/vlb/orders/:id - Get single order with payments and documents
router.get('/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Pedido / Pareja no encontrada.' });
    }

    const payments = db.prepare(`
      SELECT * FROM vlb_payments
      WHERE order_id = ?
      ORDER BY payment_date DESC, created_at DESC
    `).all(id);

    const documents = db.prepare(`
      SELECT * FROM vlb_documents
      WHERE order_id = ?
      ORDER BY created_at DESC
    `).all(id);

    let quote = null;
    let quoteItems: any[] = [];
    if (order.quote_id) {
      quote = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(order.quote_id);
      quoteItems = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ? ORDER BY sort_order ASC').all(order.quote_id);
    } else if (order.items_json) {
      try {
        quoteItems = JSON.parse(order.items_json);
      } catch {}
    }

    let service_type = order.service_type;
    if (!service_type) {
      const hasPap = quoteItems.some(i => i.category === 'PAPELERIA');
      const hasStands = quoteItems.some(i => i.category === 'STANDS_EXPERIENCIAS');
      service_type = (hasPap && hasStands) ? 'MIXTO' : hasStands ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA';
    }

    let tasks: any[] = [];
    try {
      if (order.tasks_json) {
        tasks = JSON.parse(order.tasks_json);
      }
    } catch {}

    res.json({
      order: {
        ...order,
        service_type,
        items: quoteItems,
        tasks
      },
      payments,
      documents,
      quote,
      quoteItems
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener detalle del proyecto.' });
  }
});

// PUT /api/vlb/orders/:id/tasks - Update tasks list for order
router.put('/orders/:id/tasks', (req, res) => {
  try {
    const { id } = req.params;
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Formato de tareas inválido.' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE vlb_orders SET tasks_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(tasks),
      now,
      id
    );
    const updated = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id) as any;
    res.json({ order: { ...updated, tasks }, message: 'Tareas actualizadas correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar tareas.' });
  }
});

// POST /api/vlb/orders - Create CRM order directly
router.post('/orders', (req, res) => {
  try {
    const {
      client_name,
      partner_name,
      client_email,
      client_phone,
      event_date,
      event_venue,
      total_amount = 0,
      down_payment_required,
      vobo_design_deadline,
      physical_delivery_date,
      stand_setup_date,
      stand_setup_time,
      notes
    } = req.body;

    if (!client_name || !event_date) {
      return res.status(400).json({ error: 'Nombre de la clienta y fecha del evento son requeridos.' });
    }

    const currentYear = new Date().getFullYear();
    const countRow = db.prepare("SELECT COUNT(*) as count FROM vlb_orders WHERE order_number LIKE ?").get(`ORD-VLB-${currentYear}-%`) as { count: number };
    const nextSeq = String(countRow.count + 1).padStart(3, '0');
    const order_number = `ORD-VLB-${currentYear}-${nextSeq}`;

    const id = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const total = Number(total_amount) || 0;
    const downPayment = down_payment_required !== undefined ? Number(down_payment_required) : (total * 0.5);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO vlb_orders (
        id, order_number, client_name, partner_name, client_email, client_phone,
        event_date, event_venue, total_amount, down_payment_required, total_paid, balance_pending,
        payment_status, production_status, vobo_design_deadline, physical_delivery_date,
        stand_setup_date, stand_setup_time, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      order_number,
      client_name.trim(),
      partner_name ? partner_name.trim() : null,
      client_email ? client_email.trim() : null,
      client_phone ? client_phone.trim() : null,
      event_date,
      event_venue || null,
      total,
      downPayment,
      0,
      total,
      'ANTICIPO_PENDIENTE',
      'DISENO_EN_PROCESO',
      vobo_design_deadline || null,
      physical_delivery_date || null,
      stand_setup_date || event_date,
      stand_setup_time || '14:00',
      notes || null,
      now,
      now
    );

    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id);
    res.status(201).json({ order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al crear proyecto.' });
  }
});

// PUT /api/vlb/orders/:id - Update CRM order
router.put('/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    const {
      client_name,
      partner_name,
      client_email,
      client_phone,
      event_date,
      event_venue,
      total_amount,
      down_payment_required,
      payment_status,
      production_status,
      vobo_design_deadline,
      physical_delivery_date,
      stand_setup_date,
      stand_setup_time,
      notes
    } = req.body;

    const now = new Date().toISOString();
    const total = total_amount !== undefined ? Number(total_amount) : existing.total_amount;
    const downPayment = down_payment_required !== undefined ? Number(down_payment_required) : existing.down_payment_required;
    const balancePending = Math.max(0, total - existing.total_paid);

    let updatedPaymentStatus = payment_status || existing.payment_status;
    if (!payment_status) {
      if (existing.total_paid >= total && total > 0) {
        updatedPaymentStatus = 'LIQUIDADO';
      } else if (existing.total_paid >= downPayment && existing.total_paid > 0) {
        updatedPaymentStatus = 'ANTICIPO_PAGADO';
      } else {
        updatedPaymentStatus = 'ANTICIPO_PENDIENTE';
      }
    }

    db.prepare(`
      UPDATE vlb_orders SET
        client_name = COALESCE(?, client_name),
        partner_name = COALESCE(?, partner_name),
        client_email = COALESCE(?, client_email),
        client_phone = COALESCE(?, client_phone),
        event_date = COALESCE(?, event_date),
        event_venue = COALESCE(?, event_venue),
        total_amount = ?,
        down_payment_required = ?,
        balance_pending = ?,
        payment_status = ?,
        production_status = COALESCE(?, production_status),
        vobo_design_deadline = COALESCE(?, vobo_design_deadline),
        physical_delivery_date = COALESCE(?, physical_delivery_date),
        stand_setup_date = COALESCE(?, stand_setup_date),
        stand_setup_time = COALESCE(?, stand_setup_time),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `).run(
      client_name ? client_name.trim() : null,
      partner_name,
      client_email,
      client_phone,
      event_date,
      event_venue,
      total,
      downPayment,
      balancePending,
      updatedPaymentStatus,
      production_status,
      vobo_design_deadline,
      physical_delivery_date,
      stand_setup_date,
      stand_setup_time,
      notes,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id);
    res.json({ order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar proyecto.' });
  }
});

// DELETE /api/vlb/orders/:id
router.delete('/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM vlb_orders WHERE id = ?').run(id);
    res.json({ message: 'Proyecto eliminado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar proyecto.' });
  }
});

// ==========================================
// 4. PAYMENTS ROUTES (Anticipos 50% y Saldos)
// ==========================================

// POST /api/vlb/orders/:orderId/payments - Register payment
router.post('/orders/:orderId/payments', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    const {
      amount,
      payment_type = 'ANTICIPO_50',
      payment_method = 'SPEI',
      payment_date,
      reference_num,
      notes
    } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'El monto del pago debe ser mayor a 0.' });
    }

    const id = 'pay_vlb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const pDate = payment_date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO vlb_payments (
        id, order_id, amount, payment_type, payment_method, payment_date, reference_num, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      orderId,
      paymentAmount,
      payment_type,
      payment_method,
      pDate,
      reference_num || null,
      notes || null,
      now
    );

    // Recalculate totals on order
    const paymentsSumRow = db.prepare('SELECT SUM(amount) as total_paid FROM vlb_payments WHERE order_id = ?').get(orderId) as { total_paid: number };
    const totalPaid = paymentsSumRow.total_paid || 0;
    const balancePending = Math.max(0, order.total_amount - totalPaid);

    let paymentStatus = 'ANTICIPO_PENDIENTE';
    if (totalPaid >= order.total_amount && order.total_amount > 0) {
      paymentStatus = 'LIQUIDADO';
    } else if (totalPaid >= order.down_payment_required && totalPaid > 0) {
      paymentStatus = 'ANTICIPO_PAGADO';
    }

    db.prepare(`
      UPDATE vlb_orders SET
        total_paid = ?,
        balance_pending = ?,
        payment_status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(totalPaid, balancePending, paymentStatus, now, orderId);

    const payment = db.prepare('SELECT * FROM vlb_payments WHERE id = ?').get(id);
    const updatedOrder = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(orderId);

    res.status(201).json({ payment, order: updatedOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al registrar pago.' });
  }
});

// DELETE /api/vlb/payments/:id
router.delete('/payments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const payment = db.prepare('SELECT * FROM vlb_payments WHERE id = ?').get(id) as any;
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    const orderId = payment.order_id;
    db.prepare('DELETE FROM vlb_payments WHERE id = ?').run(id);

    // Recalculate
    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(orderId) as any;
    if (order) {
      const now = new Date().toISOString();
      const paymentsSumRow = db.prepare('SELECT SUM(amount) as total_paid FROM vlb_payments WHERE order_id = ?').get(orderId) as { total_paid: number };
      const totalPaid = paymentsSumRow.total_paid || 0;
      const balancePending = Math.max(0, order.total_amount - totalPaid);

      let paymentStatus = 'ANTICIPO_PENDIENTE';
      if (totalPaid >= order.total_amount && order.total_amount > 0) {
        paymentStatus = 'LIQUIDADO';
      } else if (totalPaid >= order.down_payment_required && totalPaid > 0) {
        paymentStatus = 'ANTICIPO_PAGADO';
      }

      db.prepare(`
        UPDATE vlb_orders SET
          total_paid = ?,
          balance_pending = ?,
          payment_status = ?,
          updated_at = ?
        WHERE id = ?
      `).run(totalPaid, balancePending, paymentStatus, now, orderId);
    }

    res.json({ message: 'Pago eliminado y saldos recalculados correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar pago.' });
  }
});

// ==========================================
// 5. DOCUMENTS VAULT (Bóveda Protegida)
// ==========================================

// POST /api/vlb/orders/:orderId/documents - Upload document (Contrato, SPEI, VoBo)
router.post('/orders/:orderId/documents', upload.single('file'), (req, res) => {
  try {
    const { orderId } = req.params;
    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo adjunto.' });
    }

    const {
      category = 'OTRO',
      notes = '',
      vobo_status = 'PENDIENTE'
    } = req.body;

    const id = 'vlb_doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const storedPath = path.join('uploads', 'vlb', req.file.filename);

    db.prepare(`
      INSERT INTO vlb_documents (
        id, order_id, category, original_name, file_path, mime_type, file_size,
        vobo_status, notes, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      orderId,
      category,
      req.file.originalname,
      storedPath,
      req.file.mimetype,
      req.file.size,
      vobo_status,
      notes || null,
      req.user?.name || 'VLB Admin',
      now
    );

    const doc = db.prepare('SELECT * FROM vlb_documents WHERE id = ?').get(id);
    res.status(201).json({ document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al subir documento a la bóveda.' });
  }
});

// PUT /api/vlb/documents/:id/vobo - Approve or reject VoBo de diseño
router.put('/documents/:id/vobo', (req, res) => {
  try {
    const { id } = req.params;
    const { vobo_status, vobo_notes } = req.body;

    if (!['PENDIENTE', 'APROBADO', 'RECHAZADO'].includes(vobo_status)) {
      return res.status(400).json({ error: 'Estatus de VoBo inválido.' });
    }

    const doc = db.prepare('SELECT * FROM vlb_documents WHERE id = ?').get(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }

    const now = new Date().toISOString();
    const approvedAt = vobo_status === 'APROBADO' ? now : null;

    db.prepare(`
      UPDATE vlb_documents SET
        vobo_status = ?,
        vobo_approved_at = ?,
        vobo_notes = COALESCE(?, vobo_notes)
      WHERE id = ?
    `).run(vobo_status, approvedAt, vobo_notes, id);

    // If approved, update order's production_status to EN_PRODUCCION if currently in review
    if (vobo_status === 'APROBADO') {
      db.prepare(`
        UPDATE vlb_orders SET
          production_status = 'EN_PRODUCCION',
          updated_at = ?
        WHERE id = ? AND production_status IN ('DISENO_EN_PROCESO', 'VOBO_PENDIENTE')
      `).run(now, doc.order_id);
    }

    const updated = db.prepare('SELECT * FROM vlb_documents WHERE id = ?').get(id);
    res.json({ document: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar VoBo.' });
  }
});

// GET /api/vlb/documents/:id/download - Download document from vault
router.get('/documents/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const doc = db.prepare('SELECT * FROM vlb_documents WHERE id = ?').get(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Documento no encontrado en bóveda.' });
    }

    const absolutePath = path.resolve(process.cwd(), 'data', doc.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'El archivo físico no se localizó en el almacenamiento seguro.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al descargar documento.' });
  }
});

// DELETE /api/vlb/documents/:id
router.delete('/documents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const doc = db.prepare('SELECT * FROM vlb_documents WHERE id = ?').get(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }

    const absolutePath = path.resolve(process.cwd(), 'data', doc.file_path);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (e) {
        console.warn('Could not remove file on disk:', e);
      }
    }

    db.prepare('DELETE FROM vlb_documents WHERE id = ?').run(id);
    res.json({ message: 'Documento eliminado de la bóveda.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar documento.' });
  }
});

export default router;
