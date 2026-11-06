import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { VLB_CANVA_PDF_BASE64 } from './vlbCanvaPdfBase64';

/**
 * Sanitizes string for pdf-lib standard fonts (WinAnsi/Helvetica).
 * Strips bidi control chars (\u202A-\u202E, \u200E, \u200F, \u200B, \uFEFF),
 * converts typographic quotes/dashes/bullets to standard characters,
 * preserves Spanish accented characters (á, é, í, ó, ú, ñ, etc.),
 * and removes emojis/unsupported symbols that cause WinAnsi encode crashes.
 */
export function cleanWinAnsi(str: string | null | undefined): string {
  if (!str) return '';
  let text = String(str);

  // 1. Strip bidirectional & zero-width & non-printable controls
  // (\u202A-\u202E: LRE/RLE/PDF/LRO/RLO, \u200B-\u200F, \uFEFF BOM, ASCII controls)
  text = text.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // 2. Normalize smart punctuation and symbols
  text = text
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’`]/g, "'")
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·⋅]/g, '-')
    .replace(/[\r\n\t]/g, ' ');

  // 3. Keep standard ASCII and Latin-1 supplement (including Spanish accents á, é, í, ó, ú, ñ, Á, É, Í, Ó, Ú, Ñ, ü, Ü, ¿, ¡, etc.)
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

export async function buildVlbQuotePdf(
  quote: VlbQuote,
  items: VlbQuoteItem[],
  options?: { autoDownload?: boolean }
): Promise<{ blob: Blob; file: File; fileName: string; pdfDoc: PDFDocument }> {
  // 1. Decode raw Canva PDF bytes
  const binaryString = atob(VLB_CANVA_PDF_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 2. Load Canva PDF directly into pdf-lib (preserves all vectors, fonts and layout 100% untouched)
  const pdfDoc = await PDFDocument.load(bytes);
  const page = pdfDoc.getPages()[0];

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pinkColor = rgb(222 / 255, 121 / 255, 148 / 255);
  const darkColor = rgb(45 / 255, 40 / 255, 42 / 255);
  const mutedColor = rgb(90 / 255, 85 / 255, 85 / 255);
  const whiteColor = rgb(1, 1, 1);

  // Helper to cover placeholder
  const whiteout = (x: number, y: number, w: number, h: number) => {
    page.drawRectangle({
      x: x - 1,
      y: y - 2,
      width: w + 2,
      height: h + 3,
      color: whiteColor,
    });
  };

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
      // Ultimate fallback: pure printable ASCII
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

  // Today Date
  const todayFormatted = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  // Client Name
  const clientFullName = quote.partner_name
    ? `${quote.client_name} & ${quote.partner_name}`
    : quote.client_name || 'Novia';

  const total = Number(quote.total) || 0;

  // ========================================================
  // PÁGINA 1: SOBREESCRIBIR CAMPOS DINÁMICOS EN CANVA PDF
  // ========================================================

  // 1. Folio [FOLIO] (mantiene 'FOLIO:' original de Canva)
  whiteout(84, 668, 70, 16);
  safeDraw(page, folioNumber, { x: 86, y: 672.5, size: 8.5, font: fontBold, color: darkColor });

  // 2. Fecha [FECHA] (mantiene 'FECHA:' original de Canva)
  whiteout(90, 650, 150, 16);
  safeDraw(page, todayFormatted, { x: 92, y: 654.5, size: 8.5, font: fontRegular, color: darkColor });

  // 3. Cliente [CLIENTE] (mantiene 'CLIENTE:' original de Canva)
  whiteout(96, 618, 138, 16);
  safeDraw(page, clientFullName.toUpperCase(), { x: 98, y: 622.5, size: 8.5, font: fontBold, color: darkColor });

  // 4. Teléfono [TELEFONO] (mantiene 'TELÉFONO:' original de Canva)
  whiteout(282, 618, 115, 16);
  safeDraw(page, quote.client_phone || 'Sin contacto', { x: 285, y: 622.5, size: 8.5, font: fontRegular, color: darkColor });

  // 5. Fecha evento [FECHA EVENTO] (mantiene 'FECHA EVENTO:' original de Canva)
  whiteout(132, 593, 140, 16);
  safeDraw(page, (quote.event_date || 'Por definir').toUpperCase(), { x: 135, y: 597.5, size: 8.5, font: fontRegular, color: darkColor });

  // 6. Venue [VUENUE] (mantiene 'VENUE:' original de Canva)
  whiteout(322, 593, 88, 16);
  const venueStr = (quote.event_venue || 'Por definir').toUpperCase();
  safeDraw(page, venueStr.length > 18 ? venueStr.substring(0, 16) + '...' : venueStr, { x: 325, y: 597.5, size: 8, font: fontRegular, color: darkColor });

  // 7. Hora inicio [HORA INICIO] (mantiene 'HORA INICIO:' original de Canva)
  whiteout(482, 593, 80, 16);
  const timeStr = isService
    ? (quote.ceremony_time || quote.service_time || 'Por definir').toUpperCase()
    : (quote.delivery_date || 'Estimada').toUpperCase();
  safeDraw(page, timeStr, { x: 485, y: 597.5, size: 8.5, font: fontRegular, color: darkColor });

  // 8. Service Items Row
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

  // White out the placeholder service row
  whiteout(50, 505, 495, 25);

  let currentItemY = 512;
  displayItems.forEach((item, idx) => {
    if (idx > 2) return; // fits up to 3 items cleanly
    const itemTotal = `$${Number(item.total_price || item.unit_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    safeDraw(page, item.item_name, { x: 62, y: currentItemY, size: 8.5, font: fontBold, color: darkColor });
    
    // Description truncated to fit
    const descText = item.description || '';
    const cleanDesc = descText.length > 60 ? descText.substring(0, 58) + '...' : descText;
    safeDraw(page, cleanDesc, { x: 235, y: currentItemY, size: 8, font: fontRegular, color: mutedColor });
    
    safeDraw(page, itemTotal, { x: 475, y: currentItemY, size: 8.5, font: fontBold, color: darkColor });
    currentItemY -= 16;
  });

  // 9. Total (mantiene 'TOTAL' original de Canva y sobreescribe '(TOTAL)')
  whiteout(468, 380, 77, 25);
  const totalFormatted = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  safeDraw(page, totalFormatted, { x: 475, y: 387, size: 11, font: fontBold, color: darkColor });

  // 10. Concepto en Forma de Pago
  whiteout(105, 180, 260, 15);
  safeDraw(page, `| [${quote.client_name || 'Nombre clienta'}] [${quote.event_date || 'Fecha evento'}]`, { x: 105.1, y: 184.5, size: 8.5, font: fontRegular, color: darkColor });

  // ========================================================
  // PÁGINA 2: CONTRATO DIGITAL VINCULANTE & VALIDEZ LEGAL
  // ========================================================
  const page2 = pdfDoc.addPage([595.5, 842.25]);
  
  safeDraw(page2, 'CONTRATO DE PRESTACION DE SERVICIOS', { x: 135, y: 795, size: 12, font: fontBold, color: darkColor });
  safeDraw(page2, `VIVA LA BRIDE - FOLIO ${folioNumber}`, { x: 215, y: 778, size: 9, font: fontBold, color: pinkColor });

  safeDraw(page2, `Entre "La Contratante" ${clientFullName} y Viva la Bride, conforme a la cotizacion relacionada.`, { x: 80, y: 755, size: 8.5, font: fontRegular, color: mutedColor });

  const clauses = isService ? [
    { title: '1. OBJETO DEL CONTRATO', text: 'La Prestadora de Servicios se compromete a proporcionar el servicio de Beer Stand / Servicios solicitado conforme a lo establecido en la cotización relacionada.' },
    { title: '2. DURACIÓN Y OPERACIÓN', text: 'El Beer Stand está diseñado como estación de autoservicio asistido para cóctel de bienvenida con duración de 1.5 horas. El montaje se realiza previo al inicio.' },
    { title: '3. CONSUMO RESPONSABLE', text: 'Servicio destinado exclusivamente a mayores de edad. La prestadora promueve el consumo responsable durante el evento.' },
    { title: '4. RESERVACIÓN Y PAGOS', text: 'El servicio se reserva mediante separación fija de $1,000 MXN. El saldo total se liquida a más tardar 10 días naturales antes del evento. Anticipos no reembolsables.' },
    { title: '5. VALIDEZ VINCULANTE', text: 'La aceptación digital o pago de separación implica conformidad total con este contrato y condiciones generales de Viva la Bride.' }
  ] : [
    { title: '1. OBJETO DEL CONTRATO', text: 'La Prestadora de Servicios se compromete a diseñar y producir la papelería social solicitada conforme a la cotización oficial emitida.' },
    { title: '2. REVISIONES Y DISEÑO', text: 'Incluye hasta 3 rondas de ajustes de diseño antes de pasar a impresión final y acabados artesanales.' },
    { title: '3. ANTICIPOS Y LIQUIDACIÓN', text: 'Anticipo del 50% para inicio de diseño y producción. El saldo se liquida previo al envío o entrega de las piezas.' },
    { title: '4. TIEMPOS DE PRODUCCIÓN', text: 'Los tiempos de entrega oscilan entre 7 y 15 días hábiles a partir de la aprobación de pruebas digitales y pago de anticipo.' },
    { title: '5. ACEPTACIÓN DIGITAL', text: 'La confirmación del pedido y pago implica aceptación plena de términos y especificaciones aprobadas.' }
  ];

  let cY = 720;
  for (const cl of clauses) {
    safeDraw(page2, cl.title, { x: 50, y: cY, size: 9, font: fontBold, color: pinkColor });
    cY -= 14;
    safeDraw(page2, cl.text, { x: 50, y: cY, size: 8.5, font: fontRegular, color: darkColor });
    cY -= 24;
  }

  // Signature lines
  const sigY = 220;
  page2.drawLine({ start: { x: 60, y: sigY }, end: { x: 240, y: sigY }, thickness: 0.5, color: darkColor });
  safeDraw(page2, clientFullName, { x: 80, y: sigY - 14, size: 9, font: fontBold, color: pinkColor });
  safeDraw(page2, 'La Contratante', { x: 125, y: sigY - 26, size: 8, font: fontRegular, color: darkColor });

  page2.drawLine({ start: { x: 355, y: sigY }, end: { x: 535, y: sigY }, thickness: 0.5, color: darkColor });
  safeDraw(page2, 'VIVA LA BRIDE', { x: 410, y: sigY - 14, size: 9, font: fontBold, color: pinkColor });
  safeDraw(page2, 'La Prestadora de Servicios', { x: 395, y: sigY - 26, size: 8, font: fontRegular, color: darkColor });

  // Digital Signature notice
  const isSigned = Boolean(quote.signature_data);
  if (isSigned) {
    safeDraw(page2, 'FIRMADO DIGITALMENTE Y VINCULANTE', { x: 195, y: 150, size: 8, font: fontBold, color: rgb(30 / 255, 140 / 255, 60 / 255) });
  }

  // Save PDF Bytes
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
