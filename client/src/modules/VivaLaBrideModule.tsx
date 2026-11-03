import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Users,
  Plus,
  Search,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Shield,
  CreditCard,
  Building2,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Upload,
  Eye,
  X,
  Package,
  Layers,
  Percent,
  Check,
  RefreshCw
} from 'lucide-react';
import {
  VlbCatalogItem,
  VlbCategory,
  VlbPricingType,
  VlbQuote,
  VlbQuoteItem,
  VlbOrder,
  VlbPayment,
  VlbDocument
} from '../types/vlb';
import { generateVlbQuotePdf } from '../utils/vlbPdfGenerator';

interface VivaLaBrideModuleProps {
  onBackToLazo?: () => void;
}

export const VivaLaBrideModule: React.FC<VivaLaBrideModuleProps> = ({ onBackToLazo }) => {
  // Navigation Tabs: 'catalog' | 'quotes' | 'orders'
  const [activeTab, setActiveTab] = useState<'quotes' | 'orders' | 'catalog'>('quotes');

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data States
  const [catalogItems, setCatalogItems] = useState<VlbCatalogItem[]>([]);
  const [quotes, setQuotes] = useState<VlbQuote[]>([]);
  const [orders, setOrders] = useState<VlbOrder[]>([]);

  // Selected for Details / Modals
  const [selectedOrder, setSelectedOrder] = useState<VlbOrder | null>(null);
  const [orderPayments, setOrderPayments] = useState<VlbPayment[]>([]);
  const [orderDocs, setOrderDocs] = useState<VlbDocument[]>([]);

  // Quote Builder State
  const [quoteForm, setQuoteForm] = useState({
    client_name: '',
    partner_name: '',
    client_email: '',
    client_phone: '',
    event_date: '',
    event_venue: '',
    discount: 0,
    down_payment_pct: 50,
    notes: '',
    valid_until: ''
  });
  const [quoteItems, setQuoteItems] = useState<VlbQuoteItem[]>([]);

  // Modals
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<VlbCatalogItem | null>(null);
  const [catalogForm, setCatalogForm] = useState<{
    category: VlbCategory;
    subcategory: string;
    name: string;
    description: string;
    pricing_type: VlbPricingType;
    base_price: number;
    min_pieces: number;
    image_url: string;
  }>({
    category: 'PAPELERIA',
    subcategory: 'Invitaciones Finas',
    name: '',
    description: '',
    pricing_type: 'PER_PIECE',
    base_price: 100,
    min_pieces: 50,
    image_url: ''
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_type: 'ANTICIPO_50',
    payment_method: 'SPEI',
    payment_date: new Date().toISOString().split('T')[0],
    reference_num: '',
    notes: ''
  });

  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [docUploadCategory, setDocUploadCategory] = useState<'CONTRATO_FIRMADO' | 'COMPROBANTE_SPEI' | 'VOBO_DISENO' | 'OTRO'>('VOBO_DISENO');
  const [docUploadNotes, setDocUploadNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showDatesEditModal, setShowDatesEditModal] = useState(false);
  const [datesForm, setDatesForm] = useState({
    vobo_design_deadline: '',
    physical_delivery_date: '',
    stand_setup_date: '',
    stand_setup_time: '14:00'
  });

  // Search & Filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('ALL');
  const [ordersSearch, setOrdersSearch] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('lazo_token') : null;

  // Helper fetcher
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };
    return fetch(url, { ...options, headers });
  };

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, quotesRes, ordersRes] = await Promise.all([
        apiFetch('/api/vlb/catalog'),
        apiFetch('/api/vlb/quotes'),
        apiFetch('/api/vlb/orders')
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalogItems(catData.items || []);
      }
      if (quotesRes.ok) {
        const qData = await quotesRes.json();
        setQuotes(qData.quotes || []);
      }
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.orders || []);
      }
    } catch (err: any) {
      console.error('Error loading VLB data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ----------------------------------------
  // CATALOG ACTIONS
  // ----------------------------------------
  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCatalogItem ? `/api/vlb/catalog/${editingCatalogItem.id}` : '/api/vlb/catalog';
      const method = editingCatalogItem ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catalogForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar artículo.');
      }

      showToast(editingCatalogItem ? 'Artículo actualizado con éxito.' : 'Artículo añadido al catálogo.');
      setShowCatalogModal(false);
      setEditingCatalogItem(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este artículo del catálogo de Viva la Bride?')) return;
    try {
      const res = await apiFetch(`/api/vlb/catalog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar artículo.');
      showToast('Artículo eliminado.');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddItemToQuote = (item: VlbCatalogItem) => {
    const existingIndex = quoteItems.findIndex(q => q.catalog_id === item.id);
    if (existingIndex >= 0) {
      // Increase qty
      const updated = [...quoteItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setQuoteItems(updated);
      showToast(`Cantidad incrementada para "${item.name}".`);
    } else {
      const initialQty = item.pricing_type === 'FIXED_EVENT' ? 1 : Math.max(1, item.min_pieces || 50);
      const newItem: VlbQuoteItem = {
        id: 'temp_' + Date.now(),
        catalog_id: item.id,
        category: item.category,
        item_name: item.name,
        description: item.description,
        pricing_type: item.pricing_type,
        unit_price: item.base_price,
        quantity: initialQty,
        total_price: initialQty * item.base_price,
        sort_order: quoteItems.length + 1
      };
      setQuoteItems([...quoteItems, newItem]);
      showToast(`"${item.name}" agregado a la cotización.`);
    }
    setActiveTab('quotes');
  };

  // ----------------------------------------
  // QUOTE BUILDER CALCULATIONS
  // ----------------------------------------
  const updateQuoteItemQty = (index: number, newQty: number) => {
    const updated = [...quoteItems];
    const qty = Math.max(1, newQty);
    updated[index].quantity = qty;
    updated[index].total_price = qty * updated[index].unit_price;
    setQuoteItems(updated);
  };

  const updateQuoteItemPrice = (index: number, newPrice: number) => {
    const updated = [...quoteItems];
    const price = Math.max(0, newPrice);
    updated[index].unit_price = price;
    updated[index].total_price = updated[index].quantity * price;
    setQuoteItems(updated);
  };

  const removeQuoteItem = (index: number) => {
    const updated = quoteItems.filter((_, idx) => idx !== index);
    setQuoteItems(updated);
  };

  const quoteSubtotal = quoteItems.reduce((acc, curr) => acc + curr.total_price, 0);
  const quoteTotal = Math.max(0, quoteSubtotal - (Number(quoteForm.discount) || 0));
  const quoteDownPayment = (quoteTotal * (Number(quoteForm.down_payment_pct) || 50)) / 100;
  const quoteBalanceDue = quoteTotal - quoteDownPayment;

  const handleSaveQuote = async (status: 'BORRADOR' | 'ENVIADA' = 'BORRADOR') => {
    if (!quoteForm.client_name.trim()) {
      showToast('Por favor ingresa el nombre de la clienta o pareja.', 'error');
      return;
    }
    if (quoteItems.length === 0) {
      showToast('Agrega al menos un artículo a la cotización.', 'error');
      return;
    }

    try {
      const res = await apiFetch('/api/vlb/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quoteForm,
          items: quoteItems
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar cotización.');
      }

      const data = await res.json();
      showToast(`Cotización ${data.quote.quote_number} generada con éxito.`);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExportPdfCurrent = () => {
    if (!quoteForm.client_name.trim()) {
      showToast('Ingresa el nombre de la clienta para generar el PDF.', 'error');
      return;
    }
    if (quoteItems.length === 0) {
      showToast('Agrega artículos antes de exportar el PDF.', 'error');
      return;
    }

    const mockQuote: VlbQuote = {
      id: 'current_preview',
      quote_number: 'VLB-' + new Date().getFullYear() + '-DRAFT',
      client_name: quoteForm.client_name,
      partner_name: quoteForm.partner_name,
      client_email: quoteForm.client_email,
      client_phone: quoteForm.client_phone,
      event_date: quoteForm.event_date,
      event_venue: quoteForm.event_venue,
      status: 'BORRADOR',
      subtotal: quoteSubtotal,
      discount: Number(quoteForm.discount) || 0,
      total: quoteTotal,
      down_payment_pct: Number(quoteForm.down_payment_pct) || 50,
      down_payment_amount: quoteDownPayment,
      balance_due: quoteBalanceDue,
      valid_until: quoteForm.valid_until,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    generateVlbQuotePdf(mockQuote, quoteItems);
    showToast('¡PDF Editorial descargado con éxito!');
  };

  const handleExportSavedQuotePdf = async (quote: VlbQuote) => {
    try {
      const res = await apiFetch(`/api/vlb/quotes/${quote.id}`);
      if (!res.ok) throw new Error('Error al cargar cotización');
      const data = await res.json();
      generateVlbQuotePdf(data.quote, data.items);
      showToast(`Cotización ${quote.quote_number} exportada a PDF.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConvertQuoteToOrder = async (quoteId: string) => {
    if (!window.confirm('¿Deseas convertir esta cotización en un Proyecto / Pedido activo en el CRM de Viva la Bride?')) return;
    try {
      const res = await apiFetch(`/api/vlb/quotes/${quoteId}/convert-to-order`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al convertir cotización.');
      const data = await res.json();
      showToast(data.message || 'Proyecto creado en el CRM.');
      loadData();
      setActiveTab('orders');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ----------------------------------------
  // CRM ORDERS & DOCUMENTS
  // ----------------------------------------
  const handleOpenOrderDetail = async (order: VlbOrder) => {
    setSelectedOrder(order);
    try {
      const res = await apiFetch(`/api/vlb/orders/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
        setOrderPayments(data.payments || []);
        setOrderDocs(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await apiFetch(`/api/vlb/orders/${selectedOrder.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al registrar pago.');
      }
      showToast('Pago registrado y saldos actualizados.');
      setShowPaymentModal(false);
      setPaymentForm({
        amount: '',
        payment_type: 'ANTICIPO_50',
        payment_method: 'SPEI',
        payment_date: new Date().toISOString().split('T')[0],
        reference_num: '',
        notes: ''
      });
      // Refresh order
      handleOpenOrderDetail(selectedOrder);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', docUploadCategory);
      formData.append('notes', docUploadNotes);

      const res = await fetch(`/api/vlb/orders/${selectedOrder.id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al subir archivo a la bóveda.');
      }

      showToast('Documento resguardado exitosamente en la bóveda.');
      setShowDocUploadModal(false);
      setSelectedFile(null);
      setDocUploadNotes('');
      handleOpenOrderDetail(selectedOrder);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateVobo = async (docId: string, status: 'APROBADO' | 'RECHAZADO') => {
    const notes = prompt(`Notas de autorización del Visto Bueno (${status}):`, status === 'APROBADO' ? 'Diseño aprobado formalmente por los novios.' : 'Se solicitaron ajustes menores.');
    if (notes === null) return;

    try {
      const res = await apiFetch(`/api/vlb/documents/${docId}/vobo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vobo_status: status, vobo_notes: notes })
      });
      if (!res.ok) throw new Error('Error al actualizar VoBo');
      showToast(`VoBo actualizado a ${status}.`);
      if (selectedOrder) handleOpenOrderDetail(selectedOrder);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveLogisticsDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const res = await apiFetch(`/api/vlb/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datesForm)
      });
      if (!res.ok) throw new Error('Error al actualizar fechas.');
      showToast('Logística de fechas actualizada.');
      setShowDatesEditModal(false);
      handleOpenOrderDetail(selectedOrder);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered Catalog Items
  const filteredCatalog = catalogItems.filter(item => {
    const matchesCat = catalogCategoryFilter === 'ALL' || item.category === catalogCategoryFilter;
    const matchesSearch = !catalogSearch.trim() ||
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.subcategory.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    return !ordersSearch.trim() ||
      o.client_name.toLowerCase().includes(ordersSearch.toLowerCase()) ||
      (o.partner_name && o.partner_name.toLowerCase().includes(ordersSearch.toLowerCase())) ||
      o.order_number.toLowerCase().includes(ordersSearch.toLowerCase()) ||
      (o.event_venue && o.event_venue.toLowerCase().includes(ordersSearch.toLowerCase()));
  });

  // KPIs
  const totalRevenueContracted = orders.reduce((acc, o) => acc + o.total_amount, 0);
  const totalCollectedDownPayments = orders.reduce((acc, o) => acc + o.total_paid, 0);
  const totalPendingBalance = orders.reduce((acc, o) => acc + o.balance_pending, 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-medium transition-all transform animate-bounce-subtle ${
            feedback.type === 'success'
              ? 'bg-[#332A28] text-[#FFFFFF] border border-[#B88A82]'
              : 'bg-[#70443D] text-[#FFFFFF]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#CCDACC]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#EFE2DF]" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header Editorial Exclusivo Viva la Bride */}
      <div className="bg-gradient-to-r from-[#FAF6F2] via-[#F6ECE8] to-[#FCFAF7] border border-[#EFE2DF] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#EFE2DF]/50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EFE2DF] text-[#70443D] text-[11px] font-semibold tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#B88A82]" />
              <span>Atelier de Papelería Social & Experiencias de Bienvenida</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#332A28] font-bold tracking-tight">
              Viva la Bride
            </h1>
            <p className="text-sm text-[#7D6F6B] mt-1.5 max-w-2xl leading-relaxed">
              Módulo integral para cotización ágil, catálogo editorial de papelería en algodón y lacre, stands nupciales, control de anticipos (50%) y bóveda de VoBo digital protegida.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex flex-wrap items-center bg-[#FFFFFF]/90 backdrop-blur-xs p-1.5 rounded-2xl border border-[#EAE3DA] shadow-xs">
            <button
              onClick={() => setActiveTab('quotes')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'quotes'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Cotizador Rápido</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>CRM Parejas & Fechas</span>
              {orders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#EFE2DF] text-[#70443D] rounded-full">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Catálogo & Precios</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: COTIZADOR RÁPIDO & PDF EDITORIAL                  */}
      {/* ======================================================== */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Formulario de la Pareja y Lista de Artículos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Datos de la Pareja / Evento */}
              <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-[#B88A82]" />
                    <h2 className="font-serif text-lg font-bold text-[#332A28]">
                      Datos de la Pareja & Evento
                    </h2>
                  </div>
                  <span className="text-xs text-[#7D6F6B]">
                    Folio sugerido: VLB-{new Date().getFullYear()}-00{quotes.length + 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      Nombre de la Novia / Clienta *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Sofía Villaseñor"
                      value={quoteForm.client_name}
                      onChange={e => setQuoteForm({ ...quoteForm, client_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      Nombre del Novio / Pareja
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Alejandro Moreno"
                      value={quoteForm.partner_name}
                      onChange={e => setQuoteForm({ ...quoteForm, partner_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="sofia@ejemplo.com"
                      value={quoteForm.client_email}
                      onChange={e => setQuoteForm({ ...quoteForm, client_email: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      Teléfono WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="+52 33 1234 5678"
                      value={quoteForm.client_phone}
                      onChange={e => setQuoteForm({ ...quoteForm, client_phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      Fecha del Evento
                    </label>
                    <input
                      type="date"
                      value={quoteForm.event_date}
                      onChange={e => setQuoteForm({ ...quoteForm, event_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      Sede / Venue
                    </label>
                    <input
                      type="text"
                      placeholder="Hacienda San José del Carmen"
                      value={quoteForm.event_venue}
                      onChange={e => setQuoteForm({ ...quoteForm, event_venue: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                </div>
              </div>

              {/* Partidas de la Cotización */}
              <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F7F3EE] gap-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-[#B88A82]" />
                    <h2 className="font-serif text-lg font-bold text-[#332A28]">
                      Artículos & Experiencias en la Propuesta
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#9C665C] hover:text-[#70443D] bg-[#FAF6F2] hover:bg-[#F6ECE8] px-3 py-1.5 rounded-full border border-[#EAE3DA] transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Explorar y Agregar del Catálogo</span>
                  </button>
                </div>

                {quoteItems.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-[#FCFAF7] rounded-2xl border border-dashed border-[#EAE3DA]">
                    <Sparkles className="w-8 h-8 text-[#B88A82] mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-serif font-bold text-[#332A28]">
                      Aún no has añadido artículos a esta propuesta
                    </p>
                    <p className="text-xs text-[#7D6F6B] mt-1 max-w-md mx-auto">
                      Puedes agregar invitaciones de algodón, menús en foil, welcome drinks o audio guestbook directamente desde el catálogo.
                    </p>
                    <button
                      onClick={() => setActiveTab('catalog')}
                      className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ver Catálogo Viva la Bride</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quoteItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] hover:border-[#DDD2C4] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                item.category === 'PAPELERIA'
                                  ? 'bg-[#EFE2DF] text-[#70443D]'
                                  : 'bg-[#CCDACC] text-[#384C3A]'
                              }`}
                            >
                              {item.category === 'PAPELERIA' ? 'Papelería Social' : 'Stands & Bienvenida'}
                            </span>
                            <span className="text-xs text-[#7D6F6B]">
                              {item.pricing_type === 'PER_PIECE' ? 'Cobro por Pieza' : 'Tarifa por Evento'}
                            </span>
                          </div>
                          <h4 className="font-serif text-base font-bold text-[#332A28] mt-1 truncate">
                            {item.item_name}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-[#7D6F6B] mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Cantidad y Precios */}
                        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                          {item.pricing_type === 'PER_PIECE' ? (
                            <div className="flex items-center space-x-1.5">
                              <label className="text-[11px] text-[#7D6F6B]">Piezas:</label>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={e => updateQuoteItemQty(idx, parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 text-xs text-center font-bold bg-[#FFFFFF] border border-[#EAE3DA] rounded-lg text-[#332A28]"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-[#7D6F6B] font-medium bg-[#FFFFFF] px-2.5 py-1 rounded-lg border border-[#EAE3DA]">
                              1 Evento
                            </span>
                          )}

                          <div className="text-right min-w-[90px]">
                            <div className="text-xs font-semibold text-[#7D6F6B]">
                              ${item.unit_price.toLocaleString('es-MX')} c/u
                            </div>
                            <div className="text-sm font-bold text-[#332A28]">
                              ${item.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          <button
                            onClick={() => removeQuoteItem(idx)}
                            className="p-1.5 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#F7EDEB] rounded-lg transition cursor-pointer"
                            title="Eliminar partida"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Desglose Financiero 50/50 y Acciones */}
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs sticky top-20 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-[#B88A82]" />
                    <h3 className="font-serif text-lg font-bold text-[#332A28]">
                      Desglose Financiero
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#9C665C] bg-[#FAF6F2] px-2.5 py-1 rounded-full border border-[#EAE3DA]">
                    Anticipo 50%
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-[#7D6F6B]">
                    <span>Subtotal Artículos:</span>
                    <span className="font-semibold text-[#332A28]">
                      ${quoteSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#7D6F6B]">Descuento ($):</span>
                    <input
                      type="number"
                      min={0}
                      value={quoteForm.discount}
                      onChange={e => setQuoteForm({ ...quoteForm, discount: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-24 px-2 py-1 text-right text-xs font-semibold bg-[#FCFAF7] border border-[#EAE3DA] rounded-lg text-[#332A28]"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#F7F3EE] flex justify-between items-baseline">
                    <span className="font-serif font-bold text-[#332A28] text-base">
                      Total Contratado:
                    </span>
                    <span className="font-serif font-bold text-[#332A28] text-xl">
                      ${quoteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Highlight Box Anticipo 50% */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF6F2] to-[#F6ECE8] border border-[#EAD2D0] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-[#70443D]">
                      <span>Anticipo Requerido (50%):</span>
                      <span className="text-sm">
                        ${quoteDownPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#7D6F6B]">
                      <span>Saldo Pendiente al Entregar:</span>
                      <span className="font-semibold text-[#332A28]">
                        ${quoteBalanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#7D6F6B] leading-relaxed pt-1 border-t border-[#EAE3DA]">
                      * El 50% de anticipo reserva la fecha del taller de imprenta y bloquea el mobiliario para el día del evento.
                    </p>
                  </div>
                </div>

                {/* Acciones Principales */}
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={handleExportPdfCurrent}
                    className="w-full py-3.5 px-4 bg-[#332A28] hover:bg-[#58352F] text-[#FFFFFF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#CCDACC]" />
                    <span>Exportar PDF Editorial</span>
                  </button>

                  <button
                    onClick={() => handleSaveQuote('BORRADOR')}
                    className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#FCFAF7] text-[#70443D] border border-[#EAE3DA] text-xs font-bold uppercase tracking-wider rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4 text-[#B88A82]" />
                    <span>Guardar Cotización</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (!quoteForm.client_name.trim()) {
                        showToast('Ingresa el nombre de la novia primero.', 'error');
                        return;
                      }
                      if (quoteItems.length === 0) {
                        showToast('Agrega al menos una partida a la cotización.', 'error');
                        return;
                      }
                      // Save and convert
                      try {
                        const res = await apiFetch('/api/vlb/quotes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...quoteForm, items: quoteItems })
                        });
                        const data = await res.json();
                        if (data.quote?.id) {
                          await handleConvertQuoteToOrder(data.quote.id);
                        }
                      } catch (e: any) {
                        showToast(e.message, 'error');
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Convertir a Pedido en CRM</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Cotizaciones Guardadas */}
          <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#B88A82]" />
                <h3 className="font-serif text-lg font-bold text-[#332A28]">
                  Historial de Cotizaciones Emitidas
                </h3>
              </div>
              <span className="text-xs text-[#7D6F6B]">
                {quotes.length} cotizaciones registradas
              </span>
            </div>

            {quotes.length === 0 ? (
              <p className="text-xs text-[#7D6F6B] text-center py-6">
                No hay cotizaciones archivadas todavía.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFE8E1] text-[#7D6F6B] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Folio</th>
                      <th className="py-3 px-3">Clienta / Pareja</th>
                      <th className="py-3 px-3">Fecha Evento</th>
                      <th className="py-3 px-3">Total</th>
                      <th className="py-3 px-3">Anticipo 50%</th>
                      <th className="py-3 px-3">Estatus</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F7F3EE]">
                    {quotes.map(q => (
                      <tr key={q.id} className="hover:bg-[#FCFAF7] transition">
                        <td className="py-3.5 px-3 font-semibold text-[#9C665C]">
                          {q.quote_number}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-serif font-bold text-sm text-[#332A28]">
                            {q.client_name} {q.partner_name ? `& ${q.partner_name}` : ''}
                          </div>
                          <div className="text-[11px] text-[#7D6F6B]">
                            {q.client_phone || q.client_email || 'Sin contacto'}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-[#7D6F6B]">
                          {q.event_date || 'A definir'}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-[#332A28]">
                          ${q.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#70443D]">
                          ${q.down_payment_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              q.status === 'CONVERTIDA'
                                ? 'bg-[#CCDACC] text-[#384C3A]'
                                : q.status === 'APROBADA'
                                ? 'bg-[#EFE2DF] text-[#70443D]'
                                : 'bg-[#F7F3EE] text-[#7D6F6B]'
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleExportSavedQuotePdf(q)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F6ECE8] text-[#70443D] border border-[#EAE3DA] font-semibold text-[11px] cursor-pointer"
                            title="Descargar PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                          {q.status !== 'CONVERTIDA' && (
                            <button
                              onClick={() => handleConvertQuoteToOrder(q.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] font-semibold text-[11px] cursor-pointer"
                              title="Convertir a Pedido CRM"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Convertir</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CRM PAREJAS & OPERACIÓN LOGÍSTICA                 */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Métricas Operativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EFE8E1] shadow-xs">
              <span className="text-[11px] font-semibold text-[#7D6F6B] uppercase tracking-wider">
                Proyectos Activos
              </span>
              <div className="text-2xl font-serif font-bold text-[#332A28] mt-1">
                {orders.length}
              </div>
              <span className="text-xs text-[#9C665C]">Parejas en atelier</span>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EFE8E1] shadow-xs">
              <span className="text-[11px] font-semibold text-[#7D6F6B] uppercase tracking-wider">
                Total Contratado
              </span>
              <div className="text-2xl font-serif font-bold text-[#332A28] mt-1">
                ${totalRevenueContracted.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-[#7D6F6B]">Valor de cartera</span>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EFE8E1] shadow-xs">
              <span className="text-[11px] font-semibold text-[#7D6F6B] uppercase tracking-wider">
                Anticipos Cobrados (50%)
              </span>
              <div className="text-2xl font-serif font-bold text-[#384C3A] mt-1">
                ${totalCollectedDownPayments.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-[#CCDACC]-dark">Fondos en cuenta</span>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EFE8E1] shadow-xs">
              <span className="text-[11px] font-semibold text-[#7D6F6B] uppercase tracking-wider">
                Saldos por Cobrar
              </span>
              <div className="text-2xl font-serif font-bold text-[#70443D] mt-1">
                ${totalPendingBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-[#B88A82]">Previo a entrega y montaje</span>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
              <input
                type="text"
                placeholder="Buscar por nombre de novia, novio, folio o venue..."
                value={ordersSearch}
                onChange={e => setOrdersSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FFFFFF] border border-[#EAE3DA] rounded-2xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadData}
                className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EAE3DA] text-[#7D6F6B] hover:text-[#332A28] transition cursor-pointer"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Lista de Proyectos / Parejas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                onClick={() => handleOpenOrderDetail(order)}
                className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] hover:border-[#B88A82] shadow-xs transition hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#9C665C] bg-[#FAF6F2] px-2.5 py-1 rounded-full border border-[#EAE3DA]">
                      {order.order_number}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        order.payment_status === 'LIQUIDADO'
                          ? 'bg-[#CCDACC] text-[#384C3A]'
                          : order.payment_status === 'ANTICIPO_PAGADO'
                          ? 'bg-[#EFE2DF] text-[#70443D]'
                          : 'bg-[#FBF4F3] text-[#70443D] border border-[#EAD2D0]'
                      }`}
                    >
                      {order.payment_status === 'LIQUIDADO'
                        ? 'Liquidado 100%'
                        : order.payment_status === 'ANTICIPO_PAGADO'
                        ? 'Anticipo 50% Cubierto'
                        : 'Anticipo Pendiente'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#332A28] group-hover:text-[#9C665C] transition">
                      {order.client_name} {order.partner_name ? `& ${order.partner_name}` : ''}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-[#7D6F6B] mt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#B88A82]" />
                      <span>{order.event_date}</span>
                      {order.event_venue && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[150px]">{order.event_venue}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Semáforo de Fechas Críticas */}
                  <div className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-[#7D6F6B]">
                      <span>Límite VoBo Diseño:</span>
                      <span className="font-bold text-[#332A28]">
                        {order.vobo_design_deadline || 'No asignada'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#7D6F6B]">
                      <span>Entrega Papelería:</span>
                      <span className="font-bold text-[#332A28]">
                        {order.physical_delivery_date || 'No asignada'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#7D6F6B]">
                      <span>Montaje Stands:</span>
                      <span className="font-bold text-[#70443D]">
                        {order.stand_setup_date || order.event_date} {order.stand_setup_time ? `(${order.stand_setup_time})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Financiero */}
                <div className="pt-3 border-t border-[#F7F3EE] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#7D6F6B] block">Total Contratado</span>
                    <span className="font-bold text-[#332A28]">
                      ${order.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#7D6F6B] block">Saldo Pendiente</span>
                    <span className="font-bold text-[#70443D]">
                      ${order.balance_pending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7D6F6B] group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 bg-[#FFFFFF] rounded-3xl border border-[#EFE8E1]">
              <Users className="w-10 h-10 text-[#B88A82] mx-auto mb-2 opacity-50" />
              <p className="font-serif text-lg font-bold text-[#332A28]">
                No se encontraron proyectos activos
              </p>
              <p className="text-xs text-[#7D6F6B] mt-1">
                Genera una nueva cotización y conviértela a pedido para verla aquí.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CATÁLOGO DE ARTÍCULOS Y PRECIOS                   */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCatalogCategoryFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  catalogCategoryFilter === 'ALL'
                    ? 'bg-[#332A28] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#7D6F6B] border border-[#EAE3DA]'
                }`}
              >
                Todos ({catalogItems.length})
              </button>
              <button
                onClick={() => setCatalogCategoryFilter('PAPELERIA')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  catalogCategoryFilter === 'PAPELERIA'
                    ? 'bg-[#9C665C] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#7D6F6B] border border-[#EAE3DA]'
                }`}
              >
                Papelería Social Finas
              </button>
              <button
                onClick={() => setCatalogCategoryFilter('STANDS_EXPERIENCIAS')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  catalogCategoryFilter === 'STANDS_EXPERIENCIAS'
                    ? 'bg-[#9C665C] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#7D6F6B] border border-[#EAE3DA]'
                }`}
              >
                Stands & Experiencias de Bienvenida
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                <input
                  type="text"
                  placeholder="Buscar artículo..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                />
              </div>

              <button
                onClick={() => {
                  setEditingCatalogItem(null);
                  setCatalogForm({
                    category: 'PAPELERIA',
                    subcategory: 'Invitaciones Finas',
                    name: '',
                    description: '',
                    pricing_type: 'PER_PIECE',
                    base_price: 100,
                    min_pieces: 50,
                    image_url: ''
                  });
                  setShowCatalogModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Artículo</span>
              </button>
            </div>
          </div>

          {/* Grid de Artículos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map(item => (
              <div
                key={item.id}
                className="bg-[#FFFFFF] rounded-3xl border border-[#EFE8E1] hover:border-[#DDD2C4] shadow-xs overflow-hidden flex flex-col justify-between group transition hover:shadow-md"
              >
                <div>
                  {/* Photo or Editorial Placeholder */}
                  <div className="h-44 w-full bg-[#FCFAF7] overflow-hidden relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FAF6F2] to-[#F6ECE8]">
                        <Package className="w-12 h-12 text-[#B88A82] opacity-40" />
                      </div>
                    )}
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                        item.category === 'PAPELERIA'
                          ? 'bg-[#FFFFFF]/90 text-[#70443D]'
                          : 'bg-[#332A28]/90 text-[#FFFFFF]'
                      }`}
                    >
                      {item.subcategory || (item.category === 'PAPELERIA' ? 'Papelería' : 'Stand')}
                    </span>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#7D6F6B]">
                      <span>{item.pricing_type === 'PER_PIECE' ? 'Cálculo por Pieza' : 'Tarifa por Evento'}</span>
                      {item.pricing_type === 'PER_PIECE' && item.min_pieces > 1 && (
                        <span>Mín. {item.min_pieces} pcs</span>
                      )}
                    </div>

                    <h3 className="font-serif text-lg font-bold text-[#332A28] leading-snug">
                      {item.name}
                    </h3>

                    <p className="text-xs text-[#7D6F6B] line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Footer Precio y Botón Cotizar */}
                <div className="p-5 pt-3 border-t border-[#F7F3EE] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#7D6F6B] uppercase tracking-wider block">
                      Precio Base
                    </span>
                    <span className="font-serif text-xl font-bold text-[#332A28]">
                      ${item.base_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      {item.pricing_type === 'PER_PIECE' ? (
                        <span className="text-xs font-normal text-[#7D6F6B] font-sans"> / pza</span>
                      ) : (
                        <span className="text-xs font-normal text-[#7D6F6B] font-sans"> / evento</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        setEditingCatalogItem(item);
                        setCatalogForm({
                          category: item.category,
                          subcategory: item.subcategory,
                          name: item.name,
                          description: item.description,
                          pricing_type: item.pricing_type,
                          base_price: item.base_price,
                          min_pieces: item.min_pieces,
                          image_url: item.image_url || ''
                        });
                        setShowCatalogModal(true);
                      }}
                      className="p-2 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF6F2] rounded-xl transition cursor-pointer"
                      title="Editar artículo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAddItemToQuote(item)}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cotizar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER / MODAL: DETALLE DEL PROYECTO (CRM)               */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-[#FFFFFF] h-full overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header Drawer */}
              <div className="flex items-start justify-between pb-4 border-b border-[#EFE8E1]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF6F2] text-[#9C665C] border border-[#EAE3DA]">
                      {selectedOrder.order_number}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedOrder.payment_status === 'LIQUIDADO'
                          ? 'bg-[#CCDACC] text-[#384C3A]'
                          : 'bg-[#EFE2DF] text-[#70443D]'
                      }`}
                    >
                      {selectedOrder.payment_status}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#332A28] mt-2">
                    {selectedOrder.client_name} {selectedOrder.partner_name ? `& ${selectedOrder.partner_name}` : ''}
                  </h2>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">
                    {selectedOrder.event_venue || 'Sede sin definir'} · Evento el {selectedOrder.event_date}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF6F2] rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. SECCIÓN FINANCIERA: ANTICIPO (50%) & SALDOS */}
              <div className="p-5 rounded-3xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-[#B88A82]" />
                    <h4 className="font-serif text-base font-bold text-[#332A28]">
                      Control de Anticipos (50%) y Liquidación
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar Pago SPEI</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#EAE3DA]">
                    <span className="text-[10px] text-[#7D6F6B] uppercase block">Total</span>
                    <span className="font-bold text-[#332A28] text-sm">
                      ${selectedOrder.total_amount.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#EAE3DA]">
                    <span className="text-[10px] text-[#7D6F6B] uppercase block">Anticipo 50%</span>
                    <span className="font-bold text-[#70443D] text-sm">
                      ${selectedOrder.down_payment_required.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#EAE3DA]">
                    <span className="text-[10px] text-[#7D6F6B] uppercase block">Pagado</span>
                    <span className="font-bold text-[#384C3A] text-sm">
                      ${selectedOrder.total_paid.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#EAE3DA]">
                    <span className="text-[10px] text-[#7D6F6B] uppercase block">Saldo Pendiente</span>
                    <span className="font-bold text-[#70443D] text-sm">
                      ${selectedOrder.balance_pending.toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>

                {/* Pagos Realizados */}
                {orderPayments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#EAE3DA]">
                    <span className="text-xs font-semibold text-[#7D6F6B]">
                      Historial de Pagos Verificados:
                    </span>
                    {orderPayments.map(p => (
                      <div
                        key={p.id}
                        className="p-3 bg-[#FFFFFF] rounded-xl border border-[#EFE8E1] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#332A28]">
                            {p.payment_type === 'ANTICIPO_50' ? 'Anticipo 50%' : p.payment_type} · {p.payment_method}
                          </div>
                          <div className="text-[11px] text-[#7D6F6B]">
                            {p.payment_date} {p.reference_num ? `· Ref: ${p.reference_num}` : ''}
                          </div>
                        </div>
                        <span className="font-bold text-[#384C3A] text-sm">
                          +${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. SECCIÓN LOGÍSTICA DE FECHAS CRÍTICAS */}
              <div className="p-5 rounded-3xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#B88A82]" />
                    <h4 className="font-serif text-base font-bold text-[#332A28]">
                      Logística de Fechas Críticas
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      setDatesForm({
                        vobo_design_deadline: selectedOrder.vobo_design_deadline || '',
                        physical_delivery_date: selectedOrder.physical_delivery_date || '',
                        stand_setup_date: selectedOrder.stand_setup_date || selectedOrder.event_date,
                        stand_setup_time: selectedOrder.stand_setup_time || '14:00'
                      });
                      setShowDatesEditModal(true);
                    }}
                    className="text-xs font-semibold text-[#9C665C] hover:underline cursor-pointer"
                  >
                    Editar Fechas
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-[#FFFFFF] rounded-2xl border border-[#EAE3DA] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#332A28] block">
                        1. Aprobación de Diseño Digital (VoBo)
                      </span>
                      <span className="text-[11px] text-[#7D6F6B]">
                        Fecha límite previa a entrar a imprenta
                      </span>
                    </div>
                    <span className="font-bold text-[#9C665C] bg-[#FAF6F2] px-2.5 py-1 rounded-lg">
                      {selectedOrder.vobo_design_deadline || 'Sin definir'}
                    </span>
                  </div>

                  <div className="p-3 bg-[#FFFFFF] rounded-2xl border border-[#EAE3DA] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#332A28] block">
                        2. Entrega Física de Papelería
                      </span>
                      <span className="text-[11px] text-[#7D6F6B]">
                        En atelier o envío a domicilio
                      </span>
                    </div>
                    <span className="font-bold text-[#332A28] bg-[#FAF6F2] px-2.5 py-1 rounded-lg">
                      {selectedOrder.physical_delivery_date || 'Sin definir'}
                    </span>
                  </div>

                  <div className="p-3 bg-[#FFFFFF] rounded-2xl border border-[#EAE3DA] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#332A28] block">
                        3. Montaje de Stands en el Venue
                      </span>
                      <span className="text-[11px] text-[#7D6F6B]">
                        Welcome Drinks, Audio Guestbook, Seating
                      </span>
                    </div>
                    <span className="font-bold text-[#70443D] bg-[#F7EDEB] px-2.5 py-1 rounded-lg">
                      {selectedOrder.stand_setup_date || selectedOrder.event_date} a las {selectedOrder.stand_setup_time || '14:00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. BÓVEDA DE DOCUMENTOS PROTEGIDA */}
              <div className="p-5 rounded-3xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-[#B88A82]" />
                    <h4 className="font-serif text-base font-bold text-[#332A28]">
                      Bóveda de Documentos Protegida
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowDocUploadModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#332A28] hover:bg-[#58352F] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Documento</span>
                  </button>
                </div>

                {orderDocs.length === 0 ? (
                  <p className="text-xs text-[#7D6F6B] text-center py-4 bg-[#FFFFFF] rounded-2xl border border-dashed border-[#EAE3DA]">
                    No se han cargado contratos, SPEI o VoBos a esta bóveda aún.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orderDocs.map(doc => (
                      <div
                        key={doc.id}
                        className="p-4 bg-[#FFFFFF] rounded-2xl border border-[#EFE8E1] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              doc.category === 'CONTRATO_FIRMADO'
                                ? 'bg-[#FAF6F2] text-[#9C665C]'
                                : doc.category === 'COMPROBANTE_SPEI'
                                ? 'bg-[#CCDACC] text-[#384C3A]'
                                : doc.category === 'VOBO_DISENO'
                                ? 'bg-[#EFE2DF] text-[#70443D]'
                                : 'bg-[#F7F3EE] text-[#7D6F6B]'
                            }`}
                          >
                            {doc.category}
                          </span>
                          <span className="text-[10px] text-[#7D6F6B]">
                            {(doc.file_size / 1024).toFixed(1)} KB · {doc.created_at.split('T')[0]}
                          </span>
                        </div>

                        <div className="font-semibold text-[#332A28] truncate">
                          {doc.original_name}
                        </div>

                        {doc.notes && (
                          <p className="text-[11px] text-[#7D6F6B] italic">
                            {doc.notes}
                          </p>
                        )}

                        {/* VoBo Workflow for Design Proposals */}
                        {doc.category === 'VOBO_DISENO' && (
                          <div className="pt-2 border-t border-[#F7F3EE] flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[11px] text-[#7D6F6B]">Estatus VoBo:</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  doc.vobo_status === 'APROBADO'
                                    ? 'bg-[#CCDACC] text-[#384C3A]'
                                    : doc.vobo_status === 'RECHAZADO'
                                    ? 'bg-[#FBF4F3] text-[#70443D]'
                                    : 'bg-[#F7F3EE] text-[#7D6F6B]'
                                }`}
                              >
                                {doc.vobo_status}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              {doc.vobo_status !== 'APROBADO' && (
                                <button
                                  onClick={() => handleUpdateVobo(doc.id, 'APROBADO')}
                                  className="px-2.5 py-1 bg-[#CCDACC] hover:bg-[#b8ccb8] text-[#384C3A] font-bold text-[10px] rounded-lg transition cursor-pointer"
                                >
                                  Aprobar VoBo
                                </button>
                              )}
                              {doc.vobo_status !== 'RECHAZADO' && (
                                <button
                                  onClick={() => handleUpdateVobo(doc.id, 'RECHAZADO')}
                                  className="px-2.5 py-1 bg-[#FBF4F3] hover:bg-[#f2e6e4] text-[#70443D] font-bold text-[10px] rounded-lg transition cursor-pointer"
                                >
                                  Rechazar
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Download button */}
                        <div className="pt-2 flex justify-end">
                          <a
                            href={`/api/vlb/documents/${doc.id}/download`}
                            download
                            className="inline-flex items-center space-x-1 text-[#9C665C] hover:text-[#70443D] font-semibold text-[11px]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar archivo seguro</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#EFE8E1] flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-[#FAF6F2] hover:bg-[#F6ECE8] text-[#332A28] text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR PAGO SPEI / ANTICIPO                    */}
      {/* ======================================================== */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl border border-[#EFE8E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-[#B88A82]" />
                <h3 className="font-serif text-lg font-bold text-[#332A28]">
                  Registrar Pago / Anticipo SPEI
                </h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-[#7D6F6B] hover:text-[#332A28] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Monto del Pago ($ MXN) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="0.01"
                  placeholder={String(selectedOrder.balance_pending || selectedOrder.down_payment_required)}
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl font-bold text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Tipo de Pago
                  </label>
                  <select
                    value={paymentForm.payment_type}
                    onChange={e => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  >
                    <option value="ANTICIPO_50">Anticipo 50%</option>
                    <option value="ABONO">Abono a Cuenta</option>
                    <option value="LIQUIDACION_FINAL">Liquidación Final</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Método
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  >
                    <option value="SPEI">Transferencia SPEI</option>
                    <option value="TARJETA">Tarjeta de Crédito</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Fecha del Pago
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Número de Rastreo / Referencia SPEI
                </label>
                <input
                  type="text"
                  placeholder="Ej. BBVA-8392183"
                  value={paymentForm.reference_num}
                  onChange={e => setPaymentForm({ ...paymentForm, reference_num: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7D6F6B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUBIR DOCUMENTO A LA BÓVEDA                       */}
      {/* ======================================================== */}
      {showDocUploadModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl border border-[#EFE8E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#B88A82]" />
                <h3 className="font-serif text-lg font-bold text-[#332A28]">
                  Subir a Bóveda Protegida
                </h3>
              </div>
              <button
                onClick={() => setShowDocUploadModal(false)}
                className="p-1.5 text-[#7D6F6B] hover:text-[#332A28] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Categoría del Documento *
                </label>
                <select
                  value={docUploadCategory}
                  onChange={e => setDocUploadCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                >
                  <option value="CONTRATO_FIRMADO">Contrato Firmado</option>
                  <option value="COMPROBANTE_SPEI">Comprobante de Pago / SPEI</option>
                  <option value="VOBO_DISENO">Propuesta Digital para VoBo</option>
                  <option value="OTRO">Otro Documento</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Seleccionar Archivo (PDF, Imagen) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#7D6F6B] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#9C665C] file:text-[#FFFFFF] hover:file:bg-[#8A574E] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Notas / Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles del archivo o versión..."
                  value={docUploadNotes}
                  onChange={e => setDocUploadNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7D6F6B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile}
                  className="px-5 py-2.5 bg-[#332A28] hover:bg-[#58352F] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  Cargar a Bóveda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR FECHAS LOGÍSTICAS                          */}
      {/* ======================================================== */}
      {showDatesEditModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl border border-[#EFE8E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#B88A82]" />
                <h3 className="font-serif text-lg font-bold text-[#332A28]">
                  Logística de Fechas Críticas
                </h3>
              </div>
              <button
                onClick={() => setShowDatesEditModal(false)}
                className="p-1.5 text-[#7D6F6B] hover:text-[#332A28] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLogisticsDates} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  1. Fecha Límite de Aprobación de Diseño (VoBo)
                </label>
                <input
                  type="date"
                  value={datesForm.vobo_design_deadline}
                  onChange={e => setDatesForm({ ...datesForm, vobo_design_deadline: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  2. Fecha de Entrega de Papelería Física
                </label>
                <input
                  type="date"
                  value={datesForm.physical_delivery_date}
                  onChange={e => setDatesForm({ ...datesForm, physical_delivery_date: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    3. Día de Montaje
                  </label>
                  <input
                    type="date"
                    value={datesForm.stand_setup_date}
                    onChange={e => setDatesForm({ ...datesForm, stand_setup_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Hora de Montaje
                  </label>
                  <input
                    type="time"
                    value={datesForm.stand_setup_time}
                    onChange={e => setDatesForm({ ...datesForm, stand_setup_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDatesEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7D6F6B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Guardar Fechas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR ARTÍCULO EN CATÁLOGO               */}
      {/* ======================================================== */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl border border-[#EFE8E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-[#B88A82]" />
                <h3 className="font-serif text-lg font-bold text-[#332A28]">
                  {editingCatalogItem ? 'Editar Artículo' : 'Nuevo Artículo en Catálogo'}
                </h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 text-[#7D6F6B] hover:text-[#332A28] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Categoría *
                  </label>
                  <select
                    value={catalogForm.category}
                    onChange={e => setCatalogForm({ ...catalogForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  >
                    <option value="PAPELERIA">Papelería Social</option>
                    <option value="STANDS_EXPERIENCIAS">Stands & Experiencias</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Subcategoría
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Invitaciones, Menús, Audio Guestbook"
                    value={catalogForm.subcategory}
                    onChange={e => setCatalogForm({ ...catalogForm, subcategory: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Nombre del Artículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Invitaciones de Algodón Artesanal & Lacre"
                  value={catalogForm.name}
                  onChange={e => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl font-medium text-[#332A28]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Tipo de Cobro *
                  </label>
                  <select
                    value={catalogForm.pricing_type}
                    onChange={e => setCatalogForm({ ...catalogForm, pricing_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  >
                    <option value="PER_PIECE">Por Pieza</option>
                    <option value="FIXED_EVENT">Por Evento (Fijo)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Precio Base ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={catalogForm.base_price}
                    onChange={e => setCatalogForm({ ...catalogForm, base_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                    Mín. Piezas
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={catalogForm.min_pieces}
                    onChange={e => setCatalogForm({ ...catalogForm, min_pieces: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  Descripción & Especificaciones
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles de papel, gramaje, caligrafía, acabados..."
                  value={catalogForm.description}
                  onChange={e => setCatalogForm({ ...catalogForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1">
                  URL de Imagen Inspo
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={catalogForm.image_url}
                  onChange={e => setCatalogForm({ ...catalogForm, image_url: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                {editingCatalogItem ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCatalogItem(editingCatalogItem.id)}
                    className="text-xs text-[#70443D] hover:underline cursor-pointer"
                  >
                    Eliminar Artículo
                  </button>
                ) : <div />}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCatalogModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#7D6F6B]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    Guardar
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
