import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, LayoutElement, LayoutVersion, Guest } from '../types';
import {
  Plus, RotateCw, Trash2, Save, History,
  Lock, AlertTriangle, Move, Eye, Layers, Image as ImageIcon
} from 'lucide-react';

export const MesasLayoutModule: React.FC = () => {
  const { currentWedding, token, user, refreshWedding } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [versions, setVersions] = useState<LayoutVersion[]>([]);
  const [, setLoading] = useState(true);

  // Active selected table for assignment drawer
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Dragging state on visual canvas
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'table' | 'element' | null>(null);

  // Reference Venue Floor Plan Image
  const [floorPlanUrl, setFloorPlanUrl] = useState<string>(currentWedding?.floor_plan_url || '');
  const [floorPlanOpacity, setFloorPlanOpacity] = useState<number>(0.35);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);

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
    width: 160,
    height: 160
  });

  // Save Version Modal
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [versionName, setVersionName] = useState('');

  // 5-Day Lock Check
  const isLockedForNovios = () => {
    if (user?.role !== 'NOVIOS') return false;
    if (!currentWedding?.wedding_date) return false;
    const weddingDate = new Date(currentWedding.wedding_date);
    const today = new Date();
    weddingDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  };

  const isLocked = isLockedForNovios();

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

  // Keep selected table updated
  useEffect(() => {
    if (selectedTable) {
      const updated = tables.find(t => t.id === selectedTable.id);
      if (updated) setSelectedTable(updated);
      else setSelectedTable(null);
    }
  }, [tables]);

  // Drag and drop handlers on visual canvas
  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'table' | 'element') => {
    if (isLocked) return;
    setDraggingId(id);
    setDragType(type);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !dragType || isLocked) return;
    const canvas = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(20, Math.min(canvas.width - 120, e.clientX - canvas.left - dragOffset.x));
    const newY = Math.max(20, Math.min(canvas.height - 120, e.clientY - canvas.top - dragOffset.y));

    if (dragType === 'table') {
      setTables(prev => prev.map(t => t.id === draggingId ? { ...t, x: Math.round(newX), y: Math.round(newY) } : t));
    } else {
      setElements(prev => prev.map(el => el.id === draggingId ? { ...el, x: Math.round(newX), y: Math.round(newY) } : el));
    }
  };

  const handleMouseUp = async () => {
    if (!draggingId || !dragType || isLocked) {
      setDraggingId(null);
      setDragType(null);
      return;
    }

    const currentId = draggingId;
    const type = dragType;
    setDraggingId(null);
    setDragType(null);

    // Persist position to backend
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

  // Rotate Imperial or Rectangular table
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

  // Rotate Custom Layout Element
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

  // Delete Custom Layout Element
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

  // Delete Table
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

  // Save Floor Plan Reference Image
  const handleSaveFloorPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding || isLocked) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ floor_plan_url: floorPlanUrl || null })
      });
      if (res.ok) {
        setShowFloorPlanModal(false);
        await refreshWedding();
      }
    } catch {}
  };

  const handleFloorPlanFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFloorPlanUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTableData)
      });
      if (res.ok) {
        setShowNewTableModal(false);
        setNewTableData({ name: '', type: 'circular', capacity: 10 });
        await fetchLayoutData();
      }
    } catch {}
  };

  // Add Element
  const handleCreateElement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/tables/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newElementData)
      });
      if (res.ok) {
        setShowNewElementModal(false);
        await fetchLayoutData();
      }
    } catch {}
  };

  // Assign Guest to Table
  const handleAssignGuest = async (guestId: string, tableId: string) => {
    if (isLocked) return;
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/guests/${guestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ table_id: tableId })
      });
      await fetchLayoutData();
    } catch {}
  };

  // Unassign Guest from Table
  const handleUnassignGuest = async (guestId: string) => {
    if (isLocked) return;
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/guests/${guestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ table_id: null })
      });
      await fetchLayoutData();
    } catch {}
  };

  // Save Version
  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/tables/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: versionName.trim() })
      });
      if (res.ok) {
        setShowSaveVersionModal(false);
        setVersionName('');
        await fetchVersions();
        alert('Versión de layout guardada exitosamente.');
      }
    } catch {}
  };

  // Restore Version
  const handleRestoreVersion = async (versionId: string) => {
    if (isLocked) return;
    if (!confirm('¿Deseas restaurar esta versión? El plano actual será reemplazado por la versión seleccionada.')) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/tables/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchLayoutData();
        alert('Versión restaurada correctamente.');
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* 5-Day Lock Alert Banner for Novios */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start space-x-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sm">Bloqueo Operativo Activo (5 días antes del evento)</h4>
            <p className="mt-0.5 text-amber-800">
              De acuerdo con las políticas de VLB Studio, las mesas y el layout están congelados para cambios directos de los novios. Si requieres reacomodos o ajustes de último momento, por favor comunícate directamente con tu Coordinador(a) asignada.
            </p>
          </div>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Distribución del Salón
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Mesas y Layout Visual
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isLocked && (
            <>
              <button
                onClick={() => setShowNewTableModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Mesa</span>
              </button>
              <button
                onClick={() => setShowNewElementModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition"
              >
                <Layers className="w-3.5 h-3.5 text-stone-500" />
                <span>Pista / Escenario</span>
              </button>
              <button
                onClick={() => setShowFloorPlanModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition"
              >
                <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                <span>Plano Base del Lugar</span>
              </button>
              <button
                onClick={() => setShowSaveVersionModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition"
              >
                <Save className="w-3.5 h-3.5 text-stone-500" />
                <span>Guardar Versión</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Visual Interactive Canvas Area */}
        <div className="lg:col-span-3">
          <div
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-[620px] bg-[#F9F6F2] rounded-3xl border-2 border-[#DDD2C4] relative overflow-hidden select-none shadow-inner"
            style={{
              backgroundImage: 'radial-gradient(#D2C4B4 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* Optional Reference Venue Floor Plan Image */}
            {floorPlanUrl && (
              <img
                src={floorPlanUrl}
                alt="Plano de referencia del lugar"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ opacity: floorPlanOpacity }}
              />
            )}

            {/* Legend / Status Overlay */}
            <div className="absolute top-4 left-4 z-10 bg-[#FFFFFF]/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#DDD2C4] text-[11px] space-y-1 shadow-xs">
              <div className="font-semibold text-[#332C2A] flex items-center space-x-1.5 pointer-events-none">
                <Move className="w-3.5 h-3.5 text-[#A6736E]" />
                <span>{isLocked ? 'Modo Solo Lectura' : 'Arrastra mesas para acomodar'}</span>
              </div>
              <div className="text-[#786C68] text-[10px] pointer-events-none">
                {tables.length} mesas · {tables.reduce((acc, t) => acc + (t.used_seats || 0), 0)} lugares asignados
              </div>
              {floorPlanUrl && (
                <div className="pt-1 border-t border-[#EFE8DE] flex items-center space-x-2">
                  <span className="text-[10px] text-[#786C68]">Opacidad Plano:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={floorPlanOpacity}
                    onChange={e => setFloorPlanOpacity(parseFloat(e.target.value))}
                    className="w-20 accent-[#A6736E]"
                  />
                </div>
              )}
            </div>

            {/* Render Layout Elements (Pista de baile, escenario, etc.) */}
            {elements.map(el => (
              <div
                key={el.id}
                onMouseDown={e => handleMouseDown(e, el.id, 'element')}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  transform: `rotate(${el.rotation}deg)`
                }}
                className={`absolute rounded-2xl flex flex-col items-center justify-center border-2 border-dashed font-serif font-bold text-xs uppercase tracking-wider shadow-xs transition-shadow group ${
                  el.type === 'pista_baile'
                    ? 'bg-[#EFE8DE]/85 border-[#B59F84] text-[#332C2A]'
                    : 'bg-[#EFE2DF]/85 border-[#A6736E] text-[#332C2A]'
                } ${isLocked ? 'cursor-default' : 'cursor-move hover:shadow-md'}`}
              >
                <span>{el.name}</span>
                <span className="text-[9px] font-sans opacity-75 mt-0.5">({el.type.replace('_', ' ')})</span>
                {!isLocked && (
                  <div className="absolute -top-2 -right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={e => handleRotateElement(e, el)}
                      title="Girar elemento 45°"
                      className="bg-[#A6736E] text-white p-1 rounded-full hover:bg-[#885853] shadow"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={e => handleDeleteElement(e, el.id)}
                      title="Eliminar elemento"
                      className="bg-[#885853] text-white p-1 rounded-full hover:bg-[#6E4541] shadow"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Render Tables (Circular, Rectangular, Imperial) */}
            {tables.map(table => {
              const isSelected = selectedTable?.id === table.id;
              const isOver = (table.used_seats || 0) > table.capacity;

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  onMouseDown={e => handleMouseDown(e, table.id, 'table')}
                  style={{
                    left: `${table.x}px`,
                    top: `${table.y}px`,
                    transform: `rotate(${table.rotation}deg)`
                  }}
                  className={`absolute p-3 flex flex-col items-center justify-center transition-all ${
                    isLocked ? 'cursor-pointer' : 'cursor-move'
                  } ${
                    table.type === 'circular'
                      ? 'w-32 h-32 rounded-full'
                      : table.type === 'imperial'
                      ? 'w-48 h-24 rounded-2xl'
                      : 'w-40 h-28 rounded-2xl'
                  } ${
                    isSelected
                      ? 'ring-4 ring-[#A6736E] shadow-xl'
                      : 'shadow-md hover:shadow-lg'
                  } ${
                    isOver
                      ? 'bg-[#F5ECEB] border-2 border-[#885853] text-[#6E4541]'
                      : table.type === 'imperial'
                      ? 'bg-[#EFE2DF] border-2 border-[#A6736E] text-[#332C2A]'
                      : 'bg-[#FFFFFF] border-2 border-[#DDD2C4] text-[#332C2A]'
                  }`}
                >
                  <div className="font-serif font-bold text-xs text-center leading-tight truncate px-1">
                    {table.name}
                  </div>
                  <div className="text-[10px] font-sans mt-0.5 font-semibold text-[#786C68]">
                    {table.used_seats || 0} / {table.capacity} pax
                  </div>

                  {isOver && (
                    <div className="text-[9px] text-[#885853] font-bold uppercase mt-0.5 flex items-center space-x-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Sobrecupo</span>
                    </div>
                  )}

                  {/* Rotate button for Imperial or Rectangular */}
                  {(table.type === 'imperial' || table.type === 'rectangular') && !isLocked && (
                    <button
                      onClick={e => handleRotate(e, table)}
                      title="Girar mesa 45°"
                      className="absolute -top-2 -right-2 bg-[#A6736E] text-white p-1 rounded-full hover:bg-[#885853] shadow transition"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Table Details & Guest Assignment Drawer */}
        <div className="space-y-4">
          {selectedTable ? (
            <div className="luxury-card rounded-2xl p-5 border border-stone-200">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400">Detalles de Mesa</span>
                  <h3 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                    {selectedTable.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                    {selectedTable.type}
                  </span>
                  {!isLocked && (
                    <button
                      onClick={() => handleDeleteTable(selectedTable.id)}
                      title="Eliminar mesa"
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Capacity Progress */}
              <div className="mt-3">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Lugares Utilizados:</span>
                  <span className={(selectedTable.used_seats || 0) > selectedTable.capacity ? 'text-rose-600 font-bold' : 'text-stone-800'}>
                    {selectedTable.used_seats || 0} / {selectedTable.capacity}
                  </span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      (selectedTable.used_seats || 0) > selectedTable.capacity
                        ? 'bg-rose-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round(((selectedTable.used_seats || 0) / selectedTable.capacity) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Assigned Guests List */}
              <div className="mt-4">
                <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2">
                  Invitados en esta Mesa ({selectedTable.guests?.length || 0}):
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedTable.guests && selectedTable.guests.length > 0 ? (
                    selectedTable.guests.map(g => (
                      <div
                        key={g.id}
                        className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-stone-900">{g.first_name} {g.last_name}</div>
                          <div className="text-[10px] text-stone-500">
                            +{g.companion_count} acomp. ({1 + g.companion_count} lugares)
                          </div>
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => handleUnassignGuest(g.id)}
                            className="text-stone-400 hover:text-rose-600 p-1"
                            title="Desasignar de la mesa"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-stone-400 italic py-2">
                      No hay invitados asignados aún.
                    </div>
                  )}
                </div>
              </div>

              {/* Unassigned Guests Selector */}
              {!isLocked && unassignedGuests.length > 0 && (
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2">
                    Asignar Invitado Confirmado:
                  </div>
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        handleAssignGuest(e.target.value, selectedTable.id);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl bg-white text-stone-800 focus:outline-none"
                  >
                    <option value="">Selecciona para sentar en mesa...</option>
                    {unassignedGuests.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.first_name} {g.last_name} (+{g.companion_count} comp.)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="luxury-card rounded-2xl p-6 text-center text-stone-400 text-xs border border-dashed border-stone-300">
              <Eye className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="font-semibold">Selecciona una mesa en el plano</p>
              <p className="text-[11px] text-stone-400 mt-1">
                Haz clic sobre cualquier mesa para ver sus invitados y gestionar los lugares.
              </p>
            </div>
          )}

          {/* Saved Layout Versions List */}
          <div className="luxury-card rounded-2xl p-5 border border-stone-200">
            <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Versiones Guardadas</span>
              <History className="w-3.5 h-3.5 text-stone-400" />
            </div>
            {versions.length === 0 ? (
              <div className="text-xs text-stone-400 italic">No hay versiones previas guardadas.</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {versions.map(v => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-900">{v.name}</div>
                      <div className="text-[10px] text-stone-400">
                        {new Date(v.created_at).toLocaleDateString()} por {v.created_by}
                      </div>
                    </div>
                    {!isLocked && (
                      <button
                        onClick={() => handleRestoreVersion(v.id)}
                        className="text-[10px] font-bold uppercase text-stone-700 bg-white hover:bg-stone-200 px-2 py-1 rounded-md border border-stone-200 transition"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Agregar Mesa */}
      {showNewTableModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">Nueva Mesa</h3>
            <form onSubmit={handleCreateTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre / Número de Mesa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mesa 5 o Mesa Imperial Central"
                  value={newTableData.name}
                  onChange={e => setNewTableData({ ...newTableData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tipo de Mesa</label>
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
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                >
                  <option value="circular">Circular (pax estándar: 8-12)</option>
                  <option value="rectangular">Rectangular (pax estándar: 8-10)</option>
                  <option value="imperial">Imperial (rotación libre: 12-20)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Capacidad Total de Lugares</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newTableData.capacity}
                  onChange={e => setNewTableData({ ...newTableData, capacity: parseInt(e.target.value, 10) || 10 })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowNewTableModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                >
                  Crear Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar Elemento */}
      {showNewElementModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">Agregar Elemento de Plano</h3>
            <form onSubmit={handleCreateElement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={newElementData.name}
                  onChange={e => setNewElementData({ ...newElementData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tipo de Elemento</label>
                <select
                  value={newElementData.type}
                  onChange={e => setNewElementData({ ...newElementData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
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
                  <label className="block text-xs font-bold text-stone-700 mb-1">Ancho (px)</label>
                  <input
                    type="number"
                    value={newElementData.width}
                    onChange={e => setNewElementData({ ...newElementData, width: parseInt(e.target.value, 10) || 120 })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Alto (px)</label>
                  <input
                    type="number"
                    value={newElementData.height}
                    onChange={e => setNewElementData({ ...newElementData, height: parseInt(e.target.value, 10) || 120 })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowNewElementModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Guardar Versión */}
      {showSaveVersionModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-3">Guardar Versión de Layout</h3>
            <p className="text-xs text-stone-500 mb-4">
              Crea un respaldo de la distribución actual para poder compararla o recuperarla en cualquier momento.
            </p>
            <form onSubmit={handleSaveVersion} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre de la Versión</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Opción 2 - Pista Central Ampliada"
                  value={versionName}
                  onChange={e => setVersionName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowSaveVersionModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                >
                  Guardar Versión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Plano Base de Referencia del Lugar */}
      {showFloorPlanModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Plano Base del Lugar</h3>
            <p className="text-xs text-stone-500 mb-4">
              Carga o vincula el plano arquitectónico de la hacienda o salón para utilizarlo como referencia visual debajo de tus mesas.
            </p>
            <form onSubmit={handleSaveFloorPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Subir Imagen desde tu equipo (PNG / JPG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFloorPlanFileUpload}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">O URL de imagen de plano</label>
                <input
                  type="text"
                  placeholder="https://... o imagen cargada"
                  value={floorPlanUrl}
                  onChange={e => setFloorPlanUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setFloorPlanUrl('')}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  Quitar Plano
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowFloorPlanModal(false)}
                    className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                  >
                    Guardar Plano
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
