import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { Table, LayoutElement, LayoutVersion, Guest } from '../types';
import {
  Plus, RotateCw, Trash2, Save,
  Lock, AlertTriangle, Move, Eye, EyeOff, Layers, Image as ImageIcon,
  FileUp, Loader2, ChevronLeft, ChevronRight, CheckCircle2, X, FileDown, MessageSquare,
  Search, HelpCircle, RotateCcw, LayoutGrid, Compass, Sliders, Users, Settings2
} from 'lucide-react';

const GROUP_PALETTES = [
  { bg: '#EBF3EC', border: '#D6E6D8', text: '#2B2826', tagBg: '#DCEBDE', tagText: '#2B5235' }, // Sage green
  { bg: '#F4EEF8', border: '#E8DEF0', text: '#2B2826', tagBg: '#E9DDF0', tagText: '#5E3E73' }, // Lavender
  { bg: '#FDF2EC', border: '#F8E2D6', text: '#2B2826', tagBg: '#FCE4D6', tagText: '#874D38' }, // Peach terracotta
  { bg: '#FCF8EC', border: '#F6EFCB', text: '#2B2826', tagBg: '#F8EEBD', tagText: '#6E5C23' }, // Primrose
  { bg: '#FCEEF2', border: '#F7DBE3', text: '#2B2826', tagBg: '#F9DCE5', tagText: '#7D374B' }, // Blush rose
  { bg: '#EFF6FC', border: '#D9EAF7', text: '#2B2826', tagBg: '#D8EBF9', tagText: '#2A5578' }, // Sky blue
  { bg: '#F7F4EF', border: '#EAE2D5', text: '#2B2826', tagBg: '#EFE5D7', tagText: '#544A3F' }  // Warm taupe
];

export interface TableSeatsDistribution {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const getTableSeatsDistribution = (table: {
  type: string;
  capacity?: number;
  seats_distribution?: string;
}): TableSeatsDistribution => {
  if (table.seats_distribution) {
    try {
      const parsed = JSON.parse(table.seats_distribution);
      if (
        typeof parsed.top === 'number' &&
        typeof parsed.bottom === 'number' &&
        typeof parsed.left === 'number' &&
        typeof parsed.right === 'number'
      ) {
        return parsed;
      }
    } catch {}
  }

  const cap = Math.max(1, table.capacity || 10);
  if (table.type === 'circular') {
    return { top: cap, bottom: 0, left: 0, right: 0 };
  }

  // Cuadrada default: 8 a 10 personas (o simétrica en los 4 lados)
  if (table.type === 'cuadrada') {
    if (cap === 8) {
      return { top: 2, bottom: 2, left: 2, right: 2 };
    } else if (cap === 10) {
      return { top: 3, bottom: 3, left: 2, right: 2 };
    } else {
      const base = Math.floor(cap / 4);
      const rem = cap % 4;
      return {
        top: base + (rem > 0 ? 1 : 0),
        bottom: base + (rem > 2 ? 1 : 0),
        left: base + (rem > 1 ? 1 : 0),
        right: base
      };
    }
  }

  // Rectangular / Imperial default: 1 on each head (cabeceras) if capacity >= 6
  if (cap >= 6) {
    const remaining = cap - 2;
    const top = Math.ceil(remaining / 2);
    const bottom = Math.floor(remaining / 2);
    return { top, bottom, left: 1, right: 1 };
  } else if (cap >= 4) {
    return { top: 1, bottom: 1, left: 1, right: 1 };
  } else {
    return { top: cap, bottom: 0, left: 0, right: 0 };
  }
};

export const MesasLayoutModule: React.FC = () => {
  const { currentWedding, token, user, refreshWedding } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [, setVersions] = useState<LayoutVersion[]>([]);
  const [, setLoading] = useState(true);

  // View switch: 'lista' (first) vs 'mapa' (second)
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('lista');

  // Sidebar controls
  const [colorGroups, setColorGroups] = useState(true);
  const [filterOnlyUnassigned, setFilterOnlyUnassigned] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [infoGuestId, setInfoGuestId] = useState<string | null>(null);

  // Quick Assignment Popover
  const [assigningGuest, setAssigningGuest] = useState<Guest | null>(null);
  const [tableSearchInPopover, setTableSearchInPopover] = useState('');

  // Canvas State & Zoom
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [handToolActive, setHandToolActive] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Selected table on canvas (for interactive resize & inspector)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Dragging state on canvas (moving items)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'table' | 'element' | null>(null);

  // Resizing state for tables
  const [resizingTableId, setResizingTableId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ mouseX: 0, mouseY: 0, width: 120, height: 120 });

  // Reference Venue Floor Plan (PDF & Images)
  const [floorPlanUrl, setFloorPlanUrl] = useState<string>(currentWedding?.floor_plan_url || '');
  const [floorPlanOpacity, setFloorPlanOpacity] = useState<number>(0.4);
  const [floorPlanVisible, setFloorPlanVisible] = useState<boolean>(true);
  const [floorPlanFitMode, setFloorPlanFitMode] = useState<'contain' | 'cover'>('contain');
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const [floorPlanProcessing, setFloorPlanProcessing] = useState(false);
  const [floorPlanPageCount, setFloorPlanPageCount] = useState(1);
  const [floorPlanSelectedPage, setFloorPlanSelectedPage] = useState(1);
  const [floorPlanPdfBuffer, setFloorPlanPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [floorPlanFilename, setFloorPlanFilename] = useState<string>('');
  const [uploadingFloorPlan, setUploadingFloorPlan] = useState(false);
  const [floorPlanError, setFloorPlanError] = useState<string | null>(null);
  const [floorPlanPendingBlob, setFloorPlanPendingBlob] = useState<Blob | null>(null);

  // Modals
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [newTableData, setNewTableData] = useState({
    name: '',
    type: 'circular' as 'circular' | 'rectangular' | 'imperial' | 'cuadrada',
    capacity: 10
  });

  const [showNewElementModal, setShowNewElementModal] = useState(false);
  const [newElementData, setNewElementData] = useState({
    name: 'Pista de Baile',
    type: 'pista_baile' as LayoutElement['type'],
    width: 220,
    height: 180
  });

  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Permissions & 2D Lock
  const isNovios = user?.role === 'NOVIOS';
  const isPlannerVirtual = Boolean(
    currentWedding?.package_type &&
    (currentWedding.package_type.toLowerCase().includes('virtual') ||
     currentWedding.package_type.toLowerCase().includes('autónomo'))
  );
  const hasLayout2dAddon = Boolean(currentWedding?.has_layout_2d);
  const isLockedForVirtualNovios = isNovios && isPlannerVirtual && !hasLayout2dAddon;
  const isLocked = false;

  const layoutUpgradeWhatsAppUrl =
    'https://wa.me/528128663440?text=' +
    encodeURIComponent(`¡Hola Lazo Studio! Soy cliente de Lazo Studio (${currentWedding?.name || 'mi evento'}) y me gustaría cotizar la activación del Croquis 2D y diseño de layout.`);

  // PDF Export
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const weddingName = currentWedding?.name || 'Boda';
      const cleanFileName = `Layout_Mesas_${weddingName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_')}.pdf`;
      const primaryColor: [number, number, number] = [43, 40, 38];
      const accentColor: [number, number, number] = [196, 139, 129];
      const secondaryColor: [number, number, number] = [125, 111, 107];
      const borderColor: [number, number, number] = [239, 232, 225];

      const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
      const totalAssigned = tables.reduce((acc, t) => acc + (t.used_seats || (t.guests?.length || 0)), 0);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - (margin * 2);
      let currentY = 16;

      const renderHeader = () => {
        doc.setFillColor(250, 247, 245);
        doc.roundedRect(margin, 12, contentWidth, 34, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...accentColor);
        doc.text(isPlannerVirtual ? 'LAZO STUDIO' : 'LAZO STUDIO  ·  VIVA LA BRIDE', margin + 6, 20);
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.text('DISTRIBUCIÓN DE MESAS Y LAYOUT', margin + 6, 28);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...secondaryColor);
        const metaLine = `${weddingName}   |   ${tables.length} Mesas   |   ${totalCapacity} Lugares   |   ${totalAssigned} Asignados`;
        doc.text(metaLine, margin + 6, 36);
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(0.5);
        doc.line(margin + 6, 40, margin + contentWidth - 6, 40);
        currentY = 52;
      };

