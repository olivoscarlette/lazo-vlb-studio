import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { VLB_CANVA_PDF_BASE64 } from './vlbCanvaPdfBase64';

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

  // 1. Folio
  whiteout(50.4, 672.6, 130, 15);
  page.drawText('folio: ', { x: 50.4, y: 673, size: 9, font: fontRegular, color: pinkColor });
  page.drawText(folioNumber, { x: 76, y: 673, size: 9, font: fontBold, color: darkColor });

  // 2. Fecha
  whiteout(50.4, 654.4, 180, 15);
  page.drawText('fecha: ', { x: 50.4, y: 654.8, size: 9, font: fontRegular, color: pinkColor });
  page.drawText(todayFormatted, { x: 80, y: 654.8, size: 9, font: fontRegular, color: darkColor });

  // 3. Cliente
  whiteout(51.0, 622.8, 175, 15);
  page.drawText('cliente: ', { x: 51.0, y: 623, size: 9, font: fontRegular, color: pinkColor });
  page.drawText(clientFullName.toUpperCase(), { x: 87, y: 623, size: 9, font: fontBold, color: darkColor });

  // 4. Teléfono
  whiteout(233.3, 622.8, 160, 15);
  page.drawText('teléfono: ', { x: 233.3, y: 623, size: 9, font: fontRegular, color: pinkColor });
  page.drawText(quote.client_phone || 'Sin contacto', { x: 275, y: 623, size: 9, font: fontRegular, color: darkColor });

  // 5. Fecha evento
  whiteout(50.4, 597.7, 220, 15);
  page.drawText('fecha evento: ', { x: 50.4, y: 598, size: 9, font: fontRegular, color: pinkColor });
  page.drawText((quote.event_date || 'Por definir').toUpperCase(), { x: 115, y: 598, size: 9, font: fontRegular, color: darkColor });

  // 6. Venue
  whiteout(285.7, 597.7, 120, 15);
  page.drawText('venue: ', { x: 285.7, y: 598, size: 9, font: fontRegular, color: pinkColor });
  const venueStr = (quote.event_venue || 'Por definir').toUpperCase();
  page.drawText(venueStr.length > 20 ? venueStr.substring(0, 18) + '...' : venueStr, { x: 322, y: 598, size: 9, font: fontRegular, color: darkColor });

  // 7. Hora inicio / Entrega
  whiteout(413.3, 597.7, 140, 15);
  if (isService) {
    page.drawText('hora inicio: ', { x: 413.3, y: 598, size: 9, font: fontRegular, color: pinkColor });
    page.drawText((quote.ceremony_time || quote.service_time || 'Por definir').toUpperCase(), { x: 465, y: 598, size: 9, font: fontRegular, color: darkColor });
  } else {
    page.drawText('entrega: ', { x: 413.3, y: 598, size: 9, font: fontRegular, color: pinkColor });
    page.drawText((quote.delivery_date || 'Estimada').toUpperCase(), { x: 455, y: 598, size: 9, font: fontRegular, color: darkColor });
  }

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
  whiteout(60, 480, 490, 50);

  let currentItemY = 514;
  displayItems.forEach((item, idx) => {
    if (idx > 2) return; // fits up to 3 items cleanly
    const itemTotal = `$${Number(item.total_price || item.unit_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    page.drawText(item.item_name, { x: 66.2, y: currentItemY, size: 9, font: fontBold, color: darkColor });
    
    // Description truncated to fit
    const descText = item.description || '';
    const cleanDesc = descText.length > 75 ? descText.substring(0, 72) + '...' : descText;
    page.drawText(cleanDesc, { x: 180, y: currentItemY, size: 8, font: fontRegular, color: mutedColor });
    
    page.drawText(itemTotal, { x: 490, y: currentItemY, size: 9, font: fontBold, color: darkColor });
    currentItemY -= 16;
  });

  // 9. Total
  whiteout(465, 382, 85, 24);
  const totalFormatted = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  page.drawText(totalFormatted, { x: 480, y: 387.1, size: 12, font: fontBold, color: darkColor });

  // 10. Concepto en Forma de Pago
  whiteout(105, 180, 260, 15);
  page.drawText(`| [${quote.client_name || 'Nombre clienta'}] [${quote.event_date || 'Fecha evento'}]`, { x: 105.1, y: 184.5, size: 9, font: fontRegular, color: darkColor });

  // ========================================================
  // PÁGINA 2: CONTRATO DIGITAL VINCULANTE & VALIDEZ LEGAL
  // ========================================================
  const page2 = pdfDoc.addPage([595.5, 842.25]);
  
  page2.drawText('CONTRATO DE PRESTACIÓN DE SERVICIOS', { x: 135, y: 795, size: 12, font: fontBold, color: darkColor });
  page2.drawText(`VIVA LA BRIDE · FOLIO ${folioNumber}`, { x: 215, y: 778, size: 9, font: fontBold, color: pinkColor });

  page2.drawText(`Entre “La Contratante” ${clientFullName} y Viva la Bride, conforme a la cotización relacionada.`, { x: 80, y: 755, size: 8.5, font: fontRegular, color: mutedColor });

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
    page2.drawText(cl.title, { x: 50, y: cY, size: 9, font: fontBold, color: pinkColor });
    cY -= 14;
    page2.drawText(cl.text, { x: 50, y: cY, size: 8.5, font: fontRegular, color: darkColor });
    cY -= 24;
  }

  // Signature lines
  const sigY = 220;
  page2.drawLine({ start: { x: 60, y: sigY }, end: { x: 240, y: sigY }, thickness: 0.5, color: darkColor });
  page2.drawText(clientFullName, { x: 80, y: sigY - 14, size: 9, font: fontBold, color: pinkColor });
  page2.drawText('La Contratante', { x: 125, y: sigY - 26, size: 8, font: fontRegular, color: darkColor });

  page2.drawLine({ start: { x: 355, y: sigY }, end: { x: 535, y: sigY }, thickness: 0.5, color: darkColor });
  page2.drawText('VIVA LA BRIDE', { x: 410, y: sigY - 14, size: 9, font: fontBold, color: pinkColor });
  page2.drawText('La Prestadora de Servicios', { x: 395, y: sigY - 26, size: 8, font: fontRegular, color: darkColor });

  // Digital Signature notice
  const isSigned = Boolean(quote.signature_data);
  if (isSigned) {
    page2.drawText('FIRMADO DIGITALMENTE Y VINCULANTE', { x: 195, y: 150, size: 8, font: fontBold, color: rgb(30 / 255, 140 / 255, 60 / 255) });
  }

  // Save PDF Bytes
  const pdfBytes = await pdfDoc.save();
  const cleanName = (quote.client_name || 'Novia').trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
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
