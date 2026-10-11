import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import * as XLSX from 'xlsx';
import {
  Plus, Calendar, User, Trash2,
  CheckCircle2, Clock, Download, Upload, Edit3
} from 'lucide-react';

export const ChecklistModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0, progressPercent: 0 });
  const [loading, setLoading] = useState(true);
  const [importingTemplate, setImportingTemplate] = useState(false);

  // Filter
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal (Create or Edit Task)
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    category: '12 Meses Antes',
    responsible: 'VLB Studio',
    due_date: '',
    priority: 'Media' as Task['priority'],
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

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: Record<Task['status'], Task['status']> = {
      'Pendiente': 'En proceso',
      'En proceso': 'Completada',
      'Completada': 'Pendiente'
    };
    const newStatus = nextStatus[task.status];

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
    setTaskForm({
      title: '',
      category: '12 Meses Antes',
      responsible: 'VLB Studio',
      due_date: '',
      priority: 'Media',
      status: 'Pendiente',
      notes: ''
    });
    setShowTaskModal(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      category: task.category || '12 Meses Antes',
      responsible: task.responsible || 'VLB Studio',
      due_date: task.due_date || '',
      priority: task.priority || 'Media',
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
        const existingTitles = new Set(tasks.map(t => t.title.toLowerCase()));
        const toCreate = masterTasks.filter(t => !existingTitles.has(t.title.toLowerCase()));

        for (const item of toCreate) {
          await fetch(`/api/weddings/${currentWedding.id}/checklist`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              title: item.title,
              category: item.category || '12 Meses Antes',
              responsible: item.responsible || 'VLB Studio',
              priority: item.priority || 'Alta',
              status: 'Pendiente',
              due_date: '',
              notes: 'Plantilla Maestra VLB Studio'
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

  // Upload Excel directly from Checklist module (routes automatically if Admin, or imports to this wedding)
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
          // Route to VLB Master Templates & sync to all weddings (including this one)
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
          // Create tasks in current wedding
          const existingTitles = new Set(tasks.map(t => t.title.toLowerCase()));
          for (const r of allRows) {
            const title = (
              r['ACTIVIDAD_O_REQUISITO'] || r['ACTIVIDAD'] || r['Actividad'] ||
              r['TAREA'] || r['Tarea'] || r['TITULO'] || ''
            ).toString().trim();
            const category = (
              r['ETAPA_O_MES'] || r['ETAPA'] || r['MES'] || r['CATEGORIA'] || '12 Meses Antes'
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
                  notes: 'Importado por Excel'
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

  const categories = [
    'ALL',
    '12 Meses Antes',
    '9 a 6 Meses Antes',
    '3 a 2 Meses Antes',
    'Mes 1',
    'Día B',
    'Trámites',
    'Proveedores',
    'Logística',
    'Novios',
    'Ceremonia'
  ];

  const filteredTasks = tasks.filter(t => categoryFilter === 'ALL' || t.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Control de Pendientes y Etapas VLB
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Checklist Operativo por Mes
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Actividades editables desde 12 meses antes de la boda hasta el Día B, o importables por Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadVlbMasterChecklist}
            disabled={importingTemplate}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#EFE8DE] hover:bg-[#EFE2DF] text-[#332C2A] border border-[#DDD2C4] text-xs font-semibold rounded-xl transition disabled:opacity-50"
            title="Importar actividades de la Plantilla Maestra de VLB Studio (Mes 12 al Día B)"
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
            <div className="text-[10px] uppercase font-bold text-stone-400">Avance Global del Checklist</div>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
              {stats.progressPercent}% Completado
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="text-emerald-700">{stats.completed} listas</span>
            <span className="text-amber-700">{stats.inProgress} en proceso</span>
            <span className="text-stone-500">{stats.pending} pendientes</span>
          </div>
        </div>

        <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-900 rounded-full transition-all duration-300"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              categoryFilter === cat
                ? 'bg-stone-900 text-white font-semibold'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            {cat === 'ALL' ? 'Todas las Etapas' : cat}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs">Cargando checklist...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="luxury-card rounded-2xl p-8 text-center text-stone-400 text-xs border border-dashed border-stone-300">
            No hay actividades en esta etapa. Puedes hacer clic en <strong>"Cargar Plantilla VLB"</strong> o <strong>"Subir Excel"</strong> arriba.
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className={`luxury-card rounded-2xl p-4 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                task.status === 'Completada' ? 'bg-stone-50/60 border-stone-200 opacity-75' : 'border-stone-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition ${
                    task.status === 'Completada'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : task.status === 'En proceso'
                      ? 'bg-amber-100 border-amber-400 text-amber-800'
                      : 'border-stone-300 bg-white'
                  }`}
                >
                  {task.status === 'Completada' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {task.status === 'En proceso' && <Clock className="w-3.5 h-3.5" />}
                </button>

                <div>
                  <h4 className={`text-xs font-bold text-stone-900 ${task.status === 'Completada' ? 'line-through text-stone-400' : ''}`}>
                    {task.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 mt-1">
                    <span className="bg-[#EFE2DF] text-[#885853] px-2 py-0.5 rounded-md font-semibold">
                      {task.category}
                    </span>
                    {task.responsible && (
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-stone-400" />
                        <span>{task.responsible}</span>
                      </span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>Límite: {task.due_date}</span>
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      task.priority === 'Alta'
                        ? 'bg-rose-100 text-rose-900'
                        : task.priority === 'Media'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-stone-100 text-stone-600'
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  {task.notes && (
                    <p className="text-[11px] text-stone-500 mt-1.5 italic">{task.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border transition ${
                    task.status === 'Completada'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : task.status === 'En proceso'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  {task.status}
                </button>

                <button
                  onClick={() => handleOpenEditModal(task)}
                  className="text-stone-400 hover:text-stone-900 p-1"
                  title="Editar actividad"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-stone-300 hover:text-rose-600 p-1"
                  title="Eliminar actividad"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Nueva o Editar Actividad */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">
              {editingTaskId ? 'Editar Actividad' : 'Nueva Actividad en Checklist'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Actividad / Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Enviar listado final de alergias al banquetero"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Etapa / Mes</label>
                  <select
                    value={taskForm.category}
                    onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  >
                    <option value="12 Meses Antes">12 Meses Antes (1 Año)</option>
                    <option value="9 a 6 Meses Antes">9 a 6 Meses Antes</option>
                    <option value="3 a 2 Meses Antes">3 a 2 Meses Antes</option>
                    <option value="Mes 1">Mes 1 (Último Mes)</option>
                    <option value="Día B">Día B</option>
                    <option value="Trámites">Trámites</option>
                    <option value="Proveedores">Proveedores</option>
                    <option value="Logística">Logística</option>
                    <option value="Novios">Novios</option>
                    <option value="Ceremonia">Ceremonia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Prioridad</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Responsable</label>
                  <input
                    type="text"
                    placeholder="VLB Studio o Novios"
                    value={taskForm.responsible}
                    onChange={e => setTaskForm({ ...taskForm, responsible: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Notas Adicionales</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre entregables o especificaciones..."
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
