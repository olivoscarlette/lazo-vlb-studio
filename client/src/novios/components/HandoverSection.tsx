import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Package,
  PackageCheck,
  Pencil,
  Trash2,
  Download,
  UserCheck
} from 'lucide-react';
import { HandoverItem, WeddingProfile } from '../types/lazo';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';
import { exportHandoverPdf } from '../utils/pdfExport';

interface HandoverSectionProps {
  profile: WeddingProfile;
  items: HandoverItem[];
  onChange: (nextItems: HandoverItem[]) => void;
}

const CATEGORIES = [
  'Ceremonia & Brindis',
  'Amenidades & Recuerdos',
  'Decoración & Señalética',
  'Bebidas & Insumos',
  'Otros'
];

const QUICK_SUGGESTIONS: Array<{ name: string; category: string; qtyDelivered: string }> = [
  { name: 'Copas de brindis', category: 'Ceremonia & Brindis', qtyDelivered: '2 piezas' },
  { name: 'Pala y cuchillo de pastel', category: 'Ceremonia & Brindis', qtyDelivered: '1 juego' },
  { name: 'Pantuflas / Sandalias', category: 'Amenidades & Recuerdos', qtyDelivered: '30 pares' },
  { name: 'Kit de baño (damas y caballeros)', category: 'Amenidades & Recuerdos', qtyDelivered: '2 canastas' },
  { name: 'Recuerdos / Souvenirs', category: 'Amenidades & Recuerdos', qtyDelivered: '1 caja' },
  { name: 'Libro de firmas y pluma', category: 'Decoración & Señalética', qtyDelivered: '1 pieza' },
  { name: 'Bebidas / Botellas extra', category: 'Bebidas & Insumos', qtyDelivered: '1 caja' },
  { name: 'Señalética / Menús / Letreros', category: 'Decoración & Señalética', qtyDelivered: '1 paquete' }
];

const HANDOVER_STAGES = ['IGLESIA', 'CIVIL', 'RECEPCIÓN', 'OTRO'] as const;
type HandoverStage = (typeof HANDOVER_STAGES)[number];

const HANDOVER_UNITS: Array<{ value: string; singular: string; plural: string }> = [
  { value: 'pieza', singular: 'pieza', plural: 'piezas' },
  { value: 'caja', singular: 'caja', plural: 'cajas' },
  { value: 'botella', singular: 'botella', plural: 'botellas' },
  { value: 'paquete', singular: 'paquete', plural: 'paquetes' },
  { value: 'par', singular: 'par', plural: 'pares' },
  { value: 'canasta', singular: 'canasta', plural: 'canastas' },
  { value: 'bolsa', singular: 'bolsa', plural: 'bolsas' },
  { value: 'juego', singular: 'juego', plural: 'juegos' },
  { value: 'kit', singular: 'kit', plural: 'kits' },
  { value: 'charola', singular: 'charola', plural: 'charolas' }
];

const formatQtyWithUnit = (numRaw: string, unitValue: string): string => {
  const cleanNum = numRaw.trim() || '1';
  const unitObj = HANDOVER_UNITS.find(u => u.value === unitValue) || HANDOVER_UNITS[0];
  const n = Number(cleanNum);
  const label = !Number.isNaN(n) && n === 1 ? unitObj.singular : unitObj.plural;
  return `${cleanNum} ${label}`;
};

