import React, { useState } from 'react';
import {
  Plus, Trash2, Check, MessageSquare, Scale, Wallet, Sparkles, Upload, FileCheck, Edit3, Calendar, Receipt, Eye, Download
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { formatMXN, formatShortDate } from '../data/seedWedding';
import { FileItem, PaymentRecord, QuoteOption, VendorItem } from '../types/lazo';
import { Modal } from '../components/Modal';

const VENDOR_CATEGORIES = [
  'Locación y Banquete',
  'Fotografía',
  'Video',
  'Diseño Floral',
  'Música y DJ',
  'Vestido',
  'Maquillaje',
  'Otro'
];

export const BudgetView: React.FC = () => {
  const { wedding, updateWedding } = useWedding();
  const [subTab, setSubTab] = useState<'resumen' | 'comparador' | 'proveedores' | 'archivos'>('resumen');

  // New Quote Modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    category: 'Fotografía',
    vendorName: '',
    price: '',
    includes: '',
    pros: '',
    cons: '',
    phone: ''
  });

  // New Vendor Modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    category: 'Locación y Banquete',
    phone: '',
    totalCost: '',
    paidAmount: '',
    nextDueDate: '',
    notes: ''
  });

  // Vendor Detail & Edit Modal
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [editVendorDraft, setEditVendorDraft] = useState({
    name: '',
    category: 'Locación y Banquete',
    phone: '',
    totalCost: '',
    nextDueDate: '',
    notes: ''
  });

  // Inline Add Payment inside Vendor Modal
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({
    amount: '',
    concept: 'Anticipo',
    date: new Date().toISOString().split('T')[0],
    method: 'Transferencia' as PaymentRecord['method']
  });

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  if (!wedding) return null;

  const { profile, contributions, quotes, vendors, files } = wedding;

  const selectedVendor = selectedVendorId ? vendors.find(v => v.id === selectedVendorId) || null : null;

  const totalContracted = vendors.reduce((s, v) => s + v.totalCost, 0);
  const totalPaid = vendors.reduce((s, v) => s + v.paidAmount, 0);
  const totalRemaining = Math.max(0, totalContracted - totalPaid);
  const totalSaved = contributions.reduce((s, c) => s + c.saved, 0);
  const budgetUsedPct = profile.budgetGoal > 0 ? Math.min(100, Math.round((totalContracted / profile.budgetGoal) * 100)) : 0;

  // Global chronological payment history across all vendors
  const allPayments = vendors
    .flatMap(v => {
      const list = v.payments && v.payments.length > 0
        ? v.payments
        : v.paidAmount > 0
        ? [{ id: `legacy_${v.id}`, date: '', amount: v.paidAmount, concept: 'Anticipo inicial', method: 'Transferencia' as const }]
        : [];
      return list.map(p => ({ ...p, vendorId: v.id, vendorName: v.name, vendorCategory: v.category }));
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const handleUploadFileRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      const newFile: FileItem = {
        id: `f_${Date.now()}`,
        name: file.name,
        category: file.type.startsWith('image/') ? 'Comprobante' : 'Contrato',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        dataUrl,
        mimeType: file.type
      };
      updateWedding(prev => ({
        ...prev,
        files: [newFile, ...prev.files]
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpdateContribution = (id: string, field: 'pledged' | 'saved', value: number) => {
    updateWedding(prev => ({
      ...prev,
      contributions: prev.contributions.map(c => (c.id === id ? { ...c, [field]: Math.max(0, value) } : c))
    }));
  };

  const handleUpdateContributionLabel = (id: string, label: string) => {
    updateWedding(prev => ({
      ...prev,
      contributions: prev.contributions.map(c => (c.id === id ? { ...c, label } : c))
    }));
  };

  const handleAddContribution = () => {
    updateWedding(prev => ({
      ...prev,
      contributions: [
        ...prev.contributions,
        { id: `c_${Date.now()}`, label: 'Nuevo aportante', pledged: 0, saved: 0 }
      ]
    }));
  };

  const handleDeleteContribution = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      contributions: prev.contributions.filter(c => c.id !== id)
    }));
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.vendorName.trim()) return;
    const newQ: QuoteOption = {
      id: `q_${Date.now()}`,
      category: quoteForm.category,
      vendorName: quoteForm.vendorName.trim(),
      price: Number(quoteForm.price) || 0,
      includes: quoteForm.includes.trim(),
      pros: quoteForm.pros.trim(),
      cons: quoteForm.cons.trim(),
      phone: quoteForm.phone.trim()
    };
    updateWedding(prev => ({ ...prev, quotes: [newQ, ...prev.quotes] }));
    setQuoteForm({ category: 'Fotografía', vendorName: '', price: '', includes: '', pros: '', cons: '', phone: '' });
    setShowQuoteModal(false);
  };

  const handleHireQuote = (q: QuoteOption) => {
    const newVendor: VendorItem = {
      id: `v_${Date.now()}`,
      name: q.vendorName,
      category: q.category,
      phone: q.phone,
      totalCost: q.price,
      paidAmount: 0,
      nextDueDate: '',
      notes: q.includes,
      payments: []
    };
    updateWedding(prev => ({
      ...prev,
      vendors: [newVendor, ...prev.vendors],
      quotes: prev.quotes.filter(item => item.id !== q.id)
    }));
    setSubTab('proveedores');
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) return;
    const initialPaid = Number(vendorForm.paidAmount) || 0;
    const initialPayments: PaymentRecord[] =
      initialPaid > 0
        ? [
            {
              id: `pay_${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              amount: initialPaid,
              concept: 'Anticipo inicial',
              method: 'Transferencia'
            }
          ]
        : [];
    const newV: VendorItem = {
      id: `v_${Date.now()}`,
      name: vendorForm.name.trim(),
      category: vendorForm.category,
      phone: vendorForm.phone.trim(),
      totalCost: Number(vendorForm.totalCost) || 0,
      paidAmount: initialPaid,
      nextDueDate: vendorForm.nextDueDate,
      notes: vendorForm.notes.trim(),
      payments: initialPayments
    };
    updateWedding(prev => ({ ...prev, vendors: [newV, ...prev.vendors] }));
    setVendorForm({ name: '', category: 'Locación y Banquete', phone: '', totalCost: '', paidAmount: '', nextDueDate: '', notes: '' });
    setShowVendorModal(false);
    setSubTab('proveedores');
  };

  const openVendorDetail = (v: VendorItem, openPaymentForm = false) => {
    setSelectedVendorId(v.id);
    setIsEditingVendor(false);
    setShowAddPaymentForm(openPaymentForm);
    setPaymentDraft({
      amount: '',
      concept: v.paidAmount > 0 ? 'Abono' : 'Anticipo',
      date: new Date().toISOString().split('T')[0],
      method: 'Transferencia'
    });
  };

  const startEditSelectedVendor = () => {
    if (!selectedVendor) return;
    setEditVendorDraft({
      name: selectedVendor.name,
      category: selectedVendor.category,
      phone: selectedVendor.phone || '',
      totalCost: String(selectedVendor.totalCost || ''),
      nextDueDate: selectedVendor.nextDueDate || '',
      notes: selectedVendor.notes || ''
    });
    setIsEditingVendor(true);
    setShowAddPaymentForm(false);
  };

  const handleSaveVendorEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !editVendorDraft.name.trim()) return;
    updateWedding(prev => ({
      ...prev,
      vendors: prev.vendors.map(v =>
        v.id === selectedVendor.id
          ? {
              ...v,
              name: editVendorDraft.name.trim(),
              category: editVendorDraft.category,
              phone: editVendorDraft.phone.trim(),
              totalCost: Number(editVendorDraft.totalCost) || 0,
              nextDueDate: editVendorDraft.nextDueDate,
              notes: editVendorDraft.notes.trim()
            }
          : v
      )
    }));
    setIsEditingVendor(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    const amount = Number(paymentDraft.amount);
    if (!amount || amount <= 0) return;

    const newPayment: PaymentRecord = {
      id: `pay_${Date.now()}`,
      date: paymentDraft.date || new Date().toISOString().split('T')[0],
      amount,
      concept: paymentDraft.concept.trim() || 'Abono',
      method: paymentDraft.method
    };

    updateWedding(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => {
        if (v.id !== selectedVendor.id) return v;
        const basePayments =
          v.payments && v.payments.length > 0
            ? v.payments
            : v.paidAmount > 0
            ? [{ id: `legacy_${v.id}`, date: '', amount: v.paidAmount, concept: 'Anticipo inicial', method: 'Transferencia' as const }]
            : [];
        const nextPayments = [newPayment, ...basePayments];
        const nextPaid = nextPayments.reduce((s, p) => s + p.amount, 0);
        return { ...v, payments: nextPayments, paidAmount: nextPaid };
      })
    }));

    setPaymentDraft({
      amount: '',
      concept: 'Abono',
      date: new Date().toISOString().split('T')[0],
      method: 'Transferencia'
    });
    setShowAddPaymentForm(false);
  };

  const handleDeletePayment = (vendorId: string, paymentId: string) => {
    updateWedding(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => {
        if (v.id !== vendorId) return v;
        const nextPayments = (v.payments || []).filter(p => p.id !== paymentId);
        const nextPaid = nextPayments.reduce((s, p) => s + p.amount, 0);
        return { ...v, payments: nextPayments, paidAmount: nextPaid };
      })
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
            Finanzas & Ahorro
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-1">
            Presupuesto
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuoteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium shadow-2xs transition cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-[#C48B81]" />
            <span>Comparar Cotización</span>
          </button>
          <button
            onClick={() => setShowVendorModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Proveedor</span>
          </button>
        </div>
      </div>

      {/* 4 Sub-Tabs Pill */}
      <div className="flex items-center p-1 bg-white rounded-full border border-[#EFE8E1] w-fit shadow-2xs overflow-x-auto max-w-full no-scrollbar">
        {[
          { id: 'resumen', label: 'Ahorro y Meta' },
          { id: 'comparador', label: `Comparador (${quotes.length})` },
          { id: 'proveedores', label: `Contratados (${vendors.length})` },
          { id: 'archivos', label: `Contratos (${files.length})` }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              subTab === t.id ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: RESUMEN Y AHORRO */}
      {subTab === 'resumen' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs">
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#8A7E72]">
                Presupuesto Meta
              </span>
              <div className="font-editorial text-3xl text-[#2B2826] mt-1">{formatMXN(profile.budgetGoal)}</div>
              <div className="mt-3 h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#C48B81] rounded-full" style={{ width: `${budgetUsedPct}%` }} />
              </div>
              <p className="text-[11px] text-[#8A7E72] mt-1.5 font-light">
                {budgetUsedPct}% asignado ({formatMXN(totalContracted)})
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs">
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#577355]">
                Total Liquidado
              </span>
              <div className="font-editorial text-3xl text-[#455C44] mt-1">{formatMXN(totalPaid)}</div>
              <p className="text-[11px] text-[#577355] mt-2 font-light">
                Ahorro reunido: {formatMXN(totalSaved)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs">
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#A86B60]">
                Por Liquidar
              </span>
              <div className="font-editorial text-3xl text-[#A86B60] mt-1">{formatMXN(totalRemaining)}</div>
              <p className="text-[11px] text-[#8A7E72] mt-2 font-light">
                En {vendors.length} {vendors.length === 1 ? 'proveedor' : 'proveedores'}
              </p>
            </div>
          </div>

          {/* Plan de Ahorro y Aportaciones Familiares */}
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C48B81]">
                  Plan de Ahorro &amp; Aportaciones
                </span>
                <h3 className="font-editorial text-2xl text-[#2B2826] mt-0.5">
                  {profile.eventType && !profile.eventType.toLowerCase().includes('boda')
                    ? '¿Cómo se financia el evento?'
                    : '¿Cómo se financia la boda?'}
                </h3>
                <p className="text-xs text-[#8A7E72] font-light mt-1">
                  Lleva claridad sobre cuánto aporta cada persona y cuánto llevan ahorrado hoy. Haz clic en cualquier nombre para editarlo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddContribution}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F3ECE6] border border-[#EFE8E1] text-[11px] font-medium text-[#2B2826] transition cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3 text-[#C48B81]" />
                <span>Agregar aportante</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {contributions.map(c => {
                const pct = c.pledged > 0 ? Math.min(100, Math.round((c.saved / c.pledged) * 100)) : 0;
                return (
                  <div key={c.id} className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#EFE8E1] space-y-3 group">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={c.label}
                        onChange={e => handleUpdateContributionLabel(c.id, e.target.value)}
                        placeholder="Nombre del aportante"
                        title="Haz clic para editar el nombre"
                        className="flex-1 min-w-0 font-medium text-sm text-[#2B2826] bg-transparent border-b border-transparent hover:border-[#D8CFC8] focus:border-[#C48B81] focus:bg-white focus:px-1.5 rounded-sm py-0.5 transition"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium text-[#577355]">{pct}%</span>
                        {contributions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteContribution(c.id)}
                            title="Eliminar aportante"
                            className="p-1 rounded-full text-[#8A7E72] hover:text-rose-600 hover:bg-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-[#577355] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#8A7E72] block">Meta</label>
                        <input
                          type="number"
                          value={c.pledged}
                          onChange={e => handleUpdateContribution(c.id, 'pledged', Number(e.target.value))}
                          className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#EFE8E1] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8A7E72] block">Ahorrado</label>
                        <input
                          type="number"
                          value={c.saved}
                          onChange={e => handleUpdateContribution(c.id, 'saved', Number(e.target.value))}
                          className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#EFE8E1] text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: COMPARADOR DE COTIZACIONES */}
      {subTab === 'comparador' && (
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#EFE8E1] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center mx-auto text-[#C48B81]">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl text-[#2B2826]">Compara antes de firmar</h3>
              <p className="text-xs text-[#8A7E72] max-w-md mx-auto font-light leading-relaxed">
                Guarda hasta 3 cotizaciones por categoría (fotógrafo, banquete, flores) para ver pros, contras y precios lado a lado antes de elegir.
              </p>
              <button
                onClick={() => setShowQuoteModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar primera cotización</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quotes.map(q => (
                <div key={q.id} className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#7D6F6B] border border-[#EFE8E1]">
                        {q.category}
                      </span>
                      <button
                        onClick={() => updateWedding(prev => ({ ...prev, quotes: prev.quotes.filter(x => x.id !== q.id) }))}
                        className="text-[#8A7E72]/50 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <h4 className="font-editorial text-xl text-[#2B2826]">{q.vendorName}</h4>
                      <div className="font-editorial text-2xl text-[#C48B81] mt-0.5">{formatMXN(q.price)}</div>
                    </div>
                    {q.includes && (
                      <p className="text-xs text-[#5A524C] font-light leading-relaxed">{q.includes}</p>
                    )}
                    {q.pros && (
                      <div className="text-[11px] bg-[#E5EDE6]/60 text-[#384C3A] p-2.5 rounded-xl">
                        <strong>✓ Me gusta:</strong> {q.pros}
                      </div>
                    )}
                    {q.cons && (
                      <div className="text-[11px] bg-[#F7EDEB]/70 text-[#A86B60] p-2.5 rounded-xl">
                        <strong>· A considerar:</strong> {q.cons}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleHireQuote(q)}
                    className="w-full py-2.5 rounded-full bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Elegir y pasar a Contratados</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PROVEEDORES CONTRATADOS + HISTORIAL DE PAGOS */}
      {subTab === 'proveedores' && (
        <div className="space-y-6">
          {vendors.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#EFE8E1] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center mx-auto text-[#C48B81]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl text-[#2B2826]">Tu equipo de ensueño comienza aquí</h3>
              <p className="text-xs text-[#8A7E72] max-w-md mx-auto font-light">
                Agrega a tus proveedores confirmados para llevar tus anticipos, saldos y fechas límite en orden.
              </p>
              <button
                onClick={() => setShowVendorModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar primer proveedor</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendors.map(v => {
                  const rem = Math.max(0, v.totalCost - v.paidAmount);
                  const pct = v.totalCost > 0 ? Math.min(100, Math.round((v.paidAmount / v.totalCost) * 100)) : 0;
                  return (
                    <div
                      key={v.id}
                      onClick={() => openVendorDetail(v, false)}
                      className="bg-white rounded-2xl p-5 border border-[#EFE8E1] hover:border-[#C48B81]/70 shadow-2xs space-y-3.5 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#8A7E72] font-semibold">
                            {v.category}
                          </span>
                          <h4 className="font-editorial text-xl text-[#2B2826] group-hover:text-[#A86B60] transition-colors">
                            {v.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {v.phone && (
                            <a
                              href={`https://wa.me/${v.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-full bg-[#E5EDE6] text-[#384C3A] hover:opacity-80 transition"
                              title="Escribir por WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => openVendorDetail(v, false)}
                            className="p-2 rounded-full text-[#8A7E72] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer"
                            title="Ver detalle y editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar a ${v.name}?`)) {
                                updateWedding(prev => ({ ...prev, vendors: prev.vendors.filter(x => x.id !== v.id) }));
                              }
                            }}
                            className="p-2 rounded-full text-[#8A7E72]/50 hover:text-rose-600 cursor-pointer"
                            title="Eliminar proveedor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
                        <div className="h-full bg-[#577355] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs bg-[#FAF8F5] p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] text-[#8A7E72] block">Total</span>
                          <strong className="text-[#2B2826]">{formatMXN(v.totalCost)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#577355] block">Pagado</span>
                          <strong className="text-[#455C44]">{formatMXN(v.paidAmount)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#A86B60] block">Restante</span>
                          <strong className="text-[#A86B60]">{formatMXN(rem)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#8A7E72] font-light">
                          {v.nextDueDate ? `Próximo pago: ${formatShortDate(v.nextDueDate)}` : 'Sin fecha límite'}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openVendorDetail(v, true);
                          }}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium cursor-pointer transition"
                        >
                          <Wallet className="w-3 h-3 text-[#577355]" />
                          <span>+ Abonar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Historial Global de Pagos */}
              <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8A7E72]">
                      Bitácora de Liquidación
                    </span>
                    <h3 className="font-editorial text-2xl text-[#2B2826] mt-0.5">
                      Historial de Pagos
                    </h3>
                  </div>
                  <span className="text-xs text-[#8A7E72] font-light">
                    {allPayments.length} {allPayments.length === 1 ? 'pago' : 'pagos'}
                  </span>
                </div>

                {allPayments.length === 0 ? (
                  <p className="text-xs text-[#8A7E72] text-center py-6 font-light bg-[#FAF8F5] rounded-2xl">
                    Aún no has registrado pagos. Haz clic en <strong>+ Abonar</strong> en cualquier proveedor para llevar tu historial.
                  </p>
                ) : (
                  <div className="divide-y divide-[#FAF8F5]">
                    {allPayments.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          const target = vendors.find(v => v.id === p.vendorId);
                          if (target) openVendorDetail(target, false);
                        }}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-[#FAF8F5]/60 px-2 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#E5EDE6] text-[#384C3A] flex items-center justify-center shrink-0">
                            <Receipt className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#2B2826] truncate">
                              {p.vendorName} <span className="text-[#8A7E72] font-light">· {p.concept}</span>
                            </p>
                            <p className="text-[11px] text-[#8A7E72] font-light">
                              {p.date ? formatShortDate(p.date) : 'Sin fecha'} · {p.method}
                            </p>
                          </div>
                        </div>
                        <span className="font-editorial text-base text-[#455C44] shrink-0">
                          +{formatMXN(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUB-TAB 4: CONTRATOS Y COMPROBANTES */}
      {subTab === 'archivos' && (
        <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-editorial text-2xl text-[#2B2826]">Contratos & Comprobantes</h3>
              <p className="text-xs text-[#8A7E72] font-light">Guarda tus contratos y recibos de pago en orden.</p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium cursor-pointer shrink-0 transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Subir</span>
              <input type="file" onChange={handleUploadFileRef} className="hidden" />
            </label>
          </div>

          {files.length === 0 ? (
            <p className="text-xs text-[#8A7E72] text-center py-8 font-light">
              Aún no has guardado contratos o comprobantes.
            </p>
          ) : (
            <div className="divide-y divide-[#FAF8F5]">
              {files.map(f => (
                <div
                  key={f.id}
                  onClick={() => setPreviewFile(f)}
                  className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#FAF8F5]/70 rounded-xl transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck className="w-4 h-4 text-[#C48B81] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2B2826] group-hover:text-[#A86B60] transition truncate">
                        {f.name}
                      </p>
                      <p className="text-[11px] text-[#8A7E72] font-light">{f.category} · {f.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setPreviewFile(f)}
                      className="p-1.5 rounded-full text-[#8A7E72] hover:text-[#2B2826] hover:bg-white transition cursor-pointer"
                      title="Ver vista previa"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateWedding(prev => ({ ...prev, files: prev.files.filter(x => x.id !== f.id) }))}
                      className="p-1.5 rounded-full text-[#8A7E72]/50 hover:text-rose-600 cursor-pointer"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: VISTA PREVIA DE CONTRATO / COMPROBANTE */}
      <Modal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name || 'Vista Previa'}
        subtitle={previewFile ? `${previewFile.category} · ${previewFile.date}` : undefined}
        maxWidthClass="max-w-3xl"
      >
        {previewFile && (
          <div className="space-y-4">
            {previewFile.dataUrl ? (
              previewFile.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(previewFile.name) ? (
                <div className="bg-[#FAF8F5] rounded-2xl border border-[#EFE8E1] p-3 flex items-center justify-center max-h-[65vh] overflow-auto">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.name}
                    className="max-h-[60vh] w-auto object-contain rounded-xl"
                  />
                </div>
              ) : previewFile.mimeType === 'application/pdf' || /\.pdf$/i.test(previewFile.name) ? (
                <div className="bg-[#FAF8F5] rounded-2xl border border-[#EFE8E1] overflow-hidden h-[65vh]">
                  <iframe
                    src={previewFile.dataUrl}
                    title={previewFile.name}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="bg-[#FAF8F5] rounded-2xl border border-[#EFE8E1] p-10 text-center space-y-2">
                  <FileCheck className="w-8 h-8 text-[#C48B81] mx-auto" />
                  <p className="text-sm text-[#2B2826] font-medium">Vista previa no disponible para este formato</p>
                  <p className="text-xs text-[#8A7E72] font-light">Puedes descargarlo directamente para abrirlo en tu dispositivo.</p>
                </div>
              )
            ) : (
              <div className="bg-[#FAF8F5] rounded-2xl border border-[#EFE8E1] p-10 text-center space-y-2">
                <FileCheck className="w-8 h-8 text-[#C48B81] mx-auto" />
                <p className="text-sm text-[#2B2826] font-medium">Archivo de referencia sin vista previa cargada</p>
                <p className="text-xs text-[#8A7E72] font-light max-w-sm mx-auto">
                  Sube un archivo nuevo (imagen o PDF) desde el botón <strong>Subir</strong> para verlo en vista previa completa aquí.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 text-xs text-[#8A7E72] hover:text-[#2B2826] cursor-pointer"
              >
                Cerrar
              </button>
              {previewFile.dataUrl && (
                <a
                  href={previewFile.dataUrl}
                  download={previewFile.name}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Descargar</span>
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: DETALLE, EDICIÓN E HISTORIAL DE PAGOS DEL PROVEEDOR */}
      <Modal
        isOpen={Boolean(selectedVendor)}
        onClose={() => {
          setSelectedVendorId(null);
          setIsEditingVendor(false);
          setShowAddPaymentForm(false);
        }}
        title={selectedVendor?.name || ''}
        subtitle={selectedVendor?.category}
        maxWidthClass="max-w-lg"
      >
        {selectedVendor && (
          <div className="space-y-5">
            {isEditingVendor ? (
              /* Modo Edición del Proveedor */
              <form onSubmit={handleSaveVendorEdit} className="space-y-3">
                <div>
                  <label className="text-[11px] text-[#7D6F6B] block mb-1">Nombre del proveedor *</label>
                  <input
                    type="text"
                    required
                    value={editVendorDraft.name}
                    onChange={e => setEditVendorDraft({ ...editVendorDraft, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#7D6F6B] block mb-1">Categoría</label>
                    <select
                      value={editVendorDraft.category}
                      onChange={e => setEditVendorDraft({ ...editVendorDraft, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
                    >
                      {VENDOR_CATEGORIES.map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#7D6F6B] block mb-1">WhatsApp</label>
                    <input
                      type="tel"
                      value={editVendorDraft.phone}
                      onChange={e => setEditVendorDraft({ ...editVendorDraft, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#7D6F6B] block mb-1">Costo Total (MXN)</label>
                    <input
                      type="number"
                      required
                      value={editVendorDraft.totalCost}
                      onChange={e => setEditVendorDraft({ ...editVendorDraft, totalCost: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#7D6F6B] block mb-1">Próxima fecha límite</label>
                    <input
                      type="date"
                      value={editVendorDraft.nextDueDate}
                      onChange={e => setEditVendorDraft({ ...editVendorDraft, nextDueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#7D6F6B] block mb-1">Notas y qué incluye</label>
                  <textarea
                    rows={3}
                    value={editVendorDraft.notes}
                    onChange={e => setEditVendorDraft({ ...editVendorDraft, notes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingVendor(false)}
                    className="px-4 py-2 text-xs text-[#8A7E72] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            ) : (
              /* Modo Ficha Completa + Pagos */
              <>
                {/* Top Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {selectedVendor.phone && (
                      <a
                        href={`https://wa.me/${selectedVendor.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E5EDE6] text-[#384C3A] text-xs font-medium hover:opacity-85 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{selectedVendor.phone}</span>
                      </a>
                    )}
                    {selectedVendor.nextDueDate && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] text-[11px] text-[#7D6F6B]">
                        <Calendar className="w-3 h-3 text-[#C48B81]" />
                        <span>Límite: {formatShortDate(selectedVendor.nextDueDate)}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={startEditSelectedVendor}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-[#C48B81]" />
                    <span>Editar</span>
                  </button>
                </div>

                {/* Financial Summary Box */}
                <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#EFE8E1] space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8A7E72] block">Total</span>
                      <span className="font-editorial text-xl text-[#2B2826]">{formatMXN(selectedVendor.totalCost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#577355] block">Pagado</span>
                      <span className="font-editorial text-xl text-[#455C44]">{formatMXN(selectedVendor.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#A86B60] block">Restante</span>
                      <span className="font-editorial text-xl text-[#A86B60]">
                        {formatMXN(Math.max(0, selectedVendor.totalCost - selectedVendor.paidAmount))}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#577355] rounded-full transition-all"
                      style={{
                        width: `${selectedVendor.totalCost > 0 ? Math.min(100, Math.round((selectedVendor.paidAmount / selectedVendor.totalCost) * 100)) : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Notes / Package details */}
                {selectedVendor.notes && (
                  <div className="text-xs text-[#5A524C] bg-[#FAF8F5]/60 p-3.5 rounded-2xl border border-[#EFE8E1] font-light leading-relaxed">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8A7E72] block mb-1">
                      Detalles y Notas
                    </span>
                    {selectedVendor.notes}
                  </div>
                )}

                {/* Per-Vendor Payment History */}
                <div className="space-y-3 pt-2 border-t border-[#FAF8F5]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-editorial text-lg text-[#2B2826]">Pagos registrados</h4>
                    <button
                      type="button"
                      onClick={() => setShowAddPaymentForm(!showAddPaymentForm)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Registrar Pago</span>
                    </button>
                  </div>

                  {showAddPaymentForm && (
                    <form onSubmit={handleRecordPayment} className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EFE8E1] space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] text-[#7D6F6B] block mb-1">Monto (MXN) *</label>
                          <input
                            type="number"
                            required
                            autoFocus
                            placeholder="10000"
                            value={paymentDraft.amount}
                            onChange={e => setPaymentDraft({ ...paymentDraft, amount: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#7D6F6B] block mb-1">Fecha</label>
                          <input
                            type="date"
                            value={paymentDraft.date}
                            onChange={e => setPaymentDraft({ ...paymentDraft, date: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Concepto (ej. Anticipo 2)"
                          value={paymentDraft.concept}
                          onChange={e => setPaymentDraft({ ...paymentDraft, concept: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs"
                        />
                        <select
                          value={paymentDraft.method}
                          onChange={e => setPaymentDraft({ ...paymentDraft, method: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs"
                        >
                          <option value="Transferencia">Transferencia</option>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddPaymentForm(false)}
                          className="px-3 py-1.5 text-xs text-[#8A7E72] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-full bg-[#2B2826] text-white text-xs font-medium cursor-pointer"
                        >
                          Guardar Pago
                        </button>
                      </div>
                    </form>
                  )}

                  {(() => {
                    const vendorPayments =
                      selectedVendor.payments && selectedVendor.payments.length > 0
                        ? selectedVendor.payments
                        : selectedVendor.paidAmount > 0
                        ? [{ id: `legacy_${selectedVendor.id}`, date: '', amount: selectedVendor.paidAmount, concept: 'Anticipo inicial', method: 'Transferencia' as const }]
                        : [];

                    if (vendorPayments.length === 0) {
                      return (
                        <p className="text-xs text-[#8A7E72] text-center py-4 font-light bg-[#FAF8F5]/60 rounded-xl">
                          Sin pagos registrados todavía para este proveedor.
                        </p>
                      );
                    }

                    return (
                      <div className="divide-y divide-[#FAF8F5]">
                        {vendorPayments.map(p => (
                          <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-medium text-[#2B2826]">{p.concept}</p>
                              <p className="text-[11px] text-[#8A7E72] font-light">
                                {p.date ? formatShortDate(p.date) : 'Sin fecha'} · {p.method}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-editorial text-sm text-[#455C44]">+{formatMXN(p.amount)}</span>
                              {!p.id.startsWith('legacy_') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(selectedVendor.id, p.id)}
                                  className="p-1 text-[#8A7E72]/40 hover:text-rose-600 cursor-pointer"
                                  title="Eliminar pago"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: Nueva Cotización */}
      <Modal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        title="Agregar Cotización"
      >
        <form onSubmit={handleSaveQuote} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#7D6F6B] block mb-1">Categoría</label>
              <select
                value={quoteForm.category}
                onChange={e => setQuoteForm({ ...quoteForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
              >
                {VENDOR_CATEGORIES.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#7D6F6B] block mb-1">Precio (MXN)</label>
              <input
                type="number"
                required
                placeholder="45000"
                value={quoteForm.price}
                onChange={e => setQuoteForm({ ...quoteForm, price: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
              />
            </div>
          </div>
          <input
            type="text"
            required
            placeholder="Nombre del proveedor *"
            value={quoteForm.vendorName}
            onChange={e => setQuoteForm({ ...quoteForm, vendorName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm"
          />
          <textarea
            rows={2}
            placeholder="¿Qué incluye el paquete?"
            value={quoteForm.includes}
            onChange={e => setQuoteForm({ ...quoteForm, includes: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
          />
          <input
            type="text"
            placeholder="✓ Lo que me encantó (Pros)"
            value={quoteForm.pros}
            onChange={e => setQuoteForm({ ...quoteForm, pros: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
          />
          <input
            type="text"
            placeholder="· A considerar (Contras)"
            value={quoteForm.cons}
            onChange={e => setQuoteForm({ ...quoteForm, cons: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
          />
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setShowQuoteModal(false)} className="px-4 py-2 text-xs text-[#8A7E72] cursor-pointer">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nuevo Proveedor */}
      <Modal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title="Nuevo Proveedor"
      >
        <form onSubmit={handleSaveVendor} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Nombre del proveedor *"
            value={vendorForm.name}
            onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={vendorForm.category}
              onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
            >
              {VENDOR_CATEGORIES.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="WhatsApp (+52...)"
              value={vendorForm.phone}
              onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              required
              placeholder="Costo total (MXN)"
              value={vendorForm.totalCost}
              onChange={e => setVendorForm({ ...vendorForm, totalCost: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
            />
            <input
              type="number"
              placeholder="Anticipo pagado"
              value={vendorForm.paidAmount}
              onChange={e => setVendorForm({ ...vendorForm, paidAmount: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#7D6F6B] block mb-1">Próxima fecha límite de pago</label>
            <input
              type="date"
              value={vendorForm.nextDueDate}
              onChange={e => setVendorForm({ ...vendorForm, nextDueDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Notas o qué incluye el contrato (opcional)"
            value={vendorForm.notes}
            onChange={e => setVendorForm({ ...vendorForm, notes: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs"
          />
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setShowVendorModal(false)} className="px-4 py-2 text-xs text-[#8A7E72] cursor-pointer">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer">
              Guardar Proveedor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
