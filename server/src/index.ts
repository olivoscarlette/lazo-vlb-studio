import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import convert from 'heic-convert';
import { fileURLToPath } from 'url';
import { initDatabase, db } from './db/index.js';

import authRouter from './routes/auth.js';
import weddingsRouter from './routes/weddings.js';
import guestsRouter from './routes/guests.js';
import tablesRouter from './routes/tables.js';
import vendorsRouter from './routes/vendors.js';
import civilReligiousRouter from './routes/civilReligious.js';
import meetingsRouter from './routes/meetings.js';
import timelineRouter from './routes/timeline.js';
import checklistRouter from './routes/checklist.js';
import documentsRouter from './routes/documents.js';
import reportsRouter from './routes/reports.js';
import directoryRouter from './routes/directory.js';
import catalogsBackupRouter from './routes/catalogsBackup.js';
import whatsappHubRouter from './routes/whatsappHub.js';
import whatsappWebhookRouter from './routes/whatsappWebhook.js';
import calendarRouter from './routes/calendar.js';
import vlbRouter from './routes/vlb.js';
import { BroadcastScheduler } from './services/broadcastScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatic .env loader for environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  } catch (e) {
    console.warn('[ENV] Warning loading .env:', e);
  }
}

// Initialize DB and Seed data
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Production Security Headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({
  limit: '20mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Build & Live Sync Identifier
const CURRENT_BUILD = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.BUILD_ID || '2026-10-27-live-sync-v1';

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'LAZO — VLB Studio · Planning',
    version: '1.0.0',
    build: CURRENT_BUILD,
    timestamp: new Date().toISOString()
  });
});

// Live Version Endpoint para Auto-Recarga Automática
app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    build: CURRENT_BUILD,
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/weddings', weddingsRouter);
app.use('/api/weddings', guestsRouter);
app.use('/api/weddings', tablesRouter);
app.use('/api/weddings', vendorsRouter);
app.use('/api/weddings', civilReligiousRouter);
app.use('/api/weddings', meetingsRouter);
app.use('/api/weddings', timelineRouter);
app.use('/api/weddings', checklistRouter);
app.use('/api/weddings', documentsRouter);
app.use('/api/weddings', reportsRouter);
app.use('/api/weddings', directoryRouter);
app.use('/api/whatsapp', whatsappWebhookRouter);
app.use('/api/whatsapp', whatsappHubRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/vlb', vlbRouter);
app.use('/api', catalogsBackupRouter);

// Serve uploaded public documents & invitations (e.g. for WhatsApp Cloud API)
const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const invitationsDir = path.resolve(uploadsDir, 'invitations');
if (!fs.existsSync(invitationsDir)) {
  fs.mkdirSync(invitationsDir, { recursive: true });
}
const floorplansDir = path.resolve(uploadsDir, 'floorplans');
if (!fs.existsSync(floorplansDir)) {
  fs.mkdirSync(floorplansDir, { recursive: true });
}

// Interceptar archivos HEIC/HEIF de iPhone y servirlos convertidos automáticamente a JPEG
app.use('/uploads', async (req, res, next) => {
  const reqPath = decodeURIComponent(req.path || '');
  if (reqPath.toLowerCase().endsWith('.heic') || reqPath.toLowerCase().endsWith('.heif')) {
    const filePath = path.join(uploadsDir, reqPath);
    const jpgPath = filePath.replace(/\.(heic|heif)$/i, '.jpg');

    if (fs.existsSync(jpgPath)) {
      return res.type('image/jpeg').sendFile(jpgPath);
    }

    if (fs.existsSync(filePath)) {
      try {
        const inputBuffer = fs.readFileSync(filePath);
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.88
        });
        fs.writeFileSync(jpgPath, Buffer.from(outputBuffer));
        return res.type('image/jpeg').sendFile(jpgPath);
      } catch (err) {
        console.error('Error auto-converting requested HEIC file:', err);
      }
    }
  }
  next();
});

app.use('/uploads', express.static(uploadsDir));