      const renderFooter = (pageNumber: number) => {
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...secondaryColor);
        doc.text(
          isPlannerVirtual
            ? 'Documento oficial de distribución de mesas  ·  Lazo Studio'
            : 'Documento oficial de coordinación  ·  Viva la Bride',
          margin,
          pageHeight - 7
        );
        doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      };

      let pageCount = 1;
      renderHeader();

      // Summary
      doc.setFillColor(254, 252, 250);
      doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'D');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(`Total Mesas: ${tables.length}`, margin + 6, currentY + 9);
      doc.text(`Capacidad Total: ${totalCapacity} pax`, margin + 48, currentY + 9);
      doc.text(`Invitados Sentados: ${totalAssigned}`, margin + 100, currentY + 9);
      doc.text(`Sin Asignar: ${unassignedGuests.length}`, margin + 145, currentY + 9);
      currentY += 20;

      // Tables
      tables.forEach(table => {
        const assignedGuests = table.guests || [];
        const neededHeight = 16 + Math.ceil(assignedGuests.length / 2) * 6;
        if (currentY + neededHeight > pageHeight - 24) {
          renderFooter(pageCount);
          doc.addPage();
          pageCount++;
          renderHeader();
        }

        doc.setFillColor(242, 237, 233);
        doc.roundedRect(margin, currentY, contentWidth, 8, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.text(`${table.name.toUpperCase()}  (${table.type})`, margin + 4, currentY + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...secondaryColor);
        doc.text(`Capacidad: ${table.capacity}  |  Ocupados: ${table.used_seats || assignedGuests.length}`, margin + contentWidth - 4, currentY + 5.5, { align: 'right' });
        currentY += 10;

        if (assignedGuests.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(...secondaryColor);
          doc.text('Sin invitados asignados en esta mesa.', margin + 4, currentY + 4);
          currentY += 8;
        } else {
          for (let i = 0; i < assignedGuests.length; i += 2) {
            const g1 = assignedGuests[i];
            const g2 = assignedGuests[i + 1];
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...primaryColor);
            const g1Text = `• ${g1.first_name} ${g1.last_name || ''}${g1.companion_count ? ` (+${g1.companion_count})` : ''}`;
            doc.text(doc.splitTextToSize(g1Text, (contentWidth / 2) - 8)[0] || '', margin + 4, currentY + 4);
            if (g2) {
              const g2Text = `• ${g2.first_name} ${g2.last_name || ''}${g2.companion_count ? ` (+${g2.companion_count})` : ''}`;
              doc.text(doc.splitTextToSize(g2Text, (contentWidth / 2) - 8)[0] || '', margin + (contentWidth / 2) + 4, currentY + 4);
            }
            currentY += 5;
          }
          currentY += 4;
        }
      });

      renderFooter(pageCount);
      doc.save(cleanFileName);
    } catch (err) {
      console.error('Error generating layout PDF:', err);
    }
  };

  const fetchLayoutData = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/tables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        setElements(data.elements || []);
        setUnassignedGuests(data.unassignedGuests || []);
        setAllGuests(data.allGuests || []);
      }
    } catch (err) {
      console.error('Error fetching layout:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/tables/versions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch {}
  };

  useEffect(() => {
    setFloorPlanUrl(currentWedding?.floor_plan_url || '');
    fetchLayoutData();
    fetchVersions();
  }, [currentWedding, token]);

  useEffect(() => {
    if (selectedTable) {
      const updated = tables.find(t => t.id === selectedTable.id);
      if (updated) setSelectedTable(updated);
      else setSelectedTable(null);
    }
  }, [tables]);

  // Dragging handlers for canvas items
  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'table' | 'element') => {
    if (isLocked || handToolActive || resizingTableId) return;
    e.stopPropagation();
    setDraggingId(id);
    setDragType(type);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) / zoomLevel,
      y: (e.clientY - rect.top) / zoomLevel
    });
  };

  // Resize handler start
  const handleResizeMouseDown = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingTableId(table.id);
    const currentW = table.width || (table.type === 'imperial' ? 190 : table.type === 'rectangular' ? 160 : table.type === 'cuadrada' ? 130 : 120);
    const currentH = table.height || (table.type === 'imperial' ? 95 : table.type === 'rectangular' ? 95 : table.type === 'cuadrada' ? 130 : 120);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: currentW,
      height: currentH
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Pan mode
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    // 2. Interactive table resizing
    if (resizingTableId) {
      const dx = (e.clientX - resizeStart.mouseX) / zoomLevel;
      const dy = (e.clientY - resizeStart.mouseY) / zoomLevel;

      setTables(prev => prev.map(t => {
        if (t.id !== resizingTableId) return t;
        if (t.type === 'circular' || t.type === 'cuadrada') {
          const delta = (dx + dy) / 2;
          const minDim = t.type === 'cuadrada' ? 70 : 50;
          const newDim = Math.max(minDim, Math.min(260, Math.round(resizeStart.width + delta)));
          return { ...t, width: newDim, height: newDim };
        } else {
          const newW = Math.max(70, Math.min(360, Math.round(resizeStart.width + dx)));
          const newH = Math.max(45, Math.min(260, Math.round(resizeStart.height + dy)));
          return { ...t, width: newW, height: newH };
        }
      }));
      return;
    }

    // 3. Moving items
    if (!draggingId || !dragType || isLocked) return;
    const canvas = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(10, (e.clientX - canvas.left - panOffset.x) / zoomLevel - dragOffset.x);
    const newY = Math.max(10, (e.clientY - canvas.top - panOffset.y) / zoomLevel - dragOffset.y);

    if (dragType === 'table') {
      setTables(prev => prev.map(t => t.id === draggingId ? { ...t, x: Math.round(newX), y: Math.round(newY) } : t));
    } else {
      setElements(prev => prev.map(el => el.id === draggingId ? { ...el, x: Math.round(newX), y: Math.round(newY) } : el));
    }
  };

  const handleMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Finished resizing table
    if (resizingTableId) {
      const targetId = resizingTableId;
      setResizingTableId(null);
      const table = tables.find(t => t.id === targetId);
      if (table && currentWedding) {
        try {
          await fetch(`/api/weddings/${currentWedding.id}/tables/${table.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ width: table.width, height: table.height })
          });
        } catch (err) {
          console.error('Error saving table size:', err);
        }
      }
      return;
    }

    // Finished moving item
    if (!draggingId || !dragType || isLocked) {
      setDraggingId(null);
      setDragType(null);
      return;
    }

    const currentId = draggingId;
    const type = dragType;
    setDraggingId(null);
    setDragType(null);

    try {
      if (type === 'table') {
        const table = tables.find(t => t.id === currentId);
        if (table) {
          await fetch(`/api/weddings/${currentWedding!.id}/tables/${currentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ x: table.x, y: table.y })
          });
        }
      } else {
        const element = elements.find(el => el.id === currentId);
        if (element) {
          await fetch(`/api/weddings/${currentWedding!.id}/tables/elements/${currentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ x: element.x, y: element.y })
          });
        }
      }
    } catch (err) {
      console.error('Error saving position:', err);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (handToolActive || e.button === 1) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
    } else {
      setSelectedTable(null);
    }
  };

  // Modify Table Size directly via Inspector
  const handleUpdateTableSize = async (tableId: string, width: number, height: number) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, width, height } : t));
    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? { ...prev, width, height } : null);
    }
    if (!currentWedding) return;
    try {
      await fetch(`/api/weddings/${currentWedding.id}/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ width, height })
      });
    } catch {}
  };

  // Modify Seats Distribution (Cabeceras y lados)
  const handleUpdateSeatsDistribution = async (
    tableId: string,
    newDist: { top: number; bottom: number; left: number; right: number }
  ) => {
    const top = Math.max(0, newDist.top);
    const bottom = Math.max(0, newDist.bottom);
    const left = Math.max(0, newDist.left);
    const right = Math.max(0, newDist.right);
    const newCapacity = top + bottom + left + right;
    const distStr = JSON.stringify({ top, bottom, left, right });

    setTables(prev =>
      prev.map(t =>
        t.id === tableId
          ? {
              ...t,
              capacity: newCapacity,
              seats_distribution: distStr,
              available_seats: Math.max(0, newCapacity - (t.used_seats || 0))
            }
          : t
      )
    );

    if (selectedTable?.id === tableId) {
      setSelectedTable(prev =>
        prev
          ? {
              ...prev,
              capacity: newCapacity,
              seats_distribution: distStr,
              available_seats: Math.max(0, newCapacity - (prev.used_seats || 0))
            }
          : null
      );
    }

    if (!currentWedding) return;
    try {
      await fetch(`/api/weddings/${currentWedding.id}/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          capacity: newCapacity,
          seats_distribution: distStr
        })
      });
    } catch (err) {
      console.error('Error al actualizar distribución de sillas:', err);
    }
  };

  // Auto-Acomodo (Neat symmetrical layout)
  const handleAutoArrange = async () => {
    if (!currentWedding || !token || tables.length === 0) return;
    const danceFloor = elements.find(el => el.type === 'pista_baile');
    const centerX = 420;
    const centerY = 270;

    let updatedElements = [...elements];
    if (danceFloor) {
      updatedElements = elements.map(el =>
        el.id === danceFloor.id ? { ...el, x: centerX - (el.width || 220) / 2, y: centerY - (el.height || 180) / 2 } : el
      );
      setElements(updatedElements);
      try {
        await fetch(`/api/weddings/${currentWedding.id}/tables/elements/${danceFloor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ x: centerX - (danceFloor.width || 220) / 2, y: centerY - (danceFloor.height || 180) / 2 })
        });
      } catch {}
    }

    const cols = Math.min(4, Math.max(3, Math.ceil(Math.sqrt(tables.length))));
    const startX = 60;
    const startY = 60;
    const stepX = 190;
    const stepY = 170;

    const updatedTables = tables.map((t, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      let posX = startX + col * stepX;
      let posY = startY + row * stepY;
      if (danceFloor && Math.abs(posX - centerX) < 90 && Math.abs(posY - centerY) < 90) {
        posX += 40;
      }
      return { ...t, x: posX, y: posY };
    });

    setTables(updatedTables);

    try {
      for (const t of updatedTables) {
        await fetch(`/api/weddings/${currentWedding.id}/tables/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ x: t.x, y: t.y })
        });
      }
    } catch (err) {
      console.error('Error auto-arranging tables:', err);
    }
  };

  const handleCenterCanvas = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Table rotation
  const handleRotate = async (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    if (isLocked) return;
    const newRotation = (table.rotation + 45) % 360;
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, rotation: newRotation } : t));
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rotation: newRotation })
      });
    } catch {}
  };

  // Layout Element rotation
  const handleRotateElement = async (e: React.MouseEvent, el: LayoutElement) => {
    e.stopPropagation();
    if (isLocked) return;
    const newRotation = ((el.rotation || 0) + 45) % 360;
    setElements(prev => prev.map(item => item.id === el.id ? { ...item, rotation: newRotation } : item));
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/tables/elements/${el.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rotation: newRotation })
      });
    } catch {}
  };

  const handleDeleteElement = async (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (isLocked) return;
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/tables/elements/${elementId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchLayoutData();
    } catch {}
  };

  const handleDeleteTable = async (tableId: string) => {
    if (isLocked) return;
    if (!confirm('¿Eliminar esta mesa? Los invitados asignados quedarán sin mesa para que puedas reubicarlos.')) return;
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/tables/${tableId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTable(null);
      await fetchLayoutData();
    } catch {}
  };

  // Assign Guest to Table
  const handleAssignGuest = async (guestId: string, tableId: string) => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/guests/${guestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ table_id: tableId })
      });
      if (res.ok) {
        await fetchLayoutData();
      }
    } catch (err) {
      console.error('Network error assigning guest:', err);
    }
  };

  // Unassign Guest from Table
  const handleUnassignGuest = async (guestId: string) => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/guests/${guestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ table_id: null })
      });
      if (res.ok) {
        await fetchLayoutData();
      }
    } catch (err) {
      console.error('Network error unassigning guest:', err);
    }
  };

  // Create Table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding || isLocked) return;
    const defaultW = newTableData.type === 'imperial' ? 190 : newTableData.type === 'rectangular' ? 160 : newTableData.type === 'cuadrada' ? 130 : 120;
    const defaultH = newTableData.type === 'imperial' ? 95 : newTableData.type === 'rectangular' ? 95 : newTableData.type === 'cuadrada' ? 130 : 120;
    const defaultDist = getTableSeatsDistribution({
      type: newTableData.type,
      capacity: newTableData.capacity
    });
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newTableData,
          x: 100 + (tables.length % 5) * 60,
          y: 100 + Math.floor(tables.length / 5) * 60,
          rotation: 0,
          width: defaultW,
          height: defaultH,
          seats_distribution: JSON.stringify(defaultDist)
        })
      });
      if (res.ok) {
        setShowNewTableModal(false);
        setNewTableData({ name: '', type: 'circular', capacity: 10 });
        await fetchLayoutData();
      }
    } catch {}
  };

  // Create Element
  const handleCreateElement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding || isLocked) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/tables/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newElementData,
          x: 350,
          y: 220,
          rotation: 0
        })
      });
      if (res.ok) {
        setShowNewElementModal(false);
        setNewElementData({ name: 'Pista de Baile', type: 'pista_baile', width: 220, height: 180 });
        await fetchLayoutData();
      }
    } catch {}
  };

  // Save Version
  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding || !versionName.trim()) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/tables/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: versionName.trim() })
      });
      if (res.ok) {
        setShowSaveVersionModal(false);
        setVersionName('');
        await fetchVersions();
        alert('Versión guardada correctamente.');
      }
    } catch {}
  };

  // Floor plan handlers
  const handleSaveFloorPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding || isLocked) return;
    setUploadingFloorPlan(true);
    setFloorPlanError(null);
    try {
      if (floorPlanPendingBlob) {
        const formData = new FormData();
        const isRawPdf = floorPlanPendingBlob.type === 'application/pdf' || floorPlanFilename?.toLowerCase().endsWith('.pdf');
        const baseName = floorPlanFilename
          ? floorPlanFilename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
          : 'plano_base';
        const finalFilename = isRawPdf && floorPlanPendingBlob.type === 'application/pdf'
          ? `${baseName}.pdf`
          : `${baseName}_p${floorPlanSelectedPage}.png`;
        formData.append('floor_plan_file', floorPlanPendingBlob, finalFilename);

        const res = await fetch(`/api/weddings/${currentWedding.id}/floor-plan-file`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          setFloorPlanUrl(data.floor_plan_url);
          setFloorPlanPendingBlob(null);
          setShowFloorPlanModal(false);
          await refreshWedding();
        }
      } else {
        const res = await fetch(`/api/weddings/${currentWedding.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ floor_plan_url: floorPlanUrl || null })
        });
        if (res.ok) {
          setShowFloorPlanModal(false);
          await refreshWedding();
        }
      }
    } catch (err: any) {
      setFloorPlanError(err.message || 'Error guardando plano.');
    } finally {
      setUploadingFloorPlan(false);
    }
  };

  const handleRemoveFloorPlan = async () => {
    if (!currentWedding || isLocked) return;
    if (!confirm('¿Deseas quitar el plano base de este espacio?')) return;
    try {
      await fetch(`/api/weddings/${currentWedding.id}/floor-plan-file`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setFloorPlanUrl('');
      setFloorPlanPendingBlob(null);
      setFloorPlanPdfBuffer(null);
      setFloorPlanFilename('');
      setShowFloorPlanModal(false);
      await refreshWedding();
    } catch {}
  };

  const handleFloorPlanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFloorPlanError(null);
    setFloorPlanFilename(file.name);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setFloorPlanProcessing(true);
      try {
        const buffer = await file.arrayBuffer();
        setFloorPlanPdfBuffer(buffer);
        const { convertPdfPageToImage } = await import('../utils/pdfToImage');
        const result = await convertPdfPageToImage(buffer, 1, 2.0);
        setFloorPlanUrl(result.dataUrl);
        setFloorPlanPageCount(result.pageCount);
        setFloorPlanSelectedPage(1);
        const byteString = atob(result.dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        setFloorPlanPendingBlob(new Blob([ab], { type: 'image/png' }));
      } catch (err: any) {
        setFloorPlanError('Error procesando PDF.');
      } finally {
        setFloorPlanProcessing(false);
      }
    } else {
      setFloorPlanPendingBlob(file);
      setFloorPlanUrl(URL.createObjectURL(file));
      setFloorPlanPageCount(1);
      setFloorPlanSelectedPage(1);
    }
  };

  const handleSelectPdfPage = async (pageNumber: number) => {
    if (!floorPlanPdfBuffer || pageNumber < 1 || pageNumber > floorPlanPageCount) return;
    setFloorPlanProcessing(true);
    try {
      const { convertPdfPageToImage } = await import('../utils/pdfToImage');
      const result = await convertPdfPageToImage(floorPlanPdfBuffer, pageNumber, 2.0);
      setFloorPlanUrl(result.dataUrl);
      setFloorPlanSelectedPage(pageNumber);
      const byteString = atob(result.dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      setFloorPlanPendingBlob(new Blob([ab], { type: 'image/png' }));
    } catch {} finally {
      setFloorPlanProcessing(false);
    }
  };

  // Metrics Calculations
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
  const totalAssigned = tables.reduce((acc, t) => acc + (t.used_seats || 0), 0);

  const effectiveGuestsList = allGuests.length > 0 ? allGuests : unassignedGuests;
  const totalConfirmedPlaces = effectiveGuestsList.reduce((acc, g) => acc + 1 + (g.companion_count || 0), 0);
  const unassignedCount = unassignedGuests.length;
  const unassignedPlaces = unassignedGuests.reduce((acc, g) => acc + 1 + (g.companion_count || 0), 0);
  const assignedCount = effectiveGuestsList.filter(g => Boolean(g.table_id)).length;
  const distinctGroupsCount = effectiveGuestsList.length;

  const capacityDelta = totalCapacity - totalConfirmedPlaces;
  const progressPercent = Math.min(100, Math.round((totalAssigned / Math.max(1, totalConfirmedPlaces)) * 100));

  // Filtered guests for sidebar
  const displayGuests = effectiveGuestsList.filter(g => {
    if (filterOnlyUnassigned && g.table_id) return false;
    if (guestSearch) {
      const q = guestSearch.toLowerCase();
      const fullName = `${g.first_name} ${g.last_name || ''}`.toLowerCase();
      const obs = (g.observations || '').toLowerCase();
      return fullName.includes(q) || obs.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header: Clean & Minimal */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A7E72]">
              Asignación y Logística de Invitados
            </span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#2B2826]">
            Mesas y Layout
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="w-9 h-9 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EFE8E1] text-[#7D6F6B] hover:text-[#2B2826] flex items-center justify-center transition shadow-2xs cursor-pointer"
          title="Ayuda y guía de uso"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Discreet Compact Status Chips (Solo salen en caso necesario) */}
      {(totalConfirmedPlaces > 0 || tables.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-white border border-[#EFE8E1] text-[#7D6F6B] shadow-2xs">
            <span className="font-semibold text-[#2B2826]">
              {totalAssigned} de {totalConfirmedPlaces} sentados
            </span>
            <span className="text-[#D2C4B4]">·</span>
            <span>{unassignedPlaces} sin mesa</span>
            <div className="w-16 bg-[#FAF7F5] h-1.5 rounded-full overflow-hidden border border-[#EFE8E1]">
              <div
                className="bg-[#C48B81] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-[#C48B81] font-bold">
              {progressPercent}%
            </span>
          </div>

          {tables.length > 0 && capacityDelta !== 0 && (
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border shadow-2xs text-[11px] ${
              capacityDelta > 0
                ? 'bg-[#FEF8ED] border-[#F6E9CF] text-[#7A602B]'
                : 'bg-[#FCEEF2] border-[#F7DBE3] text-[#8F4B5E]'
            }`}>
              <span>
                {capacityDelta > 0
                  ? `${capacityDelta} lugares de sobra en ${tables.length} mesas`
                  : `Faltan ${Math.abs(capacityDelta)} lugares en mesas`}
              </span>
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                className="underline font-semibold hover:opacity-80 cursor-pointer"
              >
                Revisar
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Linea de Opciones Unificada:
          + Agregar mesa (con solo 1 +),
          Plano del venue,
          + pista / elemento,
          guardar version,
          descargar PDF
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tab switch: Lista de mesas first, Mapa second */}
        <div className="inline-flex p-1 bg-white rounded-2xl border border-[#EFE8E1] shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setViewMode('lista');
              setSelectedTable(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              viewMode === 'lista'
                ? 'bg-[#2B2826] text-white shadow-2xs'
                : 'text-[#7D6F6B] hover:text-[#2B2826]'
            }`}
          >
            Lista de mesas
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mapa')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'mapa'
                ? 'bg-[#2B2826] text-white shadow-2xs'
                : 'text-[#7D6F6B] hover:text-[#2B2826]'
            }`}
          >
            {isLockedForVirtualNovios && <Lock className="w-3 h-3 text-[#C48B81]" />}
            <span>Mapa</span>
          </button>
        </div>

        {/* Toolbar de Acciones en la misma linea */}
        <div className="flex flex-wrap items-center gap-2">
          {!isLocked && (
            <button
              type="button"
              onClick={() => setShowNewTableModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#2B2826] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar mesa</span>
            </button>
          )}

          {viewMode === 'mapa' && !isLockedForVirtualNovios && (
            <>
              <button
                type="button"
                onClick={() => setShowFloorPlanModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-[#FAF7F5] text-[#2B2826] border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
                title="Cargar o cambiar plano base del venue"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#C48B81]" />
                <span>Plano del venue</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewElementModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-[#FAF7F5] text-[#2B2826] border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
                title="Agregar pista de baile, escenario o barra"
              >
                <Layers className="w-3.5 h-3.5 text-[#C48B81]" />
                <span>+ Pista / elemento</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSaveVersionModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-[#FAF7F5] text-[#2B2826] border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
                title="Guardar versión de respaldo"
              >
                <Save className="w-3.5 h-3.5 text-[#C48B81]" />
                <span>Guardar versión</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#F7F3EE] text-[#332A28] text-xs font-semibold rounded-xl border border-[#EFE8E1] transition shadow-2xs cursor-pointer"
            title="Descargar distribución en PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-[#C48B81]" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* 4. Tab Content */}
      {viewMode === 'lista' ? (
        /* Lista de Mesas Tab */
        <div className="space-y-6">
          {tables.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-[#EFE8E1] text-center space-y-3">
              <Users className="w-10 h-10 text-[#C48B81] mx-auto opacity-80" />
              <h3 className="font-serif text-xl font-bold text-[#2B2826]">Aún no has creado mesas</h3>
              <p className="text-xs text-[#7D6F6B] max-w-md mx-auto leading-relaxed">
                Empieza agregando tu primera mesa (circular, cuadrada, rectangular o imperial) y sienta a tus invitados confirmados.
              </p>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => setShowNewTableModal(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Primera Mesa</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tables.map(table => {
                const assignedGuests = table.guests || [];
                const used = table.used_seats || 0;
                const isOver = used > table.capacity;
                const isFull = used === table.capacity;

                return (
                  <div
                    key={table.id}
                    className="bg-white rounded-3xl p-5 border border-[#EFE8E1] shadow-2xs space-y-4 hover:border-[#C48B81] transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-serif text-lg font-bold text-[#2B2826]">
                              {table.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A86B60] bg-[#F7EDEB] px-2 py-0.5 rounded-full">
                              {table.type}
                            </span>
                          </div>
                          <span className="text-xs text-[#7D6F6B]">
                            {table.capacity} lugares totales
                          </span>
                        </div>

                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTable(table.id)}
                            className="text-[#7D6F6B] hover:text-[#A86B60] p-1 rounded-lg hover:bg-[#FAF7F5] transition cursor-pointer"
                            title="Eliminar mesa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[#7D6F6B]">Ocupación</span>
                          <span className={`font-mono font-bold ${isOver ? 'text-[#A86B60]' : isFull ? 'text-[#384C3A]' : 'text-[#2B2826]'}`}>
                            {used} / {table.capacity}
                          </span>
                        </div>
                        <div className="w-full bg-[#FAF7F5] h-2 rounded-full overflow-hidden border border-[#EFE8E1]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOver ? 'bg-[#A86B60]' : isFull ? 'bg-[#384C3A]' : 'bg-[#C48B81]'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.round((used / table.capacity) * 100))}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#FAF7F5] space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7E72] block">
                          Invitados ({assignedGuests.length})
                        </span>
                        {assignedGuests.length === 0 ? (
                          <p className="text-xs text-[#8A7E7A] italic py-1">
                            Sin invitados asignados aún.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {assignedGuests.map(g => (
                              <div
                                key={g.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F5] border border-[#EFE8E1] text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-semibold text-[#2B2826] block truncate">
                                    {g.first_name} {g.last_name || ''}
                                  </span>
                                  {Boolean(g.companion_count) && (
                                    <span className="text-[10px] text-[#7D6F6B]">
                                      +{g.companion_count} comp. ({1 + g.companion_count} lugares)
                                    </span>
                                  )}
                                </div>
                                {!isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignGuest(g.id)}
                                    className="text-[#7D6F6B] hover:text-[#A86B60] p-1 rounded-md cursor-pointer"
                                    title="Quitar de la mesa"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isLocked && unassignedGuests.length > 0 && (
                      <div className="pt-2 border-t border-[#FAF7F5]">
                        <select
                          defaultValue=""
                          onChange={e => {
                            const val = e.target.value;
                            if (val) {
                              handleAssignGuest(val, table.id);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-[#EFE8E1] rounded-xl bg-[#FAF7F5] text-[#2B2826] focus:outline-none focus:ring-1 focus:ring-[#C48B81] cursor-pointer"
                        >
                          <option value="">+ Sentar invitado aquí...</option>
                          {unassignedGuests.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.first_name} {g.last_name || ''} (+{g.companion_count || 0} acomp.)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Mapa 2D Tab */
        isLockedForVirtualNovios ? (
          /* Lock state with Quiet Luxury card */
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F5] to-[#F7EDEB]/70 rounded-[32px] p-6 sm:p-8 border border-[#ECD9D5] shadow-[0_12px_36px_-8px_rgba(196,139,129,0.12)] relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#C48B81]/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#FFFFFF] text-[#A86B60] border border-[#ECD9D5] shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span className="font-semibold">Croquis 2D y Layout Visual</span>
                  </div>
                  <span className="text-xs text-[#8A7E7A] font-serif italic">
                    Lazo Studio · Experiencia Quiet Luxury
                  </span>
                </div>

                <div className="max-w-2xl space-y-2">
                  <h3 className="font-serif text-2xl sm:text-3xl text-[#2B2826] leading-tight">
                    Plano Arquitectónico y Asignación 2D
                  </h3>
                  <p className="text-xs sm:text-sm text-[#7D6F6B] leading-relaxed">
                    Tu paquete actual incluye la gestión completa de la <strong>Lista de Mesas</strong> y descarga oficial en PDF. La vista interactiva en 2D con plano a escala real y colocación milimétrica de pista de baile y mesas imperiales está reservada para paquetes completos o como add-on exclusivo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-[#FFFFFF]/90 p-5 rounded-2xl border border-[#ECD9D5]/80 shadow-2xs space-y-2">
                    <span className="font-serif text-2xl text-[#C48B81]">01</span>
                    <h4 className="font-serif text-base font-bold text-[#2B2826]">Plano a Escala Real</h4>
                    <p className="text-xs text-[#7D6F6B] leading-relaxed">
                      Carga y calibración visual del plano arquitectónico de tu hacienda o salón para asegurar que cada mesa quepa con precisión.
                    </p>
                  </div>
                  <div className="bg-[#FFFFFF]/90 p-5 rounded-2xl border border-[#ECD9D5]/80 shadow-2xs space-y-2">
                    <span className="font-serif text-2xl text-[#C48B81]">02</span>
                    <h4 className="font-serif text-base font-bold text-[#2B2826]">Flujo de Pista de Baile</h4>
                    <p className="text-xs text-[#7D6F6B] leading-relaxed">
                      Optimización de pasillos de meseros, visibilidad total hacia la mesa de novios y acústica perfecta respecto al DJ o grupo.
                    </p>
                  </div>
                  <div className="bg-[#FFFFFF]/90 p-5 rounded-2xl border border-[#ECD9D5]/80 shadow-2xs space-y-2">
                    <span className="font-serif text-2xl text-[#C48B81]">03</span>
                    <h4 className="font-serif text-base font-bold text-[#2B2826]">Dirección en Sitio</h4>
                    <p className="text-xs text-[#7D6F6B] leading-relaxed">
                      Supervisión de montaje durante el Día B para verificar la colocación exacta de cada mesa y elemento decorativo.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={layoutUpgradeWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-6 py-3.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition hover:shadow-md cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Cotizar Croquis 2D y Layout con Clara</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Unlocked Interactive Canvas + Dynamic Inspector / Sidebar */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 2D Canvas Area (8 cols) */}
            <div className="lg:col-span-8">
              <div
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`w-full h-[650px] bg-[#FDFBF9] rounded-3xl border border-[#EFE8E1] relative overflow-hidden select-none shadow-xs ${
                  handToolActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                }`}
                style={{
                  backgroundImage: 'radial-gradient(#D2C4B4 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px'
                }}
              >
                {/* Reference Venue Floor Plan (PDF/Image) */}
                {floorPlanUrl && floorPlanVisible && (
                  floorPlanUrl.toLowerCase().includes('.pdf') ? (
                    <iframe
                      src={`${floorPlanUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                      title="Plano arquitectónico de referencia"
                      className="absolute inset-0 w-full h-full pointer-events-none border-0 select-none"
                      style={{ opacity: floorPlanOpacity }}
                    />
                  ) : (
                    <img
                      src={floorPlanUrl}
                      alt="Plano de referencia del lugar"
                      className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200 ${
                        floorPlanFitMode === 'cover' ? 'object-cover' : 'object-contain'
                      }`}
                      style={{ opacity: floorPlanOpacity }}
                    />
                  )
                )}

                {/* Scaled and Panned Container for Tables & Elements */}
                <div
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                >
                  {/* Layout Elements (Pista de Baile, etc.) */}
                  {elements.map(el => (
                    <div
                      key={el.id}
                      onMouseDown={e => handleMouseDown(e, el.id, 'element')}
                      style={{
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.width}px`,
                        height: `${el.height}px`,
                        transform: `rotate(${el.rotation || 0}deg)`
                      }}
                      className="absolute rounded-3xl border-2 border-dashed border-[#D2C4B4] bg-white/40 flex flex-col items-center justify-center p-3 font-serif font-bold text-xs uppercase tracking-widest text-[#7D6F6B] shadow-xs cursor-move hover:border-[#C48B81] group select-none"
                    >
                      <span>{el.name}</span>
                      <span className="text-[9px] font-sans font-normal opacity-60 mt-0.5 lowercase">
                        {el.type.replace('_', ' ')}
                      </span>
                      {!isLocked && (
                        <div className="absolute -top-2 -right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={e => handleRotateElement(e, el)}
                            title="Girar 45°"
                            className="bg-[#C48B81] text-white p-1 rounded-full hover:bg-[#A86B60] shadow cursor-pointer"
                          >
                            <RotateCw className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => handleDeleteElement(e, el.id)}
                            title="Eliminar elemento"
                            className="bg-[#A86B60] text-white p-1 rounded-full hover:bg-[#6E4541] shadow cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Render Tables with Custom Width / Height & Interactive Corner Resizing */}
                  {tables.map((table, idx) => {
                    const isSelected = selectedTable?.id === table.id;
                    const capacity = Math.max(1, table.capacity || 10);
                    const usedSeats = table.used_seats || 0;

                    // Width & height per table (with sensible defaults)
                    const tableW = table.width || (table.type === 'imperial' ? 190 : table.type === 'rectangular' ? 160 : table.type === 'cuadrada' ? 130 : 120);
                    const tableH = table.height || (table.type === 'imperial' ? 95 : table.type === 'rectangular' ? 95 : table.type === 'cuadrada' ? 130 : 120);

                    // Circular calculations
                    const circDiameter = tableW;
                    const circRadius = circDiameter / 2;
                    const circSeatRadius = Math.max(20, circRadius - 10);
                    const circDiscDiameter = Math.max(36, circDiameter - 36);

                    return (
                      <div
                        key={table.id}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTable(table);
                        }}
                        onMouseDown={e => handleMouseDown(e, table.id, 'table')}
                        style={{
                          left: `${table.x}px`,
                          top: `${table.y}px`,
                          transform: `rotate(${table.rotation || 0}deg)`,
                          width: `${tableW}px`,
                          height: `${tableH}px`
                        }}
                        className={`absolute cursor-move select-none transition-shadow ${
                          isSelected ? 'z-30' : 'z-10'
                        }`}
                      >
                        {table.type === 'circular' ? (
                          /* Circular Table with Radial Seats */
                          <div className="relative w-full h-full flex items-center justify-center">
                            {/* Radial seats calculated around perimeter */}
                            {Array.from({ length: capacity }).map((_, seatIdx) => {
                              const angle = (2 * Math.PI * seatIdx) / capacity - Math.PI / 2;
                              const sx = circRadius + circSeatRadius * Math.cos(angle);
                              const sy = circRadius + circSeatRadius * Math.sin(angle);
                              const isOccupied = seatIdx < usedSeats;
                              const seatSize = Math.max(8, Math.min(18, Math.round(circDiameter * 0.12)));

                              return (
                                <div
                                  key={seatIdx}
                                  style={{
                                    left: `${sx - seatSize / 2}px`,
                                    top: `${sy - seatSize / 2}px`,
                                    width: `${seatSize}px`,
                                    height: `${seatSize}px`
                                  }}
                                  className={`absolute rounded-full transition-colors ${
                                    isOccupied
                                      ? 'bg-[#C48B81] border border-[#B0776D] shadow-2xs'
                                      : 'bg-white border border-[#D2C4B4]'
                                  }`}
                                  title={`Asiento ${seatIdx + 1}: ${isOccupied ? 'Ocupado' : 'Disponible'}`}
                                />
                              );
                            })}

                            {/* Table center disc */}
                            <div
                              style={{ width: `${circDiscDiameter}px`, height: `${circDiscDiameter}px` }}
                              className={`rounded-full bg-white border flex flex-col items-center justify-center p-1 text-center transition shadow-xs ${
                                isSelected
                                  ? 'border-[#C48B81] ring-2 ring-[#C48B81] shadow-md'
                                  : 'border-[#E8DFD5] hover:border-[#C48B81]'
                              }`}
                            >
                              <span className="font-serif font-bold text-xs text-[#2B2826] leading-none">
                                #{idx + 1}
                              </span>
                              <span className="text-[9px] text-[#7D6F6B] truncate max-w-[85%] mt-0.5 leading-tight">
                                {table.name || 'Sin nombre'}
                              </span>
                              <span className="text-[8.5px] font-semibold text-[#8A7E72] mt-0.5">
                                {usedSeats}/{capacity}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Rectangular / Imperial Table with Perimeter Seats (including Cabeceras) */
                          (() => {
                            const dist = getTableSeatsDistribution(table);
                            let runningSeatIdx = 0;

                            return (
                              <div className="relative w-full h-full flex items-center justify-center">
                                {/* Top Edge Seats */}
                                <div className="absolute -top-2 left-0 right-0 flex justify-around px-3 pointer-events-none z-20">
                                  {Array.from({ length: dist.top }).map((_, seatIdx) => {
                                    const isOccupied = runningSeatIdx < usedSeats;
                                    runningSeatIdx++;
                                    return (
                                      <div
                                        key={`top-${seatIdx}`}
                                        className={`w-3.5 h-3.5 rounded-full transition-colors ${
                                          isOccupied
                                            ? 'bg-[#C48B81] border border-[#B0776D] shadow-2xs'
                                            : 'bg-white border border-[#D2C4B4]'
                                        }`}
                                        title={`Asiento superior: ${isOccupied ? 'Ocupado' : 'Disponible'}`}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Right Cabecera Seats */}
                                <div className="absolute -right-2 top-0 bottom-0 flex flex-col justify-around py-3 pointer-events-none z-20">
                                  {Array.from({ length: dist.right }).map((_, seatIdx) => {
                                    const isOccupied = runningSeatIdx < usedSeats;
                                    runningSeatIdx++;
                                    return (
                                      <div
                                        key={`right-${seatIdx}`}
                                        className={`w-3.5 h-3.5 rounded-full transition-colors ${
                                          isOccupied
                                            ? 'bg-[#C48B81] border border-[#B0776D] shadow-2xs'
                                            : 'bg-white border border-[#D2C4B4]'
                                        }`}
                                        title={`Cabecera derecha: ${isOccupied ? 'Ocupado' : 'Disponible'}`}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Bottom Edge Seats */}
                                <div className="absolute -bottom-2 left-0 right-0 flex justify-around px-3 pointer-events-none z-20">
                                  {Array.from({ length: dist.bottom }).map((_, seatIdx) => {
                                    const isOccupied = runningSeatIdx < usedSeats;
                                    runningSeatIdx++;
                                    return (
                                      <div
                                        key={`bot-${seatIdx}`}
                                        className={`w-3.5 h-3.5 rounded-full transition-colors ${
                                          isOccupied
                                            ? 'bg-[#C48B81] border border-[#B0776D] shadow-2xs'
                                            : 'bg-white border border-[#D2C4B4]'
                                        }`}
                                        title={`Asiento inferior: ${isOccupied ? 'Ocupado' : 'Disponible'}`}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Left Cabecera Seats */}
                                <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-around py-3 pointer-events-none z-20">
                                  {Array.from({ length: dist.left }).map((_, seatIdx) => {
                                    const isOccupied = runningSeatIdx < usedSeats;
                                    runningSeatIdx++;
                                    return (
                                      <div
                                        key={`left-${seatIdx}`}
                                        className={`w-3.5 h-3.5 rounded-full transition-colors ${
                                          isOccupied
                                            ? 'bg-[#C48B81] border border-[#B0776D] shadow-2xs'
                                            : 'bg-white border border-[#D2C4B4]'
                                        }`}
                                        title={`Cabecera izquierda: ${isOccupied ? 'Ocupado' : 'Disponible'}`}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Center table rectangle */}
                                <div
                                  className={`w-full h-full rounded-2xl bg-white border flex flex-col items-center justify-center px-2 py-1 text-center transition shadow-xs ${
                                    isSelected
                                      ? 'border-[#C48B81] ring-2 ring-[#C48B81] shadow-md'
                                      : 'border-[#E8DFD5] hover:border-[#C48B81]'
                                  }`}
                                >
                                  <span className="font-serif font-bold text-xs text-[#2B2826] leading-none">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-[9px] text-[#7D6F6B] truncate max-w-[85%] mt-0.5 leading-tight">
                                    {table.name || 'Sin nombre'}
                                  </span>
                                  <span className="text-[8.5px] font-semibold text-[#8A7E72] mt-0.5">
                                    {usedSeats}/{capacity}
                                  </span>
                                </div>

                                {/* Interactive Cabecera Quick Buttons on Canvas when Selected */}
                                {isSelected && !isLocked && (
                                  <>
                                    {/* Left Cabecera Button */}
                                    {dist.left === 0 ? (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleUpdateSeatsDistribution(table.id, { ...dist, left: 1 });
                                        }}
                                        title="Agregar silla a cabecera izquierda"
                                        className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border border-dashed border-[#C48B81] text-[#C48B81] hover:bg-[#FAF7F5] flex items-center justify-center text-[10px] font-bold cursor-pointer shadow-xs z-30"
                                      >
                                        +
                                      </button>
                                    ) : (
                                      <div
                                        className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 bg-white/95 border border-[#EFE8E1] rounded-full p-0.5 shadow-2xs z-30"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateSeatsDistribution(table.id, { ...dist, left: dist.left + 1 })}
                                          className="w-3.5 h-3.5 rounded-full hover:bg-[#FAF7F5] text-[9px] font-bold text-[#2B2826] flex items-center justify-center cursor-pointer"
                                          title="Agregar silla a cabecera izq"
                                        >
                                          +
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateSeatsDistribution(table.id, { ...dist, left: Math.max(0, dist.left - 1) })}
                                          className="w-3.5 h-3.5 rounded-full hover:bg-[#FAF7F5] text-[9px] font-bold text-[#A86B60] flex items-center justify-center cursor-pointer"
                                          title="Quitar silla de cabecera izq"
                                        >
                                          −
                                        </button>
                                      </div>
                                    )}

                                    {/* Right Cabecera Button */}
                                    {dist.right === 0 ? (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleUpdateSeatsDistribution(table.id, { ...dist, right: 1 });
                                        }}
                                        title="Agregar silla a cabecera derecha"
                                        className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border border-dashed border-[#C48B81] text-[#C48B81] hover:bg-[#FAF7F5] flex items-center justify-center text-[10px] font-bold cursor-pointer shadow-xs z-30"
                                      >
                                        +
                                      </button>
                                    ) : (
                                      <div
                                        className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 bg-white/95 border border-[#EFE8E1] rounded-full p-0.5 shadow-2xs z-30"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateSeatsDistribution(table.id, { ...dist, right: dist.right + 1 })}
                                          className="w-3.5 h-3.5 rounded-full hover:bg-[#FAF7F5] text-[9px] font-bold text-[#2B2826] flex items-center justify-center cursor-pointer"
                                          title="Agregar silla a cabecera der"
                                        >
                                          +
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateSeatsDistribution(table.id, { ...dist, right: Math.max(0, dist.right - 1) })}
                                          className="w-3.5 h-3.5 rounded-full hover:bg-[#FAF7F5] text-[9px] font-bold text-[#A86B60] flex items-center justify-center cursor-pointer"
                                          title="Quitar silla de cabecera der"
                                        >
                                          −
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })()
                        )}

                        {/* Interactive Resize Handle (Shown when selected) */}
                        {isSelected && !isLocked && (
                          <div
                            onMouseDown={e => handleResizeMouseDown(e, table)}
                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-[#C48B81] rounded-full cursor-se-resize shadow-md hover:scale-125 transition-transform z-40"
                            title="Arrastra para cambiar el tamaño de la mesa"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Floating Discreet Venue Plan Pill (Top Left) */}
                {floorPlanUrl && (
                  <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-[#EFE8E1] text-[11px] font-medium text-[#7D6F6B] flex items-center space-x-2.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setFloorPlanVisible(!floorPlanVisible)}
                      className="flex items-center space-x-1 hover:text-[#2B2826] cursor-pointer"
                      title={floorPlanVisible ? 'Ocultar plano' : 'Mostrar plano'}
                    >
                      {floorPlanVisible ? <Eye className="w-3.5 h-3.5 text-[#C48B81]" /> : <EyeOff className="w-3.5 h-3.5 text-stone-400" />}
                      <span>Plano</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFloorPlanFitMode(floorPlanFitMode === 'contain' ? 'cover' : 'contain')}
                      className="text-[9.5px] font-bold uppercase bg-[#FAF8F5] border border-[#EFE8E1] px-1.5 py-0.5 rounded-md hover:bg-[#F2ECE7] cursor-pointer"
                    >
                      {floorPlanFitMode === 'contain' ? 'Ajustar' : 'Llenar'}
                    </button>

                    {floorPlanVisible && (
                      <div className="flex items-center space-x-1.5 border-l border-[#EFE8E1] pl-2">
                        <span className="text-[9.5px]">Opac:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={floorPlanOpacity}
                          onChange={e => setFloorPlanOpacity(parseFloat(e.target.value))}
                          className="w-14 accent-[#C48B81] cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Floating Clean Zoom Controls (Top Right) */}
                <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-[#EFE8E1] shadow-2xs p-1 flex flex-col items-center space-y-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.1))}
                    className="p-1.5 rounded-xl text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer"
                    title="Acercar"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
                    className="p-1.5 rounded-xl text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer"
                    title="Alejar"
                  >
                    <span className="font-bold text-xs leading-none">−</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHandToolActive(!handToolActive)}
                    className={`p-1.5 rounded-xl transition cursor-pointer ${
                      handToolActive ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5]'
                    }`}
                    title="Herramienta Mano para mover plano"
                  >
                    <Move className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCenterCanvas}
                    className="p-1.5 rounded-xl text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer"
                    title="Restablecer centro"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Minimalist Legend (Bottom Left) */}
                <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#EFE8E1] text-[10.5px] font-medium text-[#7D6F6B] flex items-center space-x-3 shadow-2xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C48B81]" />
                    <span>Ocupado</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#D2C4B4]" />
                    <span>Disponible</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Dynamic Sidebar: Table Inspector OR Guests List (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#EFE8E1] shadow-2xs space-y-4">
              {selectedTable ? (
                /* Table Inspector & Custom Sizing Controls */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-start justify-between pb-3 border-b border-[#FAF7F5]">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-serif text-lg font-bold text-[#2B2826]">
                          {selectedTable.name}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A86B60] bg-[#F7EDEB] px-2 py-0.5 rounded-full">
                          {selectedTable.type}
                        </span>
                      </div>
                      <span className="text-xs text-[#7D6F6B]">
                        Capacidad: {selectedTable.capacity} personas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTable(null)}
                      className="p-1 text-[#7D6F6B] hover:text-[#2B2826] rounded-lg hover:bg-[#FAF8F5] transition cursor-pointer"
                      title="Volver a lista de invitados"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Size Adjustment Controls for this Table */}
                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EFE8E1] space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2B2826]">
                      <div className="flex items-center space-x-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#C48B81]" />
                        <span>Modificar Tamaño de Mesa</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#A86B60]">
                        {selectedTable.type === 'circular'
                          ? `${selectedTable.width || 120}px`
                          : selectedTable.type === 'cuadrada'
                          ? `${selectedTable.width || 130} × ${selectedTable.height || 130}px`
                          : `${selectedTable.width || 160} × ${selectedTable.height || 95}px`}
                      </span>
                    </div>

                    {selectedTable.type === 'circular' || selectedTable.type === 'cuadrada' ? (
                      /* Circular Diameter / Cuadrada Side Slider */
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={selectedTable.type === 'cuadrada' ? "80" : "60"}
                          max="240"
                          step="5"
                          value={selectedTable.width || (selectedTable.type === 'cuadrada' ? 130 : 120)}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            handleUpdateTableSize(selectedTable.id, val, val);
                          }}
                          className="w-full accent-[#C48B81] cursor-pointer"
                        />
                        <div className="flex items-center justify-between text-[10px] text-[#7D6F6B]">
                          <span>{selectedTable.type === 'cuadrada' ? '80px (chica)' : '60px (chica)'}</span>
                          <span>{selectedTable.type === 'cuadrada' ? '130px (estándar)' : '120px (estándar)'}</span>
                          <span>{selectedTable.type === 'cuadrada' ? '200px (grande)' : '240px (grande)'}</span>
                        </div>
                      </div>
                    ) : (
                      /* Rectangular / Imperial Width & Height Sliders */
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-[#7D6F6B] mb-0.5">
                            <span>Ancho</span>
                            <span className="font-mono">{selectedTable.width || 160}px</span>
                          </div>
                          <input
                            type="range"
                            min="80"
                            max="320"
                            step="5"
                            value={selectedTable.width || 160}
                            onChange={e => {
                              const w = parseInt(e.target.value, 10);
                              handleUpdateTableSize(selectedTable.id, w, selectedTable.height || 95);
                            }}
                            className="w-full accent-[#C48B81] cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-[#7D6F6B] mb-0.5">
                            <span>Alto</span>
                            <span className="font-mono">{selectedTable.height || 95}px</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="200"
                            step="5"
                            value={selectedTable.height || 95}
                            onChange={e => {
                              const h = parseInt(e.target.value, 10);
                              handleUpdateTableSize(selectedTable.id, selectedTable.width || 160, h);
                            }}
                            className="w-full accent-[#C48B81] cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Quick Presets */}
                    <div className="pt-1 flex items-center justify-between gap-1.5 border-t border-[#EFE8E1]">
                      <span className="text-[10px] font-semibold text-[#7D6F6B]">Presets:</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTable.type === 'circular') handleUpdateTableSize(selectedTable.id, 80, 80);
                            else if (selectedTable.type === 'cuadrada') handleUpdateTableSize(selectedTable.id, 100, 100);
                            else handleUpdateTableSize(selectedTable.id, 120, 75);
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white rounded-md border border-[#EFE8E1] hover:border-[#C48B81] cursor-pointer"
                        >
                          Chica
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTable.type === 'circular') handleUpdateTableSize(selectedTable.id, 120, 120);
                            else if (selectedTable.type === 'cuadrada') handleUpdateTableSize(selectedTable.id, 130, 130);
                            else handleUpdateTableSize(selectedTable.id, 160, 95);
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white rounded-md border border-[#EFE8E1] hover:border-[#C48B81] cursor-pointer"
                        >
                          Media
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTable.type === 'circular') handleUpdateTableSize(selectedTable.id, 170, 170);
                            else if (selectedTable.type === 'cuadrada') handleUpdateTableSize(selectedTable.id, 160, 160);
                            else handleUpdateTableSize(selectedTable.id, 220, 115);
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white rounded-md border border-[#EFE8E1] hover:border-[#C48B81] cursor-pointer"
                        >
                          Grande
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sillas y Distribución de Cabeceras */}
                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EFE8E1] space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2B2826]">
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-[#C48B81]" />
                        <span>Sillas y Cabeceras</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#A86B60]">
                        {selectedTable.capacity} sillas totales
                      </span>
                    </div>

                    {selectedTable.type === 'circular' ? (
                      /* Circular: Adjust Capacity */
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#EFE8E1]">
                        <span className="text-xs text-[#7D6F6B]">Número de asientos:</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newCap = Math.max(2, (selectedTable.capacity || 10) - 1);
                              handleUpdateSeatsDistribution(selectedTable.id, { top: newCap, bottom: 0, left: 0, right: 0 });
                            }}
                            className="w-6 h-6 rounded-lg bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-bold hover:bg-[#F2ECE7] flex items-center justify-center cursor-pointer"
                          >
                            −
                          </button>
                          <span className="font-mono text-sm font-bold text-[#2B2826] w-6 text-center">
                            {selectedTable.capacity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newCap = (selectedTable.capacity || 10) + 1;
                              handleUpdateSeatsDistribution(selectedTable.id, { top: newCap, bottom: 0, left: 0, right: 0 });
                            }}
                            className="w-6 h-6 rounded-lg bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-bold hover:bg-[#F2ECE7] flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Rectangular / Imperial: Full Cabeceras & Sides Controls */
                      (() => {
                        const dist = getTableSeatsDistribution(selectedTable);

                        return (
                          <div className="space-y-2.5">
                            {/* Presets */}
                            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                              {selectedTable.type === 'cuadrada' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateSeatsDistribution(selectedTable.id, { top: 2, bottom: 2, left: 2, right: 2 });
                                    }}
                                    className={`py-1.5 px-1 rounded-xl border text-center font-medium transition cursor-pointer leading-tight ${
                                      dist.top === 2 && dist.bottom === 2 && dist.left === 2 && dist.right === 2
                                        ? 'bg-[#2B2826] text-white border-[#2B2826]'
                                        : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                                    }`}
                                    title="8 personas (2 por lado)"
                                  >
                                    8 pers (2/lado)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateSeatsDistribution(selectedTable.id, { top: 3, bottom: 3, left: 2, right: 2 });
                                    }}
                                    className={`py-1.5 px-1 rounded-xl border text-center font-medium transition cursor-pointer leading-tight ${
                                      dist.top === 3 && dist.bottom === 3 && dist.left === 2 && dist.right === 2
                                        ? 'bg-[#2B2826] text-white border-[#2B2826]'
                                        : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                                    }`}
                                    title="10 personas (3 y 2 por lado)"
                                  >
                                    10 pers (3 y 2)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateSeatsDistribution(selectedTable.id, { top: 3, bottom: 3, left: 3, right: 3 });
                                    }}
                                    className={`py-1.5 px-1 rounded-xl border text-center font-medium transition cursor-pointer leading-tight ${
                                      dist.top === 3 && dist.bottom === 3 && dist.left === 3 && dist.right === 3
                                        ? 'bg-[#2B2826] text-white border-[#2B2826]'
                                        : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                                    }`}
                                    title="12 personas (3 por lado)"
                                  >
                                    12 pers (3/lado)
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cap = selectedTable.capacity || 10;
                                      const remaining = Math.max(0, cap - 2);
                                      const top = Math.ceil(remaining / 2);
                                      const bottom = Math.floor(remaining / 2);
                                      handleUpdateSeatsDistribution(selectedTable.id, { top, bottom, left: 1, right: 1 });
                                    }}
                                    className={`py-1.5 px-1 rounded-xl border text-center font-medium transition cursor-pointer leading-tight ${
                                      dist.left === 1 && dist.right === 1
                                        ? 'bg-[#2B2826] text-white border-[#2B2826]'
                                        : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                                    }`}
                                    title="1 en cada cabecera"
                                  >
                                    1 y 1 en cabeceras
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cap = selectedTable.capacity || 10;
                                      const remaining = Math.max(0, cap - 4);
                                      const top = Math.ceil(remaining / 2);
                                      const bottom = Math.floor(remaining / 2);
                                      handleUpdateSeatsDistribution(selectedTable.id, { top, bottom, left: 2, right: 2 });
                                    }}
                                    className={`py-1.5 px-1 rounded-xl border text-center font-medium transition cursor-pointer leading-tight ${
                                      dist.left === 2 && dist.right === 2
                                        ? 'bg-[#2B2826] text-white border-[#2B2826]'
                                        : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                                    }`}
                                    title="2 en cada cabecera (imperiales)"
                                  >
                                    2 y 2 en cabeceras
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cap = selectedTable.capacity || 10;
                                      const top = Math.ceil(cap / 2);
                                      const bottom = Math.floor(cap / 2);
                                      handleUpdateSeatsDistribution(selectedTable.id, { top, bottom, left: 0, right: 0 });
                                    }}
                                    className={`py-1.5 px-1 rounded-xl border text-center font-medium transition cursor-pointer leading-tight ${
                                      dist.left === 0 && dist.right === 0
                                        ? 'bg-[#2B2826] text-white border-[#2B2826]'
                                        : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:border-[#C48B81]'
                                    }`}
                                    title="Sin sillas en cabeceras"
                                  >
                                    Sin cabeceras
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Steppers for each edge */}
                            <div className="bg-white p-2.5 rounded-xl border border-[#EFE8E1] space-y-2">
                              {/* Top Stepper */}
                              <div className="flex items-center justify-between text-xs px-1">
                                <span className="text-[#7D6F6B]">Lado superior:</span>
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, top: Math.max(0, dist.top - 1) })}
                                    className="w-5 h-5 rounded bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-bold hover:bg-[#F2ECE7] flex items-center justify-center cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <span className="font-mono text-xs font-bold text-[#2B2826] w-5 text-center">{dist.top}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, top: dist.top + 1 })}
                                    className="w-5 h-5 rounded bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-bold hover:bg-[#F2ECE7] flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Cabeceras Row */}
                              <div className="flex items-center justify-between px-2 py-1.5 bg-[#FAF7F5] rounded-xl text-xs">
                                {/* Cabecera Izq */}
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-semibold text-[#2B2826]">Cabecera Izq:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, left: Math.max(0, dist.left - 1) })}
                                    className="w-5 h-5 rounded bg-white border border-[#EFE8E1] text-xs font-bold hover:bg-[#FAF8F5] flex items-center justify-center cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <span className="font-mono text-xs font-bold text-[#C48B81] w-4 text-center">{dist.left}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, left: dist.left + 1 })}
                                    className="w-5 h-5 rounded bg-white border border-[#EFE8E1] text-xs font-bold hover:bg-[#FAF8F5] flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="w-[1px] h-4 bg-[#E8DFD5]" />

                                {/* Cabecera Der */}
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-semibold text-[#2B2826]">Cabecera Der:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, right: Math.max(0, dist.right - 1) })}
                                    className="w-5 h-5 rounded bg-white border border-[#EFE8E1] text-xs font-bold hover:bg-[#FAF8F5] flex items-center justify-center cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <span className="font-mono text-xs font-bold text-[#C48B81] w-4 text-center">{dist.right}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, right: dist.right + 1 })}
                                    className="w-5 h-5 rounded bg-white border border-[#EFE8E1] text-xs font-bold hover:bg-[#FAF8F5] flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Bottom Stepper */}
                              <div className="flex items-center justify-between text-xs px-1">
                                <span className="text-[#7D6F6B]">Lado inferior:</span>
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, bottom: Math.max(0, dist.bottom - 1) })}
                                    className="w-5 h-5 rounded bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-bold hover:bg-[#F2ECE7] flex items-center justify-center cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <span className="font-mono text-xs font-bold text-[#2B2826] w-5 text-center">{dist.bottom}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeatsDistribution(selectedTable.id, { ...dist, bottom: dist.bottom + 1 })}
                                    className="w-5 h-5 rounded bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-bold hover:bg-[#F2ECE7] flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Quick Balance transfer between sides and cabeceras */}
                            <div className="flex items-center justify-between text-[10.5px] pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (dist.top >= dist.bottom && dist.top > 1) {
                                    if (dist.left <= dist.right) {
                                      handleUpdateSeatsDistribution(selectedTable.id, { ...dist, top: dist.top - 1, left: dist.left + 1 });
                                    } else {
                                      handleUpdateSeatsDistribution(selectedTable.id, { ...dist, top: dist.top - 1, right: dist.right + 1 });
                                    }
                                  } else if (dist.bottom > 1) {
                                    if (dist.left <= dist.right) {
                                      handleUpdateSeatsDistribution(selectedTable.id, { ...dist, bottom: dist.bottom - 1, left: dist.left + 1 });
                                    } else {
                                      handleUpdateSeatsDistribution(selectedTable.id, { ...dist, bottom: dist.bottom - 1, right: dist.right + 1 });
                                    }
                                  }
                                }}
                                disabled={dist.top <= 1 && dist.bottom <= 1}
                                className="text-[#C48B81] hover:text-[#A86B60] font-semibold underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                              >
                                ⇄ Mover 1 silla a cabecera
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (dist.left > 0) {
                                    handleUpdateSeatsDistribution(selectedTable.id, { ...dist, left: dist.left - 1, top: dist.top + 1 });
                                  } else if (dist.right > 0) {
                                    handleUpdateSeatsDistribution(selectedTable.id, { ...dist, right: dist.right - 1, bottom: dist.bottom + 1 });
                                  }
                                }}
                                disabled={dist.left === 0 && dist.right === 0}
                                className="text-[#7D6F6B] hover:text-[#2B2826] font-semibold underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                              >
                                ⇄ Mover a lado largo
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Actions: Rotate & Delete */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={e => handleRotate(e, selectedTable)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF7F5] border border-[#EFE8E1] text-[#2B2826] cursor-pointer shadow-2xs"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#C48B81]" />
                      <span>Girar 45°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTable(selectedTable.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#A86B60] hover:bg-[#F7EDEB] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Mesa</span>
                    </button>
                  </div>

                  {/* Assigned Guests list in this table */}
                  <div className="space-y-2 pt-2 border-t border-[#FAF7F5]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8A7E72]">
                        Sentados en esta mesa ({selectedTable.guests?.length || 0})
                      </span>
                      <span className="font-mono text-xs font-bold text-[#2B2826]">
                        {selectedTable.used_seats || 0}/{selectedTable.capacity}
                      </span>
                    </div>

                    {(!selectedTable.guests || selectedTable.guests.length === 0) ? (
                      <p className="text-xs text-[#8A7E7A] italic py-2">
                        No hay invitados sentados en esta mesa aún.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selectedTable.guests.map(g => (
                          <div
                            key={g.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F5] border border-[#EFE8E1] text-xs"
                          >
                            <span className="font-semibold text-[#2B2826] truncate">
                              {g.first_name} {g.last_name || ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnassignGuest(g.id)}
                              className="text-[#7D6F6B] hover:text-[#A86B60] p-1 cursor-pointer"
                              title="Quitar de la mesa"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Return to guests list */}
                  <div className="pt-2 border-t border-[#FAF7F5]">
                    <button
                      type="button"
                      onClick={() => setSelectedTable(null)}
                      className="w-full py-2 text-xs font-semibold text-[#7D6F6B] hover:text-[#2B2826] bg-[#FAF7F5] hover:bg-[#F2ECE7] rounded-xl transition cursor-pointer"
                    >
                      ← Volver a lista de invitados
                    </button>
                  </div>
                </div>
              ) : (
                /* Confirmed Guests List with Group Color Coding */
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#2B2826]">
                        Invitados confirmados
                      </h3>
                      <p className="text-[11px] text-[#7D6F6B] mt-0.5">
                        {unassignedCount} sin mesa · {assignedCount} sentados · {distinctGroupsCount} grupos
                      </p>
                    </div>
                    <span className="font-serif text-3xl font-bold text-[#2B2826] leading-none">
                      {totalConfirmedPlaces}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8A7E72] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar invitado..."
                      value={guestSearch}
                      onChange={e => setGuestSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#FAF7F5] border border-[#EFE8E1] rounded-xl text-xs text-[#2B2826] placeholder-[#8A7E72] focus:outline-none focus:ring-1 focus:ring-[#C48B81]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setColorGroups(!colorGroups)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        colorGroups
                          ? 'bg-[#2B2826] text-white shadow-2xs'
                          : 'bg-[#FAF7F5] text-[#7D6F6B] border border-[#EFE8E1] hover:text-[#2B2826]'
                      }`}
                    >
                      Colorear grupos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterOnlyUnassigned(!filterOnlyUnassigned)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        filterOnlyUnassigned
                          ? 'bg-[#2B2826] text-white shadow-2xs'
                          : 'bg-[#FAF7F5] text-[#7D6F6B] border border-[#EFE8E1] hover:text-[#2B2826]'
                      }`}
                    >
                      Sin mesa · {unassignedCount}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {displayGuests.length === 0 ? (
                      <div className="text-center py-8 text-xs text-[#7D6F6B]">
                        No se encontraron invitados con los filtros seleccionados.
                      </div>
                    ) : (
                      displayGuests.map((g, idx) => {
                        const palette = colorGroups
                          ? GROUP_PALETTES[idx % GROUP_PALETTES.length]
                          : { bg: '#FFFFFF', border: '#EFE8E1', text: '#2B2826', tagBg: '#FAF7F5', tagText: '#7D6F6B' };

                        const hasCompanions = (g.companion_count || 0) > 0;
                        const isAssigned = Boolean(g.table_id);
                        const assignedTable = tables.find(t => t.id === g.table_id);
                        const isInfoOpen = infoGuestId === g.id;

                        return (
                          <div
                            key={g.id}
                            style={{ backgroundColor: palette.bg, borderColor: palette.border }}
                            className="p-3 rounded-2xl border transition-all duration-150 space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-xs uppercase tracking-wide text-[#2B2826] truncate">
                                    {g.first_name} {g.last_name || ''}
                                  </span>
                                  {hasCompanions ? (
                                    <span
                                      style={{ backgroundColor: palette.tagBg, color: palette.tagText }}
                                      className="text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                    >
                                      grupo de {1 + g.companion_count}
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] font-medium text-[#7D6F6B] shrink-0">
                                      sin acompañantes
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0">
                                {isAssigned ? (
                                  <button
                                    type="button"
                                    onClick={() => setAssigningGuest(g)}
                                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-[#2B2826] text-white hover:bg-black transition cursor-pointer"
                                    title="Cambiar mesa asignada"
                                  >
                                    {assignedTable?.name || 'Mesa'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setAssigningGuest(g)}
                                    className="px-3 py-1 rounded-xl text-[11px] font-semibold bg-[#E8DEF8] hover:bg-[#DCD0F0] text-[#2B2826] transition cursor-pointer shadow-2xs"
                                  >
                                    Asignar
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setInfoGuestId(isInfoOpen ? null : g.id)}
                                  className="w-6 h-6 rounded-full border border-[#D2C4B4] bg-white text-[#7D6F6B] hover:text-[#2B2826] text-[11px] font-bold flex items-center justify-center transition cursor-pointer"
                                  title="Ver detalles"
                                >
                                  ?
                                </button>
                              </div>
                            </div>

                            {hasCompanions && (
                              <p className="text-[10.5px] text-[#7D6F6B] leading-tight">
                                {g.observations && g.observations.toLowerCase().includes('acompañ')
                                  ? g.observations
                                  : `Acompaña a ${g.first_name} ${g.last_name || ''} (+${g.companion_count} persona${g.companion_count > 1 ? 's' : ''})`}
                              </p>
                            )}

                            {isInfoOpen && (
                              <div className="pt-2 border-t border-black/5 text-[11px] space-y-1 text-[#5E524E] bg-white/70 p-2.5 rounded-xl">
                                <div><strong className="text-[#2B2826]">Teléfono:</strong> {g.phone || 'No registrado'}</div>
                                <div><strong className="text-[#2B2826]">Estado:</strong> {g.status || 'Confirmado'}</div>
                                {g.dietary_requirements && (
                                  <div><strong className="text-[#2B2826]">Dieta:</strong> {g.dietary_requirements}</div>
                                )}
                                {g.observations && (
                                  <div><strong className="text-[#2B2826]">Observaciones:</strong> {g.observations}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Quick Assignment Popover Modal */}
      {assigningGuest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#EFE8E1] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C48B81]">
                  Asignar Mesa
                </span>
                <h3 className="font-serif text-lg font-bold text-[#2B2826] leading-tight">
                  {assigningGuest.first_name} {assigningGuest.last_name || ''}
                </h3>
                <span className="text-[11px] text-[#7D6F6B]">
                  {1 + (assigningGuest.companion_count || 0)} {(1 + (assigningGuest.companion_count || 0)) === 1 ? 'lugar requerido' : 'lugares requeridos'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssigningGuest(null);
                  setTableSearchInPopover('');
                }}
                className="p-1.5 text-[#7D6F6B] hover:text-[#2B2826] rounded-xl hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8A7E72] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar mesa..."
                value={tableSearchInPopover}
                onChange={e => setTableSearchInPopover(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#FAF7F5] border border-[#EFE8E1] rounded-xl text-xs text-[#2B2826] placeholder-[#8A7E72] focus:outline-none focus:ring-1 focus:ring-[#C48B81]"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2B2826] text-white">
                Con espacio · {tables.filter(t => (t.capacity - (t.used_seats || 0)) >= (1 + (assigningGuest.companion_count || 0))).length}
              </span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {tables
                .filter(t => {
                  if (!tableSearchInPopover) return true;
                  return t.name.toLowerCase().includes(tableSearchInPopover.toLowerCase());
                })
                .map((t, idx) => {
                  const freeSeats = Math.max(0, t.capacity - (t.used_seats || 0));
                  const neededSeats = 1 + (assigningGuest.companion_count || 0);
                  const canFit = freeSeats >= neededSeats;
                  const isCurrentTable = assigningGuest.table_id === t.id;

                  return (
                    <button
                      key={t.id}
                      disabled={!canFit || isCurrentTable}
                      onClick={async () => {
                        await handleAssignGuest(assigningGuest.id, t.id);
                        setAssigningGuest(null);
                        setTableSearchInPopover('');
                      }}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                        isCurrentTable
                          ? 'bg-[#EBF3EC] border-[#D6E6D8] opacity-80'
                          : canFit
                          ? 'bg-white hover:bg-[#FAF7F5] border-[#EFE8E1] hover:border-[#C48B81]'
                          : 'bg-stone-50 border-stone-200 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#FAF7F5] border border-[#EFE8E1] text-[#2B2826] font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-xs text-[#2B2826] block truncate">
                            {t.name || 'Sin nombre'}
                          </span>
                          <span className="text-[10px] text-[#7D6F6B]">
                            {t.type} · cap. {t.capacity}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center space-x-1.5">
                        {isCurrentTable ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#384C3A] text-white">
                            Actual
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            canFit ? 'bg-[#FAF7F5] text-[#7D6F6B] border border-[#EFE8E1]' : 'bg-stone-100 text-stone-400'
                          }`}>
                            {freeSeats} libres
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            <p className="text-[10.5px] text-[#7D6F6B] leading-tight border-t border-[#FAF7F5] pt-3">
              Las mesas completas y las bloqueadas aparecen en gris: no se puede soltar a nadie ahí.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Nueva Mesa */}
      {showNewTableModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EFE8E1]">
            <h3 className="font-serif text-xl font-bold text-[#2B2826] mb-4">Nueva Mesa</h3>
            <form onSubmit={handleCreateTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">Nombre o Número de Mesa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mesa 1, Mesa Novios, Familia..."
                  value={newTableData.name}
                  onChange={e => setNewTableData({ ...newTableData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">Tipo de Mesa</label>
                <select
                  value={newTableData.type}
                  onChange={e => {
                    const t = e.target.value as any;
                    setNewTableData({
                      ...newTableData,
                      type: t,
                      capacity: t === 'imperial' ? 14 : t === 'cuadrada' ? 10 : 10
                    });
                  }}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none cursor-pointer"
                >
                  <option value="circular">Circular (8-12 personas)</option>
                  <option value="cuadrada">Cuadrada (8-10 personas)</option>
                  <option value="rectangular">Rectangular (8-14 personas)</option>
                  <option value="imperial">Imperial (12-20 personas)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">Capacidad Total de Lugares</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newTableData.capacity}
                  onChange={e => setNewTableData({ ...newTableData, capacity: parseInt(e.target.value, 10) || 10 })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
                {newTableData.type === 'cuadrada' && (
                  <p className="text-[10px] text-[#8A7E72] mt-1 italic">
                    Recomendado: 8 personas (2 por cada lado) o 10 personas (3 arriba/abajo y 2 a los lados).
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#FAF7F5]">
                <button
                  type="button"
                  onClick={() => setShowNewTableModal(false)}
                  className="px-4 py-2 text-xs text-[#7D6F6B] hover:bg-[#FAF7F5] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Crear Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Elemento (Pista de Baile / Escenario) */}
      {showNewElementModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EFE8E1]">
            <h3 className="font-serif text-xl font-bold text-[#2B2826] mb-4">Agregar Elemento al Plano</h3>
            <form onSubmit={handleCreateElement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={newElementData.name}
                  onChange={e => setNewElementData({ ...newElementData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">Tipo de Elemento</label>
                <select
                  value={newElementData.type}
                  onChange={e => setNewElementData({ ...newElementData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none cursor-pointer"
                >
                  <option value="pista_baile">Pista de Baile</option>
                  <option value="escenario">Escenario / DJ</option>
                  <option value="barra">Barra de Coctelería</option>
                  <option value="entrada">Entrada Principal</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1">Ancho (px)</label>
                  <input
                    type="number"
                    value={newElementData.width}
                    onChange={e => setNewElementData({ ...newElementData, width: parseInt(e.target.value, 10) || 160 })}
                    className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1">Alto (px)</label>
                  <input
                    type="number"
                    value={newElementData.height}
                    onChange={e => setNewElementData({ ...newElementData, height: parseInt(e.target.value, 10) || 160 })}
                    className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#FAF7F5]">
                <button
                  type="button"
                  onClick={() => setShowNewElementModal(false)}
                  className="px-4 py-2 text-xs text-[#7D6F6B] hover:bg-[#FAF7F5] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#2B2826] text-white rounded-xl hover:bg-black shadow-xs cursor-pointer"
                >
                  Agregar Elemento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Guardar Versión */}
      {showSaveVersionModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EFE8E1]">
            <h3 className="font-serif text-xl font-bold text-[#2B2826] mb-2">Guardar Versión de Layout</h3>
            <p className="text-xs text-[#7D6F6B] mb-4">
              Crea un respaldo de la distribución actual para comparar o recuperar en cualquier momento.
            </p>
            <form onSubmit={handleSaveVersion} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">Nombre de la Versión</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Opción 2 - Pista Central Ampliada"
                  value={versionName}
                  onChange={e => setVersionName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#FAF7F5]">
                <button
                  type="button"
                  onClick={() => setShowSaveVersionModal(false)}
                  className="px-4 py-2 text-xs text-[#7D6F6B] hover:bg-[#FAF7F5] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#2B2826] text-white rounded-xl hover:bg-black shadow-xs cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Plano Base del Venue (PDF & Imágenes) */}
      {showFloorPlanModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EFE8E1] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C48B81]">
                  Plantilla de Fondo · Layout 2D
                </span>
                <h3 className="font-serif text-2xl text-[#2B2826] mt-0.5">
                  Plano Base del Venue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFloorPlanModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#7D6F6B] leading-relaxed">
              Carga el plano arquitectónico en <strong>PDF</strong> o imagen (PNG/JPG) que te entregó la hacienda o salón para utilizarlo como referencia visual exacta debajo de tus mesas.
            </p>

            {floorPlanError && (
              <div className="p-3 bg-[#F7EDEB] border border-[#ECD9D5] text-[#A86B60] rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{floorPlanError}</span>
              </div>
            )}

            <form onSubmit={handleSaveFloorPlan} className="space-y-4">
              <div className="relative border-2 border-dashed border-[#EFE8E1] hover:border-[#C48B81] bg-[#FAF8F5] hover:bg-[#F7EDEB]/40 rounded-2xl p-6 text-center transition cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFloorPlanFileUpload}
                  disabled={floorPlanProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {floorPlanProcessing ? (
                  <div className="flex flex-col items-center justify-center py-3 space-y-2">
                    <Loader2 className="w-7 h-7 text-[#C48B81] animate-spin" />
                    <span className="text-xs font-semibold text-[#A86B60]">
                      Procesando plano PDF en alta resolución...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center border border-[#EFE8E1] group-hover:scale-105 transition shadow-2xs">
                      <FileUp className="w-5 h-5 text-[#C48B81]" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#2B2826] block">
                        Haz clic o arrastra aquí tu plano en <span className="text-[#A86B60] font-bold">PDF</span> o Imagen
                      </span>
                      <span className="text-[11px] text-[#7D6F6B] mt-0.5 block">
                        Soporta archivos arquitectónicos PDF, PNG, JPG y WebP (hasta 30 MB)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {floorPlanPageCount > 1 && (
                <div className="p-3 bg-[#FAF8F5] border border-[#EFE8E1] rounded-2xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2B2826]">Plano multipágina:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={floorPlanSelectedPage <= 1 || floorPlanProcessing}
                      onClick={() => handleSelectPdfPage(floorPlanSelectedPage - 1)}
                      className="p-1 rounded-lg border border-[#EFE8E1] bg-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-semibold text-xs text-[#2B2826]">
                      {floorPlanSelectedPage} / {floorPlanPageCount}
                    </span>
                    <button
                      type="button"
                      disabled={floorPlanSelectedPage >= floorPlanPageCount || floorPlanProcessing}
                      onClick={() => handleSelectPdfPage(floorPlanSelectedPage + 1)}
                      className="p-1 rounded-lg border border-[#EFE8E1] bg-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#EFE8E1]">
                {floorPlanUrl ? (
                  <button
                    type="button"
                    onClick={handleRemoveFloorPlan}
                    className="text-xs text-[#A86B60] hover:text-[#2B2826] font-semibold transition cursor-pointer"
                  >
                    Quitar Plano
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowFloorPlanModal(false)}
                    className="px-4 py-2 text-xs font-medium text-[#7D6F6B] hover:text-[#2B2826] rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingFloorPlan || floorPlanProcessing || !floorPlanUrl}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#2B2826] hover:bg-black disabled:opacity-50 text-white rounded-full transition shadow-xs cursor-pointer flex items-center space-x-1.5"
                  >
                    {uploadingFloorPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{uploadingFloorPlan ? 'Guardando...' : 'Aplicar Plano Base'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ayuda */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE8E1] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C48B81]">
                  Guía Rápida
                </span>
                <h3 className="font-serif text-xl font-bold text-[#2B2826]">
                  Mesas y Layout
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#7D6F6B] leading-relaxed">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] space-y-1">
                <strong className="text-[#2B2826] block">1. Modificar el tamaño de las mesas:</strong>
                Haz clic sobre cualquier mesa en el mapa. Aparecerá un punto de ajuste en la esquina inferior derecha para redimensionarla arrastrando con el mouse. También verás los sliders de tamaño en el panel derecho con opciones de tamaño predefinidas (Chica, Media, Grande).
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] space-y-1">
                <strong className="text-[#2B2826] block">2. Plano del Venue:</strong>
                Sube el plano arquitectónico en PDF o imagen mediante el botón <span className="font-semibold text-[#2B2826]">Plano del Venue</span> para alinear con exactitud tus mesas reales sobre el croquis del lugar.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#2B2826] text-white rounded-xl hover:bg-black shadow-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
