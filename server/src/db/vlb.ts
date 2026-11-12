import { db } from './index.js';

export function initVlbDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vlb_catalog (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL, -- 'PAPELERIA' | 'STANDS_EXPERIENCIAS'
      subcategory TEXT,
      name TEXT NOT NULL,
      description TEXT,
      pricing_type TEXT NOT NULL, -- 'PER_PIECE' | 'FIXED_EVENT'
      base_price REAL NOT NULL DEFAULT 0,
      min_pieces INTEGER DEFAULT 1,
      specs_json TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vlb_quotes (
      id TEXT PRIMARY KEY,
      quote_number TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      partner_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      event_date TEXT,
      event_venue TEXT,
      status TEXT DEFAULT 'BORRADOR', -- 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'CONVERTIDA' | 'RECHAZADA'
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      down_payment_pct REAL DEFAULT 50,
      down_payment_amount REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      notes TEXT,
      valid_until TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vlb_quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      catalog_id TEXT,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      pricing_type TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_price REAL NOT NULL,
      custom_options_json TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (quote_id) REFERENCES vlb_quotes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vlb_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      quote_id TEXT,
      client_name TEXT NOT NULL,
      partner_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      event_date TEXT NOT NULL,
      event_venue TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      down_payment_required REAL NOT NULL DEFAULT 0,
      total_paid REAL NOT NULL DEFAULT 0,
      balance_pending REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'ANTICIPO_PENDIENTE', -- 'ANTICIPO_PENDIENTE' | 'ANTICIPO_PAGADO' | 'LIQUIDADO'
      production_status TEXT DEFAULT 'DISENO_EN_PROCESO', -- 'EN_COTIZACION' | 'DISENO_EN_PROCESO' | 'VOBO_PENDIENTE' | 'EN_PRODUCCION' | 'LISTO_ENTREGA' | 'ENTREGADO_MONTADO' | 'FINALIZADO'
      vobo_design_deadline TEXT,
      physical_delivery_date TEXT,
      stand_setup_date TEXT,
      stand_setup_time TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vlb_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL, -- 'ANTICIPO_50' | 'ABONO' | 'LIQUIDACION_FINAL'
      payment_method TEXT NOT NULL, -- 'SPEI' | 'TARJETA' | 'EFECTIVO' | 'OTRO'
      payment_date TEXT NOT NULL,
      reference_num TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES vlb_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vlb_documents (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      category TEXT NOT NULL, -- 'CONTRATO_FIRMADO' | 'COMPROBANTE_SPEI' | 'VOBO_DISENO' | 'OTRO'
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      vobo_status TEXT DEFAULT 'PENDIENTE', -- 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
      vobo_approved_at TEXT,
      vobo_notes TEXT,
      notes TEXT,
      uploaded_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES vlb_orders(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS vlb_task_templates (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL, -- 'PAPELERIA' | 'SERVICIO'
      title TEXT NOT NULL,
      days_before_event INTEGER DEFAULT 7,
      default_time TEXT,
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Módulo Financiero Privado (Nómina, Gastos Operativos y Reparto de Utilidades)
    CREATE TABLE IF NOT EXISTS vlb_finance_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      staff_rate REAL DEFAULT 450,
      freight_rate REAL DEFAULT 500,
      stationery_rate REAL DEFAULT 200,
      company_fund_pct REAL DEFAULT 60,
      partners_profit_pct REAL DEFAULT 40,
      pin_code TEXT DEFAULT '2711',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vlb_event_settlements (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      quote_id TEXT,
      event_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      venue TEXT,
      service_amount REAL NOT NULL DEFAULT 0,
      stands_amount REAL NOT NULL DEFAULT 0,
      stationery_amount REAL NOT NULL DEFAULT 0,
      freight_charged REAL NOT NULL DEFAULT 0,
      extra_services REAL NOT NULL DEFAULT 0,
      supplies_expense REAL NOT NULL DEFAULT 0,
      supplies_services_expense REAL NOT NULL DEFAULT 0,
      supplies_stationery_expense REAL NOT NULL DEFAULT 0,
      car_provider TEXT NOT NULL DEFAULT 'NINGUNA_EXTERNO', -- 'SCARLETTE' | 'VICTORIA' | 'NINGUNA_EXTERNO'
      stationery_provider TEXT NOT NULL DEFAULT 'NINGUNA', -- 'SCARLETTE' | 'VICTORIA' | 'NINGUNA' | 'EXTERNO'
      stationery_labor_payout REAL NOT NULL DEFAULT 0,
      staff_scarlette INTEGER NOT NULL DEFAULT 0,
      staff_victoria INTEGER NOT NULL DEFAULT 0,
      external_staff_count INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'PENDIENTE', -- 'PENDIENTE' | 'LIQUIDADO'
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  try {
    const existingSettings = db.prepare('SELECT id FROM vlb_finance_settings WHERE id = ?').get('default');
    if (!existingSettings) {
      db.prepare(`
        INSERT INTO vlb_finance_settings (id, staff_rate, freight_rate, stationery_rate, stationery_labor_pct, company_fund_pct, partners_profit_pct, pin_code, updated_at)
        VALUES ('default', 450, 500, 200, 25, 60, 40, '2711', datetime('now'))
      `).run();
    }
  } catch {}

  // Migraciones financieras para separación de stands/servicios y papelería social ("quitando gastos")
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN stands_amount REAL NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN stationery_amount REAL NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN supplies_services_expense REAL NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN supplies_stationery_expense REAL NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN stationery_labor_payout REAL NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_finance_settings ADD COLUMN stationery_labor_pct REAL NOT NULL DEFAULT 25').run();
  } catch {}

  // Migraciones para Control de Nómina & Dispersión de Pagos
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN paid_scarlette INTEGER NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN paid_victoria INTEGER NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN paid_external INTEGER NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN paid_scarlette_at TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN paid_victoria_at TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_event_settlements ADD COLUMN paid_external_at TEXT').run();
  } catch {}

  // Migrations for dynamic tasks and service type
  try {
    db.prepare('ALTER TABLE vlb_orders ADD COLUMN tasks_json TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_orders ADD COLUMN service_type TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_orders ADD COLUMN items_json TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_orders ADD COLUMN packing_list_json TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_orders ADD COLUMN quote_number TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN public_token TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN signature_data TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN signed_at TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN signed_by_name TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN pdf_path TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN short_url TEXT').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN total_paid REAL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare("ALTER TABLE vlb_quotes ADD COLUMN payment_status TEXT DEFAULT 'ANTICIPO_PENDIENTE'").run();
  } catch {}
  try {
    db.prepare('ALTER TABLE vlb_quotes ADD COLUMN event_time TEXT').run();
  } catch {}
  try {
    db.prepare("ALTER TABLE vlb_quotes ADD COLUMN contract_type TEXT DEFAULT 'AUTO'").run();
  } catch {}

  // Corregir cotizaciones de servicios históricas para que el anticipo sea exactamente MIN(1000, total)
  try {
    db.prepare(`
      UPDATE vlb_quotes 
      SET down_payment_amount = MIN(1000, total),
          balance_due = MAX(0, total - MIN(1000, total)),
          down_payment_pct = CASE WHEN total > 0 THEN ROUND((MIN(1000, total) / total) * 100) ELSE 0 END
      WHERE quote_number LIKE 'SV-%'
    `).run();
  } catch {}

  // Sincronizar pagos registrados en pedidos hacia las cotizaciones
  try {
    db.prepare(`
      UPDATE vlb_quotes
      SET total_paid = (
        SELECT COALESCE(o.total_paid, 0)
        FROM vlb_orders o
        WHERE o.quote_id = vlb_quotes.id
        ORDER BY o.created_at DESC LIMIT 1
      ),
      balance_due = MAX(0, total - (
        SELECT COALESCE(o.total_paid, 0)
        FROM vlb_orders o
        WHERE o.quote_id = vlb_quotes.id
        ORDER BY o.created_at DESC LIMIT 1
      )),
      payment_status = (
        SELECT COALESCE(o.payment_status, 'ANTICIPO_PENDIENTE')
        FROM vlb_orders o
        WHERE o.quote_id = vlb_quotes.id
        ORDER BY o.created_at DESC LIMIT 1
      )
      WHERE id IN (SELECT quote_id FROM vlb_orders WHERE quote_id IS NOT NULL)
    `).run();
  } catch {}
  try {
    db.prepare("UPDATE vlb_orders SET order_number = 'VLB-' || SUBSTR(order_number, -3) WHERE order_number LIKE 'ORD-VLB-%'").run();
  } catch {}
  try {
    db.prepare("UPDATE vlb_catalog SET subcategory = 'Invitaciones' WHERE subcategory LIKE '%Invitaciones Finas%'").run();
    db.prepare("UPDATE vlb_catalog SET subcategory = TRIM(REPLACE(subcategory, 'Finas', '')) WHERE subcategory LIKE '%Finas%'").run();
    db.prepare("UPDATE vlb_catalog SET subcategory = TRIM(REPLACE(subcategory, 'finas', '')) WHERE subcategory LIKE '%finas%'").run();
  } catch {}

  // Seed default master task templates if empty
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM vlb_task_templates').get() as { count: number };
  if (templateCount.count === 0) {
    const now = new Date().toISOString();
    const defaultTemplates = [
      // Papelería Social
      { id: 'tpl_pap_1', category: 'PAPELERIA', title: 'Aprobación de Diseño Digital (VoBo)', days_before_event: 21, default_time: '', notes: 'Fecha límite previa a entrar a imprenta', sort_order: 1 },
      { id: 'tpl_pap_2', category: 'PAPELERIA', title: 'Compra de papel algodón e insumos', days_before_event: 18, default_time: '', notes: 'Papel algodón 300g, lacre, sobres y sellos', sort_order: 2 },
      { id: 'tpl_pap_3', category: 'PAPELERIA', title: 'Impresión tipográfica & sellado en lacre', days_before_event: 12, default_time: '', notes: 'Grabado tipográfico y aplicación de sellos botánicos', sort_order: 3 },
      { id: 'tpl_pap_4', category: 'PAPELERIA', title: 'Empaque y caligrafía de sobres', days_before_event: 7, default_time: '', notes: 'Rotulación de nombres y empaque protector', sort_order: 4 },
      { id: 'tpl_pap_5', category: 'PAPELERIA', title: 'Entrega Física de Papelería', days_before_event: 5, default_time: '', notes: 'En atelier o envío a domicilio de los novios', sort_order: 5 },
      // Servicios & Stands
      { id: 'tpl_srv_1', category: 'SERVICIO', title: 'Compra de bebidas e insumos', days_before_event: 7, default_time: '', notes: 'Licores, jarabes, botánicos o cristalería', sort_order: 1 },
      { id: 'tpl_srv_2', category: 'SERVICIO', title: 'Corte, armado e impresión de vinil', days_before_event: 4, default_time: '', notes: 'Barras, letreros, copas o acrílicos', sort_order: 2 },
      { id: 'tpl_srv_3', category: 'SERVICIO', title: 'Prueba técnica de Audio Guestbook & telefonía', days_before_event: 2, default_time: '', notes: 'Verificar batería, memoria y saludo de bienvenida', sort_order: 3 },
      { id: 'tpl_srv_4', category: 'SERVICIO', title: 'Checklist de Carga y Packing al Vehículo', days_before_event: 0, default_time: '10:00', notes: 'Subir todo al carro y verificar antes de salir', sort_order: 4 },
      { id: 'tpl_srv_5', category: 'SERVICIO', title: 'Montaje de Stands en el Venue', days_before_event: 0, default_time: '14:00', notes: 'Welcome Drinks, Audio Guestbook, Seating Chart', sort_order: 5 }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO vlb_task_templates (id, category, title, days_before_event, default_time, notes, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tpl of defaultTemplates) {
      insertStmt.run(tpl.id, tpl.category, tpl.title, tpl.days_before_event, tpl.default_time, tpl.notes, tpl.sort_order, now);
    }
  }

  // Seed default catalog if empty
  const catalogCount = db.prepare('SELECT COUNT(*) as count FROM vlb_catalog').get() as { count: number };
  if (catalogCount.count === 0) {
    const now = new Date().toISOString();
    const catalogItems = [
      // --- PAPELERÍA SOCIAL ---
      {
        id: 'cat_pap_01',
        category: 'PAPELERIA',
        subcategory: 'Invitaciones',
        name: 'Invitación de Boda en Algodón Artesanal & Lacre de Cera',
        description: 'Papel 100% algodón de 300g con bordes rasgados a mano. Incluye caligrafía artística personalizada para nombres de los novios, sobre en lino o algodón forrado con papel vegetal translúcido, y sello de cera botánico con lacre flexible importado.',
        pricing_type: 'PER_PIECE',
        base_price: 145.00,
        min_pieces: 50,
        specs_json: JSON.stringify({
          gramaje: '300g algodón artesanal',
          acabados: ['Bordes rasgados a mano', 'Lacre con sello botánico o monograma', 'Caligrafía personalizada', 'Sobre forrado en vegetal impreso'],
          tiempo_produccion: '15 días hábiles a partir de VoBo'
        }),
        image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_pap_02',
        category: 'PAPELERIA',
        subcategory: 'Menús de Mesa',
        name: 'Menú Editorial Individual con Hot Stamping Oro Mate',
        description: 'Menú impreso a detalle en cartulina texturizada de 270g, tipografía editorial con nombres de invitados o menú personalizado, estampado en lámina de oro mate o bronce.',
        pricing_type: 'PER_PIECE',
        base_price: 48.00,
        min_pieces: 30,
        specs_json: JSON.stringify({
          formato: '10 x 21 cm',
          papel: 'Cartulina de algodón texturizada 270g',
          acabados: ['Hot stamping foil mate', 'Nombres de invitados variables opcionales']
        }),
        image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_pap_03',
        category: 'PAPELERIA',
        subcategory: 'Save The Date',
        name: 'Save the Date Postal en Lino con Caligrafía & Sobre',
        description: 'Tarjeta postal elegante con fecha grabada, tipografía sobria y sobre confeccionado con forro ilustrado en acuarela del venue o monograma de la pareja.',
        pricing_type: 'PER_PIECE',
        base_price: 68.00,
        min_pieces: 40,
        specs_json: JSON.stringify({
          formato: '13 x 18 cm',
          acabados: ['Sobre con solapa en pico y forro ilustrado', 'Impresión offset digital fine-art']
        }),
        image_url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_pap_04',
        category: 'PAPELERIA',
        subcategory: 'Misales & Guías',
        name: 'Misal & Libreta de Ceremonia Religiosa con Cinta de Seda',
        description: 'Cuadernillo de 8 a 12 páginas con lecturas, oraciones y orden ceremonial. Portada en papel vegetal traslúcido atado con cinta de seda cruda deshilachada a mano.',
        pricing_type: 'PER_PIECE',
        base_price: 58.00,
        min_pieces: 30,
        specs_json: JSON.stringify({
          paginas: '8 páginas interiores en papel ahuesado 120g',
          atado: 'Listón de seda 100% natural teñido artesanalmente'
        }),
        image_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_pap_05',
        category: 'PAPELERIA',
        subcategory: 'Votos Nupciales',
        name: 'Set de Votos Nupciales en Piel Genuina o Terciopelo',
        description: 'Dúo de cuadernos para novio y novia encuadernados artesanalmente en terciopelo o piel suave con grabado de nombres en bajo relieve.',
        pricing_type: 'PER_PIECE',
        base_price: 650.00,
        min_pieces: 1,
        specs_json: JSON.stringify({
          incluye: '2 libretas tamaño A6 con cinta de seda y guardas personalizadas'
        }),
        image_url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80'
      },

      // --- STANDS & EXPERIENCIAS DE BIENVENIDA ---
      {
        id: 'cat_sta_01',
        category: 'STANDS_EXPERIENCIAS',
        subcategory: 'Welcome Drinks',
        name: 'Welcome Drinks Bar Monumental de Cristal & Madera Natural',
        description: 'Barra modular premium con contra-barra decorada, cristalería de corte vintage biselado (hasta 150 copas en exhibición), letrero de acrílico personalizado con cócteles de la casa, dispensadores de vidrio labrado y montaje estilizado.',
        pricing_type: 'FIXED_EVENT',
        base_price: 8500.00,
        min_pieces: 1,
        specs_json: JSON.stringify({
          duracion: '3 horas de servicio de bienvenida',
          incluye: ['Mobiliario barra y contra-barra', 'Copas biseladas de cristal tallado', 'Letrero de cócteles caligrafiado', 'Montaje 3 hrs previas al evento y desmontaje']
        }),
        image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_sta_02',
        category: 'STANDS_EXPERIENCIAS',
        subcategory: 'Seating Chart',
        name: 'Seating Chart Espejo Barroco Dorado de 1.80m Caligrafiado a Mano',
        description: 'Espejo de gran formato con marco tallado en hoja de oro o bronce envejecido. Asignación de mesas y nombres de invitados rotulados a mano con tinta impermeable blanca por calígrafa profesional.',
        pricing_type: 'FIXED_EVENT',
        base_price: 5200.00,
        min_pieces: 1,
        specs_json: JSON.stringify({
          medidas: '180 x 90 cm',
          caballete: 'Caballete de madera maciza barnizada o forja dorada incluido',
          capacidad: 'Hasta 25 mesas / 250 invitados'
        }),
        image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_sta_03',
        category: 'STANDS_EXPERIENCIAS',
        subcategory: 'Seating Chart',
        name: 'Mampara Flotante de Acrílico Doble & Base Floral',
        description: 'Panel de acrílico transparente de 1.90m con tipografía suspendida en relieve 3D y base de estructura metálica champagne con guía floral orgánica.',
        pricing_type: 'FIXED_EVENT',
        base_price: 5800.00,
        min_pieces: 1,
        specs_json: JSON.stringify({
          medidas: '190 x 100 cm',
          estilo: 'Minimalista contemporáneo'
        }),
        image_url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_sta_04',
        category: 'STANDS_EXPERIENCIAS',
        subcategory: 'Audio Guestbook',
        name: 'Audio Guestbook Teléfono Vintage en Stand Editorial',
        description: 'Teléfono rotativo retro clásico de los años 50s en acabado marfil o blush. Los invitados descuelgan el auricular, escuchan un saludo grabado con la voz de los novios y dejan su mensaje con audio digital de alta fidelidad. Incluye stand decorativo, letrero luminoso de neón cálido "Leave a Message" y entrega posterior de todos los audios masterizados con portada musical.',
        pricing_type: 'FIXED_EVENT',
        base_price: 4200.00,
        min_pieces: 1,
        specs_json: JSON.stringify({
          incluye: ['Teléfono vintage con memoria y batería autónoma 12 hrs', 'Mesa velador o pedestal estilizado', 'Letrero de instrucciones enmarcado', 'Entrega de audios en enlace privado y USB de regalo']
        }),
        image_url: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'cat_sta_05',
        category: 'STANDS_EXPERIENCIAS',
        subcategory: 'Welcome Drinks',
        name: 'Torre de Champagne Monumental (6 Niveles / 91 Copas Coupe)',
        description: 'Estructura nivelada y estabilizada para pirámide de copas coupe de cristal estilo Gatsby. Incluye charola receptora decorada con follaje y servicio asistido para el vertido inicial de los novios.',
        pricing_type: 'FIXED_EVENT',
        base_price: 4600.00,
        min_pieces: 1,
        specs_json: JSON.stringify({
          capacidad: '91 copas cristal coupe',
          montaje: 'Nivelación láser y asistencia en momento cumbre'
        }),
        image_url: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=600&q=80'
      }
    ];

    const insertCat = db.prepare(`
      INSERT INTO vlb_catalog (id, category, subcategory, name, description, pricing_type, base_price, min_pieces, specs_json, image_url, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of catalogItems) {
      insertCat.run(
        item.id,
        item.category,
        item.subcategory,
        item.name,
        item.description,
        item.pricing_type,
        item.base_price,
        item.min_pieces,
        item.specs_json,
        item.image_url,
        1,
        now,
        now
      );
    }

    // Seed sample quote
    const sampleQuoteId = 'quote_vlb_demo_1';
    const subtotal = (120 * 145) + (120 * 48) + 8500 + 4200; // 17400 + 5760 + 8500 + 4200 = 35860
    const downPayment = subtotal * 0.5;
    const balance = subtotal - downPayment;

    db.prepare(`
      INSERT INTO vlb_quotes (
        id, quote_number, client_name, partner_name, client_email, client_phone,
        event_date, event_venue, status, subtotal, discount, total,
        down_payment_pct, down_payment_amount, balance_due, notes, valid_until, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sampleQuoteId,
      'VLB-2026-001',
      'Camila Fernández',
      'Mateo Alarcón',
      'camila.fernandez@ejemplo.com',
      '+52 33 1290 8472',
      '2026-11-21',
      'Hacienda San José del Carmen',
      'APROBADA',
      subtotal,
      0,
      subtotal,
      50,
      downPayment,
      balance,
      'Cotización para papelería completa en algodón rasgado y experiencia de bienvenida con Welcome Drinks y Audio Guestbook.',
      '2026-11-30',
      'Valeria Lozano (VLB Director)',
      now,
      now
    );

    const insertQuoteItem = db.prepare(`
      INSERT INTO vlb_quote_items (
        id, quote_id, catalog_id, category, item_name, description, pricing_type, unit_price, quantity, total_price, custom_options_json, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuoteItem.run('qitem_1', sampleQuoteId, 'cat_pap_01', 'PAPELERIA', 'Invitación de Boda en Algodón Artesanal & Lacre de Cera', '120 invitaciones con lacre oro pálido y caligrafía personalizada', 'PER_PIECE', 145, 120, 17400, JSON.stringify({ tinta: 'Nogal oscuro', lacre: 'Oro envejecido' }), 1);
    insertQuoteItem.run('qitem_2', sampleQuoteId, 'cat_pap_02', 'PAPELERIA', 'Menú Editorial Individual con Hot Stamping Oro Mate', '120 menús para banquete', 'PER_PIECE', 48, 120, 5760, JSON.stringify({ acabado: 'Foil oro' }), 2);
    insertQuoteItem.run('qitem_3', sampleQuoteId, 'cat_sta_01', 'STANDS_EXPERIENCIAS', 'Welcome Drinks Bar Monumental de Cristal & Madera Natural', 'Barra frontal con 150 copas de cristal tallado y letrero en acrílico', 'FIXED_EVENT', 8500, 1, 8500, JSON.stringify({ horas: '3 horas de cóctel' }), 3);
    insertQuoteItem.run('qitem_4', sampleQuoteId, 'cat_sta_04', 'STANDS_EXPERIENCIAS', 'Audio Guestbook Teléfono Vintage en Stand Editorial', 'Teléfono rotativo en color marfil con stand y letrero luminoso', 'FIXED_EVENT', 4200, 1, 4200, JSON.stringify({ color: 'Marfil vintage' }), 4);

    // Seed sample order
    const sampleOrderId = 'ord_vlb_demo_1';
    db.prepare(`
      INSERT INTO vlb_orders (
        id, order_number, quote_id, client_name, partner_name, client_email, client_phone,
        event_date, event_venue, total_amount, down_payment_required, total_paid, balance_pending,
        payment_status, production_status, vobo_design_deadline, physical_delivery_date,
        stand_setup_date, stand_setup_time, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sampleOrderId,
      'ORD-VLB-2026-001',
      sampleQuoteId,
      'Camila Fernández',
      'Mateo Alarcón',
      'camila.fernandez@ejemplo.com',
      '+52 33 1290 8472',
      '2026-11-21',
      'Hacienda San José del Carmen',
      subtotal,
      downPayment,
      downPayment, // 50% already paid
      balance,     // 50% pending
      'ANTICIPO_PAGADO',
      'VOBO_PENDIENTE',
      '2026-11-08',
      '2026-11-18',
      '2026-11-21',
      '14:00',
      'Diseño en revisión con la novia. Muestra física de lacre aprobada.',
      now,
      now
    );

    // Seed sample payment (Anticipo 50% SPEI)
    db.prepare(`
      INSERT INTO vlb_payments (
        id, order_id, amount, payment_type, payment_method, payment_date, reference_num, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pay_vlb_1',
      sampleOrderId,
      downPayment,
      'ANTICIPO_50',
      'SPEI',
      '2026-11-01',
      'SPEI-BBVA-938210384',
      'Anticipo del 50% recibido para inicio de maquila y reserva de stands de bienvenida.',
      now
    );

    // Seed sample document (Contrato firmado)
    db.prepare(`
      INSERT INTO vlb_documents (
        id, order_id, category, original_name, file_path, mime_type, file_size, vobo_status, notes, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'doc_vlb_1',
      sampleOrderId,
      'CONTRATO_FIRMADO',
      'Contrato_Servicios_VLB_Camila_Mateo_Firmado.pdf',
      'uploads/vlb/contrato_sample.pdf',
      'application/pdf',
      245000,
      'APROBADO',
      'Contrato de prestación de servicios de papelería social y renta de stands firmado por ambas partes.',
      'Valeria Lozano (VLB Director)',
      now
    );

    db.prepare(`
      INSERT INTO vlb_documents (
        id, order_id, category, original_name, file_path, mime_type, file_size, vobo_status, notes, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'doc_vlb_2',
      sampleOrderId,
      'COMPROBANTE_SPEI',
      'Comprobante_SPEI_Anticipo_50pct.pdf',
      'uploads/vlb/spei_anticipo_sample.pdf',
      'application/pdf',
      182000,
      'APROBADO',
      'Comprobante bancario BBVA por $17,930.00 MXN.',
      'Camila Fernández',
      now
    );

    db.prepare(`
      INSERT INTO vlb_documents (
        id, order_id, category, original_name, file_path, mime_type, file_size, vobo_status, notes, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'doc_vlb_3',
      sampleOrderId,
      'VOBO_DISENO',
      'Propuesta_Digital_Invitacion_Menus_V1.pdf',
      'uploads/vlb/vobo_invitacion_v1.pdf',
      'application/pdf',
      850000,
      'PENDIENTE',
      'Propuesta tipográfica con caligrafía manual en nombres y prueba de lacre dorado.',
      'Valeria Lozano (VLB Director)',
      now
    );
  }
}
