import { FloorElement, GuestItem, HandoverItem, TableItem, TimelineItem, WeddingProfile } from '../types/lazo';
import { formatShortDate } from '../data/seedWedding';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openPrintablePdf(title: string, subtitle: string, profile: WeddingProfile, bodyHtml: string) {
  const win = window.open('', '_blank', 'width=960,height=780');
  if (!win) {
    alert('Por favor permite ventanas emergentes para descargar el PDF.');
    return;
  }

  const couple = `${profile.partner1 || 'Novia'} & ${profile.partner2 || 'Novio'}`;
  const dateLabel = profile.weddingDate ? formatShortDate(profile.weddingDate) : '';
  const metaLine = [couple, dateLabel, profile.city].filter(Boolean).join(' · ');

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — ${escapeHtml(couple)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Marcellus&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    @page { margin: 12mm; size: auto; }
    body {
      margin: 0;
      padding: 20px 24px;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #2B2826;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { padding: 0; }
      .header { margin-bottom: 12px; padding-bottom: 10px; }
      .svg-box {
        padding: 8px;
        margin-bottom: 14px;
        page-break-before: avoid;
        break-before: avoid;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .svg-box svg {
        max-height: 190mm !important;
        width: auto !important;
        max-width: 100% !important;
      }
    }
    @media print and (orientation: landscape) {
      .svg-box svg {
        max-height: 138mm !important;
      }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 16px;
      border-bottom: 1px solid #EFE8E1;
      margin-bottom: 24px;
    }
    .brand {
      font-family: 'Marcellus', Georgia, serif;
      letter-spacing: 0.28em;
      font-size: 13px;
      color: #A86B60;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .title {
      font-family: 'Marcellus', Georgia, serif;
      font-size: 28px;
      font-weight: 400;
      margin: 0;
      color: #2B2826;
      line-height: 1.15;
    }
    .subtitle {
      font-size: 12px;
      color: #7D6F6B;
      margin-top: 4px;
      font-weight: 300;
    }
    .meta {
      text-align: right;
      font-size: 12px;
      color: #5A524C;
    }
    .meta strong {
      display: block;
      font-family: 'Marcellus', Georgia, serif;
      font-size: 15px;
      font-weight: 400;
      color: #2B2826;
      margin-bottom: 2px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi {
      background: #FAF8F5;
      border: 1px solid #EFE8E1;
      border-radius: 14px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #7D6F6B;
      font-weight: 600;
    }
    .kpi-val {
      font-family: 'Marcellus', Georgia, serif;
      font-size: 24px;
      margin-top: 4px;
      color: #2B2826;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #7D6F6B;
      padding: 10px 10px;
      border-bottom: 1px solid #EFE8E1;
      background: #FAF8F5;
    }
    td {
      padding: 10px 10px;
      border-bottom: 1px solid #F5EFEA;
      vertical-align: top;
    }
    .pill {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 500;
      border: 1px solid #EFE8E1;
      background: #FAF8F5;
      color: #5A524C;
    }
    .pill-ok { background: #E5EDE6; border-color: #D0DDD1; color: #384C3A; }
    .pill-no { background: #FAF4F3; border-color: #EEDAD6; color: #A86B60; }
    .timeline-row {
      display: flex;
      gap: 18px;
      padding: 12px 0;
      border-bottom: 1px solid #F5EFEA;
      page-break-inside: avoid;
    }
    .timeline-time {
      font-family: 'Marcellus', Georgia, serif;
      font-size: 17px;
      color: #C48B81;
      width: 68px;
      flex-shrink: 0;
    }
    .timeline-title { font-size: 14px; font-weight: 500; color: #2B2826; }
    .timeline-sub { font-size: 11px; color: #7D6F6B; margin-top: 2px; }
    .timeline-notes { font-size: 11px; color: #A86B60; font-style: italic; margin-top: 3px; }
    .svg-box {
      border: 1px solid #EFE8E1;
      border-radius: 18px;
      background: #FCFBF9;
      padding: 12px;
      margin-bottom: 22px;
      text-align: center;
      page-break-inside: avoid;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .table-card {
      border: 1px solid #EFE8E1;
      border-radius: 14px;
      padding: 12px 14px;
      background: #FFFFFF;
      page-break-inside: avoid;
    }
    .table-card-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #FAF8F5;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .table-card-title {
      font-family: 'Marcellus', Georgia, serif;
      font-size: 15px;
      color: #2B2826;
    }
    .table-card-meta { font-size: 10px; color: #7D6F6B; }
    .guest-line {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 3px 0;
      color: #2B2826;
    }
    .footer {
      margin-top: 26px;
      padding-top: 12px;
      border-top: 1px solid #EFE8E1;
      font-size: 10px;
      color: #7D6F6B;
      display: flex;
      justify-content: space-between;
    }
    .print-bar {
      position: fixed;
      top: 14px;
      right: 18px;
      display: flex;
      gap: 8px;
    }
    .print-btn {
      padding: 8px 16px;
      border-radius: 999px;
      border: none;
      background: #C48B81;
      color: white;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }
    @media print {
      body { padding: 0; }
      .print-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">Guardar / Imprimir PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">LAZO</div>
      <h1 class="title">${escapeHtml(title)}</h1>
      <div class="subtitle">${escapeHtml(subtitle)}</div>
    </div>
    <div class="meta">
      <strong>${escapeHtml(couple)}</strong>
      <span>${escapeHtml(metaLine)}</span>
    </div>
  </div>
  ${bodyHtml}
  <div class="footer">
    <span>Generado con Lazo · Planeación de Boda</span>
    <span>${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 350);
    });
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function exportTimelinePdf(profile: WeddingProfile, timeline: TimelineItem[]) {
  const sorted = [...timeline].sort((a, b) => a.time.localeCompare(b.time));
  const rows = sorted.length
    ? sorted
        .map(
          item => `
        <div class="timeline-row">
          <div class="timeline-time">${escapeHtml(item.time)}</div>
          <div style="flex:1">
            <div class="timeline-title">${escapeHtml(item.title)}</div>
            ${item.location ? `<div class="timeline-sub">Lugar: ${escapeHtml(item.location)}</div>` : ''}
            ${item.notes ? `<div class="timeline-notes">${escapeHtml(item.notes)}</div>` : ''}
          </div>
        </div>`
        )
        .join('')
    : '<p style="font-size:12px;color:#7D6F6B;font-style:italic">Sin momentos registrados aún.</p>';

  openPrintablePdf(
    'Itinerario del Gran Día',
    'Minuto a minuto oficial para proveedores, familia y cortejo',
    profile,
    rows
  );
}

export function exportGuestsPdf(profile: WeddingProfile, guests: GuestItem[], tables: TableItem[]) {
  const total = guests.reduce((s, g) => s + g.passes, 0);
  const confirmed = guests.filter(g => g.status === 'Confirmado').reduce((s, g) => s + g.passes, 0);
  const pending = guests.filter(g => g.status === 'Pendiente').reduce((s, g) => s + g.passes, 0);
  const declined = guests.filter(g => g.status === 'No asistirá').reduce((s, g) => s + g.passes, 0);

  const tableMap = new Map(tables.map(t => [t.id, t.name]));

  const kpis = `
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Total Pases</div><div class="kpi-val">${total}</div></div>
      <div class="kpi"><div class="kpi-label">Confirmados</div><div class="kpi-val" style="color:#455C44">${confirmed}</div></div>
      <div class="kpi"><div class="kpi-label">Pendientes</div><div class="kpi-val">${pending}</div></div>
      <div class="kpi"><div class="kpi-label">Declinados</div><div class="kpi-val" style="color:#A86B60">${declined}</div></div>
    </div>`;

  const rows = guests
    .map(g => {
      const pillClass =
        g.status === 'Confirmado' ? 'pill pill-ok' : g.status === 'No asistirá' ? 'pill pill-no' : 'pill';
      const mesa = g.tableId ? tableMap.get(g.tableId) || '—' : 'Sin asignar';
      return `
        <tr>
          <td style="font-weight:500">${escapeHtml(g.name)}</td>
          <td>${g.passes}</td>
          <td><span class="${pillClass}">${escapeHtml(g.status)}</span></td>
          <td>${escapeHtml(mesa)}</td>
          <td>${escapeHtml(g.phone || '—')}</td>
          <td style="color:#5A524C">${escapeHtml(g.dietary || '—')}</td>
        </tr>`;
    })
    .join('');

  const tableHtml = `
    ${kpis}
    <table>
      <thead>
        <tr>
          <th>Invitado</th>
          <th>Lugares</th>
          <th>Estatus</th>
          <th>Mesa</th>
          <th>Teléfono</th>
          <th>Observaciones / Alergias</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6" style="text-align:center;color:#7D6F6B;padding:24px">Sin invitados registrados</td></tr>'}
      </tbody>
    </table>`;

  openPrintablePdf(
    'Lista de Invitados & Restricciones',
    'Control de asistencia, pases, mesas y observaciones alimentarias',
    profile,
    tableHtml
  );
}

function buildFloorPlanSvg(tables: TableItem[], guests: GuestItem[], floorElements: FloorElement[]): string {
  const CANVAS_W = 1400;
  const CANVAS_H = 1000;

  // Compute smart bounding box around all tables & elements so the print fits cleanly with zero clipping
  let minX = CANVAS_W;
  let minY = CANVAS_H;
  let maxX = 0;
  let maxY = 0;

  const includeBounds = (cx: number, cy: number, halfW: number, halfH: number) => {
    minX = Math.min(minX, cx - halfW);
    minY = Math.min(minY, cy - halfH);
    maxX = Math.max(maxX, cx + halfW);
    maxY = Math.max(maxY, cy + halfH);
  };

  floorElements.forEach(el => {
    const diag = Math.hypot(el.width, el.height) / 2;
    const isRotated = (el.rotation || 0) % 180 !== 0;
    includeBounds(el.x, el.y, isRotated ? diag : el.width / 2, isRotated ? diag : el.height / 2);
  });

  tables.forEach((table, idx) => {
    const x = Math.max(70, Math.min(CANVAS_W - 70, typeof table.x === 'number' ? table.x : 140 + (idx % 5) * 210));
    const y = Math.max(70, Math.min(CANVAS_H - 70, typeof table.y === 'number' ? table.y : 120 + (Math.floor(idx / 5) % 5) * 165));
    const sc = typeof table.scale === 'number' ? table.scale : 1;
    const pad = (table.shape === 'Serpentina (S)' ? 145 : 95) * sc;
    includeBounds(x, y, pad, pad);
  });

  const pad = 48;
  const hasItems = floorElements.length > 0 || tables.length > 0;
  const vbX = hasItems ? Math.max(0, Math.floor(minX - pad)) : 0;
  const vbY = hasItems ? Math.max(0, Math.floor(minY - pad)) : 0;
  const vbMaxX = hasItems ? Math.min(CANVAS_W, Math.ceil(maxX + pad)) : CANVAS_W;
  const vbMaxY = hasItems ? Math.min(CANVAS_H, Math.ceil(maxY + pad)) : CANVAS_H;
  const vbW = Math.max(360, vbMaxX - vbX);
  const vbH = Math.max(260, vbMaxY - vbY);

  const elementsSvg = floorElements
    .map(el => {
      const rot = el.rotation || 0;
      const isCircle = el.shape === 'circle';
      let fill = '#FAF3E8';
      let stroke = '#E8D7B8';
      let textColor = '#7C5824';
      let dash = '';
      if (el.type === 'pista') {
        fill = '#F5EFEA';
        stroke = '#D2C2B6';
        textColor = '#7D6F6B';
        dash = 'stroke-dasharray="5 4"';
      } else if (el.type === 'dj') {
        fill = '#2B2826';
        stroke = '#2B2826';
        textColor = '#FFFFFF';
      } else if (el.tone === 'nature') {
        fill = '#E5EDE6';
        stroke = '#BDD4C1';
        textColor = '#354B38';
      } else if (el.tone === 'water') {
        fill = '#EBF4F8';
        stroke = '#C5DCE8';
        textColor = '#355A6E';
      } else if (el.tone === 'accent') {
        fill = '#F7EDEB';
        stroke = '#E6CFCB';
        textColor = '#8F554B';
      } else if (el.tone === 'stone') {
        fill = '#ECECEB';
        stroke = '#CED0CE';
        textColor = '#4D5053';
      }

      const svgStroke =
        el.tone === 'nature'
          ? '#5A7B5E'
          : el.tone === 'water'
          ? '#5B849B'
          : el.tone === 'accent'
          ? '#B87B71'
          : el.tone === 'stone'
          ? '#6D7278'
          : '#6E7A82';
      const svgFill =
        el.tone === 'nature'
          ? 'rgba(229, 237, 230, 0.35)'
          : el.tone === 'water'
          ? 'rgba(235, 244, 248, 0.45)'
          : el.tone === 'accent'
          ? 'rgba(247, 237, 235, 0.45)'
          : el.tone === 'stone'
          ? 'rgba(229, 231, 233, 0.5)'
          : 'rgba(245, 239, 234, 0.35)';

      if (el.shape === 'curve-path') {
        const sx = el.width / 240;
        const sy = el.height / 160;
        return `
          <g transform="translate(${el.x}, ${el.y}) rotate(${rot})">
            <g transform="translate(${-el.width / 2}, ${-el.height / 2}) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})">
              <path d="M 8 88 Q 148 88 148 8 L 228 8 Q 228 148 8 148 Z" fill="${svgFill}" />
              <path d="M 8 88 Q 148 88 148 8" fill="none" stroke="${svgStroke}" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" />
              <path d="M 8 148 Q 228 148 228 8" fill="none" stroke="${svgStroke}" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" />
            </g>
            <text x="0" y="3" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" font-weight="600" letter-spacing="1.2" fill="#5A524C">
              ${escapeHtml(el.label.toUpperCase())}
            </text>
          </g>`;
      }

      if (el.shape === 'arch') {
        const sx = el.width / 200;
        const sy = el.height / 100;
        return `
          <g transform="translate(${el.x}, ${el.y}) rotate(${rot})">
            <g transform="translate(${-el.width / 2}, ${-el.height / 2}) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})">
              <path d="M 8 92 Q 100 -10 192 92" fill="none" stroke="${svgStroke}" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" />
            </g>
            <text x="0" y="3" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" font-weight="600" letter-spacing="1.2" fill="#5A524C">
              ${escapeHtml(el.label.toUpperCase())}
            </text>
          </g>`;
      }

      if (el.shape === 'line') {
        return `
          <g transform="translate(${el.x}, ${el.y}) rotate(${rot})">
            <line x1="${-el.width / 2 + 4}" y1="0" x2="${el.width / 2 - 4}" y2="0" stroke="${svgStroke}" stroke-width="3" stroke-linecap="round" />
            <text x="0" y="-6" text-anchor="middle" font-family="Outfit, sans-serif" font-size="8.5" font-weight="600" letter-spacing="1.2" fill="#5A524C">
              ${escapeHtml(el.label.toUpperCase())}
            </text>
          </g>`;
      }

      if (el.shape === 'ceremony') {
        const sc = Math.min(el.width / 180, el.height / 150);
        const seats = [0, 1, 2, 3]
          .map(row =>
            [0, 1, 2, 3]
              .map(
                col =>
                  `<rect x="${12 + col * 16}" y="${52 + row * 20}" width="11" height="11" rx="2" fill="#FFFFFF" stroke="${svgStroke}" stroke-width="1.3" />` +
                  `<rect x="${106 + col * 16}" y="${52 + row * 20}" width="11" height="11" rx="2" fill="#FFFFFF" stroke="${svgStroke}" stroke-width="1.3" />`
              )
              .join('')
          )
          .join('');
        return `
          <g transform="translate(${el.x}, ${el.y}) rotate(${rot})">
            <g transform="scale(${sc.toFixed(4)}) translate(-90, -75)">
              <rect x="62" y="8" width="56" height="16" rx="3" fill="${svgFill}" stroke="${svgStroke}" stroke-width="1.6" />
              <circle cx="90" cy="34" r="7" fill="none" stroke="${svgStroke}" stroke-width="1.4" />
              ${seats}
            </g>
            <text x="0" y="3" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" font-weight="600" letter-spacing="1.2" fill="#5A524C">
              ${escapeHtml(el.label.toUpperCase())}
            </text>
          </g>`;
      }

      const shapeMarkup = isCircle
        ? `<circle cx="0" cy="0" r="${el.width / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" />`
        : `<rect x="${-el.width / 2}" y="${-el.height / 2}" width="${el.width}" height="${el.height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="1.2" ${dash} />`;

      return `
        <g transform="translate(${el.x}, ${el.y}) rotate(${rot})">
          ${shapeMarkup}
          <text x="0" y="3" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" font-weight="600" letter-spacing="1.2" fill="${textColor}">
            ${escapeHtml(el.label.toUpperCase())}
          </text>
        </g>`;
    })
    .join('');

  const tablesSvg = tables
    .map((table, idx) => {
      const x = Math.max(70, Math.min(CANVAS_W - 70, typeof table.x === 'number' ? table.x : 140 + (idx % 5) * 210));
      const y = Math.max(70, Math.min(CANVAS_H - 70, typeof table.y === 'number' ? table.y : 120 + (Math.floor(idx / 5) % 5) * 165));
      const rot = table.rotation || 0;
      const sc = typeof table.scale === 'number' ? table.scale : 1;
      const cap = Math.max(1, table.capacity);
      const used = guests.filter(g => g.tableId === table.id).reduce((s, g) => s + g.passes, 0);

      if (table.shape === 'Redonda') {
        const chairs = Array.from({ length: cap })
          .map((_, i) => {
            const angle = (i / cap) * Math.PI * 2 - Math.PI / 2;
            const cx = Math.cos(angle) * 50;
            const cy = Math.sin(angle) * 50;
            const filled = i < used;
            return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.2" />`;
          })
          .join('');
        return `
          <g transform="translate(${x}, ${y}) scale(${sc})">
            ${chairs}
            <circle cx="0" cy="0" r="38" fill="#FFFFFF" stroke="#E5DDD5" stroke-width="1.4" />
            <text x="0" y="-2" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9.5" font-weight="500" fill="#2B2826">${escapeHtml(table.name)}</text>
            <text x="0" y="11" text-anchor="middle" font-family="Outfit, sans-serif" font-size="8.5" font-weight="600" fill="#7D6F6B">${used}/${cap}</text>
          </g>`;
      }

      if (table.shape === 'Cuadrada') {
        const base = Math.floor(cap / 4);
        const extra = cap % 4;
        const topCount = base + (extra >= 1 ? 1 : 0);
        const bottomCount = base + (extra >= 2 ? 1 : 0);
        const rightCount = base + (extra >= 3 ? 1 : 0);
        const leftCount = base;
        const maxPerSide = Math.max(2, topCount, bottomCount, rightCount, leftCount);
        const side = Math.max(76, maxPerSide * 28);
        const half = side / 2;

        const topChairs = Array.from({ length: topCount })
          .map((_, i) => {
            const cx = -half + ((i + 0.5) / topCount) * side;
            const filled = i < used;
            return `<rect x="${(cx - 6).toFixed(1)}" y="${(-half - 14).toFixed(1)}" width="12" height="9" rx="4.5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.1" />`;
          })
          .join('');
        const rightChairs = Array.from({ length: rightCount })
          .map((_, i) => {
            const cy = -half + ((i + 0.5) / rightCount) * side;
            const filled = topCount + i < used;
            return `<rect x="${(half + 5).toFixed(1)}" y="${(cy - 6).toFixed(1)}" width="9" height="12" rx="4.5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.1" />`;
          })
          .join('');
        const bottomChairs = Array.from({ length: bottomCount })
          .map((_, i) => {
            const cx = -half + ((i + 0.5) / bottomCount) * side;
            const filled = topCount + rightCount + i < used;
            return `<rect x="${(cx - 6).toFixed(1)}" y="${(half + 5).toFixed(1)}" width="12" height="9" rx="4.5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.1" />`;
          })
          .join('');
        const leftChairs = Array.from({ length: leftCount })
          .map((_, i) => {
            const cy = -half + ((i + 0.5) / leftCount) * side;
            const filled = topCount + rightCount + bottomCount + i < used;
            return `<rect x="${(-half - 14).toFixed(1)}" y="${(cy - 6).toFixed(1)}" width="9" height="12" rx="4.5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.1" />`;
          })
          .join('');

        return `
          <g transform="translate(${x}, ${y}) scale(${sc}) rotate(${rot})">
            ${topChairs}
            ${rightChairs}
            ${bottomChairs}
            ${leftChairs}
            <rect x="${-half}" y="${-half}" width="${side}" height="${side}" rx="11" fill="#FFFFFF" stroke="#E5DDD5" stroke-width="1.4" />
            <g transform="rotate(${-rot})">
              <text x="0" y="-2" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9.5" font-weight="500" fill="#2B2826">${escapeHtml(table.name)}</text>
              <text x="0" y="11" text-anchor="middle" font-family="Outfit, sans-serif" font-size="8.5" font-weight="600" fill="#7D6F6B">${used}/${cap}</text>
            </g>
          </g>`;
      }

      if (table.shape === 'Serpentina (S)') {
        const xSpan = 214;
        const amp = 16;
        const SAMPLES = 60;
        const pts: Array<{ x: number; y: number; nx: number; ny: number; s: number }> = [];
        let totalLen = 0;
        for (let i = 0; i <= SAMPLES; i++) {
          const t = i / SAMPLES;
          const px = -xSpan / 2 + t * xSpan;
          const py = -Math.sin(t * Math.PI * 2) * amp;
          const dx = xSpan;
          const dy = -Math.cos(t * Math.PI * 2) * amp * Math.PI * 2;
          const len = Math.hypot(dx, dy) || 1;
          const nx = dy / len;
          const ny = -dx / len;
          if (i > 0) totalLen += Math.hypot(px - pts[i - 1].x, py - pts[i - 1].y);
          pts.push({ x: px, y: py, nx, ny, s: totalLen });
        }
        const dPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        const atFrac = (u: number) => {
          const target = u * totalLen;
          for (let i = 1; i < pts.length; i++) {
            if (pts[i].s >= target) {
              const seg = pts[i].s - pts[i - 1].s || 1;
              const a = (target - pts[i - 1].s) / seg;
              return {
                x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * a,
                y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * a,
                nx: pts[i - 1].nx + (pts[i].nx - pts[i - 1].nx) * a,
                ny: pts[i - 1].ny + (pts[i].ny - pts[i - 1].ny) * a
              };
            }
          }
          return pts[pts.length - 1];
        };
        const topCount = Math.ceil(cap / 2);
        const bottomCount = cap - topCount;
        const chairOffset = 21;
        const topChairs = Array.from({ length: topCount })
          .map((_, i) => {
            const u = topCount === 1 ? 0.5 : 0.05 + (i / (topCount - 1)) * 0.9;
            const p = atFrac(u);
            const filled = i < used;
            return `<circle cx="${(p.x + p.nx * chairOffset).toFixed(1)}" cy="${(p.y + p.ny * chairOffset).toFixed(1)}" r="5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.2" />`;
          })
          .join('');
        const bottomChairs = Array.from({ length: bottomCount })
          .map((_, i) => {
            const u = bottomCount === 1 ? 0.5 : 0.05 + (i / (bottomCount - 1)) * 0.9;
            const p = atFrac(u);
            const filled = topCount + i < used;
            return `<circle cx="${(p.x - p.nx * chairOffset).toFixed(1)}" cy="${(p.y - p.ny * chairOffset).toFixed(1)}" r="5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.2" />`;
          })
          .join('');
        return `
          <g transform="translate(${x}, ${y}) scale(${sc}) rotate(${rot})">
            <path d="${dPath}" fill="none" stroke="#E5DDD5" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" />
            <path d="${dPath}" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" />
            ${topChairs}
            ${bottomChairs}
            <g transform="rotate(${-rot})">
              <rect x="-36" y="-10" width="72" height="20" rx="10" fill="#FFFFFF" stroke="#EFE8E1" stroke-width="1" />
              <text x="0" y="3" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" font-weight="500" fill="#2B2826">${escapeHtml(table.name)} · ${used}/${cap}</text>
            </g>
          </g>`;
      }

      // Rectangular / Imperial
      const isNovios = cap <= 2;
      const topCount = isNovios ? cap : Math.ceil(cap / 2);
      const bottomCount = isNovios ? 0 : cap - topCount;
      const tw = isNovios ? 92 : Math.max(122, topCount * 24);
      const th = isNovios ? 44 : table.shape === 'Imperial' ? 58 : 50;
      const topChairs = Array.from({ length: topCount })
        .map((_, i) => {
          const cx = -tw / 2 + ((i + 0.5) / topCount) * tw;
          const filled = i < used;
          return `<rect x="${(cx - 6).toFixed(1)}" y="${(-th / 2 - 14).toFixed(1)}" width="12" height="9" rx="4.5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.1" />`;
        })
        .join('');
      const bottomChairs = Array.from({ length: bottomCount })
        .map((_, i) => {
          const cx = -tw / 2 + ((i + 0.5) / bottomCount) * tw;
          const filled = topCount + i < used;
          return `<rect x="${(cx - 6).toFixed(1)}" y="${(th / 2 + 5).toFixed(1)}" width="12" height="9" rx="4.5" fill="${filled ? '#577355' : '#FFFFFF'}" stroke="${filled ? '#455C44' : '#D8CFC8'}" stroke-width="1.1" />`;
        })
        .join('');

      return `
        <g transform="translate(${x}, ${y}) scale(${sc}) rotate(${rot})">
          ${topChairs}
          ${bottomChairs}
          <rect x="${-tw / 2}" y="${-th / 2}" width="${tw}" height="${th}" rx="11" fill="#FFFFFF" stroke="#E5DDD5" stroke-width="1.4" />
          <g transform="rotate(${-rot})">
            <text x="0" y="-2" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9.5" font-weight="500" fill="#2B2826">${escapeHtml(table.name)}</text>
            <text x="0" y="11" text-anchor="middle" font-family="Outfit, sans-serif" font-size="8.5" font-weight="600" fill="#7D6F6B">${used}/${cap}</text>
          </g>
        </g>`;
    })
    .join('');

  return `
    <svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;max-height:520px;display:block;margin:0 auto">
      <defs>
        <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#DDD4CB" />
        </pattern>
      </defs>
      <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" rx="16" fill="#FCFBF9" />
      <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" rx="16" fill="url(#dotGrid)" />
      ${elementsSvg}
      ${tablesSvg}
    </svg>`;
}

export function exportFloorPlanPdf(
  profile: WeddingProfile,
  tables: TableItem[],
  guests: GuestItem[],
  floorElements: FloorElement[]
) {
  const svg = buildFloorPlanSvg(tables, guests, floorElements);

  const cards = tables
    .map(table => {
      const seated = guests.filter(g => g.tableId === table.id);
      const used = seated.reduce((s, g) => s + g.passes, 0);
      const guestLines = seated.length
        ? seated
            .map(
              g => `
            <div class="guest-line">
              <span>${escapeHtml(g.name)}${g.dietary ? ` <em style="color:#A86B60">(${escapeHtml(g.dietary)})</em>` : ''}</span>
              <span style="color:#7D6F6B">${g.passes} ${g.passes === 1 ? 'lugar' : 'lugares'}</span>
            </div>`
            )
            .join('')
        : '<div style="font-size:11px;color:#7D6F6B;font-style:italic">Sin invitados asignados</div>';

      return `
        <div class="table-card">
          <div class="table-card-head">
            <span class="table-card-title">${escapeHtml(table.name)}</span>
            <span class="table-card-meta">${escapeHtml(table.shape)} · ${used}/${table.capacity}</span>
          </div>
          ${guestLines}
        </div>`;
    })
    .join('');

  const body = `
    <div class="svg-box">
      ${svg}
      <div style="margin-top:8px;font-size:10px;color:#7D6F6B;display:flex;justify-content:center;gap:16px">
        <span>● Verde: Lugar ocupado</span>
        <span>○ Blanco: Lugar libre</span>
      </div>
    </div>
    <div class="tables-grid">${cards}</div>`;

  openPrintablePdf(
    'Plano 2D & Distribución de Mesas',
    'Acomodo del salón y listado de invitados por mesa para banquete y coordinación',
    profile,
    body
  );
}

export function exportHandoverPdf(profile: WeddingProfile, items: HandoverItem[]) {
  const receivedCount = items.filter(i => i.receivedByStaff).length;
  const returnedCount = items.filter(i => i.returnedToCouple).length;

  const rows = items.length
    ? items
        .map(
          item => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <div style="font-size:10px;color:#7D6F6B;margin-top:2px">${escapeHtml(item.category)}</div>
          </td>
          <td>
            <div>${escapeHtml(item.qtyDelivered || '1')}</div>
            ${item.deliveredNotes ? `<div style="font-size:10px;color:#7D6F6B;margin-top:2px">${escapeHtml(item.deliveredNotes)}</div>` : ''}
            <div style="font-size:10px;margin-top:3px;color:${item.receivedByStaff ? '#455C44' : '#A86B60'}">
              ${item.receivedByStaff ? '✓ Recibido por coordinación' : '○ Pendiente de entrega'}
            </div>
          </td>
          <td>
            <div>${escapeHtml(item.qtyReturned || (item.returnedToCouple ? 'Devuelto completo' : '—'))}</div>
            ${item.returnedToWhom ? `<div style="font-size:10px;color:#2B2826;margin-top:2px"><strong>A:</strong> ${escapeHtml(item.returnedToWhom)}</div>` : ''}
            ${item.returnNotes ? `<div style="font-size:10px;color:#7D6F6B;margin-top:2px">${escapeHtml(item.returnNotes)}</div>` : ''}
            <div style="font-size:10px;margin-top:3px;color:${item.returnedToCouple ? '#455C44' : '#7D6F6B'}">
              ${item.returnedToCouple ? '✓ Entregado al cierre' : '○ Pendiente de devolución'}
            </div>
          </td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="3" style="text-align:center;color:#7D6F6B;padding:24px">Sin artículos registrados todavía.</td></tr>`;

  const body = `
    <div style="display:flex;gap:12px;margin-bottom:18px">
      <div style="flex:1;border:1px solid #EFE8E1;border-radius:12px;padding:12px 14px;background:#FAF8F5">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:#7D6F6B">Recepción previa</div>
        <div style="font-family:'Marcellus',Georgia,serif;font-size:20px;color:#2B2826;margin-top:2px">${receivedCount} de ${items.length} recibidos</div>
      </div>
      <div style="flex:1;border:1px solid #EFE8E1;border-radius:12px;padding:12px 14px;background:#FAF8F5">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:#7D6F6B">Devolución al cierre</div>
        <div style="font-family:'Marcellus',Georgia,serif;font-size:20px;color:#2B2826;margin-top:2px">${returnedCount} de ${items.length} devueltos</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:30%">Artículo</th>
          <th style="width:35%">Entrega a Coordinación</th>
          <th style="width:35%">Devolución / Sobrante al Cierre</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:42px;page-break-inside:avoid">
      <div style="border-top:1px solid #C48B81;padding-top:8px;text-align:center;font-size:10px;color:#7D6F6B">
        Firma de Conformidad · Recepción previa
      </div>
      <div style="border-top:1px solid #C48B81;padding-top:8px;text-align:center;font-size:10px;color:#7D6F6B">
        Firma de Conformidad · Devolución al cierre del evento
      </div>
    </div>`;

  openPrintablePdf(
    'Control de Artículos & Entregas',
    'Respaldo de recepción previa al evento y devolución de sobrantes al cierre',
    profile,
    body
  );
}
