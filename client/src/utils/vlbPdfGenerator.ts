import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { VLB_CANVA_PDF_BASE64 } from './vlbCanvaPdfBase64';
import { VLB_OUTFIT_FONT_BASE64 } from './vlbOutfitFontBase64';

/**
 * Sanitizes string for pdf-lib standard fonts (WinAnsi).
 * Strips bidi control chars (\u202A-\u202E, \u200E, \u200F, \u200B, \uFEFF),
 * converts typographic quotes/dashes/bullets to standard characters,
 * preserves Spanish accented characters (á, é, í, ó, ú, ñ, etc.),
 * and removes emojis/unsupported symbols that cause WinAnsi encode crashes.
 */
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

  // Register fontkit to enable contemporary geometric sans (Outfit)
  pdfDoc.registerFontkit(fontkit);

  let fontRegular: any;
  let fontBold: any;

  try {
    const fontBinaryString = atob(VLB_OUTFIT_FONT_BASE64);
    const fontBytes = new Uint8Array(fontBinaryString.length);
    for (let i = 0; i < fontBinaryString.length; i++) {
      fontBytes[i] = fontBinaryString.charCodeAt(i);
    }
    const embeddedOutfit = await pdfDoc.embedFont(fontBytes);
    fontRegular = embeddedOutfit;
    fontBold = embeddedOutfit;
  } catch (err) {
    console.warn('Fallback to standard fonts:', err);
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // Pure black text (#000000)
  const textColor = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);

  // Safe draw helper that guarantees text is clean and never throws WinAnsi encoding errors
  const safeDraw = (
    targetPage: PDFPage,
    text: string | null | undefined,
    drawOptions: Parameters<PDFPage['drawText']>[1]
  ) => {
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
  };

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
  safeDraw(page, folioNumber, { x: 92, y: 673, size: 9.0, font: fontBold, color: textColor });

  // 2. FECHA (FECHA: original termina en x=92, baseline y=654.5)
  safeDraw(page, todayFormatted, { x: 94, y: 654.5, size: 9.0, font: fontRegular, color: textColor });

  // 3. CLIENTE (CLIENTE: original termina en x=103, baseline y=623)
  safeDraw(page, clientFullName, { x: 104, y: 623, size: 9.0, font: fontBold, color: textColor });

  // 4. TELÉFONO (TELÉFONO: original termina en x=285, baseline y=623)
  safeDraw(page, quote.client_phone || 'Sin contacto', { x: 290, y: 623, size: 9.0, font: fontRegular, color: textColor });

  // 5. FECHA EVENTO (FECHA EVENTO: original termina en x=135, baseline y=597.5)
  safeDraw(page, formatSpanishDate(quote.event_date), { x: 139, y: 597.5, size: 9.0, font: fontRegular, color: textColor });

  // 6. VENUE (VENUE: original termina en x=408, baseline y=597.5)
  const venueStr = quote.event_venue || 'Por definir';
  safeDraw(page, venueStr.length > 20 ? venueStr.substring(0, 18) + '...' : venueStr, { x: 412, y: 597.5, size: 9.0, font: fontRegular, color: textColor });

  // 7. HORA INICIO (HORA INICIO: original termina en x=122, baseline y=572.5)
  const timeStr = isService
    ? (quote.ceremony_time || quote.service_time || 'Por definir')
    : (quote.delivery_date ? formatSpanishDate(quote.delivery_date) : 'Estimada');
  safeDraw(page, timeStr, { x: 126, y: 572.5, size: 9.0, font: fontRegular, color: textColor });

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

    // Service name (con soporte de wrap para nombres largos, tamaño parejo 9.0)
    const nameLines = wrapText(item.item_name, 160, fontBold, 9.0);
    nameLines.forEach((nl, lIdx) => {
      safeDraw(page, nl, { x: 62, y: curY - (lIdx * 10.5), size: 9.0, font: fontBold, color: textColor });
    });

    // Descripción completa sin truncar (tamaño parejo 8.3)
    const descText = item.description || '';
    const descLines = wrapText(descText, maxDescWidth, fontRegular, 8.3);
    descLines.forEach((dl, lIdx) => {
      safeDraw(page, dl, { x: 235, y: curY - (lIdx * 10), size: 8.3, font: fontRegular, color: textColor });
    });

    // Total de la fila alineado con la primera línea
    safeDraw(page, itemTotal, { x: 475, y: curY, size: 9.0, font: fontBold, color: textColor });

    const rowLines = Math.max(nameLines.length, descLines.length);
    curY -= Math.max(20, rowLines * 10 + 7);
  });

  // 9. TOTAL
  const totalFormatted = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  safeDraw(page, totalFormatted, { x: 475, y: 391, size: 11.5, font: fontBold, color: textColor });

  // 10. CONCEPTO EN FORMA DE PAGO (Concepto | ya viene impreso)
  const eventDateShort = quote.event_date ? formatSpanishDate(quote.event_date) : 'Fecha evento';
  safeDraw(page, `[${quote.client_name || 'Nombre clienta'}] [${eventDateShort}]`, {
    x: 110,
    y: 184,
    size: 8.5,
    font: fontRegular,
    color: textColor
  });

  // Save PDF Bytes (Solo 1 página de cotización, sin contrato adjunto)
  const pdfBytes = await pdfDoc.save();
  const cleanName = cleanWinAnsi(quote.client_name || 'Novia').replace(/[\s/\\?%*:|"<>]+/g, '_');
  const fileName = `Cotizacion_${folioNumber}_${cleanName}_VLB.pdf`;

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

export async function generateVlbQuotePdf(quote: VlbQuote, items: VlbQuoteItem[]) {
  return await buildVlbQuotePdf(quote, items, { autoDownload: true });
}
