import React, { useEffect, useRef, useState } from 'react';
import {
  RotateCw, Trash2, ZoomIn, ZoomOut, Plus, Minus, Music, Wine, Sparkles, DoorOpen, Users, Shapes,
  MoveDiagonal2, MoveHorizontal, MoveVertical, Upload, Eye, EyeOff, Maximize2, Minimize2, FileImage, Crosshair, Lock
} from 'lucide-react';
import { FloorElement, GuestItem, TableItem } from '../types/lazo';
import { Modal } from './Modal';
import { TableSeatModal, buildSeatSlots } from './TableSeatModal';

interface CustomElementPayload {
  label: string;
  width: number;
  height: number;
  shape?: FloorElement['shape'];
  tone?: FloorElement['tone'];
}

interface SeatingCanvas2DProps {
  weddingId?: string;
  authToken?: string | null;
  eventType?: 'principal' | 'civil';
  floorPlanUrl?: string;
  onFloorPlanChange?: (nextUrl: string) => void;
  floorPlanUrl2?: string;
  onFloorPlan2Change?: (nextUrl: string) => void;
  dualLayout?: 'side-by-side' | 'stacked';
  onDualLayoutChange?: (mode: 'side-by-side' | 'stacked') => void;
  tables: TableItem[];
  guests: GuestItem[];
  floorElements: FloorElement[];
  onMoveTable: (id: string, x: number, y: number) => void;
  onRotateTable: (id: string) => void;
  onUpdateTable: (id: string, patch: Partial<TableItem>) => void;
  onDeleteTable: (id: string) => void;
  onAssignGuest: (guestId: string, tableId: string) => void;
  onAddElement: (type: FloorElement['type'], custom?: CustomElementPayload) => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onResizeElement: (id: string, width: number, height: number) => void;
  onRotateElement: (id: string, rotation: number) => void;
  onDeleteElement: (id: string) => void;
  onOpenNewTable: () => void;
}

const CANVAS_W = 1400;
const CANVAS_H = 1000;

