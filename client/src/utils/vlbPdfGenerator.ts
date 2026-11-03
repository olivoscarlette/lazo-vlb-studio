import { jsPDF } from 'jspdf';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';

// Colors exact to Viva la Bride branding
const COLOR_PRIMARY_ROSE = [200, 52, 96]; // #C83460
const COLOR_LIGHT_BLUSH = [248, 228, 233]; // #F8E4E9
const COLOR_DARK_TEXT = [34, 34, 34]; // #222222
const COLOR_MUTED_TEXT = [95, 95, 95]; // #5F5F5F
const COLOR_BORDER = [232, 166, 183]; // #E8A6B7
const COLOR_LINE_LIGHT = [240, 230, 233]; // #F0E6E9

/**
 * Draws the iconic "vb viva la bride" logo
 */
function drawVlbLogo(doc: jsPDF, x: number, y: number, scale = 1) {
  doc.saveGraphicsState();

  // Draw "v"
  doc.setFillColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  
  // Left pillar of 'v'
  doc.roundedRect(x, y + (8 * scale), 4.5 * scale, 16 * scale, 1 * scale, 1 * scale, 'F');
  // Right diagonal/stem of 'v'
  doc.roundedRect(x + (6 * scale), y + (10 * scale), 4.2 * scale, 14 * scale, 1 * scale, 1 * scale, 'F');
  
  // Draw 'b'
  // Tall ascender of 'b'
  doc.roundedRect(x + (12.5 * scale), y, 4.5 * scale, 24 * scale, 1 * scale, 1 * scale, 'F');
  // Counter bowl of 'b'
  doc.circle(x + (21 * scale), y + (16 * scale), 6.5 * scale, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(x + (21 * scale), y + (16 * scale), 3 * scale, 'F');

  // Script text "viva la bride" wrapping around
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5 * scale);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('viva la', x + (29 * scale), y + (9 * scale));
  doc.text('bride', x + (32 * scale), y + (15 * scale));

  doc.restoreGraphicsState();
}

/**
 * Draws the elegant delicate spiral arches in corners
 */
function drawCornerFlourish(doc: jsPDF, corner: 'TOP_LEFT' | 'BOTTOM_RIGHT', pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.35);

  if (corner === 'TOP_LEFT') {
    doc.ellipse(0, 0, 48, 22);
    doc.ellipse(0, 0, 42, 18);
    doc.ellipse(0, 0, 34, 14);
  } else {
    doc.ellipse(pageWidth, pageHeight, 52, 24);
    doc.ellipse(pageWidth, pageHeight, 44, 19);
    doc.ellipse(pageWidth, pageHeight, 36, 14);
  }
  doc.restoreGraphicsState();
}

/**
 * Draws the official VLB footer across all pages
 */
function drawVlbFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageLabel?: string) {
  const footerY = pageHeight - 12;

  // Social icons + handles
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);

  // Instagram
  doc.text('© @vivalabride.mx', 42, footerY, { align: 'center' });
  // WhatsApp
  doc.text('✆ 56 6140 6247', pageWidth / 2, footerY, { align: 'center' });
  // TikTok
  doc.text('♪ @vivalabride.mx', pageWidth - 42, footerY, { align: 'center' });

  if (pageLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
    doc.text(pageLabel, pageWidth - 20, footerY + 5, { align: 'right' });
  }
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;

  // Determine proposal type: Papelería Social vs Stands de Bienvenida
  const hasStands = items.some(i => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT');
  const serviceTypeTitle = hasStands ? 'BEER STAND & EXPERIENCIAS' : 'PAPELERÍA SOCIAL';
  
  // Format Folio with official prefix (PS-26-XXXX o SV-26-XXXX)
  let folioNumber = quote.quote_number;
  if (!folioNumber.startsWith('PS-') && !folioNumber.startsWith('SV-')) {
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = hasStands ? 'SV' : 'PS';
    folioNumber = `${prefix}-${yearShort}-${randCode}`;
  }

  // Format Dates
  const todayFormatted = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const deliveryFormatted = quote.event_date ? quote.event_date : '--';

  // ========================================================
  // PÁGINA 1: COTIZACIÓN OFICIAL
  // ========================================================

  // Background clean white
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Corner decorative flourishes
  drawCornerFlourish(doc, 'TOP_LEFT', pageWidth, pageHeight);
  drawCornerFlourish(doc, 'BOTTOM_RIGHT', pageWidth, pageHeight);

  // Top-Right Logo
  drawVlbLogo(doc, pageWidth - margin - 38, margin + 4, 0.95);

  let y = margin + 12;

  // Meta Information Block (Folio, Vigencia, Fecha, Cliente, Contacto, Fecha entrega)
  const labelX = margin;
  const valueX = margin + 38;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

  // Folio Cotización
  doc.text('Folio cotización:', labelX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(folioNumber, valueX, y);
  y += 5.5;

  // Vigencia
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('Vigencia:', labelX, y);
  doc.text(quote.valid_until || '--', valueX, y);
  y += 5.5;

  // Fecha
  doc.text('Fecha:', labelX, y);
  doc.text(todayFormatted, valueX, y);
  y += 5.5;

  // Cliente
  doc.text('Cliente:', labelX, y);
  doc.setFont('helvetica', 'bold');
  const clientFullName = quote.partner_name ? `${quote.client_name} & ${quote.partner_name}` : quote.client_name;
  doc.text(clientFullName, valueX, y);
  y += 5.5;

  // Contacto
  doc.setFont('helvetica', 'normal');
  doc.text('Contacto:', labelX, y);
  doc.text(quote.client_phone || quote.client_email || '8133883833', valueX, y);
  y += 5.5;

  // Lugar y fecha del evento o Fecha de entrega
  if (quote.event_venue) {
    doc.text('Lugar y fecha evento:', labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${quote.event_venue} | ${quote.event_date || 'Por confirmar'}`, valueX, y);
    y += 5.5;
  } else {
    doc.text('Fecha de entrega:', labelX, y);
    doc.text(deliveryFormatted, valueX, y);
    y += 5.5;
  }

  y += 8;

  // TABLE HEADER
  const tableWidth = pageWidth - (margin * 2);
  doc.setFillColor(COLOR_LIGHT_BLUSH[0], COLOR_LIGHT_BLUSH[1], COLOR_LIGHT_BLUSH[2]);
  doc.rect(margin, y, tableWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

  doc.text('Cantidad', margin + 8, y + 4.8);
  doc.text('Producto', margin + 35, y + 4.8);
  doc.text('Descripción', margin + 78, y + 4.8);
  doc.text('Importe', pageWidth - margin - 8, y + 4.8, { align: 'right' });

  y += 11;

  // TABLE ITEMS
  items.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

    // Cantidad
    const qtyText = item.pricing_type === 'FIXED_EVENT' ? '1' : String(item.quantity);
    doc.text(qtyText, margin + 12, y);

    // Producto
    doc.setFont('helvetica', 'bold');
    doc.text(item.item_name, margin + 35, y);

    // Descripción multilínea
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
    const descLines = doc.splitTextToSize(item.description || '', 65);
    doc.text(descLines, margin + 78, y);

    // Importe
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    doc.text(`$${item.total_price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, pageWidth - margin - 8, y, { align: 'right' });

    const rowHeight = Math.max(8, descLines.length * 3.8 + 3);
    y += rowHeight;
  });

  y += 4;

  // TOTALS SECTION (Right Aligned)
  const totalsX = pageWidth - margin - 45;
  const amountsX = pageWidth - margin - 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('Total', totalsX, y);

  doc.setFontSize(13);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(`$${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, amountsX, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('Anticipo', totalsX, y);
  doc.text(`$${quote.down_payment_amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, amountsX, y, { align: 'right' });
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('RESTAN', totalsX, y);
  doc.text(`$${quote.balance_due.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, amountsX, y, { align: 'right' });

  y += 10;

  // OBSERVACIONES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('Observaciones:', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  const observations = [
    '• El pago total deberá ser liquidado para su envío.',
    '• El cliente acepta términos y condiciones del contrato digital.',
    '• Entregas en oficina ubicada en Cumbres 1er sector, envíos a domicilio con costo extra.'
  ];
  observations.forEach(obs => {
    doc.text(obs, margin, y);
    y += 4;
  });

  y += 6;

  // CONTRATO DIGITAL CALLOUT BOX
  const boxWidth = pageWidth - (margin * 2);
  const boxHeight = 22;

  // Left card: Icon & Acceptance text
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);

  // Icon Contract
  doc.setFillColor(COLOR_LIGHT_BLUSH[0], COLOR_LIGHT_BLUSH[1], COLOR_LIGHT_BLUSH[2]);
  doc.roundedRect(margin, y, 16, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('✓', margin + 6, y + 10);

  // Disclaimer text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('Contrato digital', margin + 20, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  const legalNotice = doc.splitTextToSize(
    'La aceptación y/o pago de esta cotización implica aceptación total de términos y condiciones del contrato digital de Viva La Bride incluidos en este documento.',
    82
  );
  doc.text(legalNotice, margin + 20, y + 8);

  // Right box: Folio Relacionado
  const relBoxWidth = 58;
  const relBoxX = pageWidth - margin - relBoxWidth;
  doc.setDrawColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(relBoxX, y - 2, relBoxWidth, 20, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('FOLIO RELACIONADO:', relBoxX + (relBoxWidth / 2), y + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.text(folioNumber, relBoxX + (relBoxWidth / 2), y + 13, { align: 'center' });

  // Page 1 Footer
  drawVlbFooter(doc, pageWidth, pageHeight);

  // ========================================================
  // PÁGINA 2: CONTRATO DE PRESTACIÓN DE SERVICIOS (PARTE 1)
  // ========================================================
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  drawCornerFlourish(doc, 'TOP_LEFT', pageWidth, pageHeight);
  drawCornerFlourish(doc, 'BOTTOM_RIGHT', pageWidth, pageHeight);

  // Top Logo Left
  drawVlbLogo(doc, margin, margin, 0.7);

  // Contract Header Title (Center)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('CONTRATO DE PRESTACIÓN DE SERVICIOS', pageWidth / 2 + 10, margin + 5, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(serviceTypeTitle, pageWidth / 2 + 10, margin + 10, { align: 'center' });

  // Rounded Pill Meta Box
  const pillY = margin + 15;
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 15, pillY, pageWidth - (margin * 2) - 30, 14, 4, 4, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(`Folio relacionado: ${folioNumber}`, margin + 20, pillY + 5.5);
  doc.text(`Cliente: ${quote.client_name}`, margin + 20, pillY + 10.5);

  const eventOrDeliveryText = quote.event_venue
    ? `Fecha y lugar: ${deliveryFormatted} | ${quote.event_venue}`
    : `Fecha de entrega: ${deliveryFormatted}`;
  doc.text(eventOrDeliveryText, pageWidth - margin - 20, pillY + 8, { align: 'right' });

  let cY = pillY + 22;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  doc.text('Entre "La Contratante" y Viva la Bride, en adelante "Prestadora de Servicios".', pageWidth / 2, cY, { align: 'center' });
  cY += 4;

  // Star separator
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('✦', pageWidth / 2, cY, { align: 'center' });
  cY += 6;

  // Helper for rendering clauses
  const renderClause = (num: number, title: string, body: string[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
    doc.text(`${num}. ${title}`, margin, cY);
    cY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    body.forEach(paragraph => {
      const lines = doc.splitTextToSize(paragraph, pageWidth - (margin * 2));
      doc.text(lines, margin, cY);
      cY += lines.length * 3.5 + 1.5;
    });

    // Small divider diamond
    doc.setFontSize(6);
    doc.setTextColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.text('✦', pageWidth / 2, cY - 0.5, { align: 'center' });
    cY += 3;
  };

  if (!hasStands) {
    // CLAUSULAS PAPELERÍA SOCIAL (Pág 1)
    renderClause(1, 'OBJETO DEL CONTRATO', [
      'La Prestadora de Servicios se compromete a diseñar y proporcionar la papelería social solicitada por La Contratante conforme a lo establecido en la cotización relacionada al folio anteriormente señalado.'
    ]);

    renderClause(2, 'ALCANCE DEL SERVICIO', [
      'El servicio podrá incluir, según lo contratado: invitaciones digitales e impresas, menús de mesa, números de mesa, etiquetas, place cards, papelería personalizada, impresión en algodón y acabados en lacre de cera.',
      'Los elementos incluidos dependerán exclusivamente del paquete contratado en la cotización correspondiente.'
    ]);

    renderClause(3, 'PROCESO DE DISEÑO', [
      'La Contratante deberá proporcionar toda la información necesaria para el desarrollo del diseño, incluyendo nombres, fechas, horarios, textos, referencias y cualquier dato requerido.',
      'Viva La Bride no será responsable por errores derivados de información incorrecta, incompleta o enviada fuera de tiempo por parte de La Contratante.'
    ]);

    renderClause(4, 'CAMBIOS Y MODIFICACIONES', [
      'El servicio incluye únicamente 3 modificaciones dentro del paquete contratado.',
      'Cambios adicionales, rediseños completos o modificaciones posteriores a la aprobación final podrán generar costos extra.',
      'Una vez aprobado el diseño final por La Contratante, no podrán realizarse modificaciones sin costo adicional.'
    ]);
  } else {
    // CLAUSULAS STANDS DE BIENVENIDA / BEER STAND (Pág 1)
    renderClause(1, 'OBJETO DEL CONTRATO', [
      'La Prestadora de Servicios se compromete a proporcionar el servicio de Stands de Bienvenida / Beer Stand solicitado por La Contratante conforme a lo establecido en la cotización relacionada al folio anteriormente señalado.'
    ]);

    renderClause(2, 'ALCANCE DEL SERVICIO', [
      'El servicio podrá incluir, según lo contratado: Beer Stand o barra decorativa, bebidas contratadas, hielo y enfriadores, insertos y accesorios de servicio, personal de apoyo para reposición, elementos decorativos y montaje y desmontaje.',
      'El stand está diseñado como una estación de autoservicio asistido para recepción o cóctel de bienvenida, con una duración aproximada de 1 hora y 30 minutos.',
      'El servicio contratado no constituye barra libre ni servicio ilimitado de bebidas. La cantidad estará determinada exclusivamente por el paquete contratado.'
    ]);

    renderClause(3, 'MONTAJE Y OPERACIÓN DEL SERVICIO', [
      'El montaje se realizará aproximadamente 40 minutos antes del inicio del evento o en el horario previamente acordado.',
      'El servicio comenzará y concluirá conforme al horario establecido en la cotización correspondiente.',
      'La Prestadora de Servicios no será responsable de retrasos ocasionados por accesos restringidos, falta de información o condiciones ajenas a su control.'
    ]);

    renderClause(4, 'CONSUMO RESPONSABLE DE ALCOHOL', [
      'La Prestadora de Servicios promueve el consumo responsable de bebidas alcohólicas. El servicio está destinado exclusivamente para personas mayores de edad.',
      'La Prestadora de Servicios no será responsable por el consumo excesivo, indebido o no supervisado de bebidas alcohólicas por parte de los asistentes, ni por incidentes derivados de dicho consumo durante o después del evento.'
    ]);
  }

  // Page 2 Footer
  drawVlbFooter(doc, pageWidth, pageHeight, 'PÁGINA 1/2');

  // ========================================================
  // PÁGINA 3: CONTRATO DE PRESTACIÓN DE SERVICIOS (PARTE 2)
  // ========================================================
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  drawCornerFlourish(doc, 'TOP_LEFT', pageWidth, pageHeight);
  drawCornerFlourish(doc, 'BOTTOM_RIGHT', pageWidth, pageHeight);

  drawVlbLogo(doc, margin, margin, 0.7);

  cY = margin + 14;

  if (!hasStands) {
    // CLAUSULAS PAPELERÍA SOCIAL (Pág 2)
    renderClause(5, 'IMPRESIÓN Y TONOS', [
      'Los colores, materiales, texturas y acabados pueden presentar ligeras variaciones derivadas de impresión, iluminación, proveedores o visualización en pantalla.',
      'Viva La Bride no garantiza coincidencia exacta de tonos entre archivos digitales e impresos.'
    ]);

    renderClause(6, 'TIEMPOS DE ENTREGA', [
      'Los tiempos de entrega podrán variar entre 7 y 15 días hábiles dependiendo de la carga de trabajo, complejidad del proyecto, tiempos de aprobación y materiales solicitados.',
      'Los tiempos comenzarán a contar una vez recibido el anticipo correspondiente y toda la información necesaria para el desarrollo del diseño.'
    ]);

    renderClause(7, 'PAGOS', [
      'El servicio podrá separarse mediante anticipo previamente acordado (50%). La liquidación total deberá realizarse antes de la entrega final del material digital o impreso. Los anticipos no son reembolsables.'
    ]);

    renderClause(8, 'ENVÍOS Y ENTREGAS', [
      'En servicios impresos, Viva La Bride no será responsable por retrasos ocasionados por paqueterías o servicios externos. El cliente deberá verificar previamente direcciones y datos de envío.'
    ]);

    renderClause(9, 'CANCELACIONES', [
      'En caso de cancelación por parte de La Contratante no se realizará reembolso de anticipos ni pagos realizados. Si el proyecto se encuentra en producción, el cliente cubrirá los gastos generados.'
    ]);

    renderClause(10, 'AUTORIZACIÓN DE USO DE IMAGEN', [
      'La Contratante autoriza a Viva La Bride utilizar fotografías, videos y diseños realizados con fines de promoción y difusión en redes sociales y medios publicitarios.'
    ]);

    renderClause(11, 'RELACIÓN CON COTIZACIÓN', [
      'El presente contrato se encuentra directamente vinculado a la cotización identificada mediante el folio relacionado anteriormente señalado. La aceptación de la cotización y/o realización de anticipo implica aceptación total de los presentes términos y condiciones.'
    ]);
  } else {
    // CLAUSULAS STANDS / BEER STAND (Pág 2)
    renderClause(5, 'CUIDADO DEL MOBILIARIO Y EQUIPO', [
      'La Contratante será responsable por cualquier daño, pérdida o robo total o parcial del mobiliario, equipo o accesorios proporcionados por La Prestadora de Servicios durante el evento. En caso de daño o pérdida, La Contratante se compromete a cubrir el costo total de reposición o reparación dentro de los 3 días naturales posteriores al evento.'
    ]);

    renderClause(6, 'TIEMPOS DE SERVICIO', [
      'El servicio de Beer Stand se presta como cóctel de bienvenida y tendrá una duración aproximada de 1 hora y 30 minutos, contados a partir de la hora de inicio establecida en la cotización.',
      'En caso de que las bebidas se consuman antes de concluir el tiempo estimado, éste se considerará prestado en su totalidad. Las bebidas restantes al finalizar serán entregadas al coordinador o persona designada.'
    ]);

    renderClause(7, 'PAGOS Y CANCELACIONES', [
      'El servicio podrá separarse mediante un anticipo formal para reservar la fecha. La liquidación total deberá realizarse a más tardar 15 días naturales antes de la fecha del evento. Los anticipos no son reembolsables.',
      'El servicio podrá reagendarse dentro de los siguientes 30 días naturales, sujeto a disponibilidad de La Prestadora de Servicios y siempre que el servicio se encuentre liquidado.'
    ]);

    renderClause(8, 'AUTORIZACIÓN DE USO DE IMAGEN', [
      'La Contratante autoriza a Viva La Bride utilizar fotografías y videos tomados del montaje con fines de difusión en redes sociales y portafolio.'
    ]);

    renderClause(9, 'RELACIÓN CON COTIZACIÓN', [
      'El presente contrato se encuentra directamente vinculado a la cotización identificada mediante el folio relacionado. La aceptación y/o realización de anticipo implica aceptación total de los presentes términos.'
    ]);
  }

  // SIGNATURE SECTION
  const sigY = pageHeight - 34;
  const sigColWidth = 65;

  doc.setDrawColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.setLineWidth(0.4);

  // Line left: Contratante
  doc.line(margin + 5, sigY, margin + 5 + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(quote.client_name, margin + 5 + (sigColWidth / 2), sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('La Contratante', margin + 5 + (sigColWidth / 2), sigY + 8.5, { align: 'center' });

  // Line right: Prestadora de Servicios
  const sigRightX = pageWidth - margin - 5 - sigColWidth;
  doc.line(sigRightX, sigY, sigRightX + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('VIVA LA BRIDE', sigRightX + (sigColWidth / 2), sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('La Prestadora de Servicios', sigRightX + (sigColWidth / 2), sigY + 8.5, { align: 'center' });

  // Page 3 Footer
  drawVlbFooter(doc, pageWidth, pageHeight, 'PÁGINA 2/2');

  // Build Blob & File
  const cleanName = (quote.client_name || 'Novia').replace(/\s+/g, '_');
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
