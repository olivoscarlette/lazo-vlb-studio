import React, { useMemo, useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { CHECKLIST_STAGE_ORDER, formatShortDate } from '../data/seedWedding';
import { ChecklistItem } from '../types/lazo';
import { Modal } from '../components/Modal';

function detectCurrentStage(weddingDate?: string): string {
  if (!weddingDate) return '12 - 16 meses';
  const target = new Date(weddingDate + 'T12:00:00').getTime();
  const diffDays = (target - Date.now()) / 86400000;
  const diffMonths = diffDays / 30.44;
  if (diffMonths >= 11.5) return '12 - 16 meses';
  if (diffMonths >= 9.5) return '10 - 11 meses';
  if (diffMonths >= 7.5) return '8 - 9 meses';
  if (diffMonths >= 5.5) return '6 - 7 meses';
  if (diffMonths >= 3.5) return '4 - 5 meses';
  if (diffMonths >= 1.5) return '2 - 3 meses';
  if (diffDays >= 20) return '1 mes';
  if (diffDays >= 10) return '15 días';
  return '1 semana';
}

export const ChecklistView: React.FC = () => {
  const { wedding, flags, updateWedding } = useWedding();
  const isLockedAgencyNovios = !flags.isAdmin && !flags.isVirtualNovios;
  const currentStage = useMemo(
    () => detectCurrentStage(wedding?.profile.weddingDate),
    [wedding?.profile.weddingDate]
  );

  const [filter, setFilter] = useState<'PENDIENTES' | 'PRONTO' | 'LISTAS'>('PENDIENTES');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(() => ({
    [detectCurrentStage(wedding?.profile.weddingDate)]: true
  }));

  // Edit / Detail Modal
  const [editingTask, setEditingTask] = useState<ChecklistItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'Mis Tareas',
    owner: 'Ambos' as ChecklistItem['owner'],
    dueDate: '',
    notes: ''
  });

  // New Task Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '',
    category: currentStage,
    owner: 'Ambos' as ChecklistItem['owner'],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  });

  const checklist = wedding?.checklist ?? [];
  const completedCount = checklist.filter(t => t.completed).length;
  const pendingCount = checklist.length - completedCount;
  const pct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  const soonCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().split('T')[0];
  }, []);

  const thisMonthCount = useMemo(
    () => checklist.filter(t => !t.completed && t.dueDate <= soonCutoff).length,
    [checklist, soonCutoff]
  );

  const allStagesSummary = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    checklist.forEach(t => {
      const cat = t.category || 'Mis Tareas';
      const entry = map.get(cat) || { total: 0, done: 0 };
      entry.total += 1;
      if (t.completed) entry.done += 1;
      map.set(cat, entry);
    });
    const ordered: string[] = [];
    CHECKLIST_STAGE_ORDER.forEach(s => {
      if (map.has(s)) ordered.push(s);
    });
    map.forEach((_, key) => {
      if (!ordered.includes(key)) ordered.push(key);
    });
    return ordered.map(stage => {
      const stats = map.get(stage)!;
      return {
        stage,
        total: stats.total,
        done: stats.done,
        pct: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
      };
    });
  }, [checklist]);

  const filteredTasks = useMemo(() => {
    const base = checklist.filter(t => {
      if (selectedStage && (t.category || 'Mis Tareas') !== selectedStage) return false;
      if (filter === 'LISTAS' && !t.completed) return false;
      if (filter === 'PENDIENTES' && t.completed) return false;
      if (filter === 'PRONTO' && (t.completed || t.dueDate > soonCutoff)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.notes || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });

    if (filter === 'PRONTO' && base.length === 0 && !search.trim() && !selectedStage) {
      return checklist.filter(t => !t.completed).slice(0, 10);
    }
    return base;
  }, [checklist, filter, search, soonCutoff, selectedStage]);

  const groupedByStage = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    filteredTasks.forEach(t => {
      const cat = t.category || 'Mis Tareas';
      const arr = map.get(cat) || [];
      arr.push(t);
      map.set(cat, arr);
    });

    const orderedKeys: string[] = [];
    CHECKLIST_STAGE_ORDER.forEach(stage => {
      if (map.has(stage)) orderedKeys.push(stage);
    });
    map.forEach((_, key) => {
      if (!orderedKeys.includes(key)) orderedKeys.push(key);
    });

    return orderedKeys.map(stage => {
      const allInStage = checklist.filter(t => (t.category || 'Mis Tareas') === stage);
      const doneInStage = allInStage.filter(t => t.completed).length;
      return {
        stage,
        tasks: map.get(stage) || [],
        totalInStage: allInStage.length,
        doneInStage,
        stagePct: allInStage.length > 0 ? Math.round((doneInStage / allInStage.length) * 100) : 0
      };
    });
  }, [filteredTasks, checklist]);

  if (!wedding) return null;

  const autoExpandAll = Boolean(search.trim()) || Boolean(selectedStage) || filter === 'PRONTO' || filter === 'LISTAS';

  const toggleTask = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      checklist: prev.checklist.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    }));
  };

  const deleteTask = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      checklist: prev.checklist.filter(t => t.id !== id)
    }));
    if (editingTask?.id === id) setEditingTask(null);
  };

  const toggleStageExpand = (stage: string) => {
    setExpandedStages(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  const openEditTask = (task: ChecklistItem) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      category: task.category || 'Mis Tareas',
      owner: task.owner,
      dueDate: task.dueDate,
      notes: task.notes || ''
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editForm.title.trim()) return;
    updateWedding(prev => ({
      ...prev,
      checklist: prev.checklist.map(t =>
        t.id === editingTask.id
          ? {
              ...t,
              title: editForm.title.trim(),
              category: editForm.category,
              owner: editForm.owner,
              dueDate: editForm.dueDate,
              notes: editForm.notes.trim()
            }
          : t
      )
    }));
    setEditingTask(null);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) return;
    const item: ChecklistItem = {
      id: `chk_custom_${Date.now()}`,
      title: newForm.title.trim(),
      category: newForm.category,
      monthsBefore: 0,
      dueDate: newForm.dueDate,
      completed: false,
      owner: newForm.owner,
      notes: ''
    };
    updateWedding(prev => ({ ...prev, checklist: [item, ...prev.checklist] }));
    setExpandedStages(prev => ({ ...prev, [newForm.category]: true }));
    setNewForm({ title: '', category: currentStage, owner: 'Ambos', dueDate: newForm.dueDate });
    setShowNewModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
            Paso a Paso · Fechas Reales Calculadas
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-1">
            Checklist
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-[13px] font-medium shadow-2xs transition cursor-pointer self-start sm:self-auto focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* 2-Column Luxury Editorial Planner Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR (4 cols): Sculptural Progress + Stage Navigator */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-white rounded-[1.75rem] border border-[#EFE8E1] shadow-2xs divide-y divide-[#EFE8E1] overflow-hidden">
          {/* Progress Summary */}
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
                  Avance de Planeación
                </span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-editorial text-5xl text-[#2B2826] leading-none">
                    {pct}%
                  </span>
                  <span className="text-sm text-[#7D6F6B] font-light">listo</span>
                </div>
              </div>
              <span className="text-xs text-[#577355] bg-[#EBF2EC] px-3 py-1 rounded-full font-medium shrink-0">
                {completedCount} / {checklist.length}
              </span>
            </div>

            <div className="h-2 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C48B81] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] px-3.5 py-2.5">
                <div className="font-editorial text-xl text-[#2B2826]">{pendingCount}</div>
                <div className="text-[11px] text-[#7D6F6B] font-light">Pendientes</div>
              </div>
              <div className="rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] px-3.5 py-2.5">
                <div className="font-editorial text-xl text-[#A86B60]">{thisMonthCount}</div>
                <div className="text-[11px] text-[#7D6F6B] font-light">Este mes</div>
              </div>
            </div>
          </div>

          {/* Stage Quick-Jump Navigator */}
          {allStagesSummary.length > 1 && (
            <div className="p-5 sm:p-6 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] uppercase tracking-[0.2em] font-semibold text-[#7D6F6B]">
                  Etapas
                </span>
                {selectedStage && (
                  <button
                    type="button"
                    onClick={() => setSelectedStage(null)}
                    className="text-[11px] font-medium text-[#C48B81] hover:text-[#A86B60] cursor-pointer"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {allStagesSummary.map(item => {
                  const isActive = selectedStage === item.stage;
                  const isDone = item.total > 0 && item.done === item.total;
                  const isCurrent = item.stage === currentStage;
                  return (
                    <button
                      key={item.stage}
                      type="button"
                      onClick={() => setSelectedStage(prev => (prev === item.stage ? null : item.stage))}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-[#F7EDEB] text-[#A86B60] font-medium'
                          : 'hover:bg-[#FAF8F5] text-[#2B2826]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isDone
                              ? 'bg-[#577355]'
                              : isActive || isCurrent
                                ? 'bg-[#C48B81]'
                                : 'bg-[#DDD2C9]'
                          }`}
                        />
                        <span className="text-[13px] truncate">{item.stage}</span>
                      </div>
                      <span className="text-[11px] text-[#7D6F6B] shrink-0">
                        {item.done}/{item.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT MAIN EDITORIAL TASK LIST (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Clean Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-white rounded-full border border-[#EFE8E1] shadow-2xs w-fit">
              {[
                { id: 'PENDIENTES', label: `Pendientes (${pendingCount})` },
                { id: 'PRONTO', label: `Este Mes (${thisMonthCount})` },
                { id: 'LISTAS', label: `Listas (${completedCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer focus:outline-none ${
                    filter === tab.id
                      ? 'bg-[#C48B81] text-white shadow-2xs'
                      : 'text-[#6E605C] hover:text-[#2B2826]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8B84]" />
              <input
                type="text"
                placeholder="Buscar tarea..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-[#EFE8E1] text-[13px] focus:outline-none focus:border-[#C48B81]"
              />
            </div>
          </div>

          {/* Grouped Accordion Stage Cards */}
          {groupedByStage.length === 0 ? (
            <div className="bg-white rounded-[1.5rem] p-12 text-center border border-[#EFE8E1] space-y-2">
              <p className="font-editorial text-xl text-[#2B2826]">Todo al día en esta vista</p>
              <p className="text-xs text-[#7D6F6B] font-light">
                {selectedStage
                  ? 'No hay tareas pendientes en esta etapa con el filtro actual.'
                  : 'Cambia de filtro o agrega una nueva tarea personalizada.'}
              </p>
              {selectedStage && (
                <button
                  type="button"
                  onClick={() => setSelectedStage(null)}
                  className="mt-2 inline-flex items-center px-4 py-1.5 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] text-xs font-medium text-[#2B2826] hover:border-[#C48B81] cursor-pointer"
                >
                  Mostrar todas las etapas
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByStage.map(group => {
                const isCurrent = group.stage === currentStage;
                const isOpen = autoExpandAll || Boolean(expandedStages[group.stage]);

                return (
                  <div
                    key={group.stage}
                    className={`bg-white rounded-[1.5rem] border shadow-2xs overflow-hidden transition-colors ${
                      isCurrent ? 'border-[#E5D5CE]' : 'border-[#EFE8E1]'
                    }`}
                  >
                    {/* Stage Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleStageExpand(group.stage)}
                      className={`w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 transition cursor-pointer text-left focus:outline-none ${
                        isCurrent ? 'bg-[#FAF5F3]/80 hover:bg-[#FAF5F3]' : 'bg-[#FAF8F5]/60 hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-[#C48B81] shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#7D6F6B] shrink-0" />
                        )}
                        <h3 className="font-editorial text-xl sm:text-[1.35rem] text-[#2B2826] leading-tight">
                          {group.stage}
                        </h3>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F7EDEB] border border-[#EEDAD6] text-[#A86B60] text-[10px] font-semibold uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" />
                            Etapa actual
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:block w-20 h-1.5 bg-[#EFE8E1] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C48B81] rounded-full transition-all duration-300"
                            style={{ width: `${group.stagePct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white border border-[#EFE8E1] text-[#6E605C]">
                          {group.doneInStage} / {group.totalInStage}
                        </span>
                      </div>
                    </button>

                    {/* Stage Tasks */}
                    {isOpen && (
                      <div className="px-4 sm:px-6 py-1.5 divide-y divide-[#F5EFEA]">
                        {group.tasks.map(task => (
                          <div
                            key={task.id}
                            className="py-3.5 flex items-center justify-between gap-4 group hover:bg-[#FAF8F5]/70 px-2.5 -mx-1 rounded-xl transition"
                          >
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleTask(task.id)}
                                className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition cursor-pointer focus:outline-none ${
                                  task.completed
                                    ? 'bg-[#577355] border-[#577355] text-white'
                                    : 'border-[#D4C5BC] bg-white hover:border-[#C48B81]'
                                }`}
                                title={task.completed ? 'Marcar pendiente' : 'Marcar completada'}
                              >
                                {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>

                              <div
                                onClick={() => openEditTask(task)}
                                className="min-w-0 flex-1 cursor-pointer"
                              >
                                <p
                                  className={`text-[14.5px] leading-snug transition-colors ${
                                    task.completed
                                      ? 'line-through text-[#8E817C]'
                                      : 'text-[#2B2826] group-hover:text-[#A86B60]'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                {task.notes && (
                                  <p className="text-xs text-[#A86B60] italic mt-1 font-light">
                                    {task.notes}
                                  </p>
                                )}
                                <div className="sm:hidden flex items-center gap-1.5 mt-1 text-[11px] text-[#7D6F6B] font-light">
                                  <Calendar className="w-3 h-3 text-[#C48B81]" />
                                  <span>{formatShortDate(task.dueDate)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right side: crisp date + subtle edit/delete */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#7D6F6B] font-light bg-[#FAF8F5] border border-[#EFE8E1] px-2.5 py-1 rounded-full">
                                <Calendar className="w-3 h-3 text-[#C48B81]" />
                                {formatShortDate(task.dueDate)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditTask(task)}
                                className="p-2 rounded-full text-[#7D6F6B] hover:text-[#2B2826] hover:bg-white transition cursor-pointer focus:outline-none"
                                title={isLockedAgencyNovios ? 'Agregar nota personal' : 'Editar tarea o nota'}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {!isLockedAgencyNovios && (
                                <button
                                  type="button"
                                  onClick={() => deleteTask(task.id)}
                                  className="p-2 rounded-full text-[#7D6F6B]/40 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer focus:outline-none sm:opacity-0 sm:group-hover:opacity-100"
                                  title="Quitar tarea"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Editar Tarea & Nota */}
      <Modal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title={isLockedAgencyNovios ? 'Nota Personal' : 'Detalle de Tarea'}
        subtitle={
          isLockedAgencyNovios
            ? 'Las fechas y etapas son coordinadas por tu equipo de planeación.'
            : 'Edita la fecha, responsable, notas o quítala si no aplica a tu boda.'
        }
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">Tarea</label>
            <input
              type="text"
              required
              disabled={isLockedAgencyNovios}
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81] disabled:opacity-70"
            />
          </div>

          {!isLockedAgencyNovios && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">Etapa</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                >
                  {CHECKLIST_STAGE_ORDER.map(stage => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">Fecha</label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">Nota personal</label>
            <textarea
              rows={3}
              placeholder="Escribe tus ideas, acuerdos o recordatorios..."
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {!isLockedAgencyNovios ? (
              <button
                type="button"
                onClick={() => editingTask && deleteTask(editingTask.id)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:underline cursor-pointer focus:outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar tarea</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-xs text-[#7D6F6B] cursor-pointer focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium cursor-pointer focus:outline-none"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Nueva Tarea */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nueva Tarea"
      >
        <form onSubmit={handleAddTask} className="space-y-3">
          <input
            type="text"
            required
            autoFocus
            placeholder="¿Qué necesitas hacer? *"
            value={newForm.title}
            onChange={e => setNewForm({ ...newForm, title: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
          />
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">Etapa</label>
            <select
              value={newForm.category}
              onChange={e => setNewForm({ ...newForm, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
            >
              {CHECKLIST_STAGE_ORDER.map(stage => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">Fecha objetivo</label>
            <input
              type="date"
              value={newForm.dueDate}
              onChange={e => setNewForm({ ...newForm, dueDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 text-xs text-[#7D6F6B] cursor-pointer focus:outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium cursor-pointer focus:outline-none"
            >
              Agregar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
