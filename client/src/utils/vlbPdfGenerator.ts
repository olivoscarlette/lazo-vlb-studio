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

export type VlbContractType = 'AUTO' | 'SNACKS' | 'STANDS' | 'MEMORIAL' | 'DRINKS' | 'PAPELERIA' | 'COMBO';

export function isSnackItem(i: VlbQuoteItem): boolean {
  const text = `${i.item_name || ''} ${i.description || ''} ${i.subcategory || ''}`.toLowerCase();
  return (
    text.includes('snack') ||
    text.includes('botana') ||
    text.includes('caja chica') ||
    text.includes('caja grande') ||
    text.includes('cajita') ||
    text.includes('dulce') ||
    text.includes('postre') ||
    text.includes('munchies') ||
    text.includes('favor') ||
    text.includes('souvenir') ||
    text.includes('galleta') ||
    text.includes('kit anticruda') ||
    text.includes('palomita') ||
    text.includes('bocadillo') ||
    text.includes('agradecimiento')
  );
}

export function isMemorialItem(i: VlbQuoteItem): boolean {
  const text = `${i.item_name || ''} ${i.description || ''} ${i.subcategory || ''}`.toLowerCase();
  return (
    text.includes('memorial') ||
    text.includes('conmemorativo') ||
    text.includes('muro de recuerdo') ||
    text.includes('muro memorial') ||
    text.includes('rincón de la memoria') ||
    text.includes('rincon de la memoria')
  );
}

export function isDrinksItem(i: VlbQuoteItem): boolean {
  const text = `${i.item_name || ''} ${i.description || ''} ${i.subcategory || ''}`.toLowerCase();
  return (
    text.includes('beer') ||
    text.includes('cerveza') ||
    text.includes('mimosa') ||
    text.includes('champagne') ||
    text.includes('welcome drink') ||
    text.includes('barra de bebida') ||
    text.includes('coctel') ||
    text.includes('cóctel') ||
    text.includes('carreta de shot') ||
    text.includes('shots')
  );
}

export function isStandOrDecorItem(i: VlbQuoteItem): boolean {
  const text = `${i.item_name || ''} ${i.description || ''} ${i.subcategory || ''}`.toLowerCase();
  return (
    text.includes('backdrop') ||
    text.includes('seating chart') ||
    text.includes('espejo') ||
    text.includes('mampara') ||
    text.includes('muro') ||
    text.includes('arco') ||
    text.includes('guestbook') ||
    text.includes('audio guestbook') ||
    text.includes('stand') ||
    text.includes('estructura')
  );
}

export function isPapeleriaItem(i: VlbQuoteItem): boolean {
  const text = `${i.item_name || ''} ${i.description || ''} ${i.subcategory || ''}`.toLowerCase();
  return (
    i.category === 'PAPELERIA' ||
    text.includes('invita') ||
    text.includes('menú') ||
    text.includes('menu') ||
    text.includes('misal') ||
    text.includes('voto') ||
    text.includes('place card') ||
    text.includes('lotería') ||
    text.includes('loteria') ||
    text.includes('número de mesa') ||
    text.includes('numero de mesa') ||
    text.includes('save the date')
  );
}

export function detectContractType(items: VlbQuoteItem[], quote?: VlbQuote): 'SNACKS' | 'MEMORIAL' | 'STANDS' | 'DRINKS' | 'PAPELERIA' | 'COMBO' {
  if (!items || items.length === 0) {
    if (quote?.quote_number?.startsWith('PS-')) return 'PAPELERIA';
    return 'STANDS';
  }

  const hasSnacks = items.some(isSnackItem);
  const hasMemorial = items.some(isMemorialItem);
  const hasDrinks = items.some(isDrinksItem);
  const hasStands = items.some(isStandOrDecorItem);
  const hasPapeleria = items.some(isPapeleriaItem);

  const matchedCategories = [hasSnacks, hasMemorial, hasDrinks, hasStands, hasPapeleria].filter(Boolean).length;
  if (matchedCategories > 1) {
    return 'COMBO';
  }

  if (hasSnacks) return 'SNACKS';
  if (hasMemorial) return 'MEMORIAL';
  if (hasDrinks) return 'DRINKS';
  if (hasStands) return 'STANDS';
  if (hasPapeleria) return 'PAPELERIA';

  if (items.every(i => i.category === 'PAPELERIA')) return 'PAPELERIA';
  return 'COMBO';
}

