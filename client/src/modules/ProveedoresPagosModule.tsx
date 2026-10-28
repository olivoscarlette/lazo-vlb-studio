import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vendor, Payment } from '../types';
import {
  CreditCard, Plus, DollarSign, CheckCircle2, Clock, Phone,
  Building2, Calendar, FileText, Trash2, Edit3, MessageSquare, AlertCircle, AlertTriangle
} from 'lucide-react';

export const ProveedoresPagosModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const isNovios = user?.role === 'NOVIOS';
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    costo_real: 0,
    monto_pagado: 0,
    restante: 0
  });
  const [catalogTypes, setCatalogTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState<'TODAS' | 'CIVIL' | 'RECEPCIÓN' | 'GENERAL'>('TODAS');

  // Vendor Modal (Add & Edit)
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    phone: '+52 ',
    type: 'Fotografía',
    locations: ['RECEPCIÓN'],
    costo_real: 0,
    payment_due_date: '',
    contact_person: '',
    notes: ''
  });
  const [vendorError, setVendorError] = useState('');

  // New Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    vendor_id: '',
    concept: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Transferencia SPEI',
    notes: ''
  });
  const [paymentError, setPaymentError] = useState('');

  const fetchVendorsData = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/vendors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
        setPayments(data.payments || []);
        setFinancialSummary(data.financialSummary || { costo_real: 0, monto_pagado: 0, restante: 0 });
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const res = await fetch('/api/catalogs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCatalogTypes(data.catalogs?.vendor_types || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchVendorsData();
    fetchCatalogs();
  }, [currentWedding, token]);

  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setVendorForm({
      name: '',
      phone: '+52 ',
      type: catalogTypes[0] || 'Fotografía',
      locations: ['RECEPCIÓN'],
      costo_real: 0,
      payment_due_date: '',
      contact_person: '',
      notes: ''
    });
    setVendorError('');
    setShowVendorModal(true);
  };

  const handleOpenEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVendorForm({
      name: v.name || '',
      phone: v.phone || '+52 ',
      type: v.type || 'Otro',
      locations: Array.isArray(v.locations) && v.locations.length > 0 ? v.locations : ['RECEPCIÓN'],
      costo_real: v.costo_real || 0,
      payment_due_date: v.payment_due_date || '',
      contact_person: v.contact_person || '',
      notes: v.notes || ''
    });
    setVendorError('');
    setShowVendorModal(true);
  };

  // Helper for Payment Due Date status & alerts
  const getPaymentDueStatus = (dueDate?: string | null, saldo?: number) => {
    if (!saldo || saldo <= 0) {
      return {
        status: 'LIQUIDADO',
        label: 'Liquidado ✓',
        badgeClass: 'bg-[#E5EDE6] text-[#384C3A] border-[#D5E2D7]'
      };
    }
    if (!dueDate) {
      return {
        status: 'SIN_FECHA',
        label: 'Sin fecha límite',
        badgeClass: 'text-[#8E807A] bg-[#F9F6F2] border-[#EFE8E1]'
      };
    }
    try {
      const [y, m, d] = dueDate.split('-').map(Number);
      const due = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          status: 'VENCIDO',
          label: `⚠️ Vencido hace ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'día' : 'días'}`,
          badgeClass: 'bg-[#F7EDEB] text-[#A86B60] border-[#ECD9D5] font-semibold',
          isAlert: true
        };
      }
      if (diffDays === 0) {
        return {
          status: 'HOY',
          label: '⚠️ ¡Vence hoy!',
          badgeClass: 'bg-[#F7EDEB] text-[#A86B60] border-[#ECD9D5] font-semibold',
          isAlert: true
        };
      }
      if (diffDays <= 7) {
        return {
          status: 'PROXIMO',
          label: `⏳ Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`,
          badgeClass: 'bg-[#F5EFEB] text-[#7D6F6B] border-[#EFE8E1] font-semibold',
          isAlert: true
        };
      }
      return {
        status: 'EN_TIEMPO',
        label: dueDate,
        badgeClass: 'bg-[#EFE8DE] text-[#4A3F3C] border-[#EFE8E1]'
      };
    } catch {
      return {
        status: 'ERROR',
        label: dueDate,
        badgeClass: 'bg-stone-100 text-stone-600 border-stone-200'
      };
    }
  };

  // Toggle multi-select locations
  const handleToggleLocation = (loc: string) => {
    const cur = vendorForm.locations;
    if (cur.includes(loc)) {
      setVendorForm({ ...vendorForm, locations: cur.filter(l => l !== loc) });
    } else {
      setVendorForm({ ...vendorForm, locations: [...cur, loc] });
    }
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorError('');
    if (!vendorForm.name || !vendorForm.phone) {
      setVendorError('El nombre y teléfono de contacto son obligatorios.');
      return;
    }

    try {
      const url = editingVendor
        ? `/api/weddings/${currentWedding!.id}/vendors/${editingVendor.id}`
        : `/api/weddings/${currentWedding!.id}/vendors`;
      const method = editingVendor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(vendorForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowVendorModal(false);
      setEditingVendor(null);
      setVendorForm({
        name: '',
        phone: '+52 ',
        type: 'Fotografía',
        locations: ['RECEPCIÓN'],
        costo_real: 0,
        contact_person: '',
        notes: '',
        payment_due_date: ''
      });
      await fetchVendorsData();
    } catch (err: any) {
      setVendorError(err.message);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('¿Deseas eliminar este proveedor de la boda?')) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchVendorsData();
    } catch {}
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!paymentForm.concept || !paymentForm.amount || !paymentForm.payment_date) {
      setPaymentError('Concepto, monto y fecha son obligatorios.');
      return;
    }

    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount) || 0,
          vendor_id: paymentForm.vendor_id || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowPaymentModal(false);
      setPaymentForm({
        vendor_id: '',
        concept: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Transferencia SPEI',
        notes: ''
      });
      await fetchVendorsData();
    } catch (err: any) {
      setPaymentError(err.message);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('¿Deseas cancelar y eliminar este registro de pago?')) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchVendorsData();
    } catch {}
  };

  const filteredVendors = vendors.filter(v => {
    if (locationFilter === 'TODAS') return true;
    if (locationFilter === 'CIVIL') {
      return v.locations?.some(l => l.toUpperCase().includes('CIVIL'));
    }
    if (locationFilter === 'RECEPCIÓN') {
      return v.locations?.some(l => l.toUpperCase().includes('RECEPCI') || l.toUpperCase().includes('BODA'));
    }
    if (locationFilter === 'GENERAL') {
      return !v.locations?.length || v.locations?.some(l => l.toUpperCase().includes('GENERAL'));
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#8A7E72]">
            Módulo Financiero y Logístico
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#2B2826] mt-1">
            Proveedores y Pagos
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1 leading-relaxed">
            Contratos vigentes, participación en etapas del evento y control estricto de liquidación.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#2B2826] text-xs font-semibold rounded-lg border border-[#EFE8E1] transition shadow-2xs cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#6E8C70]" />
            <span>Registrar Pago</span>
          </button>
          <button
            onClick={handleOpenAddVendor}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {/* Financial Summary: 3 grandes cifras destacadas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#EFE8E1] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-2">
            <span>TOTAL CONTRATADO</span>
            <DollarSign className="w-4 h-4 text-[#C48B81]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#2B2826]">
            ${financialSummary.costo_real.toLocaleString()}
          </div>
          <div className="text-xs text-[#7D6F6B] mt-2">
            Costo real con proveedores contratados
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#EFE8E1] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#577355] uppercase tracking-wider mb-2">
            <span>MONTO PAGADO</span>
            <CheckCircle2 className="w-4 h-4 text-[#6E8C70]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#455C44]">
            ${financialSummary.monto_pagado.toLocaleString()}
          </div>
          <div className="text-xs text-[#577355] font-medium mt-2">
            Comprobado y liquidado
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#EFE8E1] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#A86B60] uppercase tracking-wider mb-2">
            <span>SALDO RESTANTE</span>
            <Clock className="w-4 h-4 text-[#C48B81]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#A86B60]">
            ${financialSummary.restante.toLocaleString()}
          </div>
          <div className="text-xs text-[#A86B60] font-medium mt-2">
            Saldo pendiente por liquidar
          </div>
        </div>
      </div>

      {/* Alerta de Pagos Próximos (Vencimiento en 15-30 días o vencidos) */}
      {(() => {
        const urgentVendors = vendors.filter(v => {
          if (!v.payment_due_date || (v.saldo_restante !== undefined && v.saldo_restante <= 0)) return false;
          const status = getPaymentDueStatus(v.payment_due_date, v.saldo_restante);
          return status.isAlert;
        });

        if (urgentVendors.length === 0) return null;

        return (
          <div className="bg-[#FFF8F5] border border-[#EAD2D0] p-5 rounded-2xl shadow-xs flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-[#C48B81] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#70443D]">
                Alerta de Pagos Próximos y Liquidaciones ({urgentVendors.length})
              </h4>
              <p className="text-xs text-[#A86B60] mt-0.5">
                Los siguientes proveedores tienen saldo pendiente con fecha límite próxima (próximos 15-30 días) o vencida:
              </p>
              <div className="flex flex-wrap gap-2.5 mt-3">
                {urgentVendors.map(v => {
                  const status = getPaymentDueStatus(v.payment_due_date, v.saldo_restante);
                  return (
                    <div
                      key={v.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#EAD2D0] shadow-2xs"
                    >
                      <span className="font-bold text-[#2B2826]">{v.name}:</span>
                      <span className="text-[#A86B60]">${(v.saldo_restante || 0).toLocaleString()}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.badgeClass}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => {
                          setPaymentForm({
                            vendor_id: v.id,
                            concept: `Liquidación saldo ${v.name}`,
                            amount: String(v.saldo_restante || ''),
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_method: 'Transferencia SPEI',
                            notes: ''
                          });
                          setShowPaymentModal(true);
                        }}
                        className="text-xs text-[#C48B81] hover:underline font-bold ml-1 cursor-pointer"
                      >
                        Pagar →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Vendors List Section */}
      <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#EFE8E1] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#7D6F6B]">Directorio Operativo</span>
            <h3 className="font-serif text-2xl font-bold text-[#2B2826]">Lista de Proveedores</h3>
          </div>

          {/* Filtro de Ubicación */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            <button
              onClick={() => setLocationFilter('TODAS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                locationFilter === 'TODAS'
                  ? 'bg-[#C48B81] text-white shadow-2xs'
                  : 'bg-[#F7F3EE] text-[#7D6F6B] hover:bg-[#EFE8E1] hover:text-[#2B2826]'
              }`}
            >
              Todas ({vendors.length})
            </button>
            <button
              onClick={() => setLocationFilter('CIVIL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                locationFilter === 'CIVIL'
                  ? 'bg-[#C48B81] text-white shadow-2xs'
                  : 'bg-[#F7F3EE] text-[#7D6F6B] hover:bg-[#EFE8E1] hover:text-[#2B2826]'
              }`}
            >
              Civil ({vendors.filter(v => v.locations?.some(l => l.toUpperCase().includes('CIVIL'))).length})
            </button>
            <button
              onClick={() => setLocationFilter('RECEPCIÓN')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                locationFilter === 'RECEPCIÓN'
                  ? 'bg-[#C48B81] text-white shadow-2xs'
                  : 'bg-[#F7F3EE] text-[#7D6F6B] hover:bg-[#EFE8E1] hover:text-[#2B2826]'
              }`}
            >
              Recepción ({vendors.filter(v => v.locations?.some(l => l.toUpperCase().includes('RECEPCI') || l.toUpperCase().includes('BODA'))).length})
            </button>
            <button
              onClick={() => setLocationFilter('GENERAL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                locationFilter === 'GENERAL'
                  ? 'bg-[#C48B81] text-white shadow-2xs'
                  : 'bg-[#F7F3EE] text-[#7D6F6B] hover:bg-[#EFE8E1] hover:text-[#2B2826]'
              }`}
            >
              General ({vendors.filter(v => !v.locations?.length || v.locations?.some(l => l.toUpperCase().includes('GENERAL'))).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EFE8E1] text-[11px] font-semibold uppercase tracking-wider text-[#8A7E72]">
                <th className="py-2.5 px-3 whitespace-nowrap">PROVEEDOR</th>
                <th className="py-2.5 px-3 whitespace-nowrap">CATEGORÍA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">TELÉFONO</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ETAPAS</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">FECHA LÍMITE</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">COSTO</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">PAGADO</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">RESTANTE</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF8F5] text-xs">
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-[#8A7E72]">Cargando proveedores...</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-[#8A7E72]">No hay proveedores que coincidan con el filtro.</td></tr>
              ) : (
                filteredVendors.map(v => {
                  const dueStatus = getPaymentDueStatus(v.payment_due_date, v.saldo_restante);
                  return (
                    <tr key={v.id} className="hover:bg-[#FCFAF7] transition group">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div
                          onClick={() => handleOpenEditVendor(v)}
                          className="cursor-pointer font-bold text-[#2B2826] hover:text-[#C48B81] inline-flex items-center space-x-1 whitespace-nowrap transition"
                          title="Clic para editar información"
                        >
                          <span className="underline decoration-[#EFE8E1] decoration-1 underline-offset-4">{v.name}</span>
                          <Edit3 className="w-3.5 h-3.5 text-[#8A7E72] group-hover:text-[#C48B81] transition shrink-0" />
                        </div>
                        {v.contact_person && (
                          <div className="text-[11px] text-[#8A7E72] whitespace-nowrap mt-0.5">Contacto: {v.contact_person}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center bg-[#FAF8F5] text-[#5A524C] px-2 py-0.5 rounded-md text-[11px] font-medium border border-[#EFE8E1] whitespace-nowrap shrink-0">
                          {v.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-[#5A524C] whitespace-nowrap">
                        <a
                          href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 text-[#5A524C] hover:text-[#C48B81] whitespace-nowrap shrink-0"
                          title="Contactar vía WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#2B5235] shrink-0" />
                          <span className="whitespace-nowrap">{v.phone}</span>
                        </a>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                          {v.locations.map(loc => (
                            <span
                              key={loc}
                              className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 ${
                                loc === 'CIVIL'
                                  ? 'bg-[#F7EDEB] text-[#C48B81] border border-[#ECD9D5]'
                                  : loc === 'IGLESIA'
                                  ? 'bg-[#FAF3E8] text-[#7C5824] border border-[#E8D7B8]'
                                  : 'bg-[#FAF8F5] text-[#5A524C] border border-[#EFE8E1]'
                              }`}
                            >
                              {loc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {v.payment_due_date ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 ${dueStatus.badgeClass}`}>
                            {dueStatus.label}
                          </span>
                        ) : (
                          <span className="text-xs text-[#8A7E72] italic">Sin definir</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#2B2826] whitespace-nowrap">
                        ${v.costo_real.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#2B5235] whitespace-nowrap">
                        ${(v.total_pagado || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#A86B60] whitespace-nowrap">
                        ${(v.saldo_restante || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteVendor(v.id)}
                          className="text-[#8A7E72] hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar proveedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments Ledger Section */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-[#8A7E72]">Historial Contable</span>
            <h3 className="font-serif text-2xl font-bold text-[#2B2826] mt-0.5">Bitácora de Pagos Realizados</h3>
          </div>
          <span className="text-sm text-[#8A7E72] font-medium">{payments.length} pagos registrados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EFE8E1] text-xs font-semibold uppercase tracking-wider text-[#8A7E72]">
                <th className="py-3.5 px-4 whitespace-nowrap">FECHA</th>
                <th className="py-3.5 px-4 whitespace-nowrap">CONCEPTO</th>
                <th className="py-3.5 px-4 whitespace-nowrap">PROVEEDOR ASOCIADO</th>
                <th className="py-3.5 px-4 whitespace-nowrap">MÉTODO DE PAGO</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">MONTO</th>
                <th className="py-3.5 px-4 whitespace-nowrap">NOTAS</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF8F5] text-sm">
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#8A7E72]">No hay pagos registrados aún.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-[#FCFAF7] transition">
                    <td className="py-3 px-4 font-medium text-[#2B2826] whitespace-nowrap">{p.payment_date}</td>
                    <td className="py-3 px-4 font-semibold text-[#2B2826] whitespace-nowrap">{p.concept}</td>
                    <td className="py-3 px-4 text-[#5A524C] whitespace-nowrap">{p.vendor_name || 'General / Boda'}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block bg-[#FAF8F5] text-[#5A524C] px-2.5 py-0.5 rounded-md text-xs border border-[#EFE8E1] whitespace-nowrap">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#2B5235] whitespace-nowrap">
                      +${p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[#8A7E72] max-w-xs truncate whitespace-nowrap">{p.notes || '—'}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="text-[#8A7E72] hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Eliminar pago"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar o Editar Proveedor */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE8E1] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF8F5]">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">
                {editingVendor ? 'Editar Proveedor' : 'Registrar Proveedor'}
              </h3>
              <button onClick={() => setShowVendorModal(false)} className="text-[#8A7E72] hover:text-[#2B2826] p-1 rounded-lg">✕</button>
            </div>

            {vendorError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 text-rose-800 text-sm border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{vendorError}</span>
              </div>
            )}

            <form onSubmit={handleSaveVendor} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Nombre del Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Magnolia Floral Studio"
                  value={vendorForm.name}
                  onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Teléfono de Contacto (con lada) *</label>
                <input
                  type="text"
                  required
                  placeholder="+52 55 1234 5678"
                  value={vendorForm.phone}
                  onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm font-mono text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Tipo de Servicio</label>
                  <select
                    value={vendorForm.type}
                    onChange={e => setVendorForm({ ...vendorForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  >
                    {catalogTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Costo ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={vendorForm.costo_real}
                    onChange={e => setVendorForm({ ...vendorForm, costo_real: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Fecha Límite de Pago / Liquidación</label>
                <input
                  type="date"
                  value={vendorForm.payment_due_date || ''}
                  onChange={e => setVendorForm({ ...vendorForm, payment_due_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
                <p className="text-xs text-[#8A7E72] mt-1">
                  Se generarán alertas automáticas si faltan 15 días o menos y aún existe saldo pendiente.
                </p>
              </div>

              {/* Multi-select Location / Stage */}
              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">
                  Etapas de Participación
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {['IGLESIA', 'CIVIL', 'RECEPCIÓN', 'OTRO'].map(loc => {
                    const checked = vendorForm.locations.includes(loc);
                    return (
                      <button
                        type="button"
                        key={loc}
                        onClick={() => handleToggleLocation(loc)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-between transition cursor-pointer ${
                          checked
                            ? 'bg-[#C48B81] text-white border-[#C48B81] shadow-xs'
                            : 'bg-white text-[#5A524C] border-[#EFE8E1] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <span>{loc}</span>
                        {checked && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Persona de Contacto</label>
                <input
                  type="text"
                  placeholder="Nombre del asesor o director"
                  value={vendorForm.contact_person}
                  onChange={e => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Notas del Contrato / Servicios</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de entregables, horarios y condiciones..."
                  value={vendorForm.notes}
                  onChange={e => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8E1]">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#C48B81] text-white rounded-xl hover:bg-[#A86B60] shadow-xs transition"
                >
                  {editingVendor ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE8E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF8F5]">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">Registrar Pago Realizado</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[#8A7E72] hover:text-[#2B2826] p-1 rounded-lg">✕</button>
            </div>

            {paymentError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 text-rose-800 text-sm border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleSavePayment} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Proveedor Asociado (Opcional)</label>
                <select
                  value={paymentForm.vendor_id}
                  onChange={e => setPaymentForm({ ...paymentForm, vendor_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                >
                  <option value="">Gasto general de la boda</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} (Saldo: ${v.saldo_restante})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Concepto del Pago *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Anticipo 50% de banquete"
                  value={paymentForm.concept}
                  onChange={e => setPaymentForm({ ...paymentForm, concept: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Monto Pagado ($) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="15000"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Fecha de Pago *</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Método de Pago</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                >
                  <option value="Transferencia SPEI">Transferencia SPEI</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider mb-1">Notas / Referencia de Pago</label>
                <textarea
                  rows={2}
                  placeholder="Número de folio, comprobante o condiciones del abono..."
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8E1]">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#C48B81] text-white rounded-xl hover:bg-[#A86B60] shadow-xs transition"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
