import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { Table, LayoutElement, LayoutVersion, Guest } from '../types';
import {
  Plus, RotateCw, Trash2, Save, History,
  Lock, AlertTriangle, Move, Eye, EyeOff, Layers, Image as ImageIcon,
  Maximize2, Minimize2, Unlock, Users, ChevronDown, ChevronUp,
  FileUp, Loader2, ChevronLeft, ChevronRight, CheckCircle2, X, FileDown, MessageSquare,
  Search, ZoomIn, ZoomOut, HelpCircle, Check, RotateCcw, LayoutGrid, Compass, Sliders
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

export const MesasLayoutModule: React.FC = () => {
  const { currentWedding, token, user, refreshWedding } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [versions, setVersions] = useState<LayoutVersion[]>([]);
  const [, setLoading] = useState(true);

  // View switch: 'lista' (Lista de mesas first) vs 'mapa' (Mapa 2D)
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('lista');

  // Sidebar controls
  const [colorGroups, setColorGroups] = useState(true);
  const [filterOnlyUnassigned, setFilterOnlyUnassigned] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [infoGuestId, setInfoGuestId] = useState<string | null>(null);

  // Quick Assignment Popover
  const [assigningGuest, setAssigningGuest] = useState<Guest | null>(null);
  const [tableSearchInPopover, setTableSearchInPopover] = useState('');

  // Modo Lienzo Amplio & Table Size state
  const [fullCanvasMode, setFullCanvasMode] = useState(false);
  const [lockTouchScroll, setLockTouchScroll] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [tableScale, setTableScale] = useState<number>(1.0); // Table size adjustment (0.75x to 1.5x)
  const [handToolActive, setHandToolActive] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Active selected table for assignment drawer / details
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Dragging state on visual canvas
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'table' | 'element' | null>(null);

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

  // New Table Modal
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [newTableData, setNewTableData] = useState({
    name: '',
    type: 'circular' as 'circular' | 'rectangular' | 'imperial',
    capacity: 10
  });

  // New Element Modal
  const [showNewElementModal, setShowNewElementModal] = useState(false);
  const [newElementData, setNewElementData] = useState({
    name: 'Pista de Baile',
    type: 'pista_baile' as LayoutElement['type'],
    width: 220,
    height: 180
  });

  // Save Version Modal
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [versionName, setVersionName] = useState('');

  // Info Help Modal
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Permissions & Locking
  const isNovios = user?.role === 'NOVIOS';
  const isPlannerVirtual = Boolean(
    !currentWedding?.package_type ||
    currentWedding.package_type.toLowerCase().includes('virtual') ||
    currentWedding.package_type.toLowerCase().includes('autónomo')
  );
  const hasLayout2dAddon = Boolean(currentWedding?.has_layout_2d);
  const isLockedForVirtualNovios = isNovios && isPlannerVirtual && !hasLayout2dAddon;
  const isLocked = false; // Operative 5-day lock if applicable

  const layoutUpgradeWhatsAppUrl =
    'https://wa.me/528128663440?text=' +
    encodeURIComponent(`¡Hola Lazo Studio! Soy cliente de Lazo Studio (${currentWedding?.name || 'mi evento'}) y me gustaría cotizar la activación del Croquis 2D y diseño de layout.`);

  // PDF Export
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

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

      // Summary Cards
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

      // Render Tables
      tables.forEach(table => {
        const assignedGuests = table.guests || [];
        const neededHeight = 16 + Math.ceil(assignedGuests.length / 2) * 6;

        if (currentY + neededHeight > pageHeight - 24) {
          renderFooter(pageCount);
          doc.addPage();
          pageCount++;
          renderHeader();
        }

        // Table Header
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
    if (isLocked || handToolActive) return;
    e.stopPropagation();
    setDraggingId(id);
    setDragType(type);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) / zoomLevel,
      y: (e.clientY - rect.top) / zoomLevel
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

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
    const stepX = 200 * tableScale;
    const stepY = 180 * tableScale;

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
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newTableData,
          x: 100 + (tables.length % 5) * 60,
          y: 100 + Math.floor(tables.length / 5) * 60,
          rotation: 0
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
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Help Tooltip Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="w-9 h-9 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EFE8E1] text-[#7D6F6B] hover:text-[#2B2826] flex items-center justify-center transition shadow-2xs cursor-pointer"
            title="Ayuda y guía de asignación de mesas"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#F7F3EE] text-[#332A28] text-xs font-semibold rounded-xl border border-[#EFE8E1] transition shadow-2xs cursor-pointer"
            title="Descargar lista oficial de mesas y asientos en PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-[#C48B81]" />
            <span>Descargar PDF</span>
          </button>

          {/* Add Table */}
          {!isLocked && (
            <button
              type="button"
              onClick={() => setShowNewTableModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#2B2826] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Agregar</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Top Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Left Progress Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE8E1] shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-bold text-sm text-[#2B2826] block">
                {totalAssigned} de {totalConfirmedPlaces} sentados
              </span>
              <span className="text-xs text-[#7D6F6B] mt-0.5 block">
                {unassignedPlaces} invitados confirmados sin mesa
              </span>
            </div>
            <span className="text-xs font-bold font-mono text-[#C48B81]">
              {progressPercent}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-[#FAF7F5] h-2 rounded-full overflow-hidden border border-[#EFE8E1]">
            <div
              className="bg-[#C48B81] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right Alert / Capacity Card */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-2xs flex items-center justify-between gap-3 ${
          capacityDelta >= 0
            ? 'bg-[#FEF8ED] border-[#F6E9CF] text-[#7A602B]'
            : 'bg-[#FCEEF2] border-[#F7DBE3] text-[#8F4B5E]'
        }`}>
          <div>
            <span className="font-bold text-xs sm:text-sm block text-[#2B2826]">
              {capacityDelta >= 0
                ? `${capacityDelta} lugares de sobra en ${tables.length} mesas — más capacidad que invitados`
                : `Faltan ${Math.abs(capacityDelta)} lugares en mesas para tus invitados confirmados`}
            </span>
            <span className="text-[11px] text-[#7D6F6B] mt-0.5 block">
              Capacidad total instalada: {totalCapacity} sillas en {tables.length} mesas.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'mapa' ? 'lista' : 'mapa')}
            className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#EFE8E1] text-[#2B2826] hover:bg-[#FAF7F5] transition shadow-2xs cursor-pointer"
          >
            Revisar
          </button>
        </div>
      </div>

      {/* View Switcher: Lista de mesas FIRST, Mapa SECOND */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-white rounded-2xl border border-[#EFE8E1] shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('lista')}
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

        {/* Toolbar when in Mapa mode */}
        {viewMode === 'mapa' && !isLockedForVirtualNovios && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Table scale adjustment slider */}
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white rounded-xl border border-[#EFE8E1] shadow-2xs text-xs text-[#7D6F6B]">
              <Sliders className="w-3.5 h-3.5 text-[#C48B81]" />
              <span className="text-[11px] font-semibold text-[#2B2826]">Tamaño mesas:</span>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={tableScale}
                onChange={e => setTableScale(parseFloat(e.target.value))}
                className="w-20 accent-[#C48B81] cursor-pointer"
                title="Ajustar tamaño de las mesas en el plano"
              />
              <span className="font-mono text-[10px] text-[#2B2826] font-semibold">
                {Math.round(tableScale * 100)}%
              </span>
            </div>

            {/* Venue Floor Plan Button */}
            <button
              type="button"
              onClick={() => setShowFloorPlanModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-[#FAF7F5] text-[#2B2826] border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
              title="Subir o configurar plano arquitectónico del venue"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Plano Base Venue</span>
            </button>

            {/* Auto-arrange & Center */}
            <button
              type="button"
              onClick={handleAutoArrange}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-[#FAF7F5] text-[#2B2826] border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
              title="Acomodar mesas simétricamente en el salón"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Auto acomodo</span>
            </button>

            <button
              type="button"
              onClick={handleCenterCanvas}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-[#FAF7F5] text-[#2B2826] border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
              title="Centrar y reajustar lienzo"
            >
              <Compass className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Centrar</span>
            </button>
          </div>
        )}
      </div>

      {/* Content depending on viewMode & permissions */}
      {viewMode === 'lista' ? (
        /* Full Table List View (Default tab) */
        <div className="space-y-6">
          {tables.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-[#EFE8E1] text-center space-y-3">
              <Users className="w-10 h-10 text-[#C48B81] mx-auto opacity-80" />
              <h3 className="font-serif text-xl font-bold text-[#2B2826]">Aún no has creado mesas</h3>
              <p className="text-xs text-[#7D6F6B] max-w-md mx-auto leading-relaxed">
                Empieza agregando tu primera mesa (circular, rectangular o imperial) y asigna a tus invitados confirmados.
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

                      {/* Capacity Bar */}
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

                      {/* Guest list */}
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

                    {/* Quick assign guest dropdown */}
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
        /* Mapa 2D View */
        isLockedForVirtualNovios ? (
          /* Locked State for Virtual Novios without 2D Add-on */
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
          /* Unlocked Full 2D Seating Chart + Right Guests Sidebar */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 2D Canvas Area */}
            <div className={fullCanvasMode ? 'lg:col-span-12' : 'lg:col-span-8'}>
              <div
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`w-full h-[640px] bg-[#FDFBF9] rounded-3xl border border-[#EFE8E1] relative overflow-hidden select-none shadow-xs ${
                  handToolActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                } ${lockTouchScroll ? 'touch-none overscroll-contain' : ''}`}
                style={{
                  backgroundImage: 'radial-gradient(#D2C4B4 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px'
                }}
              >
                {/* Optional Venue Floor Plan Layer */}
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
                  {/* Render Elements (Pista de Baile, Escenario, etc.) */}
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
                      className="absolute rounded-3xl border-2 border-dashed border-[#D2C4B4] bg-white/40 flex flex-col items-center justify-center p-3 font-serif font-bold text-xs uppercase tracking-widest text-[#7D6F6B] shadow-xs cursor-move hover:border-[#C48B81] group"
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
                            title="Girar elemento 45°"
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

                  {/* Render Tables with Adjustable Size & Proportional Seats */}
                  {tables.map((table, idx) => {
                    const isSelected = selectedTable?.id === table.id;
                    const capacity = Math.max(1, table.capacity || 10);
                    const usedSeats = table.used_seats || 0;

                    // Proportional sizing based on tableScale and previous configuration
                    const circDiameter = Math.round(128 * tableScale);
                    const circDiscDiameter = Math.round(76 * tableScale);
                    const circSeatRadius = Math.round(52 * tableScale);
                    const circCenter = circDiameter / 2;

                    const rectWidth = Math.round(160 * tableScale);
                    const rectHeight = Math.round(96 * tableScale);

                    const impWidth = Math.round(200 * tableScale);
                    const impHeight = Math.round(100 * tableScale);

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
                          transform: `rotate(${table.rotation || 0}deg)`
                        }}
                        className={`absolute cursor-move select-none transition-shadow ${
                          isSelected ? 'z-20' : 'z-10'
                        }`}
                      >
                        {table.type === 'circular' ? (
                          /* Circular Table with Radial Seats */
                          <div
                            style={{ width: `${circDiameter}px`, height: `${circDiameter}px` }}
                            className="relative flex items-center justify-center"
                          >
                            {/* Radial seats calculated around perimeter */}
                            {Array.from({ length: capacity }).map((_, seatIdx) => {
                              const angle = (2 * Math.PI * seatIdx) / capacity - Math.PI / 2;
                              const sx = circCenter + circSeatRadius * Math.cos(angle);
                              const sy = circCenter + circSeatRadius * Math.sin(angle);
                              const isOccupied = seatIdx < usedSeats;

                              return (
                                <div
                                  key={seatIdx}
                                  style={{
                                    left: `${sx - 8}px`,
                                    top: `${sy - 8}px`
                                  }}
                                  className={`absolute w-4 h-4 rounded-full transition-colors ${
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
                                  ? 'border-[#C48B81] ring-2 ring-[#C48B81]/40 shadow-md'
                                  : 'border-[#E8DFD5] hover:border-[#C48B81]'
                              }`}
                            >
                              <span className="font-serif font-bold text-xs text-[#2B2826] leading-none">
                                #{idx + 1}
                              </span>
                              <span className="text-[9px] text-[#7D6F6B] truncate max-w-[64px] mt-0.5 leading-tight">
                                {table.name || 'Sin nombre'}
                              </span>
                              <span className="text-[8.5px] font-semibold text-[#8A7E72] mt-0.5">
                                {usedSeats}/{capacity}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Rectangular / Imperial Table with Perimeter Seats */
                          <div
                            style={{
                              width: `${table.type === 'imperial' ? impWidth : rectWidth}px`,
                              height: `${table.type === 'imperial' ? impHeight : rectHeight}px`
                            }}
                            className="relative flex items-center justify-center"
                          >
                            {/* Top Edge Seats */}
                            <div className="absolute -top-2.5 left-0 right-0 flex justify-around px-3">
                              {Array.from({ length: Math.floor(capacity / 2) }).map((_, seatIdx) => {
                                const isOccupied = seatIdx < usedSeats;
                                return (
                                  <div
                                    key={`top-${seatIdx}`}
                                    className={`w-4 h-4 rounded-full transition-colors ${
                                      isOccupied
                                        ? 'bg-[#C48B81] border border-[#B0776D] shadow-2xs'
                                        : 'bg-white border border-[#D2C4B4]'
                                    }`}
                                    title={`Asiento: ${isOccupied ? 'Ocupado' : 'Disponible'}`}
                                  />
                                );
                              })}
                            </div>

                            {/* Table center card */}
                            <div
                              className={`w-full h-full rounded-2xl bg-white border flex flex-col items-center justify-center px-3 py-1.5 text-center transition shadow-xs ${
                                isSelected
                                  ? 'border-[#C48B81] ring-2 ring-[#C48B81]/40 shadow-md'
                                  : 'border-[#E8DFD5] hover:border-[#C48B81]'
                              }`}
                            >
                              <span className="font-serif font-bold text-xs text-[#2B2826] leading-none">
                                #{idx + 1}
                              </span>
                              <span className="text-[9.5px] text-[#7D6F6B] truncate max-w-[120px] mt-0.5 leading-tight">
                                {table.name || 'Sin nombre'}
                              </span>
                              <span className="text-[9px] font-semibold text-[#8A7E72] mt-0.5">
                                {usedSeats}/{capacity}
                              </span>
                            </div>

                            {/* Bottom Edge Seats */}
                            <div className="absolute -bottom-2.5 left-0 right-0 flex justify-around px-3">
                              {Array.from({ length: capacity - Math.floor(capacity / 2) }).map((_, seatIdx) => {
                                const globalIdx = Math.floor(capacity / 2) + seatIdx;
                                const isOccupied = globalIdx < usedSeats;
                                return (
                                  <div
                                    key={`bot-${seatIdx}`}
                                    className={`w-4 h-4 rounded-full transition-colors ${
                                      isOccupied
                                        ? 'bg-[#C48B81] border border-[#B0776D] shadow-2xs'
                                        : 'bg-white border border-[#D2C4B4]'
                                    }`}
                                    title={`Asiento: ${isOccupied ? 'Ocupado' : 'Disponible'}`}
                                  />
                                );
                              })}
                            </div>

                            {/* Rotate button on hover */}
                            {!isLocked && isSelected && (
                              <button
                                type="button"
                                onClick={e => handleRotate(e, table)}
                                title="Girar mesa 45°"
                                className="absolute -top-3 -right-3 bg-[#C48B81] text-white p-1 rounded-full hover:bg-[#A86B60] shadow transition cursor-pointer"
                              >
                                <RotateCw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Floating Canvas Controls Toolbar (Right side) */}
                <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-[#EFE8E1] shadow-2xs p-1.5 flex flex-col items-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.1))}
                    className="p-1.5 rounded-xl text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer"
                    title="Acercar (Zoom In)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-1.5 h-16 bg-[#FAF7F5] rounded-full relative flex items-center justify-center">
                    <div
                      className="w-3.5 h-3.5 bg-white border-2 border-[#C48B81] rounded-full shadow-2xs absolute"
                      style={{
                        top: `${Math.round(((1.6 - zoomLevel) / 1.0) * 80)}%`
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
                    className="p-1.5 rounded-xl text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer"
                    title="Alejar (Zoom Out)"
                  >
                    <span className="font-bold text-xs leading-none">−</span>
                  </button>

                  <div className="w-4 h-px bg-[#EFE8E1]" />

                  {/* Hand pan tool */}
                  <button
                    type="button"
                    onClick={() => setHandToolActive(!handToolActive)}
                    className={`p-1.5 rounded-xl transition cursor-pointer ${
                      handToolActive
                        ? 'bg-[#2B2826] text-white'
                        : 'text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5]'
                    }`}
                    title="Herramienta Mano para mover lienzo"
                  >
                    <Move className="w-3.5 h-3.5" />
                  </button>

                  {/* Reset view */}
                  <button
                    type="button"
                    onClick={handleCenterCanvas}
                    className="p-1.5 rounded-xl text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer"
                    title="Restablecer vista"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Canvas Legend */}
                <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#EFE8E1] text-[11px] font-medium text-[#7D6F6B] flex items-center space-x-4 shadow-2xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C48B81]" />
                    <span>Lugar ocupado</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#D2C4B4]" />
                    <span>Lugar disponible</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2B2826]" />
                    <span>Mesa bloqueada</span>
                  </div>
                </div>

                {/* Venue Floor Plan Floating Controls (Previous configuration restored) */}
                {floorPlanUrl && (
                  <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-[#EFE8E1] text-[11px] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-[#2B2826]">
                        <ImageIcon className="w-3.5 h-3.5 text-[#C48B81]" />
                        <span>Plano Base Venue</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setFloorPlanVisible(!floorPlanVisible)}
                          className="p-1 rounded-md text-[#786C68] hover:text-[#2B2826] hover:bg-[#F2ECE7] transition cursor-pointer"
                          title={floorPlanVisible ? 'Ocultar plano' : 'Mostrar plano'}
                        >
                          {floorPlanVisible ? <Eye className="w-3.5 h-3.5 text-[#C48B81]" /> : <EyeOff className="w-3.5 h-3.5 text-stone-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFloorPlanFitMode(floorPlanFitMode === 'contain' ? 'cover' : 'contain')}
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#FAF8F5] border border-[#EFE8E1] text-[#7D6F6B] hover:bg-[#FAF8F5]"
                          title="Ajuste: Contener o Cubrir todo el lienzo"
                        >
                          {floorPlanFitMode === 'contain' ? 'Ajustar' : 'Llenar'}
                        </button>
                      </div>
                    </div>
                    {floorPlanVisible && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-[#FAF7F5]">
                        <span className="text-[9px] text-[#8A7E7A]">Opacidad:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={floorPlanOpacity}
                          onChange={e => setFloorPlanOpacity(parseFloat(e.target.value))}
                          className="w-20 accent-[#C48B81] cursor-pointer"
                        />
                        <span className="text-[9px] font-mono text-[#8A7E7A]">{Math.round(floorPlanOpacity * 100)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Extra Canvas Actions Strip */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowNewElementModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF7F5] text-[#2B2826] text-xs font-semibold rounded-xl border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Pista de Baile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFloorPlanModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF7F5] text-[#2B2826] text-xs font-semibold rounded-xl border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Configurar Plano Base</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveVersionModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF7F5] text-[#2B2826] text-xs font-semibold rounded-xl border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Guardar Versión</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Fijar Lienzo Táctil */}
                  <button
                    type="button"
                    onClick={() => setLockTouchScroll(!lockTouchScroll)}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-2xs cursor-pointer ${
                      lockTouchScroll
                        ? 'bg-[#E4ECE5] text-[#2B5235] border-[#BDD4C1]'
                        : 'bg-white hover:bg-[#FAF7F5] text-[#7D6F6B] border-[#EFE8E1]'
                    }`}
                    title="Bloquea el scroll de la página al arrastrar sobre el plano en tablets"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>{lockTouchScroll ? 'Lienzo Fijado' : 'Fijar Táctil'}</span>
                  </button>

                  {/* Modo Lienzo Amplio */}
                  <button
                    type="button"
                    onClick={() => setFullCanvasMode(!fullCanvasMode)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF7F5] text-[#7D6F6B] hover:text-[#2B2826] text-xs font-medium rounded-xl border border-[#EFE8E1] shadow-2xs transition cursor-pointer"
                  >
                    {fullCanvasMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{fullCanvasMode ? 'Mostrar Panel' : 'Lienzo Completo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Guests Sidebar */}
            {!fullCanvasMode && (
              <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#EFE8E1] shadow-2xs space-y-4">
                {/* Header */}
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

                {/* Search Bar */}
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

                {/* Filter Pills */}
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

                {/* Guest Cards List with Pastel Group Color Coding */}
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {displayGuests.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#7D6F6B]">
                      No se encontraron invitados con los filtros seleccionados.
                    </div>
                  ) : (
                    displayGuests.map((g, idx) => {
                      const palette = colorGroups
                        ? GROUP_PALETTES[idx % GROUP_PALETTES.length]
                        : {
                            bg: '#FFFFFF',
                            border: '#EFE8E1',
                            text: '#2B2826',
                            tagBg: '#FAF7F5',
                            tagText: '#7D6F6B'
                          };

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
                                className="w-6 h-6 rounded-full border border-[#D2C4B4] bg-white text-[#7D6F6B] hover:text-[#2B2826] hover:border-[#2B2826] text-[11px] font-bold flex items-center justify-center transition cursor-pointer"
                                title="Ver detalles del invitado"
                              >
                                ?
                              </button>
                            </div>
                          </div>

                          {/* Companions Subtitle */}
                          {hasCompanions && (
                            <p className="text-[10.5px] text-[#7D6F6B] leading-tight">
                              {g.observations && g.observations.toLowerCase().includes('acompañ')
                                ? g.observations
                                : `Acompaña a ${g.first_name} ${g.last_name || ''} (+${g.companion_count} persona${g.companion_count > 1 ? 's' : ''})`}
                            </p>
                          )}

                          {/* Expanded Info Drawer */}
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
                              {isAssigned && (
                                <div className="pt-1 flex items-center justify-between">
                                  <span className="text-[10px] text-[#384C3A] font-semibold">
                                    ✓ Asignado a {assignedTable?.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignGuest(g.id)}
                                    className="text-[10px] text-[#A86B60] hover:underline font-semibold cursor-pointer"
                                  >
                                    Desasignar
                                  </button>
                                </div>
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
        )
      )}

      {/* Quick Assignment Popover Modal (Image 1 reference) */}
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

            {/* Popover search input */}
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

            {/* Pill: Con espacio · X */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2B2826] text-white">
                Con espacio · {tables.filter(t => (t.capacity - (t.used_seats || 0)) >= (1 + (assigningGuest.companion_count || 0))).length}
              </span>
            </div>

            {/* Table options */}
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

            {/* Disclaimer at bottom */}
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
                      capacity: t === 'imperial' ? 14 : 10
                    });
                  }}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF7F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none cursor-pointer"
                >
                  <option value="circular">Circular (8-12 personas)</option>
                  <option value="rectangular">Rectangular (8-10 personas)</option>
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

      {/* Modal: Ayuda y Guía de Uso */}
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
                <strong className="text-[#2B2826] block">1. Lista de mesas:</strong>
                Consulta todas tus mesas, su ocupación y agrega invitados directamente desde el selector de cada mesa o descarga el PDF oficial.
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] space-y-1">
                <strong className="text-[#2B2826] block">2. Plano Base del Venue:</strong>
                En la pestaña Mapa puedes subir el PDF o imagen arquitectónica que te entrega tu salón o hacienda y calibrar su opacidad y ajuste.
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] space-y-1">
                <strong className="text-[#2B2826] block">3. Ajuste de Tamaño de Mesas:</strong>
                Usa el control deslizante <span className="font-semibold text-[#2B2826]">Tamaño mesas</span> para adaptar el diámetro y escala de las mesas para que coincidan con la escala del plano arquitectónico.
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