// Generador modular de cláusulas legales unificadas de Viva la Bride
export function getContractClauses(
  items: VlbQuoteItem[],
  quote: VlbQuote,
  folioNumber: string,
  contractTypeOverride?: string
) {
  const effectiveType: string = (contractTypeOverride && contractTypeOverride !== 'AUTO')
    ? contractTypeOverride
    : ((quote as any).contract_type && (quote as any).contract_type !== 'AUTO'
        ? (quote as any).contract_type
        : detectContractType(items, quote));

  let serviceTitle = 'ATELIER & EXPERIENCIAS DE BIENVENIDA';
  let clauses: { title: string; text: string }[] = [];

  if (effectiveType === 'SNACKS') {
    serviceTitle = 'SNACKS, FAVORES & EXPERIENCIAS DE BIENVENIDA';
    clauses = [
      {
        title: '1. OBJETO DEL CONTRATO',
        text: `La Prestadora de Servicios se compromete a elaborar, personalizar y suministrar las piezas de snacks, cajitas de agradecimiento, botanas o favores descritos en la cotización oficial con folio ${folioNumber}.`
      },
      {
        title: '2. ALCANCE Y EMPAQUE PERSONALIZADO',
        text: 'El servicio comprende la preparación con insumos de primera calidad, porciones pactadas, empaque individual de las piezas, colocación de listón y tags o etiquetas personalizadas conforme al diseño acordado.'
      },
      {
        title: '3. CALIDAD E INSUMOS ALIMENTARIOS',
        text: 'Viva la Bride garantiza que todos los insumos, botanas y confitería son frescos y manipulados con higiene. La Contratante es responsable de consultar con sus invitados sobre alergias o intolerancias alimentarias previas al evento.'
      },
      {
        title: '4. PERSONALIZACIÓN Y VISTO BUENO (VoBo)',
        text: 'Viva la Bride diseñará las etiquetas, tags de agradecimiento y selección de colores conforme a la paleta del evento. Una vez otorgado el VoBo final para impresión de tags, cualquier cambio extemporáneo generará costos adicionales.'
      },
      {
        title: '5. CONSERVACIÓN Y CONDICIONES DEL RECINTO',
        text: 'Los productos deberán resguardarse en un espacio fresco, seco, techado y lejos del sol directo dentro del salón o recinto del evento para preservar su consistencia, sabor y presentación óptima.'
      },
      {
        title: '6. ENTREGA Y PUNTUALIDAD',
        text: 'La entrega física o montaje de las cajas y snacks se realizará puntualmente en la fecha, horario y sede estipulados en la cotización oficial. La recepción deberá ser confirmada por La Contratante o su coordinador designado.'
      },
      {
        title: '7. PAGOS Y CONDICIONES FINANCIERAS',
        text: 'Separación fija de $1,000 MXN para reservar fecha en agenda. La liquidación total deberá realizarse a más tardar 10 días naturales antes del evento para adquisición de insumos y producción. Anticipos no reembolsables.'
      },
      {
        title: '8. CANCELACIONES Y REAGENDACIÓN',
        text: 'En caso de cancelación por parte de La Contratante no habrá reembolso de anticipos ni de insumos ya adquiridos. El servicio podrá reagendarse dentro de los siguientes 30 días naturales sujeto a disponibilidad y liquidación total.'
      },
      {
        title: '9. AUTORIZACIÓN DE IMAGEN Y VALIDEZ LEGAL',
        text: 'La Contratante autoriza el uso de fotografías del empaque y montaje con fines de portafolio y redes sociales respetando la privacidad. El anticipo o firma digital ratifica la total conformidad y validez vinculante del presente contrato.'
      }
    ];
  } else if (effectiveType === 'DRINKS') {
    serviceTitle = 'BEER & MIMOSA STANDS';
    clauses = [
      {
        title: '1. OBJETO DEL CONTRATO',
        text: `La Prestadora de Servicios se compromete a brindar el servicio de estaciones de bebidas contratadas conforme a los servicios, cantidades y especificaciones de la cotización oficial con folio ${folioNumber}.`
      },
      {
        title: '2. ALCANCE Y LÍMITES DEL SERVICIO',
        text: 'El servicio incluye stand decorativo, insumos pactados, copas o vasos e insertos de servicio. La logística de invitados y recolección de vasos fuera del stand corresponde al recinto o meseros. El servicio no iniciará antes de la hora pactada.'
      },
      {
        title: '3. MONTAJE, OPERACIÓN Y CONDICIONES DE SEGURIDAD',
        text: 'El montaje se realizará 40 a 60 minutos previos al evento por personal de Viva la Bride. En espacios abiertos el stand deberá colocarse pegado a un muro o estructura firme para evitar caídas. La prestadora podrá negar el montaje si las condiciones representan riesgo.'
      },
      {
        title: '4. CONSUMO RESPONSABLE DE ALCOHOL',
        text: 'Viva la Bride promueve el consumo responsable. El servicio está destinado exclusivamente a mayores de edad. La Prestadora de Servicios no se hace responsable por consumo excesivo o incidentes derivados durante o después del evento.'
      },
      {
        title: '5. TIEMPOS DE SERVICIO Y ENTREGA DE REMANENTE',
        text: 'Servicio de cóctel de bienvenida con duración aprox. de 1h 30m; no constituye barra libre ni consumo ilimitado. Si la bebida concluye antes, el servicio finaliza sin reposición obligatoria; el insumo remanente al terminar el tiempo pactado se entrega formalmente al coordinador del evento.'
      },
      {
        title: '6. CUIDADO DEL MOBILIARIO Y CRISTALERÍA',
        text: 'La Contratante es responsable por cualquier daño, rotura, pérdida o robo total o parcial de mamparas, cristalería o equipo proporcionado, comprometiéndose a cubrir el costo total de reposición o reparación correspondiente dentro de los 3 días naturales posteriores al evento.'
      },
      {
        title: '7. CARGOS ADICIONALES POR ACCESOS O MANIOBRAS',
        text: 'Montajes en plantas altas, accesos mediante escaleras, rampas extensas o maniobras especiales que impliquen esfuerzo logístico extraordinario causarán un cargo adicional informado a La Contratante previamente al evento para su liquidación.'
      },
      {
        title: '8. PAGOS Y LIQUIDACIÓN',
        text: 'Separación fija de $1,000 MXN para reservar fecha. La liquidación total deberá realizarse a más tardar 10 días naturales antes del evento. Anticipos no reembolsables.'
      },
      {
        title: '9. CANCELACIONES Y REAGENDACIÓN',
        text: 'En caso de cancelación por La Contratante no se realizará reembolso. El servicio podrá reagendarse dentro de los siguientes 30 días naturales sujeto a disponibilidad de Viva la Bride y siempre que el servicio esté totalmente liquidado.'
      },
      {
        title: '10. AUTORIZACIÓN DE IMAGEN Y VALIDEZ LEGAL',
        text: 'La Contratante autoriza el uso de fotografías y videos del montaje con fines de portafolio y redes sociales respetando la privacidad. La realización del anticipo o firma digital ratifica la total conformidad y validez vinculante del presente contrato.'
      }
    ];
  } else if (effectiveType === 'MEMORIAL') {
    serviceTitle = 'MEMORIAL WALL & HOMENAJE CONMEMORATIVO';
    clauses = [
      {
        title: '1. OBJETO DEL CONTRATO',
        text: `La Prestadora de Servicios se compromete a suministrar la estructura de Memorial Wall y ambientación conmemorativa descrita en la cotización oficial con folio ${folioNumber}. Ambas partes reconocen expresamente los servicios acordados.`
      },
      {
        title: '2. ALCANCE DEL SERVICIO',
        text: 'El servicio incluye mampara conmemorativa, renta de portarretratos, velas (reales o LED según venue), frase en vinil personalizado y montaje y desmontaje el mismo día del evento conforme a la cotización correspondiente.'
      },
      {
        title: '3. RESPONSABILIDAD DE LA CONTRATANTE',
        text: 'La Contratante entregará las fotografías digitales con al menos 7 días naturales de anticipación y confirmará frases de vinil. Asimismo deberá asegurar un espacio adecuado, firme y nivelado para la instalación del mobiliario.'
      },
      {
        title: '4. MONTAJE Y CONDICIONES DE SEGURIDAD',
        text: 'El montaje será realizado por personal de Viva la Bride 40 a 60 minutos previos al evento en superficie estable. Viva la Bride podrá negar el montaje cuando las condiciones representen riesgo para los asistentes o el mobiliario.'
      },
      {
        title: '5. CUIDADO DEL MOBILIARIO, EQUIPO Y ACCESORIOS',
        text: 'La Contratante es responsable por cualquier daño, rotura, pérdida o robo de mamparas, portarretratos, cristalería, velas o accesorios, comprometiéndose a cubrir su costo de reposición dentro de los 3 días naturales posteriores al evento.'
      },
      {
        title: '6. PERSONALIZACIÓN Y VOBO FINAL',
        text: 'Viva la Bride elaborará el Memorial Wall con base en los datos y fotos provistos por el cliente. Una vez otorgado el visto bueno (VoBo) final para corte de vinil e impresión, cualquier cambio posterior generará costos adicionales.'
      },
      {
        title: '7. CARGOS ADICIONALES POR ACCESOS O MANIOBRAS',
        text: 'Montajes en plantas altas, accesos mediante escaleras, rampas extensas o maniobras especiales que impliquen esfuerzo extraordinario causarán un cargo adicional notificado antes del evento para su liquidación.'
      },
      {
        title: '8. PAGOS Y LIQUIDACIÓN',
        text: 'Separación fija de $1,000 MXN para reservar fecha. La liquidación total deberá realizarse a más tardar 10 días naturales antes del evento. Anticipos no reembolsables.'
      },
      {
        title: '9. CANCELACIONES Y REAGENDACIÓN',
        text: 'En caso de cancelación por parte de La Contratante no habrá reembolso de anticipos. El servicio podrá reagendarse dentro de los siguientes 30 días naturales sujeto a disponibilidad y liquidación total.'
      },
      {
        title: '10. AUTORIZACIÓN DE IMAGEN Y VALIDEZ LEGAL',
        text: 'La Contratante autoriza utilizar fotos y videos del montaje con fines de portafolio y redes sociales respetando en todo momento el carácter conmemorativo y privacidad. El anticipo o firma digital ratifica la validez legal del presente contrato.'
      }
    ];
  } else if (effectiveType === 'STANDS') {
    serviceTitle = 'STANDS DECORATIVOS & AMBIENTACIÓN';
    clauses = [
      {
        title: '1. OBJETO DEL CONTRATO',
        text: `La Prestadora de Servicios se compromete a suministrar la estructura decorativa, backdrop, mobiliario en renta o seating chart descrito en la cotización oficial con folio ${folioNumber}.`
      },
      {
        title: '2. ALCANCE DEL SERVICIO Y MONTAJE',
        text: 'El servicio incluye renta de mobiliario o mamparas, personalización gráfica acordada (corte de vinil, caligrafía o papelería de seating chart), y montaje y desmontaje el mismo día del evento conforme a lo contratado.'
      },
      {
        title: '3. RESPONSABILIDAD DE LA CONTRATANTE',
        text: 'La Contratante entregará la información requerida (listado de mesas, nombres, frases o diseño) con al menos 7 días naturales de anticipación y otorgará VoBo final. Asimismo deberá asegurar un espacio adecuado, firme y nivelado.'
      },
      {
        title: '4. MONTAJE Y CONDICIONES DE SEGURIDAD',
        text: 'El montaje será realizado por personal de Viva la Bride 40 a 60 minutos previos al evento en superficie estable. En exteriores las estructuras deberán instalarse contiguas a muros o respaldos firmes. Viva la Bride podrá negar el montaje ante riesgo por viento o inestabilidad.'
      },
      {
        title: '5. CUIDADO DEL MOBILIARIO Y ESTRUCTURAS',
        text: 'La Contratante es responsable por cualquier daño, rotura, rayadura, pérdida o robo de mamparas, marcos, espejos, estructuras o accesorios en renta, comprometiéndose a cubrir su costo de reposición dentro de los 3 días posteriores al evento.'
      },
      {
        title: '6. PERSONALIZACIÓN Y VOBO FINAL',
        text: 'Viva la Bride elaborará la propuesta gráfica con base en los datos provistos. Una vez otorgado el VoBo final para corte de vinil o impresión, cualquier modificación posterior generará costos adicionales.'
      },
      {
        title: '7. CARGOS ADICIONALES POR ACCESOS O MANIOBRAS',
        text: 'Montajes en plantas altas, accesos mediante escaleras, rampas extensas o maniobras especiales que impliquen esfuerzo extraordinario causarán un cargo adicional notificado antes del evento para su liquidación.'
      },
      {
        title: '8. PAGOS Y LIQUIDACIÓN',
        text: 'Separación fija de $1,000 MXN para reservar fecha. La liquidación total deberá realizarse a más tardar 10 días naturales antes del evento. Anticipos no reembolsables.'
      },
      {
        title: '9. CANCELACIONES Y REAGENDACIÓN',
        text: 'En caso de cancelación por parte de La Contratante no habrá reembolso de anticipos. El servicio podrá reagendarse dentro de los siguientes 30 días naturales sujeto a disponibilidad y liquidación total.'
      },
      {
        title: '10. AUTORIZACIÓN DE IMAGEN Y VALIDEZ LEGAL',
        text: 'La Contratante autoriza utilizar fotos y videos del montaje con fines de portafolio y redes sociales respetando la privacidad. El anticipo o firma digital ratifica la validez vinculante del presente contrato.'
      }
    ];
  } else if (effectiveType === 'PAPELERIA') {
    serviceTitle = 'PAPELERÍA SOCIAL & DISEÑO ATELIER';
    clauses = [
      {
        title: '1. OBJETO DEL CONTRATO',
        text: `La Prestadora de Servicios se compromete a diseñar y elaborar la papelería social solicitada por La Contratante conforme a lo detallado en la cotización oficial con folio ${folioNumber}.`
      },
      {
        title: '2. ALCANCE DEL SERVICIO',
        text: 'El servicio incluye las piezas impresas o digitales estipuladas en la cotización (invitaciones, menús, números de mesa, place cards o papelería personalizada) según acabados y cantidades acordadas.'
      },
      {
        title: '3. PROCESO DE DISEÑO E INFORMACIÓN',
        text: 'La Contratante proporcionará oportunamente nombres, fechas, textos y especificaciones completas. Viva la Bride no será responsable por errores ortográficos o datos incorrectos autorizados por el cliente.'
      },
      {
        title: '4. CAMBIOS Y MODIFICACIONES',
        text: 'El servicio incluye hasta 3 rondas de ajustes de diseño dentro del paquete contratado. Modificaciones posteriores a la aprobación final (VoBo) generarán costos extraordinarios y podrán diferir tiempos de entrega.'
      },
      {
        title: '5. IMPRESIÓN, TONOS Y ACABADOS ARTESANALES',
        text: 'Los tonos, texturas y acabados pueden presentar ligeras variaciones derivadas de imprenta, iluminación y procesos artesanales. Viva la Bride no garantiza coincidencia exacta idéntica a pantallas digitales.'
      },
      {
        title: '6. TIEMPOS DE PRODUCCIÓN Y ENTREGA',
        text: 'Tiempos de entrega de 7 a 15 días hábiles a partir del anticipo, recepción completa de datos y VoBo final de diseño. Retrasos en la aprobación por parte de La Contratante modificarán la fecha de entrega original.'
      },
      {
        title: '7. PAGOS Y CONDICIONES FINANCIERAS',
        text: 'El proyecto se inicia mediante anticipo del 50 por ciento del total cotizado para inicio de diseño e insumos. La liquidación total deberá realizarse previo a la entrega física o programación del envío.'
      },
      {
        title: '8. ENVÍOS Y PAQUETERÍAS',
        text: 'En proyectos con envío foráneo o mensajería, Viva la Bride no se responsabiliza por demoras o incidencias imputables a empresas de paquetería externas. El cliente deberá validar su dirección con anticipación.'
      },
      {
        title: '9. CANCELACIONES',
        text: 'En caso de cancelación por parte de La Contratante no se realizará reembolso de anticipos. Si el proyecto se encuentra en producción, el cliente cubrirá los costos de insumos y trabajo generados al momento.'
      },
      {
        title: '10. AUTORIZACIÓN DE IMAGEN Y VALIDEZ LEGAL',
        text: 'La Contratante autoriza a Viva la Bride utilizar fotos y videos de las piezas elaboradas con fines de portafolio y difusión en redes sociales. El anticipo o firma digital ratifica la validez vinculante del presente contrato.'
      }
    ];
  } else {
    // COMBO / PAQUETE MIXTO
    serviceTitle = 'ATELIER & EXPERIENCIAS DE BIENVENIDA';
    clauses = [
      {
        title: '1. OBJETO DEL CONTRATO',
        text: `La Prestadora de Servicios se compromete a brindar los servicios y elaborar las piezas acordadas conforme a la cotización oficial con folio ${folioNumber}.`
      },
      {
        title: '2. ALCANCE Y LÍMITES DEL SERVICIO',
        text: 'El servicio comprende exclusivamente los conceptos detallados en la propuesta comercial. La organización y logística general de invitados corre por cuenta del recinto o La Contratante.'
      },
      {
        title: '3. MONTAJE, OPERACIÓN Y SEGURIDAD',
        text: 'El montaje se realizará 40 a 60 minutos previos al evento por personal de Viva la Bride. En exteriores el mobiliario se anclará próximo a muros o estructuras firmes para evitar caídas.'
      },
      {
        title: '4. CONSUMO RESPONSABLE DE ALCOHOL',
        text: 'Viva la Bride promueve el consumo responsable exclusivamente para mayores de edad. Si se incluyen bebidas, el servicio opera como cóctel de bienvenida (aprox. 1h 30m) sin constituir barra libre.'
      },
      {
        title: '5. CUIDADO DEL MOBILIARIO Y EQUIPO',
        text: 'La Contratante responderá por cualquier rotura, daño, extravío o robo de mamparas, cristalería o mobiliario, cubriendo la reposición en no más de 3 días naturales posteriores al evento.'
      },
      {
        title: '6. CARGOS ADICIONALES POR ACCESOS',
        text: 'Accesos por escaleras, plantas altas o maniobras que requieran esfuerzo extraordinario causarán un costo adicional notificado previamente a La Contratante para su liquidación.'
      },
      {
        title: '7. PROCESO DE DISEÑO, FOTOS Y VOBO',
        text: 'Fotografías y frases se entregan con 7 días de anticipación. En papelería incluye hasta 3 rondas de ajustes previas a VoBo. Los tonos pueden presentar ligeras variaciones inherentes de imprenta.'
      },
      {
        title: '8. PAGOS Y CONDICIONES FINANCIERAS',
        text: 'Separación fija de $1,000 MXN para reservar stands (o 50 por ciento en papelería). La liquidación total deberá realizarse a más tardar 10 días naturales antes del evento (o previo a entrega).'
      },
      {
        title: '9. CANCELACIONES Y REAGENDACIÓN',
        text: 'Anticipos no reembolsables. En servicios de stands podrá reagendarse dentro de los siguientes 30 días naturales sujeto a disponibilidad y liquidación total.'
      },
      {
        title: '10. AUTORIZACIÓN DE IMAGEN Y VALIDEZ LEGAL',
        text: 'La Contratante autoriza el uso de fotografías y videos del montaje con fines de portafolio y redes sociales respetando la privacidad. El anticipo o firma digital ratifica la validez de este contrato.'
      }
    ];
  }

  const isService = effectiveType !== 'PAPELERIA';
  return { clauses, isService, serviceTitle, effectiveType };
}

