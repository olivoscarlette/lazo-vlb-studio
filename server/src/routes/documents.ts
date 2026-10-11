import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess, logAudit } from '../middleware/auth.js';

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage: private storage with sanitized filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// GET /api/weddings/:weddingId/documents - List documents with metadata
router.get('/:weddingId/documents', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  const docs = db.prepare(`
    SELECT id, wedding_id, category, original_name, mime_type, file_size, notes, uploaded_by, created_at
    FROM documents
    WHERE wedding_id = ?
    ORDER BY created_at DESC
  `).all(weddingId);

  return res.json({ documents: docs });
});

// POST /api/weddings/:weddingId/documents - Upload document
router.post('/:weddingId/documents', authenticateToken, requireWeddingAccess, upload.single('file'), (req, res) => {
  const { weddingId } = req.params;
  const user = req.user!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No se adjuntó ningún archivo para subir.' });
  }

  const { category, notes } = req.body;
  const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO documents (id, wedding_id, category, original_name, stored_filename, mime_type, file_size, notes, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, weddingId, category || 'operativo', file.originalname,
    file.filename, file.mimetype, file.size, notes || null, user.name, now
  );

  logAudit(weddingId, user.id, user.name, 'SUBIR_DOCUMENTO', 'DOCUMENT', id, `Carga de archivo privado: ${file.originalname} (${category})`);

  return res.status(201).json({
    message: 'Documento subido y resguardado exitosamente.',
    document: {
      id,
      category: category || 'operativo',
      original_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      uploaded_by: user.name,
      created_at: now
    }
  });
});

// GET /api/weddings/:weddingId/documents/:documentId/download - Private authorized stream
router.get('/:weddingId/documents/:documentId/download', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, documentId } = req.params;

  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND wedding_id = ?').get(documentId, weddingId) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado o no pertenece a esta boda.' });
  }

  const filePath = path.join(UPLOADS_DIR, doc.stored_filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'El archivo físico no se encuentra en el servidor.' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_name)}"`);
  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

// DELETE /api/weddings/:weddingId/documents/:documentId - Delete document
router.delete('/:weddingId/documents/:documentId', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId, documentId } = req.params;

  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND wedding_id = ?').get(documentId, weddingId) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  const filePath = path.join(UPLOADS_DIR, doc.stored_filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error removing physical file:', err);
    }
  }

  db.prepare('DELETE FROM documents WHERE id = ? AND wedding_id = ?').run(documentId, weddingId);

  logAudit(weddingId, req.user!.id, req.user!.name, 'ELIMINAR_DOCUMENTO', 'DOCUMENT', documentId, `Eliminación de documento ${doc.original_name}`);

  return res.json({ message: 'Documento eliminado correctamente.' });
});

export default router;
