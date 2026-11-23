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

  const filteredTasks = useMemo(() => {
    const base = checklist.filter(t => {
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

    if (filter === 'PRONTO' && base.length === 0 && !search.trim()) {
      return checklist.filter(t => !t.completed).slice(0, 10);
    }
    return base;
  }, [checklist, filter, search, soonCutoff]);

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

  const autoExpandAll = Boolean(search.trim()) || filter === 'PRONTO' || filter === 'LISTAS';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
            Paso a Paso · Fechas Reales Calculadas
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-1">
            Checklist
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium shadow-2xs transition cursor-pointer self-start sm:self-auto focus:outline-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Calm Progress Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE8E1] shadow-2xs space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8A7E72]">
              Avance de Planeación
            </span>
            <div className="font-editorial text-3xl text-[#2B2826] mt-0.5">
              {pct}% <span className="text-sm text-[#8A7E72] font-light">listo</span>
            </div>
          </div>
          <span className="text-xs text-[#577355] bg-[#E5EDE6] px-3 py-1 rounded-full font-medium">
            {completedCount} de {checklist.length} completadas
          </span>
        </div>
        <div className="h-2 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
          <div className="h-full bg-[#C48B81] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Clean Single-Row Filter Bar: Status + Owner + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Pills */}
          <div className="flex items-center p-1 bg-white rounded-full border border-[#EFE8E1] w-fit shadow-2xs">
            {[
              { id: 'PENDIENTES', label: `Pendientes (${pendingCount})` },
              { id: 'PRONTO', label: `Este Mes (${thisMonthCount})` },
              { id: 'LISTAS', label: `Listas (${completedCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer focus:outline-none ${
                  filter === tab.id ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7E72]" />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
          />
        </div>
      </div>

      {/* Grouped Accordion Stage Cards */}
      {groupedByStage.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#EFE8E1] text-xs text-[#8A7E72] font-light">
          No hay tareas en esta vista.
        </div>
      ) : (
        <div className="space-y-3">
          {groupedByStage.map(group => {
            const isCurrent = group.stage === currentStage;
            const isOpen = autoExpandAll || Boolean(expandedStages[group.stage]);

            return (
              <div
                key={group.stage}
                className={`bg-white rounded-3xl border shadow-2xs overflow-hidden transition-colors ${
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
                      <ChevronRight className="w-4 h-4 text-[#8A7E72] shrink-0" />
                    )}
                    <h3 className="font-editorial text-xl text-[#2B2826] leading-tight">
                      {group.stage}
                    </h3>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F7EDEB] border border-[#EEDAD6] text-[#A86B60] text-[10px] font-semibold uppercase tracking-wider">
                        <Sparkles className="w-2.5 h-2.5" />
                        Tu etapa actual
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
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white border border-[#EFE8E1] text-[#7D6F6B]">
                      {group.doneInStage} / {group.totalInStage}
                    </span>
                  </div>
                </button>

                {/* Stage Tasks */}
                {isOpen && (
                  <div className="px-4 sm:px-6 py-1 divide-y divide-[#FAF8F5]">
                    {group.tasks.map(task => (
                      <div
                        key={task.id}
                        className="py-3.5 flex items-start justify-between gap-3 group hover:bg-[#FAF8F5]/50 px-2 rounded-xl transition"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id)}
                            className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition cursor-pointer focus:outline-none ${
                              task.completed
                                ? 'bg-[#577355] border-[#577355] text-white'
                                : 'border-[#D8CFC8] bg-white hover:border-[#C48B81]'
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
                              className={`text-sm leading-snug transition-colors ${
                                task.completed
                                  ? 'line-through text-[#8A7E72]'
                                  : 'text-[#2B2826] group-hover:text-[#A86B60]'
                              }`}
                            >
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#8A7E72] font-light">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#C48B81]" />
                                {formatShortDate(task.dueDate)}
                              </span>
                              <span>· {task.owner}</span>
                            </div>
                            {task.notes && (
                              <p className="text-xs text-[#A86B60] italic mt-1.5 font-light">{task.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditTask(task)}
                            className="p-2 rounded-full text-[#8A7E72] hover:text-[#2B2826] hover:bg-white transition cursor-pointer focus:outline-none"
                            title={isLockedAgencyNovios ? 'Agregar nota personal' : 'Editar tarea o nota'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!isLockedAgencyNovios && (
                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="p-2 rounded-full text-[#8A7E72]/40 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer focus:outline-none sm:opacity-0 sm:group-hover:opacity-100"
                              title="Quitar tarea (si no aplica a tu boda)"
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
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">Tarea</label>
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
                <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">Etapa</label>
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
                <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">Responsable</label>
                <select
                  value={editForm.owner}
                  onChange={e => setEditForm({ ...editForm, owner: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                >
                  <option value="Ambos">Ambos</option>
                  <option value="Novia">Novia</option>
                  <option value="Novio">Novio</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">Fecha</label>
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
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">Nota personal</label>
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
                className="px-4 py-2 text-xs text-[#8A7E72] cursor-pointer focus:outline-none"
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
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">Etapa</label>
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
          <div className="grid grid-cols-2 gap-3">
            <select
              value={newForm.owner}
              onChange={e => setNewForm({ ...newForm, owner: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
            >
              <option value="Ambos">Ambos</option>
              <option value="Novia">Novia</option>
              <option value="Novio">Novio</option>
            </select>
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
              className="px-4 py-2 text-xs text-[#8A7E72] cursor-pointer focus:outline-none"
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