export function standardizeEventTime(val: string | null | undefined): string {
  if (!val || !val.trim()) return 'Por definir';
  const clean = val.trim();
  if (/^por\s*def/i.test(clean)) return 'Por definir';

  // 1. Matches 24-hour time HH:mm (e.g. "16:00", "09:30", "14:15")
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let hour = parseInt(match24[1], 10);
    const minute = match24[2];
    if (hour >= 13 && hour <= 23) {
      return `${hour - 12}:${minute} PM`;
    }
    if (hour === 12) return `12:${minute} PM`;
    if (hour === 0) return `12:${minute} AM`;
    if (hour >= 1 && hour <= 9) return `${hour}:${minute} PM`;
    if (hour >= 10 && hour <= 11) return `${hour}:${minute} AM`;
  }

  // 2. Matches 12-hour time with or without minutes & AM/PM (e.g. "4:00 PM", "4pm", "04:30 pm", "4 pm", "4")
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*([aApP][mM])?$/);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = match12[2] || '00';
    let ampm = (match12[3] || '').toUpperCase();
    if (!ampm) {
      if (hour >= 13 && hour <= 23) {
        hour = hour % 12;
        ampm = 'PM';
      } else if (hour >= 1 && hour <= 9) {
        ampm = 'PM';
      } else if (hour === 12) {
        ampm = 'PM';
      } else {
        ampm = 'AM';
      }
    }
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  }

  return clean;
}

