import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import * as XLSX from 'xlsx';
import {
  Plus, Calendar, User, Trash2,
  CheckCircle2, Clock, Download, Upload, Edit3
} from 'lucide-react';

const VLB_CHECKLIST_CATEGORIES = [
  'Checklist General',
  '12 - 16 meses',
  '10 - 11 meses',
  '8 - 9 meses',
  '6 - 7 meses',
  '4 - 5 meses',
  '2 - 3 meses',
  '1 mes',
  '15 días',
  '1 semana',
  'ALL'
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

export const ChecklistModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0, progressPercent: 0 });
  const [loading, setLoading] = useState(true);
  const [importingTemplate, setImportingTemplate] = useState(false);

  // Default to Checklist General
  const [categoryFilter, setCategoryFilter] = useState('Checklist General');

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
    const defaultCat = categoryFilter === 'ALL' ? 'Checklist General' : categoryFilter;
    setTaskForm({
      title: '',
      category: defaultCat,
      responsible: defaultCat === 'Checklist General' ? 'Recepción' : 'Novios & VLB',
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

  const handleLoadVlbMasterChecklist = async () => {
    if (!currentWedding || !token) return;
    setImportingTemplate(true);
    try {
      const res = await fetch('/api/catalogs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const masterTasks: { title: string; category: string; priority: string; responsible: string }[] =
          data.catalogs?.master_checklist || [];
        const existingKeys = new Set(tasks.map(t => `${(t.category || '').toLowerCase()}::${t.title.toLowerCase()}`));
        const toCreate = masterTasks.filter(
          t => !existingKeys.has(`${(t.category || '').toLowerCase()}::${t.title.toLowerCase()}`)
        );

        for (const item of toCreate) {
          await fetch(`/api/weddings/${currentWedding.id}/checklist`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              title: item.title,
              category: item.category || 'Checklist General',
              responsible: item.responsible || 'VLB Studio',
              priority: item.priority || 'Alta',
              status: 'Pendiente',
              due_date: '',
              notes: ''
            })
          });
        }
        await fetchChecklist();
      }
    } catch (err) {
      console.error('Error loading master checklist:', err);
    } finally {
      setImportingTemplate(false);
    }
  };

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
              await fetch(`/api/weddings/${currentWedding.id}/checklist`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  title,
                  category,
                  responsible,
                  priority: 'Alta',
                  status: 'Pendiente',
                  due_date: '',
                  notes: ''
                })
              });
              existingTitles.add(title.toLowerCase());
            }
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

  const filteredTasks = tasks.filter(t => categoryFilter === 'ALL' || t.category === categoryFilter);

  // Group Checklist General tasks by their section (stored in responsible)
  const generalSections = React.useMemo(() => {
    if (categoryFilter !== 'Checklist General') return [];
    const map = new Map<string, Task[]>();
    GENERAL_SECTIONS_ORDER.forEach(s => map.set(s, []));
    filteredTasks.forEach(t => {
      const sec = t.responsible || 'General';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(t);
    });
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [categoryFilter, filteredTasks]);

  // Calculate current tab stats
  const tabCompleted = filteredTasks.filter(t => t.status === 'Completada').length;
  const tabTotal = filteredTasks.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Base de Datos VLB Studio · Planeación Integral
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Checklist General y por Etapas
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Checklist general de boda (Civil, Religiosa, Recepción, Getting Ready, Foto y Vestimenta) y seguimiento paso a paso desde 12–16 meses hasta 1 semana antes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadVlbMasterChecklist}
            disabled={importingTemplate}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#EFE8DE] hover:bg-[#EFE2DF] text-[#332C2A] border border-[#DDD2C4] text-xs font-semibold rounded-xl transition disabled:opacity-50"
            title="Restaurar o cargar todas las actividades de la Plantilla Maestra VLB Studio"
          >
            <Download className="w-3.5 h-3.5 text-[#A6736E]" />
            <span>{importingTemplate ? 'Cargando...' : 'Cargar Plantilla VLB'}</span>
          </button>

          <label className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#EFE8DE] text-[#332C2A] border border-[#DDD2C4] text-xs font-semibold rounded-xl cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-[#A6736E]" />
            <span>Subir Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadExcelChecklist}
              disabled={importingTemplate}
              className="hidden"
            />
          </label>

          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Actividad</span>
          </button>
        </div>
      </div>

      {/* Progress Metric Card */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400">
              Avance Global ({stats.completed} de {stats.total} actividades)
            </div>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
              {stats.progressPercent}% Completado
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="text-[#885853] bg-[#EFE2DF] px-3 py-1 rounded-lg">
              En esta pestaña: {tabCompleted} / {tabTotal} completadas
            </span>
            <span className="text-emerald-700">{stats.completed} listas</span>
            <span className="text-stone-500">{stats.pending} pendientes</span>
          </div>
        </div>

        <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#A6736E] rounded-full transition-all duration-300"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Category Filter Pills: Checklist General first, then by Stages */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1.5">
        {VLB_CHECKLIST_CATEGORIES.map(cat => {
          const count = cat === 'ALL' ? tasks.length : tasks.filter(t => t.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center space-x-1.5 ${
                categoryFilter === cat
                  ? 'bg-[#A6736E] text-white font-semibold shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-[#EFE8DE] border border-[#DDD2C4]'
              }`}
            >
              <span>{cat === 'ALL' ? 'Todas' : cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                categoryFilter === cat ? 'bg-white/25 text-white' : 'bg-[#F9F6F2] text-stone-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 text-center text-stone-400 text-xs">Cargando checklist...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="luxury-card rounded-2xl p-8 text-center text-stone-400 text-xs border border-dashed border-stone-300">
          No hay actividades en esta etapa. Haz clic en <strong>"Cargar Plantilla VLB"</strong> arriba para cargar las actividades oficiales.
        </div>
      ) : categoryFilter === 'Checklist General' ? (
        /* Grouped View for Checklist General (mirrors Google Sheet columns/sections) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {generalSections.map(([sectionName, sectionTasks]) => {
            const doneCount = sectionTasks.filter(t => t.status === 'Completada').length;
            return (
              <div key={sectionName} className="luxury-card rounded-2xl p-5 border border-[#DDD2C4] flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EFE8DE]">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#A6736E]">
                      Checklist General
                    </span>
                    <h3 className="font-serif text-xl font-bold text-stone-900">{sectionName}</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F9F6F2] text-[#885853] border border-[#DDD2C4]">
                    {doneCount} / {sectionTasks.length}
                  </span>
                </div>

                <div className="divide-y divide-[#F4EFEA]">
                  {sectionTasks.map(task => (
                    <div
                      key={task.id}
                      className="py-2.5 flex items-center justify-between gap-3 group hover:bg-[#F9F6F2]/60 px-2 rounded-lg transition"
                    >
                      <div
                        onClick={() => handleToggleCheckbox(task)}
                        className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                      >
                        <button
                          type="button"
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                            task.status === 'Completada'
                              ? 'bg-[#A6736E] border-[#A6736E] text-white'
                              : 'border-stone-300 bg-white hover:border-[#A6736E]'
                          }`}
                        >
                          {task.status === 'Completada' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-medium block ${
                            task.status === 'Completada' ? 'line-through text-stone-400' : 'text-stone-800'
                          }`}>
                            {task.title}
                          </span>
                          {task.notes && (
                            <span className="text-[11px] text-stone-500 italic block">{task.notes}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(task)}
                          className="text-stone-400 hover:text-stone-800 p-1 rounded"
                          title="Editar o agregar comentario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-stone-300 hover:text-rose-600 p-1 rounded"
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
        /* Stage List View (12 - 16 meses, 10 - 11 meses, etc.) */
        <div className="luxury-card rounded-2xl p-6 border border-[#DDD2C4]">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EFE8DE]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#A6736E]">
                To-do por Etapa VLB Studio
              </span>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                {categoryFilter === 'ALL' ? 'Todas las Actividades' : `Etapa: ${categoryFilter}`}
              </h3>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EFE2DF] text-[#885853]">
              {tabCompleted} de {tabTotal} realizadas
            </span>
          </div>

          <div className="divide-y divide-[#EFE8DE]">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F9F6F2]/70 rounded-xl transition ${
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
                        ? 'bg-[#A6736E] border-[#A6736E] text-white'
                        : task.status === 'En proceso'
                        ? 'bg-amber-100 border-amber-400 text-amber-800'
                        : 'border-stone-300 bg-white hover:border-[#A6736E]'
                    }`}
                  >
                    {task.status === 'Completada' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {task.status === 'En proceso' && <Clock className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex-1">
                    <h4 className={`text-xs font-semibold ${
                      task.status === 'Completada' ? 'line-through text-stone-400' : 'text-stone-900'
                    }`}>
                      {task.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-stone-500 mt-1">
                      {categoryFilter === 'ALL' && (
                        <span className="bg-[#EFE2DF] text-[#885853] px-2 py-0.5 rounded-md font-semibold">
                          {task.category}
                        </span>
                      )}
                      {task.responsible && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-stone-400" />
                          <span>{task.responsible}</span>
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>Fecha: {task.due_date}</span>
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-xs text-[#885853] bg-[#F9F6F2] px-2.5 py-1 rounded-lg mt-1.5 inline-block border border-[#EFE8DE]">
                        💬 {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCheckbox(task)}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border transition ${
                      task.status === 'Completada'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-[#EFE2DF]'
                    }`}
                  >
                    {task.status === 'Completada' ? 'Hecho' : 'Pendiente'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(task)}
                    className="text-stone-400 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-100"
                    title="Editar tarea o agregar comentario"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-stone-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50"
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

      {/* Modal: Nueva o Editar Actividad */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">
              {editingTaskId ? 'Editar Actividad / Comentario' : 'Nueva Actividad en Checklist'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tarea / Actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Separar iglesia"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Lista / Etapa</label>
                  <select
                    value={taskForm.category}
                    onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-stone-900"
                  >
                    <option value="Checklist General">Checklist General</option>
                    <option value="12 - 16 meses">12 - 16 meses</option>
                    <option value="10 - 11 meses">10 - 11 meses</option>
                    <option value="8 - 9 meses">8 - 9 meses</option>
                    <option value="6 - 7 meses">6 - 7 meses</option>
                    <option value="4 - 5 meses">4 - 5 meses</option>
                    <option value="2 - 3 meses">2 - 3 meses</option>
                    <option value="1 mes">1 mes</option>
                    <option value="15 días">15 días</option>
                    <option value="1 semana">1 semana</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {taskForm.category === 'Checklist General' ? 'Sección General' : 'Responsable'}
                  </label>
                  {taskForm.category === 'Checklist General' ? (
                    <select
                      value={taskForm.responsible}
                      onChange={e => setTaskForm({ ...taskForm, responsible: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
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
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Comentarios</label>
                <textarea
                  rows={2}
                  placeholder="Comentarios o acuerdos sobre esta tarea..."
                  value={taskForm.notes}
                  onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTaskId(null);
                  }}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow"
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