// Serve static client build if it exists
const clientDistPath = fs.existsSync(path.resolve(process.cwd(), 'client/dist'))
  ? path.resolve(process.cwd(), 'client/dist')
  : path.resolve(process.cwd(), 'dist-client');

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }

    const indexPath = path.join(clientDistPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      return next();
    }

    // Comprobar si se está consultando una propuesta pública de Viva la Bride
    let proposalKey = '';
    if (req.path.startsWith('/vlb/propuesta/')) {
      proposalKey = req.path.replace('/vlb/propuesta/', '').split('/')[0].trim();
    } else if (req.path.startsWith('/p/')) {
      proposalKey = req.path.replace('/p/', '').split('/')[0].trim();
    } else if (req.query.propuesta && typeof req.query.propuesta === 'string') {
      proposalKey = req.query.propuesta.trim();
    }

    if (proposalKey) {
      try {
        const quote = db.prepare(`
          SELECT q.* 
          FROM vlb_quotes q 
          WHERE q.id = ? OR q.quote_number = ? OR q.public_token = ?
        `).get(proposalKey, proposalKey, proposalKey) as any;

        if (quote) {
          const items = db.prepare(`
            SELECT qi.*, COALESCE(c.image_url, c2.image_url) as catalog_image_url
            FROM vlb_quote_items qi
            LEFT JOIN vlb_catalog c ON c.id = qi.catalog_id
            LEFT JOIN vlb_catalog c2 ON c2.name = qi.item_name
            WHERE qi.quote_id = ?
            ORDER BY qi.sort_order ASC
          `).all(quote.id) as any[];

          const clientName = quote.partner_name
            ? `${quote.client_name} & ${quote.partner_name}`
            : (quote.client_name || 'Novia');

          const isDeliveryOnly = items.length > 0 && !items.some(i => {
            const txt = `${i.item_name || ''} ${i.description || ''}`.toLowerCase();
            return txt.includes('stand') || txt.includes('cerveza') || txt.includes('beer') || txt.includes('memorial') || txt.includes('muro') || txt.includes('backdrop') || txt.includes('mimosa') || txt.includes('coctel');
          });

          const itemsList = items.map(i => i.item_name).filter(Boolean);
          const itemsSummary = itemsList.length > 0
            ? itemsList.slice(0, 2).join(' + ') + (itemsList.length > 2 ? ` (+${itemsList.length - 2} más)` : '')
            : 'Cotización Oficial';

          let eventDateFormatted = '';
          if (quote.event_date) {
            try {
              const [y, m, d] = quote.event_date.split('T')[0].split('-');
              const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              if (y && m && d) {
                eventDateFormatted = `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
              }
            } catch {}
          }

          const totalFormatted = `$${Number(quote.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
          const dateLabelText = isDeliveryOnly ? 'Entrega' : 'Fecha';
          const venueLabelText = isDeliveryOnly ? 'Lugar' : 'Venue';

          const title = `🌸 Propuesta Viva la Bride • ${clientName} (${quote.quote_number || 'Oficial'})`;
          const description = `✨ ${itemsSummary} | 💳 Total: ${totalFormatted}${eventDateFormatted ? ` | 📅 ${dateLabelText}: ${eventDateFormatted}` : ''}${quote.event_venue ? ` | 📍 ${venueLabelText}: ${quote.event_venue}` : ''}. Haz clic para revisar los detalles y confirmar tu fecha.`;

          // Foto del artículo (si existe en catálogo) o logo por defecto
          let ogImageUrl = 'https://www.lazostudio.mx/lazo-logo.png';
          const itemWithImage = items.find(i => i.catalog_image_url);
          if (itemWithImage?.catalog_image_url) {
            ogImageUrl = itemWithImage.catalog_image_url;
          }

          const host = req.get('host') || 'www.lazostudio.mx';
          const absoluteUrl = `https://${host}${req.originalUrl}`;
          const absoluteImageUrl = ogImageUrl.startsWith('http')
            ? ogImageUrl
            : `https://${host}${ogImageUrl.startsWith('/') ? '' : '/'}${ogImageUrl}`;

          let html = fs.readFileSync(indexPath, 'utf8');

          // 1. Eliminar COMPLETAMENTE cualquier meta etiqueta previa para que WhatsApp no tome las de Lazo general
          html = html
            .replace(/<title>.*?<\/title>/gi, '')
            .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '')
            .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '')
            .replace(/<meta\s+name=["']description["'][^>]*>/gi, '');

          // 2. Inyectar las etiquetas exclusivas de la propuesta al mero inicio de <head>
          const dynamicMeta = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Viva la Bride — Atelier & Experiencias" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(absoluteImageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(absoluteImageUrl)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:url" content="${escapeHtml(absoluteUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(absoluteImageUrl)}" />
`;
          html = html.replace('<head>', `<head>${dynamicMeta}`);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(html);
        }
      } catch (err) {
        console.warn('[OpenGraph Proposal Warning]:', err);
      }
    }

    return res.sendFile(indexPath);
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[LAZO Error Handler]', err);
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor.';
  res.status(status).json({ error: message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`LAZO — VLB STUDIO · PLANNING`);
    console.log(`Servidor activo en http://localhost:${PORT}`);
    console.log(`Base de datos SQLite persistente inicializada.`);
    console.log(`==================================================`);

    // Iniciar monitor de difusión automática de WhatsApp (7 días antes y Día del Evento)
    BroadcastScheduler.checkAndRunScheduledBroadcasts();
    setInterval(() => {
      BroadcastScheduler.checkAndRunScheduledBroadcasts();
    }, 60 * 1000);
  });
}

export default app;
