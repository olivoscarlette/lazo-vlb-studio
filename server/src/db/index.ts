import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'lazo.db');
const rawDb = new DatabaseSync(DB_PATH);
rawDb.exec('PRAGMA foreign_keys = ON;');

export const db = {
  prepare: (sql: string) => {
    const stmt = rawDb.prepare(sql) as any;
    return {
      all: (...params: any[]): any[] => stmt.all(...params),
      get: (...params: any[]): any => stmt.get(...params),
      run: (...params: any[]): any => stmt.run(...params)
    };
  },
  exec: (sql: string) => rawDb.exec(sql)
};

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      wedding_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weddings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      partner_1_name TEXT NOT NULL,
      partner_2_name TEXT NOT NULL,
      wedding_date TEXT NOT NULL,
      ceremony_time TEXT,
      reception_time TEXT,
      ceremony_venue TEXT,
      reception_venue TEXT,
      estimated_guests INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PLANNING',
      notes TEXT,
      package_type TEXT DEFAULT 'Integral',
      floor_plan_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wedding_assignments (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      assigned_role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(wedding_id, user_id),
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 10,
      x REAL DEFAULT 150,
      y REAL DEFAULT 150,
      rotation REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS layout_elements (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      x REAL DEFAULT 300,
      y REAL DEFAULT 300,
      width REAL DEFAULT 140,
      height REAL DEFAULT 140,
      rotation REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS layout_versions (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      name TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      companion_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Pendiente de confirmar',
      table_id TEXT,
      observations TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      type TEXT NOT NULL,
      locations TEXT NOT NULL,
      costo_real REAL DEFAULT 0,
      contact_person TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      vendor_id TEXT,
      concept TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT,
      notes TEXT,
      receipt_document_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS civil_ceremony (
      id TEXT PRIMARY KEY,
      wedding_id TEXT UNIQUE NOT NULL,
      date TEXT,
      time TEXT,
      location TEXT,
      juez_oficial TEXT,
      witnesses TEXT,
      requirements_status TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS religious_ceremony (
      id TEXT PRIMARY KEY,
      wedding_id TEXT UNIQUE NOT NULL,
      date TEXT,
      time TEXT,
      temple_name TEXT,
      officiant TEXT,
      music_notes TEXT,
      readings_notes TEXT,
      requirements_status TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      participants TEXT,
      status TEXT DEFAULT 'PROGRAMADA',
      notes TEXT,
      agreements TEXT,
      pending_tasks TEXT,
      proposed_slots TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      time TEXT NOT NULL,
      activity TEXT NOT NULL,
      location TEXT,
      responsible TEXT,
      notes TEXT,
      status TEXT DEFAULT 'PENDIENTE',
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Logística',
      responsible TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'Media',
      status TEXT DEFAULT 'Pendiente',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      category TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      notes TEXT,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      wedding_id TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      wedding_id TEXT,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS catalogs (
      key TEXT PRIMARY KEY,
      values_json TEXT NOT NULL
    );
  `);

  try {
    db.exec('ALTER TABLE weddings ADD COLUMN floor_plan_url TEXT;');
  } catch {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE religious_ceremony ADD COLUMN requirements_status TEXT DEFAULT '[]';");
  } catch {
    // Column already exists
  }

  const defaultPhases = [
    { id: 'phase1_internal_team', name: 'Fase 1: Operación Equipo VLB (Bodas, Invitados, Mesas, Proveedores, Pagos)', enabled: true },
    { id: 'phase2_novios_portal', name: 'Fase 2: Portal de Novios, Reuniones, Timeline y Checklist', enabled: true },
    { id: 'phase3_sensitive_docs', name: 'Fase 3: Documentos Privados, Reportes Avanzados e Integraciones', enabled: true }
  ];
  db.prepare('INSERT OR IGNORE INTO catalogs (key, values_json) VALUES (?, ?)').run('system_phases', JSON.stringify(defaultPhases));

  const defaultCivilRequirements = [
    'Solicitud de matrimonio civil requisitada',
    'Actas de nacimiento certificadas y actualizadas de ambos novios',
    'Identificación oficial vigente (INE / Pasaporte) de ambos novios',
    'Identificación oficial vigente (INE) de los 4 testigos',
    'Análisis clínicos prenupciales y certificado médico',
    'Constancia de no deudor alimentario (REDAM)',
    'Pago de derechos de Registro Civil y Juez'
  ];
  db.prepare('INSERT OR IGNORE INTO catalogs (key, values_json) VALUES (?, ?)').run('master_civil_requirements', JSON.stringify(defaultCivilRequirements));

  const defaultReligiousRequirements = [
    'Fe de bautismo actualizada (vigencia menor a 6 meses) de ambos novios',
    'Certificado de confirmación de ambos novios',
    'Actas de nacimiento y fotografías para expediente parroquial',
    'Constancia de pláticas prematrimoniales',
    'Presentación matrimonial canónica con testigos',
    'Traslado de amonestaciones / exhorto parroquial (si aplica)',
    'Liquidación de arancel parroquial y apartado de templo'
  ];
  db.prepare('INSERT OR IGNORE INTO catalogs (key, values_json) VALUES (?, ?)').run('master_religious_requirements', JSON.stringify(defaultReligiousRequirements));

  const defaultMasterChecklist = [
    { title: 'Definición de estilo, concepto y número estimado de invitados', category: '12 Meses Antes', priority: 'Alta', responsible: 'VLB Studio & Novios' },
    { title: 'Selección y apartado de lugar de recepción e iglesia', category: '12 Meses Antes', priority: 'Alta', responsible: 'VLB Studio & Novios' },
    { title: 'Contratación de banquete, fotografía y video', category: '12 Meses Antes', priority: 'Alta', responsible: 'VLB Studio' },
    { title: 'Selección de música (DJ / Grupo) y propuesta de diseño floral', category: '9 a 6 Meses Antes', priority: 'Media', responsible: 'VLB Studio' },
    { title: 'Inicio de expediente y pláticas prematrimoniales (Civil e Iglesia)', category: '9 a 6 Meses Antes', priority: 'Media', responsible: 'Novios' },
    { title: 'Levantamiento de lista de invitados y envío de Save the Date', category: '9 a 6 Meses Antes', priority: 'Media', responsible: 'Novios' },
    { title: 'Degustación de menú y definición de montaje de mesas', category: '3 a 2 Meses Antes', priority: 'Alta', responsible: 'VLB Studio & Novios' },
    { title: 'Definición de testigos civiles, lectores y repertorio musical de misa', category: '3 a 2 Meses Antes', priority: 'Media', responsible: 'Novios' },
    { title: 'Confirmaciones RSVP y primer acomodo de invitados en mesas', category: 'Mes 1', priority: 'Alta', responsible: 'VLB Studio & Novios' },
    { title: 'Cierre de minuto a minuto (Timeline) y logística con proveedores', category: 'Mes 1', priority: 'Alta', responsible: 'VLB Studio' },
    { title: 'Liquidación de saldos pendientes a proveedores', category: 'Mes 1', priority: 'Alta', responsible: 'Novios' },
    { title: 'Supervisión de montaje, audio, flores y recepción de proveedores', category: 'Día Boda', priority: 'Alta', responsible: 'Staff VLB' },
    { title: 'Recepción de kit de novios, anillos, arras, lazo y actas', category: 'Día Boda', priority: 'Alta', responsible: 'Coordinación VLB' }
  ];
  db.prepare('INSERT OR IGNORE INTO catalogs (key, values_json) VALUES (?, ?)').run('master_checklist', JSON.stringify(defaultMasterChecklist));

  seedInitialData();

  // Keep only 1 example wedding (Sofía & Alejandro) in normal/production environments and rename "Día B" -> "Día Boda"
  if (process.env.NODE_ENV !== 'test') {
    try {
      db.prepare('DELETE FROM wedding_assignments WHERE wedding_id = ?').run('wed_valeria_mateo');
      db.prepare('DELETE FROM users WHERE id IN (?, ?)').run('usr_novios_valeria', 'usr_coord_b');
      db.prepare('DELETE FROM weddings WHERE id = ?').run('wed_valeria_mateo');
      db.prepare("UPDATE tasks SET category = 'Día Boda' WHERE category = 'Día B'").run();
      db.prepare("UPDATE users SET name = REPLACE(name, 'Día B)', 'Día Boda)') WHERE name LIKE '%Día B%'").run();
      db.prepare("UPDATE wedding_assignments SET assigned_role = REPLACE(assigned_role, 'Día B', 'Día Boda') WHERE assigned_role LIKE '%Día B%' AND assigned_role NOT LIKE '%Día Boda%'").run();
      const mc = db.prepare('SELECT values_json FROM catalogs WHERE key = ?').get('master_checklist') as any;
      if (mc && mc.values_json.includes('"Día B"')) {
        db.prepare('UPDATE catalogs SET values_json = ? WHERE key = ?').run(mc.values_json.replace(/"Día B"/g, '"Día Boda"'), 'master_checklist');
      }
    } catch {}
  }
}

export function seedInitialData() {
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCheck && userCheck.count > 0) {
    return; // Already seeded
  }

  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);

  // Default Catalogs
  const vendorTypes = [
    'Fotografía', 'Video', 'Música en vivo', 'DJ', 'Flores y Ambientación',
    'Decoración', 'Mobiliario', 'Banquete', 'Maquillaje y Peinado',
    'Iluminación y Audio', 'Transporte', 'Vestido y Trajes', 'Joyería',
    'Papelería / Invitaciones', 'Repostería', 'Bar y Coctelería', 'Coordinación Externa', 'Otro'
  ];

  const meetingPackages = [
    { name: 'Esencial', maxMeetings: 3, description: '3 reuniones de coordinación y avance' },
    { name: 'Integral', maxMeetings: 6, description: '6 reuniones detalladas con equipo VLB' },
    { name: 'Luxury Exclusivo', maxMeetings: 999, description: 'Reuniones ilimitadas de planeación' }
  ];

  db.prepare('INSERT INTO catalogs (key, values_json) VALUES (?, ?)').run('vendor_types', JSON.stringify(vendorTypes));
  db.prepare('INSERT INTO catalogs (key, values_json) VALUES (?, ?)').run('meeting_packages', JSON.stringify(meetingPackages));

  // Users
  // 1. ADMINISTRADOR
  const adminId = 'usr_admin_01';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    'Valeria Lozano (VLB Director)',
    'admin@vlb.studio',
    bcrypt.hashSync('admin123', salt),
    'ADMINISTRADOR',
    '+52 55 1234 5678',
    null,
    now,
    now
  );

  // 2. COORDINADOR A
  const coordAId = 'usr_coord_a';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    coordAId,
    'Mariana Morales (Coordinadora Senior)',
    'coordinador@vlb.studio',
    bcrypt.hashSync('coord123', salt),
    'COORDINADOR',
    '+52 55 8765 4321',
    null,
    now,
    now
  );

  // 3. COORDINADOR B (Assigned to Boda B only, used to test isolation!)
  const coordBId = 'usr_coord_b';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    coordBId,
    'Carla Méndez (Coordinadora B)',
    'carla@vlb.studio',
    bcrypt.hashSync('coord123', salt),
    'COORDINADOR',
    '+52 55 4321 8765',
    null,
    now,
    now
  );

  // 4. STAFF A (Assigned to Boda A)
  const staffAId = 'usr_staff_a';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    staffAId,
    'Diego Salazar (Staff Día Boda)',
    'staff@vlb.studio',
    bcrypt.hashSync('staff123', salt),
    'STAFF',
    '+52 55 5555 4444',
    null,
    now,
    now
  );

  // Weddings
  // QA Wedding A: Sofía & Alejandro (In 6 months: Novios can edit layout)
  const weddingAId = 'wed_sofia_alejandro';
  const futureDateA = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO weddings (
      id, name, slug, partner_1_name, partner_2_name, wedding_date,
      ceremony_time, reception_time, ceremony_venue, reception_venue,
      estimated_guests, status, notes, package_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    weddingAId,
    'Sofía & Alejandro',
    'sofia-alejandro',
    'Sofía Villaseñor',
    'Alejandro De la Mora',
    futureDateA,
    '15:00',
    '18:00',
    'Parroquia Santa Teresita del Niño Jesús',
    'Hacienda San José del Refugio',
    180,
    'PLANNING',
    'Boda estilo jardín contemporáneo con toques botánicos y velas.',
    'Integral',
    now,
    now
  );

  // QA Wedding B: Valeria & Mateo (In 3 days: triggers 5-day lock for Novios!)
  const weddingBId = 'wed_valeria_mateo';
  const futureDateB = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO weddings (
      id, name, slug, partner_1_name, partner_2_name, wedding_date,
      ceremony_time, reception_time, ceremony_venue, reception_venue,
      estimated_guests, status, notes, package_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    weddingBId,
    'Valeria & Mateo (QA 5-Días Bloqueo)',
    'valeria-mateo',
    'Valeria Domínguez',
    'Mateo Echeverría',
    futureDateB,
    '16:30',
    '19:00',
    'Templo San Agustín',
    'Jardín Versalles',
    150,
    'UPCOMING',
    'Boda programada a menos de 5 días para validar candado de mesas en backend.',
    'Esencial',
    now,
    now
  );

  // 5. NOVIOS A (Sofía)
  const noviosAId = 'usr_novios_sofia';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    noviosAId,
    'Sofía Villaseñor (Novia)',
    'novios.sofia@vlb.studio',
    bcrypt.hashSync('novios123', salt),
    'NOVIOS',
    '+52 55 9999 1111',
    weddingAId,
    now,
    now
  );

  // 6. NOVIOS B (Valeria)
  const noviosBId = 'usr_novios_valeria';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, wedding_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    noviosBId,
    'Valeria Domínguez (Novia Boda B)',
    'novios.valeria@vlb.studio',
    bcrypt.hashSync('novios123', salt),
    'NOVIOS',
    '+52 55 8888 2222',
    weddingBId,
    now,
    now
  );

  // Wedding Assignments
  // Wedding A: Admin, Coord A, Staff A
  db.prepare(`INSERT INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at) VALUES (?, ?, ?, ?, ?)`).run('asg_a_1', weddingAId, adminId, 'ADMINISTRADOR', now);
  db.prepare(`INSERT INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at) VALUES (?, ?, ?, ?, ?)`).run('asg_a_2', weddingAId, coordAId, 'COORDINADOR', now);
  db.prepare(`INSERT INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at) VALUES (?, ?, ?, ?, ?)`).run('asg_a_3', weddingAId, staffAId, 'STAFF', now);

  // Wedding B: Admin, Coord B
  db.prepare(`INSERT INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at) VALUES (?, ?, ?, ?, ?)`).run('asg_b_1', weddingBId, adminId, 'ADMINISTRADOR', now);
  db.prepare(`INSERT INTO wedding_assignments (id, wedding_id, user_id, assigned_role, created_at) VALUES (?, ?, ?, ?, ?)`).run('asg_b_2', weddingBId, coordBId, 'COORDINADOR', now);

  // Seed Tables for Wedding A
  const table1Id = 'tbl_mesa_1';
  const table2Id = 'tbl_mesa_2';
  const tablePresId = 'tbl_presidencial';

  db.prepare(`INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    tablePresId, weddingAId, 'Mesa Presidencial', 'imperial', 12, 350, 80, 0, now, now
  );
  db.prepare(`INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    table1Id, weddingAId, 'Mesa 1 - Familia Novia', 'circular', 10, 160, 220, 0, now, now
  );
  db.prepare(`INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    table2Id, weddingAId, 'Mesa 2 - Familia Novio', 'circular', 10, 540, 220, 0, now, now
  );
  db.prepare(`INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'tbl_mesa_3', weddingAId, 'Mesa 3 - Amigos Universidad', 'rectangular', 10, 160, 420, 0, now, now
  );
  db.prepare(`INSERT INTO tables (id, wedding_id, name, type, capacity, x, y, rotation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'tbl_mesa_4', weddingAId, 'Mesa 4 - Amigos Prepa', 'imperial', 14, 540, 420, 90, now, now
  );

  // Seed Layout Elements
  db.prepare(`INSERT INTO layout_elements (id, wedding_id, name, type, x, y, width, height, rotation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'elt_pista', weddingAId, 'Pista de Baile', 'pista_baile', 350, 300, 180, 180, 0, now, now
  );
  db.prepare(`INSERT INTO layout_elements (id, wedding_id, name, type, x, y, width, height, rotation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'elt_escenario', weddingAId, 'Escenario / DJ', 'escenario', 350, 520, 220, 80, 0, now, now
  );

  // Seed Initial Layout Version
  const layoutSnapshot = {
    tables: [
      { id: tablePresId, name: 'Mesa Presidencial', type: 'imperial', capacity: 12, x: 350, y: 80, rotation: 0 },
      { id: table1Id, name: 'Mesa 1 - Familia Novia', type: 'circular', capacity: 10, x: 160, y: 220, rotation: 0 },
      { id: table2Id, name: 'Mesa 2 - Familia Novio', type: 'circular', capacity: 10, x: 540, y: 220, rotation: 0 }
    ],
    elements: [
      { id: 'elt_pista', name: 'Pista de Baile', type: 'pista_baile', x: 350, y: 300, width: 180, height: 180, rotation: 0 }
    ]
  };
  db.prepare(`INSERT INTO layout_versions (id, wedding_id, name, snapshot_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    'ver_initial', weddingAId, 'Distribución Inicial Aprobada', JSON.stringify(layoutSnapshot), 'Valeria Lozano', now
  );

  // Seed Guests for Wedding A
  // Columns: NOMBRE, APELLIDO, WHATSAPP, # ACOMPAÑANTES, ESTATUS, MESA, OBSERVACIONES
  const guestsA = [
    { id: 'gst_1', fn: 'José María', ln: 'Villaseñor Romero', phone: '+52 55 1111 2222', comp: 1, status: 'Confirmado', tbl: table1Id, obs: 'Papás de la novia. Requiere vino tinto en mesa.' },
    { id: 'gst_2', fn: 'María Elena', ln: 'Romero de Villaseñor', phone: '+52 55 1111 2223', comp: 0, status: 'Confirmado', tbl: table1Id, obs: 'Menú vegetariano estricto.' },
    { id: 'gst_3', fn: 'Fernando', ln: 'De la Mora Lozada', phone: '+52 55 3333 4444', comp: 1, status: 'Confirmado', tbl: table2Id, obs: 'Papás del novio.' },
    { id: 'gst_4', fn: 'Carmen', ln: 'Saldaña De la Mora', phone: '+52 55 3333 4445', comp: 0, status: 'Confirmado', tbl: table2Id, obs: 'Alérgica a nueces.' },
    { id: 'gst_5', fn: 'Sofía', ln: 'López de Heredia', phone: '+52 33 2233 4455', comp: 2, status: 'Confirmado', tbl: table1Id, obs: 'Dama de honor con 2 hijos pequeños.' },
    { id: 'gst_6', fn: 'Rodrigo', ln: 'Cárdenas Baeza', phone: '+52 81 9988 7766', comp: 1, status: 'Pendiente de confirmar', tbl: null, obs: 'Pendiente confirmar si viaja desde Monterrey.' },
    { id: 'gst_7', fn: 'Camila', ln: 'Peña Zepeda', phone: '+52 55 7766 5544', comp: 0, status: 'Pendiente de confirmar', tbl: null, obs: 'Enviada invitación digital 1ra ronda.' },
    { id: 'gst_8', fn: 'Ignacio', ln: 'Gómez Tagle', phone: '+52 55 4433 2211', comp: 1, status: 'No asistirá', tbl: null, obs: 'Viaje laboral fuera del país en esas fechas.' },
    { id: 'gst_9', fn: 'Ana Paula', ln: 'Ruiz Castañeda', phone: '+52 55 6677 8899', comp: 1, status: 'Confirmado', tbl: tablePresId, obs: 'Testigo civil y padrinos.' },
    { id: 'gst_10', fn: 'Guillermo', ln: 'Del Valle Cantú', phone: '+52 55 1020 3040', comp: 0, status: 'Confirmado', tbl: tablePresId, obs: 'Padrino de lazo.' }
  ];

  for (const g of guestsA) {
    db.prepare(`
      INSERT INTO guests (id, wedding_id, first_name, last_name, phone, companion_count, status, table_id, observations, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(g.id, weddingAId, g.fn, g.ln, g.phone, g.comp, g.status, g.tbl, g.obs, now, now);
  }

  // Seed Guests for Wedding B (to ensure separation)
  db.prepare(`
    INSERT INTO guests (id, wedding_id, first_name, last_name, phone, companion_count, status, table_id, observations, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('gst_b1', weddingBId, 'Ernesto', 'Domínguez Treviño', '+52 55 9900 1122', 1, 'Confirmado', null, 'Papá novia Boda B - Confidencial', now, now);

  // Seed Vendors for Wedding A
  // Multi-select locations: IGLESIA, CIVIL, RECEPCIÓN, OTRO
  const v1Id = 'vnd_magnolia';
  const v2Id = 'vnd_juez';
  const v3Id = 'vnd_banquete';
  const v4Id = 'vnd_cinematografia';

  db.prepare(`
    INSERT INTO vendors (id, wedding_id, name, phone, type, locations, costo_real, contact_person, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    v1Id,
    weddingAId,
    'Magnolia Floral Studio',
    '+52 55 7788 9900',
    'Flores y Ambientación',
    JSON.stringify(['IGLESIA', 'RECEPCIÓN']), // Participates in Church & Reception!
    75000,
    'Andrea Morales',
    'Incluye arreglos de bancas en parroquia y centros de mesa altos en hacienda.',
    now,
    now
  );

  db.prepare(`
    INSERT INTO vendors (id, wedding_id, name, phone, type, locations, costo_real, contact_person, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    v2Id,
    weddingAId,
    'Juez Lic. Fernando Morales (Juzgado 14)',
    '+52 55 2233 4455',
    'Coordinación Externa',
    JSON.stringify(['CIVIL']), // Participates in Civil ceremony!
    8500,
    'Lic. Morales',
    'Ceremonia civil a realizarse en la terraza de la hacienda.',
    now,
    now
  );

  db.prepare(`
    INSERT INTO vendors (id, wedding_id, name, phone, type, locations, costo_real, contact_person, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    v3Id,
    weddingAId,
    'Gourmet Catering & Banquetería',
    '+52 55 6655 4433',
    'Banquete',
    JSON.stringify(['RECEPCIÓN']),
    140000,
    'Chef Roberto San Román',
    'Menú a 4 tiempos para 180 personas + barra libre nacional.',
    now,
    now
  );

  db.prepare(`
    INSERT INTO vendors (id, wedding_id, name, phone, type, locations, costo_real, contact_person, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    v4Id,
    weddingAId,
    'Lumière Foto & Cinema Studio',
    '+52 55 8899 0011',
    'Fotografía',
    JSON.stringify(['IGLESIA', 'CIVIL', 'RECEPCIÓN']), // Participates everywhere!
    52000,
    'Javier Estrada',
    'Cobertura completa de 12 horas: getting ready, civil, iglesia y fiesta.',
    now,
    now
  );

  // Seed Payments for Wedding A
  // COSTO REAL = 75000 + 8500 + 140000 + 52000 = 275500
  // Payments:
  db.prepare(`
    INSERT INTO payments (id, wedding_id, vendor_id, concept, amount, payment_date, payment_method, notes, receipt_document_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pay_1', weddingAId, v1Id, 'Anticipo 50% Flores Parroquia y Hacienda', 37500, '2026-08-15', 'Transferencia SPEI', 'Comprobante bancario verificado', null, now, now
  );
  db.prepare(`
    INSERT INTO payments (id, wedding_id, vendor_id, concept, amount, payment_date, payment_method, notes, receipt_document_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pay_2', weddingAId, v2Id, 'Honorarios Oficialía Civil y Traslado', 8500, '2026-09-01', 'Transferencia SPEI', 'Liquidado al 100%', null, now, now
  );
  db.prepare(`
    INSERT INTO payments (id, wedding_id, vendor_id, concept, amount, payment_date, payment_method, notes, receipt_document_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pay_3', weddingAId, v3Id, 'Apartado 30% Banquete y Menú', 42000, '2026-07-20', 'Transferencia SPEI', 'Degustación programada', null, now, now
  );
  db.prepare(`
    INSERT INTO payments (id, wedding_id, vendor_id, concept, amount, payment_date, payment_method, notes, receipt_document_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pay_4', weddingAId, v4Id, 'Anticipo Cobertura Fotográfica y Video', 26000, '2026-08-01', 'Tarjeta de crédito', 'Pago en 2 exhibiciones', null, now, now
  );

  // Seed Civil Ceremony
  db.prepare(`
    INSERT INTO civil_ceremony (id, wedding_id, date, time, location, juez_oficial, witnesses, requirements_status, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'civ_' + weddingAId,
    weddingAId,
    futureDateA,
    '17:00',
    'Terraza de los Arcos, Hacienda San José',
    'Lic. Fernando Morales (Oficialía 14)',
    JSON.stringify(['Ana Paula Ruiz', 'Guillermo Del Valle', 'Mariana Garza', 'Luis Fernando Ortiz']),
    JSON.stringify([
      { id: 'req_1', title: 'Actas de nacimiento actualizadas', completed: true },
      { id: 'req_2', title: 'Identificaciones oficiales con copia', completed: true },
      { id: 'req_3', title: 'Certificados médicos prenupciales', completed: false },
      { id: 'req_4', title: 'Convenio de régimen patrimonial', completed: true }
    ]),
    'Se requiere mesa con mantel blanco y pluma fina para las firmas.',
    now
  );

  // Seed Religious Ceremony
  db.prepare(`
    INSERT INTO religious_ceremony (id, wedding_id, date, time, temple_name, officiant, music_notes, readings_notes, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'rel_' + weddingAId,
    weddingAId,
    futureDateA,
    '15:00',
    'Parroquia Santa Teresita del Niño Jesús',
    'Pbro. Francisco Javier Gómez',
    'Ensamble de cuerdas para entrada nupcial (Canon in D) y Ave María en ofertorio.',
    'Primera lectura: Carta de San Pablo a los Corintios (a cargo de prima Sofía).',
    'Confirmar llegada de cortejo 15 minutos antes de la hora acordada.',
    now
  );

  // Seed Meetings
  db.prepare(`
    INSERT INTO meetings (id, wedding_id, title, date, time, participants, status, notes, agreements, pending_tasks, proposed_slots, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'mtg_1',
    weddingAId,
    'Reunión 1: Kickoff y Alineación de Visión',
    '2026-07-10',
    '11:00',
    JSON.stringify(['Valeria Lozano (VLB)', 'Sofía Villaseñor', 'Alejandro De la Mora']),
    'REALIZADA',
    'Revisión inicial del estilo de boda, paleta de colores y selección de proveedores principales.',
    'Se aprobó paleta de colores champán y olivo. Se agendó cata de menú.',
    'Enviar opciones de floristería para iglesia y recepción.',
    null,
    adminId,
    now,
    now
  );

  db.prepare(`
    INSERT INTO meetings (id, wedding_id, title, date, time, participants, status, notes, agreements, pending_tasks, proposed_slots, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'mtg_2',
    weddingAId,
    'Reunión 2: Distribución de Mesas y Layout',
    '2026-09-18',
    '17:00',
    JSON.stringify(['Mariana Morales (VLB)', 'Sofía Villaseñor']),
    'PROGRAMADA',
    'Revisar asignación inicial de mesas según confirmaciones recibidas.',
    'Definir ubicación final de mesa presidencial respecto a pista de baile.',
    'Revisar invitados con requerimientos alimenticios.',
    null,
    coordAId,
    now,
    now
  );

  // Seed Timeline Events
  const timelineEvents = [
    { id: 'tme_1', time: '12:00', activity: 'Getting Ready de Novios y Maquillaje', location: 'Suite Nupcial Hacienda', resp: 'Staff / Mariana', notes: 'Fotógrafo llega 12:30 para fotos de detalles.', status: 'PENDIENTE', order: 1 },
    { id: 'tme_2', time: '14:30', activity: 'Traslado hacia la Parroquia', location: 'Transporte Nupcial', resp: 'Chofer / Staff', notes: 'Revisar ramos y boutonnières listos.', status: 'PENDIENTE', order: 2 },
    { id: 'tme_3', time: '15:00', activity: 'Ceremonia Religiosa', location: 'Parroquia Sta. Teresita', resp: 'Pbro. Gómez / Mariana', notes: 'Inicio puntual.', status: 'PENDIENTE', order: 3 },
    { id: 'tme_4', time: '16:15', activity: 'Fotos Familiares en Atrio', location: 'Atrio Parroquia', resp: 'Lumière Foto / Diego', notes: 'Organizar grupos según lista previa.', status: 'PENDIENTE', order: 4 },
    { id: 'tme_5', time: '17:00', activity: 'Ceremonia Civil', location: 'Terraza de los Arcos Hacienda', resp: 'Juez Morales / Mariana', notes: 'Testigos con identificaciones preparadas.', status: 'PENDIENTE', order: 5 },
    { id: 'tme_6', time: '17:45', activity: 'Cóctel de Bienvenida y Música Acústica', location: 'Jardín de los Naranjos', resp: 'Banquete / Staff', notes: 'Canapés y bebidas de bienvenida.', status: 'PENDIENTE', order: 6 },
    { id: 'tme_7', time: '19:00', activity: 'Entrada de Novios y Cena Formal', location: 'Salón Principal', resp: 'DJ / Valeria', notes: 'Canción especial de entrada.', status: 'PENDIENTE', order: 7 },
    { id: 'tme_8', time: '21:00', activity: 'Vals de Novios y Apertura de Pista', location: 'Pista de Baile', resp: 'DJ / Mariana', notes: 'Vals esposos, papás, apertura de fiesta.', status: 'PENDIENTE', order: 8 }
  ];

  for (const t of timelineEvents) {
    db.prepare(`
      INSERT INTO timeline_events (id, wedding_id, time, activity, location, responsible, notes, status, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, weddingAId, t.time, t.activity, t.location, t.resp, t.notes, t.status, t.order, now, now);
  }

  // Seed Tasks
  const tasks = [
    { id: 'tsk_1', title: 'Confirmar lecturas y padrinos con parroquia', cat: 'Ceremonia', resp: 'Mariana Morales', due: '2026-11-01', prio: 'Alta', status: 'En proceso', notes: 'Falta confirmar segundo lector.' },
    { id: 'tsk_2', title: 'Cata final de menú y selección de vinos', cat: 'Banquete', resp: 'Sofía & Alejandro', due: '2026-10-25', prio: 'Media', status: 'Completada', notes: 'Aprobado filete mignon y salmón.' },
    { id: 'tsk_3', title: 'Prueba de maquillaje y peinado con velo', cat: 'Novia', resp: 'Sofía Villaseñor', due: '2026-11-15', prio: 'Media', status: 'Pendiente', notes: 'Agendado en el estudio.' },
    { id: 'tsk_4', title: 'Cierre de confirmaciones RSVP (primer corte)', cat: 'Invitados', resp: 'Diego Salazar', due: '2026-11-20', prio: 'Alta', status: 'En proceso', notes: 'Enviar recordatorio por WhatsApp.' }
  ];

  for (const t of tasks) {
    db.prepare(`
      INSERT INTO tasks (id, wedding_id, title, category, responsible, due_date, priority, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, weddingAId, t.title, t.cat, t.resp, t.due, t.prio, t.status, t.notes, now, now);
  }

  // Seed Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, wedding_id, user_id, user_name, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'aud_1',
    weddingAId,
    adminId,
    'Valeria Lozano (VLB Director)',
    'CREAR_BODA',
    'WEDDING',
    weddingAId,
    'Alta inicial de la boda de Sofía & Alejandro en VLB Studio.',
    now
  );
}
