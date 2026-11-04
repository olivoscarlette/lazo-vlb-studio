import { jsPDF } from 'jspdf';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { VLB_LOGO_BASE64 } from './vlbLogoBase64';
import { TOP_WAVES_BASE64, BOTTOM_RIGHT_WAVES_BASE64, VLB_MONOGRAM_BASE64 } from './vlbDesignAssets';

// Colors exact to Viva la Bride Canva branding
const COLOR_CANVA_PINK = [222, 121, 148]; // #DE7994 (Titles & Accents)
const COLOR_CANVA_BAR = [255, 174, 192];  // #FFAEC0 (Table Header Bar)
const COLOR_PRIMARY_ROSE = [222, 121, 148]; // #DE7994 (Legacy Alias for contract pages)
const COLOR_BORDER = [248, 215, 225];       // #F8D7E1 (Legacy Alias for borders)
const COLOR_DARK_TEXT = [45, 40, 42];      // #2D282A
const COLOR_MUTED_LABEL = [165, 145, 150]; // #A59196
const COLOR_MUTED_TEXT = [100, 95, 95];    // #645F5F
const COLOR_LINE_PINK = [248, 215, 225];   // #F8D7E1

/**
 * Draws the official VLB footer matching Canva design
 */
function drawVlbFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageLabel?: string) {
  doc.saveGraphicsState();
  const footY = pageHeight - 14;

  // Social handles & Phone
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);

  doc.text('@vivalabride.mx', margin + 20, footY);
  doc.text('vivalabride.mx', margin + 62, footY);
  doc.text('56 6140 6247', margin + 102, footY);

  if (pageLabel) {
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
    doc.text(pageLabel, pageWidth - margin - 5, footY, { align: 'right' });
  }

  // Legal notice centered at the very bottom
  doc.setFontSize(6.5);
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text(
    'La aceptación de esta cotización y/o pago de separación implica la conformidad con los términos y condiciones del contrato digital de Viva la Bride.',
    pageWidth / 2,
    pageHeight - 6.5,
    { align: 'center' }
  );

  doc.restoreGraphicsState();
}

const margin = 16;

