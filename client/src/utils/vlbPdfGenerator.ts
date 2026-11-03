import { jsPDF } from 'jspdf';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { VLB_LOGO_BASE64 } from './vlbLogoBase64';

// Colors exact to Viva la Bride branding
const COLOR_PRIMARY_ROSE = [200, 52, 96]; // #C83460
const COLOR_LIGHT_BLUSH = [248, 228, 233]; // #F8E4E9
const COLOR_DARK_TEXT = [34, 34, 34]; // #222222
const COLOR_MUTED_TEXT = [95, 95, 95]; // #5F5F5F
const COLOR_BORDER = [232, 166, 183]; // #E8A6B7
const COLOR_LINE_LIGHT = [240, 230, 233]; // #F0E6E9

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
  doc.saveGraphicsState();
  const footerY = pageHeight - 12;

  // Handles and contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);

  doc.text('@vivalabride.mx', 42, footerY, { align: 'center' });
  doc.text('56 6140 6247', pageWidth / 2, footerY, { align: 'center' });
  doc.text('@vivalabride.mx', pageWidth - 42, footerY, { align: 'center' });

  if (pageLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
    doc.text(pageLabel, pageWidth - 18, footerY + 5.5, { align: 'right' });
  }
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
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);        // 174mm

  // Determine proposal category
  const isService = (items && items.length > 0)
    ? items.some(i => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT')
    : (quote.quote_number?.startsWith('SV-') ?? false);

  const serviceTypeTitle = isService ? 'BEER STAND' : 'PAPELERÍA SOCIAL';

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
  const deliveryFormatted = quote.event_date ? quote.event_date : '--';

  // Financial calculations
  const total = Number(quote.total) || 0;
  const downPayment = isService ? Math.min(1000, total) : Math.round(total * 0.5);
  const balanceDue = Math.max(0, total - downPayment);

  // Client name
  const clientFullName = quote.partner_name
    ? `${quote.client_name} & ${quote.partner_name}`
    : quote.client_name || 'Novia';

  // ========================================================
  // PÁGINA 1: COTIZACIÓN OFICIAL
  // ========================================================
  drawCornerFlourish(doc, 'TOP_LEFT', pageWidth, pageHeight);
  drawCornerFlourish(doc, 'BOTTOM_RIGHT', pageWidth, pageHeight);

  // Official Logo Top Right
  try {
    const logoW = 50;
    const logoH = 6.5;
    doc.addImage(`data:image/png;base64,${VLB_LOGO_BASE64}`, 'PNG', pageWidth - margin - logoW, margin + 2, logoW, logoH);
  } catch (e) {
    console.warn('Could not render logo:', e);
  }

  let y = margin + 8;
  const labelX = margin;
  const valueX = margin + 42;

  // Metadata Block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

  // Folio
  doc.text('Folio cotización:', labelX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(folioNumber, valueX, y);
  y += 6;

  // Vigencia
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('Vigencia:', labelX, y);
  doc.text(quote.valid_until || '--', valueX, y);
  y += 6;

  // Fecha
  doc.text('Fecha:', labelX, y);
  doc.text(todayFormatted, valueX, y);
  y += 6;

  // Cliente
  doc.text('Cliente:', labelX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(clientFullName, valueX, y);
  y += 6;

  // Contacto
  doc.setFont('helvetica', 'normal');
  doc.text('Contacto:', labelX, y);
  doc.text(quote.client_phone || '56 6140 6247', valueX, y);
  y += 6;

  // Lugar y fecha evento o Fecha de entrega
  if (isService || quote.event_venue) {
    doc.text('Lugar y fecha evento:', labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${quote.event_venue || 'Por definir'} | ${deliveryFormatted}`, valueX, y);
    y += 7;
  } else {
    doc.text('Fecha de entrega:', labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(deliveryFormatted, valueX, y);
    y += 7;
  }

  y += 5;

  // TABLE HEADER
  doc.setFillColor(COLOR_LIGHT_BLUSH[0], COLOR_LIGHT_BLUSH[1], COLOR_LIGHT_BLUSH[2]);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

  doc.text('Cantidad', margin + 6, y + 5.5);
  doc.text('Producto', margin + 34, y + 5.5);
  doc.text('Descripción', margin + 80, y + 5.5);
  doc.text('Importe', pageWidth - margin - 6, y + 5.5, { align: 'right' });

  y += 12;

  // Items Safeguard
  const displayItems = (items && items.length > 0) ? items : [
    {
      id: 'fallback_item',
      quote_id: quote.id || '',
      category: isService ? 'STANDS_EXPERIENCIAS' : 'PAPELERIA_SOCIAL',
      item_name: isService ? 'Beer Stand & Barra de Bienvenida' : 'Paquete de Papelería Social y Diseño Editorial',
      description: isService
        ? 'Servicio completo de Beer Stand con estructura decorativa, insumos, enfriadores y atención personalizada.'
        : 'Diseño e impresión personalizada de papelería nupcial con acabados artesanales según cotización.',
      pricing_type: 'FIXED_EVENT',
      quantity: 1,
      unit_price: total,
      total_price: total,
      sort_order: 1,
      created_at: new Date().toISOString()
    } as VlbQuoteItem
  ];

  // TABLE ITEMS
  displayItems.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

    // Cantidad
    const qtyText = item.pricing_type === 'FIXED_EVENT' ? '1' : String(item.quantity);
    doc.text(qtyText, margin + 8, y);

    // Producto
    doc.setFont('helvetica', 'bold');
    doc.text(item.item_name, margin + 34, y);

    // Descripción multilínea
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
    const descLines = doc.splitTextToSize(item.description || '', 68);
    doc.text(descLines, margin + 80, y);

    // Importe
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    doc.text(`$${item.total_price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, pageWidth - margin - 6, y, { align: 'right' });

    const rowHeight = Math.max(9, descLines.length * 4.2 + 4);
    y += rowHeight;
  });

  y += 5;

  // TOTALS SECTION (Right Aligned)
  const totalsLabelX = pageWidth - margin - 48;
  const amountsX = pageWidth - margin - 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('Total', totalsLabelX, y);

  doc.setFontSize(14);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, amountsX, y, { align: 'right' });
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  const anticipoLabel = isService ? 'Separación' : 'Anticipo';
  doc.text(anticipoLabel, totalsLabelX, y);
  doc.text(`$${downPayment.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, amountsX, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('RESTAN', totalsLabelX, y);
  doc.text(`$${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, amountsX, y, { align: 'right' });

  y += 12;

  // OBSERVACIONES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('Observaciones:', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  const observations = [
    '• El pago total deberá ser liquidado para su envío.',
    '• El cliente acepta términos y condiciones del contrato digital.',
    '• Entregas y montajes coordinados con la sede del evento o wedding planner.'
  ];
  observations.forEach(obs => {
    doc.text(obs, margin, y);
    y += 4.5;
  });

  y += 7;

  // CONTRATO DIGITAL CALLOUT BOX
  const relBoxWidth = 58;
  const relBoxX = pageWidth - margin - relBoxWidth;

  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.35);

  // Icon Contract
  doc.setFillColor(COLOR_LIGHT_BLUSH[0], COLOR_LIGHT_BLUSH[1], COLOR_LIGHT_BLUSH[2]);
  doc.roundedRect(margin, y, 16, 16, 2, 2, 'FD');
  doc.setDrawColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.setLineWidth(0.6);
  doc.line(margin + 4.5, y + 8, margin + 6.5, y + 10.5);
  doc.line(margin + 6.5, y + 10.5, margin + 11.5, y + 5.5);

  // Disclaimer text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('Contrato digital', margin + 20, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  const legalNotice = doc.splitTextToSize(
    'La aceptación y/o pago de esta cotización implica aceptación total de términos y condiciones del contrato digital de Viva La Bride incluidos en este documento.',
    84
  );
  doc.text(legalNotice, margin + 20, y + 9);

  // Right box: Folio Relacionado
  doc.setDrawColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(relBoxX, y - 2, relBoxWidth, 20, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('FOLIO RELACIONADO:', relBoxX + (relBoxWidth / 2), y + 5, { align: 'center' });

  doc.setFontSize(12);
  doc.text(folioNumber, relBoxX + (relBoxWidth / 2), y + 13.5, { align: 'center' });

  // Page 1 Footer
  drawVlbFooter(doc, pageWidth, pageHeight);

  // ========================================================
  // PÁGINA 2: CONTRATO DE PRESTACIÓN DE SERVICIOS (PARTE 1)
  // ========================================================
  doc.addPage();
  drawCornerFlourish(doc, 'TOP_LEFT', pageWidth, pageHeight);
  drawCornerFlourish(doc, 'BOTTOM_RIGHT', pageWidth, pageHeight);

  // Top Logo Left
  try {
    const p2LogoW = 42;
    const p2LogoH = 5.5;
    doc.addImage(`data:image/png;base64,${VLB_LOGO_BASE64}`, 'PNG', margin, margin, p2LogoW, p2LogoH);
  } catch (e) {
    console.warn('Could not render logo p2:', e);
  }

  // Contract Header Title (Center)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('CONTRATO DE PRESTACIÓN DE SERVICIOS', pageWidth / 2 + 10, margin + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(serviceTypeTitle, pageWidth / 2 + 10, margin + 10.5, { align: 'center' });

  // Rounded Pill Meta Box
  const pillY = margin + 16;
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 12, pillY, contentWidth - 24, 15, 3.5, 3.5, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(`Folio relacionado: ${folioNumber}`, margin + 17, pillY + 5.5);
  doc.text(`Cliente: ${clientFullName}`, margin + 17, pillY + 11);

  const eventOrDeliveryText = isService
    ? `Fecha y lugar: ${deliveryFormatted} | ${quote.event_venue || 'Por definir'}`
    : `Fecha de entrega: ${deliveryFormatted}`;
  doc.text(eventOrDeliveryText, pageWidth - margin - 17, pillY + 8.5, { align: 'right' });

  let cY = pillY + 24;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
  doc.text('Entre “La Contratante” y Viva la Bride, en adelante “Prestadora de Servicios”.', pageWidth / 2, cY, { align: 'center' });
  cY += 7;

  // Helper for rendering clauses - Perfectly sized (9.5pt) to fill the page elegantly
  const renderClause = (num: number, title: string, body: string[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
    doc.text(`${num}.   ${title}`, margin, cY);
    cY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

    body.forEach(paragraph => {
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      doc.text(lines, margin, cY);
      cY += lines.length * 4.2 + 2;
    });

    cY += 2;
  };

  if (!isService) {
    // CLAUSULAS PAPELERÍA SOCIAL (Pág 1) - LITERAL DEL DOCUMENTO ORIGINAL
    renderClause(1, 'OBJETO DEL CONTRATO', [
      'La Prestadora de Servicios se compromete a diseñar y proporcionar la papelería social solicitada por La Contratante conforme a lo establecido en la cotización relacionada al folio anteriormente señalado.'
    ]);

    renderClause(2, 'ALCANCE DEL SERVICIO', [
      'El servicio podrá incluir, según lo contratado: invitaciones digitales, menús, números de mesa, etiquetas, place cards, papelería personalizada, impresión y/o entrega digital.',
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
    // CLAUSULAS BEER STAND / STANDS (Pág 1) - LITERAL DEL DOCUMENTO ORIGINAL
    renderClause(1, 'OBJETO DEL CONTRATO', [
      'La Prestadora de Servicios se compromete a proporcionar el servicio de Beer Stand solicitado por La Contratante conforme a lo establecido en la cotización relacionada al folio anteriormente señalado.'
    ]);

    renderClause(2, 'ALCANCE DEL SERVICIO', [
      'El servicio podrá incluir, según lo contratado: Beer Stand o mesa decorativa, cerveza y/o bebidas contratadas, hielo y enfriadores, insertos y accesorios de servicio, personal de apoyo para reposición de hielo y bebidas (si aplica), elementos decorativos incluidos en el paquete, montaje y desmontaje.',
      'El Beer Stand está diseñado como una estación de autoservicio asistido para recepción o cóctel de bienvenida, con una duración aproximada de 1 hora y 30 minutos.',
      'El servicio contratado no constituye barra libre ni servicio ilimitado de bebidas. La cantidad de bebidas disponibles estará determinada exclusivamente por el paquete contratado y la disponibilidad del producto durante el tiempo de servicio.'
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
  drawCornerFlourish(doc, 'TOP_LEFT', pageWidth, pageHeight);
  drawCornerFlourish(doc, 'BOTTOM_RIGHT', pageWidth, pageHeight);

  // Logo top left
  try {
    const p3LogoW = 42;
    const p3LogoH = 5.5;
    doc.addImage(`data:image/png;base64,${VLB_LOGO_BASE64}`, 'PNG', margin, margin, p3LogoW, p3LogoH);
  } catch (e) {
    console.warn('Could not render logo p3:', e);
  }

  // Start clauses at margin + 14mm
  cY = margin + 15;

  if (!isService) {
    // CLAUSULAS PAPELERÍA SOCIAL (Pág 2) - LITERAL DEL DOCUMENTO ORIGINAL
    renderClause(5, 'IMPRESIÓN Y TONOS', [
      'Los colores, materiales, texturas y acabados pueden presentar ligeras variaciones derivadas de impresión, iluminación, proveedores o visualización en pantalla.',
      'Viva La Bride no garantiza coincidencia exacta de tonos entre archivos digitales e impresos.'
    ]);

    renderClause(6, 'TIEMPOS DE ENTREGA', [
      'Los tiempos de entrega podrán variar entre 7 y 15 días hábiles dependiendo de la carga de trabajo, complejidad del proyecto, tiempos de aprobación y materiales solicitados.',
      'Los tiempos comenzarán a contar una vez recibido el anticipo correspondiente y toda la información necesaria para el desarrollo del diseño.',
      'Retrasos derivados de cambios constantes, falta de respuesta o aprobación tardía por parte de La Contratante podrán modificar las fechas originalmente estimadas.'
    ]);

    renderClause(7, 'PAGOS', [
      'El servicio podrá separarse mediante anticipo previamente acordado (50%). La liquidación total deberá realizarse antes de la entrega final del material digital o impreso. Los anticipos realizados no son reembolsables.'
    ]);

    renderClause(8, 'ENVIOS Y ENTREGAS', [
      'En servicios impresos, Viva La Bride no será responsable por retrasos ocasionados por paqueterías, servicios externos de entrega o situaciones ajenas a su control. El cliente deberá verificar previamente direcciones y datos de envío.'
    ]);

    renderClause(9, 'CANCELACIONES', [
      'En caso de cancelación por parte de La Contratante no se realizará reembolso de anticipos ni pagos realizados. Si el proyecto ya se encuentra en proceso de diseño, impresión o producción, el cliente deberá cubrir los gastos generados hasta el momento.'
    ]);

    renderClause(10, 'AUTORIZACIÓN DE USO DE IMAGEN', [
      'La Contratante autoriza a Viva La Bride utilizar fotografías, videos y diseños realizados con fines de promoción y difusión en redes sociales, página web y medios publicitarios.'
    ]);

    renderClause(11, 'RELACIÓN CON COTIZACIÓN', [
      'El presente contrato se encuentra directamente vinculado a la cotización identificada mediante el folio relacionado anteriormente señalado. La aceptación de la cotización y/o realización de anticipo implica aceptación total de los presentes términos y condiciones.'
    ]);
  } else {
    // CLAUSULAS BEER STAND / STANDS (Pág 2) - LITERAL DEL DOCUMENTO ORIGINAL
    renderClause(5, 'CUIDADO DEL MOBILIARIO Y EQUIPO', [
      'La Contratante será responsable por cualquier daño, pérdida o robo total o parcial del mobiliario, equipo o accesorios proporcionados por La Prestadora de Servicios durante el evento.',
      'En caso de daño o pérdida, La Contratante se compromete a cubrir el costo total de reposición o reparación correspondiente dentro de los 3 días naturales posteriores al evento.'
    ]);

    renderClause(6, 'TIEMPOS DE SERVICIO', [
      'El servicio de Beer Stand se presta como cóctel de bienvenida y tendrá una duración aproximada de 1 hora y 30 minutos, contados a partir de la hora de inicio establecida en la cotización correspondiente.',
      'La Prestadora de Servicios realizará el montaje previo al evento, operará durante el tiempo contratado y posteriormente llevará a cabo el desmontaje del mobiliario.',
      'En caso de que las bebidas contratadas se consuman antes de concluir el tiempo estimado del servicio, éste se considerará prestado en su totalidad, sin que ello genere obligación de reposición adicional por parte de La Prestadora de Servicios.',
      'En caso de que al finalizar el servicio aún existan bebidas disponibles, éstas serán entregadas al coordinador del evento o a la persona previamente designada por La Contratante.'
    ]);

    renderClause(7, 'PAGOS Y CANCELACIONES', [
      'El servicio podrá separarse mediante un anticipo de $1,000 MXN, el cual deberá cubrirse para reservar la fecha del evento. La liquidación total deberá realizarse a más tardar 10 días naturales antes de la fecha del evento. Los anticipos realizados no son reembolsables.',
      'En caso de incumplimiento en la liquidación dentro del plazo establecido, Viva La Bride podrá cancelar el servicio sin obligación de reembolso de cantidades previamente pagadas.',
      'En caso de cancelación por parte de La Contratante, no se realizará reembolso de anticipos ni pagos efectuados.',
      'El servicio podrá reagendarse dentro de los siguientes 30 días naturales, sujeto a disponibilidad de La Prestadora de Servicios y siempre que el servicio se encuentre totalmente liquidado.'
    ]);

    renderClause(8, 'AUTORIZACIÓN DE USO DE IMAGEN', [
      'La Contratante autoriza a Viva La Bride utilizar fotografías, videos y diseños realizados con fines de promoción y difusión en redes sociales, página web y medios publicitarios.'
    ]);

    renderClause(9, 'RELACIÓN CON COTIZACIÓN', [
      'El presente contrato se encuentra directamente vinculado a la cotización identificada mediante el folio relacionado anteriormente señalado. La aceptación de la cotización y/o realización de anticipo implica aceptación total de los presentes términos y condiciones.'
    ]);
  }

  // SIGNATURE SECTION
  const sigY = pageHeight - 34;
  const sigColWidth = 65;

  // Digital Signature Image if available
  if (quote.signature_data) {
    try {
      doc.addImage(quote.signature_data, 'PNG', margin + 8, sigY - 16, 48, 14);
    } catch (e) {
      console.warn('Could not render client digital signature:', e);
    }
  }

  doc.setDrawColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.setLineWidth(0.4);

  // Line left: Contratante
  doc.line(margin + 5, sigY, margin + 5 + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text(clientFullName, margin + 5 + (sigColWidth / 2), sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('La Contratante', margin + 5 + (sigColWidth / 2), sigY + 8.5, { align: 'center' });

  // Line right: Prestadora de Servicios
  const sigRightX = pageWidth - margin - 5 - sigColWidth;
  doc.line(sigRightX, sigY, sigRightX + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY_ROSE[0], COLOR_PRIMARY_ROSE[1], COLOR_PRIMARY_ROSE[2]);
  doc.text('VIVA LA BRIDE', sigRightX + (sigColWidth / 2), sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text('La Prestadora de Servicios', sigRightX + (sigColWidth / 2), sigY + 8.5, { align: 'center' });

  // Page 3 Footer
  drawVlbFooter(doc, pageWidth, pageHeight, 'PÁGINA 2/2');

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
