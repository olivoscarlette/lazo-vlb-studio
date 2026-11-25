import React, { useRef, useState } from 'react';
import {
  Plus, MessageSquare, Trash2, Search, Users, Armchair, Map as MapIcon, LayoutList, Download, Lock,
  SlidersHorizontal, FileSpreadsheet, Upload, FileText, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../../context/AuthContext';
import { FloorElement, GuestItem, GuestStatus, TableItem } from '../types/lazo';
import { Modal } from '../components/Modal';
import { SeatingCanvas2D } from '../components/SeatingCanvas2D';
import { exportFloorPlanPdf, exportGuestsPdf } from '../utils/pdfExport';
import { buildVlbWhatsAppUrl } from '../components/VlbCoordinationModal';

export const GuestsView: React.FC<{ initialSubTab?: 'lista' | 'mesas'; mesasOnly?: boolean }> = ({
  initialSubTab,
  mesasOnly = false
}) => {
  const { wedding, flags, updateWedding } = useWedding();
  const { currentWedding, token } = useAuth();
  const canUseLayout2D = flags.isAdmin || !flags.isVirtualNovios || flags.hasLayout2d || flags.hasWhatsappRsvp;
  const [subTabState, setSubTab] = useState<'lista' | 'mesas'>(mesasOnly ? 'mesas' : (initialSubTab || 'lista'));
  const subTab = mesasOnly ? 'mesas' : subTabState;
  const [tablesView, setTablesView] = useState<'plano' | 'tarjetas'>(canUseLayout2D ? 'plano' : 'tarjetas');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | GuestStatus>('TODOS');
  const [search, setSearch] = useState('');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Guest Modal (Add & Edit)
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState({
    firstName: '',
    lastName: '',
    phone: '+52 ',
    companions: '0',
    status: 'Pendiente' as GuestStatus,
    tableId: '',
    dietary: ''
  });

  // Table Modal
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableForm, setTableForm] = useState({
    name: '',
    shape: 'Redonda' as TableItem['shape'],
    capacity: '10'
  });

  if (!wedding) return null;

  const { profile, guests, tables } = wedding;

  const totalPasses = guests.reduce((s, g) => s + g.passes, 0);
  const confirmedPasses = guests.filter(g => g.status === 'Confirmado').reduce((s, g) => s + g.passes, 0);
  const pendingPasses = guests.filter(g => g.status === 'Pendiente').reduce((s, g) => s + g.passes, 0);
  const declinedPasses = guests.filter(g => g.status === 'No asistirá').reduce((s, g) => s + g.passes, 0);

  const filteredGuests = guests.filter(g => {
    if (statusFilter !== 'TODOS' && g.status !== statusFilter) return false;
    if (search.trim() && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAddGuest = () => {
    setEditingGuestId(null);
    setGuestForm({
      firstName: '',
      lastName: '',
      phone: '+52 ',
      companions: '0',
      status: 'Pendiente',
      tableId: '',
      dietary: ''
    });
    setShowGuestModal(true);
  };

  const openEditGuest = (g: GuestItem) => {
    const parts = g.name.trim().split(/\s+/);
    const fn = g.firstName ?? parts[0] ?? '';
    const ln = g.lastName ?? parts.slice(1).join(' ');
    setEditingGuestId(g.id);
    setGuestForm({
      firstName: fn,
      lastName: ln,
      phone: g.phone || '+52 ',
      companions: String(Math.max(0, g.passes - 1)),
      status: g.status,
      tableId: g.tableId || '',
      dietary: g.dietary || ''
    });
    setShowGuestModal(true);
  };

  const handleSaveGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const fn = guestForm.firstName.trim();
    const ln = guestForm.lastName.trim();
    if (!fn) return;
    const fullName = `${fn} ${ln}`.trim();
    const companionsNum = Math.max(0, Number(guestForm.companions) || 0);
    const totalPasses = 1 + companionsNum;

    if (editingGuestId) {
      updateWedding(prev => ({
        ...prev,
        guests: prev.guests.map(g =>
          g.id === editingGuestId
            ? {
                ...g,
                name: fullName,
                firstName: fn,
                lastName: ln,
                phone: guestForm.phone.trim(),
                passes: totalPasses,
                status: guestForm.status,
                dietary: guestForm.dietary.trim()
              }
            : g
        )
      }));
    } else {
      const newG: GuestItem = {
        id: `g_${Date.now()}`,
        name: fullName,
        firstName: fn,
        lastName: ln,
        phone: guestForm.phone.trim(),
        passes: totalPasses,
        status: guestForm.status,
        dietary: guestForm.dietary.trim(),
        side: 'Ambos'
      };
      updateWedding(prev => ({ ...prev, guests: [newG, ...prev.guests] }));
    }
    setShowGuestModal(false);
    setEditingGuestId(null);
  };

  const handleStatusChange = (id: string, status: GuestStatus) => {
    updateWedding(prev => ({
      ...prev,
      guests: prev.guests.map(g => (g.id === id ? { ...g, status } : g))
    }));
  };

  const handleAssignTable = (guestId: string, tableId: string) => {
    updateWedding(prev => ({
      ...prev,
      guests: prev.guests.map(g => (g.id === guestId ? { ...g, tableId: tableId || undefined } : g))
    }));
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.name.trim()) return;
    const idx = tables.length;
    const newT: TableItem = {
      id: `tbl_${Date.now()}`,
      name: tableForm.name.trim(),
      shape: tableForm.shape,
      capacity: Math.max(2, Number(tableForm.capacity) || 10),
      x: 420 + (idx % 5) * 36,
      y: 320 + (idx % 4) * 36,
      rotation: 0
    };
    updateWedding(prev => ({ ...prev, tables: [...prev.tables, newT] }));
    setTableForm({ name: '', shape: 'Redonda', capacity: '10' });
    setShowTableModal(false);
  };

  const handleMoveTable = (id: string, x: number, y: number) => {
    updateWedding(prev => ({
      ...prev,
      tables: prev.tables.map(t => (t.id === id ? { ...t, x, y } : t))
    }));
  };

  const handleRotateTable = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      tables: prev.tables.map(t => (t.id === id ? { ...t, rotation: ((t.rotation || 0) + 45) % 360 } : t))
    }));
  };

  const handleUpdateTable = (id: string, patch: Partial<TableItem>) => {
    updateWedding(prev => ({
      ...prev,
      tables: prev.tables.map(t => (t.id === id ? { ...t, ...patch } : t))
    }));
  };

  const handleDeleteTable = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t.id !== id),
      guests: prev.guests.map(g => (g.tableId === id ? { ...g, tableId: undefined } : g))
    }));
  };

  const defaultFloorElements: FloorElement[] = wedding.floorElements ?? [
    { id: 'el_pista', type: 'pista', label: 'Pista de Baile', x: 360, y: 265, width: 148, height: 148 },
    { id: 'el_dj', type: 'dj', label: 'DJ / Escenario', x: 360, y: 430, width: 150, height: 48 }
  ];

  const handleAddFloorElement = (
    type: FloorElement['type'],
    custom?: { label: string; width: number; height: number; shape?: FloorElement['shape']; tone?: FloorElement['tone'] }
  ) => {
    const config: Record<Exclude<FloorElement['type'], 'otro'>, { label: string; w: number; h: number }> = {
      pista: { label: 'Pista de Baile', w: 148, h: 148 },
      dj: { label: 'DJ / Escenario', w: 150, h: 48 },
      barra: { label: 'Barra de Bebidas', w: 136, h: 48 },
      entrada: { label: 'Entrada Principal', w: 130, h: 42 }
    };
    const newEl: FloorElement = custom
      ? {
          id: `el_${Date.now()}`,
          type: 'otro',
          label: custom.label,
          x: 360,
          y: 220,
          width: custom.width,
          height: custom.height,
          shape: custom.shape || 'rect',
          tone: custom.tone || 'neutral'
        }
      : {
          id: `el_${Date.now()}`,
          type,
          label: config[type as Exclude<FloorElement['type'], 'otro'>].label,
          x: 360,
          y: 190,
          width: config[type as Exclude<FloorElement['type'], 'otro'>].w,
          height: config[type as Exclude<FloorElement['type'], 'otro'>].h
        };
    updateWedding(prev => ({
      ...prev,
      floorElements: [...(prev.floorElements ?? defaultFloorElements), newEl]
    }));
  };

  const handleMoveFloorElement = (id: string, x: number, y: number) => {
    updateWedding(prev => ({
      ...prev,
      floorElements: (prev.floorElements ?? defaultFloorElements).map(el =>
        el.id === id ? { ...el, x, y } : el
      )
    }));
  };

  const handleResizeFloorElement = (id: string, width: number, height: number) => {
    const safeW = Math.max(24, Math.min(1300, Math.round(width)));
    const safeH = Math.max(16, Math.min(920, Math.round(height)));
    updateWedding(prev => ({
      ...prev,
      floorElements: (prev.floorElements ?? defaultFloorElements).map(el =>
        el.id === id ? { ...el, width: safeW, height: safeH } : el
      )
    }));
  };

  const handleRotateFloorElement = (id: string, rotation: number) => {
    const norm = ((Math.round(rotation) % 360) + 360) % 360;
    updateWedding(prev => ({
      ...prev,
      floorElements: (prev.floorElements ?? defaultFloorElements).map(el =>
        el.id === id ? { ...el, rotation: norm } : el
      )
    }));
  };

  const handleDeleteFloorElement = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      floorElements: (prev.floorElements ?? defaultFloorElements).filter(el => el.id !== id)
    }));
  };

  const buildWhatsAppLink = (g: GuestItem) => {
    let clean = g.phone.replace(/\D/g, '');
    if (clean.length === 10) clean = `52${clean}`;
    const eventTypeRaw = (profile.eventType || 'Boda Completa').trim();
    const etLower = eventTypeRaw.toLowerCase();
    const hostDisplay = profile.partner2?.trim()
      ? `${profile.partner1} y ${profile.partner2}`
      : profile.partner1;
    const passesText = g.passes === 1 ? '1 lugar' : `${g.passes} lugares`;

    let msg = '';
    if (etLower.includes('despedida')) {
      msg = `Hola ${g.name}, qué emoción invitarte a la despedida de soltera de ${hostDisplay}. Hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás acompañarnos a celebrar?`;
    } else if (etLower.includes('xv') || etLower.includes('quince')) {
      msg = `Hola ${g.name}, nos encantaría celebrar contigo los XV años de ${hostDisplay}. Hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás acompañarnos?`;
    } else if (etLower.includes('baby')) {
      msg = `Hola ${g.name}, qué alegría invitarte al baby shower de ${hostDisplay}. Hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás acompañarnos a celebrar?`;
    } else if (etLower.includes('bautizo')) {
      msg = `Hola ${g.name}, nos haría muy felices compartir contigo el bautizo de ${hostDisplay}. Hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás acompañarnos?`;
    } else if (etLower.includes('aniversario')) {
      msg = `Hola ${g.name}, qué alegría invitarte a celebrar el aniversario de ${hostDisplay}. Hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás acompañarnos?`;
    } else if (etLower.includes('cumple')) {
      msg = `Hola ${g.name}, nos encantaría celebrar contigo el cumpleaños de ${hostDisplay}. Hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás acompañarnos?`;
    } else if (etLower.includes('boda')) {
      msg = `Hola ${g.name}, qué alegría invitarte a nuestra boda. Somos ${hostDisplay} y hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás acompañarnos en este día tan especial?`;
    } else {
      msg = `Hola ${g.name}, nos encantaría que nos acompañes en ${eventTypeRaw.toLowerCase()} de ${hostDisplay}. Hemos reservado ${passesText} especialmente para ti. ¿Nos confirmas si podrás asistir?`;
    }

    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  // ==================== HERRAMIENTAS EXCEL (PLANTILLA, IMPORTAR, EXPORTAR) ====================
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        Nombre: 'Sofía',
        Apellido: 'Garza',
        WhatsApp: '+52 81 1234 5678',
        Acompañantes: 1,
        Estatus: 'Pendiente',
        Observaciones: 'Vegetariana'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Invitados');
    XLSX.writeFile(wb, 'Plantilla_Invitados_Lazo.xlsx');
    setShowToolsMenu(false);
  };

  const handleExportFullExcel = () => {
    const tableMap = new Map(tables.map(t => [t.id, t.name]));
    const rows = guests.map(g => {
      const parts = g.name.trim().split(/\s+/);
      return {
        Nombre: g.firstName || parts[0] || g.name,
        Apellido: g.lastName ?? parts.slice(1).join(' '),
        WhatsApp: g.phone || '',
        Acompañantes: Math.max(0, g.passes - 1),
        'Total Lugares': g.passes,
        Estatus: g.status,
        Mesa: g.tableId ? tableMap.get(g.tableId) || '' : 'Sin asignar',
        Observaciones: g.dietary || ''
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 20 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista Completa');
    XLSX.writeFile(wb, `Lista_Invitados_${profile.partner1}_${profile.partner2}.xlsx`);
    setShowToolsMenu(false);
  };

  const handleExportConfirmedTablesExcel = () => {
    const tableMap = new Map(tables.map(t => [t.id, t.name]));
    const confirmed = guests
      .filter(g => g.status === 'Confirmado')
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const rows = confirmed.map(g => ({
      Invitado: g.name,
      Lugares: g.passes,
      Mesa: g.tableId ? tableMap.get(g.tableId) || 'Sin asignar' : 'Sin asignar',
      Observaciones: g.dietary || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Invitado: 'Sin confirmados aún', Lugares: 0, Mesa: '', Observaciones: '' }]);
    ws['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 22 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia y Mesas');
    XLSX.writeFile(wb, `Asistencia_Mesas_${profile.partner1}_${profile.partner2}.xlsx`);
    setShowToolsMenu(false);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        const pick = (row: Record<string, any>, keys: string[]) => {
          const entries = Object.entries(row);
          for (const k of keys) {
            const match = entries.find(([ek]) =>
              ek.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(k)
            );
            if (match && String(match[1]).trim() !== '') return String(match[1]).trim();
          }
          return '';
        };

        const imported: GuestItem[] = [];
        rawRows.forEach((row, idx) => {
          const fn = pick(row, ['nombre', 'first', 'invitado']);
          const ln = pick(row, ['apellido', 'last']);
          const fullName = `${fn} ${ln}`.trim();
          if (!fullName) return;

          const phone = pick(row, ['whatsapp', 'telefono', 'tel', 'cel', 'phone']);
          const compStr = pick(row, ['acompanante', 'companion', 'extra']);
          const passesStr = pick(row, ['pase', 'lugar', 'total']);
          let passes = 1;
          if (compStr !== '' && !isNaN(Number(compStr))) {
            passes = Math.max(1, 1 + Math.max(0, Math.round(Number(compStr))));
          } else if (passesStr !== '' && !isNaN(Number(passesStr))) {
            passes = Math.max(1, Math.round(Number(passesStr)));
          }

          const rawStatus = pick(row, ['estatus', 'status', 'estado']).toLowerCase();
          const status: GuestStatus =
            rawStatus.includes('confirm') && !rawStatus.includes('pend')
              ? 'Confirmado'
              : rawStatus.includes('no') || rawStatus.includes('declin') || rawStatus.includes('cancel')
              ? 'No asistirá'
              : 'Pendiente';

          const dietary = pick(row, ['observacion', 'alergia', 'nota', 'diet', 'restriccion']);

          imported.push({
            id: `g_imp_${Date.now()}_${idx}`,
            name: fullName,
            firstName: fn || fullName.split(/\s+/)[0],
            lastName: ln || fullName.split(/\s+/).slice(1).join(' '),
            phone,
            passes,
            status,
            dietary,
            side: 'Ambos'
          });
        });

        if (imported.length === 0) {
          setImportFeedback('No se encontraron filas válidas en el archivo. Usa la plantilla oficial.');
        } else {
          updateWedding(prev => ({ ...prev, guests: [...imported, ...prev.guests] }));
          setImportFeedback(`✓ ${imported.length} ${imported.length === 1 ? 'invitado importado' : 'invitados importados'} correctamente.`);
        }
        setTimeout(() => setImportFeedback(null), 5000);
      } catch (err) {
        console.error('Excel import error:', err);
        setImportFeedback('No se pudo leer el archivo Excel. Verifica que sea .xlsx o .csv.');
        setTimeout(() => setImportFeedback(null), 5000);
      } finally {
        e.target.value = '';
        setShowToolsMenu(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearGuestList = () => {
    setShowToolsMenu(false);
    if (guests.length === 0) return;
    if (!window.confirm(`¿Seguro que deseas eliminar los ${guests.length} invitados de tu lista permanentemente?`)) {
      return;
    }
    updateWedding(prev => ({ ...prev, guests: [] }));
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#7D6F6B]">
            {mesasOnly ? 'Distribución & Plano 2D' : 'Cortesía & Asistencia'}
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-0.5">
            {mesasOnly ? 'Acomodo de Mesas' : 'Invitados & Mesas'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subTab === 'mesas' ? (
            <>
              {mesasOnly && (
                <div className="inline-flex items-center p-1 bg-white rounded-full border border-[#EFE8E1] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setTablesView('plano')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                      tablesView === 'plano' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
                    }`}
                  >
                    {canUseLayout2D ? <MapIcon className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3 text-[#C48B81]" />}
                    <span>Plano 2D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTablesView('tarjetas')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                      tablesView === 'tarjetas' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span>Vista Lista</span>
                  </button>
                </div>
              )}
              {canUseLayout2D && (
                <button
                  type="button"
                  onClick={() => exportFloorPlanPdf(profile, tables, guests, defaultFloorElements)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium shadow-2xs transition cursor-pointer"
                  title="Descargar Plano 2D y Mesas en PDF"
                >
                  <Download className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>PDF Plano</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowTableModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Mesa</span>
              </button>
            </>
          ) : (
            <>
              {/* Hidden Excel File Input */}
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel}
                className="hidden"
              />

              {/* Dropdown Herramientas (Excel, Plantilla, Importar, PDF, Vaciar) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#E5D5CE] text-xs font-medium shadow-2xs transition cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Herramientas</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#7D6F6B] transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
                </button>

                {showToolsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowToolsMenu(false)}
                    />
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-xl border border-[#EFE8E1] p-2 z-40">
                      <div className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B]">
                        Archivos y Listas
                      </div>

                      <div className="divide-y divide-[#FAF8F5]">
                        <button
                          type="button"
                          onClick={handleExportConfirmedTablesExcel}
                          className="w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-[#FAF8F5] rounded-2xl transition cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-[#C48B81] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-[#2B2826]">Asistencia y Mesas (Excel)</p>
                            <p className="text-[11px] text-[#7D6F6B] font-light">Confirmados en orden A–Z con mesa</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportFullExcel}
                          className="w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-[#FAF8F5] rounded-2xl transition cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-[#7D6F6B] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-[#2B2826]">Lista Completa (.xlsx)</p>
                            <p className="text-[11px] text-[#7D6F6B] font-light">Todos los invitados y estatus</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowToolsMenu(false);
                            exportGuestsPdf(profile, guests, tables);
                          }}
                          className="w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-[#FAF8F5] rounded-2xl transition cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-[#7D6F6B] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-[#2B2826]">Descargar Lista en PDF</p>
                            <p className="text-[11px] text-[#7D6F6B] font-light">Formato editorial con alergias</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          className="w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-[#FAF8F5] rounded-2xl transition cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-[#C48B81] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-[#2B2826]">Descargar plantilla vacía</p>
                            <p className="text-[11px] text-[#7D6F6B] font-light">Formato oficial para importar</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => excelInputRef.current?.click()}
                          className="w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-[#FAF8F5] rounded-2xl transition cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-[#C48B81] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-[#2B2826]">Importar archivo Excel</p>
                            <p className="text-[11px] text-[#7D6F6B] font-light">Cargar lista desde archivo (.xlsx / .csv)</p>
                          </div>
                        </button>
                      </div>

                      <div className="mt-1 pt-2 border-t border-[#EFE8E1]">
                        <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.16em] font-semibold text-[#A86B60]">
                          Zona de Gestión
                        </div>
                        <button
                          type="button"
                          onClick={handleClearGuestList}
                          className="w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-rose-50 rounded-2xl transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-rose-700">Vaciar lista de invitados</p>
                            <p className="text-[11px] text-rose-600/80 font-light">Eliminar todos los invitados permanentemente</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={openAddGuest}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Invitado</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-Tabs Pill (only shown when not mesasOnly) */}
      {!mesasOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center p-1 bg-white rounded-full border border-[#EFE8E1] w-fit shadow-2xs">
            <button
              onClick={() => setSubTab('lista')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                subTab === 'lista' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
              }`}
            >
              Lista ({totalPasses} pases)
            </button>
            <button
              onClick={() => setSubTab('mesas')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                subTab === 'mesas' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
              }`}
            >
              Mesas ({tables.length})
            </button>
          </div>

          {subTab === 'mesas' && (
            <div className="inline-flex items-center p-1 bg-white rounded-full border border-[#EFE8E1] shadow-2xs">
              <button
                type="button"
                onClick={() => setTablesView('plano')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  tablesView === 'plano' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
                }`}
              >
                {canUseLayout2D ? <MapIcon className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3 text-[#C48B81]" />}
                <span>Plano 2D</span>
              </button>
              <button
                type="button"
                onClick={() => setTablesView('tarjetas')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  tablesView === 'tarjetas' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Vista Lista</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: LISTA DE INVITADOS */}
      {subTab === 'lista' && (
        <div className="space-y-4">
          {importFeedback && (
            <div className="bg-[#FAF8F5] border border-[#C48B81]/50 rounded-2xl px-4 py-3 text-xs text-[#2B2826] font-medium">
              {importFeedback}
            </div>
          )}
          {/* Informational Banner when Automated WhatsApp RSVP is active (VLB triggers via Meta) */}
          {flags.hasWhatsappRsvp && (
            <div className="bg-[#E5EDE6]/60 border border-[#D0DDD1] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-[#384C3A]">
              <span>
                <strong>✓ Envío automatizado de invitaciones activo.</strong> Las confirmaciones por WhatsApp se actualizan automáticamente en tiempo real en esta lista.
              </span>
            </div>
          )}

          {/* 4 Clickable KPI Filter Cards (Zero Redundancy) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'TODOS' as const, label: 'Total', value: totalPasses, sub: 'Personas', color: 'text-[#2B2826]' },
              { key: 'Confirmado' as const, label: 'Confirmados', value: confirmedPasses, sub: 'Asistirán', color: 'text-[#455C44]' },
              { key: 'Pendiente' as const, label: 'Pendientes', value: pendingPasses, sub: 'Por confirmar', color: 'text-[#2B2826]' },
              { key: 'No asistirá' as const, label: 'Declinados', value: declinedPasses, sub: 'No asistirán', color: 'text-[#A86B60]' }
            ].map(kpi => {
              const active = statusFilter === kpi.key;
              return (
                <button
                  key={kpi.key}
                  onClick={() => setStatusFilter(kpi.key)}
                  className={`text-left rounded-2xl p-4 border transition cursor-pointer ${
                    active
                      ? 'bg-white border-[#E5D5CE] shadow-sm'
                      : 'bg-[#FAF8F5] border-[#EFE8E1] hover:bg-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#7D6F6B]">
                      {kpi.label}
                    </span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81]" />}
                  </div>
                  <div className={`font-editorial text-3xl mt-1 ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[11px] text-[#7D6F6B] font-light">{kpi.sub}</div>
                </button>
              );
            })}
          </div>

          {/* Clean Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
            <input
              type="text"
              placeholder="Buscar invitado por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
            />
          </div>

          {/* Mobile-First Guest Cards */}
          {filteredGuests.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#EFE8E1] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center mx-auto text-[#C48B81]">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl text-[#2B2826]">Tu lista de invitados</h3>
              <p className="text-xs text-[#7D6F6B] max-w-sm mx-auto font-light">
                Agrega a tus invitados para llevar pases, alergias y confirmar asistencia con 1 clic por WhatsApp.
              </p>
              <button
                onClick={openAddGuest}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar primer invitado</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredGuests.map(g => {
                const assignedTable = tables.find(t => t.id === g.tableId);
                return (
                  <div
                    key={g.id}
                    onClick={() => openEditGuest(g)}
                    className="bg-white rounded-2xl p-4 border border-[#EFE8E1] hover:border-[#C48B81]/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition cursor-pointer group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm text-[#2B2826] group-hover:text-[#A86B60] transition-colors">
                          {g.name}
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] text-[#5A524C]">
                          {g.passes} {g.passes === 1 ? 'lugar' : 'lugares'}
                        </span>
                        {assignedTable && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7EDEB] text-[#A86B60]">
                            {assignedTable.name}
                          </span>
                        )}
                        {flags.hasWhatsappRsvp && g.whatsappStatus && g.whatsappStatus !== 'NO_ENVIADO' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EDE6] text-[#384C3A] border border-[#D0DDD1]">
                            WA: {g.whatsappStatus.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        )}
                      </div>
                      {g.dietary && (
                        <p className="text-[11px] text-[#7D6F6B] font-light">{g.dietary}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={e => e.stopPropagation()}>
                      <select
                        value={g.status}
                        onChange={e => handleStatusChange(g.id, e.target.value as GuestStatus)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border focus:outline-none cursor-pointer ${
                          g.status === 'Confirmado'
                            ? 'bg-[#E5EDE6] text-[#384C3A] border-[#D0DDD1]'
                            : g.status === 'No asistirá'
                            ? 'bg-[#FAF4F3] text-[#A86B60] border-[#EEDAD6]'
                            : 'bg-[#FAF8F5] text-[#7D6F6B] border-[#EFE8E1]'
                        }`}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="No asistirá">No asistirá</option>
                      </select>

                      {!flags.hasWhatsappRsvp && g.phone && (
                        <a
                          href={buildWhatsAppLink(g)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-full bg-[#E5EDE6] hover:bg-[#D5E3D7] text-[#384C3A] transition"
                          title="Enviar confirmación manual por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => updateWedding(prev => ({ ...prev, guests: prev.guests.filter(x => x.id !== g.id) }))}
                        className="p-2 rounded-full text-[#7D6F6B]/50 hover:text-rose-600 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: MESAS — PLANO 2D INTERACTIVO + VISTA LISTA */}
      {subTab === 'mesas' && (
        <div className="space-y-3">
          {tablesView === 'plano' && !canUseLayout2D ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#EFE8E1] shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center mx-auto text-[#C48B81]">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#C48B81] block">
                Exclusivo Lazo Pro
              </span>
              <h3 className="font-editorial text-2xl text-[#2B2826]">Plano 2D Interactivo de Mesas</h3>
              <p className="text-xs text-[#7D6F6B] max-w-md mx-auto font-light leading-relaxed">
                Diseña tu salón en 2D con mesas redondas, imperiales y serpentina, pista de baile, alberca y elementos a escala, además de envío automatizado de invitaciones por WhatsApp.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <a
                  href={buildVlbWhatsAppUrl(profile, 'Subir a Lazo Pro (Plano 2D + Envío Automatizado RSVP)')}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Activar Lazo Pro por WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setTablesView('tarjetas')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium cursor-pointer"
                >
                  <span>Volver a Vista Lista</span>
                </button>
              </div>
            </div>
          ) : tablesView === 'plano' ? (
            <SeatingCanvas2D
              weddingId={currentWedding?.id}
              authToken={token}
              floorPlanUrl={profile.floorPlanUrl || ''}
              onFloorPlanChange={nextUrl =>
                updateWedding(prev => ({
                  ...prev,
                  profile: { ...prev.profile, floorPlanUrl: nextUrl }
                }))
              }
              tables={tables}
              guests={guests}
              floorElements={defaultFloorElements}
              onMoveTable={handleMoveTable}
              onRotateTable={handleRotateTable}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
              onAssignGuest={handleAssignTable}
              onAddElement={handleAddFloorElement}
              onMoveElement={handleMoveFloorElement}
              onResizeElement={handleResizeFloorElement}
              onRotateElement={handleRotateFloorElement}
              onDeleteElement={handleDeleteFloorElement}
              onOpenNewTable={() => setShowTableModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tables.map(table => {
                const seatedGuests = guests.filter(g => g.tableId === table.id);
                const usedSeats = seatedGuests.reduce((s, g) => s + g.passes, 0);
                const unassigned = guests.filter(g => !g.tableId && g.status !== 'No asistirá');

                return (
                  <div key={table.id} className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between pb-3 border-b border-[#FAF8F5]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center text-[#C48B81]">
                          <Armchair className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-editorial text-lg text-[#2B2826]">{table.name}</h4>
                          <span className="text-[11px] text-[#7D6F6B] font-light">{table.shape}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${
                          usedSeats > table.capacity
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-[#FAF8F5] text-[#5A524C] border-[#EFE8E1]'
                        }`}>
                          {usedSeats} / {table.capacity}
                        </span>
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="text-[#7D6F6B]/50 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {seatedGuests.length === 0 ? (
                      <p className="text-xs text-[#7D6F6B] italic font-light py-2">Sin invitados asignados aún.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {seatedGuests.map(g => (
                          <div key={g.id} className="flex items-center justify-between text-xs bg-[#FAF8F5] px-3 py-2 rounded-xl">
                            <span className="text-[#2B2826]">{g.name} ({g.passes})</span>
                            <button
                              onClick={() => handleAssignTable(g.id, '')}
                              className="text-[11px] text-[#A86B60] hover:underline cursor-pointer"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {unassigned.length > 0 && (
                      <select
                        value=""
                        onChange={e => e.target.value && handleAssignTable(e.target.value, table.id)}
                        className="w-full px-3 py-2 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] text-xs text-[#5A524C] cursor-pointer focus:outline-none"
                      >
                        <option value="">+ Sentar invitado en esta mesa...</option>
                        {unassigned.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.passes} {g.passes === 1 ? 'lugar' : 'lugares'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Nuevo / Editar Invitado (Estructura exacta solicitada) */}
      <Modal
        isOpen={showGuestModal}
        onClose={() => {
          setShowGuestModal(false);
          setEditingGuestId(null);
        }}
        title={editingGuestId ? 'Editar Invitado' : 'Nuevo Invitado'}
        subtitle="REGISTRO DE INVITADO"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSaveGuest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">Nombre *</label>
              <input
                type="text"
                required
                autoFocus
                value={guestForm.firstName}
                onChange={e => setGuestForm({ ...guestForm, firstName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#EFE8E1] text-sm text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">Apellido *</label>
              <input
                type="text"
                required
                value={guestForm.lastName}
                onChange={e => setGuestForm({ ...guestForm, lastName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#EFE8E1] text-sm text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">
              WhatsApp / Teléfono (con código de país) *
            </label>
            <input
              type="tel"
              required
              value={guestForm.phone}
              onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#EFE8E1] text-sm text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#2B2826] mb-1.5"># Acompañantes</label>
              <input
                type="number"
                min={0}
                value={guestForm.companions}
                onChange={e => setGuestForm({ ...guestForm, companions: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#EFE8E1] text-sm text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
              />
              <span className="block text-[11px] text-[#7D6F6B] mt-1 font-light">
                Total: {1 + Math.max(0, Number(guestForm.companions) || 0)}{' '}
                {1 + Math.max(0, Number(guestForm.companions) || 0) === 1 ? 'lugar' : 'lugares'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">Estatus</label>
              <select
                value={guestForm.status}
                onChange={e => setGuestForm({ ...guestForm, status: e.target.value as GuestStatus })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#EFE8E1] text-sm text-[#2B2826] focus:outline-none focus:border-[#C48B81] cursor-pointer"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Confirmado">Confirmado</option>
                <option value="No asistirá">No asistirá</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">Mesa Asignada</label>
            <div className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#A86B60]">
                {guestForm.tableId
                  ? tables.find(t => t.id === guestForm.tableId)?.name || 'Mesa asignada'
                  : 'Sin mesa asignada'}
              </span>
              <span className="italic text-[#7D6F6B] font-light">(Asignar en pestaña Mesas)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">Observaciones</label>
            <textarea
              rows={3}
              placeholder="Restricciones alimentarias, detalles de transporte, etc."
              value={guestForm.dietary}
              onChange={e => setGuestForm({ ...guestForm, dietary: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#EFE8E1] text-sm text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setShowGuestModal(false);
                setEditingGuestId(null);
              }}
              className="px-4 py-2.5 text-xs font-medium text-[#5A524C] hover:text-[#2B2826] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-7 py-2.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold uppercase tracking-widest shadow-2xs transition cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nueva Mesa */}
      <Modal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        title="Nueva Mesa"
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleSaveTable} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Ej. Mesa 2 · Amigos"
            value={tableForm.name}
            onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={tableForm.shape}
              onChange={e => {
                const nextShape = e.target.value as TableItem['shape'];
                setTableForm({
                  ...tableForm,
                  shape: nextShape,
                  capacity: nextShape === 'Serpentina (S)' ? '16' : nextShape === 'Cuadrada' ? '8' : tableForm.capacity
                });
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
            >
              <option value="Redonda">Redonda</option>
              <option value="Cuadrada">Cuadrada</option>
              <option value="Rectangular">Rectangular</option>
              <option value="Imperial">Imperial</option>
              <option value="Serpentina (S)">Serpentina (S)</option>
            </select>
            <input
              type="number"
              min={2}
              value={tableForm.capacity}
              onChange={e => setTableForm({ ...tableForm, capacity: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setShowTableModal(false)} className="px-4 py-2 text-xs text-[#7D6F6B] cursor-pointer">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer">
              Crear Mesa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
