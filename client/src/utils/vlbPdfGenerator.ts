import { jsPDF } from 'jspdf';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { VLB_LOGO_BASE64 } from './vlbLogoBase64';

// Colors exact to Viva la Bride branding
const COLOR_PRIMARY_ROSE = [200, 52, 96]; // #C83460
const COLOR_DEEP_PLUM = [112, 38, 62];    // #70263E
const COLOR_LIGHT_BLUSH = [248, 228, 233]; // #F8E4E9
const COLOR_WARM_BG = [252, 249, 250];     // #FCF9FA
const COLOR_DARK_TEXT = [34, 34, 34];      // #222222
const COLOR_MUTED_TEXT = [95, 95, 95];     // #5F5F5F
const COLOR_BORDER = [232, 166, 183];      // #E8A6B7
const COLOR_LINE_LIGHT = [240, 230, 233];  // #F0E6E9

/**
 * Draws the high-end editorial stationery double frame on the page
 */
function drawPageFrame(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();
  doc.setDrawColor(COLOR_LINE_LIGHT[0], COLOR_LINE_LIGHT[1], COLOR_LINE_LIGHT[2]);
  doc.setLineWidth(0.4);
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14);

  doc.setDrawColor(245, 236, 238);
  doc.setLineWidth(0.18);
  doc.rect(8.2, 8.2, pageWidth - 16.4, pageHeight - 16.4);
  doc.restoreGraphicsState();
}

/**
 * Draws the official VLB footer across all pages with dynamic page numbers
 */
function drawVlbFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 11;

  doc.saveGraphicsState();
  doc.setDrawColor(COLOR_LINE_LIGHT[0], COLOR_LINE_LIGHT[1], COLOR_LINE_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 3, pageWidth - 14, footerY - 3);

  // Social handles & Contact (Clean ASCII to prevent character corruption)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('WhatsApp: 56 6140 6247   |   Instagram: @vivalabride.mx   |   Viva la Bride Atelier', 14, footerY + 2);

  // Dynamic Page Counter
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  doc.text(`Pagina ${pageNum} de ${totalPages}`, pageWidth - 14, footerY + 2, { align: 'right' });
  doc.restoreGraphicsState();
}