export const SeatingCanvas2D: React.FC<SeatingCanvas2DProps> = ({
  weddingId,
  authToken,
  eventType = 'principal',
  floorPlanUrl = '',
  onFloorPlanChange,
  floorPlanUrl2 = '',
  onFloorPlan2Change,
  dualLayout = 'side-by-side',
  onDualLayoutChange,
  tables,
  guests,
  floorElements,
  onMoveTable,
  onRotateTable,
  onUpdateTable,
  onDeleteTable,
  onAssignGuest,
  onAddElement,
  onMoveElement,
  onResizeElement,
  onRotateElement,
  onDeleteElement,
  onOpenNewTable
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInput2Ref = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [floorPlanOpacity, setFloorPlanOpacity] = useState(0.55);
  const [floorPlanVisible, setFloorPlanVisible] = useState(true);
  const [uploadingFloorPlan, setUploadingFloorPlan] = useState(false);
  const [floorPlanError, setFloorPlanError] = useState<string | null>(null);
  const [panning, setPanning] = useState<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(tables[0]?.id || null);
  const [seatModalTableId, setSeatModalTableId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [customEl, setCustomEl] = useState({
    label: '',
    shape: 'rect' as 'rect' | 'square' | 'circle' | 'curve-path' | 'arch' | 'line' | 'ceremony',
    tone: 'neutral' as NonNullable<FloorElement['tone']>
  });
  const [dragging, setDragging] = useState<{
    kind: 'table' | 'element';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    id: string;
    handle: 'se' | 'e' | 's';
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    rotation: number;
    isCircle: boolean;
  } | null>(null);
  const [rotating, setRotating] = useState<{
    id: string;
    centerX: number;
    centerY: number;
    startPointerX: number;
    startPointerY: number;
    startRotation: number;
    moved: boolean;
  } | null>(null);
  const [scalingTable, setScalingTable] = useState<{
    id: string;
    startX: number;
    startY: number;
    startScale: number;
  } | null>(null);
  const [rotatingTable, setRotatingTable] = useState<{
    id: string;
    centerX: number;
    centerY: number;
    startPointerX: number;
    startPointerY: number;
    startRotation: number;
    moved: boolean;
  } | null>(null);

  const selectedTable = tables.find(t => t.id === selectedTableId) || null;
  const selectedElement = floorElements.find(el => el.id === selectedElementId) || null;
  const unassignedGuests = guests.filter(g => !g.tableId && g.status !== 'No asistirá');
  const totalUnassignedPasses = unassignedGuests.reduce((s, g) => s + g.passes, 0);

  const prevTableCountRef = useRef(tables.length);
  useEffect(() => {
    setSelectedTableId(tables[0]?.id || null);
    setSelectedElementId(null);
    prevTableCountRef.current = tables.length;
  }, [eventType]);

  useEffect(() => {
    if (tables.length > prevTableCountRef.current) {
      const newest = tables[tables.length - 1];
      if (newest) {
        setSelectedTableId(newest.id);
        setSelectedElementId(null);
      }
    }
    prevTableCountRef.current = tables.length;
  }, [tables]);

  const getTableCoords = (t: TableItem, idx: number) => {
    const rawX = typeof t.x === 'number' ? t.x : 140 + (idx % 5) * 210;
    const rawY = typeof t.y === 'number' ? t.y : 120 + (Math.floor(idx / 5) % 5) * 165;
    return {
      x: Math.max(70, Math.min(CANVAS_W - 70, rawX)),
      y: Math.max(70, Math.min(CANVAS_H - 70, rawY))
    };
  };

  const getCanvasPoint = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  const handlePointerDownItem = (
    e: React.PointerEvent,
    kind: 'table' | 'element',
    id: string,
    currX: number,
    currY: number
  ) => {
    e.stopPropagation();
    if (kind === 'table') {
      setSelectedTableId(id);
      setSelectedElementId(null);
      const targetTable = tables.find(t => t.id === id);
      if (targetTable?.locked) return;
    } else {
      setSelectedElementId(id);
      setSelectedTableId(null);
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setDragging({
      kind,
      id,
      offsetX: pt.x - currX,
      offsetY: pt.y - currY
    });
  };

  const handlePointerDownResize = (
    e: React.PointerEvent,
    el: FloorElement,
    handle: 'se' | 'e' | 's'
  ) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setSelectedElementId(el.id);
    setSelectedTableId(null);
    setDragging(null);
    setRotating(null);
    setResizing({
      id: el.id,
      handle,
      startX: pt.x,
      startY: pt.y,
      startW: el.width,
      startH: el.height,
      rotation: el.rotation || 0,
      isCircle: el.shape === 'circle'
    });
  };

  const handlePointerDownRotate = (e: React.PointerEvent, el: FloorElement) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setSelectedElementId(el.id);
    setSelectedTableId(null);
    setDragging(null);
    setResizing(null);
    setRotating({
      id: el.id,
      centerX: el.x,
      centerY: el.y,
      startPointerX: pt.x,
      startPointerY: pt.y,
      startRotation: el.rotation || 0,
      moved: false
    });
  };

  const handlePointerDownTableScale = (e: React.PointerEvent, table: TableItem) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setSelectedTableId(table.id);
    setSelectedElementId(null);
    setDragging(null);
    setRotatingTable(null);
    setScalingTable({
      id: table.id,
      startX: pt.x,
      startY: pt.y,
      startScale: typeof table.scale === 'number' ? table.scale : 1
    });
  };

  const handlePointerDownTableRotate = (e: React.PointerEvent, table: TableItem, cx: number, cy: number) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setSelectedTableId(table.id);
    setSelectedElementId(null);
    setDragging(null);
    setScalingTable(null);
    setRotatingTable({
      id: table.id,
      centerX: cx,
      centerY: cy,
      startPointerX: pt.x,
      startPointerY: pt.y,
      startRotation: table.rotation || 0,
      moved: false
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (rotatingTable) {
      const pt = getCanvasPoint(e);
      const dist = Math.hypot(pt.x - rotatingTable.startPointerX, pt.y - rotatingTable.startPointerY);
      if (dist > 3) {
        if (!rotatingTable.moved) {
          setRotatingTable(prev => (prev ? { ...prev, moved: true } : null));
        }
        let deg = (Math.atan2(pt.y - rotatingTable.centerY, pt.x - rotatingTable.centerX) * 180) / Math.PI + 90;
        deg = ((deg % 360) + 360) % 360;
        const nearest45 = Math.round(deg / 45) * 45;
        if (Math.abs(deg - nearest45) <= 4) {
          deg = nearest45 % 360;
        }
        onUpdateTable(rotatingTable.id, { rotation: Math.round(deg) });
      }
      return;
    }
    if (scalingTable) {
      const pt = getCanvasPoint(e);
      const delta = (pt.x - scalingTable.startX + (pt.y - scalingTable.startY)) / 2;
      const nextScale = Math.max(0.45, Math.min(1.8, Number((scalingTable.startScale + delta / 110).toFixed(2))));
      onUpdateTable(scalingTable.id, { scale: nextScale });
      return;
    }
    if (rotating) {
      const pt = getCanvasPoint(e);
      const dist = Math.hypot(pt.x - rotating.startPointerX, pt.y - rotating.startPointerY);
      if (dist > 3) {
        if (!rotating.moved) {
          setRotating(prev => (prev ? { ...prev, moved: true } : null));
        }
        // Handle sits at top (12 o'clock), so atan2 + 90deg gives natural clockwise angle
        let deg = (Math.atan2(pt.y - rotating.centerY, pt.x - rotating.centerX) * 180) / Math.PI + 90;
        deg = ((deg % 360) + 360) % 360;
        // Soft snap to every 45 degrees within +-4 deg
        const nearest45 = Math.round(deg / 45) * 45;
        if (Math.abs(deg - nearest45) <= 4) {
          deg = nearest45 % 360;
        }
        onRotateElement(rotating.id, deg);
      }
      return;
    }
    if (resizing) {
      const pt = getCanvasPoint(e);
      const rawDx = pt.x - resizing.startX;
      const rawDy = pt.y - resizing.startY;
      const rad = (resizing.rotation * Math.PI) / 180;
      const dx = rawDx * Math.cos(rad) + rawDy * Math.sin(rad);
      const dy = -rawDx * Math.sin(rad) + rawDy * Math.cos(rad);
      if (resizing.isCircle) {
        const delta = resizing.handle === 'e' ? dx : resizing.handle === 's' ? dy : (dx + dy) / 2;
        const nextSize = Math.max(32, Math.min(800, Math.round(resizing.startW + delta * 2)));
        onResizeElement(resizing.id, nextSize, nextSize);
      } else {
        const nextW =
          resizing.handle === 's'
            ? resizing.startW
            : Math.max(24, Math.min(1300, Math.round(resizing.startW + dx * 2)));
        const nextH =
          resizing.handle === 'e'
            ? resizing.startH
            : Math.max(16, Math.min(920, Math.round(resizing.startH + dy * 2)));
        onResizeElement(resizing.id, nextW, nextH);
      }
      return;
    }
    if (!dragging) return;
    const pt = getCanvasPoint(e);
    const nx = Math.max(55, Math.min(CANVAS_W - 55, Math.round(pt.x - dragging.offsetX)));
    const ny = Math.max(45, Math.min(CANVAS_H - 45, Math.round(pt.y - dragging.offsetY)));
    if (dragging.kind === 'table') {
      onMoveTable(dragging.id, nx, ny);
    } else {
      onMoveElement(dragging.id, nx, ny);
    }
  };

  const handlePointerUp = () => {
    if (rotating && !rotating.moved) {
      // Single click on rotate handle rotates by +45°
      onRotateElement(rotating.id, rotating.startRotation + 45);
    }
    if (rotatingTable && !rotatingTable.moved) {
      onUpdateTable(rotatingTable.id, { rotation: (rotatingTable.startRotation + 45) % 360 });
    }
    setDragging(null);
    setResizing(null);
    setRotating(null);
    setScalingTable(null);
    setRotatingTable(null);
    setPanning(null);
  };

  // Pan empty canvas with mouse/trackpad click-and-drag
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (dragging || resizing || rotating || scalingTable || rotatingTable) return;
    const vp = viewportRef.current;
    if (!vp) return;
    setSelectedElementId(null);
    setPanning({
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: vp.scrollLeft,
      scrollTop: vp.scrollTop
    });
  };

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    if (panning && viewportRef.current) {
      const dx = e.clientX - panning.startX;
      const dy = e.clientY - panning.startY;
      viewportRef.current.scrollLeft = panning.scrollLeft - dx;
      viewportRef.current.scrollTop = panning.scrollTop - dy;
      return;
    }
    handlePointerMove(e);
  };

  // Pinch-to-zoom on MacBook trackpad or Ctrl+Wheel (normal two-finger scroll pans natively!)
  const handleViewportWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom(z => Math.max(0.45, Math.min(1.6, Number((z + delta).toFixed(2)))));
    }
  };

  const handleResetView = () => {
    setZoom(0.8);
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  // Upload Venue Floor Plan (PDF or Image) for slot 1 or slot 2
  const handleUploadFloorPlan = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2 = 1) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setFloorPlanError(null);
    setUploadingFloorPlan(true);
    try {
      let uploadBlob: Blob = file;
      let uploadFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        const buffer = await file.arrayBuffer();
        const { convertPdfPageToImage } = await import('../../utils/pdfToImage');
        const result = await convertPdfPageToImage(buffer, 1, 2.0);
        const byteString = atob(result.dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        uploadBlob = new Blob([ab], { type: 'image/png' });
        uploadFilename = file.name.replace(/\.pdf$/i, '') + `_plano${slot === 2 ? '2' : ''}.png`;
      }

      if (weddingId && authToken) {
        const formData = new FormData();
        formData.append('floor_plan_file', uploadBlob, uploadFilename);
        formData.append('event_type', eventType);
        formData.append('slot', String(slot));
        const res = await fetch(`/api/weddings/${weddingId}/floor-plan-file?event_type=${eventType}&slot=${slot}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo subir el plano.');
        if (data.floor_plan_url) {
          if (slot === 2) {
            onFloorPlan2Change?.(data.floor_plan_url);
          } else {
            onFloorPlanChange?.(data.floor_plan_url);
          }
          setFloorPlanVisible(true);
        }
      } else {
        const localUrl = URL.createObjectURL(uploadBlob);
        if (slot === 2) {
          onFloorPlan2Change?.(localUrl);
        } else {
          onFloorPlanChange?.(localUrl);
        }
        setFloorPlanVisible(true);
      }
    } catch (err: any) {
      setFloorPlanError(err?.message || 'Error al procesar el archivo. Intenta con PDF, PNG o JPG.');
    } finally {
      setUploadingFloorPlan(false);
    }
  };

  const handleRemoveFloorPlan = async (slot: 1 | 2 = 1) => {
    const label = slot === 2 ? 'el Plano 2 (Espacio 2)' : 'el Plano 1';
    if (!confirm(`¿Quitar ${label} de fondo? Tus mesas y elementos no se borrarán.`)) return;
    if (weddingId && authToken) {
      try {
        await fetch(`/api/weddings/${weddingId}/floor-plan-file?event_type=${eventType}&slot=${slot}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch {}
    }
    if (slot === 2) {
      onFloorPlan2Change?.('');
    } else {
      onFloorPlanChange?.('');
    }
  };

  // Render chairs around a table in 2D (with initials + optional head seats)
  const renderTableShape = (table: TableItem, usedSeats: number, seatedGuests: GuestItem[]) => {
    const cap = Math.max(1, table.capacity);
    const isSelected = selectedTableId === table.id;
    const isOver = usedSeats > cap;
    const slots = buildSeatSlots(table, seatedGuests);

    if (table.shape === 'Redonda') {
      const tableSize = 76;
      const radius = 52;
      return (
        <div className="relative flex items-center justify-center" style={{ width: 126, height: 126 }}>
          {/* Chairs in a circle with guest initials */}
          {Array.from({ length: cap }).map((_, i) => {
            const angle = (i / cap) * Math.PI * 2 - Math.PI / 2;
            const cx = Math.cos(angle) * radius;
            const cy = Math.sin(angle) * radius;
            const slot = slots[i];
            const filled = Boolean(slot?.seatKey);
            return (
              <span
                key={i}
                style={{
                  transform: `translate(${cx}px, ${cy}px)`
                }}
                className={`absolute w-4 h-4 rounded-full border transition-colors flex items-center justify-center text-[6px] font-bold leading-none ${
                  filled
                    ? 'bg-[#E5EDE6] border-[#577355] text-[#2E4630]'
                    : 'bg-white border-[#D8CFC8] text-transparent'
                }`}
              >
                {filled ? slot.initials : ''}
              </span>
            );
          })}

          {/* Round table surface */}
          <div
            style={{ width: tableSize, height: tableSize }}
            className={`rounded-full flex flex-col items-center justify-center text-center px-1.5 border transition-all shadow-2xs ${
              isSelected
                ? 'bg-white border-[#C48B81] ring-4 ring-[#C48B81]/20'
                : isOver
                ? 'bg-rose-50 border-rose-300'
                : 'bg-white border-[#E5DDD5] hover:border-[#C48B81]/70'
            }`}
          >
            <span className="text-[10px] font-medium text-[#2B2826] leading-tight line-clamp-2">
              {table.name}
            </span>
            <span className={`text-[9px] mt-0.5 font-semibold ${isOver ? 'text-rose-600' : 'text-[#7D6F6B]'}`}>
              {usedSeats}/{cap}
            </span>
          </div>
        </div>
      );
    }

    if (table.shape === 'Serpentina (S)') {
      const rot = table.rotation || 0;
      const isVertical = rot % 180 === 90;
      const svgW = 270;
      const svgH = 116;
      const xStart = 28;
      const xSpan = 214;
      const yMid = 58;
      const amp = 16;

      // Exact shared parametric curve for BOTH tabletop path and chair placement
      const evalPoint = (t: number) => {
        const x = xStart + t * xSpan;
        const y = yMid - Math.sin(t * Math.PI * 2) * amp;
        const dx = xSpan;
        const dy = -Math.cos(t * Math.PI * 2) * amp * Math.PI * 2;
        const len = Math.hypot(dx, dy) || 1;
        // Unit normal pointing "up/outer-top" (negative y)
        const nx = dy / len;
        const ny = -dx / len;
        return { x, y, nx, ny };
      };

      // Build polyline samples + cumulative arc-length for uniform chair spacing
      const SAMPLES = 80;
      const pts: Array<{ x: number; y: number; nx: number; ny: number; s: number }> = [];
      let totalLen = 0;
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        const p = evalPoint(t);
        if (i > 0) {
          totalLen += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
        }
        pts.push({ ...p, s: totalLen });
      }

      const dPath = pts
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');

      // Sample point at uniform arc-length fraction u in [0, 1]
      const pointAtArcFraction = (u: number) => {
        const targetS = u * totalLen;
        for (let i = 1; i < pts.length; i++) {
          if (pts[i].s >= targetS) {
            const seg = pts[i].s - pts[i - 1].s || 1;
            const alpha = (targetS - pts[i - 1].s) / seg;
            return {
              x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * alpha,
              y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * alpha,
              nx: pts[i - 1].nx + (pts[i].nx - pts[i - 1].nx) * alpha,
              ny: pts[i - 1].ny + (pts[i].ny - pts[i - 1].ny) * alpha
            };
          }
        }
        return pts[pts.length - 1];
      };

      const topCount = Math.ceil(cap / 2);
      const bottomCount = cap - topCount;
      const chairOffset = 21; // tabletop half-width is 13px + 3px gap + 5px chair radius

      return (
        <div
          className="relative flex items-center justify-center"
          style={{
            width: isVertical ? svgH : svgW,
            height: isVertical ? svgW : svgH
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: svgW,
              height: svgH,
              transform: `rotate(${rot}deg)`
            }}
          >
            <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
              {/* Selection glow */}
              {isSelected && (
                <path
                  d={dPath}
                  fill="none"
                  stroke="#C48B81"
                  strokeOpacity={0.22}
                  strokeWidth={34}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Outer border of serpentine tabletop (26px) */}
              <path
                d={dPath}
                fill="none"
                stroke={isSelected ? '#C48B81' : isOver ? '#FCA5A5' : '#E5DDD5'}
                strokeWidth={26}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Inner white tabletop (22px) */}
              <path
                d={dPath}
                fill="none"
                stroke={isOver ? '#FFF1F2' : '#FFFFFF'}
                strokeWidth={22}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Top side chairs */}
              {Array.from({ length: topCount }).map((_, i) => {
                const u = topCount === 1 ? 0.5 : 0.05 + (i / (topCount - 1)) * 0.9;
                const p = pointAtArcFraction(u);
                const filled = i < usedSeats;
                return (
                  <circle
                    key={`st_${i}`}
                    cx={p.x + p.nx * chairOffset}
                    cy={p.y + p.ny * chairOffset}
                    r={5}
                    fill={filled ? '#577355' : '#FFFFFF'}
                    stroke={filled ? '#455C44' : '#D8CFC8'}
                    strokeWidth={1.3}
                  />
                );
              })}

              {/* Bottom side chairs */}
              {Array.from({ length: bottomCount }).map((_, i) => {
                const u = bottomCount === 1 ? 0.5 : 0.05 + (i / (bottomCount - 1)) * 0.9;
                const p = pointAtArcFraction(u);
                const filled = topCount + i < usedSeats;
                return (
                  <circle
                    key={`sb_${i}`}
                    cx={p.x - p.nx * chairOffset}
                    cy={p.y - p.ny * chairOffset}
                    r={5}
                    fill={filled ? '#577355' : '#FFFFFF'}
                    stroke={filled ? '#455C44' : '#D8CFC8'}
                    strokeWidth={1.3}
                  />
                );
              })}
            </svg>

            {/* Clean centered label pill */}
            <div
              style={{ transform: `rotate(${-rot}deg)` }}
              className="absolute px-2.5 py-0.5 rounded-full bg-white/95 border border-[#EFE8E1] shadow-2xs flex items-center gap-1.5 pointer-events-none"
            >
              <span className="text-[10px] font-medium text-[#2B2826] whitespace-nowrap">{table.name}</span>
              <span className={`text-[9px] font-semibold ${isOver ? 'text-rose-600' : 'text-[#7D6F6B]'}`}>
                {usedSeats}/{cap}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (table.shape === 'Cuadrada') {
      const rot = table.rotation || 0;
      const base = Math.floor(cap / 4);
      const extra = cap % 4;
      const topCount = base + (extra >= 1 ? 1 : 0);
      const bottomCount = base + (extra >= 2 ? 1 : 0);
      const rightCount = base + (extra >= 3 ? 1 : 0);
      const leftCount = base;
      const maxPerSide = Math.max(2, topCount, bottomCount, rightCount, leftCount);
      const side = Math.max(76, maxPerSide * 28);

      return (
        <div
          className="relative flex items-center justify-center transition-transform"
          style={{ width: side + 38, height: side + 38 }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ transform: `rotate(${rot}deg)` }}
          >
            {/* Top chairs */}
            {topCount > 0 && (
              <div className="absolute -top-4 inset-x-2 flex justify-around">
                {Array.from({ length: topCount }).map((_, i) => (
                  <span
                    key={`sq_t_${i}`}
                    className={`w-3.5 h-2.5 rounded-full border ${
                      i < usedSeats ? 'bg-[#577355] border-[#455C44]' : 'bg-white border-[#D8CFC8]'
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Right chairs */}
            {rightCount > 0 && (
              <div className="absolute -right-4 inset-y-2 flex flex-col justify-around">
                {Array.from({ length: rightCount }).map((_, i) => (
                  <span
                    key={`sq_r_${i}`}
                    className={`w-2.5 h-3.5 rounded-full border ${
                      topCount + i < usedSeats ? 'bg-[#577355] border-[#455C44]' : 'bg-white border-[#D8CFC8]'
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Bottom chairs */}
            {bottomCount > 0 && (
              <div className="absolute -bottom-4 inset-x-2 flex justify-around">
                {Array.from({ length: bottomCount }).map((_, i) => (
                  <span
                    key={`sq_b_${i}`}
                    className={`w-3.5 h-2.5 rounded-full border ${
                      topCount + rightCount + i < usedSeats ? 'bg-[#577355] border-[#455C44]' : 'bg-white border-[#D8CFC8]'
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Left chairs */}
            {leftCount > 0 && (
              <div className="absolute -left-4 inset-y-2 flex flex-col justify-around">
                {Array.from({ length: leftCount }).map((_, i) => (
                  <span
                    key={`sq_l_${i}`}
                    className={`w-2.5 h-3.5 rounded-full border ${
                      topCount + rightCount + bottomCount + i < usedSeats
                        ? 'bg-[#577355] border-[#455C44]'
                        : 'bg-white border-[#D8CFC8]'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Square tabletop */}
            <div
              style={{ width: side, height: side }}
              className={`rounded-xl flex flex-col items-center justify-center text-center px-2 border transition-all shadow-2xs ${
                isSelected
                  ? 'bg-white border-[#C48B81] ring-4 ring-[#C48B81]/20'
                  : isOver
                  ? 'bg-rose-50 border-rose-300'
                  : 'bg-white border-[#E5DDD5] hover:border-[#C48B81]/70'
              }`}
            >
              <div
                className="flex flex-col items-center justify-center leading-tight pointer-events-none"
                style={{ transform: `rotate(${-rot}deg)` }}
              >
                <span className="text-[10px] font-medium text-[#2B2826] whitespace-nowrap">
                  {table.name}
                </span>
                <span className={`text-[9px] font-semibold mt-0.5 ${isOver ? 'text-rose-600' : 'text-[#7D6F6B]'}`}>
                  {usedSeats}/{cap}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Rectangular or Imperial (with optional head seats / cabeceras & 1-sided seating)
    const rot = table.rotation || 0;
    const isVertical = rot % 180 === 90;
    const isNovios = cap <= 2;
    const sidesMode: 'both' | 'top' | 'bottom' = table.seatSides || (isNovios ? 'top' : 'both');
    const useHeadSeats = !isNovios && cap >= 6 && table.headSeats !== false && sidesMode === 'both';
    const remaining = useHeadSeats ? cap - 2 : cap;
    const topCount =
      sidesMode === 'top' ? remaining : sidesMode === 'bottom' ? 0 : Math.ceil(remaining / 2);
    const bottomCount =
      sidesMode === 'bottom' ? remaining : sidesMode === 'top' ? 0 : remaining - topCount;
    const maxLongSide = Math.max(1, topCount, bottomCount);
    const w = isNovios ? 92 : Math.max(126, maxLongSide * 25);
    const h = isNovios ? 44 : table.shape === 'Imperial' ? 58 : 50;

    // Seat indices clockwise: top (0..topCount-1), right head (topCount), bottom (right->left), left head (cap-1)
    const rightHeadIdx = useHeadSeats ? topCount : -1;
    const bottomStartIdx = useHeadSeats ? topCount + 1 : topCount;
    const leftHeadIdx = useHeadSeats ? cap - 1 : -1;

    const renderChairCircle = (slotIdx: number, key: string) => {
      const slot = slots[slotIdx];
      const filled = Boolean(slot?.seatKey);
      return (
        <span
          key={key}
          style={{ transform: `rotate(${-rot}deg)` }}
          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[6px] font-bold leading-none ${
            filled
              ? 'bg-[#E5EDE6] border-[#577355] text-[#2E4630]'
              : 'bg-white border-[#D8CFC8] text-transparent'
          }`}
        >
          {filled ? slot.initials : ''}
        </span>
      );
    };

    return (
      <div
        className="relative flex items-center justify-center transition-transform"
        style={{
          width: isVertical ? h + 44 : w + (useHeadSeats ? 48 : 30),
          height: isVertical ? w + (useHeadSeats ? 48 : 30) : h + 44
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            transform: `rotate(${rot}deg)`
          }}
        >
          {/* Top row chairs */}
          {topCount > 0 && (
            <div className="absolute -top-5 inset-x-2 flex justify-around">
              {Array.from({ length: topCount }).map((_, i) => renderChairCircle(i, `t_${i}`))}
            </div>
          )}

          {/* Right head seat (cabecera derecha) */}
          {useHeadSeats && (
            <div className="absolute -right-5 top-1/2 -translate-y-1/2">
              {renderChairCircle(rightHeadIdx, 'hr')}
            </div>
          )}

          {/* Bottom row chairs */}
          {bottomCount > 0 && (
            <div className="absolute -bottom-5 inset-x-2 flex justify-around">
              {Array.from({ length: bottomCount }).map((_, i) =>
                renderChairCircle(bottomStartIdx + (bottomCount - 1 - i), `b_${i}`)
              )}
            </div>
          )}

          {/* Left head seat (cabecera izquierda) */}
          {useHeadSeats && (
            <div className="absolute -left-5 top-1/2 -translate-y-1/2">
              {renderChairCircle(leftHeadIdx, 'hl')}
            </div>
          )}

          {/* Table rectangle */}
          <div
            style={{ width: w, height: h }}
            className={`rounded-xl flex flex-col items-center justify-center text-center px-2 border transition-all shadow-2xs ${
              isSelected
                ? 'bg-white border-[#C48B81] ring-4 ring-[#C48B81]/20'
                : isOver
                ? 'bg-rose-50 border-rose-300'
                : 'bg-white border-[#E5DDD5] hover:border-[#C48B81]/70'
            }`}
          >
            <div
              className="flex flex-col items-center justify-center leading-tight pointer-events-none"
              style={{ transform: `rotate(${-rot}deg)` }}
            >
              <span className="text-[10px] font-medium text-[#2B2826] whitespace-nowrap">
                {table.name}
              </span>
              <span className={`text-[9px] font-semibold mt-0.5 ${isOver ? 'text-rose-600' : 'text-[#7D6F6B]'}`}>
                {usedSeats}/{cap}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] bg-[#FAF8F5] p-3 sm:p-5 flex flex-col gap-3 overflow-hidden'
          : 'space-y-4'
      }
    >
      {/* Top Studio Toolbar */}
      <div className="bg-white rounded-2xl p-2.5 border border-[#EFE8E1] shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenNewTable}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-[11px] font-medium transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mesa</span>
          </button>
          <button
            type="button"
            onClick={() => onAddElement('pista')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#5A524C] border border-[#EFE8E1] text-[11px] font-medium transition cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#C48B81]" />
            <span>+ Pista</span>
          </button>
          <button
            type="button"
            onClick={() => onAddElement('dj')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#5A524C] border border-[#EFE8E1] text-[11px] font-medium transition cursor-pointer"
          >
            <Music className="w-3 h-3 text-[#C48B81]" />
            <span>+ DJ</span>
          </button>
          <button
            type="button"
            onClick={() => onAddElement('barra')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#5A524C] border border-[#EFE8E1] text-[11px] font-medium transition cursor-pointer"
          >
            <Wine className="w-3 h-3 text-[#C48B81]" />
            <span>+ Barra</span>
          </button>
          <button
            type="button"
            onClick={() => onAddElement('entrada')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#5A524C] border border-[#EFE8E1] text-[11px] font-medium transition cursor-pointer"
          >
            <DoorOpen className="w-3 h-3 text-[#C48B81]" />
            <span>+ Entrada</span>
          </button>
          <button
            type="button"
            onClick={() => setShowOtherModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#D8CFC8] text-[11px] font-medium transition cursor-pointer"
          >
            <Shapes className="w-3 h-3 text-[#C48B81]" />
            <span>+ Otro</span>
          </button>

          {/* Upload Venue Floor Plan 1 (PDF / Image) */}
          <button
            type="button"
            disabled={uploadingFloorPlan}
            onClick={() => floorPlanInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F7EDEB] hover:bg-[#EFE0DC] text-[#8E5348] border border-[#E5CFCB] text-[11px] font-medium transition cursor-pointer disabled:opacity-60"
            title="Sube el plano del Espacio 1 en PDF o imagen para colocar tus mesas encima"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingFloorPlan ? 'Cargando...' : floorPlanUrl ? 'Plano 1' : 'Plano PDF / Img'}</span>
          </button>
          <input
            ref={floorPlanInputRef}
            type="file"
            accept=".pdf,application/pdf,image/*"
            onChange={e => handleUploadFloorPlan(e, 1)}
            className="hidden"
          />

          {/* Upload Venue Floor Plan 2 (Optional Second Space PDF / Image) */}
          {floorPlanUrl && onFloorPlan2Change && (
            <>
              <button
                type="button"
                disabled={uploadingFloorPlan}
                onClick={() => floorPlanInput2Ref.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-[#F7EDEB] text-[#8E5348] border border-[#E5CFCB] text-[11px] font-medium transition cursor-pointer disabled:opacity-60"
                title="Sube un segundo plano PDF o imagen si el lugar tiene 2 espacios"
              >
                <Upload className="w-3 h-3" />
                <span>{floorPlanUrl2 ? 'Plano 2' : '+ Plano 2'}</span>
              </button>
              <input
                ref={floorPlanInput2Ref}
                type="file"
                accept=".pdf,application/pdf,image/*"
                onChange={e => handleUploadFloorPlan(e, 2)}
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Zoom + Unassigned pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] text-[11px] text-[#7D6F6B]">
            <Users className="w-3 h-3 text-[#C48B81]" />
            <span>{totalUnassignedPasses} sin mesa</span>
          </span>

          <div className="inline-flex items-center bg-[#FAF8F5] rounded-full border border-[#EFE8E1] p-0.5">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.45, Number((z - 0.1).toFixed(2))))}
              className="p-1 text-[#7D6F6B] hover:text-[#2B2826] cursor-pointer"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-medium text-[#5A524C]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
              className="p-1 text-[#7D6F6B] hover:text-[#2B2826] cursor-pointer"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 text-[#7D6F6B] hover:text-[#2B2826] border-l border-[#EFE8E1] ml-0.5 pl-1.5 cursor-pointer"
              title="Centrar vista"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium transition cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Expandir plano a pantalla completa'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#C48B81]" />
                <span className="hidden sm:inline">Salir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#C48B81]" />
                <span className="hidden sm:inline">Expandir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {floorPlanError && (
        <div className="px-4 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {floorPlanError}
        </div>
      )}

      {/* Main 2D Canvas + Slim Inspector Split */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] gap-4 ${
          isFullscreen ? 'flex-1 min-h-0 items-stretch' : 'items-start'
        }`}
      >
        {/* 2D Floor Plan Canvas */}
        <div
          className={`bg-white rounded-3xl border border-[#EFE8E1] shadow-2xs overflow-hidden flex flex-col ${
            isFullscreen ? 'h-full min-h-0' : ''
          }`}
        >
          <div className="px-4 py-2.5 border-b border-[#FAF8F5] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7D6F6B] font-light shrink-0">
            <span>Arrastra mesas, mueve el plano con mouse o trackpad (2 dedos)</span>
            <div className="flex items-center gap-3">
              {(floorPlanUrl || floorPlanUrl2) && (
                <div className="flex flex-wrap items-center gap-2 bg-[#FAF8F5] border border-[#EFE8E1] rounded-full px-2.5 py-0.5">
                  <FileImage className="w-3 h-3 text-[#C48B81]" />
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.05}
                    value={floorPlanOpacity}
                    onChange={e => setFloorPlanOpacity(parseFloat(e.target.value))}
                    className="w-16 accent-[#C48B81] cursor-pointer"
                    title="Opacidad de los planos"
                  />
                  {floorPlanUrl && floorPlanUrl2 && onDualLayoutChange && (
                    <button
                      type="button"
                      onClick={() => onDualLayoutChange(dualLayout === 'side-by-side' ? 'stacked' : 'side-by-side')}
                      className="text-[10px] font-medium text-[#5A524C] hover:text-[#2B2826] px-1.5 py-0.5 rounded-full bg-white border border-[#EFE8E1] cursor-pointer"
                      title="Cambiar acomodo de los 2 planos"
                    >
                      {dualLayout === 'side-by-side' ? 'Lado a lado' : 'Arriba / Abajo'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFloorPlanVisible(v => !v)}
                    className="text-[#7D6F6B] hover:text-[#2B2826] cursor-pointer"
                    title={floorPlanVisible ? 'Ocultar planos' : 'Mostrar planos'}
                  >
                    {floorPlanVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {floorPlanUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFloorPlan(1)}
                      className="inline-flex items-center gap-0.5 text-[10px] text-[#7D6F6B] hover:text-rose-600 cursor-pointer"
                      title="Quitar Plano 1"
                    >
                      <Trash2 className="w-3 h-3" />
                      {floorPlanUrl2 && <span>1</span>}
                    </button>
                  )}
                  {floorPlanUrl2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFloorPlan(2)}
                      className="inline-flex items-center gap-0.5 text-[10px] text-[#7D6F6B] hover:text-rose-600 cursor-pointer"
                      title="Quitar Plano 2"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>2</span>
                    </button>
                  )}
                </div>
              )}
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#577355]" /> Ocupado
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#D8CFC8]" /> Libre
              </span>
            </div>
          </div>

          <div
            ref={viewportRef}
            onWheel={handleViewportWheel}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`overflow-auto p-3 bg-[#FAF8F5] ${
              isFullscreen ? 'flex-1 min-h-0' : 'h-[600px] sm:h-[74vh] sm:min-h-[640px]'
            } ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <div
              ref={canvasRef}
              onPointerDown={handleCanvasPointerDown}
              style={{
                width: CANVAS_W * zoom,
                height: CANVAS_H * zoom,
                backgroundImage: 'radial-gradient(#DDD4CB 1px, transparent 1px)',
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`
              }}
              className="relative mx-auto rounded-2xl bg-[#FCFBF9] border border-[#EFE8E1] select-none overflow-hidden"
            >
              <div
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left'
                }}
                className="relative"
              >
                {/* Uploaded Venue Floor Plan Background (1 or 2 spaces: PDF rendered to PNG or Image) */}
                {floorPlanVisible && (floorPlanUrl || floorPlanUrl2) && (
                  floorPlanUrl && floorPlanUrl2 ? (
                    <div
                      style={{ opacity: floorPlanOpacity }}
                      className={`absolute inset-0 w-full h-full grid pointer-events-none select-none z-[1] ${
                        dualLayout === 'stacked' ? 'grid-rows-2' : 'grid-cols-2'
                      }`}
                    >
                      <div
                        className={`relative w-full h-full flex items-center justify-center p-2 ${
                          dualLayout === 'stacked'
                            ? 'border-b border-dashed border-[#D8CFC8]'
                            : 'border-r border-dashed border-[#D8CFC8]'
                        }`}
                      >
                        <img
                          src={floorPlanUrl}
                          alt="Plano base Espacio 1"
                          draggable={false}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="relative w-full h-full flex items-center justify-center p-2">
                        <img
                          src={floorPlanUrl2}
                          alt="Plano base Espacio 2"
                          draggable={false}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={floorPlanUrl || floorPlanUrl2}
                      alt="Plano base del venue"
                      draggable={false}
                      style={{ opacity: floorPlanOpacity }}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-[1]"
                    />
                  )
                )}
                {/* Draggable Floor Elements (Pista, DJ, Barra, Entrada, Otros) */}
                {floorElements.map(el => {
                  const isSel = selectedElementId === el.id;
                  const isSvgShape =
                    el.shape === 'curve-path' ||
                    el.shape === 'arch' ||
                    el.shape === 'line' ||
                    el.shape === 'ceremony';
                  const shapeClass = el.shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
                  const toneClass =
                    el.type === 'pista'
                      ? 'bg-[#F5EFEA]/80 border-dashed border-[#D2C2B6] text-[#7D6F6B]'
                      : el.type === 'dj'
                      ? 'bg-[#2B2826]/90 border-[#2B2826] text-white'
                      : el.tone === 'nature'
                      ? 'bg-[#E5EDE6]/90 border-[#BDD4C1] text-[#354B38]'
                      : el.tone === 'water'
                      ? 'bg-[#EBF4F8]/95 border-[#C5DCE8] text-[#355A6E]'
                      : el.tone === 'accent'
                      ? 'bg-[#F7EDEB]/95 border-[#E6CFCB] text-[#8F554B]'
                      : el.tone === 'stone'
                      ? 'bg-[#ECECEB]/90 border-[#CED0CE] text-[#4D5053]'
                      : 'bg-[#FAF3E8]/90 border-[#E8D7B8] text-[#7C5824]';

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

                  return (
                    <div
                      key={el.id}
                      onPointerDown={e => handlePointerDownItem(e, 'element', el.id, el.x, el.y)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`
                      }}
                      className={`group absolute flex items-center justify-center text-center cursor-grab active:cursor-grabbing transition-shadow ${
                        isSvgShape
                          ? isSel
                            ? 'rounded-xl border border-dashed border-[#C48B81]/80 bg-[#C48B81]/[0.03] z-20'
                            : 'border border-transparent z-[5]'
                          : `${shapeClass} border px-2 ${toneClass} ${
                              isSel ? 'ring-4 ring-[#C48B81]/25 z-20' : 'z-[5]'
                            }`
                      }`}
                    >
                      {el.shape === 'curve-path' && (
                        <svg
                          viewBox="0 0 240 160"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                        >
                          {/* Subtle curved road fill */}
                          <path
                            d="M 8 88 Q 148 88 148 8 L 228 8 Q 228 148 8 148 Z"
                            fill={svgFill}
                          />
                          {/* Inner curve border */}
                          <path
                            d="M 8 88 Q 148 88 148 8"
                            fill="none"
                            stroke={svgStroke}
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                          {/* Outer curve border */}
                          <path
                            d="M 8 148 Q 228 148 228 8"
                            fill="none"
                            stroke={svgStroke}
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      )}

                      {el.shape === 'arch' && (
                        <svg
                          viewBox="0 0 200 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                        >
                          <path
                            d="M 8 92 Q 100 -10 192 92"
                            fill="none"
                            stroke={svgStroke}
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      )}

                      {el.shape === 'line' && (
                        <svg
                          viewBox="0 0 200 24"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                        >
                          <line
                            x1="4"
                            y1="12"
                            x2="196"
                            y2="12"
                            stroke={svgStroke}
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      )}

                      {el.shape === 'ceremony' && (
                        <svg
                          viewBox="0 0 180 150"
                          preserveAspectRatio="xMidYMid meet"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          {/* Altar / Judge table */}
                          <rect x="62" y="8" width="56" height="16" rx="3" fill={svgFill} stroke={svgStroke} strokeWidth="1.6" />
                          <circle cx="90" cy="34" r="7" fill="none" stroke={svgStroke} strokeWidth="1.4" />
                          {/* Left & Right chair blocks (4 rows x 4 seats each side) */}
                          {[0, 1, 2, 3].map(row =>
                            [0, 1, 2, 3].map(col => (
                              <React.Fragment key={`cer_${row}_${col}`}>
                                <rect
                                  x={12 + col * 16}
                                  y={52 + row * 20}
                                  width="11"
                                  height="11"
                                  rx="2"
                                  fill="#FFFFFF"
                                  stroke={svgStroke}
                                  strokeWidth="1.3"
                                />
                                <rect
                                  x={106 + col * 16}
                                  y={52 + row * 20}
                                  width="11"
                                  height="11"
                                  rx="2"
                                  fill="#FFFFFF"
                                  stroke={svgStroke}
                                  strokeWidth="1.3"
                                />
                              </React.Fragment>
                            ))
                          )}
                        </svg>
                      )}

                      <span
                        className={`text-[10px] uppercase tracking-[0.14em] font-semibold pointer-events-none leading-tight ${
                          isSvgShape
                            ? 'relative z-[2] px-2 py-0.5 rounded-full bg-white/85 text-[#5A524C] shadow-2xs'
                            : ''
                        }`}
                      >
                        {el.label}
                      </span>

                      {/* Top-center Rotate Handle (only when selected) */}
                      {isSel && el.shape !== 'circle' && (
                        <>
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-[#C48B81]/70 pointer-events-none" />
                          <button
                            type="button"
                            onPointerDown={e => handlePointerDownRotate(e, el)}
                            onClick={e => e.stopPropagation()}
                            className="absolute -top-9 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-[#C48B81] text-[#A86B60] shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing"
                            title="Arrastra para girar o haz clic para rotar 45°"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      {/* Diagonal Resize Arrow Handle (only when selected) */}
                      {isSel && (
                        <button
                          type="button"
                          onPointerDown={e => handlePointerDownResize(e, el, 'se')}
                          onClick={e => e.stopPropagation()}
                          className="absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border border-[#C48B81] text-[#A86B60] shadow-sm flex items-center justify-center cursor-nwse-resize"
                          title="Arrastra para cambiar tamaño"
                        >
                          <MoveDiagonal2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* Horizontal & Vertical Resize Arrows for non-circle elements when selected */}
                      {isSel && el.shape !== 'circle' && (
                        <>
                          <button
                            type="button"
                            onPointerDown={e => handlePointerDownResize(e, el, 'e')}
                            onClick={e => e.stopPropagation()}
                            className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 rounded-full bg-white border border-[#D8CFC8] hover:border-[#C48B81] text-[#7D6F6B] hover:text-[#A86B60] shadow-sm flex items-center justify-center cursor-ew-resize"
                            title="Arrastra para ajustar ancho"
                          >
                            <MoveHorizontal className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onPointerDown={e => handlePointerDownResize(e, el, 's')}
                            onClick={e => e.stopPropagation()}
                            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-[#D8CFC8] hover:border-[#C48B81] text-[#7D6F6B] hover:text-[#A86B60] shadow-sm flex items-center justify-center cursor-ns-resize"
                            title="Arrastra para ajustar alto"
                          >
                            <MoveVertical className="w-2.5 h-2.5" />
                          </button>
                        </>
                      )}

                      {isSel && (
                        <button
                          type="button"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteElement(el.id);
                            setSelectedElementId(null);
                          }}
                          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border border-[#EFE8E1] text-rose-600 shadow-sm flex items-center justify-center cursor-pointer"
                          title="Quitar elemento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Draggable 2D Tables */}
                {tables.map((table, idx) => {
                  const coords = getTableCoords(table, idx);
                  const seatedHere = guests.filter(g => g.tableId === table.id);
                  const usedSeats = seatedHere.reduce((s, g) => s + g.passes, 0);

                  const tableScale = typeof table.scale === 'number' ? table.scale : 1;
                  const isSelTable = selectedTableId === table.id;
                  const invScale = 1 / Math.max(0.5, tableScale);

                  return (
                    <div
                      key={table.id}
                      onPointerDown={e => handlePointerDownItem(e, 'table', table.id, coords.x, coords.y)}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setSelectedTableId(table.id);
                        setSeatModalTableId(table.id);
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        left: coords.x,
                        top: coords.y,
                        transform: `translate(-50%, -50%) scale(${tableScale})`
                      }}
                      className={`absolute ${table.locked ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${isSelTable ? 'z-20' : 'z-10'}`}
                      title="Doble clic para abrir en grande y asignar asiento por asiento"
                    >
                      {renderTableShape(table, usedSeats, seatedHere)}
                      {table.locked && (
                        <span
                          style={{ transform: `scale(${invScale})` }}
                          className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#2B2826] text-[#C48B81] flex items-center justify-center shadow-sm pointer-events-none"
                        >
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}

                      {/* On-canvas Rotate Handle (top center) */}
                      {isSelTable && table.shape !== 'Redonda' && (
                        <button
                          type="button"
                          onPointerDown={e => handlePointerDownTableRotate(e, table, coords.x, coords.y)}
                          onClick={e => e.stopPropagation()}
                          style={{ transform: `translateX(-50%) scale(${invScale})` }}
                          className="absolute -top-8 left-1/2 w-6 h-6 rounded-full bg-white border border-[#C48B81] text-[#A86B60] shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing"
                          title="Arrastra para rotar libremente o haz clic para girar 45°"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      )}

                      {/* On-canvas Resize/Scale Handle (bottom right) */}
                      {isSelTable && (
                        <button
                          type="button"
                          onPointerDown={e => handlePointerDownTableScale(e, table)}
                          onClick={e => e.stopPropagation()}
                          style={{ transform: `scale(${invScale})` }}
                          className="absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border border-[#C48B81] text-[#A86B60] shadow-sm flex items-center justify-center cursor-nwse-resize"
                          title="Arrastra para cambiar tamaño de la mesa"
                        >
                          <MoveDiagonal2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* On-canvas Delete Handle (top right) */}
                      {isSelTable && (
                        <button
                          type="button"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteTable(table.id);
                            setSelectedTableId(null);
                          }}
                          style={{ transform: `scale(${invScale})` }}
                          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border border-[#EFE8E1] text-rose-600 shadow-sm flex items-center justify-center cursor-pointer"
                          title="Eliminar mesa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Inspector: Selected Table or Floor Element Controls */}
        <div
          className={`bg-white rounded-3xl p-5 border border-[#EFE8E1] shadow-2xs space-y-4 overflow-y-auto ${
            isFullscreen ? 'h-full max-h-full' : 'lg:max-h-[74vh]'
          }`}
        >
          {selectedElement && !selectedTable ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#FAF8F5]">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#C48B81]">
                    Elemento del plano
                  </span>
                  <h4 className="font-editorial text-xl text-[#2B2826] leading-tight">
                    {selectedElement.label}
                  </h4>
                  <span className="text-[11px] text-[#7D6F6B] font-light">
                    Arrastra las flechitas del elemento o ajusta aquí
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteElement(selectedElement.id);
                    setSelectedElementId(null);
                  }}
                  className="p-2 rounded-full text-[#7D6F6B]/50 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Quitar elemento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {selectedElement.shape === 'circle' ? (
                <div className="flex items-center justify-between bg-[#FAF8F5] px-3.5 py-2.5 rounded-2xl border border-[#EFE8E1]">
                  <span className="text-xs font-medium text-[#5A524C]">Tamaño</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResizeElement(selectedElement.id, selectedElement.width - 14, selectedElement.height - 14)}
                      className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-semibold text-[#2B2826] w-10 text-center">
                      {selectedElement.width}
                    </span>
                    <button
                      type="button"
                      onClick={() => onResizeElement(selectedElement.id, selectedElement.width + 14, selectedElement.height + 14)}
                      className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-[#FAF8F5] px-3.5 py-2.5 rounded-2xl border border-[#EFE8E1]">
                    <span className="text-xs font-medium text-[#5A524C]">Ancho</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onResizeElement(selectedElement.id, selectedElement.width - 16, selectedElement.height)}
                        className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold text-[#2B2826] w-10 text-center">
                        {selectedElement.width}
                      </span>
                      <button
                        type="button"
                        onClick={() => onResizeElement(selectedElement.id, selectedElement.width + 16, selectedElement.height)}
                        className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-[#FAF8F5] px-3.5 py-2.5 rounded-2xl border border-[#EFE8E1]">
                    <span className="text-xs font-medium text-[#5A524C]">Alto</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onResizeElement(selectedElement.id, selectedElement.width, selectedElement.height - 14)}
                        className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold text-[#2B2826] w-10 text-center">
                        {selectedElement.height}
                      </span>
                      <button
                        type="button"
                        onClick={() => onResizeElement(selectedElement.id, selectedElement.width, selectedElement.height + 14)}
                        className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-[#FAF8F5] px-3.5 py-2.5 rounded-2xl border border-[#EFE8E1]">
                    <span className="text-xs font-medium text-[#5A524C]">Rotación</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRotateElement(selectedElement.id, (selectedElement.rotation || 0) - 45)}
                        className="px-2 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] text-[11px] font-medium text-[#5A524C] cursor-pointer"
                        title="Girar -45°"
                      >
                        -45°
                      </button>
                      <span className="text-xs font-semibold text-[#2B2826] w-10 text-center">
                        {selectedElement.rotation || 0}°
                      </span>
                      <button
                        type="button"
                        onClick={() => onRotateElement(selectedElement.id, (selectedElement.rotation || 0) + 45)}
                        className="px-2 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] text-[11px] font-medium text-[#5A524C] cursor-pointer"
                        title="Girar +45°"
                      >
                        +45°
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : !selectedTable ? (
            <div className="py-10 text-center space-y-2">
              <p className="font-editorial text-lg text-[#2B2826]">Selecciona una mesa o elemento</p>
              <p className="text-xs text-[#7D6F6B] font-light">
                Haz clic en una mesa para sentar invitados o en un elemento para cambiar su tamaño.
              </p>
            </div>
          ) : (() => {
            const seated = guests.filter(g => g.tableId === selectedTable.id);
            const usedSeats = seated.reduce((s, g) => s + g.passes, 0);
            const isOver = usedSeats > selectedTable.capacity;
            const currentScale = typeof selectedTable.scale === 'number' ? selectedTable.scale : 1;

            return (
              <>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#FAF8F5]">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#C48B81]">
                      {selectedTable.shape}
                    </span>
                    <input
                      type="text"
                      value={selectedTable.name}
                      onChange={e => onUpdateTable(selectedTable.id, { name: e.target.value })}
                      className="block w-full font-editorial text-xl text-[#2B2826] leading-tight bg-transparent border-b border-transparent hover:border-[#EFE8E1] focus:border-[#C48B81] focus:outline-none py-0.5 transition"
                      aria-label="Nombre de la mesa"
                    />
                    <span className={`text-xs font-medium ${isOver ? 'text-rose-600' : 'text-[#577355]'}`}>
                      {usedSeats} de {selectedTable.capacity} lugares ocupados
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {selectedTable.shape !== 'Redonda' && (
                      <button
                        type="button"
                        onClick={() => onRotateTable(selectedTable.id)}
                        className="p-2 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1] transition cursor-pointer"
                        title="Rotar 45°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTable(selectedTable.id);
                        setSelectedTableId(null);
                      }}
                      className="p-2 rounded-full text-[#7D6F6B]/50 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Eliminar mesa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Prominent CTA: Open Big Seat-by-Seat Modal */}
                <button
                  type="button"
                  onClick={() => setSeatModalTableId(selectedTable.id)}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Abrir mesa en grande (asiento por asiento)</span>
                </button>

                {/* Table Design Controls: Shape, Capacity, Size, Rotation */}
                <div className="space-y-2.5 pb-3 border-b border-[#FAF8F5]">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#7D6F6B] font-semibold block mb-1.5">
                      Forma de la mesa
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Redonda', 'Cuadrada', 'Rectangular', 'Imperial', 'Serpentina (S)'] as TableItem['shape'][]).map(shape => {
                        const active = selectedTable.shape === shape;
                        return (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => onUpdateTable(selectedTable.id, { shape })}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition cursor-pointer ${
                              shape === 'Serpentina (S)' ? 'col-span-2' : ''
                            } ${
                              active
                                ? 'bg-[#2B2826] text-white border-[#2B2826]'
                                : 'bg-[#FAF8F5] text-[#5A524C] border-[#EFE8E1] hover:border-[#C48B81]'
                            }`}
                          >
                            {shape === 'Serpentina (S)' ? 'Serpentina (S)' : shape}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#FAF8F5] px-3 py-2 rounded-2xl border border-[#EFE8E1] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#5A524C]">Lugares</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTable(selectedTable.id, {
                              capacity: Math.max(2, (selectedTable.capacity || 10) - 1)
                            })
                          }
                          className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold text-[#2B2826] w-8 text-center">
                          {selectedTable.capacity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTable(selectedTable.id, {
                              capacity: Math.min(30, (selectedTable.capacity || 10) + 1)
                            })
                          }
                          className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[8, 10, 12].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onUpdateTable(selectedTable.id, { capacity: preset })}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                            selectedTable.capacity === preset
                              ? 'bg-[#2B2826] text-white border-[#2B2826]'
                              : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                          }`}
                        >
                          {preset} pers.
                        </button>
                      ))}
                    </div>
                  </div>

                  {(selectedTable.shape === 'Rectangular' || selectedTable.shape === 'Imperial') && (
                    <div className="flex items-center justify-between bg-[#FAF8F5] px-3 py-2 rounded-2xl border border-[#EFE8E1]">
                      <span className="text-xs font-medium text-[#5A524C]">Sillas en</span>
                      <div className="inline-flex items-center bg-white p-0.5 rounded-full border border-[#EFE8E1]">
                        {([
                          { id: 'both', label: 'Ambos' },
                          { id: 'top', label: 'Arriba' },
                          { id: 'bottom', label: 'Abajo' }
                        ] as const).map(opt => {
                          const currentSides =
                            selectedTable.seatSides || (selectedTable.capacity <= 2 ? 'top' : 'both');
                          const active = currentSides === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onUpdateTable(selectedTable.id, { seatSides: opt.id })}
                              className={`px-2 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                                active ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(selectedTable.shape === 'Rectangular' || selectedTable.shape === 'Imperial') &&
                    selectedTable.capacity >= 6 &&
                    (selectedTable.seatSides || 'both') === 'both' && (
                      <div className="flex items-center justify-between bg-[#FAF8F5] px-3 py-2 rounded-2xl border border-[#EFE8E1]">
                        <span className="text-xs font-medium text-[#5A524C]">Cabeceras</span>
                        <div className="inline-flex items-center bg-white p-0.5 rounded-full border border-[#EFE8E1]">
                          <button
                            type="button"
                            onClick={() => onUpdateTable(selectedTable.id, { headSeats: true })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                              selectedTable.headSeats !== false
                                ? 'bg-[#2B2826] text-white'
                                : 'text-[#7D6F6B] hover:text-[#2B2826]'
                            }`}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateTable(selectedTable.id, { headSeats: false })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                              selectedTable.headSeats === false
                                ? 'bg-[#2B2826] text-white'
                                : 'text-[#7D6F6B] hover:text-[#2B2826]'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}

                  <div className="flex items-center justify-between bg-[#FAF8F5] px-3 py-2 rounded-2xl border border-[#EFE8E1]">
                    <span className="text-xs font-medium text-[#5A524C]">Tamaño</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTable(selectedTable.id, {
                            scale: Math.max(0.5, Number((currentScale - 0.1).toFixed(2)))
                          })
                        }
                        className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold text-[#2B2826] w-10 text-center">
                        {Math.round(currentScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTable(selectedTable.id, {
                            scale: Math.min(1.8, Number((currentScale + 0.1).toFixed(2)))
                          })
                        }
                        className="w-7 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] flex items-center justify-center text-[#5A524C] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {selectedTable.shape !== 'Redonda' && (
                    <div className="flex items-center justify-between bg-[#FAF8F5] px-3 py-2 rounded-2xl border border-[#EFE8E1]">
                      <span className="text-xs font-medium text-[#5A524C]">Rotación</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTable(selectedTable.id, {
                              rotation: (((selectedTable.rotation || 0) - 45) % 360 + 360) % 360
                            })
                          }
                          className="px-2 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] text-[11px] font-medium text-[#5A524C] cursor-pointer"
                        >
                          -45°
                        </button>
                        <span className="text-xs font-semibold text-[#2B2826] w-9 text-center">
                          {selectedTable.rotation || 0}°
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTable(selectedTable.id, {
                              rotation: ((selectedTable.rotation || 0) + 45) % 360
                            })
                          }
                          className="px-2 h-7 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] text-[11px] font-medium text-[#5A524C] cursor-pointer"
                        >
                          +45°
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seated Guests */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7D6F6B]">
                    Invitados en esta mesa
                  </span>
                  {seated.length === 0 ? (
                    <p className="text-xs text-[#7D6F6B] italic font-light py-2">
                      Aún no hay invitados sentados aquí.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {seated.map(g => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between text-xs bg-[#FAF8F5] px-3 py-2 rounded-xl border border-[#EFE8E1]/60"
                        >
                          <span className="text-[#2B2826] truncate">
                            {g.name} <span className="text-[#7D6F6B]">({g.passes})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onAssignGuest(g.id, '')}
                            className="text-[11px] text-[#A86B60] hover:underline shrink-0 ml-2 cursor-pointer"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Assign Dropdown */}
                {unassignedGuests.length > 0 ? (
                  <select
                    value=""
                    onChange={e => e.target.value && onAssignGuest(e.target.value, selectedTable.id)}
                    className="w-full px-3.5 py-2.5 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] text-xs text-[#2B2826] cursor-pointer focus:outline-none focus:border-[#C48B81]"
                  >
                    <option value="">+ Sentar invitado en esta mesa...</option>
                    {unassignedGuests.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.passes} {g.passes === 1 ? 'lugar' : 'lugares'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-[#577355] bg-[#E5EDE6]/60 px-3 py-2 rounded-xl text-center">
                    ✓ Todos tus invitados activos ya tienen mesa.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>
      {/* Enlarged Seat-by-Seat Table Modal */}
      {seatModalTableId && (() => {
        const modalTable = tables.find(t => t.id === seatModalTableId);
        if (!modalTable) return null;
        return (
          <TableSeatModal
            table={modalTable}
            guests={guests}
            onClose={() => setSeatModalTableId(null)}
            onUpdateTable={onUpdateTable}
            onAssignGuest={onAssignGuest}
            onDeleteTable={id => {
              onDeleteTable(id);
              setSelectedTableId(null);
            }}
          />
        );
      })()}

      {/* Modal: Agregar Otro Elemento al Plano 2D */}
      <Modal
        isOpen={showOtherModal}
        onClose={() => setShowOtherModal(false)}
        title="Agregar Elemento al Plano"
        subtitle="Elige un elemento rápido o crea uno personalizado."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-5">
          {/* Quick Presets */}
          <div>
            <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] block mb-2">
              Elementos rápidos (1 clic)
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Curvatura / Camino', w: 220, h: 150, shape: 'curve-path' as const, tone: 'neutral' as const },
                { label: 'Arco / Curva', w: 160, h: 72, shape: 'arch' as const, tone: 'neutral' as const },
                { label: 'Muro / Línea', w: 180, h: 24, shape: 'line' as const, tone: 'neutral' as const },
                { label: 'Ceremonia / Civil', w: 170, h: 140, shape: 'ceremony' as const, tone: 'accent' as const },
                { label: 'Stand de Bienvenida', w: 120, h: 42, shape: 'rect' as const, tone: 'accent' as const },
                { label: 'Espejo', w: 72, h: 36, shape: 'rect' as const, tone: 'accent' as const },
                { label: 'Árbol', w: 66, h: 66, shape: 'circle' as const, tone: 'nature' as const },
                { label: 'Jardinera', w: 118, h: 38, shape: 'rect' as const, tone: 'nature' as const },
                { label: 'Alberca', w: 168, h: 92, shape: 'rect' as const, tone: 'water' as const },
                { label: 'Fuente', w: 78, h: 78, shape: 'circle' as const, tone: 'water' as const },
                { label: 'Mesa de Dulces', w: 124, h: 46, shape: 'rect' as const, tone: 'neutral' as const },
                { label: 'Photo Booth', w: 96, h: 68, shape: 'rect' as const, tone: 'accent' as const },
                { label: 'Sala Lounge', w: 126, h: 74, shape: 'rect' as const, tone: 'neutral' as const }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onAddElement('otro', {
                      label: preset.label,
                      width: preset.w,
                      height: preset.h,
                      shape: preset.shape,
                      tone: preset.tone
                    });
                    setShowOtherModal(false);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1] transition cursor-pointer"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Element Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!customEl.label.trim()) return;
              const dims =
                customEl.shape === 'circle'
                  ? { width: 74, height: 74, shape: 'circle' as const }
                  : customEl.shape === 'square'
                  ? { width: 92, height: 92, shape: 'rect' as const }
                  : customEl.shape === 'curve-path'
                  ? { width: 220, height: 150, shape: 'curve-path' as const }
                  : customEl.shape === 'arch'
                  ? { width: 160, height: 72, shape: 'arch' as const }
                  : customEl.shape === 'line'
                  ? { width: 180, height: 24, shape: 'line' as const }
                  : customEl.shape === 'ceremony'
                  ? { width: 170, height: 140, shape: 'ceremony' as const }
                  : { width: 128, height: 48, shape: 'rect' as const };
              onAddElement('otro', {
                label: customEl.label.trim(),
                ...dims,
                tone: customEl.tone
              });
              setCustomEl({ label: '', shape: 'rect', tone: 'neutral' });
              setShowOtherModal(false);
            }}
            className="pt-4 border-t border-[#FAF8F5] space-y-3"
          >
            <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] block">
              O crea uno personalizado
            </span>
            <input
              type="text"
              required
              placeholder="Ej. Carrito de Shots, Arco Floral, Baños..."
              value={customEl.label}
              onChange={e => setCustomEl({ ...customEl, label: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#7D6F6B] block mb-1">Forma</label>
                <select
                  value={customEl.shape}
                  onChange={e => setCustomEl({ ...customEl, shape: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
                >
                  <option value="rect">Rectangular</option>
                  <option value="square">Cuadrado</option>
                  <option value="circle">Circular</option>
                  <option value="curve-path">Curvatura / Camino curvo</option>
                  <option value="arch">Arco / Curva simple</option>
                  <option value="line">Línea / Muro recto</option>
                  <option value="ceremony">Ceremonia / Sillas</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#7D6F6B] block mb-1">Estilo / Color</label>
                <select
                  value={customEl.tone}
                  onChange={e => setCustomEl({ ...customEl, tone: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
                >
                  <option value="neutral">Arena / Neutro</option>
                  <option value="stone">Gris Claro / Construcción</option>
                  <option value="nature">Verde Jardín / Árbol</option>
                  <option value="water">Azul Agua / Alberca</option>
                  <option value="accent">Rosa Empolvado</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOtherModal(false)}
                className="px-4 py-2 text-xs text-[#7D6F6B] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium cursor-pointer"
              >
                Agregar al Plano
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
