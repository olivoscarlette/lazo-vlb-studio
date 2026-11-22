import { FloorElement, GuestItem, TableItem, TimelineItem, WeddingProfile } from '../types/lazo';
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
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Prata&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    @page { margin: 16mm; size: auto; }
    body {
      margin: 0;
      padding: 28px 32px;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #2B2826;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
      font-family: 'Prata', Georgia, serif;
      letter-spacing: 0.28em;
      font-size: 13px;
      color: #A86B60;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .title {
      font-family: 'Prata', Georgia, serif;
      font-size: 28px;
      font-weight: 400;
      margin: 0;
      color: #2B2826;
      line-height: 1.15;
    }
    .subtitle {
      font-size: 12px;
      color: #8A7E72;
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
      font-family: 'Prata', Georgia, serif;
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
      color: #8A7E72;
      font-weight: 600;
    }
    .kpi-val {
      font-family: 'Prata', Georgia, serif;
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
      color: #8A7E72;
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
      font-family: 'Prata', Georgia, serif;
      font-size: 17px;
      color: #C48B81;
      width: 68px;
      flex-shrink: 0;
    }
    .timeline-title { font-size: 14px; font-weight: 500; color: #2B2826; }
    .timeline-sub { font-size: 11px; color: #8A7E72; margin-top: 2px; }
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
      font-family: 'Prata', Georgia, serif;
      font-size: 15px;
      color: #2B2826;
    }
    .table-card-meta { font-size: 10px; color: #8A7E72; }
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
      color: #8A7E72;
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
    : '<p style="font-size:12px;color:#8A7E72;font-style:italic">Sin momentos registrados aún.</p>';

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
        ${rows || '<tr><td colspan="6" style="text-align:center;color:#8A7E72;padding:24px">Sin invitados registrados</td></tr>'}
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
  const W = 720;
  const H = 500;

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
      const x = table.x ?? 140 + (idx % 3) * 210;
      const y = table.y ?? 120 + Math.floor(idx / 3) * 165;
      const rot = table.rotation || 0;
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
          <g transform="translate(${x}, ${y})">
            ${chairs}
            <circle cx="0" cy="0" r="38" fill="#FFFFFF" stroke="#E5DDD5" stroke-width="1.4" />
            <text x="0" y="-2" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9.5" font-weight="500" fill="#2B2826">${escapeHtml(table.name)}</text>
            <text x="0" y="11" text-anchor="middle" font-family="Outfit, sans-serif" font-size="8.5" font-weight="600" fill="#8A7E72">${used}/${cap}</text>
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
          <g transform="translate(${x}, ${y}) rotate(${rot})">
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
      const tw = isNovios ? 92 : 122;
      const th = isNovios ? 44 : 52;
      const topCount = isNovios ? cap : Math.ceil(cap / 2);
      const bottomCount = isNovios ? 0 : cap - topCount;
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
        <g transform="translate(${x}, ${y}) rotate(${rot})">
          ${topChairs}
          ${bottomChairs}
          <rect x="${-tw / 2}" y="${-th / 2}" width="${tw}" height="${th}" rx="11" fill="#FFFFFF" stroke="#E5DDD5" stroke-width="1.4" />
          <g transform="rotate(${-rot})">
            <text x="0" y="-2" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9.5" font-weight="500" fill="#2B2826">${escapeHtml(table.name)}</text>
            <text x="0" y="11" text-anchor="middle" font-family="Outfit, sans-serif" font-size="8.5" font-weight="600" fill="#8A7E72">${used}/${cap}</text>
          </g>
        </g>`;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-height:430px;display:block;margin:0 auto">
      <defs>
        <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#DDD4CB" />
        </pattern>
      </defs>
      <rect width="${W}" height="${H}" rx="16" fill="#FCFBF9" />
      <rect width="${W}" height="${H}" rx="16" fill="url(#dotGrid)" />
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
              <span style="color:#8A7E72">${g.passes} ${g.passes === 1 ? 'lugar' : 'lugares'}</span>
            </div>`
            )
            .join('')
        : '<div style="font-size:11px;color:#8A7E72;font-style:italic">Sin invitados asignados</div>';

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
      <div style="margin-top:8px;font-size:10px;color:#8A7E72;display:flex;justify-content:center;gap:16px">
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