export function buildVlbQuotePdf(
  quote: VlbQuote,
  items: VlbQuoteItem[],
  options?: { autoDownload?: boolean }
): { doc: jsPDF; blob: Blob; file: File; fileName: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);        // 182mm

  // Determine proposal category strictly
  const isService = (items && items.length > 0)
    ? items.some(i => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT')
    : (quote.quote_number?.startsWith('SV-') ?? false);

  const serviceTypeTitle = isService
    ? 'STANDS & EXPERIENCIAS DE BIENVENIDA'
    : 'PAPELERIA SOCIAL & DISENO EDITORIAL';

  // Format Folio
  let folioNumber = quote.quote_number;
  if (!folioNumber || (!folioNumber.startsWith('PS-') && !folioNumber.startsWith('SV-'))) {
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = isService ? 'SV' : 'PS';
    folioNumber = `${prefix}-${yearShort}-${randCode}`;
  }

  // Format Dates
  const todayFormatted = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const deliveryFormatted = quote.event_date ? quote.event_date : 'Por definir';

  // Financial calculations strictly according to business rules
  const subtotal = Number(quote.subtotal) || 0;
  const discount = Number(quote.discount) || 0;
  const total = Number(quote.total) || Math.max(0, subtotal - discount);

  // Stand/Service: Fijo $1,000 MXN. Papelería: 50%
  const downPayment = isService ? Math.min(1000, total) : Math.round(total * 0.5);
  const balanceDue = Math.max(0, total - downPayment);

  // Client full name
  const clientFullName = quote.partner_name
    ? `${quote.client_name} & ${quote.partner_name}`
    : quote.client_name || 'Novia';

  // ========================================================
  // PAGINA 1: COTIZACION Y PROPUESTA EDITORIAL
  // ========================================================
  drawPageFrame(doc, pageWidth, pageHeight);

  // 1. Header (y = 12)
  try {
    // Official Logo (545x71 px, aspect ratio ~7.67)
    const logoW = 48;
    const logoH = 6.25;
    doc.addImage(`data:image/png;base64,${VLB_LOGO_BASE64}`, 'PNG', pageWidth - margin - logoW, 13, logoW, logoH);
  } catch (e) {
    console.warn('Could not draw logo image:', e);
  }

  // Brand Titles (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('VIVA LA BRIDE', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  doc.text('ATELIER DE PAPELERIA SOCIAL & EXPERIENCIAS DE BIENVENIDA', margin, 22.5);

  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('Monterrey, N.L.  |  Atencion y Cobertura Nacional  |  IG: @vivalabride.mx', margin, 26.5);

  // Hairline separator
  doc.setDrawColor(COLOR_LINE_LIGHT[0], COLOR_LINE_LIGHT[1], COLOR_LINE_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, 30, pageWidth - margin, 30);

  // 2. Client & Proposal Card (y = 33 to 55)
  const metaCardY = 33;
  const metaCardH = 22;
  doc.setFillColor(COLOR_WARM_BG[0], COLOR_WARM_BG[1], COLOR_WARM_BG[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, metaCardY, contentWidth, metaCardH, 2.5, 2.5, 'FD');

  // Column 1: Client Info
  const col1X = margin + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('PAREJA / CLIENTA:', col1X, metaCardY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(clientFullName, col1X, metaCardY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  doc.text(`WhatsApp: ${quote.client_phone || 'Por confirmar'}   |   Email: ${quote.client_email || 'Por confirmar'}`, col1X, metaCardY + 16);

  // Column 2: Event & Folio Info
  const col2X = margin + 105;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('FOLIO OFICIAL:', col2X, metaCardY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(folioNumber, col2X + 26, metaCardY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(`Fecha Evento: ${deliveryFormatted}`, col2X, metaCardY + 10.5);
  doc.text(`Sede / Venue: ${quote.event_venue || 'Por definir'}`, col2X, metaCardY + 15);
  doc.text(`Emision: ${todayFormatted}`, col2X, metaCardY + 19);

  // 3. Items Table Header (y = 59)
  let y = 59;
  doc.setFillColor(COLOR_LIGHT_BLUSH[0], COLOR_LIGHT_BLUSH[1], COLOR_LIGHT_BLUSH[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_DEEP_PLUM[0], COLOR_DEEP_PLUM[1], COLOR_DEEP_PLUM[2]);

  doc.text('CANT.', margin + 7, y + 4.8, { align: 'center' });
  doc.text('CONCEPTO / SERVICIO', margin + 18, y + 4.8);
  doc.text('ESPECIFICACIONES & DETALLES', margin + 72, y + 4.8);
  doc.text('P. UNITARIO', margin + 148, y + 4.8, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 5, y + 4.8, { align: 'right' });

  y += 7;

  // Safeguard: Ensure items list is never completely empty
  const displayItems = (items && items.length > 0) ? items : [
    {
      id: 'fallback_1',
      quote_id: quote.id || '',
      category: isService ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA_SOCIAL',
      item_name: isService ? 'Servicio de Barra & Experiencias de Bienvenida' : 'Paquete de Papeleria Social y Diseno Editorial',
      description: isService
        ? 'Servicio completo de stand nupcial con ambientacion, insumos y atencion personalizada para recepcion de invitados.'
        : 'Diseno e impresion personalizada de papeleria nupcial con acabados artesanales segun especificaciones.',
      pricing_type: 'FIXED_EVENT',
      quantity: 1,
      unit_price: total,
      total_price: total,
      sort_order: 1,
      created_at: new Date().toISOString()
    } as VlbQuoteItem
  ];

  // Render Table Rows
  displayItems.forEach((item, index) => {
    const isEven = index % 2 === 1;
    const descLines = doc.splitTextToSize(item.description || 'Sin descripcion adicional.', 64);
    const rowHeight = Math.max(8.5, descLines.length * 3.6 + 4);

    if (isEven) {
      doc.setFillColor(253, 250, 251);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

    // Cantidad
    const qtyText = item.pricing_type === 'FIXED_EVENT' ? '1 serv' : `${item.quantity} pzs`;
    doc.text(qtyText, margin + 7, y + 5, { align: 'center' });

    // Concepto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(item.item_name, margin + 18, y + 5);

    // Descripción multilínea
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
    doc.text(descLines, margin + 72, y + 4.5);

    // Precio Unitario
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    const unitPriceText = `$${item.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    doc.text(unitPriceText, margin + 148, y + 5, { align: 'right' });

    // Total
    doc.setFont('helvetica', 'bold');
    const totalPriceText = `$${item.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    doc.text(totalPriceText, pageWidth - margin - 5, y + 5, { align: 'right' });

    // Bottom hairline divider
    doc.setDrawColor(240, 230, 233);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    y += rowHeight;
  });

  y += 5;

  // 4. Financial Summary & Payment Policy Box (y side-by-side)
  const boxTopY = y;
  const leftBoxW = 104;
  const rightBoxW = 73;
  const boxH = 46;

  // Left Box: Payment Policies & Service Conditions
  doc.setFillColor(COLOR_WARM_BG[0], COLOR_WARM_BG[1], COLOR_WARM_BG[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, boxTopY, leftBoxW, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('POLITICAS DE RESERVA & CONDICIONES DE PAGO', margin + 4, boxTopY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

  if (isService) {
    const policies = [
      '• Separacion Fija: $1,000.00 MXN para bloqueo formal de fecha en agenda.',
      `• Saldo Pendiente: $${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN se liquida a mas tardar 10 dias antes del evento.`,
      '• Operacion en Sede: Montaje y horarios coordinados directamente con sede/planner.',
      '• Duracion: Servicio asistido de bienvenida de aprox. 1.5 horas en coctel.',
      '• Anticipos y separaciones no son reembolsables en caso de cancelacion.'
    ];
    let polY = boxTopY + 11;
    policies.forEach(p => {
      doc.text(p, margin + 4, polY);
      polY += 5;
    });
  } else {
    const policies = [
      `• Anticipo Inicial: 50% ($${downPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) para iniciar fase de diseno y pruebas.`,
      `• Saldo Pendiente: $${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN se liquida antes de entrega o envio.`,
      '• Muestras y Vo.Bo.: Incluye hasta 3 rondas de ajustes antes de impresion final.',
      '• Tiempos de Elaboracion: 7 a 15 dias habiles posteriores a la aprobacion final.',
      '• Anticipos no son reembolsables una vez iniciado el proceso de diseno.'
    ];
    let polY = boxTopY + 11;
    policies.forEach(p => {
      doc.text(p, margin + 4, polY);
      polY += 5;
    });
  }

  // Right Box: Financial Breakdown Card
  const rightBoxX = margin + leftBoxW + 5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(rightBoxX, boxTopY, rightBoxW, boxH, 2, 2, 'FD');

  let rY = boxTopY + 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  doc.text('Subtotal:', rightBoxX + 5, rY);
  doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, rightBoxX + rightBoxW - 5, rY, { align: 'right' });

  if (discount > 0) {
    rY += 5;
    doc.text('Descuento aplicado:', rightBoxX + 5, rY);
    doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
    doc.text(`-$${discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, rightBoxX + rightBoxW - 5, rY, { align: 'right' });
  }

  rY += 5;
  doc.setDrawColor(COLOR_LINE_LIGHT[0], COLOR_LINE_LIGHT[1], COLOR_LINE_LIGHT[2]);
  doc.setLineWidth(0.25);
  doc.line(rightBoxX + 4, rY, rightBoxX + rightBoxW - 4, rY);

  rY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('TOTAL:', rightBoxX + 5, rY);

  doc.setFontSize(11);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, rightBoxX + rightBoxW - 5, rY, { align: 'right' });

  rY += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  const depLabel = isService ? 'Separacion Requerida:' : 'Anticipo (50%):';
  doc.text(depLabel, rightBoxX + 5, rY);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${downPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, rightBoxX + rightBoxW - 5, rY, { align: 'right' });

  rY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_DEEP_PLUM[0], COLOR_DEEP_PLUM[1], COLOR_DEEP_PLUM[2]);
  doc.text('SALDO RESTANTE:', rightBoxX + 5, rY);
  doc.text(`$${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, rightBoxX + rightBoxW - 5, rY, { align: 'right' });

  // 5. Contract Notice & Legal Acceptance Callout (y = boxTopY + boxH + 6)
  const calloutY = boxTopY + boxH + 6;
  const calloutH = 17;
  doc.setFillColor(254, 248, 250);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, calloutY, contentWidth, calloutH, 2, 2, 'FD');

  // Small clean shield/check mark drawing
  doc.setDrawColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.setLineWidth(0.6);
  doc.circle(margin + 6, calloutY + 8.5, 3.5);
  doc.line(margin + 4.8, calloutY + 8.5, margin + 5.8, calloutY + 9.8);
  doc.line(margin + 5.8, calloutY + 9.8, margin + 7.5, calloutY + 7.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('CONTRATO DE PRESTACION DE SERVICIOS ADJUNTO', margin + 12, calloutY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  const legalNotice = doc.splitTextToSize(
    `La aceptacion formal y/o realizacion del pago de anticipo o separacion formaliza la contratacion y constituye la aceptacion plena y sin reserva de todas las clausulas estipuladas en el Contrato de Prestacion de Servicios adjunto en las paginas 2 y 3 de este documento oficial (Folio de referencia: ${folioNumber}).`,
    contentWidth - 18
  );
  doc.text(legalNotice, margin + 12, calloutY + 9.5);

  // ========================================================
  // PAGINA 2: CONTRATO DE PRESTACION DE SERVICIOS (PARTE 1)
  // ========================================================
  doc.addPage();
  drawPageFrame(doc, pageWidth, pageHeight);

  // Top Logo (Page 2)
  try {
    const p2LogoW = 40;
    const p2LogoH = 5.2;
    doc.addImage(`data:image/png;base64,${VLB_LOGO_BASE64}`, 'PNG', margin, 12, p2LogoW, p2LogoH);
  } catch (e) {
    console.warn('Could not draw p2 logo:', e);
  }

  // Contract Header Titles (Center-Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('CONTRATO DE PRESTACION DE SERVICIOS', pageWidth / 2 + 15, 14, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(serviceTypeTitle, pageWidth / 2 + 15, 18.5, { align: 'center' });

  // Metadata Pill Box (y = 23, height = 8)
  const pillY = 22;
  doc.setFillColor(COLOR_WARM_BG[0], COLOR_WARM_BG[1], COLOR_WARM_BG[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, pillY, contentWidth, 7.5, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(`Folio: ${folioNumber}   |   Cliente: ${clientFullName}   |   Fecha Evento: ${deliveryFormatted}`, margin + 5, pillY + 4.8);
  doc.text(`Sede: ${quote.event_venue || 'Por definir'}`, pageWidth - margin - 5, pillY + 4.8, { align: 'right' });

  // Thin separator at y = 32
  doc.setDrawColor(COLOR_LINE_LIGHT[0], COLOR_LINE_LIGHT[1], COLOR_LINE_LIGHT[2]);
  doc.setLineWidth(0.25);
  doc.line(margin, 32, pageWidth - margin, 32);

  let cY = 37;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  doc.text('Celebrado entre "La Contratante" y Viva la Bride, en adelante "La Prestadora de Servicios".', pageWidth / 2, cY, { align: 'center' });
  cY += 6;

  // Helper function to render contract clauses cleanly
  const renderClause = (num: number, title: string, body: string[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
    doc.text(`${num}. ${title}`, margin, cY);
    cY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

    body.forEach(paragraph => {
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      doc.text(lines, margin, cY);
      cY += lines.length * 3.4 + 1.5;
    });

    cY += 2;
  };

  if (!isService) {
    // CLAUSULAS PAPELERIA SOCIAL (Pagina 2)
    renderClause(1, 'OBJETO DEL CONTRATO', [
      'La Prestadora de Servicios se compromete a elaborar, disenar y proveer los articulos y conceptos de papeleria social especificados en la cotizacion identificada con el folio de referencia senalado al calce.'
    ]);

    renderClause(2, 'ALCANCE DEL SERVICIO Y ENTREGABLES', [
      'El proyecto comprende exclusivamente las piezas, formatos, cantidades y acabados estipulados en la cotizacion aceptada (incluyendo invitaciones, sobres, lacres, menus, tarjetas de lugar y senaletica segun aplique).',
      'Cualquier pieza, cambio de material o impresion no prevista originalmente requerira cotizacion complementaria y autorizacion expresa.'
    ]);

    renderClause(3, 'PROCESO CREATIVO Y REQUISITOS DE INFORMACION', [
      'La Contratante proporcionara oportunamente textos definitivos, nombres completos, horarios y sedes requeridas para el armado de diseno.',
      'La Prestadora de Servicios no sera responsable por faltas ortograficas, fechas u horarios inexactos provistos directamente por La Contratante una vez otorgado el visto bueno formal.'
    ]);

    renderClause(4, 'REVISIONES Y VISTO BUENO (Vo.Bo.)', [
      'Se incluyen hasta 3 rondas de revision de diseno dentro de la cotizacion base.',
      'Una vez otorgado el Vo.Bo. final de manera digital o por escrito, los archivos pasan a produccion e impresion, tras lo cual no podran realizarse modificaciones sin costo de reimpresion.'
    ]);
  } else {
    // CLAUSULAS STANDS & BEER STAND (Pagina 2)
    renderClause(1, 'OBJETO DEL CONTRATO', [
      'La Prestadora de Servicios se compromete a instalar, operar y prestar el servicio de Stands de Bienvenida / Beer Stand para el evento social indicado, conforme a las especificaciones de la cotizacion relacionada.'
    ]);

    renderClause(2, 'ALCANCE DEL SERVICIO Y CARACTERISTICAS', [
      'El servicio comprende mobiliario de bienvenida, montaje estetico, insumos acordados, elementos decorativos, accesorios de servicio y personal operativo de apoyo.',
      'El stand opera bajo la modalidad de barra de bienvenida asistida con duracion estimada de 1 hora y 30 minutos durante la recepcion del evento.',
      'No constituye servicio de barra libre ni consumo ilimitado; la cantidad de bebidas se encuentra estrictamente limitada al paquete contratado.'
    ]);

    renderClause(3, 'MONTAJE, ACCESOS Y HORARIOS', [
      'El equipo se presentara en la sede con aproximadamente 40 a 60 minutos de anticipacion al inicio formal del coctel de bienvenida para montaje y acondicionamiento.',
      'La Contratante coordinara con la sede o wedding planner el libre acceso vehicular, facilidades de carga y energia en caso de requerirse.'
    ]);

    renderClause(4, 'CONSUMO RESPONSABLE Y SEGURIDAD', [
      'El servicio de bebidas alcoholicas esta destinado exclusivamente a personas mayores de edad conforme a la legislacion vigente.',
      'La Prestadora de Servicios no asumira responsabilidad por incidentes derivados del consumo excesivo, imprudente o no supervisado por parte de los asistentes al evento.'
    ]);
  }

  // ========================================================
  // PAGINA 3: CONTRATO DE PRESTACION DE SERVICIOS (PARTE 2) & FIRMAS
  // ========================================================
  doc.addPage();
  drawPageFrame(doc, pageWidth, pageHeight);

  // Top Logo (Page 3)
  try {
    const p3LogoW = 40;
    const p3LogoH = 5.2;
    doc.addImage(`data:image/png;base64,${VLB_LOGO_BASE64}`, 'PNG', margin, 12, p3LogoW, p3LogoH);
  } catch (e) {
    console.warn('Could not draw p3 logo:', e);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('CONTRATO DE PRESTACION DE SERVICIOS (CONTINUACION)', pageWidth / 2 + 15, 14, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(`FOLIO: ${folioNumber}  |  ${serviceTypeTitle}`, pageWidth / 2 + 15, 18.5, { align: 'center' });

  // Thin separator at y = 24
  doc.setDrawColor(COLOR_LINE_LIGHT[0], COLOR_LINE_LIGHT[1], COLOR_LINE_LIGHT[2]);
  doc.setLineWidth(0.25);
  doc.line(margin, 24, pageWidth - margin, 24);

  // Start clauses at y = 30 to leave full breathing room
  cY = 30;

  if (!isService) {
    // CLAUSULAS PAPELERIA SOCIAL (Pagina 3)
    renderClause(5, 'VARIACIONES DE IMPRESION Y TONALIDADES', [
      'Pudiendo existir variaciones menores y naturales entre pantallas digitales y papeles artesanales, algodon o lacres, Viva la Bride procura la maxima fidelidad en cada tiraje artesanal.'
    ]);

    renderClause(6, 'TIEMPOS DE PRODUCCION Y ENTREGA', [
      'El tiempo estandar de elaboracion es de 7 a 15 dias habiles computados a partir del visto bueno definitivo de diseno y recepcion del anticipo correspondiente.'
    ]);

    renderClause(7, 'CONDICIONES DE PAGO Y LIQUIDACION', [
      `El proyecto se formaliza con un anticipo del 50% ($${downPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN). El saldo restante del 50% ($${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) debera liquidarse previo al envio o entrega final del pedido. Los anticipos no son reembolsables una vez iniciado el trabajo de taller.`
    ]);

    renderClause(8, 'ENVIO, TRASLADOS Y RECEPCION', [
      'Los envios foraneos se canalizan a traves de empresas de paqueteria certificadas. La Contratante revisara cuidadosamente la guia y confirmara la recepcion integra del pedido.'
    ]);

    renderClause(9, 'USO DE IMAGEN Y PORTAFOLIO', [
      'La Contratante autoriza a Viva la Bride a documentar fotograficamente y publicar imagenes de las piezas disenadas en portafolio y redes sociales institucionales.'
    ]);
  } else {
    // CLAUSULAS STANDS & BEER STAND (Pagina 3)
    renderClause(5, 'CUIDADO Y RESGUARDO DE MOBILIARIO Y EQUIPO', [
      'La Contratante velara por la integridad de los stands, dispensadores, cristaleria y elementos decorativos durante el transcurso del evento.',
      'En caso de robo, extravio o dano imputable a los asistentes, La Contratante se compromete a cubrir el costo de reparacion o reposicion dentro de los 3 dias habiles posteriores al evento.'
    ]);

    renderClause(6, 'DURACION Y CONCLUSION DEL SERVICIO', [
      'El stand se operara durante el tiempo contratado (aprox. 1 hora y 30 minutos). Si las bebidas asignadas se agotaran antes de finalizar dicho periodo por ritmo de consumo de los invitados, el servicio se considerara plenamente prestado.',
      'Cualquier bebida remanente sellada sera entregada integramente al coordinador o persona designada al desmontar.'
    ]);

    renderClause(7, 'CONDICIONES DE PAGO Y RESERVA', [
      `El servicio se aparta formalmente con una separacion fija de $1,000.00 MXN para bloqueo de fecha en agenda. El saldo restante de $${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN debera ser liquidado a mas tardar 10 dias naturales antes del evento. Las separaciones y anticipos no son reembolsables en caso de cancelacion por parte de La Contratante.`
    ]);

    renderClause(8, 'POLITICA DE REPROGRAMACION Y CANCELACION', [
      'En caso de cambio de fecha del evento con al menos 30 dias naturales de anticipacion, la fecha podra reprogramarse sujeta a disponibilidad de agenda del atelier sin penalizacion adicional.'
    ]);

    renderClause(9, 'DIFUSION Y DERECHOS DE IMAGEN', [
      'La Contratante autoriza a Viva la Bride a capturar y compartir material fotografico y audiovisual del montaje del stand para fines de promocion y portafolio profesional.'
    ]);
  }

  // 6. Formal Signatures Block at bottom of Page 3 (y = pageHeight - 44)
  const sigY = pageHeight - 42;
  const sigColW = 68;

  // Digital Signature Image if available
  if (quote.signature_data) {
    try {
      doc.addImage(quote.signature_data, 'PNG', margin + 10, sigY - 18, 48, 16);
    } catch (e) {
      console.warn('Could not render digital signature image:', e);
    }
  }

  doc.setDrawColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.setLineWidth(0.35);

  // Line Left: La Contratante
  doc.line(margin + 5, sigY, margin + 5 + sigColW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(clientFullName, margin + 5 + (sigColW / 2), sigY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('La Contratante / Aceptacion Digital', margin + 5 + (sigColW / 2), sigY + 8.5, { align: 'center' });

  // Line Right: La Prestadora de Servicios
  const sigRightX = pageWidth - margin - 5 - sigColW;
  doc.line(sigRightX, sigY, sigRightX + sigColW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('VIVA LA BRIDE', sigRightX + (sigColW / 2), sigY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('La Prestadora de Servicios', sigRightX + (sigColW / 2), sigY + 8.5, { align: 'center' });

  // ========================================================
  // DYNAMIC FOOTERS FOR ALL PAGES
  // ========================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawVlbFooter(doc, i, totalPages);
  }

  // Build Blob & File
  const cleanName = (quote.client_name || 'Novia').trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
  const fileName = `Cotizacion_Contrato_${folioNumber}_${cleanName}_VLB.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (options?.autoDownload !== false) {
    doc.save(fileName);
  }

  return { doc, blob, file, fileName };
}

export function generateVlbQuotePdf(quote: VlbQuote, items: VlbQuoteItem[]) {
  return buildVlbQuotePdf(quote, items, { autoDownload: true });
}