const parseQtyAndUnit = (raw?: string): { qtyNum: string; qtyUnit: string } => {
  const str = (raw || '').trim();
  if (!str) return { qtyNum: '1', qtyUnit: 'pieza' };
  const match = /^(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(str);
  if (!match) return { qtyNum: '1', qtyUnit: 'pieza' };
  const qtyNum = match[1];
  const rest = match[2].trim().toLowerCase();
  const found = HANDOVER_UNITS.find(
    u => rest === u.value || rest === u.singular || rest === u.plural || rest.startsWith(u.singular)
  );
  return { qtyNum, qtyUnit: found ? found.value : 'pieza' };
};

const getStageBadgeClass = (stage: string) => {
  const upper = stage.toUpperCase();
  if (upper === 'CIVIL') return 'bg-[#F7EDEB] text-[#A86B60] border-[#ECD9D5]';
  if (upper === 'IGLESIA') return 'bg-[#FAF3E8] text-[#7C5824] border-[#E8D7B8]';
  if (upper === 'OTRO') return 'bg-[#F3EFEA] text-[#6B615A] border-[#E6DFD6]';
  return 'bg-[#FAF8F5] text-[#5A524C] border-[#EFE8E1]';
};

export const HandoverSection: React.FC<HandoverSectionProps> = ({
  profile,
  items,
  onChange
}) => {
  const { user } = useAuth();
  const isCoordinator = user?.role !== 'NOVIOS';
  const [phase, setPhase] = useState<'recepcion' | 'devolucion'>('recepcion');
  const [stageFilter, setStageFilter] = useState<'TODAS' | HandoverStage>('TODAS');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: CATEGORIES[0],
    stages: ['RECEPCIÓN'] as HandoverStage[],
    stageSplit: {} as Partial<Record<HandoverStage, string>>,
    qtyNum: '1',
    qtyUnit: 'pieza',
    deliveredNotes: '',
    qtyReturned: '',
    returnedToWhom: '',
    returnNotes: ''
  });

  const getItemStages = (it: HandoverItem): HandoverStage[] => {
    if (it.stageSplit && Object.keys(it.stageSplit).length > 0) {
      const valid = HANDOVER_STAGES.filter(st => Object.prototype.hasOwnProperty.call(it.stageSplit, st));
      if (valid.length > 0) return valid;
    }
    return [(it.stage || 'RECEPCIÓN') as HandoverStage];
  };

  const visibleItems =
    stageFilter === 'TODAS' ? items : items.filter(it => getItemStages(it).includes(stageFilter));

  const receivedCount = visibleItems.filter(i => i.receivedByStaff).length;
  const returnedCount = visibleItems.filter(i => i.returnedToCouple).length;
  const receivedPct = visibleItems.length > 0 ? Math.round((receivedCount / visibleItems.length) * 100) : 0;
  const returnedPct = visibleItems.length > 0 ? Math.round((returnedCount / visibleItems.length) * 100) : 0;

  const openAddModal = () => {
    const initialStage: HandoverStage = stageFilter === 'TODAS' ? 'RECEPCIÓN' : stageFilter;
    setEditingId(null);
    setForm({
      name: '',
      category: CATEGORIES[0],
      stages: [initialStage],
      stageSplit: { [initialStage]: '' },
      qtyNum: '1',
      qtyUnit: 'pieza',
      deliveredNotes: '',
      qtyReturned: '',
      returnedToWhom: '',
      returnNotes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (item: HandoverItem) => {
    const existingStages = getItemStages(item);
    const { qtyNum, qtyUnit } = parseQtyAndUnit(item.qtyDelivered);
    const unitObj = HANDOVER_UNITS.find(u => u.value === qtyUnit);
    const existingSplit: Partial<Record<HandoverStage, string>> = {};
    existingStages.forEach(st => {
      const rawVal = (item.stageSplit?.[st] || '').trim();
      if (rawVal && unitObj) {
        const m = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s+(?:${unitObj.singular}|${unitObj.plural})$`, 'i').exec(rawVal);
        existingSplit[st] = m ? m[1] : rawVal;
      } else {
        existingSplit[st] = rawVal;
      }
    });
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category || CATEGORIES[0],
      stages: existingStages,
      stageSplit: existingSplit,
      qtyNum,
      qtyUnit,
      deliveredNotes: item.deliveredNotes || '',
      qtyReturned: item.qtyReturned || '',
      returnedToWhom: item.returnedToWhom || '',
      returnNotes: item.returnNotes || ''
    });
    setShowModal(true);
  };

  const toggleFormStage = (st: HandoverStage) => {
    setForm(prev => {
      const has = prev.stages.includes(st);
      if (has && prev.stages.length === 1) return prev; // always keep at least 1 stage
      const nextStages = has
        ? prev.stages.filter(x => x !== st)
        : HANDOVER_STAGES.filter(x => x === st || prev.stages.includes(x));
      const nextSplit: Partial<Record<HandoverStage, string>> = {};
      nextStages.forEach(k => {
        nextSplit[k] = prev.stageSplit[k] || '';
      });
      return { ...prev, stages: nextStages, stageSplit: nextSplit };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const cleanStages: HandoverStage[] = form.stages.length > 0 ? form.stages : ['RECEPCIÓN'];
    const formattedQtyDelivered = formatQtyWithUnit(form.qtyNum, form.qtyUnit);
    const cleanSplit: Partial<Record<HandoverStage, string>> = {};
    cleanStages.forEach(st => {
      const raw = (form.stageSplit[st] || '').trim();
      if (!raw) {
        cleanSplit[st] = '';
      } else if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
        cleanSplit[st] = formatQtyWithUnit(raw, form.qtyUnit);
      } else {
        cleanSplit[st] = raw;
      }
    });

    if (editingId) {
      onChange(
        items.map(it =>
          it.id === editingId
            ? {
                ...it,
                name: form.name.trim(),
                category: form.category,
                stage: cleanStages[0],
                stageSplit: cleanSplit,
                qtyDelivered: formattedQtyDelivered,
                deliveredNotes: form.deliveredNotes.trim(),
                qtyReturned: form.qtyReturned.trim(),
                returnedToWhom: form.returnedToWhom.trim(),
                returnNotes: form.returnNotes.trim()
              }
            : it
        )
      );
    } else {
      const next: HandoverItem = {
        id: `hnd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: form.name.trim(),
        category: form.category,
        stage: cleanStages[0],
        stageSplit: cleanSplit,
        qtyDelivered: formattedQtyDelivered,
        deliveredNotes: form.deliveredNotes.trim(),
        receivedByStaff: isCoordinator,
        receivedAt: isCoordinator ? new Date().toISOString() : undefined,
        returnedToCouple: false,
        qtyReturned: form.qtyReturned.trim(),
        returnedToWhom: form.returnedToWhom.trim(),
        returnNotes: form.returnNotes.trim()
      };
      onChange([next, ...items]);
    }
    setShowModal(false);
    setEditingId(null);
  };

  const handleQuickAdd = (s: { name: string; category: string; qtyDelivered: string }) => {
    const initialStage: HandoverStage = stageFilter === 'TODAS' ? 'RECEPCIÓN' : stageFilter;
    const next: HandoverItem = {
      id: `hnd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: s.name,
      category: s.category,
      stage: initialStage,
      stageSplit: { [initialStage]: '' },
      qtyDelivered: s.qtyDelivered,
      deliveredNotes: '',
      receivedByStaff: isCoordinator,
      receivedAt: isCoordinator ? new Date().toISOString() : undefined,
      returnedToCouple: false
    };
    onChange([...items, next]);
  };

  const handleMarkAllReceived = () => {
    const visibleIds = new Set(visibleItems.map(it => it.id));
    const nowIso = new Date().toISOString();
    onChange(
      items.map(it =>
        visibleIds.has(it.id) && !it.receivedByStaff
          ? { ...it, receivedByStaff: true, receivedAt: nowIso }
          : it
      )
    );
  };

  const toggleReceived = (id: string) => {
    onChange(
      items.map(it =>
        it.id === id
          ? {
              ...it,
              receivedByStaff: !it.receivedByStaff,
              receivedAt: !it.receivedByStaff ? new Date().toISOString() : undefined
            }
          : it
      )
    );
  };

  const toggleReturned = (id: string) => {
    onChange(
      items.map(it =>
        it.id === id ? { ...it, returnedToCouple: !it.returnedToCouple } : it
      )
    );
  };

  const deleteItem = (id: string) => {
    onChange(items.filter(it => it.id !== id));
    if (editingId === id) {
      setShowModal(false);
      setEditingId(null);
    }
  };

  const existingNames = new Set(items.map(i => i.name.toLowerCase()));
  const availableSuggestions = QUICK_SUGGESTIONS.filter(s => !existingNames.has(s.name.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Phase Switcher & Actions Bar */}
      <div className="bg-white rounded-[1.5rem] sm:rounded-[1.75rem] p-5 sm:p-6 border border-[#EFE8E1] shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* 2-Phase Checklist Switcher */}
          <div className="grid grid-cols-2 sm:inline-flex items-center p-1 bg-[#FAF8F5] rounded-2xl sm:rounded-full border border-[#EFE8E1] gap-1">
            <button
              type="button"
              onClick={() => setPhase('recepcion')}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl sm:rounded-full text-xs sm:text-[13px] font-medium transition cursor-pointer ${
                phase === 'recepcion'
                  ? 'bg-[#C48B81] text-white shadow-2xs'
                  : 'text-[#6E605C] hover:text-[#2B2826]'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>1. Entrega previa ({receivedCount}/{visibleItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPhase('devolucion')}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl sm:rounded-full text-xs sm:text-[13px] font-medium transition cursor-pointer ${
                phase === 'devolucion'
                  ? 'bg-[#C48B81] text-white shadow-2xs'
                  : 'text-[#6E605C] hover:text-[#2B2826]'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 shrink-0" />
              <span>2. Devolución al cierre ({returnedCount}/{visibleItems.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {visibleItems.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  exportHandoverPdf(
                    profile,
                    visibleItems,
                    stageFilter === 'TODAS' ? undefined : stageFilter
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#C48B81]" />
                <span>{stageFilter === 'TODAS' ? 'Recibo PDF' : `PDF ${stageFilter}`}</span>
              </button>
            )}
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2B2826] hover:bg-[#191615] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar artículo</span>
            </button>
          </div>
        </div>

        {/* Stage Filter Chips: Todos · Iglesia · Civil · Recepción · Otro */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setStageFilter('TODAS')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer border ${
              stageFilter === 'TODAS'
                ? 'bg-[#2B2826] text-white border-[#2B2826]'
                : 'bg-[#FAF8F5] text-[#6E605C] border-[#EFE8E1] hover:border-[#C48B81]'
            }`}
          >
            Todos ({items.length})
          </button>
          {HANDOVER_STAGES.map(st => {
            const count = items.filter(it => getItemStages(it).includes(st)).length;
            const active = stageFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStageFilter(st)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer border ${
                  active
                    ? 'bg-[#C48B81] text-white border-[#C48B81]'
                    : 'bg-[#FAF8F5] text-[#6E605C] border-[#EFE8E1] hover:border-[#C48B81]'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Contextual Progress Bar for Active Phase */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7D6F6B]">
            <span>
              {phase === 'recepcion'
                ? 'Artículos entregados por los novios a coordinación antes del evento'
                : 'Control de sobrantes y artículos devueltos al terminar el evento'}
            </span>
            <div className="flex items-center gap-2.5 shrink-0">
              {isCoordinator && phase === 'recepcion' && visibleItems.length > 0 && receivedCount < visibleItems.length && (
                <button
                  type="button"
                  onClick={handleMarkAllReceived}
                  className="text-[11px] font-medium text-[#577355] hover:text-[#384C3A] bg-[#E5EDE6]/70 hover:bg-[#E5EDE6] px-2.5 py-0.5 rounded-full border border-[#D0DDD1] transition cursor-pointer"
                >
                  ✓ Marcar todo recibido
                </button>
              )}
              <span className="font-medium text-[#2B2826]">
                {phase === 'recepcion' ? `${receivedPct}% recibido` : `${returnedPct}% devuelto`}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                phase === 'recepcion' ? 'bg-[#C48B81]' : 'bg-[#577355]'
              }`}
              style={{ width: `${phase === 'recepcion' ? receivedPct : returnedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-[1.75rem] p-7 sm:p-10 border border-[#EFE8E1] shadow-2xs text-center space-y-5">
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="font-editorial text-2xl text-[#2B2826]">
              Control de Artículos &amp; Sobrantes
            </h3>
            <p className="text-xs sm:text-sm text-[#7D6F6B] font-light leading-relaxed">
              Registra todo lo que los novios entregan para llevar el día del evento y lleva el control exacto de qué sobró y a quién se devolvió al cierre.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            <p className="text-[10.5px] uppercase tracking-[0.2em] font-semibold text-[#C48B81]">
              Toca para agregar rápidos
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {QUICK_SUGGESTIONS.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleQuickAdd(s)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F7EDEB] border border-[#EFE8E1] hover:border-[#C48B81]/60 text-xs text-[#2B2826] transition cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#C48B81]" />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="bg-white rounded-[1.75rem] p-8 border border-[#EFE8E1] shadow-2xs text-center space-y-3">
          <p className="font-editorial text-xl text-[#2B2826]">
            No hay artículos marcados para {stageFilter}
          </p>
          <p className="text-xs text-[#7D6F6B] font-light">
            Agrega un artículo nuevo o edita uno existente para asignarlo a {stageFilter}.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar para {stageFilter}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[1.75rem] border border-[#EFE8E1] shadow-2xs overflow-hidden divide-y divide-[#F5EFEA]">
          {visibleItems.map(item => {
            const isChecked = phase === 'recepcion' ? item.receivedByStaff : item.returnedToCouple;
            const itemStages = getItemStages(item);
            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 hover:bg-[#FAF8F5]/60 transition group"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => (phase === 'recepcion' ? toggleReceived(item.id) : toggleReturned(item.id))}
                    className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition cursor-pointer ${
                      isChecked
                        ? 'bg-[#577355] border-[#577355] text-white'
                        : 'border-[#D4C5BC] bg-white hover:border-[#C48B81]'
                    }`}
                    title={
                      phase === 'recepcion'
                        ? isChecked
                          ? 'Desmarcar recibido'
                          : 'Marcar recibido por coordinación'
                        : isChecked
                          ? 'Desmarcar devuelto'
                          : 'Marcar devuelto al cierre'
                    }
                  >
                    {isChecked && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div onClick={() => openEditModal(item)} className="min-w-0 flex-1 cursor-pointer">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p
                        className={`text-[14.5px] sm:text-[15px] font-medium leading-snug ${
                          isChecked ? 'text-[#577355]' : 'text-[#2B2826]'
                        }`}
                      >
                        {item.name}
                      </p>
                      {itemStages.map(st => {
                        const splitQty = item.stageSplit?.[st]?.trim();
                        return (
                          <span
                            key={st}
                            className={`text-[9.5px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStageBadgeClass(st)}`}
                          >
                            {splitQty ? `${st}: ${splitQty}` : st}
                          </span>
                        );
                      })}
                      <span className="text-[10.5px] text-[#7D6F6B] bg-[#FAF8F5] border border-[#EFE8E1] px-2.5 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    </div>

                    {phase === 'recepcion' ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#7D6F6B] font-light">
                        <span>
                          Cantidad: <strong className="font-medium text-[#2B2826]">{item.qtyDelivered}</strong>
                        </span>
                        {item.deliveredNotes && (
                          <span className="text-[#A86B60] italic">{item.deliveredNotes}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#7D6F6B] font-light">
                        <span>
                          Entregado originalmente: <strong className="font-medium text-[#2B2826]">{item.qtyDelivered}</strong>
                        </span>
                        {item.qtyReturned && (
                          <span className="text-[#577355] font-medium">
                            Sobrante / devuelto: {item.qtyReturned}
                          </span>
                        )}
                        {item.returnedToWhom && (
                          <span className="inline-flex items-center gap-1 text-[#2B2826]">
                            <UserCheck className="w-3 h-3 text-[#C48B81]" />
                            {item.returnedToWhom}
                          </span>
                        )}
                        {item.returnNotes && (
                          <span className="text-[#A86B60] italic">{item.returnNotes}</span>
                        )}
                        {!item.qtyReturned && !item.returnedToWhom && (
                          <span className="text-[#9A8B84] italic">
                            Toca para anotar sobrante y a quién se entregó
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-full text-[#7D6F6B] hover:text-[#2B2826] hover:bg-white transition cursor-pointer"
                    title="Editar detalle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="p-2 rounded-full text-[#7D6F6B]/50 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
                    title="Eliminar artículo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Subtle quick-add row at the bottom when suggestions remain */}
          {availableSuggestions.length > 0 && phase === 'recepcion' && (
            <div className="p-4 sm:p-5 bg-[#FAF8F5]/60 flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] uppercase tracking-[0.16em] text-[#9A8B84] font-medium mr-1">
                Sugeridos:
              </span>
              {availableSuggestions.slice(0, 4).map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleQuickAdd(s)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-[#F7EDEB] border border-[#EFE8E1] text-[11.5px] text-[#5A524C] transition cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#C48B81]" />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Handover Item Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
        }}
        title={editingId ? 'Detalle del Artículo' : 'Nuevo Artículo para el Evento'}
        subtitle={
          phase === 'devolucion'
            ? 'Registra lo que sobró y a quién se entrega al cierre del evento.'
            : 'Registra qué entregan los novios a coordinación y cómo viene empacado.'
        }
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
              Artículo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Copas de brindis, Pantuflas, Botellas..."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B]">
                ¿Para qué momento(s) es?
              </label>
              <span className="text-[10px] text-[#A86B60] font-light">
                Puedes elegir varios y repartir cantidad
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {HANDOVER_STAGES.map(st => {
                const active = form.stages.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleFormStage(st)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold tracking-wider border transition cursor-pointer ${
                      active
                        ? 'bg-[#C48B81] text-white border-[#C48B81] shadow-2xs'
                        : 'bg-[#FAF8F5] text-[#6E605C] border-[#EFE8E1] hover:border-[#C48B81]'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>

            {form.stages.length > 1 && (
              <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1] space-y-2">
                <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] block">
                  Reparto por momento ({HANDOVER_UNITS.find(u => u.value === form.qtyUnit)?.plural || 'piezas'})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {form.stages.map(st => (
                    <div key={st} className="flex items-center gap-2">
                      <span
                        className={`text-[9.5px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg border shrink-0 w-20 text-center ${getStageBadgeClass(st)}`}
                      >
                        {st}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej. 1"
                        value={form.stageSplit[st] || ''}
                        onChange={e =>
                          setForm(prev => ({
                            ...prev,
                            stageSplit: { ...prev.stageSplit, [st]: e.target.value }
                          }))
                        }
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white border border-[#EFE8E1] text-xs focus:border-[#C48B81]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Cantidad entregada
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  step="any"
                  inputMode="decimal"
                  value={form.qtyNum}
                  onChange={e => setForm({ ...form, qtyNum: e.target.value })}
                  className="w-20 px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm text-center font-medium focus:border-[#C48B81]"
                />
                <select
                  value={form.qtyUnit}
                  onChange={e => setForm({ ...form, qtyUnit: e.target.value })}
                  className="flex-1 min-w-0 px-2.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
                >
                  {HANDOVER_UNITS.map(u => (
                    <option key={u.value} value={u.value}>
                      {Number(form.qtyNum) === 1 ? u.singular : u.plural}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
              Notas de recepción / empaque
            </label>
            <input
              type="text"
              placeholder="Ej. En caja blanca con listón, frágil..."
              value={form.deliveredNotes}
              onChange={e => setForm({ ...form, deliveredNotes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
            />
          </div>

          {/* Closing / Return details */}
          <div className="pt-3 border-t border-[#EFE8E1] space-y-3">
            <span className="text-[10.5px] uppercase tracking-[0.2em] font-semibold text-[#577355] block">
              Devolución al cierre del evento (lo que sobra)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                  Sobrante / Devuelto
                </label>
                <input
                  type="text"
                  placeholder="Ej. Sobran 8 pares, Completo"
                  value={form.qtyReturned}
                  onChange={e => setForm({ ...form, qtyReturned: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                  ¿A quién se entregó?
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mamá de la novia, Auto..."
                  value={form.returnedToWhom}
                  onChange={e => setForm({ ...form, returnedToWhom: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Observaciones de cierre
              </label>
              <input
                type="text"
                placeholder="Ej. Se consumió todo / Guardado en cajuela..."
                value={form.returnNotes}
                onChange={e => setForm({ ...form, returnNotes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-full text-xs text-[#7D6F6B] hover:text-[#2B2826] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              {editingId ? 'Guardar cambios' : 'Agregar artículo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
