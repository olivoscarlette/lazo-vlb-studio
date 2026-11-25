import React, { useMemo, useState } from 'react';
import {
  X, Minus, Plus, Lock, Unlock, ArrowLeftRight, RotateCcw, RotateCw, Trash2, UserPlus, Check
} from 'lucide-react';
import { GuestItem, TableItem } from '../types/lazo';

export interface SeatSlotInfo {
  seatIndex: number; // 0-based
  seatKey: string | null; // `${guestId}::${passIndex}`
  guest: GuestItem | null;
  passIndex: number;
  displayName: string;
  initials: string;
  subtitle?: string;
}

export function getGuestInitials(name: string, passIndex = 0): string {
  if (passIndex > 0) return `+${passIndex}`;
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Builds the exact seat-by-seat array (length = table.capacity) for a table.
 * Preserves custom `table.seatAssignments` order while auto-placing any newly
 * assigned guests/passes into the first available empty seats.
 */
export function buildSeatSlots(table: TableItem, seatedGuests: GuestItem[]): SeatSlotInfo[] {
  const cap = Math.max(1, table.capacity || 10);

  // Build lookup of all valid seat tokens for guests currently at this table
  const tokenMap = new Map<string, { guest: GuestItem; passIndex: number }>();
  const orderedTokens: string[] = [];
  for (const g of seatedGuests) {
    const passes = Math.max(1, g.passes || 1);
    for (let p = 0; p < passes; p++) {
      const key = `${g.id}::${p}`;
      tokenMap.set(key, { guest: g, passIndex: p });
      orderedTokens.push(key);
    }
  }

  const slots: Array<string | null> = Array.from({ length: cap }, () => null);
  const placed = new Set<string>();

  // 1. Place explicitly saved seat assignments first
  if (Array.isArray(table.seatAssignments)) {
    for (let i = 0; i < cap; i++) {
      const savedKey = table.seatAssignments[i];
      if (savedKey && tokenMap.has(savedKey) && !placed.has(savedKey)) {
        slots[i] = savedKey;
        placed.add(savedKey);
      }
    }
  }

  // 2. Fill remaining guests/passes into open slots in order
  let cursor = 0;
  for (const key of orderedTokens) {
    if (placed.has(key)) continue;
    while (cursor < cap && slots[cursor] !== null) cursor++;
    if (cursor < cap) {
      slots[cursor] = key;
      placed.add(key);
      cursor++;
    }
  }

  return slots.map((seatKey, seatIndex) => {
    if (!seatKey) {
      return {
        seatIndex,
        seatKey: null,
        guest: null,
        passIndex: 0,
        displayName: 'Lugar disponible',
        initials: String(seatIndex + 1)
      };
    }
    const entry = tokenMap.get(seatKey)!;
    const displayName =
      entry.passIndex === 0
        ? entry.guest.name
        : `Acompañante ${entry.passIndex > 1 ? `${entry.passIndex} ` : ''}de ${entry.guest.name}`;
    return {
      seatIndex,
      seatKey,
      guest: entry.guest,
      passIndex: entry.passIndex,
      displayName,
      initials: getGuestInitials(entry.guest.name, entry.passIndex),
      subtitle: entry.passIndex === 0 ? entry.guest.dietary || undefined : `Pase de ${entry.guest.name}`
    };
  });
}

interface TableSeatModalProps {
  table: TableItem;
  guests: GuestItem[];
  onClose: () => void;
  onUpdateTable: (id: string, patch: Partial<TableItem>) => void;
  onAssignGuest: (guestId: string, tableId: string) => void;
  onDeleteTable: (id: string) => void;
}

export const TableSeatModal: React.FC<TableSeatModalProps> = ({
  table,
  guests,
  onClose,
  onUpdateTable,
  onAssignGuest,
  onDeleteTable
}) => {
  const [selectedSeatIdx, setSelectedSeatIdx] = useState<number | null>(null);
  const [swapFromIdx, setSwapFromIdx] = useState<number | null>(null);
  const [assigningSeatIdx, setAssigningSeatIdx] = useState<number | null>(null);

  const seatedGuests = useMemo(
    () => guests.filter(g => g.tableId === table.id),
    [guests, table.id]
  );
  const unassignedGuests = useMemo(
    () => guests.filter(g => !g.tableId && g.status !== 'No asistirá'),
    [guests]
  );

  const usedSeats = seatedGuests.reduce((s, g) => s + Math.max(1, g.passes || 1), 0);
  const cap = Math.max(1, table.capacity || 10);
  const slots = useMemo(() => buildSeatSlots(table, seatedGuests), [table, seatedGuests]);
  const isRectLike = table.shape === 'Rectangular' || table.shape === 'Imperial';
  const sidesMode: 'both' | 'top' | 'bottom' = table.seatSides || (cap <= 2 ? 'top' : 'both');
  const useHeadSeats = isRectLike && cap >= 6 && table.headSeats !== false && sidesMode === 'both';

  const commitSlotKeys = (nextKeys: Array<string | null>) => {
    onUpdateTable(table.id, { seatAssignments: nextKeys });
  };

  const handleSwapSeats = (idxA: number, idxB: number) => {
    if (idxA === idxB) {
      setSwapFromIdx(null);
      return;
    }
    const nextKeys = slots.map(s => s.seatKey);
    const tmp = nextKeys[idxA];
    nextKeys[idxA] = nextKeys[idxB];
    nextKeys[idxB] = tmp;
    commitSlotKeys(nextKeys);
    setSwapFromIdx(null);
    setSelectedSeatIdx(idxB);
  };

  const handleSeatClick = (idx: number) => {
    if (swapFromIdx !== null) {
      handleSwapSeats(swapFromIdx, idx);
      return;
    }
    setSelectedSeatIdx(idx);
    if (!slots[idx]?.seatKey) {
      setAssigningSeatIdx(idx);
    } else {
      setAssigningSeatIdx(null);
    }
  };

  const handleAssignGuestToSpecificSeat = (guestId: string, targetSeatIdx: number) => {
    if (!guestId) return;
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;
    const passes = Math.max(1, guest.passes || 1);

    // Pre-build seatAssignments placing this guest's pass 0 at targetSeatIdx, and any +1s in nearest empty seats
    const nextKeys = slots.map(s => s.seatKey);
    const guestTokens = Array.from({ length: passes }, (_, p) => `${guest.id}::${p}`);

    if (targetSeatIdx >= 0 && targetSeatIdx < nextKeys.length && !nextKeys[targetSeatIdx]) {
      nextKeys[targetSeatIdx] = guestTokens[0];
    }
    for (let p = 1; p < guestTokens.length; p++) {
      const emptyIdx = nextKeys.findIndex(k => k === null);
      if (emptyIdx !== -1) {
        nextKeys[emptyIdx] = guestTokens[p];
      }
    }

    onAssignGuest(guestId, table.id);
    commitSlotKeys(nextKeys);
    setAssigningSeatIdx(null);
    setSelectedSeatIdx(targetSeatIdx);
  };

  const handleRemoveFromSeat = (slot: SeatSlotInfo) => {
    if (!slot.guest) return;
    // Remove all passes of this guest from this table
    const nextKeys = slots.map(s => (s.guest?.id === slot.guest?.id ? null : s.seatKey));
    commitSlotKeys(nextKeys);
    onAssignGuest(slot.guest.id, '');
  };

  const handleClearTable = () => {
    if (seatedGuests.length === 0) return;
    if (!confirm(`¿Vaciar todos los invitados de ${table.name}?`)) return;
    seatedGuests.forEach(g => onAssignGuest(g.id, ''));
    onUpdateTable(table.id, { seatAssignments: [] });
  };

  // Compute interactive SVG chair coordinates for the enlarged preview (viewBox 340 x 280)
  const previewSeats = useMemo(() => {
    const cx = 170;
    const cy = 140;
    const coords: Array<{ x: number; y: number }> = [];

    if (table.shape === 'Redonda') {
      const r = cap > 12 ? 96 : 84;
      for (let i = 0; i < cap; i++) {
        const angle = (i / cap) * Math.PI * 2 - Math.PI / 2;
        coords.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
      }
      return { coords, body: { kind: 'circle' as const, r: cap > 12 ? 64 : 56 } };
    }

    if (table.shape === 'Cuadrada') {
      const base = Math.floor(cap / 4);
      const extra = cap % 4;
      const topN = base + (extra >= 1 ? 1 : 0);
      const bottomN = base + (extra >= 2 ? 1 : 0);
      const rightN = base + (extra >= 3 ? 1 : 0);
      const leftN = base;
      const side = Math.min(148, Math.max(106, Math.max(topN, rightN) * 34));
      const half = side / 2;
      const offset = 22;

      for (let i = 0; i < topN; i++) {
        coords.push({ x: cx - half + ((i + 0.5) / topN) * side, y: cy - half - offset });
      }
      for (let i = 0; i < rightN; i++) {
        coords.push({ x: cx + half + offset, y: cy - half + ((i + 0.5) / rightN) * side });
      }
      for (let i = 0; i < bottomN; i++) {
        coords.push({ x: cx + half - ((i + 0.5) / bottomN) * side, y: cy + half + offset });
      }
      for (let i = 0; i < leftN; i++) {
        coords.push({ x: cx - half - offset, y: cy + half - ((i + 0.5) / leftN) * side });
      }
      return { coords, body: { kind: 'rect' as const, w: side, h: side } };
    }

    if (table.shape === 'Serpentina (S)') {
      const topN = Math.ceil(cap / 2);
      const bottomN = cap - topN;
      const w = 230;
      for (let i = 0; i < topN; i++) {
        const u = topN === 1 ? 0.5 : i / (topN - 1);
        const x = cx - w / 2 + u * w;
        const y = cy - Math.sin(u * Math.PI * 2) * 18 - 30;
        coords.push({ x, y });
      }
      for (let i = 0; i < bottomN; i++) {
        const u = bottomN === 1 ? 0.5 : i / (bottomN - 1);
        const x = cx - w / 2 + u * w;
        const y = cy - Math.sin(u * Math.PI * 2) * 18 + 30;
        coords.push({ x, y });
      }
      return { coords, body: { kind: 'serpentine' as const } };
    }

    // Rectangular or Imperial (with optional head seats / cabeceras & 1-sided seating)
    const isNovios = cap <= 2;
    const remaining = useHeadSeats ? cap - 2 : cap;
    const topN =
      sidesMode === 'top' ? remaining : sidesMode === 'bottom' ? 0 : Math.ceil(remaining / 2);
    const bottomN =
      sidesMode === 'bottom' ? remaining : sidesMode === 'top' ? 0 : remaining - topN;
    const maxLongSide = Math.max(1, topN, bottomN);
    const w = isNovios ? 140 : Math.min(256, Math.max(150, maxLongSide * 34));
    const h = isNovios ? 64 : table.shape === 'Imperial' ? 84 : 74;
    const halfW = w / 2;
    const halfH = h / 2;
    const offset = 22;

    // Top row (left -> right)
    for (let i = 0; i < topN; i++) {
      coords.push({ x: cx - halfW + ((i + 0.5) / topN) * w, y: cy - halfH - offset });
    }
    // Right head seat (cabecera derecha)
    if (useHeadSeats) {
      coords.push({ x: cx + halfW + offset, y: cy });
    }
    // Bottom row (right -> left for natural clockwise seating)
    for (let i = 0; i < bottomN; i++) {
      coords.push({ x: cx + halfW - ((i + 0.5) / bottomN) * w, y: cy + halfH + offset });
    }
    // Left head seat (cabecera izquierda)
    if (useHeadSeats) {
      coords.push({ x: cx - halfW - offset, y: cy });
    }

    return { coords, body: { kind: 'rect' as const, w, h } };
  }, [table.shape, cap, useHeadSeats, sidesMode]);

  const rot = table.rotation || 0;

  return (
    <div
      className="fixed inset-0 z-[120] bg-[#2B2826]/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl border border-[#EFE8E1] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#FAF8F5] flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#7D6F6B] font-semibold">
              {table.shape} · {usedSeats}/{cap} lugares
            </div>
            <input
              type="text"
              value={table.name}
              onChange={e => onUpdateTable(table.id, { name: e.target.value })}
              className="font-editorial text-2xl text-[#2B2826] bg-transparent border-b border-transparent hover:border-[#EFE8E1] focus:border-[#C48B81] focus:outline-none w-full max-w-sm py-0.5"
              placeholder="Nombre de la mesa..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seating sides toggle for Rectangular / Imperial */}
            {isRectLike && (
              <div className="inline-flex items-center bg-[#FAF8F5] p-0.5 rounded-full border border-[#EFE8E1]">
                {([
                  { id: 'both', label: 'Ambos lados' },
                  { id: 'top', label: 'Arriba' },
                  { id: 'bottom', label: 'Abajo' }
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateTable(table.id, { seatSides: opt.id })}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                      sidesMode === opt.id
                        ? 'bg-[#2B2826] text-white'
                        : 'text-[#7D6F6B] hover:text-[#2B2826]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Cabeceras toggle for Rectangular / Imperial */}
            {isRectLike && cap >= 6 && sidesMode === 'both' && (
              <button
                type="button"
                onClick={() => onUpdateTable(table.id, { headSeats: !useHeadSeats })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                  useHeadSeats
                    ? 'bg-[#F7EDEB] text-[#8E5348] border-[#E5CFCB]'
                    : 'bg-[#FAF8F5] text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                }`}
                title="Activar o desactivar sillas en las cabeceras izquierda y derecha"
              >
                <span>{useHeadSeats ? '✓ Con cabeceras' : 'Sin cabeceras'}</span>
              </button>
            )}

            {/* Lock position toggle */}
            <button
              type="button"
              onClick={() => onUpdateTable(table.id, { locked: !table.locked })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                table.locked
                  ? 'bg-[#2B2826] text-white border-[#2B2826]'
                  : 'bg-[#FAF8F5] text-[#5A524C] border-[#EFE8E1] hover:border-[#C48B81]'
              }`}
              title={table.locked ? 'Desbloquear mesa en el plano' : 'Bloquear posición en el plano'}
            >
              {table.locked ? <Lock className="w-3.5 h-3.5 text-[#C48B81]" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{table.locked ? 'Bloqueada' : 'Bloquear'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#5A524C] flex items-center justify-center transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Enlarged Interactive Table Preview */}
          <div className="lg:col-span-6 bg-[#FAF8F5] rounded-3xl border border-[#EFE8E1] p-4 flex flex-col justify-between min-h-[360px]">
            {/* Top capacity stepper */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#EFE8E1] shadow-2xs">
                <button
                  type="button"
                  onClick={() => onUpdateTable(table.id, { capacity: Math.max(2, cap - 1) })}
                  className="w-6 h-6 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#5A524C] cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-semibold text-[#2B2826] px-1">
                  {cap} sillas
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateTable(table.id, { capacity: Math.min(30, cap + 1) })}
                  className="w-6 h-6 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#5A524C] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {swapFromIdx !== null && (
                <span className="text-[11px] font-medium text-[#8E5348] bg-[#F7EDEB] px-3 py-1 rounded-full border border-[#E5CFCB]">
                  Elige el asiento para intercambiar con #{swapFromIdx + 1}
                </span>
              )}
            </div>

            {/* Enlarged Interactive SVG */}
            <div className="my-2 flex items-center justify-center">
              <svg viewBox="0 0 340 280" className="w-full max-w-[360px] h-auto select-none">
                <g transform={`rotate(${rot} 170 140)`}>
                  {/* Table Body */}
                  {previewSeats.body.kind === 'circle' && (
                    <circle
                      cx={170}
                      cy={140}
                      r={previewSeats.body.r}
                      fill="#FFFFFF"
                      stroke="#E5CFCB"
                      strokeWidth="2"
                    />
                  )}
                  {previewSeats.body.kind === 'rect' && (
                    <rect
                      x={170 - previewSeats.body.w / 2}
                      y={140 - previewSeats.body.h / 2}
                      width={previewSeats.body.w}
                      height={previewSeats.body.h}
                      rx={18}
                      fill="#FFFFFF"
                      stroke="#E5CFCB"
                      strokeWidth="2"
                    />
                  )}
                  {previewSeats.body.kind === 'serpentine' && (
                    <path
                      d="M 55 140 Q 112 104 170 140 T 285 140"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="34"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Center label (counter-rotated so always upright) */}
                  <g transform={`rotate(${-rot} 170 140)`}>
                    <text
                      x={170}
                      y={137}
                      textAnchor="middle"
                      fontFamily="Marcellus, Georgia, serif"
                      fontSize="15"
                      fill="#2B2826"
                    >
                      {table.name}
                    </text>
                    <text
                      x={170}
                      y={154}
                      textAnchor="middle"
                      fontFamily="DM Sans, sans-serif"
                      fontSize="11"
                      fontWeight="600"
                      fill="#7D6F6B"
                    >
                      {usedSeats}/{cap}
                    </text>
                  </g>

                  {/* Clickable Seat Circles */}
                  {slots.map((slot, idx) => {
                    const pos = previewSeats.coords[idx];
                    if (!pos) return null;
                    const occupied = Boolean(slot.seatKey);
                    const isSelectedSeat = selectedSeatIdx === idx;
                    const isSwapSource = swapFromIdx === idx;

                    return (
                      <g
                        key={idx}
                        transform={`translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`}
                        onClick={() => handleSeatClick(idx)}
                        className="cursor-pointer"
                      >
                        <circle
                          r={14}
                          fill={
                            isSwapSource
                              ? '#C48B81'
                              : occupied
                              ? '#E5EDE6'
                              : '#FFFFFF'
                          }
                          stroke={
                            isSwapSource || isSelectedSeat
                              ? '#C48B81'
                              : occupied
                              ? '#577355'
                              : '#D8CFC8'
                          }
                          strokeWidth={isSelectedSeat || isSwapSource ? 2.4 : 1.4}
                        />
                        <text
                          transform={`rotate(${-rot})`}
                          x={0}
                          y={3.5}
                          textAnchor="middle"
                          fontFamily="DM Sans, sans-serif"
                          fontSize="9.5"
                          fontWeight="700"
                          fill={isSwapSource ? '#FFFFFF' : occupied ? '#2E4630' : '#8A7E72'}
                        >
                          {slot.initials}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            {/* Bottom Shape + Rotation Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="inline-flex items-center gap-1 bg-white p-1 rounded-full border border-[#EFE8E1]">
                {(['Redonda', 'Cuadrada', 'Rectangular', 'Imperial'] as TableItem['shape'][]).map(sh => {
                  const active = table.shape === sh;
                  return (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => onUpdateTable(table.id, { shape: sh })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                        active ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
                      }`}
                    >
                      {sh}
                    </button>
                  );
                })}
              </div>

              {table.shape !== 'Redonda' && (
                <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-[#EFE8E1]">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTable(table.id, { rotation: (((rot - 45) % 360) + 360) % 360 })
                    }
                    className="p-1 text-[#5A524C] hover:text-[#2B2826] cursor-pointer"
                    title="Rotar -45°"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-semibold text-[#2B2826] w-8 text-center">
                    {rot}°
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateTable(table.id, { rotation: (rot + 45) % 360 })}
                    className="p-1 text-[#5A524C] hover:text-[#2B2826] cursor-pointer"
                    title="Rotar +45°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Seat-by-Seat List (1 .. capacity) */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B]">
                Asiento por asiento ({usedSeats}/{cap})
              </span>
              {swapFromIdx !== null && (
                <button
                  type="button"
                  onClick={() => setSwapFromIdx(null)}
                  className="text-[11px] text-[#A86B60] hover:underline cursor-pointer"
                >
                  Cancelar intercambio
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[380px]">
              {slots.map((slot, idx) => {
                const occupied = Boolean(slot.seatKey);
                const isSelectedSeat = selectedSeatIdx === idx;
                const isSwapSource = swapFromIdx === idx;
                const isAssigningHere = assigningSeatIdx === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => handleSeatClick(idx)}
                    className={`rounded-2xl px-3.5 py-2.5 border transition cursor-pointer ${
                      isSwapSource
                        ? 'bg-[#F7EDEB] border-[#C48B81]'
                        : isSelectedSeat
                        ? 'bg-[#FAF8F5] border-[#C48B81]'
                        : 'bg-white border-[#EFE8E1] hover:border-[#D8CFC8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            occupied
                              ? 'bg-[#E5EDE6] text-[#2E4630] border border-[#C6D9C8]'
                              : 'bg-[#FAF8F5] text-[#8A7E72] border border-[#EFE8E1]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-medium truncate ${
                              occupied ? 'text-[#2B2826]' : 'text-[#8A7E72] italic font-light'
                            }`}
                          >
                            {slot.displayName}
                          </div>
                          {slot.subtitle && (
                            <div className="text-[10px] text-[#7D6F6B] truncate">{slot.subtitle}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {swapFromIdx !== null && swapFromIdx !== idx ? (
                          <button
                            type="button"
                            onClick={() => handleSwapSeats(swapFromIdx, idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C48B81] text-white text-[11px] font-medium cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mover aquí</span>
                          </button>
                        ) : occupied ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setSwapFromIdx(isSwapSource ? null : idx)}
                              className={`p-1.5 rounded-full transition cursor-pointer ${
                                isSwapSource
                                  ? 'bg-[#C48B81] text-white'
                                  : 'text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5]'
                              }`}
                              title="Intercambiar de asiento"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromSeat(slot)}
                              className="p-1.5 rounded-full text-[#7D6F6B]/60 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Quitar de la mesa"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssigningSeatIdx(isAssigningHere ? null : idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#5A524C] border border-[#EFE8E1] text-[11px] font-medium transition cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3 text-[#C48B81]" />
                            <span>Asignar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline guest picker for this exact seat */}
                    {isAssigningHere && !occupied && (
                      <div className="mt-2.5 pt-2 border-t border-[#EFE8E1]" onClick={e => e.stopPropagation()}>
                        {unassignedGuests.length > 0 ? (
                          <select
                            defaultValue=""
                            onChange={e => {
                              if (e.target.value) {
                                handleAssignGuestToSpecificSeat(e.target.value, idx);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#C48B81] text-xs text-[#2B2826] focus:outline-none cursor-pointer"
                          >
                            <option value="">Selecciona un invitado para el asiento #{idx + 1}...</option>
                            {unassignedGuests.map(g => (
                              <option key={g.id} value={g.id}>
                                {g.name} ({g.passes} {g.passes === 1 ? 'lugar' : 'lugares'})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[11px] text-[#577355] text-center py-1">
                            ✓ Todos los invitados activos ya tienen mesa.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#FAF8F5] bg-[#FAF8F5]/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={handleClearTable}
              disabled={seatedGuests.length === 0}
              className="text-[#7D6F6B] hover:text-[#2B2826] font-medium transition cursor-pointer disabled:opacity-40"
            >
              Vaciar mesa
            </button>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#7D6F6B] font-light">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5EDE6] border border-[#577355]" /> Lugar ocupado
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#D8CFC8]" /> Disponible
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Eliminar ${table.name}?`)) {
                onDeleteTable(table.id);
                onClose();
              }
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
