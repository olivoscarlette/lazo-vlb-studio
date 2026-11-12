import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  Car,
  FileText,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles,
  PieChart
} from 'lucide-react';
import {
  VlbEventSettlement,
  VlbFinanceSettings,
  VlbCarProvider,
  VlbStationeryProvider
} from '../types/vlb';
import {
  calculateEventSettlement,
  DEFAULT_FINANCE_SETTINGS
} from '../utils/vlbFinanceCalculator';
import { User } from '../types';

interface VlbFinanceModuleProps {
  user?: User;
  onBack?: () => void;
}

export const VlbFinanceModule: React.FC<VlbFinanceModuleProps> = ({ user, onBack }) => {
  // ----------------------------------------
  // ESTADOS PRINCIPALES DE DATOS
  // ----------------------------------------
  const [settlements, setSettlements] = useState<VlbEventSettlement[]>([]);
  const [settings, setSettings] = useState<VlbFinanceSettings>(DEFAULT_FINANCE_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ----------------------------------------
  // FILTROS
  // ----------------------------------------
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDIENTE' | 'LIQUIDADO'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ----------------------------------------
  // MODALES
  // ----------------------------------------
  const [detailModalSettlement, setDetailModalSettlement] = useState<VlbEventSettlement | null>(null);
  const [editModalSettlement, setEditModalSettlement] = useState<VlbEventSettlement | null>(null);
  const [isNewEventModal, setIsNewEventModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [copiedBreakdownId, setCopiedBreakdownId] = useState<string | null>(null);

  // Formulario de Ajustes
  const [settingsForm, setSettingsForm] = useState({
    staff_rate: 450,
    freight_rate: 500,
    stationery_rate: 200,
    company_fund_pct: 60,
    partners_profit_pct: 40
  });

  // Formulario de Evento (Edición / Creación)
  const [eventForm, setEventForm] = useState<Partial<VlbEventSettlement>>({
    event_name: '',
    event_date: new Date().toISOString().split('T')[0],
    venue: '',
    service_amount: 0,
    freight_charged: 0,
    extra_services: 0,
    supplies_expense: 0,
    car_provider: 'NINGUNA_EXTERNO',
    stationery_provider: 'NINGUNA',
    staff_scarlette: false,
    staff_victoria: false,
    external_staff_count: 0,
    status: 'PENDIENTE',
    notes: ''
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ----------------------------------------
  // CARGA DE DATOS DESDE EL SERVIDOR
  // ----------------------------------------
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('lazo_token') || localStorage.getItem('token') || sessionStorage.getItem('token'))
    : null;

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    return res;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Settings
      const setRes = await apiFetch('/api/vlb/finance/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        setSettings(setData.settings);
        setSettingsForm({
          staff_rate: setData.settings.staff_rate,
          freight_rate: setData.settings.freight_rate,
          stationery_rate: setData.settings.stationery_rate,
          company_fund_pct: setData.settings.company_fund_pct,
          partners_profit_pct: setData.settings.partners_profit_pct
        });
      }

      // 2. Cargar Liquidaciones
      const stlRes = await apiFetch('/api/vlb/finance/settlements');
      if (stlRes.ok) {
        const stlData = await stlRes.json();
        setSettlements(stlData.settlements || []);
      }
    } catch (err: any) {
      console.error('Error al cargar datos financieros:', err);
      showToast('Error al conectar con el servidor financiero.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ----------------------------------------
  // OPERACIONES CRUD DE LIQUIDACIÓN
  // ----------------------------------------
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.event_name?.trim()) {
      showToast('El nombre del evento es requerido.', 'error');
      return;
    }
    if (!eventForm.event_date?.trim()) {
      showToast('La fecha del evento es requerida.', 'error');
      return;
    }

    try {
      const isEdit = !isNewEventModal && editModalSettlement?.id;
      const url = isEdit
        ? `/api/vlb/finance/settlements/${editModalSettlement!.id}`
        : '/api/vlb/finance/settlements';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(eventForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar liquidación.');
      }

      const data = await res.json();
      showToast(isEdit ? 'Liquidación actualizada correctamente ✨' : 'Evento registrado exitosamente ✨');
      setEditModalSettlement(null);
      setIsNewEventModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar.', 'error');
    }
  };

  const handleDeleteSettlement = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás segura de eliminar la liquidación del evento "${name}"? Esta acción no se puede revertir.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/vlb/finance/settlements/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar registro.');
      showToast('Liquidación eliminada.');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSyncOrders = async () => {
    try {
      const res = await apiFetch('/api/vlb/finance/sync-orders', { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'Sincronización completada.');
      loadData();
    } catch (err: any) {
      showToast('Error al sincronizar pedidos.', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/vlb/finance/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar configuración.');
      }

      const data = await res.json();
      setSettings(data.settings);
      setShowSettingsModal(false);
      showToast('Tarifas operativas actualizadas exitosamente ✨');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ----------------------------------------
  // CÁLCULOS DINÁMICOS & FILTROS
  // ----------------------------------------
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    settlements.forEach(s => {
      if (s.event_date && s.event_date.length >= 7) {
        set.add(s.event_date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [settlements]);

  const filteredSettlements = useMemo(() => {
    return settlements.filter(s => {
      if (selectedMonth !== 'ALL' && !s.event_date.startsWith(selectedMonth)) {
        return false;
      }
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.event_name?.toLowerCase().includes(q);
        const matchesVenue = s.venue?.toLowerCase().includes(q);
        const matchesNotes = s.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesVenue && !matchesNotes) return false;
      }
      return true;
    });
  }, [settlements, selectedMonth, selectedStatus, searchQuery]);

  // Cálculos de cada evento filtrado
  const settlementsWithCalc = useMemo(() => {
    return filteredSettlements.map(item => ({
      item,
      calc: calculateEventSettlement(item, settings)
    }));
  }, [filteredSettlements, settings]);

  // Resumen Global Acumulado (KPIs)
  const globalKpis = useMemo(() => {
    return settlementsWithCalc.reduce(
      (acc, { calc }) => {
        acc.totalRevenue += calc.totalRevenue;
        acc.totalSupplies += calc.suppliesExpense;
        acc.totalExpenses += calc.totalExpenses;
        acc.totalNetProfit += calc.netProfit;
        acc.totalCompanyFund += calc.companyFundAmount;
        acc.totalScarlette += calc.scarletteTotalPayout;
        acc.totalVictoria += calc.victoriaTotalPayout;
        acc.totalExternal += calc.externalTotalPayout;
        return acc;
      },
      {
        totalRevenue: 0,
        totalSupplies: 0,
        totalExpenses: 0,
        totalNetProfit: 0,
        totalCompanyFund: 0,
        totalScarlette: 0,
        totalVictoria: 0,
        totalExternal: 0
      }
    );
  }, [settlementsWithCalc]);

  // Formateador de moneda MXN
  const fmt = (num: number) => {
    return `$${Number(num || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMonthName = (yearMonth: string) => {
    try {
      const [y, m] = yearMonth.split('-');
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${months[parseInt(m, 10) - 1]} ${y}`;
    } catch {
      return yearMonth;
    }
  };

  const copyWhatsAppSummary = (item: VlbEventSettlement, calc: ReturnType<typeof calculateEventSettlement>) => {
    const text = `🌸 *LIQUIDACIÓN OPERATIVA VIVA LA BRIDE*\n💍 *Evento:* ${item.event_name}\n📅 *Fecha:* ${item.event_date}${item.venue ? ` · ${item.venue}` : ''}\n\n` +
      `💳 *Ingreso Total:* ${fmt(calc.totalRevenue)}\n` +
      `📦 *Insumos:* ${fmt(calc.suppliesExpense)}\n` +
      `🚗 *Flete / Carro:* ${fmt(calc.freightPayout)} (${calc.freightBeneficiary})\n` +
      `💌 *Papelería:* ${fmt(calc.stationeryPayout)} (${calc.stationeryBeneficiary})\n` +
      `👥 *Staff Externo (${calc.externalStaffCount}p):* ${fmt(calc.externalStaffPayout)}\n` +
      `👩‍💼 *Turno Scarlette:* ${fmt(calc.scarletteShiftPayout)}\n` +
      `👩‍💼 *Turno Victoria:* ${fmt(calc.victoriaShiftPayout)}\n` +
      `---------------------------\n` +
      `📉 *Total Gastos:* ${fmt(calc.totalExpenses)}\n` +
      `💎 *Ganancia Neta:* ${fmt(calc.netProfit)}\n\n` +
      `🏛️ *Fondo Empresa (60%):* ${fmt(calc.companyFundAmount)}\n` +
      `🤝 *Bolsa Utilidades (40%):* ${fmt(calc.partnersProfitPool)}\n\n` +
      `💰 *PAGO FINAL SCARLETTE:* ${fmt(calc.scarletteTotalPayout)}\n` +
      `   (Turno: ${fmt(calc.scarletteShiftPayout)} + Carro: ${fmt(item.car_provider === 'SCARLETTE' ? calc.freightPayout : 0)} + Papel: ${fmt(item.stationery_provider === 'SCARLETTE' ? calc.stationeryPayout : 0)} + Utilidad 50%: ${fmt(calc.scarletteProfitShare)})\n\n` +
      `💰 *PAGO FINAL VICTORIA:* ${fmt(calc.victoriaTotalPayout)}\n` +
      `   (Turno: ${fmt(calc.victoriaShiftPayout)} + Carro: ${fmt(item.car_provider === 'VICTORIA' ? calc.freightPayout : 0)} + Papel: ${fmt(item.stationery_provider === 'VICTORIA' ? calc.stationeryPayout : 0)} + Utilidad 50%: ${fmt(calc.victoriaProfitShare)})\n\n` +
      `💼 *PAGO STAFF EXTERNO:* ${fmt(calc.externalTotalPayout)}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBreakdownId(item.id);
      setTimeout(() => setCopiedBreakdownId(null), 3000);
      showToast('Resumen copiado para WhatsApp ✨');
    }
  };

  // ----------------------------------------
  // VISTA PRINCIPAL (SOLO ADMINISTRADORES)
  // ----------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold border transition ${
          toastMessage.type === 'error'
            ? 'bg-[#FFF0F2] text-[#C83460] border-[#F5C2CD]'
            : 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER DE CONTROL */}
      <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EAE3DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-[#E84E6D] bg-[#FFF6F8] px-2.5 py-0.5 rounded-full border border-[#F5C2CD] uppercase tracking-wider">
              Dirección & Socias
            </span>
            <span className="text-[10px] font-bold text-[#7D6F6B] bg-[#FCFAF7] px-2.5 py-0.5 rounded-full border border-[#EAE3DA] uppercase">
              60% Empresa · 40% Socias (50/50)
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#332A28] flex items-center space-x-2">
            <span>Nómina, Gastos & Reparto de Utilidades</span>
          </h1>
          <p className="text-xs text-[#7D6F6B]">
            Cálculo automatizado de turnos de staff, asignación de carro/papelería, fondo de reserva y liquidación neta por evento.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
          <button
            onClick={() => {
              setEventForm({
                event_name: '',
                event_date: new Date().toISOString().split('T')[0],
                venue: '',
                service_amount: 0,
                freight_charged: 0,
                extra_services: 0,
                supplies_expense: 0,
                car_provider: 'NINGUNA_EXTERNO',
                stationery_provider: 'NINGUNA',
                staff_scarlette: false,
                staff_victoria: false,
                external_staff_count: 0,
                status: 'PENDIENTE',
                notes: ''
              });
              setIsNewEventModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#332A28] hover:bg-[#58352F] text-[#FFFFFF] text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#CCDACC]" />
            <span>Nuevo Evento</span>
          </button>

          <button
            onClick={handleSyncOrders}
            className="px-3 py-2 rounded-xl bg-[#FCFAF7] hover:bg-[#FAF6F2] text-[#70443D] border border-[#EAE3DA] text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Sincronizar pedidos de Viva la Bride no registrados aún"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#9C665C]" />
            <span>Sincronizar Pedidos</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 rounded-xl bg-[#FCFAF7] hover:bg-[#FAF6F2] text-[#70443D] border border-[#EAE3DA] text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Ajustar tarifas operativas"
          >
            <Settings className="w-3.5 h-3.5 text-[#9C665C]" />
            <span>Tarifas</span>
          </button>

          <div
            className="px-3 py-2 rounded-xl bg-[#FAF6F2] text-[#70443D] border border-[#EAE3DA] text-xs font-bold flex items-center space-x-1.5 shadow-2xs"
            title="Módulo visible exclusivamente para usuarios con rol de Administrador"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#1EBE5D]" />
            <span>Exclusivo Admin</span>
          </div>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN GLOBAL (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Totales */}
        <div className="bg-[#FFFFFF] p-4 rounded-3xl border border-[#EAE3DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#7D6F6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ingreso Total Venta</span>
            <TrendingUp className="w-4 h-4 text-[#1EBE5D]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-serif text-[#332A28]">
            {fmt(globalKpis.totalRevenue)}
          </div>
          <div className="text-[10px] text-[#7D6F6B] truncate">
            {filteredSettlements.length} evento(s) considerados
          </div>
        </div>

        {/* Ganancia Neta Real */}
        <div className="bg-[#FFFFFF] p-4 rounded-3xl border border-[#EAE3DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#7D6F6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ganancia Neta Real</span>
            <Sparkles className="w-4 h-4 text-[#C83460]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-serif text-[#C83460]">
            {fmt(globalKpis.totalNetProfit)}
          </div>
          <div className="text-[10px] text-[#7D6F6B]">
            Gastos Totales: {fmt(globalKpis.totalExpenses)}
          </div>
        </div>

        {/* Fondo Empresa VLB (60%) */}
        <div className="bg-[#FAF6F2] p-4 rounded-3xl border border-[#EAE3DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#7D6F6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9C665C]">Fondo Empresa (60%)</span>
            <PieChart className="w-4 h-4 text-[#9C665C]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-serif text-[#9C665C]">
            {fmt(globalKpis.totalCompanyFund)}
          </div>
          <div className="text-[10px] text-[#7D6F6B]">
            Reserva fija, reinversión & equipo
          </div>
        </div>

        {/* Total Insumos */}
        <div className="bg-[#FFFFFF] p-4 rounded-3xl border border-[#EAE3DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#7D6F6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Insumos de Eventos</span>
            <DollarSign className="w-4 h-4 text-[#7D6F6B]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-serif text-[#332A28]">
            {fmt(globalKpis.totalSupplies)}
          </div>
          <div className="text-[10px] text-[#7D6F6B]">
            Hielo, vasos, cerveza, desechables
          </div>
        </div>
      </div>

      {/* TARJETAS DE LIQUIDACIÓN A SOCIAS & STAFF */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scarlette */}
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border-2 border-[#F5C2CD] shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#E84E6D] uppercase tracking-wider">Liquidación Total</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF6F8] text-[#E84E6D] border border-[#F5C2CD]">
              Socia Fundadora
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-[#332A28]">Scarlette Olivo</h3>
          <div className="text-2xl font-bold font-serif text-[#E84E6D]">
            {fmt(globalKpis.totalScarlette)}
          </div>
          <p className="text-[11px] text-[#7D6F6B] leading-tight">
            Incluye turnos trabajados + fletes de su carro + papelería elaborada + 50% de la bolsa de utilidades (20% neto).
          </p>
        </div>

        {/* Victoria */}
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border-2 border-[#EAE3DA] shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#70443D] uppercase tracking-wider">Liquidación Total</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FCFAF7] text-[#70443D] border border-[#EAE3DA]">
              Socia
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-[#332A28]">Victoria</h3>
          <div className="text-2xl font-bold font-serif text-[#70443D]">
            {fmt(globalKpis.totalVictoria)}
          </div>
          <p className="text-[11px] text-[#7D6F6B] leading-tight">
            Incluye turnos trabajados + fletes de su carro + papelería elaborada + 50% de la bolsa de utilidades (20% neto).
          </p>
        </div>

        {/* Staff Externo */}
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EAE3DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7D6F6B] uppercase tracking-wider">Staff Externo</span>
            <Users className="w-4 h-4 text-[#7D6F6B]" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#332A28]">Apoyo Operativo</h3>
          <div className="text-2xl font-bold font-serif text-[#332A28]">
            {fmt(globalKpis.totalExternal)}
          </div>
          <p className="text-[11px] text-[#7D6F6B] leading-tight">
            Turnos de personal externo a ${settings.staff_rate} MXN por turno para apoyo en montajes y barras.
          </p>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#EAE3DA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2">
          {/* Filtro Mes */}
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#7D6F6B]" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:ring-1 focus:ring-[#9C665C] cursor-pointer"
            >
              <option value="ALL">📅 Todos los Meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthName(m)}</option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:ring-1 focus:ring-[#9C665C] cursor-pointer"
          >
            <option value="ALL">⚡ Todos los Estados</option>
            <option value="PENDIENTE">⏳ Pendientes de Liquidar</option>
            <option value="LIQUIDADO">✅ Liquidados</option>
          </select>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar por cliente o venue..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:ring-1 focus:ring-[#9C665C]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-[#7D6F6B] hover:text-[#332A28]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE EVENTOS */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EAE3DA] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FCFAF7] border-b border-[#EAE3DA] text-[10px] font-bold uppercase tracking-wider text-[#7D6F6B]">
                <th className="py-3 px-3.5">Fecha & Evento</th>
                <th className="py-3 px-3 text-right">Ingreso Venta</th>
                <th className="py-3 px-3 text-right">Insumos</th>
                <th className="py-3 px-3 text-center">Flete / Carro</th>
                <th className="py-3 px-3 text-center">Papelería</th>
                <th className="py-3 px-3 text-center">Staff Asistencia</th>
                <th className="py-3 px-3 text-right">Ganancia Neta</th>
                <th className="py-3 px-3 text-right font-bold text-[#9C665C]">60% VLB</th>
                <th className="py-3 px-3 text-right font-bold text-[#70443D]">Pago Victoria</th>
                <th className="py-3 px-3 text-right font-bold text-[#E84E6D]">Pago Scarlette</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F7F3EE]">
              {settlementsWithCalc.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#7D6F6B]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <HelpCircle className="w-8 h-8 mx-auto text-[#B88A82]" />
                      <p className="font-bold text-sm text-[#332A28]">No hay eventos registrados en este periodo</p>
                      <p className="text-xs">
                        Haz clic en <strong>"Nuevo Evento"</strong> o en <strong>"Sincronizar Pedidos"</strong> para vincular automáticamente los pedidos de Viva la Bride.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                settlementsWithCalc.map(({ item, calc }) => (
                  <tr key={item.id} className="hover:bg-[#FCFAF7] transition">
                    {/* Fecha & Evento */}
                    <td className="py-3.5 px-3.5 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-serif font-bold text-sm text-[#332A28]">
                          {item.event_name}
                        </span>
                        {item.status === 'LIQUIDADO' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F8EE] text-[#1EBE5D] border border-[#BCE8CB]">
                            Liquidado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FFF6F8] text-[#E84E6D] border border-[#F5C2CD]">
                            Pendiente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-[#7D6F6B]">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#B88A82]" />
                          <span>{item.event_date}</span>
                        </span>
                        {item.venue && (
                          <span className="flex items-center space-x-1 truncate max-w-[120px]">
                            <MapPin className="w-3 h-3 text-[#B88A82]" />
                            <span className="truncate">{item.venue}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ingreso Venta */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-bold text-sm text-[#332A28]">{fmt(calc.totalRevenue)}</div>
                      {(item.freight_charged > 0 || item.extra_services > 0) && (
                        <div className="text-[10px] text-[#7D6F6B]">
                          {item.freight_charged > 0 ? `+${fmt(item.freight_charged)} flt` : ''}
                          {item.extra_services > 0 ? ` +${fmt(item.extra_services)} ext` : ''}
                        </div>
                      )}
                    </td>

                    {/* Insumos */}
                    <td className="py-3.5 px-3 text-right">
                      <span className={item.supplies_expense > 0 ? 'text-[#332A28] font-semibold' : 'text-[#A69995]'}>
                        {fmt(item.supplies_expense)}
                      </span>
                    </td>

                    {/* Flete / Carro */}
                    <td className="py-3.5 px-3 text-center">
                      {calc.freightPayout > 0 ? (
                        <div className="space-y-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            item.car_provider === 'SCARLETTE'
                              ? 'bg-[#FFF6F8] text-[#E84E6D] border border-[#F5C2CD]'
                              : item.car_provider === 'VICTORIA'
                              ? 'bg-[#FAF6F2] text-[#70443D] border border-[#EAE3DA]'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.car_provider === 'SCARLETTE' ? 'Scarlette' : item.car_provider === 'VICTORIA' ? 'Victoria' : 'Externo'}
                          </span>
                          <div className="text-[10px] text-[#7D6F6B] font-mono">{fmt(calc.freightPayout)}</div>
                        </div>
                      ) : (
                        <span className="text-[#A69995] text-[11px]">-</span>
                      )}
                    </td>

                    {/* Papelería */}
                    <td className="py-3.5 px-3 text-center">
                      {calc.stationeryPayout > 0 ? (
                        <div className="space-y-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            item.stationery_provider === 'SCARLETTE'
                              ? 'bg-[#FFF6F8] text-[#E84E6D] border border-[#F5C2CD]'
                              : item.stationery_provider === 'VICTORIA'
                              ? 'bg-[#FAF6F2] text-[#70443D] border border-[#EAE3DA]'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.stationery_provider === 'SCARLETTE' ? 'Scarlette' : 'Victoria'}
                          </span>
                          <div className="text-[10px] text-[#7D6F6B] font-mono">{fmt(calc.stationeryPayout)}</div>
                        </div>
                      ) : (
                        <span className="text-[#A69995] text-[11px]">-</span>
                      )}
                    </td>

                    {/* Staff Asistencia */}
                    <td className="py-3.5 px-3 text-center space-y-1">
                      <div className="flex items-center justify-center space-x-1 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${item.staff_scarlette ? 'bg-[#E84E6D]/15 text-[#E84E6D]' : 'bg-gray-100 text-gray-400'}`}>
                          S
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${item.staff_victoria ? 'bg-[#70443D]/15 text-[#70443D]' : 'bg-gray-100 text-gray-400'}`}>
                          V
                        </span>
                        {item.external_staff_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#FAF6F2] text-[#7D6F6B] font-semibold border border-[#EAE3DA]">
                            +{item.external_staff_count} ext
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ganancia Neta */}
                    <td className="py-3.5 px-3 text-right">
                      <span className="font-bold text-sm text-[#C83460]">
                        {fmt(calc.netProfit)}
                      </span>
                    </td>

                    {/* 60% VLB */}
                    <td className="py-3.5 px-3 text-right font-bold text-[#9C665C] font-mono">
                      {fmt(calc.companyFundAmount)}
                    </td>

                    {/* Pago Victoria */}
                    <td className="py-3.5 px-3 text-right font-bold text-[#70443D] font-mono">
                      {fmt(calc.victoriaTotalPayout)}
                    </td>

                    {/* Pago Scarlette */}
                    <td className="py-3.5 px-3 text-right font-bold text-[#E84E6D] font-mono">
                      {fmt(calc.scarletteTotalPayout)}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setDetailModalSettlement(item)}
                          className="p-1.5 rounded-lg bg-[#FAF6F2] hover:bg-[#F6ECE8] text-[#9C665C] transition cursor-pointer"
                          title="Ver desglose detallado de liquidación"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEventForm({
                              ...item
                            });
                            setIsNewEventModal(false);
                            setEditModalSettlement(item);
                          }}
                          className="p-1.5 rounded-lg bg-[#FAF6F2] hover:bg-[#F6ECE8] text-[#70443D] transition cursor-pointer"
                          title="Editar insumos y datos operativos"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSettlement(item.id, item.event_name)}
                          className="p-1.5 rounded-lg bg-[#FFF6F8] hover:bg-[#FEEBF0] text-[#E84E6D] transition cursor-pointer"
                          title="Eliminar liquidación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: DESGLOSE DETALLADO DE LIQUIDACIÓN POR EVENTO */}
      {/* ---------------------------------------------------- */}
      {detailModalSettlement && (() => {
        const item = detailModalSettlement;
        const calc = calculateEventSettlement(item, settings);

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-3xl border border-[#EAE3DA] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-[#E84E6D] bg-[#FFF6F8] px-2.5 py-0.5 rounded-full border border-[#F5C2CD] uppercase">
                      Desglose de Liquidación
                    </span>
                    <span className="text-xs text-[#7D6F6B] font-mono">
                      {item.event_date}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#332A28]">
                    {item.event_name}
                  </h3>
                  {item.venue && <p className="text-xs text-[#7D6F6B]">Sede: {item.venue}</p>}
                </div>
                <button
                  onClick={() => setDetailModalSettlement(null)}
                  className="p-2 rounded-xl text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF6F2] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* BLOQUE 1: INGRESOS & GASTOS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FCFAF7] p-3.5 rounded-2xl border border-[#EAE3DA]">
                  <span className="text-[10px] font-bold uppercase text-[#7D6F6B] block">Ingreso Total</span>
                  <span className="text-lg font-bold font-serif text-[#332A28] block mt-0.5">
                    {fmt(calc.totalRevenue)}
                  </span>
                  <span className="text-[10px] text-[#7D6F6B]">
                    Servicio {fmt(item.service_amount)}
                    {item.freight_charged > 0 ? ` + Flt ${fmt(item.freight_charged)}` : ''}
                  </span>
                </div>

                <div className="bg-[#FCFAF7] p-3.5 rounded-2xl border border-[#EAE3DA]">
                  <span className="text-[10px] font-bold uppercase text-[#7D6F6B] block">Total Gastos Operativos</span>
                  <span className="text-lg font-bold font-serif text-[#70443D] block mt-0.5">
                    -{fmt(calc.totalExpenses)}
                  </span>
                  <span className="text-[10px] text-[#7D6F6B]">Insumos + Fletes + Staff</span>
                </div>

                <div className="bg-[#FFF6F8] p-3.5 rounded-2xl border border-[#F5C2CD]">
                  <span className="text-[10px] font-bold uppercase text-[#E84E6D] block">Ganancia Neta Real</span>
                  <span className="text-lg font-bold font-serif text-[#E84E6D] block mt-0.5">
                    {fmt(calc.netProfit)}
                  </span>
                  <span className="text-[10px] text-[#E84E6D]">100% base de reparto</span>
                </div>
              </div>

              {/* BLOQUE 2: REPARTO DE LA GANANCIA NETA */}
              <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA] space-y-3">
                <span className="text-xs font-bold text-[#70443D] uppercase tracking-wider block">
                  1. Regla de Reparto de Utilidad
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-[#EAE3DA]">
                    <div className="flex justify-between items-center font-bold text-[#9C665C]">
                      <span>Fondo Empresa VLB ({settings.company_fund_pct}%):</span>
                      <span>{fmt(calc.companyFundAmount)}</span>
                    </div>
                    <p className="text-[11px] text-[#7D6F6B] mt-1">
                      Destinado a gastos fijos, reinversión, mobiliario y mantenimiento del taller.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#EAE3DA]">
                    <div className="flex justify-between items-center font-bold text-[#332A28]">
                      <span>Bolsa Utilidad Socias ({settings.partners_profit_pct}%):</span>
                      <span>{fmt(calc.partnersProfitPool)}</span>
                    </div>
                    <p className="text-[11px] text-[#7D6F6B] mt-1">
                      Se divide en partes iguales: 50% Scarlette ({fmt(calc.scarletteProfitShare)}) y 50% Victoria ({fmt(calc.victoriaProfitShare)}).
                    </p>
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: RECIBO DETALLADO POR BENEFICIARIO */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#332A28] uppercase tracking-wider block">
                  2. Liquidación Final a Pagar por Persona
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Scarlette */}
                  <div className="p-4 rounded-2xl bg-[#FFFDFD] border-2 border-[#F5C2CD] space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#F5C2CD]/50">
                      <span className="font-bold text-sm text-[#E84E6D]">Scarlette Olivo</span>
                      <span className="text-[10px] font-bold text-[#E84E6D] bg-[#FFF6F8] px-2 py-0.5 rounded-full">
                        Socia Fundadora
                      </span>
                    </div>
                    <div className="space-y-1 text-[#7D6F6B]">
                      <div className="flex justify-between">
                        <span>• Turno Staff ({item.staff_scarlette ? 'Asistió' : 'No asistió'}):</span>
                        <span className="font-semibold text-[#332A28]">{fmt(calc.scarletteShiftPayout)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Flete / Carro ({item.car_provider === 'SCARLETTE' ? 'Llevó carro' : 'No'}):</span>
                        <span className="font-semibold text-[#332A28]">
                          {fmt(item.car_provider === 'SCARLETTE' ? calc.freightPayout : 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Elaboración Papelería ({item.stationery_provider === 'SCARLETTE' ? 'Elaboró' : 'No'}):</span>
                        <span className="font-semibold text-[#332A28]">
                          {fmt(item.stationery_provider === 'SCARLETTE' ? calc.stationeryPayout : 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#E84E6D]">
                        <span>• Utilidad (50% de la bolsa):</span>
                        <span className="font-bold">{fmt(calc.scarletteProfitShare)}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#F5C2CD] flex justify-between items-center text-sm font-bold text-[#E84E6D]">
                      <span>TOTAL A PAGAR:</span>
                      <span className="text-base font-serif">{fmt(calc.scarletteTotalPayout)}</span>
                    </div>
                  </div>

                  {/* Victoria */}
                  <div className="p-4 rounded-2xl bg-[#FCFAF7] border-2 border-[#EAE3DA] space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#EAE3DA]">
                      <span className="font-bold text-sm text-[#70443D]">Victoria</span>
                      <span className="text-[10px] font-bold text-[#70443D] bg-[#FAF6F2] px-2 py-0.5 rounded-full">
                        Socia
                      </span>
                    </div>
                    <div className="space-y-1 text-[#7D6F6B]">
                      <div className="flex justify-between">
                        <span>• Turno Staff ({item.staff_victoria ? 'Asistió' : 'No asistió'}):</span>
                        <span className="font-semibold text-[#332A28]">{fmt(calc.victoriaShiftPayout)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Flete / Carro ({item.car_provider === 'VICTORIA' ? 'Llevó carro' : 'No'}):</span>
                        <span className="font-semibold text-[#332A28]">
                          {fmt(item.car_provider === 'VICTORIA' ? calc.freightPayout : 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Elaboración Papelería ({item.stationery_provider === 'VICTORIA' ? 'Elaboró' : 'No'}):</span>
                        <span className="font-semibold text-[#332A28]">
                          {fmt(item.stationery_provider === 'VICTORIA' ? calc.stationeryPayout : 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#70443D]">
                        <span>• Utilidad (50% de la bolsa):</span>
                        <span className="font-bold">{fmt(calc.victoriaProfitShare)}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#EAE3DA] flex justify-between items-center text-sm font-bold text-[#70443D]">
                      <span>TOTAL A PAGAR:</span>
                      <span className="text-base font-serif">{fmt(calc.victoriaTotalPayout)}</span>
                    </div>
                  </div>
                </div>

                {/* Staff Externo & Fondo Empresa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#FCFAF7] rounded-xl border border-[#EAE3DA] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#332A28]">Staff Externo ({calc.externalStaffCount} turnos):</div>
                      <div className="text-[11px] text-[#7D6F6B]">${settings.staff_rate} MXN c/u</div>
                    </div>
                    <div className="font-bold font-serif text-sm text-[#332A28]">
                      {fmt(calc.externalStaffPayout)}
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#EAE3DA] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#9C665C]">Fondo Empresa VLB:</div>
                      <div className="text-[11px] text-[#7D6F6B]">{settings.company_fund_pct}% Ganancia Neta</div>
                    </div>
                    <div className="font-bold font-serif text-sm text-[#9C665C]">
                      {fmt(calc.companyFundAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER MODAL */}
              <div className="pt-3 border-t border-[#F7F3EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => copyWhatsAppSummary(item, calc)}
                  className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {copiedBreakdownId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedBreakdownId === item.id ? '¡Copiado al Portapapeles!' : 'Copiar Resumen para WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailModalSettlement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7D6F6B] hover:text-[#332A28] cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: FORMULARIO DE EVENTO (NUEVO / EDITAR) */}
      {/* ---------------------------------------------------- */}
      {(isNewEventModal || editModalSettlement) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-xl rounded-3xl border border-[#EAE3DA] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div>
                <span className="text-[10px] font-bold text-[#E84E6D] uppercase tracking-wider">
                  {isNewEventModal ? 'Registro Nuevo' : 'Edición Operativa'}
                </span>
                <h3 className="font-serif text-xl font-bold text-[#332A28]">
                  {isNewEventModal ? 'Registrar Evento para Liquidación' : 'Editar Datos del Evento'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsNewEventModal(false);
                  setEditModalSettlement(null);
                }}
                className="p-2 rounded-xl text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF6F2] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#7D6F6B] mb-1">
                    Nombre del Evento / Clienta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Boda Mariana & Carlos"
                    value={eventForm.event_name || ''}
                    onChange={e => setEventForm({ ...eventForm, event_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#7D6F6B] mb-1">
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.event_date || ''}
                    onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#7D6F6B] mb-1">
                    Sede / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Parque Fundidora"
                    value={eventForm.venue || ''}
                    onChange={e => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                  />
                </div>
              </div>

              {/* MONTOS FINANCIEROS */}
              <div className="p-3.5 bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA] space-y-3">
                <span className="font-bold text-[#70443D] uppercase tracking-wider block">
                  Ingresos del Evento
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Monto Venta Servicio ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      value={eventForm.service_amount || ''}
                      onChange={e => setEventForm({ ...eventForm, service_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Flete Cobrado al Cliente ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      value={eventForm.freight_charged || ''}
                      onChange={e => setEventForm({ ...eventForm, freight_charged: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Servicios Extra ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      value={eventForm.extra_services || ''}
                      onChange={e => setEventForm({ ...eventForm, extra_services: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* GASTOS OPERATIVOS */}
              <div className="p-3.5 bg-[#FCFAF7] rounded-2xl border border-[#EAE3DA] space-y-3">
                <span className="font-bold text-[#70443D] uppercase tracking-wider block">
                  Operación & Asignaciones
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Gasto Insumos del Evento ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Hielos, vasos, cerveza..."
                      value={eventForm.supplies_expense || ''}
                      onChange={e => setEventForm({ ...eventForm, supplies_expense: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      ¿Quién llevó carro?
                    </label>
                    <select
                      value={eventForm.car_provider || 'NINGUNA_EXTERNO'}
                      onChange={e => setEventForm({ ...eventForm, car_provider: e.target.value as VlbCarProvider })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] cursor-pointer"
                    >
                      <option value="NINGUNA_EXTERNO">Ninguna / Externo ($0)</option>
                      <option value="SCARLETTE">🚗 Scarlette (${eventForm.freight_charged && eventForm.freight_charged > 0 ? eventForm.freight_charged : settings.freight_rate} MXN)</option>
                      <option value="VICTORIA">🚗 Victoria (${eventForm.freight_charged && eventForm.freight_charged > 0 ? eventForm.freight_charged : settings.freight_rate} MXN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      ¿Quién preparó papelería?
                    </label>
                    <select
                      value={eventForm.stationery_provider || 'NINGUNA'}
                      onChange={e => setEventForm({ ...eventForm, stationery_provider: e.target.value as VlbStationeryProvider })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] cursor-pointer"
                    >
                      <option value="NINGUNA">Ninguna ($0)</option>
                      <option value="SCARLETTE">💌 Scarlette (${settings.stationery_rate} MXN)</option>
                      <option value="VICTORIA">💌 Victoria (${settings.stationery_rate} MXN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Cantidad de Staff Externo
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0 personas"
                      value={eventForm.external_staff_count || ''}
                      onChange={e => setEventForm({ ...eventForm, external_staff_count: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>
                </div>

                {/* ASISTENCIA DE SOCIAS */}
                <div className="pt-2 border-t border-[#EAE3DA] space-y-2">
                  <span className="block font-semibold text-[#7D6F6B]">
                    Asistencia de Socias al Turno (${settings.staff_rate} MXN c/u):
                  </span>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(eventForm.staff_scarlette)}
                        onChange={e => setEventForm({ ...eventForm, staff_scarlette: e.target.checked })}
                        className="w-4 h-4 accent-[#E84E6D] rounded"
                      />
                      <span className="font-semibold text-[#332A28]">¿Asistió Scarlette?</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(eventForm.staff_victoria)}
                        onChange={e => setEventForm({ ...eventForm, staff_victoria: e.target.checked })}
                        className="w-4 h-4 accent-[#70443D] rounded"
                      />
                      <span className="font-semibold text-[#332A28]">¿Asistió Victoria?</span>
                    </label>
                  </div>
                </div>

                {/* ESTADO */}
                <div className="pt-2 border-t border-[#EAE3DA]">
                  <label className="block font-semibold text-[#7D6F6B] mb-1">
                    Estado de Liquidación
                  </label>
                  <select
                    value={eventForm.status || 'PENDIENTE'}
                    onChange={e => setEventForm({ ...eventForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] cursor-pointer"
                  >
                    <option value="PENDIENTE">⏳ Pendiente de Liquidación</option>
                    <option value="LIQUIDADO">✅ Liquidado Formalmente</option>
                  </select>
                </div>
              </div>

              {/* BOTONES ACCIÓN */}
              <div className="pt-3 border-t border-[#F7F3EE] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewEventModal(false);
                    setEditModalSettlement(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#EAE3DA] text-[#7D6F6B] hover:text-[#332A28] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#332A28] hover:bg-[#58352F] text-[#FFFFFF] font-bold shadow-xs transition cursor-pointer"
                >
                  {isNewEventModal ? 'Crear Evento' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: AJUSTES DE TARIFAS OPERATIVAS & SEGURIDAD */}
      {/* ---------------------------------------------------- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-3xl border border-[#EAE3DA] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div>
                <span className="text-[10px] font-bold text-[#E84E6D] uppercase tracking-wider">
                  Parámetros Globales
                </span>
                <h3 className="font-serif text-xl font-bold text-[#332A28]">
                  Configuración de Tarifas & Reparto
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-xl text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF6F2] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA] space-y-3">
                <span className="font-bold text-[#70443D] uppercase tracking-wider block">
                  Tarifas Operativas Fijas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Tarifa Turno Staff ($)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={settingsForm.staff_rate}
                      onChange={e => setSettingsForm({ ...settingsForm, staff_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                    <span className="text-[10px] text-[#7D6F6B]">Aplica para socias y externos</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Tarifa Flete / Carro ($)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={settingsForm.freight_rate}
                      onChange={e => setSettingsForm({ ...settingsForm, freight_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                    <span className="text-[10px] text-[#7D6F6B]">Base si no hay cobro al cliente</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Tarifa Papelería ($)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={settingsForm.stationery_rate}
                      onChange={e => setSettingsForm({ ...settingsForm, stationery_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                    <span className="text-[10px] text-[#7D6F6B]">Por elaboración en taller</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-[#FCFAF7] rounded-2xl border border-[#EAE3DA] space-y-3">
                <span className="font-bold text-[#70443D] uppercase tracking-wider block">
                  Porcentajes de Reparto de Ganancia Neta
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      % Fondo Empresa VLB
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={settingsForm.company_fund_pct}
                      onChange={e => setSettingsForm({ ...settingsForm, company_fund_pct: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      % Bolsa Utilidades Socias
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={settingsForm.partners_profit_pct}
                      onChange={e => setSettingsForm({ ...settingsForm, partners_profit_pct: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#7D6F6B]">
                  * La bolsa de utilidades se distribuye equitativamente 50% y 50% entre Scarlette y Victoria.
                </p>
              </div>

              <div className="pt-3 border-t border-[#F7F3EE] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EAE3DA] text-[#7D6F6B] hover:text-[#332A28] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#332A28] hover:bg-[#58352F] text-[#FFFFFF] font-bold shadow-xs transition cursor-pointer"
                >
                  Guardar Parámetros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