function drawCornerFlourish(doc: jsPDF, corner: 'TOP_LEFT' | 'BOTTOM_RIGHT', pageWidth: number, pageHeight: number) {
  // Delicate flourish placeholder
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
    : (quote.quote_number?.startsWith('SV-') || quote.down_payment_amount === 1000);

  const serviceTypeTitle = isService ? 'BEER STAND' : 'PAPELERÍA SOCIAL';

  // Format Folio (unified VLB standard format: VLB-YY-MMCC)
  let folioNumber = quote.quote_number;
  if (!folioNumber || folioNumber === 'current_preview' || folioNumber === 'preview') {
    const now = new Date();
    const yearShort = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    folioNumber = `VLB-${yearShort}-${month}01`;
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
  const totalPaid = Number(quote.total_paid) || 0;
  const balanceDue = totalPaid > 0 ? Math.max(0, total - totalPaid) : Math.max(0, total - downPayment);

  // Client name
  const clientFullName = quote.partner_name
    ? `${quote.client_name} & ${quote.partner_name}`
    : quote.client_name || 'Novia';

  // ========================================================
  // PÁGINA 1: COTIZACIÓN EDITORIAL OFICIAL (CANVA BRANDING)
  // ========================================================
  
  // 1. Top Decorative Waves Header across full width
  try {
    doc.addImage(TOP_WAVES_BASE64, "PNG", 0, 0, pageWidth, 36);
  } catch (e) {
    console.warn("Could not render top waves:", e);
  }

  // 2. Title: COTIZACIÓN
  let y = 46;
  doc.setFont("times", "normal");
  doc.setFontSize(22);
  doc.setTextColor(COLOR_CANVA_PINK[0], COLOR_CANVA_PINK[1], COLOR_CANVA_PINK[2]);
  doc.text("COTIZACIÓN", margin, y);

  // 3. Folio y Fecha de emisión
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text("FOLIO: ", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(folioNumber, margin + 12, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text("FECHA: ", margin, y);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(todayFormatted.toUpperCase(), margin + 13, y);

  // 4. Bloque Metadatos Cliente y Evento (2 Filas)
  y += 8;
  // Fila 1: Cliente y Teléfono
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text("CLIENTE: ", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(clientFullName.toUpperCase(), margin + 16, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text("TELÉFONO: ", margin + 95, y);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text(quote.client_phone || "Sin contacto", margin + 116, y);

  // Fila 2: Fecha Evento, Venue y Hora Inicio / Entrega
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text("FECHA EVENTO: ", margin, y);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text((quote.event_date || "Por definir").toUpperCase(), margin + 26, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text("VENUE: ", margin + 80, y);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  const venueText = (quote.event_venue || "Por definir").toUpperCase();
  doc.text(venueText.length > 20 ? venueText.substring(0, 18) + "..." : venueText, margin + 95, y);

  if (isService) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
    doc.text("HORA INICIO: ", margin + 138, y);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    doc.text((quote.ceremony_time || quote.service_time || "Por definir").toUpperCase(), margin + 160, y);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
    doc.text("ENTREGA: ", margin + 138, y);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    doc.text((quote.delivery_date || "Estimada").toUpperCase(), margin + 155, y);
  }

  // 5. Tabla de Inversión con Barra Rosa Oficial
  y += 10;
  const tableHeaderHeight = 8;
  doc.setFillColor(COLOR_CANVA_BAR[0], COLOR_CANVA_BAR[1], COLOR_CANVA_BAR[2]);
  doc.rect(margin, y, contentWidth, tableHeaderHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("SERVICIO", margin + 6, y + 5.5);
  doc.text("DESCRIPCIÓN", margin + 65, y + 5.5);
  doc.text("TOTAL", pageWidth - margin - 6, y + 5.5, { align: "right" });

  y += tableHeaderHeight + 5;

  // Items Safeguard
  const displayItems = (items && items.length > 0) ? items : [
    {
      id: "fallback_item",
      quote_id: quote.id || "",
      category: isService ? "STANDS_EXPERIENCIAS" : "PAPELERIA_SOCIAL",
      item_name: isService ? "Beer Stand & Barra de Bienvenida" : "Paquete de Papelería Social y Diseño Editorial",
      description: isService
        ? "Servicio completo de Beer Stand con estructura decorativa, insumos, enfriadores y atención personalizada."
        : "Diseño e impresión personalizada de papelería nupcial con acabados artesanales según cotización.",
      pricing_type: "FIXED_EVENT",
      quantity: 1,
      unit_price: total,
      total_price: total,
      sort_order: 1,
      created_at: new Date().toISOString()
    } as VlbQuoteItem
  ];

  // Renglones de la tabla
  displayItems.forEach((item) => {
    // Servicio
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    const nameLines = doc.splitTextToSize(item.item_name, 55);
    doc.text(nameLines, margin + 6, y);

    // Descripción multilínea
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
    const descLines = doc.splitTextToSize(item.description || "", 85);
    doc.text(descLines, margin + 65, y);

    // Costo total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
    const itemTotalFormatted = "$" + Number(item.total_price || item.unit_price || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 });
    doc.text(itemTotalFormatted, pageWidth - margin - 6, y, { align: "right" });

    const rowHeight = Math.max(nameLines.length * 4.2, descLines.length * 3.8, 7) + 4;
    y += rowHeight;

    // Línea divisoria muy fina entre conceptos
    doc.setDrawColor(COLOR_LINE_PINK[0], COLOR_LINE_PINK[1], COLOR_LINE_PINK[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  });

  // 6. Renglón de TOTAL con líneas superior e inferior
  y += 2;
  doc.setDrawColor(COLOR_LINE_PINK[0], COLOR_LINE_PINK[1], COLOR_LINE_PINK[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text("TOTAL", margin + 65, y);

  doc.setFontSize(10.5);
  doc.text("$" + total.toLocaleString("es-MX", { minimumFractionDigits: 2 }), pageWidth - margin - 6, y, { align: "right" });

  y += 3;
  doc.line(margin, y, pageWidth - margin, y);

  // 7. Sección de POLÍTICAS
  y += 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_CANVA_PINK[0], COLOR_CANVA_PINK[1], COLOR_CANVA_PINK[2]);
  doc.text("POLÍTICAS", margin, y);

  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);

  if (isService) {
    doc.text("• Separación fija de 1,000 MXN para reservar y bloquear fecha de evento.", margin, y);
    y += 4.5;
    doc.text("• El saldo se liquida 10 días antes del evento.", margin, y);
    y += 4.5;
    doc.text("• Los anticipos y separaciones no son reembolsables.", margin, y);
  } else {
    doc.text("• Anticipo del 50% para reservar e iniciar el proceso de producción.", margin, y);
    y += 4.5;
    doc.text("• El saldo se liquida previo al envío o entrega de las piezas.", margin, y);
    y += 4.5;
    doc.text("• Los anticipos y separaciones no son reembolsables.", margin, y);
  }

  // 8. Bloque FORMA DE PAGO
  y += 7.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_MUTED_LABEL[0], COLOR_MUTED_LABEL[1], COLOR_MUTED_LABEL[2]);
  doc.text("FORMA DE PAGO", margin, y);

  y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_DARK_TEXT[0], COLOR_DARK_TEXT[1], COLOR_DARK_TEXT[2]);
  doc.text("Beneficiario | ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text("Scarlette Olivo", margin + 20, y);

  y += 4.2;
  doc.setFont("helvetica", "bold");
  doc.text("Banco | ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text("BBVA", margin + 13, y);

  y += 4.2;
  doc.setFont("helvetica", "bold");
  doc.text("Clabe | ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text("012 180 01519982172 1", margin + 12, y);

  y += 4.2;
  doc.setFont("helvetica", "bold");
  doc.text("Concepto | ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text("[" + (quote.client_name || "Nombre clienta") + "] [" + (quote.event_date || "Fecha evento") + "]", margin + 17, y);

  // 9. Ondas decorativas en la esquina inferior derecha
  try {
    const bottomWavesW = 55;
    const bottomWavesH = 65;
    doc.addImage(
      BOTTOM_RIGHT_WAVES_BASE64,
      "PNG",
      pageWidth - bottomWavesW,
      pageHeight - bottomWavesH,
      bottomWavesW,
      bottomWavesH
    );
  } catch (e) {
    console.warn("Could not render bottom right waves:", e);
  }

  // 10. Monograma oficial vb abajo a la izquierda
  try {
    const monogramW = 14;
    const monogramH = 17;
    doc.addImage(
      VLB_MONOGRAM_BASE64,
      "PNG",
      margin,
      pageHeight - 34,
      monogramW,
      monogramH
    );
  } catch (e) {
    console.warn("Could not render monogram logo:", e);
  }

  // 11. Footer con Redes Sociales y Aviso Legal
  drawVlbFooter(doc, pageWidth, pageHeight, "PÁGINA 1/2");

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
      doc.addImage(quote.signature_data, 'PNG', margin + 12, sigY - 15, 50, 14);
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
  if (isSigned) {
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED_TEXT[0], COLOR_MUTED_TEXT[1], COLOR_MUTED_TEXT[2]);
    doc.text(`Firma digital: ${signerDisplayName} (${signDateFormatted})`, margin + 5 + (sigColWidth / 2), sigY + 11.5, { align: 'center' });
  }

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
