import { ChecklistItem, WeddingProfile, WeddingState } from '../types/lazo';

export const DEFAULT_COVER_PHOTOS = [
  {
    id: 'editorial-1',
    label: 'Ramo Editorial',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'editorial-2',
    label: 'Atardecer Romántico',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'editorial-3',
    label: 'Recepción Minimalista',
    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80'
  }
];

function subtractMonths(dateStr: string, months: number): string {
  const base = dateStr ? new Date(dateStr + 'T12:00:00') : new Date(Date.now() + 365 * 86400000);
  const d = new Date(base);
  if (months < 1) {
    d.setDate(d.getDate() - Math.round(months * 30));
  } else {
    d.setMonth(d.getMonth() - Math.round(months));
  }
  const today = new Date();
  if (d < today) {
    // If calculated date is in the past, schedule smoothly in the coming weeks
    const soon = new Date(today);
    soon.setDate(soon.getDate() + Math.max(3, Math.round((14 - months) * 2)));
    return soon.toISOString().split('T')[0];
  }
  return d.toISOString().split('T')[0];
}

export const CHECKLIST_STAGE_ORDER = [
  '12 - 16 meses',
  '10 - 11 meses',
  '8 - 9 meses',
  '6 - 7 meses',
  '4 - 5 meses',
  '2 - 3 meses',
  '1 mes',
  '15 días',
  '1 semana',
  'Look & Kit Novia',
  'Look Novio',
  'Mis Tareas'
] as const;