export function time12To24(val: string | null | undefined): string {
  if (!val || typeof val !== 'string' || !val.trim() || /^por\s*def/i.test(val.trim())) return '';
  const clean = val.trim();

  // Already 24h HH:mm
  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = parseInt(m24[1], 10);
    const m = m24[2];
    if (h >= 13 && h <= 23) return `${String(h).padStart(2, '0')}:${m}`;
    if (h === 12) return `12:${m}`;
    if (h === 0) return `00:${m}`;
    if (h >= 1 && h <= 9) return `${String(h + 12).padStart(2, '0')}:${m}`;
    if (h >= 10 && h <= 11) return `${String(h).padStart(2, '0')}:${m}`;
  }

  // 12h format e.g. "4:00 PM", "4pm", "11:30 am"
  const m12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*([aApP][mM])?$/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = m12[2] || '00';
    let ampm = (m12[3] || '').toUpperCase();
    if (!ampm) {
      if (h >= 1 && h <= 9) ampm = 'PM';
      else if (h === 12) ampm = 'PM';
      else if (h >= 13 && h <= 23) {
        return `${String(h).padStart(2, '0')}:${m}`;
      } else {
        ampm = 'AM';
      }
    }
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  return '';
}

export function time24To12(val: string | null | undefined): string {
  if (!val || typeof val !== 'string' || !val.trim() || /^por\s*def/i.test(val.trim())) return 'Por definir';
  const clean = val.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return clean;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export const VLB_STANDARD_TIME_CHIPS = [
  'Por definir',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM'
] as const;

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
  options?: { autoDownload?: boolean; includeContract?: boolean; contractType?: string }
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

  const subtotal = Number(quote.subtotal) > 0
    ? Number(quote.subtotal)
    : items.reduce((acc, curr) => acc + Number(curr.total_price || curr.unit_price || 0), 0);

  const total = Number(quote.total) > 0 ? Number(quote.total) : subtotal;
  let discount = Number(quote.discount) || 0;
  if (discount === 0 && subtotal > total) {
    discount = Math.round((subtotal - total) * 100) / 100;
  }

  // ========================================================
  // PÁGINA 1: DIBUJAR VALORES EXACTOS EN EL ESPACIO LIMPIO
  // ========================================================

  const pinkLabel = rgb(215 / 255, 54 / 255, 98 / 255); // #D73662 Rosa Oficial Canva

  // 1. Limpieza total de los 4 renglones de metadatos (elimina corchetes [, |, y glifos corruptos de Canva)
  page.drawRectangle({ x: 48, y: 666, width: 300, height: 16, color: white });
  page.drawRectangle({ x: 48, y: 648, width: 350, height: 16, color: white });
  page.drawRectangle({ x: 48, y: 616, width: 500, height: 16, color: white });
  page.drawRectangle({ x: 48, y: 591, width: 500, height: 16, color: white });
  page.drawRectangle({ x: 48, y: 566, width: 350, height: 16, color: white });
  page.drawRectangle({ x: 460, y: 382, width: 85, height: 18, color: white });
  page.drawRectangle({ x: 109.2, y: 179.5, width: 340, height: 17.0, color: white });

  // Renglón 1: FOLIO y FECHA
  safeDraw(page, 'FOLIO:', { x: 50.4, y: 673, size: 9.6, font: fontBold, color: pinkLabel });
  safeDraw(page, folioNumber, { x: 92, y: 673, size: 9.6, font: fontBold, color: textColor });

  safeDraw(page, 'FECHA:', { x: 50.4, y: 654.5, size: 9.6, font: fontBold, color: pinkLabel });
  safeDraw(page, todayFormatted, { x: 94, y: 654.5, size: 9.6, font: fontRegular, color: textColor });

  // Renglón 2: CLIENTE y TELÉFONO
  safeDraw(page, 'CLIENTE:', { x: 50.4, y: 623, size: 9.6, font: fontBold, color: pinkLabel });
  safeDraw(page, clientFullName, { x: 104, y: 623, size: 9.6, font: fontBold, color: textColor });

  safeDraw(page, 'TELÉFONO:', { x: 265, y: 623, size: 9.6, font: fontBold, color: pinkLabel });
  safeDraw(page, quote.client_phone || 'Sin contacto', { x: 330, y: 623, size: 9.6, font: fontRegular, color: textColor });

  // Renglón 3: FECHA EVENTO y VENUE
  safeDraw(page, 'FECHA EVENTO:', { x: 50.4, y: 597.5, size: 9.6, font: fontBold, color: pinkLabel });
  safeDraw(page, formatSpanishDate(quote.event_date), { x: 142, y: 597.5, size: 9.6, font: fontRegular, color: textColor });

  safeDraw(page, 'VENUE:', { x: 370, y: 597.5, size: 9.6, font: fontBold, color: pinkLabel });
  const venueStr = quote.event_venue || 'Por definir';
  safeDraw(page, venueStr.length > 20 ? venueStr.substring(0, 18) + '...' : venueStr, { x: 418, y: 597.5, size: 9.6, font: fontRegular, color: textColor });

  // Renglón 4: HORA INICIO
  safeDraw(page, 'HORA INICIO:', { x: 50.4, y: 572.5, size: 9.6, font: fontBold, color: pinkLabel });
  const timeStr = standardizeEventTime(quote.event_time || quote.ceremony_time || quote.service_time);
  safeDraw(page, timeStr, { x: 124, y: 572.5, size: 9.6, font: fontRegular, color: textColor });

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

  // 9. TOTAL & DESGLOSE FINANCIERO (SUBTOTAL, DESCUENTO Y TOTAL)
  if (discount > 0) {
    // Si hay descuento, cubrimos el área de total para presentar el desglose exacto
    page.drawRectangle({
      x: 310,
      y: 358,
      width: 240,
      height: 60,
      color: white
    });

    const subtotalFormatted = `$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const discountFormatted = `-$${discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const totalFormatted = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

    const discountPct = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;
    const discountLabel = discountPct > 0 ? `DESCUENTO (${discountPct}%):` : 'DESCUENTO:';

    // Renglón 1: Subtotal
    safeDraw(page, 'SUBTOTAL:', { x: 382, y: 404, size: 8.8, font: fontRegular, color: rgb(110 / 255, 100 / 255, 100 / 255) });
    safeDraw(page, subtotalFormatted, { x: 475, y: 404, size: 9.2, font: fontRegular, color: textColor });

    // Renglón 2: Descuento en rosa oficial
    safeDraw(page, discountLabel, { x: 382, y: 390, size: 8.8, font: fontBold, color: pinkLabel });
    safeDraw(page, discountFormatted, { x: 475, y: 390, size: 9.2, font: fontBold, color: pinkLabel });

    // Línea divisoria sutil
    page.drawLine({
      start: { x: 380, y: 383 },
      end: { x: 545, y: 383 },
      thickness: 0.6,
      color: rgb(238 / 255, 205 / 255, 215 / 255)
    });

    // Renglón 3: Total Final en grande y negrita
    safeDraw(page, 'TOTAL:', { x: 382, y: 368, size: 11.5, font: fontBold, color: textColor });
    safeDraw(page, totalFormatted, { x: 475, y: 368, size: 12.0, font: fontBold, color: textColor });
  } else {
    // Si no hay descuento, dibuja el total estándar sobre la plantilla de Canva
    const totalFormatted = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    safeDraw(page, totalFormatted, { x: 475, y: 391, size: 12.0, font: fontBold, color: textColor });
  }

  // 10. CONCEPTO EN FORMA DE PAGO
  const clientNameClean = (quote.client_name || 'Cliente').trim();
  const conceptDate = formatConceptDate(quote.event_date);
  const conceptoText = conceptDate ? `${clientNameClean} ${conceptDate}` : clientNameClean;

  // Dibujar la barra vertical como vector exacto para evitar el glifo con marca de agua 'DEMO' de la fuente Mont
  page.drawLine({
    start: { x: 111.0, y: 184.8 },
    end: { x: 111.0, y: 194.2 },
    thickness: 0.6,
    color: textColor
  });

  safeDraw(page, conceptoText, {
    x: 115.5,
    y: 185.2,
    size: 9.2,
    font: fontRegular,
    color: textColor
  });

  // ========================================================
  // PÁGINA 2: CONTRATO DIGITAL (INCLUIDO POR DEFECTO PARA LECTURA Y FIRMA)
  // ========================================================
  const shouldIncludeContract = Boolean(
    options?.includeContract !== undefined
      ? options.includeContract
      : true
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
    const timeClean = cleanWinAnsi(standardizeEventTime(quote.event_time || quote.ceremony_time || quote.service_time));
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

    safeDraw(page2, 'Folio cotización:', { x: 245, y: 794, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, folioNumber, { x: 318, y: 794, size: 8.0, font: fontBold, color: pinkAccent });
    safeDraw(page2, 'Fecha evento:', { x: 405, y: 794, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, dateClean, { x: 465, y: 794, size: 7.5, font: fontBold, color: darkColor });

    safeDraw(page2, 'Cliente:', { x: 245, y: 778, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, clientFullName, { x: 285, y: 778, size: 7.8, font: fontBold, color: darkColor });

    safeDraw(page2, 'Sede:', { x: 245, y: 762, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, venueClean, { x: 275, y: 762, size: 7.5, font: fontRegular, color: darkColor });
    safeDraw(page2, 'Horario:', { x: 420, y: 762, size: 7.2, font: fontRegular, color: mutedColor });
    safeDraw(page2, timeClean, { x: 460, y: 762, size: 7.5, font: fontBold, color: pinkAccent });

    // 3. Título Principal Centrado y Subtítulo
    const { clauses, serviceTitle } = getContractClauses(items, quote, folioNumber, options?.contractType);

    const drawPageCentered = (text: string, y: number, size: number, font: PDFFont, color: RGB) => {
      const clean = cleanWinAnsi(text);
      const w = font.widthOfTextAtSize(clean, size);
      safeDraw(page2, clean, { x: (595.5 - w) / 2, y, size, font, color });
    };

    drawPageCentered('CONTRATO DE PRESTACIÓN DE SERVICIOS', 710, 11.5, fontBold, pinkAccent);
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

    // 4. Cláusulas Legales con Justificación Editorial (Inicia en cY = 658 para no chocar con la línea en 676)
    let cY = 658;
    const targetWidth = 505; // Margen a margen (550 - 45)
    for (const cl of clauses) {
      safeDraw(page2, cl.title, { x: 45, y: cY, size: 7.8, font: fontBold, color: pinkAccent });
      cY -= 10.2;

      cY = drawJustifiedParagraph(page2, cl.text, 45, cY, targetWidth, 7.3, 10.3, fontRegular, darkColor);
      cY -= 7.0;
    }

    // 5. Líneas de Firma Proporcionales (Ubicadas de forma armónica tras las cláusulas)
    const sigY = Math.max(130, cY - 45);

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
    drawRightSigCentered('Representante de Viva la Bride', sigY - 26, 7.8, fontBold, darkColor);
    drawRightSigCentered('La Prestadora de Servicios', sigY - 37, 6.8, fontRegular, mutedColor);

    // 6. Pie de Página Elegante (Redes Sociales y WhatsApp) - Centrado y limpio
    page2.drawLine({
      start: { x: 45, y: 45 },
      end: { x: 550, y: 45 },
      thickness: 0.5,
      color: rgb(240 / 255, 213 / 255, 221 / 255)
    });
    drawPageCentered('@vivalabride.mx   -   WhatsApp: 56 6140 6247', 30, 7.2, fontRegular, mutedColor);
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
  options?: { autoDownload?: boolean; includeContract?: boolean; contractType?: string }
) {
  return await buildVlbQuotePdf(quote, items, { autoDownload: true, ...options });
}
