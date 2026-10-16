import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/index.js';

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'LAZO — VLB Studio · Planning',
    version: '1.0.0',
    build: '2026-10-16-v2-calendar-fix',
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
app.use('/api', catalogsBackupRouter);

// Serve static client build if it exists
const clientDistPath = fs.existsSync(path.resolve(process.cwd(), 'client/dist'))
  ? path.resolve(process.cwd(), 'client/dist')
  : path.resolve(process.cwd(), 'dist-client');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
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
  });
}

export default app;
