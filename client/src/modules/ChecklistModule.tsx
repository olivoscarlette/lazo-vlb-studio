import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import * as XLSX from 'xlsx';
import {
  Plus, Calendar, Trash2,
  CheckCircle2, Clock, Download, Upload, Edit3,
  Layers, Search, CheckSquare, Square, X, Sparkles, Filter
} from 'lucide-react';

const MONTH_STAGES = [
  '12 - 16 meses',
  '10 - 11 meses',
  '8 - 9 meses',
  '6 - 7 meses',
  '4 - 5 meses',
  '2 - 3 meses',
  '1 mes',
  '15 días',
  '1 semana'
];

const GENERAL_SECTIONS_ORDER = [
  'Ceremonia Civil',
  'Getting Ready y First look',
  'Fotografía y video',
  'Ceremonia Religiosa',
  'Recepción',
  'Vestimenta Nupcial - Novia',
  'Vestimenta Nupcial - Novio'
];

interface MasterTask {
  title: string;
  category: string;
  priority: string;
  responsible: string;
}

export const ChecklistModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const isNovios = user?.role === 'NOVIOS';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0, progressPercent: 0 });
  const [loading, setLoading] = useState(true);
  const [importingTemplate, setImportingTemplate] = useState(false);

  // Main navigation view: 'GENERAL' or 'MESES'
  const [mainView, setMainView] = useState<'GENERAL' | 'MESES'>('GENERAL');
  // Month stage filter when in 'MESES' view
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  // Modal (Create or Edit Task)
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    category: 'Checklist General',
    responsible: 'Ceremonia Civil',
    due_date: '',
    priority: 'Alta' as Task['priority'],
    status: 'Pendiente' as Task['status'],
    notes: ''
  });

  // Modal: Asignar desde Plantilla Maestra
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterTasks, setMasterTasks] = useState<MasterTask[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [selectedMasterKeys, setSelectedMasterKeys] = useState<Set<string>>(new Set());
  const [masterSearch, setMasterSearch] = useState('');
  const [masterModalTab, setMasterModalTab] = useState<'ALL' | 'GENERAL' | 'MESES'>('ALL');
  const [masterMonthSubFilter, setMasterMonthSubFilter] = useState<string>('ALL');

  const fetchChecklist = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/checklist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setStats(data.stats || { total: 0, completed: 0, inProgress: 0, pending: 0, progressPercent: 0 });
      }
    } catch (err) {
      console.error('Error fetching checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [currentWedding, token]);

  // Helper to detect if a task corresponds to Día Boda
  const isDiaBodaTask = (t: { category?: string; title?: string }) => {
    const cat = (t.category || '').toLowerCase();
    const title = (t.title || '').toLowerCase();
    return (
      cat.includes('día boda') || cat.includes('dia boda') || cat.includes('día b') || cat.includes('dia b') ||
      title.includes('día boda') || title.includes('dia boda') || title.includes('día b') || title.includes('dia b')
    );
  };

  // Visible tasks: completely hide Día Boda for Novios
  const visibleTasks = useMemo(() => {
    if (isNovios) {
      return tasks.filter(t => !isDiaBodaTask(t));
    }
    return tasks;
  }, [tasks, isNovios]);

  // General tasks vs Month tasks
  const generalTasks = useMemo(() => {
    return visibleTasks.filter(t => (t.category || '').trim().toLowerCase() === 'checklist general');
  }, [visibleTasks]);

  const monthTasks = useMemo(() => {
    return visibleTasks.filter(t => (t.category || '').trim().toLowerCase() !== 'checklist general');
  }, [visibleTasks]);

  // Filtered tasks for current view
  const currentViewTasks = useMemo(() => {
    if (mainView === 'GENERAL') {
      return generalTasks;
    }
    if (monthFilter === 'ALL') {
      return monthTasks;
    }
    return monthTasks.filter(t => (t.category || '').toLowerCase() === monthFilter.toLowerCase());
  }, [mainView, monthFilter, generalTasks, monthTasks]);

  // Available month stages for selector (plus Día Boda only if staff/admin and present)
  const availableMonthStages = useMemo(() => {
    const list = [...MONTH_STAGES];
    if (!isNovios) {
      const hasDiaBoda = tasks.some(t => isDiaBodaTask(t));
      if (hasDiaBoda) {
        list.push('Día Boda');
      }
    }
    return list;
  }, [isNovios, tasks]);

  const handleToggleCheckbox = async (task: Task) => {
    const newStatus: Task['status'] = task.status === 'Completada' ? 'Pendiente' : 'Completada';
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/checklist/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchChecklist();
    } catch {}
  };

  const handleOpenNewModal = () => {
    setEditingTaskId(null);
    const defaultCat = mainView === 'GENERAL'
      ? 'Checklist General'
      : monthFilter !== 'ALL' ? monthFilter : '12 - 16 meses';

    setTaskForm({
      title: '',
      category: defaultCat,
      responsible: defaultCat === 'Checklist General' ? 'Recepción' : (isNovios ? 'Novios' : 'VLB Studio'),
      due_date: '',
      priority: 'Alta',
      status: 'Pendiente',
      notes: ''
    });
    setShowTaskModal(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      category: task.category || 'Checklist General',
      responsible: task.responsible || 'VLB Studio',
      due_date: task.due_date || '',
      priority: task.priority || 'Alta',
      status: task.status,
      notes: task.notes || ''
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title) return;

    try {
      const url = editingTaskId
        ? `/api/weddings/${currentWedding!.id}/checklist/${editingTaskId}`
        : `/api/weddings/${currentWedding!.id}/checklist`;
      const method = editingTaskId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(taskForm)
      });
      if (res.ok) {
        setShowTaskModal(false);
        setEditingTaskId(null);
        await fetchChecklist();
      }
    } catch {}
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta actividad?')) return;
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/checklist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchChecklist();
    } catch {}
  };

  // Open Master Checklist Modal and load data
  const handleOpenMasterModal = async () => {
    setShowMasterModal(true);
    setLoadingMaster(true);
    try {
      const res = await fetch('/api/catalogs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rawMaster: MasterTask[] = data.catalogs?.master_checklist || [];
        // Filter out Día Boda if user is Novios
        const cleanedMaster = isNovios
          ? rawMaster.filter(t => !isDiaBodaTask(t))
          : rawMaster;

        setMasterTasks(cleanedMaster);

        // Pre-select tasks that have NOT yet been added to this wedding
        const existingKeys = new Set(
          tasks.map(t => `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`)
        );
        const initialSelected = new Set<string>();
        cleanedMaster.forEach(t => {
          const key = `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`;
          if (!existingKeys.has(key)) {
            initialSelected.add(key);
          }
        });
        setSelectedMasterKeys(initialSelected);
      }
    } catch (err) {
      console.error('Error loading master checklist:', err);
    } finally {
      setLoadingMaster(false);
    }
  };

  // Assign chosen master tasks to this wedding
  const handleConfirmAssignMaster = async () => {
    if (!currentWedding || !token || selectedMasterKeys.size === 0) return;
    setImportingTemplate(true);
    try {
      const existingKeys = new Set(
        tasks.map(t => `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`)
      );

      const tasksToAssign = masterTasks.filter(t => {
        const key = `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`;
        return selectedMasterKeys.has(key) && !existingKeys.has(key);
      });

      if (tasksToAssign.length === 0) {
        setShowMasterModal(false);
        return;
      }

      const res = await fetch(`/api/weddings/${currentWedding.id}/checklist/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tasks: tasksToAssign })
      });

      if (res.ok) {
        setShowMasterModal(false);
        await fetchChecklist();
      }
    } catch (err) {
      console.error('Error batch assigning master checklist:', err);
    } finally {
      setImportingTemplate(false);
    }
  };

  // Excel upload handler
  const handleUploadExcelChecklist = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWedding || !token) return;
    setImportingTemplate(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const allRows: any[] = [];
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
          jsonRows.forEach(r => allRows.push({ ...r, _sheet: sheetName }));
        });

        if (user?.role === 'ADMINISTRADOR') {
          await fetch('/api/catalogs/templates/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              rows: allRows,
              replaceExisting: false,
              syncToWeddings: true
            })
          });
        } else {
          const existingTitles = new Set(tasks.map(t => t.title.toLowerCase()));
          const newTasks: any[] = [];
          for (const r of allRows) {
            const title = (
              r['ACTIVIDAD_O_REQUISITO'] || r['ACTIVIDAD'] || r['Actividad'] ||
              r['TAREA'] || r['Tarea'] || r['TITULO'] || ''
            ).toString().trim();
            const category = (
              r['ETAPA_O_MES'] || r['ETAPA'] || r['MES'] || r['CATEGORIA'] || 'Checklist General'
            ).toString().trim();
            const responsible = (r['RESPONSABLE'] || 'VLB Studio').toString().trim();

            if (title && !existingTitles.has(title.toLowerCase())) {
              newTasks.push({
                title,
                category,
                responsible,
                priority: 'Alta',
                status: 'Pendiente',
                due_date: '',
                notes: ''
              });
              existingTitles.add(title.toLowerCase());
            }
          }

          if (newTasks.length > 0) {
            await fetch(`/api/weddings/${currentWedding.id}/checklist/batch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ tasks: newTasks })
            });
          }
        }
        await fetchChecklist();
      } catch (err) {
        console.error('Error importing checklist excel:', err);
      } finally {
        setImportingTemplate(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'Completada') return false;
    const parts = task.due_date.split('-');
    if (parts.length === 3) {
      const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return due < now;
    }
    return false;
  };

  // Group Checklist General tasks by section
  const generalSections = useMemo(() => {
    if (mainView !== 'GENERAL') return [];
    const map = new Map<string, Task[]>();
    GENERAL_SECTIONS_ORDER.forEach(s => map.set(s, []));
    currentViewTasks.forEach(t => {
      const sec = t.responsible || 'General';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(t);
    });
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [mainView, currentViewTasks]);

  // Tab stats
  const tabCompleted = currentViewTasks.filter(t => t.status === 'Completada').length;
  const tabTotal = currentViewTasks.length;

  // Filter master tasks inside assignment modal
  const existingTaskKeySet = useMemo(() => {
    return new Set(
      tasks.map(t => `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`)
    );
  }, [tasks]);

  const filteredMasterTasks = useMemo(() => {
    return masterTasks.filter(item => {
      const isGeneral = (item.category || '').trim().toLowerCase() === 'checklist general';
      if (masterModalTab === 'GENERAL' && !isGeneral) return false;
      if (masterModalTab === 'MESES') {
        if (isGeneral) return false;
        if (masterMonthSubFilter !== 'ALL' && (item.category || '').toLowerCase() !== masterMonthSubFilter.toLowerCase()) {
          return false;
        }
      }
      if (masterSearch.trim()) {
        const q = masterSearch.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchResp = (item.responsible || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchResp) return false;
      }
      return true;
    });
  }, [masterTasks, masterModalTab, masterMonthSubFilter, masterSearch]);

  const countSelectedInModal = useMemo(() => {
    let count = 0;
    masterTasks.forEach(t => {
      const key = `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`;
      if (selectedMasterKeys.has(key) && !existingTaskKeySet.has(key)) {
        count++;
      }
    });
    return count;
  }, [masterTasks, selectedMasterKeys, existingTaskKeySet]);

  const toggleMasterKey = (key: string) => {
    const next = new Set(selectedMasterKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedMasterKeys(next);
  };

  const selectAllFilteredMaster = () => {
    const next = new Set(selectedMasterKeys);
    filteredMasterTasks.forEach(t => {
      const key = `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`;
      if (!existingTaskKeySet.has(key)) {
        next.add(key);
      }
    });
    setSelectedMasterKeys(next);
  };

  const deselectAllFilteredMaster = () => {
    const next = new Set(selectedMasterKeys);
    filteredMasterTasks.forEach(t => {
      const key = `${(t.category || '').trim().toLowerCase()}::${(t.title || '').trim().toLowerCase()}`;
      next.delete(key);
    });
    setSelectedMasterKeys(next);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-[#9C665C]">
            Base de Datos VLB Studio · Planeación Integral
          </span>
          <h2 className="font-serif text-3xl font-semibold text-[#2B2826]">
            Checklist de la Boda
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1">
            Organiza las actividades por sección general o por etapas mensuales según el tiempo restante.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isNovios && (
            <>
              <button
                type="button"
                onClick={handleOpenMasterModal}
                disabled={importingTemplate}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EAE3DA] text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                title="Elegir y asignar actividades desde la Base de Datos Maestra de VLB Studio"
              >
                <Layers className="w-3.5 h-3.5 text-[#9C665C]" />
                <span>Asignar desde Plantilla</span>
              </button>

              <label className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA] text-xs font-semibold rounded-xl cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-[#9C665C]" />
                <span>Subir Excel</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadExcelChecklist}
                  disabled={importingTemplate}
                  className="hidden"
                />
              </label>
            </>
          )}

          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Actividad</span>
          </button>
        </div>
      </div>

      {/* Progress Metric Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider text-[#8A7E72]">
              Avance Global ({stats.completed} de {stats.total} actividades)
            </div>
            <div className="text-2xl font-serif font-bold text-[#2B2826] mt-0.5">
              {stats.progressPercent}% Completado
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-[#8A574E] bg-[#FAF8F5] border border-[#EAE3DA] px-3 py-1 rounded-xl">
              En esta vista: {tabCompleted} / {tabTotal}
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              {stats.completed} listas
            </span>
            <span className="text-[#8A7E72] bg-[#FAF8F5] px-2.5 py-1 rounded-xl border border-[#EAE3DA]">
              {stats.pending} pendientes
            </span>
          </div>
        </div>

        <div className="h-3 w-full bg-[#FAF8F5] border border-[#EAE3DA] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#9C665C] rounded-full transition-all duration-300"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Two-Fold View Navigation */}
      <div className="space-y-3">
        <div className="flex items-center p-1 bg-[#FAF8F5] rounded-2xl border border-[#EAE3DA] w-fit">
          <button
            type="button"
            onClick={() => setMainView('GENERAL')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
              mainView === 'GENERAL'
                ? 'bg-white text-[#2B2826] shadow-xs border border-[#EAE3DA]'
                : 'text-[#8A7E72] hover:text-[#2B2826]'
            }`}
          >
            <span>📋 Checklist General</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              mainView === 'GENERAL' ? 'bg-[#9C665C] text-white' : 'bg-[#EAE3DA] text-[#5A524C]'
            }`}>
              {generalTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainView('MESES')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
              mainView === 'MESES'
                ? 'bg-white text-[#2B2826] shadow-xs border border-[#EAE3DA]'
                : 'text-[#8A7E72] hover:text-[#2B2826]'
            }`}
          >
            <span>📅 Actividades por Meses</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              mainView === 'MESES' ? 'bg-[#9C665C] text-white' : 'bg-[#EAE3DA] text-[#5A524C]'
            }`}>
              {monthTasks.length}
            </span>
          </button>
        </div>

        {/* Sub-Pills for 'MESES' view */}
        {mainView === 'MESES' && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1">
            <button
              type="button"
              onClick={() => setMonthFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                monthFilter === 'ALL'
                  ? 'bg-[#9C665C] text-white shadow-xs'
                  : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
              }`}
            >
              Todos los Meses ({monthTasks.length})
            </button>
            {availableMonthStages.map(stage => {
              const countInStage = monthTasks.filter(t => (t.category || '').toLowerCase() === stage.toLowerCase()).length;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setMonthFilter(stage)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                    monthFilter === stage
                      ? 'bg-[#9C665C] text-white shadow-xs'
                      : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
                  }`}
                >
                  <span>{stage}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    monthFilter === stage ? 'bg-white/20 text-white' : 'bg-[#FAF8F5] text-[#8A7E72]'
                  }`}>
                    {countInStage}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 text-center text-[#8A7E72] text-sm">Cargando checklist...</div>
      ) : currentViewTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-[#EAE3DA] max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EAE3DA] flex items-center justify-center mx-auto text-[#9C665C]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#2B2826]">
              {mainView === 'GENERAL'
                ? 'No hay actividades en el Checklist General'
                : monthFilter === 'ALL'
                ? 'No hay actividades por meses asignadas aún'
                : `No hay actividades para la etapa: ${monthFilter}`}
            </h3>
            <p className="text-xs text-[#8A7E72] mt-1 max-w-md mx-auto">
              {!isNovios
                ? 'Puedes asignar actividades selectivamente desde la Base de Datos Maestra o crear una nueva manualmente.'
                : 'Tu equipo de coordinación asignará las actividades correspondientes a esta etapa.'}
            </p>
          </div>

          {!isNovios && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenMasterModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Asignar desde Plantilla Maestra</span>
              </button>
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA] text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Actividad</span>
              </button>
            </div>
          )}
        </div>
      ) : mainView === 'GENERAL' ? (
        /* Grouped View for Checklist General */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {generalSections.map(([sectionName, sectionTasks]) => {
            const doneCount = sectionTasks.filter(t => t.status === 'Completada').length;
            return (
              <div key={sectionName} className="bg-white rounded-3xl p-5 border border-[#EAE3DA] shadow-xs flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#FAF8F5]">
                  <div>
                    <span className="text-xs uppercase font-semibold tracking-wider text-[#9C665C]">
                      Checklist General
                    </span>
                    <h3 className="font-serif text-xl font-semibold text-[#2B2826]">{sectionName}</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5] text-[#8A574E] border border-[#EAE3DA]">
                    {doneCount} / {sectionTasks.length}
                  </span>
                </div>

                <div className="divide-y divide-[#FAF8F5]">
                  {sectionTasks.map(task => (
                    <div
                      key={task.id}
                      className="py-2.5 flex items-center justify-between gap-3 group hover:bg-[#FAF8F5]/60 px-2 rounded-xl transition"
                    >
                      <div
                        onClick={() => handleToggleCheckbox(task)}
                        className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                      >
                        <button
                          type="button"
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                            task.status === 'Completada'
                              ? 'bg-[#9C665C] border-[#9C665C] text-white'
                              : 'border-[#EAE3DA] bg-[#FAF8F5] hover:border-[#9C665C]'
                          }`}
                        >
                          {task.status === 'Completada' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium block ${
                              task.status === 'Completada' ? 'line-through text-[#8A7E72]' : 'text-[#2B2826]'
                            }`}>
                              {task.title}
                            </span>
                            {isTaskOverdue(task) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDF6F5] text-[#9C665C] border border-[#F0D5D1] whitespace-nowrap">
                                ⚠️ Vencida
                              </span>
                            )}
                          </div>
                          {task.notes && (
                            <span className="text-xs text-[#8A7E72] italic block">{task.notes}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(task)}
                          className="text-[#8A7E72] hover:text-[#2B2826] p-1.5 rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
                          title="Editar o agregar comentario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-[#8A7E72]/60 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Stage List View for 'MESES' */
        <div className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#FAF8F5]">
            <div>
              <span className="text-xs uppercase font-semibold tracking-wider text-[#9C665C]">
                Cronograma por Etapa
              </span>
              <h3 className="font-serif text-2xl font-semibold text-[#2B2826]">
                {monthFilter === 'ALL' ? 'Todas las Etapas Mensuales' : `Etapa: ${monthFilter}`}
              </h3>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF8F5] text-[#8A574E] border border-[#EAE3DA]">
              {tabCompleted} de {tabTotal} realizadas
            </span>
          </div>

          <div className="divide-y divide-[#FAF8F5]">
            {currentViewTasks.map(task => (
              <div
                key={task.id}
                className={`py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5]/70 rounded-2xl transition ${
                  task.status === 'Completada' ? 'opacity-70' : ''
                }`}
              >
                <div
                  onClick={() => handleToggleCheckbox(task)}
                  className="flex items-start space-x-3 cursor-pointer flex-1"
                >
                  <button
                    type="button"
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                      task.status === 'Completada'
                        ? 'bg-[#9C665C] border-[#9C665C] text-white'
                        : task.status === 'En proceso'
                        ? 'bg-amber-100 border-amber-400 text-amber-800'
                        : 'border-[#EAE3DA] bg-[#FAF8F5] hover:border-[#9C665C]'
                    }`}
                  >
                    {task.status === 'Completada' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {task.status === 'En proceso' && <Clock className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium leading-relaxed ${
                        task.status === 'Completada' ? 'line-through text-[#8A7E72]' : 'text-[#2B2826]'
                      }`}>
                        {task.title}
                      </h4>
                      {isTaskOverdue(task) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDF6F5] text-[#9C665C] border border-[#F0D5D1] whitespace-nowrap">
                          ⚠️ Vencida
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#8A7E72] mt-1">
                      {task.category && (
                        <span className="bg-[#FAF8F5] text-[#2B2826] px-2 py-0.5 rounded-md text-[11px] border border-[#EAE3DA]">
                          {task.category}
                        </span>
                      )}
                      {task.responsible && (
                        <span className="bg-[#FAF8F5] text-[#8A574E] px-2 py-0.5 rounded-md text-[11px] border border-[#EAE3DA]">
                          {task.responsible}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#8A7E72]" />
                          <span>Fecha: {task.due_date}</span>
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-xs text-[#8A574E] bg-[#FAF8F5] px-2.5 py-1 rounded-lg mt-1.5 inline-block border border-[#EAE3DA]">
                        💬 {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCheckbox(task)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                      task.status === 'Completada'
                        ? 'bg-[#E4ECE5] text-[#2B5235] border-[#D0DED2]'
                        : 'bg-[#FAF8F5] text-[#2B2826] border-[#EAE3DA] hover:border-[#9C665C]'
                    }`}
                  >
                    {task.status === 'Completada' ? 'Hecho' : 'Pendiente'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(task)}
                    className="text-[#8A7E72] hover:text-[#2B2826] p-1.5 rounded-xl hover:bg-[#FAF8F5] cursor-pointer"
                    title="Editar tarea o agregar comentario"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-[#8A7E72]/60 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 cursor-pointer"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Asignar desde Plantilla Maestra */}
      {showMasterModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-[#EAE3DA] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#FAF8F5]">
              <div>
                <span className="text-xs uppercase font-semibold tracking-wider text-[#9C665C]">
                  Base de Datos Maestra · VLB Studio
                </span>
                <h3 className="font-serif text-2xl font-semibold text-[#2B2826]">
                  Asignar Actividades a esta Boda
                </h3>
                <p className="text-xs text-[#8A7E72] mt-0.5">
                  Selecciona de forma personalizada qué actividades del catálogo maestro deseas activar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterModal(false)}
                className="text-[#8A7E72] hover:text-[#2B2826] p-1.5 rounded-xl hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="py-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#8A7E72] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar actividad, etapa o sección..."
                    value={masterSearch}
                    onChange={e => setMasterSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#EAE3DA] rounded-xl bg-[#FAF8F5] text-[#2B2826] placeholder:text-[#8A7E72]/60 focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>

                {/* Scope Tabs */}
                <div className="flex items-center p-1 bg-[#FAF8F5] rounded-xl border border-[#EAE3DA]">
                  <button
                    type="button"
                    onClick={() => setMasterModalTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      masterModalTab === 'ALL' ? 'bg-white text-[#2B2826] shadow-xs' : 'text-[#8A7E72]'
                    }`}
                  >
                    Todas ({masterTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMasterModalTab('GENERAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      masterModalTab === 'GENERAL' ? 'bg-white text-[#2B2826] shadow-xs' : 'text-[#8A7E72]'
                    }`}
                  >
                    Checklist General
                  </button>
                  <button
                    type="button"
                    onClick={() => setMasterModalTab('MESES')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      masterModalTab === 'MESES' ? 'bg-white text-[#2B2826] shadow-xs' : 'text-[#8A7E72]'
                    }`}
                  >
                    Por Meses
                  </button>
                </div>
              </div>

              {/* Month stage filter if masterModalTab === 'MESES' */}
              {masterModalTab === 'MESES' && (
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[#8A7E72] font-medium text-[11px] whitespace-nowrap">Etapa:</span>
                  <button
                    type="button"
                    onClick={() => setMasterMonthSubFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                      masterMonthSubFilter === 'ALL'
                        ? 'bg-[#9C665C] text-white'
                        : 'bg-[#FAF8F5] text-[#5A524C] hover:bg-[#F3ECE2]'
                    }`}
                  >
                    Todas
                  </button>
                  {MONTH_STAGES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMasterMonthSubFilter(s)}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                        masterMonthSubFilter === s
                          ? 'bg-[#9C665C] text-white'
                          : 'bg-[#FAF8F5] text-[#5A524C] hover:bg-[#F3ECE2]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Selection Summary and Quick Controls */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <span className="text-[#8A7E72]">
                  Mostrando <strong className="text-[#2B2826]">{filteredMasterTasks.length}</strong> actividades
                </span>
                <div className="flex items-center space-x-3 font-semibold">
                  <button
                    type="button"
                    onClick={selectAllFilteredMaster}
                    className="text-[#9C665C] hover:underline cursor-pointer"
                  >
                    Seleccionar visibles no agregadas
                  </button>
                  <span className="text-[#EAE3DA]">|</span>
                  <button
                    type="button"
                    onClick={deselectAllFilteredMaster}
                    className="text-[#8A7E72] hover:text-[#2B2826] cursor-pointer"
                  >
                    Deseleccionar visibles
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Tasks List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#FAF8F5] pr-1 min-h-[260px]">
              {loadingMaster ? (
                <div className="py-12 text-center text-xs text-[#8A7E72]">Cargando catálogo maestro...</div>
              ) : filteredMasterTasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8A7E72]">
                  No se encontraron actividades con los filtros actuales.
                </div>
              ) : (
                filteredMasterTasks.map(item => {
                  const key = `${(item.category || '').trim().toLowerCase()}::${(item.title || '').trim().toLowerCase()}`;
                  const isAlreadyAdded = existingTaskKeySet.has(key);
                  const isChecked = selectedMasterKeys.has(key);

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        if (!isAlreadyAdded) toggleMasterKey(key);
                      }}
                      className={`py-3 px-3 flex items-center justify-between gap-3 rounded-xl transition ${
                        isAlreadyAdded
                          ? 'opacity-60 bg-[#FAF8F5]/40 cursor-not-allowed'
                          : 'hover:bg-[#FAF8F5] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <button
                          type="button"
                          disabled={isAlreadyAdded}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                            isAlreadyAdded
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                              : isChecked
                              ? 'bg-[#9C665C] border-[#9C665C] text-white'
                              : 'border-[#EAE3DA] bg-white'
                          }`}
                        >
                          {(isAlreadyAdded || isChecked) && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#2B2826] truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-[#8A7E72]">
                            <span className="bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE3DA]">
                              {item.category}
                            </span>
                            {item.responsible && (
                              <span>Resp: {item.responsible}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAlreadyAdded ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ya en esta boda
                          </span>
                        ) : isChecked ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#9C665C] border border-[#EAE3DA]">
                            Para agregar
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[#FAF8F5] flex items-center justify-between gap-3 mt-2">
              <span className="text-xs font-semibold text-[#2B2826]">
                {countSelectedInModal} actividades listas para asignar
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMasterModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#8A7E72] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={countSelectedInModal === 0 || importingTemplate}
                  onClick={handleConfirmAssignMaster}
                  className="px-5 py-2 text-xs font-semibold bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {importingTemplate ? 'Asignando...' : `Asignar ${countSelectedInModal} Actividades`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva o Editar Actividad */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3DA] animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-semibold text-[#2B2826] mb-4">
              {editingTaskId ? 'Editar Actividad / Comentario' : 'Nueva Actividad en Checklist'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Tarea / Actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Separar iglesia o confirmar banquete"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm bg-[#FAF8F5] text-[#2B2826] placeholder:text-[#8A7E72]/50 focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">Lista / Etapa</label>
                  <select
                    value={taskForm.category}
                    onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  >
                    <option value="Checklist General">Checklist General</option>
                    {MONTH_STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {!isNovios && <option value="Día Boda">Día Boda</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">
                    {taskForm.category === 'Checklist General' ? 'Sección General' : 'Responsable'}
                  </label>
                  {taskForm.category === 'Checklist General' ? (
                    <select
                      value={taskForm.responsible}
                      onChange={e => setTaskForm({ ...taskForm, responsible: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                    >
                      {GENERAL_SECTIONS_ORDER.map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Novios o VLB Studio"
                      value={taskForm.responsible}
                      onChange={e => setTaskForm({ ...taskForm, responsible: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">Prioridad</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2826] mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Comentarios</label>
                <textarea
                  rows={2}
                  placeholder="Comentarios o acuerdos sobre esta tarea..."
                  value={taskForm.notes}
                  onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm bg-[#FAF8F5] text-[#2B2826] placeholder:text-[#8A7E72]/50 focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#FAF8F5]">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTaskId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#8A7E72] hover:bg-[#FAF8F5] rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingTaskId ? 'Guardar Cambios' : 'Guardar Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
