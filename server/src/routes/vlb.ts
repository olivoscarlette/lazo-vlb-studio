import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import convert from 'heic-convert';
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

const catalogImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VLB_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = 'vlb_inspo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    cb(null, uniqueSuffix + ext);
  }
});

const uploadCatalogImage = multer({
  storage: catalogImageStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|avif|heic|heif/i;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream';
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, WEBP, GIF, HEIC).'));
  }
});

// ==========================================
// 0. PUBLIC PROPOSAL & DIGITAL SIGNATURE ROUTES (Sin Login para Novios)
// ==========================================

// GET /api/vlb/quotes/public/:token - Detalle público de propuesta (con pagos y saldos en vivo)
router.get('/quotes/public/:token', (req, res) => {
  try {
    const { token } = req.params;
    const quote = db.prepare(`
      SELECT * FROM vlb_quotes
      WHERE id = ? OR public_token = ? OR quote_number = ?
    `).get(token, token, token) as any;

    if (!quote) {
      return res.status(404).json({ error: 'Propuesta no encontrada o enlace expirado.' });
    }

    const items = db.prepare(`
      SELECT * FROM vlb_quote_items
      WHERE quote_id = ?
      ORDER BY sort_order ASC
    `).all(quote.id);

    // Buscar si ya tiene pedido asociado en el CRM con abonos / pagos registrados
    const order = db.prepare(`
      SELECT * FROM vlb_orders WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(quote.id) as any;

    let payments: any[] = [];
    if (order) {
      payments = db.prepare(`
        SELECT * FROM vlb_payments WHERE order_id = ? ORDER BY payment_date DESC, created_at DESC
      `).all(order.id);
    }

    const totalPaid = order ? (Number(order.total_paid) || 0) : (Number(quote.total_paid) || 0);
    const balancePending = order
      ? (order.balance_pending !== undefined ? Number(order.balance_pending) : Math.max(0, quote.total - totalPaid))
      : Math.max(0, quote.total - totalPaid);
    const paymentStatus = order ? (order.payment_status || 'ANTICIPO_PENDIENTE') : (quote.payment_status || 'ANTICIPO_PENDIENTE');

    // Regla estricta de anticipo: Stands = $1,000 MXN, Papelería = 50%
    const isService = quote.quote_number?.startsWith('SV-') || items.some((i: any) => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT');
    const downPaymentRequired = isService ? Math.min(1000, quote.total) : Math.round(quote.total * 0.5);

    res.json({
      quote: {
        ...quote,
        down_payment_amount: downPaymentRequired,
        total_paid: totalPaid,
        balance_due: balancePending,
        balance_pending: balancePending,
        payment_status: paymentStatus
      },
      items,
      order: order || null,
      payments
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener propuesta.' });
  }
});

// POST /api/vlb/quotes/public/:token/sign - Aceptar y firmar propuesta en la nube
router.post('/quotes/public/:token/sign', (req, res) => {
  try {
    const { token } = req.params;
    const { signature_data, signer_name } = req.body;

    if (!signature_data || !signer_name || !signer_name.trim()) {
      return res.status(400).json({ error: 'Firma y nombre completo de quien autoriza son requeridos.' });
    }

    const quote = db.prepare(`
      SELECT * FROM vlb_quotes
      WHERE id = ? OR public_token = ?
    `).get(token, token) as any;

    if (!quote) {
      return res.status(404).json({ error: 'Propuesta no encontrada.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE vlb_quotes
      SET status = 'APROBADA',
          signature_data = ?,
          signed_by_name = ?,
          signed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(signature_data, signer_name.trim(), now, now, quote.id);

    // Si ya existe un pedido asociado en CRM, resguardar en bóveda de documentos
    const existingOrder = db.prepare('SELECT * FROM vlb_orders WHERE quote_id = ?').get(quote.id) as any;
    if (existingOrder) {
      const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      try {
        db.prepare(`
          INSERT INTO vlb_documents (id, order_id, category, original_name, file_path, mime_type, file_size, vobo_status, vobo_approved_at, vobo_notes, notes, uploaded_by, created_at)
          VALUES (?, ?, 'CONTRATO_FIRMADO', ?, ?, 'image/png', ?, 'APROBADO', ?, 'Aceptación formal con firma digital en la nube', ?, 'Novios (Firma Digital)', ?)
        `).run(
          docId,
          existingOrder.id,
          `Contrato_Firmado_${signer_name.trim().replace(/\s+/g, '_')}.png`,
          signature_data,
          signature_data.length,
          now,
          `Firmado formalmente por ${signer_name.trim()} el ${now.split('T')[0]}`,
          now
        );
      } catch {}
    }

    // Insertar notificación del sistema para alertar en pantalla a coordinadoras y admin
    try {
      const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      db.prepare(`
        INSERT INTO notifications (id, wedding_id, user_id, title, message, read, link, created_at)
        VALUES (?, NULL, NULL, ?, ?, 0, '/vlb', ?)
      `).run(
        notifId,
        '¡Contrato Firmado! 💍',
        `${signer_name.trim()} acaba de firmar formalmente la cotización ${quote.quote_number || 'VLB'}.`,
        now
      );
    } catch (notifErr) {
      console.warn('Could not insert contract notification:', notifErr);
    }

    res.json({
      success: true,
      message: 'Propuesta aceptada y firmada exitosamente.',
      signed_at: now,
      signed_by_name: signer_name.trim()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al firmar propuesta.' });
  }
});

// POST /api/vlb/quotes/public/:token/pdf - Subir y almacenar PDF generado
router.post('/quotes/public/:token/pdf', upload.single('file'), (req, res) => {
  try {
    const { token } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se subió ningún archivo PDF.' });
    }

    const quote = db.prepare(`
      SELECT * FROM vlb_quotes
      WHERE id = ? OR public_token = ?
    `).get(token, token) as any;

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE vlb_quotes SET pdf_path = ?, updated_at = ? WHERE id = ?').run(file.filename, now, quote.id);

    res.json({
      success: true,
      message: 'PDF guardado en el servidor.',
      pdf_path: file.filename,
      pdf_url: `/api/vlb/quotes/public/${quote.id}/${encodeURIComponent(file.originalname)}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al almacenar PDF.' });
  }
});

// GET /api/vlb/quotes/public/:token/:filename - Descarga directa del archivo PDF
router.get('/quotes/public/:token/:filename', (req, res) => {
  try {
    const { token, filename } = req.params;
    const quote = db.prepare(`
      SELECT * FROM vlb_quotes
      WHERE id = ? OR public_token = ?
    `).get(token, token) as any;

    if (!quote || !quote.pdf_path) {
      return res.status(404).send('PDF no disponible en el servidor.');
    }

    const filePath = path.join(VLB_UPLOADS_DIR, quote.pdf_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('El archivo PDF no se encuentra físicamente en el servidor.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename || 'Cotizacion_VivaLaBride.pdf'}"`);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).send('Error al descargar PDF.');
  }
});

// Helper para generar o recuperar enlace corto gratuito tipo tinyurl.com/vlb-... (sin mención de lazo)
async function getOrGenerateShortUrl(quoteId: string, folio?: string): Promise<string> {
  const quote = db.prepare('SELECT id, quote_number, short_url FROM vlb_quotes WHERE id = ?').get(quoteId) as any;
  if (!quote) return '';
  if (quote.short_url && quote.short_url.trim()) {
    return quote.short_url;
  }

  const longUrl = `https://lazostudio.mx/vlb/propuesta/${quote.id}`;
  const cleanFolio = (folio || quote.quote_number || 'propuesta').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const alias = `vlb-${cleanFolio}-${Math.random().toString(36).substring(2, 5)}`;

  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}&alias=${encodeURIComponent(alias)}`, {
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      let short = await res.text();
      short = short.trim();
      if (short.startsWith('http')) {
        db.prepare('UPDATE vlb_quotes SET short_url = ? WHERE id = ?').run(short, quote.id);
        return short;
      }
    }
  } catch (err) {
    console.warn('TinyURL alias error, falling back:', err);
  }

  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      let short = await res.text();
      short = short.trim();
      if (short.startsWith('http')) {
        db.prepare('UPDATE vlb_quotes SET short_url = ? WHERE id = ?').run(short, quote.id);
        return short;
      }
    }
  } catch (err) {
    console.warn('TinyURL fallback error:', err);
  }

  return longUrl;
}

// GET /api/vlb/quotes/public/:token/shorten - Obtener liga corta pública
router.get('/quotes/public/:token/shorten', async (req, res) => {
  try {
    const { token } = req.params;
    const quote = db.prepare('SELECT id, quote_number FROM vlb_quotes WHERE id = ? OR public_token = ?').get(token, token) as any;
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada.' });
    const short_url = await getOrGenerateShortUrl(quote.id, quote.quote_number);
    res.json({ short_url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al acortar URL.' });
  }
});

// All VLB routes below require authentication and strictly ADMINISTRADOR role
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

// POST /api/vlb/catalog/upload-image - Subir imagen de catálogo desde la laptop
router.post('/catalog/upload-image', authenticateToken, (req, res, next) => {
  uploadCatalogImage.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir la imagen.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo de imagen.' });
    }

    let finalFilename = req.file.filename;
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isHeic = ext === '.heic' || ext === '.heif' || (req.file.mimetype && req.file.mimetype.includes('heic'));

    if (isHeic) {
      try {
        const inputBuffer = fs.readFileSync(filePath);
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.88
        });

        const jpgFilename = path.parse(req.file.filename).name + '.jpg';
        const jpgPath = path.join(path.dirname(filePath), jpgFilename);
        fs.writeFileSync(jpgPath, Buffer.from(outputBuffer));

        if (jpgPath !== filePath) {
          try { fs.unlinkSync(filePath); } catch {}
        }
        finalFilename = jpgFilename;
      } catch (convErr) {
        console.warn('Error convirtiendo HEIC en servidor:', convErr);
      }
    }

    const imageUrl = `/uploads/vlb/${finalFilename}`;
    return res.json({
      success: true,
      imageUrl,
      filename: finalFilename,
      originalName: req.file.originalname
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error del servidor al procesar la imagen.' });
  }
});

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

    query += ' ORDER BY name COLLATE NOCASE ASC';
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
      category ?? null,
      subcategory ?? null,
      name !== undefined && name !== null ? name.trim() : null,
      description ?? null,
      pricing_type ?? null,
      base_price !== undefined && base_price !== null && base_price !== '' ? Number(base_price) : null,
      min_pieces !== undefined && min_pieces !== null && min_pieces !== '' ? Number(min_pieces) : null,
      specs_json !== undefined && specs_json !== null
        ? (typeof specs_json === 'object' ? JSON.stringify(specs_json) : String(specs_json))
        : null,
      image_url ?? null,
      is_active !== undefined && is_active !== null ? Number(is_active) : null,
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

// Helper to generate sequential general folios for Viva la Bride (Format: VLB-YY-MMCC, e.g. VLB-26-1101)
export function generateNextVlbQuoteNumber(): string {
  const now = new Date();
  const yearShort = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `VLB-${yearShort}-${month}`; // e.g. "VLB-26-11"

  const rows = db.prepare(`
    SELECT quote_number FROM vlb_quotes 
    WHERE quote_number LIKE ?
  `).all(`${monthPrefix}%`) as { quote_number: string }[];

  let maxConsecutive = 0;
  for (const row of rows) {
    if (!row.quote_number) continue;
    // Expected format: VLB-26-1101, VLB-26-1102...
    const match = row.quote_number.match(/^VLB-\d{2}-\d{2}(\d{2,})$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxConsecutive) {
        maxConsecutive = num;
      }
    }
  }

  let nextConsecutive = maxConsecutive + 1;
  let candidate = `${monthPrefix}${String(nextConsecutive).padStart(2, '0')}`;
  
  // Guarantee absolute uniqueness in database
  while (db.prepare('SELECT 1 FROM vlb_quotes WHERE quote_number = ?').get(candidate)) {
    nextConsecutive++;
    candidate = `${monthPrefix}${String(nextConsecutive).padStart(2, '0')}`;
  }

  return candidate;
}

// Helper to generate sequential order numbers for Viva la Bride (Format: VLB-001, VLB-002...)
export function generateNextVlbOrderNumber(): string {
  const rows = db.prepare('SELECT order_number FROM vlb_orders').all() as { order_number: string }[];
  let maxSeq = 0;
  for (const row of rows) {
    if (!row.order_number) continue;
    const match = row.order_number.match(/^(?:ORD-)?VLB-(?:\d{4}-)?(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num < 100000 && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextSeqNum = Math.max(maxSeq + 1, rows.length + 1);
  let candidate = `VLB-${String(nextSeqNum).padStart(3, '0')}`;

  // Guarantee absolute uniqueness in database
  while (db.prepare('SELECT 1 FROM vlb_orders WHERE order_number = ?').get(candidate)) {
    nextSeqNum++;
    candidate = `VLB-${String(nextSeqNum).padStart(3, '0')}`;
  }

  return candidate;
}

// GET /api/vlb/quotes - List quotes
router.get('/quotes', (req, res) => {
  try {
    const quotes = db.prepare(`
      SELECT q.*,
        (SELECT COUNT(*) FROM vlb_quote_items WHERE quote_id = q.id) as items_count,
        EXISTS(SELECT 1 FROM vlb_quote_items WHERE quote_id = q.id AND (category = 'STANDS_EXPERIENCIAS' OR pricing_type = 'FIXED_EVENT')) as has_services
      FROM vlb_quotes q
      ORDER BY q.created_at DESC
    `).all();

    res.json({ quotes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener cotizaciones.' });
  }
});

// GET /api/vlb/quotes/:id - Get single quote with full items & payments
router.get('/quotes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const quote = db.prepare(`
      SELECT * FROM vlb_quotes
      WHERE id = ? OR quote_number = ? OR public_token = ?
    `).get(id, id, id) as any;

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada.' });
    }

    const items = db.prepare(`
      SELECT * FROM vlb_quote_items
      WHERE quote_id = ? OR quote_id = ?
      ORDER BY sort_order ASC
    `).all(quote.id, id);

    // Buscar si ya tiene pedido asociado en el CRM con abonos / pagos registrados
    const order = db.prepare(`
      SELECT * FROM vlb_orders WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(quote.id) as any;

    let payments: any[] = [];
    if (order) {
      payments = db.prepare(`
        SELECT * FROM vlb_payments WHERE order_id = ? ORDER BY payment_date DESC, created_at DESC
      `).all(order.id);
    }

    const totalPaid = order ? (Number(order.total_paid) || 0) : (Number(quote.total_paid) || 0);
    const balancePending = order
      ? (order.balance_pending !== undefined ? Number(order.balance_pending) : Math.max(0, quote.total - totalPaid))
      : Math.max(0, quote.total - totalPaid);

    res.json({
      quote: {
        ...quote,
        total_paid: totalPaid,
        balance_due: totalPaid > 0 ? balancePending : quote.balance_due
      },
      items,
      order: order || null,
      payments
    });
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
      event_time,
      event_venue,
      discount = 0,
      down_payment_pct = 50,
      contract_type = 'AUTO',
      notes,
      valid_until,
      items = []
    } = req.body;

    if (!client_name || !client_name.trim()) {
      return res.status(400).json({ error: 'El nombre de la clienta/pareja es obligatorio.' });
    }

    const id = 'quote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    
    // Generate official Viva la Bride unified quote number (guaranteeing uniqueness)
    let quote_number = req.body.quote_number?.trim();
    if (quote_number) {
      const exists = db.prepare('SELECT 1 FROM vlb_quotes WHERE quote_number = ?').get(quote_number);
      if (exists) {
        quote_number = generateNextVlbQuoteNumber();
      }
    } else {
      quote_number = generateNextVlbQuoteNumber();
    }

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
    // Regla estricta: Servicios / Stands es Separación de $1,000 MXN. Papelería es 50%
    const isService = quote_number.startsWith('SV-') || (processedItems.some((i: any) => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT'));
    const down_payment_amount = isService ? Math.min(1000, total) : (total * 0.5);
    const balance_due = Math.max(0, total - down_payment_amount);
    const pct = total > 0 ? (isService ? Math.round((down_payment_amount / total) * 100) : 50) : 50;
    const now = new Date().toISOString();
    const created_by = req.user?.name || 'VLB Studio';

    db.prepare(`
      INSERT INTO vlb_quotes (
        id, quote_number, client_name, partner_name, client_email, client_phone,
        event_date, event_time, event_venue, status, subtotal, discount, total,
        down_payment_pct, down_payment_amount, balance_due, contract_type, notes, valid_until, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      quote_number,
      client_name.trim(),
      partner_name ? partner_name.trim() : null,
      client_email ? client_email.trim() : null,
      client_phone ? client_phone.trim() : null,
      event_date || null,
      event_time ? event_time.trim() : null,
      event_venue || null,
      'BORRADOR',
      subtotal,
      discountAmount,
      total,
      pct,
      down_payment_amount,
      balance_due,
      contract_type || 'AUTO',
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
      event_time,
      event_venue,
      status,
      discount = 0,
      down_payment_pct = 50,
      contract_type,
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
    const isService = existing.quote_number.startsWith('SV-') || (items && items.some((i: any) => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT'));
    const down_payment_amount = isService ? Math.min(1000, total) : (total * 0.5);
    const balance_due = Math.max(0, total - down_payment_amount);
    const pct = total > 0 ? (isService ? Math.round((down_payment_amount / total) * 100) : 50) : 50;

    db.prepare(`
      UPDATE vlb_quotes SET
        client_name = COALESCE(?, client_name),
        partner_name = COALESCE(?, partner_name),
        client_email = COALESCE(?, client_email),
        client_phone = COALESCE(?, client_phone),
        event_date = COALESCE(?, event_date),
        event_time = COALESCE(?, event_time),
        event_venue = COALESCE(?, event_venue),
        status = COALESCE(?, status),
        subtotal = ?,
        discount = ?,
        total = ?,
        down_payment_pct = ?,
        down_payment_amount = ?,
        balance_due = ?,
        contract_type = COALESCE(?, contract_type),
        notes = COALESCE(?, notes),
        valid_until = COALESCE(?, valid_until),
        updated_at = ?
      WHERE id = ?
    `).run(
      client_name ? client_name.trim() : null,
      partner_name ?? null,
      client_email ?? null,
      client_phone ?? null,
      event_date ?? null,
      event_time ?? null,
      event_venue ?? null,
      status ?? null,
      subtotal,
      discountAmount,
      total,
      pct,
      down_payment_amount,
      balance_due,
      contract_type ?? null,
      notes ?? null,
      valid_until ?? null,
      now,
      id
    );

    const updatedQuote = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(id) as any;
    const updatedItems = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ? ORDER BY sort_order ASC').all(id) as any[];

    // Sincronizar automáticamente cualquier pedido asociado en CRM Parejas (vlb_orders)
    const existingOrders = db.prepare(`
      SELECT * FROM vlb_orders 
      WHERE quote_id = ? OR (quote_number IS NOT NULL AND quote_number = ?)
    `).all(id, updatedQuote.quote_number || id) as any[];

    const finalClientName = (client_name && client_name.trim()) || updatedQuote.client_name;
    const finalPartnerName = partner_name !== undefined ? (partner_name ? partner_name.trim() : null) : updatedQuote.partner_name;
    const finalClientEmail = client_email !== undefined ? (client_email ? client_email.trim() : null) : updatedQuote.client_email;
    const finalClientPhone = client_phone !== undefined ? (client_phone ? client_phone.trim() : null) : updatedQuote.client_phone;
    const finalEventDate = event_date || updatedQuote.event_date;
    const finalEventVenue = event_venue !== undefined ? (event_venue ? event_venue.trim() : null) : updatedQuote.event_venue;

    const hasPap = updatedItems.some((i: any) => i.category === 'PAPELERIA');
    const hasStands = updatedItems.some((i: any) => i.category === 'STANDS_EXPERIENCIAS');
    const finalServiceType = (hasPap && hasStands) ? 'MIXTO' : hasStands ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA';
    const itemsJson = JSON.stringify(updatedItems);

    let standsTotal = 0;
    let stationeryTotal = 0;
    for (const it of updatedItems) {
      const lineTotal = Number(it.total_price) || ((Number(it.unit_price) || 0) * (Number(it.quantity) || 1));
      if (it.category === 'PAPELERIA') {
        stationeryTotal += lineTotal;
      } else {
        standsTotal += lineTotal;
      }
    }
    const clientFullName = finalPartnerName ? `${finalClientName} & ${finalPartnerName}` : finalClientName;

    const evtTime = finalEventDate ? new Date(finalEventDate).getTime() : Date.now();
    const voboDeadline = new Date(evtTime - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deliveryDate = new Date(evtTime - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const setupDate = finalEventDate;

    for (const ord of existingOrders) {
      const currentPaid = Number(ord.total_paid) || 0;
      const newBalancePending = Math.max(0, total - currentPaid);
      const newPaymentStatus = (currentPaid >= total && total > 0)
        ? 'LIQUIDADO'
        : (currentPaid > 0 ? 'ANTICIPO_PAGADO' : 'ANTICIPO_PENDIENTE');

      // Actualizar tareas si existen según la nueva fecha
      let orderTasks: any[] = [];
      try {
        if (ord.tasks_json) orderTasks = JSON.parse(ord.tasks_json);
      } catch {}

      if (Array.isArray(orderTasks) && orderTasks.length > 0) {
        for (const t of orderTasks) {
          if (t.category === 'PAPELERIA') {
            if (t.title?.includes('VoBo') || t.title?.includes('Aprobación')) {
              t.due_date = voboDeadline;
            } else if (t.title?.includes('Taller') || t.title?.includes('Imprenta')) {
              t.due_date = new Date(evtTime - 14 * 86400000).toISOString().split('T')[0];
            } else if (t.title?.includes('Entrega')) {
              t.due_date = deliveryDate;
            }
          } else if (t.category === 'SERVICIO') {
            if (t.title?.includes('insumos') || t.title?.includes('bebidas')) {
              t.due_date = new Date(evtTime - 7 * 86400000).toISOString().split('T')[0];
            } else if (t.title?.includes('vinil')) {
              t.due_date = new Date(evtTime - 4 * 86400000).toISOString().split('T')[0];
            } else if (t.title?.includes('Audio')) {
              t.due_date = new Date(evtTime - 2 * 86400000).toISOString().split('T')[0];
            } else if (t.title?.includes('Montaje')) {
              t.due_date = setupDate;
            }
          }
        }
      }

      db.prepare(`
        UPDATE vlb_orders SET
          client_name = ?,
          partner_name = ?,
          client_email = ?,
          client_phone = ?,
          event_date = ?,
          event_venue = ?,
          total_amount = ?,
          down_payment_required = ?,
          balance_pending = ?,
          payment_status = ?,
          service_type = ?,
          items_json = ?,
          vobo_design_deadline = ?,
          physical_delivery_date = ?,
          stand_setup_date = ?,
          tasks_json = ?,
          quote_number = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        finalClientName,
        finalPartnerName,
        finalClientEmail,
        finalClientPhone,
        finalEventDate,
        finalEventVenue,
        total,
        down_payment_amount,
        newBalancePending,
        newPaymentStatus,
        finalServiceType,
        itemsJson,
        voboDeadline,
        deliveryDate,
        setupDate,
        orderTasks.length > 0 ? JSON.stringify(orderTasks) : ord.tasks_json,
        updatedQuote.quote_number || null,
        now,
        ord.id
      );

      // Sincronizar nómina & liquidación de evento en vlb_event_settlements
      const existingSettlement = db.prepare('SELECT id FROM vlb_event_settlements WHERE order_id = ? OR quote_id = ?').get(ord.id, id);
      if (existingSettlement) {
        db.prepare(`
          UPDATE vlb_event_settlements SET
            event_name = ?,
            event_date = ?,
            venue = ?,
            service_amount = ?,
            stands_amount = ?,
            stationery_amount = ?,
            updated_at = ?
          WHERE order_id = ? OR quote_id = ?
        `).run(
          clientFullName,
          finalEventDate,
          finalEventVenue || 'Por definir',
          total,
          standsTotal,
          stationeryTotal,
          now,
          ord.id,
          id
        );
      } else {
        const setId = 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        try {
          db.prepare(`
            INSERT INTO vlb_event_settlements (
              id, order_id, quote_id, event_name, event_date, venue, service_amount,
              stands_amount, stationery_amount, freight_charged, extra_services,
              supplies_expense, supplies_services_expense, supplies_stationery_expense, supplies_breakdown_json,
              car_provider, stationery_provider, stationery_labor_payout,
              staff_scarlette, staff_victoria, external_staff_count, external_staff_names, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            setId,
            ord.id,
            id,
            clientFullName,
            finalEventDate,
            finalEventVenue || 'Por definir',
            total,
            standsTotal,
            stationeryTotal,
            0, 0, 0, 0, 0, null,
            'NINGUNA_EXTERNO',
            stationeryTotal > 0 ? 'SCARLETTE' : 'NINGUNA',
            0, 0, 0, 0, null, 'PENDIENTE', `Pedido ${ord.order_number}`, now, now
          );
        } catch {}
      }
    }

    // Si la cotización ya estaba marcada como CONVERTIDA y no tenía orden creada, crearla
    if (updatedQuote.status === 'CONVERTIDA' && existingOrders.length === 0) {
      const order_number = generateNextVlbOrderNumber();
      const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      
      const initialTasks: any[] = [];
      if (hasPap) {
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
          due_time: '14:00',
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
          stand_setup_date, stand_setup_time, notes, service_type, tasks_json, items_json, quote_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        order_number,
        id,
        finalClientName,
        finalPartnerName,
        finalClientEmail,
        finalClientPhone,
        finalEventDate,
        finalEventVenue,
        total,
        down_payment_amount,
        0,
        total,
        'ANTICIPO_PENDIENTE',
        'DISENO_EN_PROCESO',
        voboDeadline,
        deliveryDate,
        setupDate,
        '14:00',
        `Convertido desde cotización ${updatedQuote.quote_number}.`,
        finalServiceType,
        JSON.stringify(initialTasks),
        itemsJson,
        updatedQuote.quote_number || null,
        now,
        now
      );
    }

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

// POST /api/vlb/quotes/:id/shorten - Generar o recuperar liga corta (TinyURL sin lazo)
router.post('/quotes/:id/shorten', async (req, res) => {
  try {
    const { id } = req.params;
    const short_url = await getOrGenerateShortUrl(id);
    res.json({ short_url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al acortar URL.' });
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

    const existingOrder = db.prepare('SELECT * FROM vlb_orders WHERE quote_id = ?').get(id) as any;
    if (existingOrder) {
      // Sincronizar el pedido existente en lugar de duplicarlo
      const currentPaid = Number(existingOrder.total_paid) || 0;
      const newBalancePending = Math.max(0, quote.total - currentPaid);
      const newPaymentStatus = (currentPaid >= quote.total && quote.total > 0)
        ? 'LIQUIDADO'
        : (currentPaid > 0 ? 'ANTICIPO_PAGADO' : 'ANTICIPO_PENDIENTE');

      db.prepare(`
        UPDATE vlb_orders SET
          client_name = ?,
          partner_name = ?,
          client_email = ?,
          client_phone = ?,
          event_date = ?,
          event_venue = ?,
          total_amount = ?,
          down_payment_required = ?,
          balance_pending = ?,
          payment_status = ?,
          service_type = ?,
          items_json = ?,
          quote_number = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        quote.client_name,
        quote.partner_name,
        quote.client_email,
        quote.client_phone,
        quote.event_date || existingOrder.event_date,
        quote.event_venue,
        quote.total,
        quote.down_payment_amount,
        newBalancePending,
        newPaymentStatus,
        service_type,
        JSON.stringify(quoteItems),
        quote.quote_number || null,
        now,
        existingOrder.id
      );

      db.prepare("UPDATE vlb_quotes SET status = 'CONVERTIDA', updated_at = ? WHERE id = ?").run(now, id);
      const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(existingOrder.id);
      return res.status(200).json({ order, message: `Proyecto ${existingOrder.order_number} sincronizado con éxito en CRM Parejas.` });
    }

    const order_number = generateNextVlbOrderNumber();
    const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

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
        stand_setup_date, stand_setup_time, notes, service_type, tasks_json, items_json, quote_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      quote.quote_number || null,
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

function enrichVlbOrder(o: any) {
  let items: any[] = [];
  try {
    if (o.items_json) {
      items = JSON.parse(o.items_json);
    } else if (o.quote_id) {
      items = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ? ORDER BY sort_order ASC').all(o.quote_id);
      db.prepare('UPDATE vlb_orders SET items_json = ? WHERE id = ?').run(JSON.stringify(items), o.id);
    }
  } catch {}

  let service_type = o.service_type;
  if (!service_type) {
    const hasPap = items.some(i => i.category === 'PAPELERIA');
    const hasStands = items.some(i => i.category === 'STANDS_EXPERIENCIAS');
    service_type = (hasPap && hasStands) ? 'MIXTO' : hasStands ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA';
    try {
      db.prepare('UPDATE vlb_orders SET service_type = ? WHERE id = ?').run(service_type, o.id);
    } catch {}
  }

  let tasks: any[] = [];
  try {
    if (o.tasks_json) {
      tasks = JSON.parse(o.tasks_json);
    }
  } catch {}

  if (!tasks || tasks.length === 0) {
    const evt = o.event_date ? new Date(o.event_date).getTime() : Date.now();
    let templates: any[] = [];
    try {
      templates = db.prepare('SELECT * FROM vlb_task_templates ORDER BY sort_order ASC').all();
    } catch {}

    if (templates && templates.length > 0) {
      for (const tpl of templates) {
        if (
          (tpl.category === 'PAPELERIA' && (service_type === 'PAPELERIA' || service_type === 'MIXTO')) ||
          (tpl.category === 'SERVICIO' && (service_type === 'STANDS_EXPERIENCIAS' || service_type === 'MIXTO'))
        ) {
          const dueDate = new Date(evt - (tpl.days_before_event || 0) * 86400000).toISOString().split('T')[0];
          tasks.push({
            id: 't_' + tpl.id + '_' + o.id,
            title: tpl.title,
            due_date: dueDate,
            due_time: tpl.default_time || '',
            completed: false,
            category: tpl.category,
            notes: tpl.notes || ''
          });
        }
      }
    } else {
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
    try {
      db.prepare('UPDATE vlb_orders SET tasks_json = ? WHERE id = ?').run(JSON.stringify(tasks), o.id);
    } catch {}
  }

  // Ensure clean, elegant folio
  let cleanOrderNumber = o.order_number;
  if (cleanOrderNumber && cleanOrderNumber.startsWith('ORD-VLB-')) {
    cleanOrderNumber = cleanOrderNumber.replace(/^ORD-VLB-\d{4}-/, 'VLB-');
    try {
      db.prepare('UPDATE vlb_orders SET order_number = ? WHERE id = ?').run(cleanOrderNumber, o.id);
    } catch {}
  }

  return {
    ...o,
    order_number: cleanOrderNumber,
    service_type,
    items,
    tasks
  };
}

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

    const orders = rawOrders.map(o => enrichVlbOrder(o));

    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al listar proyectos de CRM.' });
  }
});

// GET /api/vlb/orders/:id - Get single order with payments and documents
router.get('/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const rawOrder = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id) as any;
    if (!rawOrder) {
      return res.status(404).json({ error: 'Pedido / Pareja no encontrada.' });
    }

    const order = enrichVlbOrder(rawOrder);

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
    if (order.quote_id) {
      quote = db.prepare('SELECT * FROM vlb_quotes WHERE id = ?').get(order.quote_id);
    }

    res.json({
      order,
      payments,
      documents,
      quote,
      quoteItems: order.items || []
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

// GET /api/vlb/orders/:id/packing-list - Checklist de Carga / Packing de Evento (Día D)
router.get('/orders/:id/packing-list', (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id) as any;
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    const forceRegenerate = req.query.regenerate === 'true';

    // Si la orden es exclusivamente de papelería social, Carga al Auto no aplica
    if (order.service_type === 'PAPELERIA') {
      return res.json({
        packingList: [],
        packing_list: [],
        orderNumber: order.order_number,
        clientName: order.client_name,
        partnerName: order.partner_name,
        eventDate: order.event_date,
        eventVenue: order.event_venue,
        serviceType: order.service_type,
        isServiceEvent: false,
        message: 'Este pedido es exclusivamente de papelería social y no requiere checklist de carga al auto.'
      });
    }

    let packingList: any[] = [];
    if (!forceRegenerate && order.packing_list_json) {
      try {
        const parsed = JSON.parse(order.packing_list_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          packingList = parsed.map((it: any) => ({
            ...it,
            name: it.name || it.item_name || 'Elemento',
            item_name: it.item_name || it.name || 'Elemento'
          }));
        }
      } catch {}
    }

    if (!packingList || packingList.length === 0) {
      // Auto-generar checklist inteligente con artículos contratados + kit indispensable para el auto
      let items: any[] = [];
      if (order.items_json) {
        try { items = JSON.parse(order.items_json); } catch {}
      } else if (order.quote_id) {
        items = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ?').all(order.quote_id);
      }

      // 1. Partidas y artículos específicos del evento (solo servicios/stands)
      for (const it of items) {
        if (it.category === 'STANDS_EXPERIENCIAS' || it.category === 'SERVICIOS' || it.category === 'STANDS') {
          const itemName = `${it.pricing_type === 'PER_PIECE' ? `${it.quantity}x ` : ''}${it.item_name}`;
          packingList.push({
            id: 'pack_it_' + (it.id || Math.random().toString(36).substring(2, 7)),
            name: itemName,
            item_name: itemName,
            category: 'Mobiliario / Stand',
            packed: false,
            notes: 'Verificar armado, estructura y limpieza'
          });
        }
      }

      // Si es mixto y también lleva papelería al venue
      const hasPapeleria = items.some(i => i.category === 'PAPELERIA') || order.service_type === 'MIXTO';
      if (hasPapeleria) {
        packingList.push({
          id: 'pack_it_pap_' + Math.random().toString(36).substring(2, 7),
          name: 'Caja(s) con Papelería Social y menús/sobres empacados',
          item_name: 'Caja(s) con Papelería Social y menús/sobres empacados',
          category: 'Papelería',
          packed: false,
          notes: 'Empacado con protección para traslado'
        });
      }

      // Si no hubo partidas específicas registradas de stands, agregar el mobiliario base
      const hasStands = items.some(i => i.category === 'STANDS_EXPERIENCIAS' || i.category === 'SERVICIOS' || i.category === 'STANDS');
      if (!hasStands) {
        packingList.push({
          id: 'pack_it_main_' + Math.random().toString(36).substring(2, 7),
          name: 'Estructuras y material principal de stand / barra',
          item_name: 'Estructuras y material principal de stand / barra',
          category: 'Mobiliario / Stand',
          packed: false,
          notes: 'Verificar estructura, accesorios y limpieza'
        });
      }

      // 2. Kit de Logística y Herramientas Indispensables para el Auto (Exclusivo de Servicios)
      const essentialKit = [
        { name: 'Caballete(s) y bases de soporte pesadas', cat: 'Estructuras', notes: 'Para letreros de bienvenida y seating chart' },
        { name: 'Caja de herramientas de montaje (tijeras, cinta doble cara, cúter, masking)', cat: 'Herramientas', notes: 'Indispensable en cajuela' },
        { name: 'Extensiones eléctricas uso rudo & multicontacto', cat: 'Eléctrico', notes: 'Mínimo 15m para áreas abiertas' },
        { name: 'Paños de microfibra & limpiador para acrílicos y vidrio', cat: 'Limpieza', notes: 'Dejar todo impecable en venue' },
        { name: 'Kit de emergencia de lacre, encendedor y silicón', cat: 'Emergencia', notes: 'Para cualquier imprevisto' },
        { name: 'Hielera con insumos / botánicos / jarabes / hielo', cat: 'Bebidas', notes: 'Bien refrigerado antes de salir' },
        { name: 'Audio Guestbook: Teléfono, instructivo enmarcado y batería', cat: 'Audio Guestbook', notes: 'Verificar batería 100% y memoria' }
      ];

      for (const kit of essentialKit) {
        packingList.push({
          id: 'pack_kit_' + Math.random().toString(36).substring(2, 7),
          name: kit.name,
          item_name: kit.name,
          category: kit.cat,
          packed: false,
          notes: kit.notes
        });
      }

      try {
        db.prepare('UPDATE vlb_orders SET packing_list_json = ? WHERE id = ?').run(JSON.stringify(packingList), id);
      } catch {}
    }

    res.json({
      packingList,
      packing_list: packingList,
      orderNumber: order.order_number,
      clientName: order.client_name,
      partnerName: order.partner_name,
      eventDate: order.event_date,
      eventVenue: order.event_venue,
      serviceType: order.service_type
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener checklist de carga.' });
  }
});

// PUT /api/vlb/orders/:id/packing-list - Guardar checklist de carga
router.put('/orders/:id/packing-list', (req, res) => {
  try {
    const { id } = req.params;
    const rawList = req.body.packingList || req.body.packing_list;
    if (!Array.isArray(rawList)) {
      return res.status(400).json({ error: 'Formato inválido de checklist.' });
    }
    const packingList = rawList.map((it: any) => ({
      ...it,
      name: it.name || it.item_name || 'Elemento',
      item_name: it.item_name || it.name || 'Elemento'
    }));
    const now = new Date().toISOString();
    db.prepare('UPDATE vlb_orders SET packing_list_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(packingList),
      now,
      id
    );
    res.json({ success: true, packingList, packing_list: packingList, message: 'Checklist de carga actualizado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. PLANTILLAS MAESTRAS DE ACTIVIDADES (Configurables por el Usuario)
// ==========================================

// GET /api/vlb/task-templates - Listar plantillas maestras
router.get('/task-templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM vlb_task_templates ORDER BY category ASC, sort_order ASC').all();
    res.json({ templates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vlb/task-templates - Crear nueva actividad maestra
router.post('/task-templates', (req, res) => {
  try {
    const { category, title, days_before_event = 7, default_time = '', notes = '' } = req.body;
    if (!title || !title.trim() || !category) {
      return res.status(400).json({ error: 'Título y categoría son requeridos.' });
    }
    const id = 'tpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const countRow = db.prepare('SELECT COUNT(*) as count FROM vlb_task_templates WHERE category = ?').get(category) as { count: number };
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO vlb_task_templates (id, category, title, days_before_event, default_time, notes, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, category, title.trim(), Number(days_before_event) || 0, default_time, notes.trim(), countRow.count + 1, now);
    const template = db.prepare('SELECT * FROM vlb_task_templates WHERE id = ?').get(id);
    res.json({ template });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/vlb/task-templates - Guardar todas las plantillas maestras
router.put('/task-templates', (req, res) => {
  try {
    const { templates } = req.body;
    if (!Array.isArray(templates)) {
      return res.status(400).json({ error: 'Se esperaba un arreglo de plantillas.' });
    }
    db.prepare('DELETE FROM vlb_task_templates').run();
    const insert = db.prepare(`
      INSERT INTO vlb_task_templates (id, category, title, days_before_event, default_time, notes, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      insert.run(
        t.id || ('tpl_' + Date.now() + '_' + i),
        t.category,
        t.title.trim(),
        Number(t.days_before_event) || 0,
        t.default_time || '',
        t.notes || '',
        i + 1,
        now
      );
    }
    const updated = db.prepare('SELECT * FROM vlb_task_templates ORDER BY category ASC, sort_order ASC').all();
    res.json({ templates: updated, message: 'Lista maestra de actividades guardada.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/vlb/task-templates/:id - Actualizar una actividad maestra
router.put('/task-templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, days_before_event, default_time, notes, category } = req.body;
    const existing = db.prepare('SELECT * FROM vlb_task_templates WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Actividad maestra no encontrada.' });
    }
    const finalTitle = title !== undefined ? title.trim() : existing.title;
    const finalDays = days_before_event !== undefined ? (Number(days_before_event) || 0) : existing.days_before_event;
    const finalTime = default_time !== undefined ? default_time : existing.default_time;
    const finalNotes = notes !== undefined ? notes.trim() : existing.notes;
    const finalCat = category !== undefined ? category : existing.category;

    db.prepare(`
      UPDATE vlb_task_templates
      SET title = ?, days_before_event = ?, default_time = ?, notes = ?, category = ?
      WHERE id = ?
    `).run(finalTitle, finalDays, finalTime, finalNotes, finalCat, id);

    const template = db.prepare('SELECT * FROM vlb_task_templates WHERE id = ?').get(id);
    res.json({ template, message: 'Actividad maestra actualizada.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vlb/task-templates/:id - Eliminar actividad maestra
router.delete('/task-templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM vlb_task_templates WHERE id = ?').run(id);
    res.json({ success: true, message: 'Actividad maestra eliminada.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vlb/orders/:id/apply-templates - Re-aplicar actividades desde la plantilla maestra
router.post('/orders/:id/apply-templates', (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id) as any;
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    const templates = db.prepare('SELECT * FROM vlb_task_templates ORDER BY sort_order ASC').all() as any[];
    const evt = order.event_date ? new Date(order.event_date).getTime() : Date.now();
    const sType = order.service_type || 'PAPELERIA';

    const tasks: any[] = [];
    for (const tpl of templates) {
      if (
        (tpl.category === 'PAPELERIA' && (sType === 'PAPELERIA' || sType === 'MIXTO')) ||
        (tpl.category === 'SERVICIO' && (sType === 'STANDS_EXPERIENCIAS' || sType === 'MIXTO'))
      ) {
        const dueDate = new Date(evt - (tpl.days_before_event || 0) * 86400000).toISOString().split('T')[0];
        tasks.push({
          id: 't_' + tpl.id + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          title: tpl.title,
          due_date: dueDate,
          due_time: tpl.default_time || '',
          completed: false,
          category: tpl.category,
          notes: tpl.notes || ''
        });
      }
    }

    db.prepare('UPDATE vlb_orders SET tasks_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(tasks),
      new Date().toISOString(),
      id
    );

    res.json({ success: true, tasks, message: 'Actividades actualizadas con la plantilla maestra.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      down_payment_covered = false,
      service_type,
      items = [],
      stands_amount,
      stationery_amount,
      supplies_expense = 0,
      car_provider = 'NINGUNA_EXTERNO',
      external_staff_count = 0,
      external_staff_names,
      vobo_design_deadline,
      physical_delivery_date,
      stand_setup_date,
      stand_setup_time,
      notes
    } = req.body;

    if (!client_name || !event_date) {
      return res.status(400).json({ error: 'Nombre de la clienta y fecha del evento son requeridos.' });
    }

    const order_number = generateNextVlbOrderNumber();

    // Calcular montos a partir de los conceptos contratados
    let standsSum = Number(stands_amount) || 0;
    let stationerySum = Number(stationery_amount) || 0;

    if (Array.isArray(items) && items.length > 0) {
      standsSum = 0;
      stationerySum = 0;
      for (const it of items) {
        const lineTotal = Number(it.total_price) || ((Number(it.quantity) || 1) * (Number(it.unit_price) || 0));
        if (it.category === 'PAPELERIA') {
          stationerySum += lineTotal;
        } else {
          standsSum += lineTotal;
        }
      }
    }

    const itemsTotal = standsSum + stationerySum;
    const total = itemsTotal > 0 ? itemsTotal : (Number(total_amount) || 0);

    let finalServiceType = service_type;
    if (!finalServiceType || finalServiceType === 'MIXTO') {
      if (standsSum > 0 && stationerySum > 0) finalServiceType = 'MIXTO';
      else if (standsSum > 0) finalServiceType = 'STANDS_EXPERIENCIAS';
      else if (stationerySum > 0) finalServiceType = 'PAPELERIA';
      else finalServiceType = 'MIXTO';
    }

    const id = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const downPayment = down_payment_required !== undefined ? Number(down_payment_required) : (total * 0.5);
    const initialPaid = down_payment_covered ? downPayment : 0;
    const balancePending = Math.max(0, total - initialPaid);
    const initialStatus = initialPaid >= total && total > 0
      ? 'LIQUIDADO'
      : (initialPaid > 0 ? 'ANTICIPO_PAGADO' : 'ANTICIPO_PENDIENTE');
    const now = new Date().toISOString();

    const itemsJson = Array.isArray(items) && items.length > 0 ? JSON.stringify(items) : null;

    db.prepare(`
      INSERT INTO vlb_orders (
        id, order_number, client_name, partner_name, client_email, client_phone,
        event_date, event_venue, total_amount, down_payment_required, total_paid, balance_pending,
        payment_status, production_status, service_type, items_json, vobo_design_deadline, physical_delivery_date,
        stand_setup_date, stand_setup_time, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      initialPaid,
      balancePending,
      initialStatus,
      'DISENO_EN_PROCESO',
      finalServiceType,
      itemsJson,
      vobo_design_deadline || null,
      physical_delivery_date || null,
      stand_setup_date || event_date,
      stand_setup_time || '14:00',
      notes || null,
      now,
      now
    );

    // Si el anticipo ya fue cubierto, registrar pago en vlb_payments
    if (initialPaid > 0) {
      const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      db.prepare(`
        INSERT INTO vlb_payments (
          id, order_id, amount, payment_type, payment_method, payment_date, reference_num, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        id,
        initialPaid,
        'ANTICIPO_50',
        'SPEI',
        now.split('T')[0],
        'Anticipo inicial al registrar evento',
        'Registro inicial desde CRM Parejas',
        now
      );
    }

    // Vincular y registrar inmediatamente la liquidación en vlb_event_settlements para nómina y reparto
    const setId = 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const clientFullName = partner_name ? `${client_name.trim()} & ${partner_name.trim()}` : client_name.trim();

    let calcStands = standsSum;
    let calcStationery = stationerySum;
    if (calcStands === 0 && calcStationery === 0) {
      if (finalServiceType === 'PAPELERIA') {
        calcStationery = total;
      } else {
        calcStands = total;
      }
    }

    const supExpense = Number(supplies_expense) || 0;
    const supServ = finalServiceType === 'PAPELERIA' ? 0 : supExpense;
    const supStat = finalServiceType === 'PAPELERIA' ? supExpense : 0;

    try {
      db.prepare(`
        INSERT INTO vlb_event_settlements (
          id, order_id, quote_id, event_name, event_date, venue, service_amount,
          stands_amount, stationery_amount, freight_charged, extra_services,
          supplies_expense, supplies_services_expense, supplies_stationery_expense, supplies_breakdown_json,
          car_provider, stationery_provider, stationery_labor_payout,
          staff_scarlette, staff_victoria, external_staff_count, external_staff_names, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        setId,
        id,
        null,
        clientFullName,
        event_date,
        event_venue || 'Por definir',
        total,
        calcStands,
        calcStationery,
        0,
        0,
        supExpense,
        supServ,
        supStat,
        null,
        car_provider || 'NINGUNA_EXTERNO',
        calcStationery > 0 ? 'SCARLETTE' : 'NINGUNA',
        0,
        0,
        0,
        Number(external_staff_count) || 0,
        external_staff_names ? external_staff_names.trim() : null,
        'PENDIENTE',
        notes || `Pedido ${order_number}`,
        now,
        now
      );
    } catch (settleErr) {
      console.error('Error al sincronizar liquidación automática al crear orden:', settleErr);
    }

    const order = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(id);
    res.status(201).json({ order, settlement_id: setId });
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
      partner_name ?? null,
      client_email ?? null,
      client_phone ?? null,
      event_date ?? null,
      event_venue ?? null,
      total,
      downPayment,
      balancePending,
      updatedPaymentStatus,
      production_status ?? null,
      vobo_design_deadline ?? null,
      physical_delivery_date ?? null,
      stand_setup_date ?? null,
      stand_setup_time ?? null,
      notes ?? null,
      now,
      id
    );

    // Sincronizar cambios básicos de vuelta a vlb_quotes si tiene cotización asociada
    if (existing.quote_id) {
      try {
        db.prepare(`
          UPDATE vlb_quotes SET
            client_name = COALESCE(?, client_name),
            partner_name = COALESCE(?, partner_name),
            client_email = COALESCE(?, client_email),
            client_phone = COALESCE(?, client_phone),
            event_date = COALESCE(?, event_date),
            event_venue = COALESCE(?, event_venue),
            updated_at = ?
          WHERE id = ?
        `).run(
          client_name ? client_name.trim() : null,
          partner_name ?? null,
          client_email ?? null,
          client_phone ?? null,
          event_date ?? null,
          event_venue ?? null,
          now,
          existing.quote_id
        );
      } catch {}
    }

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

    // Sincronizar cotización si el pedido proviene de una cotización
    if (order.quote_id) {
      db.prepare(`
        UPDATE vlb_quotes SET
          total_paid = ?,
          balance_due = ?,
          payment_status = ?,
          updated_at = ?
        WHERE id = ?
      `).run(totalPaid, balancePending, paymentStatus, now, order.quote_id);
    }

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

      if (order.quote_id) {
        db.prepare(`
          UPDATE vlb_quotes SET
            total_paid = ?,
            balance_due = ?,
            payment_status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(totalPaid, balancePending, paymentStatus, now, order.quote_id);
      }
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
    `).run(vobo_status, approvedAt, vobo_notes ?? null, id);

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

// ========================================================
// SUBMÓDULO FINANCIERO PRIVADO (NÓMINA, GASTOS & REPARTO)
// ACCESO EXCLUSIVO: ADMINISTRADOR (SCARLETTE) CON PIN
// ========================================================

// Middleware de verificación estricta de Super Admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Acceso estrictamente reservado para la Dirección (Administrador).' });
  }
  next();
};

// GET /api/vlb/finance/settings - Consultar tarifas operativas y porcentajes de reparto
router.get('/finance/settings', authenticateToken, requireAdmin, (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM vlb_finance_settings WHERE id = ?').get('default') as any;
    if (!settings) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO vlb_finance_settings (id, staff_rate, freight_rate, stationery_rate, stationery_labor_pct, company_fund_pct, partners_profit_pct, pin_code, updated_at)
        VALUES ('default', 450, 500, 200, 25, 60, 40, '2711', ?)
      `).run(now);
      settings = db.prepare('SELECT * FROM vlb_finance_settings WHERE id = ?').get('default') as any;
    }

    const { pin_code, ...publicSettings } = settings;
    res.json({
      settings: {
        ...publicSettings,
        staff_rate: Number(settings.staff_rate) || 450,
        freight_rate: Number(settings.freight_rate) || 500,
        stationery_rate: Number(settings.stationery_rate) || 200,
        stationery_labor_pct: Number(settings.stationery_labor_pct) || 25,
        company_fund_pct: Number(settings.company_fund_pct) || 60,
        partners_profit_pct: Number(settings.partners_profit_pct) || 40,
        has_pin: Boolean(pin_code)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener configuración financiera.' });
  }
});

// PUT /api/vlb/finance/settings - Modificar tarifas fijas o cambiar PIN de acceso
router.put('/finance/settings', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      staff_rate,
      freight_rate,
      stationery_rate,
      stationery_labor_pct,
      company_fund_pct,
      partners_profit_pct,
      new_pin
    } = req.body;

    const current = db.prepare('SELECT * FROM vlb_finance_settings WHERE id = ?').get('default') as any;
    const staffRate = Number(staff_rate) >= 0 ? Number(staff_rate) : (current?.staff_rate ?? 450);
    const freightRate = Number(freight_rate) >= 0 ? Number(freight_rate) : (current?.freight_rate ?? 500);
    const stationeryRate = Number(stationery_rate) >= 0 ? Number(stationery_rate) : (current?.stationery_rate ?? 200);
    const stationeryLaborPct = Number(stationery_labor_pct) >= 0 ? Number(stationery_labor_pct) : (current?.stationery_labor_pct ?? 25);
    const fundPct = Number(company_fund_pct) >= 0 ? Number(company_fund_pct) : (current?.company_fund_pct ?? 60);
    const profitPct = Number(partners_profit_pct) >= 0 ? Number(partners_profit_pct) : (current?.partners_profit_pct ?? 40);
    const pin = (typeof new_pin === 'string' && new_pin.trim().length >= 4) ? new_pin.trim() : (current?.pin_code || '2711');
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE vlb_finance_settings
      SET staff_rate = ?, freight_rate = ?, stationery_rate = ?, stationery_labor_pct = ?, company_fund_pct = ?, partners_profit_pct = ?, pin_code = ?, updated_at = ?
      WHERE id = 'default'
    `).run(staffRate, freightRate, stationeryRate, stationeryLaborPct, fundPct, profitPct, pin, now);

    res.json({
      message: 'Tarifas y configuración financiera actualizadas exitosamente.',
      settings: {
        id: 'default',
        staff_rate: staffRate,
        freight_rate: freightRate,
        stationery_rate: stationeryRate,
        stationery_labor_pct: stationeryLaborPct,
        company_fund_pct: fundPct,
        partners_profit_pct: profitPct,
        has_pin: true,
        updated_at: now
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar configuración.' });
  }
});

// POST /api/vlb/finance/verify-pin - Validar PIN de seguridad privada
router.post('/finance/verify-pin', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { pin } = req.body;
    const settings = db.prepare('SELECT pin_code FROM vlb_finance_settings WHERE id = ?').get('default') as any;
    const validPin = settings?.pin_code || '2711';
    const isValid = String(pin).trim() === String(validPin).trim();

    if (!isValid) {
      return res.status(401).json({ valid: false, error: 'PIN de seguridad incorrecto.' });
    }

    res.json({ valid: true, message: 'Acceso autorizado al submódulo financiero.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al validar PIN.' });
  }
});

// Helper para desglosar importes de un pedido entre Stands & Servicios y Papelería Social
function calculateOrderAmounts(o: any) {
  let items: any[] = [];
  if (o.items_json) {
    try { items = JSON.parse(o.items_json); } catch {}
  } else if (o.quote_id) {
    try {
      items = db.prepare('SELECT * FROM vlb_quote_items WHERE quote_id = ?').all(o.quote_id) as any[];
    } catch {}
  }

  let stationeryTotal = 0;
  let standsTotal = 0;
  for (const it of items) {
    const lineTotal = Number(it.total_price) || (Number(it.unit_price) * (Number(it.quantity) || 1)) || 0;
    if (it.category === 'PAPELERIA') {
      stationeryTotal += lineTotal;
    } else {
      standsTotal += lineTotal;
    }
  }

  const orderTotal = Number(o.total_amount) || 0;
  const itemsSum = stationeryTotal + standsTotal;
  if (itemsSum > 0 && orderTotal > 0 && Math.abs(itemsSum - orderTotal) > 1) {
    const ratio = orderTotal / itemsSum;
    stationeryTotal = Math.round(stationeryTotal * ratio * 100) / 100;
    standsTotal = Math.round((orderTotal - stationeryTotal) * 100) / 100;
  } else if (itemsSum === 0) {
    standsTotal = orderTotal;
    stationeryTotal = 0;
  }

  return { standsTotal, stationeryTotal };
}

// GET /api/vlb/finance/settlements - Listar liquidaciones de eventos con sincronización automática de pedidos
router.get('/finance/settlements', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Sincronizar automáticamente pedidos de vlb_orders que no tengan liquidación creada
    const unSyncedOrders = db.prepare(`
      SELECT o.* 
      FROM vlb_orders o 
      WHERE o.id NOT IN (SELECT order_id FROM vlb_event_settlements WHERE order_id IS NOT NULL)
    `).all() as any[];

    if (unSyncedOrders.length > 0) {
      const now = new Date().toISOString();
      const insertStmt = db.prepare(`
        INSERT INTO vlb_event_settlements (
          id, order_id, quote_id, event_name, event_date, venue, service_amount,
          stands_amount, stationery_amount, freight_charged, extra_services,
          supplies_expense, supplies_services_expense, supplies_stationery_expense, supplies_breakdown_json,
          car_provider, stationery_provider, stationery_labor_payout,
          staff_scarlette, staff_victoria, external_staff_count, external_staff_names, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const o of unSyncedOrders) {
        const clientName = o.partner_name ? `${o.client_name} & ${o.partner_name}` : o.client_name;
        const setId = 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const { standsTotal, stationeryTotal } = calculateOrderAmounts(o);
        insertStmt.run(
          setId,
          o.id,
          o.quote_id || null,
          clientName,
          o.event_date || now.split('T')[0],
          o.event_venue || 'Por definir',
          Number(o.total_amount) || 0,
          standsTotal,
          stationeryTotal,
          0,
          0,
          0,
          0,
          0,
          null,
          'NINGUNA_EXTERNO',
          'NINGUNA',
          0,
          0,
          0,
          0,
          null,
          'PENDIENTE',
          `Pedido ${o.order_number || 'VLB'}`,
          now,
          now
        );
      }
    }

    // Auto-sanear registros huérfanos o con datos inconsistentes de papelería
    try {
      db.prepare(`
        UPDATE vlb_event_settlements 
        SET stationery_provider = 'NINGUNA', stationery_labor_payout = 0 
        WHERE (stationery_amount <= 0 OR stationery_amount IS NULL) 
          AND (stationery_provider IS NOT NULL AND stationery_provider != 'NINGUNA')
      `).run();
    } catch {}

    const settlements = db.prepare(`
      SELECT s.*, o.order_number, o.payment_status as order_payment_status, o.total_paid as order_total_paid
      FROM vlb_event_settlements s
      LEFT JOIN vlb_orders o ON o.id = s.order_id
      ORDER BY s.event_date DESC, s.created_at DESC
    `).all() as any[];

    // Auto-completar desglose de pedidos existentes sin división previa
    for (const s of settlements) {
      if ((!s.stands_amount && !s.stationery_amount) && s.order_id) {
        const ord = db.prepare('SELECT * FROM vlb_orders WHERE id = ?').get(s.order_id) as any;
        if (ord) {
          const { standsTotal, stationeryTotal } = calculateOrderAmounts(ord);
          const finalStatProv = stationeryTotal > 0 ? (s.stationery_provider || 'NINGUNA') : 'NINGUNA';
          const finalStatLabor = stationeryTotal > 0 ? (s.stationery_labor_payout || 0) : 0;
          db.prepare('UPDATE vlb_event_settlements SET stands_amount = ?, stationery_amount = ?, stationery_provider = ?, stationery_labor_payout = ? WHERE id = ?')
            .run(standsTotal, stationeryTotal, finalStatProv, finalStatLabor, s.id);
          s.stands_amount = standsTotal;
          s.stationery_amount = stationeryTotal;
          s.stationery_provider = finalStatProv;
          s.stationery_labor_payout = finalStatLabor;
        }
      }
    }

    // Convertir booleanos de SQLite (0 y 1) a booleanos nativos de JS
    const formatted = settlements.map(s => {
      let standsAmt = Number(s.stands_amount) || 0;
      let statAmt = Number(s.stationery_amount) || 0;
      const servAmt = Number(s.service_amount) || 0;
      if (standsAmt === 0 && statAmt === 0 && servAmt > 0) {
        standsAmt = servAmt;
      }

      const suppliesServ = Number(s.supplies_services_expense) || 0;
      const suppliesStat = Number(s.supplies_stationery_expense) || 0;
      const suppliesTotal = (suppliesServ + suppliesStat > 0) ? (suppliesServ + suppliesStat) : (Number(s.supplies_expense) || 0);

      const cleanStatProvider = statAmt > 0 ? (s.stationery_provider || 'NINGUNA') : 'NINGUNA';
      const cleanStatLabor = statAmt > 0 ? (Number(s.stationery_labor_payout) || 0) : 0;

      return {
        ...s,
        staff_scarlette: Boolean(s.staff_scarlette),
        staff_victoria: Boolean(s.staff_victoria),
        paid_scarlette: Boolean(s.paid_scarlette),
        paid_victoria: Boolean(s.paid_victoria),
        paid_external: Boolean(s.paid_external),
        service_amount: servAmt,
        stands_amount: standsAmt,
        stationery_amount: statAmt,
        stationery_provider: cleanStatProvider,
        stationery_labor_payout: cleanStatLabor,
        freight_charged: Number(s.freight_charged) || 0,
        extra_services: Number(s.extra_services) || 0,
        supplies_expense: suppliesTotal,
        supplies_services_expense: suppliesServ,
        supplies_stationery_expense: suppliesStat,
        external_staff_count: Number(s.external_staff_count) || 0
      };
    });

    res.json({ settlements: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener liquidaciones de eventos.' });
  }
});

// POST /api/vlb/finance/settlements - Registrar manualmente un evento o liquidación extraordinaria
router.post('/finance/settlements', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      event_name,
      event_date,
      venue,
      service_amount,
      stands_amount,
      stationery_amount,
      freight_charged,
      extra_services,
      supplies_expense,
      supplies_services_expense,
      supplies_stationery_expense,
      supplies_breakdown_json,
      car_provider,
      stationery_provider,
      stationery_labor_payout,
      staff_scarlette,
      staff_victoria,
      external_staff_count,
      external_staff_names,
      status,
      notes,
      order_id
    } = req.body;

    if (!event_name || !event_name.trim()) {
      return res.status(400).json({ error: 'El nombre del evento es requerido.' });
    }
    if (!event_date || !event_date.trim()) {
      return res.status(400).json({ error: 'La fecha del evento es requerida.' });
    }

    const id = 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    const standsAmt = Number(stands_amount) || 0;
    const statAmt = Number(stationery_amount) || 0;
    const servAmt = (standsAmt + statAmt > 0) ? (standsAmt + statAmt) : (Number(service_amount) || 0);

    const supServ = Number(supplies_services_expense) || 0;
    const supStat = Number(supplies_stationery_expense) || 0;
    const supTot = (supServ + supStat > 0) ? (supServ + supStat) : (Number(supplies_expense) || 0);

    db.prepare(`
      INSERT INTO vlb_event_settlements (
        id, order_id, quote_id, event_name, event_date, venue, service_amount,
        stands_amount, stationery_amount, freight_charged, extra_services,
        supplies_expense, supplies_services_expense, supplies_stationery_expense, supplies_breakdown_json,
        car_provider, stationery_provider, stationery_labor_payout,
        staff_scarlette, staff_victoria, external_staff_count, external_staff_names, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      order_id || null,
      null,
      event_name.trim(),
      event_date.trim(),
      venue ? venue.trim() : '',
      servAmt,
      standsAmt,
      statAmt,
      Number(freight_charged) || 0,
      Number(extra_services) || 0,
      supTot,
      supServ,
      supStat,
      supplies_breakdown_json || null,
      car_provider || 'NINGUNA_EXTERNO',
      statAmt > 0 ? (stationery_provider || 'NINGUNA') : 'NINGUNA',
      statAmt > 0 ? (Number(stationery_labor_payout) || 0) : 0,
      staff_scarlette ? 1 : 0,
      staff_victoria ? 1 : 0,
      Number(external_staff_count) || 0,
      external_staff_names ? external_staff_names.trim() : null,
      status || 'PENDIENTE',
      notes || null,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM vlb_event_settlements WHERE id = ?').get(id) as any;
    res.status(201).json({
      settlement: {
        ...created,
        staff_scarlette: Boolean(created.staff_scarlette),
        staff_victoria: Boolean(created.staff_victoria),
        paid_scarlette: Boolean(created.paid_scarlette),
        paid_victoria: Boolean(created.paid_victoria),
        paid_external: Boolean(created.paid_external),
      },
      message: 'Liquidación de evento registrada exitosamente.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al crear liquidación.' });
  }
});

// PUT /api/vlb/finance/settlements/:id - Actualizar datos operativos, insumos, asistencia o fletes de un evento
router.put('/finance/settlements/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const {
      event_name,
      event_date,
      venue,
      service_amount,
      stands_amount,
      stationery_amount,
      freight_charged,
      extra_services,
      supplies_expense,
      supplies_services_expense,
      supplies_stationery_expense,
      supplies_breakdown_json,
      car_provider,
      stationery_provider,
      stationery_labor_payout,
      staff_scarlette,
      staff_victoria,
      external_staff_count,
      external_staff_names,
      status,
      notes
    } = req.body;

    const existing = db.prepare('SELECT id FROM vlb_event_settlements WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Registro de liquidación no encontrado.' });
    }

    const now = new Date().toISOString();

    const standsAmt = Number(stands_amount) || 0;
    const statAmt = Number(stationery_amount) || 0;
    const servAmt = (standsAmt + statAmt > 0) ? (standsAmt + statAmt) : (Number(service_amount) || 0);

    const supServ = Number(supplies_services_expense) || 0;
    const supStat = Number(supplies_stationery_expense) || 0;
    const supTot = (supServ + supStat > 0) ? (supServ + supStat) : (Number(supplies_expense) || 0);

    db.prepare(`
      UPDATE vlb_event_settlements
      SET event_name = ?, event_date = ?, venue = ?, service_amount = ?,
          stands_amount = ?, stationery_amount = ?, freight_charged = ?,
          extra_services = ?, supplies_expense = ?, supplies_services_expense = ?, supplies_stationery_expense = ?, supplies_breakdown_json = ?,
          car_provider = ?, stationery_provider = ?, stationery_labor_payout = ?,
          staff_scarlette = ?, staff_victoria = ?, external_staff_count = ?, external_staff_names = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      event_name.trim(),
      event_date.trim(),
      venue || '',
      servAmt,
      standsAmt,
      statAmt,
      Number(freight_charged) || 0,
      Number(extra_services) || 0,
      supTot,
      supServ,
      supStat,
      supplies_breakdown_json || null,
      car_provider || 'NINGUNA_EXTERNO',
      statAmt > 0 ? (stationery_provider || 'NINGUNA') : 'NINGUNA',
      statAmt > 0 ? (Number(stationery_labor_payout) || 0) : 0,
      staff_scarlette ? 1 : 0,
      staff_victoria ? 1 : 0,
      Number(external_staff_count) || 0,
      external_staff_names ? external_staff_names.trim() : null,
      status || 'PENDIENTE',
      notes || null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM vlb_event_settlements WHERE id = ?').get(id) as any;
    res.json({
      settlement: {
        ...updated,
        staff_scarlette: Boolean(updated.staff_scarlette),
        staff_victoria: Boolean(updated.staff_victoria),
        paid_scarlette: Boolean(updated.paid_scarlette),
        paid_victoria: Boolean(updated.paid_victoria),
        paid_external: Boolean(updated.paid_external),
      },
      message: 'Liquidación actualizada correctamente.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar liquidación.' });
  }
});

// PATCH /api/vlb/finance/settlements/:id/payout-toggle - Cambiar estado de dispersión/pago a Scarlette, Victoria o Staff
router.patch('/finance/settlements/:id/payout-toggle', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { target, paid } = req.body; // target: 'scarlette' | 'victoria' | 'external'
    const existing = db.prepare('SELECT * FROM vlb_event_settlements WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Registro de liquidación no encontrado.' });
    }

    const now = new Date().toISOString();
    let col = '';
    let colDate = '';
    if (target === 'scarlette') {
      col = 'paid_scarlette';
      colDate = 'paid_scarlette_at';
    } else if (target === 'victoria') {
      col = 'paid_victoria';
      colDate = 'paid_victoria_at';
    } else if (target === 'external') {
      col = 'paid_external';
      colDate = 'paid_external_at';
    } else {
      return res.status(400).json({ error: 'Target de pago inválido.' });
    }

    const currentVal = Boolean(existing[col]);
    const nextVal = paid !== undefined ? Boolean(paid) : !currentVal;
    const paidAt = nextVal ? now : null;

    db.prepare(`
      UPDATE vlb_event_settlements
      SET ${col} = ?, ${colDate} = ?, updated_at = ?
      WHERE id = ?
    `).run(nextVal ? 1 : 0, paidAt, now, id);

    const updated = db.prepare('SELECT * FROM vlb_event_settlements WHERE id = ?').get(id) as any;
    res.json({
      settlement: {
        ...updated,
        staff_scarlette: Boolean(updated.staff_scarlette),
        staff_victoria: Boolean(updated.staff_victoria),
        paid_scarlette: Boolean(updated.paid_scarlette),
        paid_victoria: Boolean(updated.paid_victoria),
        paid_external: Boolean(updated.paid_external),
      },
      message: `Pago de ${target} actualizado a ${nextVal ? 'PAGADO' : 'PENDIENTE'}.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar estado de dispersión.' });
  }
});

// DELETE /api/vlb/finance/settlements/:id - Eliminar liquidación
router.delete('/finance/settlements/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM vlb_event_settlements WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Registro de liquidación no encontrado.' });
    }

    db.prepare('DELETE FROM vlb_event_settlements WHERE id = ?').run(id);
    res.json({ message: 'Liquidación eliminada correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar liquidación.' });
  }
});

// POST /api/vlb/finance/sync-orders - Forzar sincronización manual de pedidos
router.post('/finance/sync-orders', authenticateToken, requireAdmin, (req, res) => {
  try {
    const unSyncedOrders = db.prepare(`
      SELECT o.* 
      FROM vlb_orders o 
      WHERE o.id NOT IN (SELECT order_id FROM vlb_event_settlements WHERE order_id IS NOT NULL)
    `).all() as any[];

    let importedCount = 0;
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO vlb_event_settlements (
        id, order_id, quote_id, event_name, event_date, venue, service_amount,
        freight_charged, extra_services, supplies_expense, car_provider, stationery_provider,
        staff_scarlette, staff_victoria, external_staff_count, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const o of unSyncedOrders) {
      const clientName = o.partner_name ? `${o.client_name} & ${o.partner_name}` : o.client_name;
      const setId = 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      insertStmt.run(
        setId,
        o.id,
        o.quote_id || null,
        clientName,
        o.event_date || now.split('T')[0],
        o.event_venue || 'Por definir',
        Number(o.total_amount) || 0,
        0,
        0,
        0,
        'NINGUNA_EXTERNO',
        'NINGUNA',
        0,
        0,
        0,
        'PENDIENTE',
        `Pedido ${o.order_number || 'VLB'}`,
        now,
        now
      );
      importedCount++;
    }

    res.json({ message: `Sincronización completa. ${importedCount} nuevo(s) evento(s) vinculado(s).`, importedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error en sincronización.' });
  }
});

export default router;
