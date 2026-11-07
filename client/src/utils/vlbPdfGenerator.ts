import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { VLB_CANVA_PDF_BASE64 } from './vlbCanvaPdfBase64';
import { VLB_MONT_LIGHT_BASE64 } from './vlbMontFontBase64';
import { VLB_MONOGRAM_PINK_BASE64 } from './vlbMonogramPinkBase64';
import { VLB_SCARLETTE_SIGNATURE_BASE64 } from './vlbScarletteSignatureBase64';

/**
 * Sanitizes string for pdf-lib standard fonts (WinAnsi).
 * Strips bidi control chars (\u202A-\u202E, \u200E, \u200F, \u200B, \uFEFF),
 * converts typographic quotes/dashes/bullets to standard characters,
 * preserves Spanish accented characters (á, é, í, ó, ú, ñ, etc.),
 * and removes emojis/unsupported symbols that cause WinAnsi encode crashes.
 */
// Helper para dividir párrafos largos en líneas de texto respetando palabras
function wrapPdfText(text: string, maxCharsPerLine: number = 96): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
      currentLine = currentLine + (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Convertidor base64 a Uint8Array para incrustar firmas digitales PNG en el PDF
function base64ToUint8Array(base64: string): Uint8Array {
  const raw = base64.replace(/^data:image\/\w+;base64,/, '');
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Safe draw helper that guarantees text is clean and never throws WinAnsi encoding errors
export function safeDraw(
  targetPage: PDFPage,
  text: string | null | undefined,
  drawOptions: Parameters<PDFPage['drawText']>[1]
) {
  const cleaned = cleanWinAnsi(text);
  if (!cleaned) return;
  try {
    targetPage.drawText(cleaned, drawOptions);
  } catch {
    const asciiOnly = (text || '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
    if (asciiOnly) {
      try {
        targetPage.drawText(asciiOnly, drawOptions);
      } catch {}
    }
  }
}

// Dibuja una línea de texto con justificación perfecta de margen a margen
function drawJustifiedLine(
  page: PDFPage,
  words: string[],
  startX: number,
  y: number,
  targetWidth: number,
  fontSize: number,
  font: PDFFont,
  color: RGB
) {
  if (words.length <= 1) {
    safeDraw(page, words.join(' '), { x: startX, y, size: fontSize, font, color });
    return;
  }
  const totalWordsWidth = words.reduce((acc, w) => acc + font.widthOfTextAtSize(w, fontSize), 0);
  const totalSpacing = targetWidth - totalWordsWidth;
  const spacePerWord = totalSpacing / (words.length - 1);

  let curX = startX;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    safeDraw(page, word, { x: curX, y, size: fontSize, font, color });
    curX += font.widthOfTextAtSize(word, fontSize) + spacePerWord;
  }
}

// Envuelve y dibuja un párrafo completo con justificación editorial en ambos márgenes
function drawJustifiedParagraph(
  page: PDFPage,
  text: string,
  startX: number,
  startY: number,
  targetWidth: number,
  fontSize: number,
  lineHeight: number,
  font: PDFFont,
  color: RGB
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentLineWidth = 0;
  const singleSpaceWidth = font.widthOfTextAtSize(' ', fontSize);

  for (const word of words) {
    const wordWidth = font.widthOfTextAtSize(word, fontSize);
    const widthWithWord = currentLine.length === 0 
      ? wordWidth 
      : currentLineWidth + singleSpaceWidth + wordWidth;

    if (widthWithWord <= targetWidth) {
      currentLine.push(word);
      currentLineWidth = widthWithWord;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [word];
      currentLineWidth = wordWidth;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  let y = startY;
  for (let idx = 0; idx < lines.length; idx++) {
    const lineWords = lines[idx];
    const isLastLine = idx === lines.length - 1;

    if (isLastLine || lineWords.length <= 1) {
      safeDraw(page, lineWords.join(' '), { x: startX, y, size: fontSize, font, color });
    } else {
      drawJustifiedLine(page, lineWords, startX, y, targetWidth, fontSize, font, color);
    }
    y -= lineHeight;
  }

  return y;
}

// Generador modular de cláusulas legales unificadas de Viva la Bride
export function getContractClauses(items: VlbQuoteItem[], quote: VlbQuote, folioNumber: string) {
  const hasDrinks = items.some(i => {
    const name = (i.item_name || '').toLowerCase();
    return name.includes('beer') || name.includes('cerveza') || name.includes('mimosa') || name.includes('drink') || name.includes('coctel') || name.includes('cóctel') || name.includes('barra');
  });

  const hasStandsOrWalls = items.some(i => {
    const name = (i.item_name || '').toLowerCase();
    return i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT' || name.includes('wall') || name.includes('mampara') || name.includes('muro') || name.includes('stand') || name.includes('back');
  });

  const hasMemorial = items.some(i => {
    const name = (i.item_name || '').toLowerCase();
    return name.includes('memorial') || name.includes('foto') || name.includes('velas');
  });

  const hasPapeleria = items.some(i => i.category === 'PAPELERIA');
  const isService = hasStandsOrWalls || hasDrinks || quote.quote_number?.startsWith('SV-') || quote.down_payment_amount === 1000;

  const clauses: { title: string; text: string }[] = [];
  let num = 1;

  clauses.push({
    title: `${num++}. OBJETO DEL CONTRATO Y RELACION CON COTIZACION`,
    text: `La Prestadora de Servicios se compromete a suministrar los servicios o elaborar las piezas descritas en la cotizacion oficial con folio ${folioNumber}. Ambas partes reconocen expresamente las partidas, cantidades y especificaciones acordadas.`
  });

  if (hasStandsOrWalls || hasDrinks) {
    clauses.push({
      title: `${num++}. MONTAJE, SEGURIDAD Y ACCESOS`,
      text: `El montaje se realizara 40 a 60 minutos previos al inicio del evento por personal de Viva la Bride. En espacios abiertos o al aire libre el mobiliario debera colocarse junto a un muro o estructura firme para su anclaje. Accesos por escaleras, plantas altas o maniobras especiales causaran cargo adicional notificado previamente. La prestadora podra negar el montaje si las condiciones representan riesgo.`
    });

    clauses.push({
      title: `${num++}. CUIDADO DEL MOBILIARIO Y EQUIPO`,
      text: `La Contratante es responsable por cualquier dano, rotura, perdida o robo total o parcial del mobiliario, mamparas, cristaleria o equipo proporcionado, comprometiendose a cubrir el costo de reposicion o reparacion correspondiente dentro de los 3 dias naturales posteriores al evento.`
    });
  }

  if (hasDrinks) {
    clauses.push({
      title: `${num++}. ESTACION DE BEBIDAS Y CONSUMO RESPONSABLE`,
      text: `Estacion de autoservicio asistido para coctel de bienvenida con duracion aprox. 1h 30m. No constituye barra libre ni servicio ilimitado. Destinado exclusivamente a mayores de edad promoviendo consumo responsable. La bebida remanente al terminar el tiempo se entrega al coordinador del evento; si el insumo se termina antes, se retira el mobiliario y concluye el servicio.`
    });
  }

  if (hasMemorial) {
    clauses.push({
      title: `${num++}. PERSONALIZACION Y MEMORIAL WALL`,
      text: `La Contratante entregara las fotografias digitales con al menos 7 dias naturales de anticipacion y confirmara frases antes de la produccion del vinil. Una vez autorizados los textos, disenos y fotografias finales, cualquier modificacion posterior generara costos adicionales.`
    });
  }

  if (hasPapeleria) {
    clauses.push({
      title: `${num++}. PROCESO DE DISENO Y PAPELERIA SOCIAL`,
      text: `Incluye hasta 3 rondas de ajustes de diseno antes de aprobacion final. Tiempos de entrega de 7 a 15 dias habiles a partir de VoBo y anticipo. Los tonos pueden presentar ligeras variaciones derivadas de pantallas, acabados artesanales y procesos de imprenta. Viva la Bride no es responsable por demoras de paqueterias externas.`
    });
  }

  if (isService) {
    clauses.push({
      title: `${num++}. PAGOS, LIQUIDACION Y CANCELACIONES`,
      text: `Separacion fija de $1,000 MXN para reservar fecha. La liquidacion total debe realizarse a mas tardar 10 dias naturales antes del evento. Anticipos no reembolsables. En caso de cancelacion por La Contratante, podra reagendarse dentro de los siguientes 30 dias naturales sujeto a disponibilidad y siempre que el servicio este totalmente liquidado.`
    });
  } else {
    clauses.push({
      title: `${num++}. PAGOS, LIQUIDACION Y CANCELACIONES`,
      text: `Anticipo del 50% para inicio de diseno y produccion. La liquidacion total debera realizarse previo a la entrega o programacion de envio. Anticipos no reembolsables. En caso de cancelacion por La Contratante, no se realizara reembolso y el cliente cubrira los costos de insumos generados hasta el momento.`
    });
  }

  clauses.push({
    title: `${num++}. AUTORIZACION DE IMAGEN Y VALIDEZ LEGAL`,
    text: `La Contratante autoriza el uso de fotografias y videos del montaje y ambientacion con fines de portafolio y redes sociales respetando la privacidad. La realizacion del anticipo o firma digital ratifica la total conformidad y validez vinculante del presente contrato.`
  });

  return { clauses, isService, hasDrinks, hasStandsOrWalls, hasMemorial, hasPapeleria };
}

export function cleanWinAnsi(str: string | null | undefined): string {
  if (!str) return '';
  let text = String(str);

  // 1. Strip bidirectional & zero-width & non-printable controls
  text = text.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // 2. Normalize smart punctuation and symbols
  text = text
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’`]/g, "'")
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·⋅]/g, '-')
    .replace(/[\r\n\t]/g, ' ');

  // 3. Keep standard ASCII and Latin-1 supplement (including Spanish accents á, é, í, ó, ú, ñ, etc.)
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // ASCII printable
    if (code >= 0x20 && code <= 0x7E) {
      result += char;
      continue;
    }

    // Latin-1 Supplement (á, é, í, ó, ú, ñ, Á, É, Í, Ó, Ú, Ñ, ü, Ü, ¿, ¡, etc.)
    if (code >= 0xA0 && code <= 0xFF) {
      result += char;
      continue;
    }

    // Specific Windows-1252 supported chars
    if (
      code === 0x20AC || // €
      code === 0x0160 || // Š
      code === 0x0161 || // š
      code === 0x017D || // Ž
      code === 0x017E || // ž
      code === 0x0152 || // Œ
      code === 0x0153 || // œ
      code === 0x0178    // Ÿ
    ) {
      result += char;
      continue;
    }

    // Try decomposing diacritics
    const normalized = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.length > 0 && normalized.charCodeAt(0) >= 0x20 && normalized.charCodeAt(0) <= 0x7E) {
      result += normalized;
    } else {
      result += ' ';
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Formats date into elegant Spanish format (e.g. "12 de Marzo de 2027")
 */
function formatSpanishDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return 'Por definir';
  const clean = dateStr.trim();
  const parts = clean.split('T')[0].split(' ')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    if (month >= 0 && month < 12 && !isNaN(day)) {
      return `${day} de ${months[month]} de ${year}`;
    }
  }
  return clean;
}

/**
 * Formats date into numeric DDMMYY format for bank payment concept (e.g. "120327")
 */
function formatConceptDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return '';
  const clean = dateStr.trim();
  const parts = clean.split('T')[0].split(' ')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0].slice(-2);
    const month = String(parseInt(parts[1], 10)).padStart(2, '0');
    const day = String(parseInt(parts[2], 10)).padStart(2, '0');
    return `${day}${month}${year}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  }
  return clean.replace(/\D/g, '').slice(0, 6);
}

/**
 * Splits text into lines that fit within maxWidth based on the font and size.
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    let width = 0;
    try {
      width = font.widthOfTextAtSize(testLine, fontSize);
    } catch {
      width = testLine.length * (fontSize * 0.55);
    }

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function buildVlbQuotePdf(
  quote: VlbQuote,
  items: VlbQuoteItem[],
  options?: { autoDownload?: boolean }
): Promise<{ blob: Blob; file: File; fileName: string; pdfDoc: PDFDocument }> {
  // 1. Decode raw Canva PDF bytes (the template is pre-cleaned with zero placeholder brackets)
  const binaryString = atob(VLB_CANVA_PDF_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 2. Load Canva PDF directly into pdf-lib (preserves all vectors, fonts and layout 100% untouched)
  const pdfDoc = await PDFDocument.load(bytes);
  const page = pdfDoc.getPages()[0];

  // Register fontkit to enable Mont geometric sans font (Mont ExtraLight throughout, sin negritas)
  pdfDoc.registerFontkit(fontkit);

  let fontRegular: any;
  let fontBold: any;

  try {
    const lightBinaryString = atob(VLB_MONT_LIGHT_BASE64);
    const lightBytes = new Uint8Array(lightBinaryString.length);
    for (let i = 0; i < lightBinaryString.length; i++) {
      lightBytes[i] = lightBinaryString.charCodeAt(i);
    }
    fontRegular = await pdfDoc.embedFont(lightBytes);
    // Sin negritas pesadas: usamos la estética fina y elegante de Mont ExtraLight en todo el documento
    fontBold = fontRegular;
  } catch (err) {
    console.warn('Fallback to standard fonts:', err);
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = fontRegular;
  }

  // Pure black text (#000000)
  const textColor = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);

  // Determine proposal category
  const isService = (items && items.length > 0)
    ? items.some(i => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT')
    : (quote.quote_number?.startsWith('SV-') || quote.down_payment_amount === 1000);

  // Folio
  let folioNumber = quote.quote_number;
  if (!folioNumber || folioNumber === 'current_preview' || folioNumber === 'preview') {
    const now = new Date();
    const yearShort = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    folioNumber = `VLB-${yearShort}-${month}01`;
  }

  // Today Date formatted in Spanish
  const todayFormatted = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Client Name in Title Case / Elegant format
  const clientFullName = quote.partner_name
    ? `${quote.client_name} & ${quote.partner_name}`
    : quote.client_name || 'Novia';

  const total = Number(quote.total) || 0;

  // ========================================================
  // PÁGINA 1: DIBUJAR VALORES EXACTOS EN EL ESPACIO LIMPIO
  // (Sin cuadros blancos encima de las etiquetas rosas)
  // ========================================================

  // 1. FOLIO (FOLIO: original termina en x=88, baseline y=673)
  safeDraw(page, folioNumber, { x: 92, y: 673, size: 9.6, font: fontBold, color: textColor });

  // 2. FECHA (FECHA: original termina en x=92, baseline y=654.5)
  safeDraw(page, todayFormatted, { x: 94, y: 654.5, size: 9.6, font: fontRegular, color: textColor });

  // 3. CLIENTE (CLIENTE: original termina en x=103, baseline y=623)
  safeDraw(page, clientFullName, { x: 104, y: 623, size: 9.6, font: fontBold, color: textColor });

  // 4. TELÉFONO (TELÉFONO: original termina en x=285, baseline y=623)
  safeDraw(page, quote.client_phone || 'Sin contacto', { x: 290, y: 623, size: 9.6, font: fontRegular, color: textColor });

  // 5. FECHA EVENTO (FECHA EVENTO: original termina en x=135, baseline y=597.5)
  safeDraw(page, formatSpanishDate(quote.event_date), { x: 139, y: 597.5, size: 9.6, font: fontRegular, color: textColor });

  // 6. VENUE (VENUE: original termina en x=408, baseline y=597.5)
  const venueStr = quote.event_venue || 'Por definir';
  safeDraw(page, venueStr.length > 20 ? venueStr.substring(0, 18) + '...' : venueStr, { x: 412, y: 597.5, size: 9.6, font: fontRegular, color: textColor });

  // 7. HORA INICIO (HORA INICIO: original termina en x=122, baseline y=572.5)
  const timeStr = quote.event_time || quote.ceremony_time || quote.service_time || 'Por definir';
  safeDraw(page, timeStr, { x: 126, y: 572.5, size: 9.6, font: fontRegular, color: textColor });

  // 8. TABLE ITEMS (Limpieza del área de filas para evitar cualquier empalme)
  page.drawRectangle({
    x: 48,
    y: 410,
    width: 500,
    height: 105,
    color: white,
  });

  const displayItems = (items && items.length > 0) ? items : [
    {
      id: 'fallback_item',
      quote_id: quote.id || '',
      category: isService ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA_SOCIAL',
      item_name: isService ? 'Beer Stand & Barra de Bienvenida' : 'Paquete de Papelería Social y Diseño Editorial',
      description: isService
        ? 'Servicio completo de Beer Stand con estructura decorativa, insumos y atención personalizada.'
        : 'Diseño e impresión personalizada de papelería nupcial con acabados artesanales según cotización.',
      pricing_type: 'FIXED_EVENT',
      quantity: 1,
      unit_price: total,
      total_price: total,
      sort_order: 1,
      created_at: new Date().toISOString()
    } as VlbQuoteItem
  ];

  let curY = 502;
  const maxDescWidth = 225;

  displayItems.forEach((item, idx) => {
    if (idx > 3) return; // Se ajusta limpiamente
    const itemTotal = `$${Number(item.total_price || item.unit_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

    // Service name (con soporte de wrap para nombres largos, tamaño parejo 9.6)
    const nameLines = wrapText(item.item_name, 160, fontBold, 9.6);
    nameLines.forEach((nl, lIdx) => {
      safeDraw(page, nl, { x: 62, y: curY - (lIdx * 11), size: 9.6, font: fontBold, color: textColor });
    });

    // Descripción completa sin truncar (tamaño parejo 9.0)
    const descText = item.description || '';
    const descLines = wrapText(descText, maxDescWidth, fontRegular, 9.0);
    descLines.forEach((dl, lIdx) => {
      safeDraw(page, dl, { x: 235, y: curY - (lIdx * 10.5), size: 9.0, font: fontRegular, color: textColor });
    });

    // Total de la fila alineado con la primera línea
    safeDraw(page, itemTotal, { x: 475, y: curY, size: 9.8, font: fontBold, color: textColor });

    const rowLines = Math.max(nameLines.length, descLines.length);
    curY -= Math.max(20, rowLines * 10.5 + 7);
  });

  // 9. TOTAL
  const totalFormatted = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  safeDraw(page, totalFormatted, { x: 475, y: 391, size: 12.0, font: fontBold, color: textColor });

  // Sello de anticipo / abonos en página 1 si existen pagos registrados
  const totalNum = Number(total) || 0;
  const totalPaidNum = Number(quote.total_paid) || 0;
  const balanceNum = quote.balance_due !== undefined ? Number(quote.balance_due) : Math.max(0, totalNum - totalPaidNum);
  const isLiquidated = totalPaidNum >= totalNum && totalNum > 0;

  if (totalPaidNum > 0) {
    const stampText = isLiquidated
      ? 'TOTALMENTE LIQUIDADO (100%)'
      : `ANTICIPO ACREDITADO: -$${totalPaidNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}  |  SALDO: $${balanceNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    safeDraw(page, stampText, {
      x: 235,
      y: 375,
      size: 7.8,
      font: fontBold,
      color: isLiquidated ? rgb(30 / 255, 140 / 255, 60 / 255) : rgb(200 / 255, 52 / 255, 96 / 255)
    });
  }

  // 10. CONCEPTO EN FORMA DE PAGO (Concepto | ya viene impreso)
  const clientNameClean = (quote.client_name || 'Cliente').trim();
  const conceptDate = formatConceptDate(quote.event_date);
  const conceptoText = conceptDate ? `${clientNameClean} ${conceptDate}` : clientNameClean;
  safeDraw(page, conceptoText, {
    x: 110,
    y: 184,
    size: 9.2,
    font: fontRegular,
    color: textColor
  });

  // ========================================================
  // PÁGINA 2: CONTRATO DIGITAL (SOLO CUANDO SE CONVIERTE EN CLIENTE O ABONA)
  // ========================================================
  const shouldIncludeContract = Boolean(
    options?.includeContract !== undefined
      ? options.includeContract
      : (quote.status === 'CONVERTIDA' || quote.status === 'APROBADA' || Boolean(quote.signature_data) || (Number(quote.total_paid) || 0) > 0)
  );

  if (shouldIncludeContract) {
    const page2 = pdfDoc.addPage([595.5, 842.25]);
    const pinkAccent = rgb(215 / 255, 54 / 255, 98 / 255); // #D73662
    const darkColor = textColor;
    const mutedColor = rgb(110 / 255, 100 / 255, 100 / 255);

    // 1. Monograma Rosa Oficial en esquina superior izquierda
    try {
      const logoBytes = base64ToUint8Array(VLB_MONOGRAM_PINK_BASE64);
      const logoImg = await pdfDoc.embedPng(logoBytes);
      page2.drawImage(logoImg, {
        x: 45,
        y: 764,
        width: 52,
        height: 52
      });
    } catch (err) {
      console.warn('Could not embed monogram logo:', err);
    }

    safeDraw(page2, 'VIVA LA BRIDE', { x: 45, y: 748, size: 8.5, font: fontBold, color: darkColor });

    // 2. Card Superior Derecha (Datos del Evento y Folio con bordes redondeados)
    const venueClean = cleanWinAnsi(quote.event_venue || 'Por definir');
    const timeClean = cleanWinAnsi(quote.event_time || quote.ceremony_time || quote.service_time || 'Por definir');
    const dateClean = formatConceptDate(quote.event_date) || 'Por definir';

    page2.drawRectangle({
      x: 235,
      y: 742,
      width: 315,
      height: 68,
      color: rgb(254 / 255, 252 / 255, 250 / 255),
      borderColor: rgb(238 / 255, 205 / 255, 215 / 255),
      borderWidth: 0.8
    });

    safeDraw(page2, 'Folio cotizacion:', { x: 245, y: 794, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, folioNumber, { x: 315, y: 794, size: 8.0, font: fontBold, color: pinkAccent });
    safeDraw(page2, 'Fecha evento:', { x: 405, y: 794, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, dateClean, { x: 465, y: 794, size: 7.5, font: fontBold, color: darkColor });

    safeDraw(page2, 'Cliente:', { x: 245, y: 778, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, clientFullName, { x: 285, y: 778, size: 7.8, font: fontBold, color: darkColor });

    safeDraw(page2, 'Sede:', { x: 245, y: 762, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, venueClean, { x: 275, y: 762, size: 7.5, font: fontRegular, color: darkColor });
    safeDraw(page2, 'Horario:', { x: 420, y: 762, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, timeClean, { x: 460, y: 762, size: 7.5, font: fontBold, color: pinkAccent });

    // 3. Título Principal Centrado y Subtítulo
    const { clauses, isService, hasDrinks, hasStandsOrWalls, hasMemorial, hasPapeleria } = getContractClauses(items, quote, folioNumber);

    let serviceTitle = 'ATELIER & EXPERIENCIAS';
    if (hasDrinks && !hasMemorial && !hasPapeleria) serviceTitle = 'BEER & MIMOSA STANDS';
    else if (hasMemorial && !hasDrinks && !hasPapeleria) serviceTitle = 'MEMORIAL WALL';
    else if (hasPapeleria && !hasDrinks && !hasStandsOrWalls) serviceTitle = 'PAPELERIA SOCIAL';
    else if (hasStandsOrWalls && hasPapeleria) serviceTitle = 'PAPELERIA SOCIAL & STANDS DE BIENVENIDA';
    else if (hasStandsOrWalls) serviceTitle = 'STANDS DE BIENVENIDA & EXPERIENCIAS';

    const drawPageCentered = (text: string, y: number, size: number, font: PDFFont, color: RGB) => {
      const clean = cleanWinAnsi(text);
      const w = font.widthOfTextAtSize(clean, size);
      safeDraw(page2, clean, { x: (595.5 - w) / 2, y, size, font, color });
    };

    drawPageCentered('CONTRATO DE PRESTACION DE SERVICIOS', 710, 11.5, fontBold, pinkAccent);
    drawPageCentered(serviceTitle, 696, 9.0, fontBold, darkColor);
    drawPageCentered('Entre "La Contratante" y Viva la Bride, en adelante "Prestadora de Servicios".', 684, 7.5, fontRegular, mutedColor);

    // Línea divisoria elegante
    page2.drawLine({
      start: { x: 45, y: 676 },
      end: { x: 550, y: 676 },
      thickness: 0.6,
      color: rgb(240 / 255, 213 / 255, 221 / 255)
    });

    const isSignedReal = Boolean(quote.signature_data && typeof quote.signature_data === 'string' && quote.signature_data.startsWith('data:image/'));

    // 4. Cláusulas Legales con Justificación Editorial
    let cY = 658;
    const targetWidth = 505; // Margen a margen (550 - 45)
    for (const cl of clauses) {
      safeDraw(page2, cl.title, { x: 45, y: cY, size: 8.5, font: fontBold, color: pinkAccent });
      cY -= 12.0;

      cY = drawJustifiedParagraph(page2, cl.text, 45, cY, targetWidth, 8.2, 12.0, fontRegular, darkColor);
      cY -= 10.0;
    }

    // 5. Líneas de Firma
    const sigY = 160;

    // Firma Contratante (Izquierda) - Centrada respecto a su línea (60 a 240, centro = 150)
    page2.drawLine({ start: { x: 60, y: sigY }, end: { x: 240, y: sigY }, thickness: 0.6, color: darkColor });

    const drawLeftSigCentered = (text: string, y: number, size: number, font: PDFFont, color: RGB) => {
      const clean = cleanWinAnsi(text);
      const w = font.widthOfTextAtSize(clean, size);
      safeDraw(page2, clean, { x: 150 - (w / 2), y, size, font, color });
    };

    drawLeftSigCentered(clientFullName, sigY - 14, 8.5, fontBold, pinkAccent);
    drawLeftSigCentered('Contratante', sigY - 26, 7.8, fontRegular, darkColor);
    drawLeftSigCentered(
      isSignedReal ? '✓ Firmado digitalmente en liga web' : '(Pendiente de firma digital en liga)',
      sigY - 37,
      6.8,
      fontRegular,
      isSignedReal ? rgb(30 / 255, 140 / 255, 60 / 255) : mutedColor
    );

    // Si tiene firma digital PNG real, centrarla sobre la línea
    if (isSignedReal) {
      try {
        const pngBytes = base64ToUint8Array(quote.signature_data!);
        const pngImg = await pdfDoc.embedPng(pngBytes);
        const pngDims = pngImg.scale(0.3);
        const targetW = Math.min(130, pngDims.width);
        const targetH = Math.min(42, pngDims.height);
        page2.drawImage(pngImg, {
          x: 150 - (targetW / 2),
          y: sigY + 4,
          width: targetW,
          height: targetH
        });
      } catch (pngErr) {
        console.warn('No se pudo incrustar firma PNG:', pngErr);
      }
    }

    // Firma Prestadora Viva la Bride (Derecha) - Centrada respecto a su línea (355 a 535, centro = 445)
    page2.drawLine({ start: { x: 355, y: sigY }, end: { x: 535, y: sigY }, thickness: 0.6, color: darkColor });

    const drawRightSigCentered = (text: string, y: number, size: number, font: PDFFont, color: RGB) => {
      const clean = cleanWinAnsi(text);
      const w = font.widthOfTextAtSize(clean, size);
      safeDraw(page2, clean, { x: 445 - (w / 2), y, size, font, color });
    };

    // Incrustar firma gráfica real de Scarlette Olivo
    try {
      const scarletteSigBytes = base64ToUint8Array(VLB_SCARLETTE_SIGNATURE_BASE64);
      const scarletteSigImg = await pdfDoc.embedPng(scarletteSigBytes);
      const sigWidth = 75;
      const sigHeight = (61 / 94) * sigWidth; // ~48.6 pt
      page2.drawImage(scarletteSigImg, {
        x: 445 - (sigWidth / 2),
        y: sigY - 2, // Montada sobre la línea de firma manuscrita real
        width: sigWidth,
        height: sigHeight
      });
    } catch (sigErr) {
      console.warn('No se pudo incrustar firma de Scarlette:', sigErr);
    }

    drawRightSigCentered('Scarlette Olivo', sigY - 14, 8.5, fontBold, pinkAccent);
    drawRightSigCentered('Representante de Viva la Bride', sigY - 26, 7.6, fontBold, darkColor);
    drawRightSigCentered('La Prestadora de Servicios', sigY - 37, 6.8, fontRegular, mutedColor);

    // 6. Pie de Página Elegante (Redes Sociales y WhatsApp) - Centrado y limpio
    page2.drawLine({
      start: { x: 45, y: 40 },
      end: { x: 550, y: 40 },
      thickness: 0.5,
      color: rgb(240 / 255, 213 / 255, 221 / 255)
    });
    drawPageCentered('@vivalabride.mx   -   WhatsApp: 56 6140 6247', 28, 7.2, fontRegular, mutedColor);
  }

  // Save PDF Bytes
  const pdfBytes = await pdfDoc.save();
  const cleanName = cleanWinAnsi(quote.client_name || 'Novia').replace(/[\s/\\?%*:|"<>]+/g, '_');
  const docPrefix = shouldIncludeContract ? 'Contrato_y_Cotizacion' : 'Cotizacion';
  const fileName = `${docPrefix}_${folioNumber}_${cleanName}_VLB.pdf`;

  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const file = new File([blob], fileName, { type: 'application/pdf' });

  // Browser download trigger
  if (options?.autoDownload !== false && typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { blob, file, fileName, pdfDoc };
}

export async function generateVlbQuotePdf(
  quote: VlbQuote,
  items: VlbQuoteItem[],
  options?: { autoDownload?: boolean; includeContract?: boolean }
) {
  return await buildVlbQuotePdf(quote, items, { autoDownload: true, ...options });
}
