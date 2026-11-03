import { jsPDF } from 'jspdf';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';

export function generateVlbQuotePdf(quote: VlbQuote, items: VlbQuoteItem[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;

  // Background subtle warm tone
  doc.setFillColor(252, 250, 247); // #FCFAF7
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative Editorial Border
  doc.setDrawColor(234, 218, 214); // #EAD2D0
  doc.setLineWidth(0.4);
  doc.rect(margin - 4, margin - 4, pageWidth - (margin * 2) + 8, pageHeight - (margin * 2) + 8);

  // Top Accent Bar in Terracotta Rose
  doc.setFillColor(184, 138, 130); // #B88A82
  doc.rect(margin - 4, margin - 4, pageWidth - (margin * 2) + 8, 3, 'F');

  let y = margin + 10;

  // Header: Studio Branding
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(51, 42, 40); // #332A28
  doc.text('VIVA LA BRIDE', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(156, 102, 92); // #9C665C
  y += 5;
  doc.text('PAPELERÍA SOCIAL & STANDS DE BIENVENIDA · ATELIER NUPCIAL', margin, y);

  // Quote Number & Date (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(51, 42, 40);
  doc.text(`COTIZACIÓN N° ${quote.quote_number}`, pageWidth - margin, y - 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(125, 111, 107);
  const dateFormatted = quote.created_at ? new Date(quote.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('es-MX');
  doc.text(`Fecha de Emisión: ${dateFormatted}`, pageWidth - margin, y, { align: 'right' });
  if (quote.valid_until) {
    doc.text(`Vigencia hasta: ${quote.valid_until}`, pageWidth - margin, y + 4.5, { align: 'right' });
  }

  y += 12;

  // Divider Line
  doc.setDrawColor(239, 232, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  y += 7;

  // Client & Event Information Card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 26, 3, 3, 'FD');

  const cardY = y + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 102, 92);
  doc.text('PROYECTO EXCLUSIVO PARA:', margin + 6, cardY);
  doc.text('DETALLES DEL EVENTO:', margin + 95, cardY);

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(51, 42, 40);
  const clientTitle = quote.partner_name ? `${quote.client_name} & ${quote.partner_name}` : quote.client_name;
  doc.text(clientTitle, margin + 6, cardY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(112, 100, 96);
  if (quote.client_email || quote.client_phone) {
    const contactStr = [quote.client_email, quote.client_phone].filter(Boolean).join('  ·  ');
    doc.text(contactStr, margin + 6, cardY + 12);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 42, 40);
  const eventDateStr = quote.event_date || 'Por definir';
  doc.text(`Fecha: ${eventDateStr}`, margin + 95, cardY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(112, 100, 96);
  const venueStr = quote.event_venue ? `Sede: ${quote.event_venue}` : 'Sede: A confirmar';
  doc.text(venueStr, margin + 95, cardY + 12);

  y += 33;

  // Items Table Header
  doc.setFillColor(239, 226, 223); // #EFE2DF
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 7, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(88, 53, 47); // #58352F

  doc.text('CONCEPTO Y DESCRIPCIÓN', margin + 4, y + 4.8);
  doc.text('CATEGORÍA', margin + 96, y + 4.8);
  doc.text('CANTIDAD', margin + 126, y + 4.8, { align: 'center' });
  doc.text('P. UNITARIO', margin + 148, y + 4.8, { align: 'right' });
  doc.text('IMPORTE', pageWidth - margin - 4, y + 4.8, { align: 'right' });

  y += 10;

  // Items List
  items.forEach((item) => {
    // Check if new page is needed
    if (y > pageHeight - 55) {
      doc.addPage();
      y = margin + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 42, 40);
    doc.text(item.item_name, margin + 4, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 90, 80);
    const catLabel = item.category === 'PAPELERIA' ? 'Papelería Social' : 'Stands & Bienvenida';
    doc.text(catLabel, margin + 96, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 70, 68);
    const qtyLabel = item.pricing_type === 'FIXED_EVENT' ? 'Evento' : `${item.quantity} pcs`;
    doc.text(qtyLabel, margin + 126, y, { align: 'center' });

    doc.text(`$${item.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, margin + 148, y, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`$${item.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, y, { align: 'right' });

    y += 4;

    // Optional short description
    if (item.description) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 110, 108);
      const splitDesc = doc.splitTextToSize(item.description, 90);
      doc.text(splitDesc, margin + 4, y);
      y += (splitDesc.length * 3.5) + 1;
    } else {
      y += 2;
    }

    // Row separator
    doc.setDrawColor(245, 238, 232);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  });

  y += 2;

  // Financial Breakdown and Terms Boxes
  if (y > pageHeight - 65) {
    doc.addPage();
    y = margin + 10;
  }

  const totalsBoxWidth = 72;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  // Left: Terms and Conditions
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, totalsBoxX - margin - 4, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(156, 102, 92);
  doc.text('CONDICIONES DE CONTRATACIÓN Y RESERVA', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(90, 80, 78);
  const termsText = [
    '• Anticipo: Se requiere el 50% para reservar fecha en taller y fechas de montaje de stands.',
    '• Aprobación de Diseño (VoBo): Se requiere visto bueno digital previo a entrar a prensa.',
    '• Entrega Física: Papelería social se entrega de 5 a 10 días previos al evento.',
    '• Stands: Montaje con 3 horas de antelación el día del evento en la locación pactada.',
    '• El saldo del 50% restante deberá liquidarse a la entrega o previo al montaje.'
  ];
  let termY = y + 10;
  termsText.forEach(t => {
    doc.text(t, margin + 4, termY);
    termY += 4.5;
  });

  // Right: Totals Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(totalsBoxX, y, totalsBoxWidth, 38, 2, 2, 'FD');

  let totY = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 90, 88);
  doc.text('Subtotal:', totalsBoxX + 4, totY);
  doc.text(`$${quote.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, totY, { align: 'right' });

  if (quote.discount > 0) {
    totY += 5;
    doc.setTextColor(170, 70, 70);
    doc.text('Descuento de Cortesía:', totalsBoxX + 4, totY);
    doc.text(`-$${quote.discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, totY, { align: 'right' });
  }

  totY += 6;
  doc.setDrawColor(230, 220, 215);
  doc.line(totalsBoxX + 4, totY - 2, pageWidth - margin - 4, totY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(51, 42, 40);
  doc.text('Total Propuesta:', totalsBoxX + 4, totY + 2);
  doc.text(`$${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, totY + 2, { align: 'right' });

  // 50% Down Payment Highlight
  totY += 8.5;
  doc.setFillColor(239, 226, 223);
  doc.roundedRect(totalsBoxX + 3, totY - 2.5, totalsBoxWidth - 6, 12, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(140, 60, 50);
  doc.text('Anticipo 50% (Reserva):', totalsBoxX + 5, totY + 1.5);
  doc.text(`$${quote.down_payment_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, totY + 1.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 80, 78);
  doc.text('Saldo 50% al Liquidar:', totalsBoxX + 5, totY + 6.5);
  doc.text(`$${quote.balance_due.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, totY + 6.5, { align: 'right' });

  // Footer Signature & Atelier contact
  const footerY = pageHeight - margin - 4;
  doc.setDrawColor(234, 218, 214);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(125, 111, 107);
  doc.text('Viva la Bride Atelier · Papelería Social Fina & Mobiliario de Bienvenida', margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('hola@vivalabride.com  ·  contacto directo estudio', pageWidth - margin, footerY, { align: 'right' });

  // Save PDF
  const cleanName = quote.client_name.replace(/\s+/g, '_');
  const fileName = `Cotizacion_${quote.quote_number}_${cleanName}_VLB.pdf`;
  doc.save(fileName);
}