const MASTER_WEDDING_TASKS: Array<{
  title: string;
  category: string;
  monthsBefore: number;
  owner: 'Novia' | 'Novio' | 'Ambos';
}> = [
  // === ETAPA: 12 - 16 meses ===
  { title: 'Fijar fecha de la boda', category: '12 - 16 meses', monthsBefore: 14, owner: 'Ambos' },
  { title: 'Elaborar un presupuesto inicial y aportaciones', category: '12 - 16 meses', monthsBefore: 14, owner: 'Ambos' },
  { title: 'Hacer lista inicial de invitados', category: '12 - 16 meses', monthsBefore: 14, owner: 'Ambos' },
  { title: 'Separar lugar para la recepción', category: '12 - 16 meses', monthsBefore: 13, owner: 'Ambos' },
  { title: 'Separar iglesia (si aplica)', category: '12 - 16 meses', monthsBefore: 13, owner: 'Ambos' },
  { title: 'Definir el estilo, paleta de colores y moodboard de la boda', category: '12 - 16 meses', monthsBefore: 13, owner: 'Ambos' },
  { title: 'Contratar foto y video', category: '12 - 16 meses', monthsBefore: 12, owner: 'Ambos' },
  { title: 'Buscar proveedores de música para recepción', category: '12 - 16 meses', monthsBefore: 12, owner: 'Ambos' },
  { title: 'Contratar el registro civil', category: '12 - 16 meses', monthsBefore: 12, owner: 'Ambos' },
  { title: 'Buscar padre / oficiante para la ceremonia', category: '12 - 16 meses', monthsBefore: 12, owner: 'Ambos' },
  { title: 'Hacer un horario tentativo del día de la boda', category: '12 - 16 meses', monthsBefore: 12, owner: 'Ambos' },
  { title: 'Definir estilo de despedida de soltera y fecha estimada', category: '12 - 16 meses', monthsBefore: 12, owner: 'Novia' },
  { title: 'Definir lugar para despedidas y estimado de invitados', category: '12 - 16 meses', monthsBefore: 12, owner: 'Ambos' },
  { title: 'Empezar a buscar vestido de novia y accesorios', category: '12 - 16 meses', monthsBefore: 12, owner: 'Novia' },

  // === ETAPA: 10 - 11 meses ===
  { title: 'Revisar con iglesia la papelería que se necesita', category: '10 - 11 meses', monthsBefore: 11, owner: 'Ambos' },
  { title: 'Ir viendo el modelo del vestido de novia', category: '10 - 11 meses', monthsBefore: 11, owner: 'Novia' },
  { title: 'Buscar y contratar florista y/o decorador', category: '10 - 11 meses', monthsBefore: 11, owner: 'Ambos' },
  { title: 'Cotizar y separar lugar para despedida de soltera', category: '10 - 11 meses', monthsBefore: 10, owner: 'Novia' },
  { title: 'Cotizar y separar servicios externos (tarima, pista de baile, mobiliario, etc.)', category: '10 - 11 meses', monthsBefore: 10, owner: 'Ambos' },
  { title: 'Separar maquillaje y peinado', category: '10 - 11 meses', monthsBefore: 10, owner: 'Novia' },
  { title: 'Confirmar música para recepción y dar anticipo', category: '10 - 11 meses', monthsBefore: 10, owner: 'Ambos' },
  { title: 'Confirmar música para iglesia y dar anticipo', category: '10 - 11 meses', monthsBefore: 10, owner: 'Ambos' },

  // === ETAPA: 8 - 9 meses ===
  { title: 'Definir arreglos florales de la iglesia, casa de la novia, ramos y carro', category: '8 - 9 meses', monthsBefore: 9, owner: 'Ambos' },
  { title: 'Junta con florista de iglesia y recepción', category: '8 - 9 meses', monthsBefore: 9, owner: 'Ambos' },
  { title: 'Agendar sesión Save the Date', category: '8 - 9 meses', monthsBefore: 9, owner: 'Ambos' },
  { title: 'Separar vestido de novia', category: '8 - 9 meses', monthsBefore: 9, owner: 'Novia' },
  { title: 'Comprar accesorios de la novia: tocado, velo y zapatos', category: '8 - 9 meses', monthsBefore: 8, owner: 'Novia' },
  { title: 'Buscar parroquia para las pláticas prematrimoniales', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Hacer la selección de los padrinos para matrimonio civil y religioso', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Ir preparando papelería: Acta de Bautismo, Confirmación y Acta de Nacimiento', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Definir estilo de invitación para boda', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Revisar la lista inicial de invitados y ajustar si es necesario', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Contratar o planear luna de miel', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Sacar visas y actualizar pasaportes para la luna de miel (si aplica)', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Contratar mesa de postres, quesos o botana para boda y despedida', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Abrir mesa de regalos', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Contratar carro para los novios el día de la boda', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },
  { title: 'Cotizar y separar regalos, música, pastel y show para despedida de soltera', category: '8 - 9 meses', monthsBefore: 8, owner: 'Novia' },
  { title: 'Mandar hacer tarjeta de invitación para testigos civil, iglesia y padrinos', category: '8 - 9 meses', monthsBefore: 8, owner: 'Ambos' },

  // === ETAPA: 6 - 7 meses ===
  { title: 'Invitar al padre que los va a casar', category: '6 - 7 meses', monthsBefore: 7, owner: 'Ambos' },
  { title: 'Mandar a hacer las invitaciones formales', category: '6 - 7 meses', monthsBefore: 7, owner: 'Ambos' },
  { title: 'Cotizar y contratar vinos y licores adicionales para la boda', category: '6 - 7 meses', monthsBefore: 7, owner: 'Ambos' },
  { title: 'Contratar el pastel de boda', category: '6 - 7 meses', monthsBefore: 7, owner: 'Ambos' },
  { title: 'Ponerse de acuerdo con otras novias para compartir decoración (si aplica)', category: '6 - 7 meses', monthsBefore: 7, owner: 'Novia' },
  { title: 'Contratar proveedor de iluminación para la boda (si aplica)', category: '6 - 7 meses', monthsBefore: 6, owner: 'Ambos' },
  { title: 'Contratar proveedor de detalles especiales y happenings', category: '6 - 7 meses', monthsBefore: 6, owner: 'Ambos' },
  { title: 'Planear y comprar juegos y premios para despedida de soltera', category: '6 - 7 meses', monthsBefore: 6, owner: 'Novia' },
  { title: 'Mandar a hacer invitaciones para la despedida de soltera', category: '6 - 7 meses', monthsBefore: 6, owner: 'Novia' },
  { title: 'Agendar cita con maquillista para prueba (ideal el día del Save the Date)', category: '6 - 7 meses', monthsBefore: 6, owner: 'Novia' },
  { title: 'Realizar sesión Save the Date y enviarlo a invitados', category: '6 - 7 meses', monthsBefore: 6, owner: 'Ambos' },
  { title: 'Ir viendo vestido para las mamás', category: '6 - 7 meses', monthsBefore: 6, owner: 'Ambos' },
  { title: 'Comprar anillos de boda, arras con su cofre y lazo', category: '6 - 7 meses', monthsBefore: 6, owner: 'Ambos' },
  { title: 'Acudir a pláticas prematrimoniales', category: '6 - 7 meses', monthsBefore: 6, owner: 'Ambos' },

  // === ETAPA: 4 - 5 meses ===
  { title: 'Pedirle solicitud de matrimonio al juez', category: '4 - 5 meses', monthsBefore: 5, owner: 'Ambos' },
  { title: 'Hacer la despedida de soltera', category: '4 - 5 meses', monthsBefore: 5, owner: 'Novia' },
  { title: 'Cotizar y buscar vestidos para los pajecitos y las damas', category: '4 - 5 meses', monthsBefore: 5, owner: 'Novia' },
  { title: 'Enviar las invitaciones foráneas', category: '4 - 5 meses', monthsBefore: 5, owner: 'Ambos' },
  { title: 'Planear los regalos para testigos y padrinos (si aplica)', category: '4 - 5 meses', monthsBefore: 4, owner: 'Ambos' },
  { title: 'Reservar el cuarto de hotel para la noche de bodas', category: '4 - 5 meses', monthsBefore: 4, owner: 'Ambos' },
  { title: 'Reservar el cuarto de hotel para getting ready (si aplica)', category: '4 - 5 meses', monthsBefore: 4, owner: 'Ambos' },
  { title: 'Hacer pedido de pantuflas, termos y recuerdos', category: '4 - 5 meses', monthsBefore: 4, owner: 'Ambos' },
  { title: 'Organizar despedida formal del novio', category: '4 - 5 meses', monthsBefore: 4, owner: 'Novio' },

  // === ETAPA: 2 - 3 meses ===
  { title: 'Buscar traje para el novio', category: '2 - 3 meses', monthsBefore: 3, owner: 'Novio' },
  { title: 'Comprar maletas para la luna de miel', category: '2 - 3 meses', monthsBefore: 3, owner: 'Ambos' },
  { title: 'Cita de degustación de menú y pastel', category: '2 - 3 meses', monthsBefore: 3, owner: 'Ambos' },
  { title: 'Mandar a hacer los menús y números de mesa', category: '2 - 3 meses', monthsBefore: 3, owner: 'Ambos' },
  { title: 'Escoger las lecturas y repertorio musical para la misa', category: '2 - 3 meses', monthsBefore: 3, owner: 'Ambos' },
  { title: 'Definir canciones clave: entrada, vals novios, vals papás y cierre', category: '2 - 3 meses', monthsBefore: 3, owner: 'Ambos' },
  { title: 'Prueba de maquillaje y peinado', category: '2 - 3 meses', monthsBefore: 2, owner: 'Novia' },
  { title: 'Pedir agenda para la prueba del vestido de novia', category: '2 - 3 meses', monthsBefore: 2, owner: 'Novia' },
  { title: 'Acordar con el fotógrafo el itinerario y locaciones para la sesión de novios', category: '2 - 3 meses', monthsBefore: 2, owner: 'Ambos' },
  { title: 'Enviar invitaciones locales', category: '2 - 3 meses', monthsBefore: 2, owner: 'Ambos' },
  { title: 'Seleccionar música para cóctel y cena', category: '2 - 3 meses', monthsBefore: 2, owner: 'Ambos' },
  { title: 'Mamás y hermanas agendar citas de maquillaje y peinado para la boda', category: '2 - 3 meses', monthsBefore: 2, owner: 'Ambos' },
  { title: 'Hacer asignación de lectores e involucrados en la misa', category: '2 - 3 meses', monthsBefore: 2, owner: 'Ambos' },
  { title: 'Terminar la lista de invitados lista para confirmaciones RSVP', category: '2 - 3 meses', monthsBefore: 2, owner: 'Ambos' },
  { title: 'Acudir a presentación religiosa con testigos (2 por cada novio)', category: '2 - 3 meses', monthsBefore: 2, owner: 'Ambos' },

  // === ETAPA: 1 mes ===
  { title: 'Preparar pago del salón antes de la boda', category: '1 mes', monthsBefore: 1, owner: 'Ambos' },
  { title: 'Confirmaciones de invitados (RSVP) por WhatsApp', category: '1 mes', monthsBefore: 1, owner: 'Ambos' },
  { title: 'Armar canastas de baño para damas y caballeros', category: '1 mes', monthsBefore: 1, owner: 'Ambos' },
  { title: 'Mamás, hermanas, damas y pajecitos recoger vestidos y últimos ajustes', category: '1 mes', monthsBefore: 1, owner: 'Ambos' },
  { title: 'Últimos pagos a proveedores', category: '1 mes', monthsBefore: 1, owner: 'Ambos' },
  { title: 'Entrega de regalos a testigos civil, iglesia y padrinos', category: '1 mes', monthsBefore: 1, owner: 'Ambos' },
  { title: 'Última prueba de vestido de novia', category: '1 mes', monthsBefore: 1, owner: 'Novia' },
  { title: 'Agendar facial previo a la boda', category: '1 mes', monthsBefore: 1, owner: 'Novia' },
  { title: 'Rentar o recoger traje de novio', category: '1 mes', monthsBefore: 1, owner: 'Novio' },
  { title: 'Entregar documentos en iglesia', category: '1 mes', monthsBefore: 1, owner: 'Ambos' },

  // === ETAPA: 15 días ===
  { title: '2da prueba / ajuste final del vestido de novia', category: '15 días', monthsBefore: 0.5, owner: 'Novia' },
  { title: 'Recoger anillos y poner arras, anillos y lazo en cofrecitos', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Hacerse análisis de sangre y entregar papelería al juez civil', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Ir a recoger la carta de traslado (si aplica)', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Avisarle a los involucrados de la misa y mandarles las lecturas', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Terminar asignación de mesas y plano del salón', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Confirmar al salón el número final de invitados y alergias', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Hacer cita para manicure, pedicure y depilación', category: '15 días', monthsBefore: 0.5, owner: 'Novia' },
  { title: 'Mandar a limpiar el anillo de compromiso', category: '15 días', monthsBefore: 0.5, owner: 'Novia' },
  { title: 'Cita final con el padre que los va a casar', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Rentar traje de papás y hermanos (y probar traje del novio)', category: '15 días', monthsBefore: 0.5, owner: 'Novio' },
  { title: 'Confirmar horarios y últimos pagos con todos los proveedores', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },
  { title: 'Pisar los zapatos de la novia en casa para amoldarlos', category: '15 días', monthsBefore: 0.5, owner: 'Novia' },
  { title: 'Confirmar con la florista la hora de entrega o pick up de los ramos', category: '15 días', monthsBefore: 0.5, owner: 'Ambos' },

  // === ETAPA: 1 semana ===
  { title: 'Corte de cabello del novio', category: '1 semana', monthsBefore: 0.25, owner: 'Novio' },
  { title: 'Checar últimos pendientes con el lugar de la recepción', category: '1 semana', monthsBefore: 0.25, owner: 'Ambos' },
  { title: 'Recoger vestido de novia y de la mamá', category: '1 semana', monthsBefore: 0.25, owner: 'Novia' },
  { title: 'Confesarse los novios y familia (para ceremonia religiosa)', category: '1 semana', monthsBefore: 0.25, owner: 'Ambos' },
  { title: 'Confirmar citas de manicure, pedicure, facial, masaje, maquillaje y peinado', category: '1 semana', monthsBefore: 0.25, owner: 'Novia' },
  { title: 'Revisar minuto a minuto final del Gran Día con proveedores y familia', category: '1 semana', monthsBefore: 0.25, owner: 'Ambos' },
  { title: 'Preparar sobres con saldos finales a liquidar ese día', category: '1 semana', monthsBefore: 0.25, owner: 'Ambos' },
  { title: 'Preparar sobres para propinas de meseros, staff y valet parking', category: '1 semana', monthsBefore: 0.25, owner: 'Ambos' },

  // === LOOK & KIT NOVIA ===
  { title: 'Checklist Novia: Vestido, tocado, velo/mantilla y zapatos listos', category: 'Look & Kit Novia', monthsBefore: 0.25, owner: 'Novia' },
  { title: 'Checklist Novia: Aretes, collar, perfume y batas de getting ready', category: 'Look & Kit Novia', monthsBefore: 0.25, owner: 'Novia' },
  { title: 'Checklist Novia: Zapatos cómodos extra (ej. tenis) para la fiesta', category: 'Look & Kit Novia', monthsBefore: 0.25, owner: 'Novia' },
  { title: 'Kit SOS Novia: Desodorante, base, polvo, labial, perfume mini y kleenex', category: 'Look & Kit Novia', monthsBefore: 0.25, owner: 'Novia' },
  { title: 'Maleta preparada para noche de bodas y luna de miel', category: 'Look & Kit Novia', monthsBefore: 0.25, owner: 'Novia' },

  // === LOOK NOVIO ===
  { title: 'Checklist Novio: Traje, camisa, zapatos, calcetas y mancuernillas listos', category: 'Look Novio', monthsBefore: 0.25, owner: 'Novio' },
  { title: 'Checklist Novio: Perfume y boutonniere confirmado con florista', category: 'Look Novio', monthsBefore: 0.25, owner: 'Novio' }
];

export function generateChecklistForDate(weddingDate: string): ChecklistItem[] {
  return MASTER_WEDDING_TASKS.map((t, idx) => ({
    id: `chk_m_${idx + 1}`,
    title: t.title,
    category: t.category,
    monthsBefore: t.monthsBefore,
    dueDate: subtractMonths(weddingDate, t.monthsBefore),
    completed: false,
    owner: t.owner,
    notes: ''
  }));
}

export function createInitialWeddingState(profile: WeddingProfile): WeddingState {
  const half = Math.round(profile.budgetGoal * 0.35);
  const family = Math.round(profile.budgetGoal * 0.15);

  return {
    onboarded: true,
    profile,
    contributions: [
      { id: 'c1', label: profile.partner1 || 'Novia', pledged: half, saved: Math.round(half * 0.25) },
      { id: 'c2', label: profile.partner2 || 'Novio', pledged: half, saved: Math.round(half * 0.25) },
      { id: 'c3', label: 'Aportación Familia', pledged: family * 2, saved: 0 }
    ],
    quotes: [],
    vendors: [],
    guests: [],
    tables: [
      { id: 'tbl_1', name: 'Mesa de Novios', shape: 'Imperial', capacity: 2, x: 340, y: 75, rotation: 0 },
      { id: 'tbl_2', name: 'Mesa 1 · Familia', shape: 'Redonda', capacity: 10, x: 170, y: 245, rotation: 0 },
      { id: 'tbl_3', name: 'Mesa 2 · Amigos', shape: 'Redonda', capacity: 10, x: 510, y: 245, rotation: 0 }
    ],
    floorElements: [
      { id: 'el_pista', type: 'pista', label: 'Pista de Baile', x: 340, y: 260, width: 148, height: 148 },
      { id: 'el_dj', type: 'dj', label: 'DJ / Escenario', x: 340, y: 425, width: 150, height: 48 }
    ],
    checklist: generateChecklistForDate(profile.weddingDate),
    timeline: [
      { id: 'tl_1', time: '10:00', title: 'Getting Ready — Maquillaje y Peinado', location: 'Suite Nupcial', notes: 'Llegada de foto y video' },
      { id: 'tl_2', time: '15:30', title: 'First Look & Sesión de Pareja', location: 'Jardín Principal', notes: '' },
      { id: 'tl_3', time: '17:00', title: 'Ceremonia', location: 'Capilla / Jardín', notes: '' },
      { id: 'tl_4', time: '18:30', title: 'Cóctel de Bienvenida', location: 'Terraza', notes: 'Música acústica y mixología' },
      { id: 'tl_5', time: '20:00', title: 'Entrada de Novios y Cena', location: 'Salón Principal', notes: '' },
      { id: 'tl_6', time: '21:30', title: 'Primer Baile y Fiesta', location: 'Pista Central', notes: '' }
    ],
    ceremonies: {
      civilEnabled: true,
      civilDate: profile.weddingDate,
      civilTime: '16:30',
      civilVenue: '',
      civilWitnesses: '',
      religiousEnabled: false,
      religiousTime: '',
      religiousVenue: '',
      religiousSongs: '',
      religiousReadings: ''
    },
    style: {
      palette: [
        { name: 'Marfil', hex: '#F8F5F0' },
        { name: 'Terracota', hex: '#6E2E3A' },
        { name: 'Salvia', hex: '#6E8C70' },
        { name: 'Espresso', hex: '#1F1D1E' }
      ],
      vibe: 'Editorial Minimalista · Orgánico y Atemporal',
      brideLook: '',
      groomLook: '',
      photos: [
        {
          id: 'insp_1',
          url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80',
          caption: 'Mesa con velas y flores blancas'
        },
        {
          id: 'insp_2',
          url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80',
          caption: 'Ramo orgánico atemporal'
        }
      ]
    },
    files: []
  };
}

export function createDemoWeddingState(): WeddingState {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 8);
  const dateStr = futureDate.toISOString().split('T')[0];

  const state = createInitialWeddingState({
    partner1: 'Sofía',
    partner2: 'Mateo',
    weddingDate: dateStr,
    city: 'Monterrey',
    budgetGoal: 380000,
    estimatedGuests: 140,
    coverPhoto: DEFAULT_COVER_PHOTOS[0].url,
    coverPositionY: 45,
    partnerInviteCode: 'SOFIA-MATEO-2027'
  });

  state.quotes = [
    {
      id: 'q1',
      category: 'Fotografía',
      vendorName: 'Atelier Luz Studio',
      price: 42000,
      includes: '10 horas, 2 fotógrafos, sesión pre-boda y galería digital',
      pros: 'Estilo editorial muy natural, entregan en 3 semanas',
      cons: 'No incluye video',
      phone: '+528112345678'
    },
    {
      id: 'q2',
      category: 'Fotografía',
      vendorName: 'Norte Film & Photo',
      price: 54000,
      includes: '12 horas, foto + video highlight 5 min + dron',
      pros: 'Paquete todo incluido, muy buena vibra en llamada',
      cons: 'Se pasa $4,000 del presupuesto de foto',
      phone: '+528187654321'
    }
  ];

  state.vendors = [
    {
      id: 'v1',
      name: 'Hacienda Caoba',
      category: 'Locación y Banquete',
      phone: '+528110001122',
      totalCost: 185000,
      paidAmount: 60000,
      nextDueDate: subtractMonths(dateStr, 4),
      contractName: 'Contrato_Hacienda_Caoba.pdf',
      notes: 'Incluye mobiliario base y 5 horas de barra libre',
      payments: [
        {
          id: 'pay_1',
          date: new Date().toISOString().split('T')[0],
          amount: 60000,
          concept: 'Anticipo para apartar fecha',
          method: 'Transferencia'
        }
      ]
    },
    {
      id: 'v2',
      name: 'Casa Botánica Flores',
      category: 'Diseño Floral',
      phone: '+528110003344',
      totalCost: 48000,
      paidAmount: 15000,
      nextDueDate: subtractMonths(dateStr, 2),
      notes: 'Ramo de novia, arco floral y 14 centros de mesa',
      payments: [
        {
          id: 'pay_2',
          date: new Date().toISOString().split('T')[0],
          amount: 15000,
          concept: 'Anticipo 1 · Diseño Floral',
          method: 'Transferencia'
        }
      ]
    }
  ];

  state.guests = [
    { id: 'g1', name: 'Camila Garza', phone: '+528112340001', passes: 2, status: 'Confirmado', dietary: 'Vegetariana', tableId: 'tbl_2', side: 'Novia' },
    { id: 'g2', name: 'Diego Martínez', phone: '+528112340002', passes: 2, status: 'Confirmado', tableId: 'tbl_2', side: 'Novio' },
    { id: 'g3', name: 'Valeria Trevino', phone: '+528112340003', passes: 1, status: 'Pendiente', side: 'Novia' },
    { id: 'g4', name: 'Andrés & Lucía Morales', phone: '+528112340004', passes: 2, status: 'Pendiente', side: 'Ambos' }
  ];

  state.checklist[0].completed = true;
  state.checklist[1].completed = true;
  state.checklist[2].completed = true;

  state.files = [
    { id: 'f1', name: 'Contrato_Hacienda_Caoba.pdf', category: 'Contrato', date: new Date().toISOString().split('T')[0], notes: 'Firmado con cláusula de lluvia' },
    { id: 'f2', name: 'Anticipo_1_CasaBotanica.jpg', category: 'Comprobante', date: new Date().toISOString().split('T')[0], notes: 'Transferencia SPEI $15,000' }
  ];

  return state;
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return 'Por definir';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}
