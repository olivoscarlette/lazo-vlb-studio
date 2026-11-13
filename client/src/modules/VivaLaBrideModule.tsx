import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronDown,
  ArrowRight,
  Upload,
  Eye,
  X,
  Package,
  Layers,
  Percent,
  Check,
  RefreshCw,
  MessageSquare,
  CheckSquare,
  Square,
  ListTodo,
  Tag,
  Truck,
  Link,
  Copy,
  Loader2,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  Maximize2,
  Minimize2,
  RotateCcw,
  Coins
} from 'lucide-react';
import { User } from '../types';
import { VlbFinanceModule } from './VlbFinanceModule';
import {
  VlbCatalogItem,
  VlbCategory,
  VlbPricingType,
  VlbQuote,
  VlbQuoteItem,
  VlbOrder,
  VlbPayment,
  VlbDocument,
  VlbTask
} from '../types/vlb';
import { generateVlbQuotePdf, buildVlbQuotePdf, standardizeEventTime, time12To24, time24To12, VlbContractType, detectContractType, isDeliveryOnlyQuote } from '../utils/vlbPdfGenerator';
import { VlbTimePicker } from '../components/VlbTimePicker';
import { convertHeicToJpeg, optimizeImageFile } from '../utils/heicConverter';

interface VivaLaBrideModuleProps {
  onBackToLazo?: () => void;
  user?: User;
}

export const VivaLaBrideModule: React.FC<VivaLaBrideModuleProps> = ({ onBackToLazo, user }) => {
  // Navigation Tabs: 'quotes' | 'orders' | 'packing' | 'templates' | 'catalog' | 'finances'
  const [activeTab, setActiveTab] = useState<'quotes' | 'orders' | 'catalog' | 'packing' | 'templates' | 'finances'>('quotes');
  const [quoteDiscountPct, setQuoteDiscountPct] = useState<number>(0);
  const [selectedContractType, setSelectedContractType] = useState<VlbContractType>('AUTO');
  const [pdfMenuQuoteId, setPdfMenuQuoteId] = useState<string | null>(null);

  // Packing Checklist State (Día del Evento / Packing al Auto)
  const [selectedPackingOrderId, setSelectedPackingOrderId] = useState<string>('');
  const [packingList, setPackingList] = useState<any[]>([]);
  const [loadingPacking, setLoadingPacking] = useState(false);
  const [newPackingItemName, setNewPackingItemName] = useState('');
  const [newPackingItemCategory, setNewPackingItemCategory] = useState('Mobiliario / Stand');

  // Solo pedidos de Servicios (Stands, Barras, Experiencias o Mixto) que requieren vehículo de carga al Día D
  const serviceOrders = useMemo(() => {
    return orders.filter(o =>
      o.service_type === 'STANDS_EXPERIENCIAS' ||
      o.service_type === 'STANDS' ||
      o.service_type === 'MIXTO'
    );
  }, [orders]);

  // Task Templates State (Lista Maestra de Actividades)
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateFilterCategory, setTemplateFilterCategory] = useState<'PAPELERIA' | 'SERVICIO'>('PAPELERIA');
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'PAPELERIA' | 'SERVICIO'>('PAPELERIA');
  const [newTemplateDays, setNewTemplateDays] = useState<number>(7);
  const [newTemplateTime, setNewTemplateTime] = useState<string>('');
  const [newTemplateNotes, setNewTemplateNotes] = useState<string>('');

  // Editing state for Task Templates
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateForm, setEditingTemplateForm] = useState<{
    title: string;
    days_before_event: number;
    default_time: string;
    notes: string;
  }>({
    title: '',
    days_before_event: 7,
    default_time: '',
    notes: ''
  });

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

  // Modal de Registro Rápido de Evento / Compra Directa desde CRM Parejas
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [directOrderItems, setDirectOrderItems] = useState<{
    id: string;
    catalog_id?: string;
    item_name: string;
    category: 'STANDS_EXPERIENCIAS' | 'PAPELERIA';
    pricing_type?: 'FIXED_EVENT' | 'PER_PIECE';
    quantity: number;
    unit_price: number;
    total_price: number;
  }[]>([]);
  const [newOrderForm, setNewOrderForm] = useState({
    client_name: '',
    partner_name: '',
    client_phone: '',
    client_email: '',
    event_date: new Date().toISOString().split('T')[0],
    event_venue: '',
    service_type: 'MIXTO' as 'PAPELERIA' | 'STANDS' | 'MIXTO',
    total_amount: 0,
    down_payment_required: 0,
    down_payment_covered: false,
    supplies_expense: 0,
    car_provider: 'NINGUNA_EXTERNO',
    external_staff_count: 0,
    external_staff_names: '',
    notes: ''
  });

  // Quote Builder State
  const [quoteForm, setQuoteForm] = useState({
    client_name: '',
    partner_name: '',
    client_email: '',
    client_phone: '',
    event_date: '',
    event_time: '',
    event_venue: '',
    discount: 0,
    down_payment_pct: 50,
    notes: '',
    valid_until: ''
  });
  const [customPaymentMode, setCustomPaymentMode] = useState<'AUTO' | 'FIXED_1000' | 'PERCENT_50'>('AUTO');
  const [quoteItems, setQuoteItems] = useState<VlbQuoteItem[]>([]);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingQuoteFolio, setEditingQuoteFolio] = useState<string | null>(null);

  // Modals
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [savingCatalogItem, setSavingCatalogItem] = useState(false);
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
    subcategory: 'Invitaciones',
    name: '',
    description: '',
    pricing_type: 'PER_PIECE',
    base_price: 100,
    min_pieces: 50,
    image_url: ''
  });

  const [uploadingCatalogImage, setUploadingCatalogImage] = useState(false);
  const [catalogImageError, setCatalogImageError] = useState<string | null>(null);
  const [showManualImageUrl, setShowManualImageUrl] = useState(false);
  const [viewingPhotoItem, setViewingPhotoItem] = useState<VlbCatalogItem | null>(null);
  const [catalogImageFit, setCatalogImageFit] = useState<'contain' | 'cover'>('contain');
  const [isDraggingCatalogImage, setIsDraggingCatalogImage] = useState(false);
  const catalogImageInputRef = useRef<HTMLInputElement>(null);

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

  // Dynamic tasks state for CRM Drawer
  const [showNewTaskRow, setShowNewTaskRow] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'PAPELERIA' | 'SERVICIO'>('SERVICIO');

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
  const loadData = async (showFullSpinner = false) => {
    if (showFullSpinner) setLoading(true);
    try {
      const [catRes, quotesRes, ordersRes, tplRes] = await Promise.all([
        apiFetch('/api/vlb/catalog'),
        apiFetch('/api/vlb/quotes'),
        apiFetch('/api/vlb/orders'),
        apiFetch('/api/vlb/task-templates')
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
        const oList = oData.orders || [];
        setOrders(oList);
        const sList = oList.filter((o: any) => o.service_type === 'STANDS_EXPERIENCIAS' || o.service_type === 'STANDS' || o.service_type === 'MIXTO');
        if (sList.length > 0 && !selectedPackingOrderId) {
          setSelectedPackingOrderId(sList[0].id);
          loadOrderPackingList(sList[0].id);
        }
      }
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTaskTemplates(tplData.templates || []);
      }
    } catch (err: any) {
      console.error('Error loading VLB data:', err);
    } finally {
      if (showFullSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Carga automática del checklist al abrir la pestaña o cambiar de evento seleccionado (exclusivo para eventos de servicios)
  useEffect(() => {
    if (activeTab === 'packing') {
      const sList = orders.filter(o => o.service_type === 'STANDS_EXPERIENCIAS' || o.service_type === 'STANDS' || o.service_type === 'MIXTO');
      if (sList.length > 0) {
        const isCurrentValid = sList.some(o => o.id === selectedPackingOrderId);
        if (!isCurrentValid) {
          setSelectedPackingOrderId(sList[0].id);
          loadOrderPackingList(sList[0].id);
        } else if (selectedPackingOrderId) {
          loadOrderPackingList(selectedPackingOrderId);
        }
      } else {
        setSelectedPackingOrderId('');
        setPackingList([]);
      }
    }
  }, [activeTab, selectedPackingOrderId, orders]);

  // Cierre Inteligente: Cerrar cualquier modal o drawer activo al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingPhotoItem) {
          setViewingPhotoItem(null);
        } else if (showNewOrderModal) {
          setShowNewOrderModal(false);
        } else if (showPaymentModal) {
          setShowPaymentModal(false);
        } else if (showDocUploadModal) {
          setShowDocUploadModal(false);
        } else if (showDatesEditModal) {
          setShowDatesEditModal(false);
        } else if (showCatalogModal) {
          setShowCatalogModal(false);
        } else if (selectedOrder) {
          setSelectedOrder(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewingPhotoItem,
    showNewOrderModal,
    showPaymentModal,
    showDocUploadModal,
    showDatesEditModal,
    showCatalogModal,
    selectedOrder
  ]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopyProposalLink = (quoteId: string) => {
    const cacheBuster = Date.now().toString(36);
    const url = `${window.location.origin}/vlb/propuesta/${quoteId}?v=${cacheBuster}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast(`¡Liga copiada al portapapeles! (${url})`);
    } else {
      prompt('Copia este enlace para enviarlo a los novios:', url);
    }
  };

  // ----------------------------------------
  // TASK TEMPLATES ACTIONS (LISTA MAESTRA DE ACTIVIDADES)
  // ----------------------------------------
  const loadTaskTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await apiFetch('/api/vlb/task-templates');
      if (res.ok) {
        const data = await res.json();
        setTaskTemplates(data.templates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleAddMasterTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim()) {
      showToast('Ingresa el título de la actividad.', 'error');
      return;
    }
    try {
      const res = await apiFetch('/api/vlb/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newTemplateCategory,
          title: newTemplateTitle.trim(),
          days_before_event: newTemplateDays,
          default_time: newTemplateTime,
          notes: newTemplateNotes.trim()
        })
      });
      if (!res.ok) throw new Error('Error al guardar actividad maestra.');
      showToast('Actividad agregada a la plantilla maestra.');
      setNewTemplateTitle('');
      setNewTemplateNotes('');
      loadTaskTemplates();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const startEditTemplate = (t: any) => {
    setEditingTemplateId(t.id);
    setEditingTemplateForm({
      title: t.title,
      days_before_event: Number(t.days_before_event) || 0,
      default_time: t.default_time || '',
      notes: t.notes || ''
    });
  };

  const handleSaveEditTemplate = async (id: string) => {
    if (!editingTemplateForm.title.trim()) {
      showToast('Ingresa el título de la actividad.', 'error');
      return;
    }
    try {
      const res = await apiFetch(`/api/vlb/task-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTemplateForm.title.trim(),
          days_before_event: editingTemplateForm.days_before_event,
          default_time: editingTemplateForm.default_time,
          notes: editingTemplateForm.notes.trim()
        })
      });
      if (!res.ok) throw new Error('Error al actualizar actividad maestra.');
      showToast('Actividad maestra actualizada con éxito.');
      setEditingTemplateId(null);
      loadTaskTemplates();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteMasterTemplate = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar esta actividad de la plantilla maestra?')) return;
    try {
      const res = await apiFetch(`/api/vlb/task-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      showToast('Actividad eliminada de la plantilla maestra.');
      loadTaskTemplates();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleApplyTemplatesToOrder = async (orderId: string) => {
    if (!window.confirm('¿Deseas recalcular y sincronizar las actividades de este proyecto según tus plantillas maestras?')) return;
    try {
      const res = await apiFetch(`/api/vlb/orders/${orderId}/apply-templates`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al sincronizar actividades.');
      const data = await res.json();
      showToast(data.message || 'Actividades sincronizadas.');
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await apiFetch(`/api/vlb/orders/${orderId}`);
        if (updated.ok) {
          const uData = await updated.json();
          setSelectedOrder(uData.order);
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ----------------------------------------
  // PACKING CHECKLIST ACTIONS (DÍA DEL EVENTO)
  // ----------------------------------------
  const loadOrderPackingList = async (orderId: string, forceRegenerate = false) => {
    if (!orderId) return;
    setLoadingPacking(true);
    try {
      const url = forceRegenerate
        ? `/api/vlb/orders/${orderId}/packing-list?regenerate=true`
        : `/api/vlb/orders/${orderId}/packing-list`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = data.packingList || data.packing_list || [];
        setPackingList(list.map((it: any) => ({
          ...it,
          name: it.name || it.item_name || 'Elemento',
          item_name: it.item_name || it.name || 'Elemento'
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPacking(false);
    }
  };

  const handleTogglePackingItem = async (itemId: string, packed: boolean) => {
    const updated = packingList.map(it => it.id === itemId ? { ...it, packed } : it);
    setPackingList(updated);
    if (!selectedPackingOrderId) return;
    try {
      await apiFetch(`/api/vlb/orders/${selectedPackingOrderId}/packing-list`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packing_list: updated, packingList: updated })
      });
    } catch (err) {
      console.error('Error auto-saving packing status:', err);
    }
  };

  const handleDeletePackingItem = async (itemId: string) => {
    const updated = packingList.filter(it => it.id !== itemId);
    setPackingList(updated);
    if (!selectedPackingOrderId) return;
    try {
      await apiFetch(`/api/vlb/orders/${selectedPackingOrderId}/packing-list`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packing_list: updated, packingList: updated })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackingItemName.trim()) return;
    const itemName = newPackingItemName.trim();
    const newItem = {
      id: `custom_${Date.now()}`,
      category: newPackingItemCategory,
      name: itemName,
      item_name: itemName,
      notes: 'Elemento añadido manualmente',
      packed: false
    };
    const updated = [...packingList, newItem];
    setPackingList(updated);
    setNewPackingItemName('');
    if (!selectedPackingOrderId) return;
    try {
      await apiFetch(`/api/vlb/orders/${selectedPackingOrderId}/packing-list`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packing_list: updated, packingList: updated })
      });
      showToast('Elemento agregado a la lista de carga.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPackingList = async () => {
    if (!selectedPackingOrderId) return;
    if (packingList.length === 0) {
      await loadOrderPackingList(selectedPackingOrderId, true);
      showToast('Checklist generado con el material del pedido y kit del auto.');
      return;
    }
    if (!window.confirm('¿Reiniciar todos los elementos como NO subidos al vehículo (0%)?')) return;
    const updated = packingList.map(it => ({ ...it, packed: false }));
    setPackingList(updated);
    try {
      await apiFetch(`/api/vlb/orders/${selectedPackingOrderId}/packing-list`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packing_list: updated, packingList: updated })
      });
      showToast('Checklist reiniciado a 0% para el evento.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegeneratePackingList = async () => {
    if (!selectedPackingOrderId) return;
    if (packingList.length > 0 && !window.confirm('¿Deseas restaurar la lista inteligente original del auto con el material contratado y kit indispensable?')) {
      return;
    }
    await loadOrderPackingList(selectedPackingOrderId, true);
    showToast('Checklist de carga generado exitosamente ✨');
  };

  // ----------------------------------------
  // CATALOG ACTIONS
  // ----------------------------------------
  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCatalogItem || uploadingCatalogImage) return;

    setSavingCatalogItem(true);
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
      loadData(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingCatalogItem(false);
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este artículo del catálogo de Viva la Bride?')) return;
    try {
      const res = await apiFetch(`/api/vlb/catalog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar artículo.');
      showToast('Artículo eliminado.');
      loadData(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const processCatalogImageFile = async (rawFile: File) => {
    if (!rawFile) return;

    setUploadingCatalogImage(true);
    setCatalogImageError(null);

    try {
      // Optimizar imagen: convertir HEIC si aplica y comprimir a dimensiones ligeras web
      const file = await optimizeImageFile(rawFile);

      if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|gif|avif|heic|heif)$/i)) {
        setCatalogImageError('Por favor selecciona o arrastra un archivo de imagen válido (JPG, PNG, WEBP, HEIC, etc.)');
        setUploadingCatalogImage(false);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setCatalogImageError('La imagen excede el límite de 25MB.');
        setUploadingCatalogImage(false);
        return;
      }

      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch('/api/vlb/catalog/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fd
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al subir la imagen');
      }

      setCatalogForm(prev => ({
        ...prev,
        image_url: data.imageUrl
      }));
      showToast('Foto cargada y optimizada exitosamente ✨');
    } catch (err: any) {
      setCatalogImageError(err.message || 'Error al subir la imagen');
      showToast(err.message || 'Error al subir la imagen', 'error');
    } finally {
      setUploadingCatalogImage(false);
    }
  };

  const handleUploadCatalogImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (rawFile) {
      await processCatalogImageFile(rawFile);
    }
    if (e.target) e.target.value = '';
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
  const quoteDiscountAmount = (quoteSubtotal * (Number(quoteDiscountPct) || 0)) / 100;
  const quoteTotal = Math.max(0, quoteSubtotal - quoteDiscountAmount);

  // Cálculo dinámico del Folio oficial acordado: VLB-AÑO-MESNUMEROCONSECUTIVO (e.g. VLB-26-1101)
  const now = new Date();
  const yearShort = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `VLB-${yearShort}-${month}`;
  const currentMonthQuotes = quotes.filter(q => q.quote_number?.startsWith(monthPrefix));
  let maxConsecutive = 0;
  for (const q of currentMonthQuotes) {
    const match = q.quote_number?.match(/^VLB-\d{2}-\d{2}(\d{2,})$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxConsecutive) maxConsecutive = num;
    }
  }
  const currentPreviewFolio = `${monthPrefix}${String(maxConsecutive + 1).padStart(2, '0')}`;

  // Reglas de negocio Viva la Bride: Selección Inteligente con opción de alternar
  // - Si la propuesta incluye algún Servicio o Stand: separación fija de $1,000 (saldo se liquida 10 días antes del evento).
  // - Si es únicamente Papelería Social: anticipo del 50% (saldo se liquida al entregar o programar envío).
  const stationeryItems = quoteItems.filter(i => i.category === 'PAPELERIA');
  const servicesItems = quoteItems.filter(i => i.category === 'STANDS_EXPERIENCIAS' || i.category === 'SERVICIOS_DIGITALES');
  const autoHasServices = servicesItems.length > 0 || quoteItems.some(i => i.pricing_type === 'FIXED_EVENT');

  const isServiceQuote = customPaymentMode === 'AUTO'
    ? autoHasServices
    : (customPaymentMode === 'FIXED_1000');

  let quoteDownPayment = 0;
  if (isServiceQuote) {
    quoteDownPayment = Math.min(1000, quoteTotal);
  } else {
    quoteDownPayment = Math.round(quoteTotal * 0.5);
  }
  const quoteBalanceDue = Math.max(0, quoteTotal - quoteDownPayment);

  const detectedContract = useMemo(() => {
    return detectContractType(quoteItems, { quote_number: currentPreviewFolio } as any);
  }, [quoteItems, currentPreviewFolio]);

  const isDeliveryOnly = useMemo(() => {
    return isDeliveryOnlyQuote(quoteItems, { quote_number: currentPreviewFolio } as any);
  }, [quoteItems, currentPreviewFolio]);

  const contractDisplayNames: Record<string, string> = {
    AUTO: 'Automático',
    SNACKS: 'Snacks, Favores & Cajas',
    STANDS: 'Stands Decorativos & Ambientación',
    MEMORIAL: 'Memorial Wall Conmemorativo',
    DRINKS: 'Beer & Mimosa Stands',
    PAPELERIA: 'Papelería Social Atelier',
    COMBO: 'Atelier & Experiencias (Mixto)'
  };

  const handleSaveQuote = async (status: 'BORRADOR' | 'ENVIADA' = 'BORRADOR') => {
    if (!quoteForm.client_name.trim()) {
      showToast('Por favor ingresa el nombre de la clienta o pareja.', 'error');
      return;
    }
    if (!quoteForm.client_phone.trim()) {
      showToast('El teléfono WhatsApp de la novia es obligatorio.', 'error');
      return;
    }
    if (quoteItems.length === 0) {
      showToast('Agrega al menos un artículo a la cotización.', 'error');
      return;
    }

    try {
      const endpoint = editingQuoteId ? `/api/vlb/quotes/${editingQuoteId}` : '/api/vlb/quotes';
      const method = editingQuoteId ? 'PUT' : 'POST';
      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quoteForm,
          event_time: standardizeEventTime(quoteForm.event_time),
          quote_number: editingQuoteFolio || undefined,
          discount: quoteDiscountAmount,
          contract_type: selectedContractType,
          down_payment_pct: quoteTotal > 0 ? Math.round((quoteDownPayment / quoteTotal) * 100) : 50,
          down_payment_amount: quoteDownPayment,
          balance_due: quoteBalanceDue,
          items: quoteItems
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar cotización.');
      }

      const data = await res.json();
      const savedFolio = editingQuoteFolio || data.quote?.quote_number || 'guardada';
      showToast(editingQuoteId ? `Cotización ${savedFolio} actualizada con éxito.` : `Cotización ${savedFolio} generada con éxito.`);
      resetQuoteForm();
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEditQuote = async (q: VlbQuote) => {
    try {
      const res = await apiFetch(`/api/vlb/quotes/${q.id}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Error al cargar datos de la cotización.');
      }
      const data = await res.json();
      const quoteData: VlbQuote = data.quote || q;
      const quoteItemsData: VlbQuoteItem[] = data.items || [];

      setEditingQuoteId(quoteData.id);
      setEditingQuoteFolio(quoteData.quote_number);

      setQuoteForm({
        client_name: quoteData.client_name || '',
        partner_name: quoteData.partner_name || '',
        client_email: quoteData.client_email || '',
        client_phone: quoteData.client_phone || '',
        event_date: quoteData.event_date || '',
        event_time: quoteData.event_time || '',
        event_venue: quoteData.event_venue || '',
        discount: Number(quoteData.discount) || 0,
        down_payment_pct: Number(quoteData.down_payment_pct) || 50,
        notes: quoteData.notes || '',
        valid_until: quoteData.valid_until || ''
      });

      setQuoteItems(quoteItemsData);

      const qSub = Number(quoteData.subtotal) || quoteItemsData.reduce((acc, i) => acc + (i.total_price || 0), 0);
      const qDisc = Number(quoteData.discount) || (qSub > Number(quoteData.total) ? qSub - Number(quoteData.total) : 0);
      if (qSub > 0 && qDisc > 0) {
        const pct = Math.round((qDisc / qSub) * 1000) / 10;
        setQuoteDiscountPct(pct);
      } else {
        setQuoteDiscountPct(0);
      }

      if ((quoteData as any).contract_type) {
        setSelectedContractType((quoteData as any).contract_type);
      } else {
        setSelectedContractType('AUTO');
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Cargada cotización ${quoteData.quote_number} para edición.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const resetQuoteForm = () => {
    setEditingQuoteId(null);
    setEditingQuoteFolio(null);
    setQuoteDiscountPct(0);
    setSelectedContractType('AUTO');
    setQuoteForm({
      client_name: '',
      partner_name: '',
      client_email: '',
      client_phone: '',
      event_date: '',
      event_time: '',
      event_venue: '',
      discount: 0,
      down_payment_pct: 50,
      notes: '',
      valid_until: ''
    });
    setQuoteItems([]);
  };

  const handleCancelEditQuote = () => {
    resetQuoteForm();
    showToast('Edición cancelada.');
  };

  const handleExportPdfCurrent = async (includeContract = true) => {
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
      quote_number: currentPreviewFolio,
      client_name: quoteForm.client_name,
      partner_name: quoteForm.partner_name,
      client_email: quoteForm.client_email,
      client_phone: quoteForm.client_phone,
      event_date: quoteForm.event_date,
      event_time: standardizeEventTime(quoteForm.event_time),
      event_venue: quoteForm.event_venue,
      status: 'BORRADOR',
      subtotal: quoteSubtotal,
      discount: quoteDiscountAmount,
      total: quoteTotal,
      down_payment_pct: Number(quoteForm.down_payment_pct) || 50,
      down_payment_amount: quoteDownPayment,
      balance_due: quoteBalanceDue,
      valid_until: quoteForm.valid_until,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const effectiveContract = selectedContractType === 'AUTO' ? detectedContract : selectedContractType;
    await generateVlbQuotePdf(mockQuote, quoteItems, {
      contractType: effectiveContract,
      includeContract
    });
    showToast(includeContract ? '¡Cotización con Contrato descargada!' : '¡Cotización descargada (1 pág)!');
  };

  const handleExportSavedQuotePdf = async (quote: VlbQuote, includeContract = true) => {
    try {
      let targetQuote = quote;
      let targetItems: VlbQuoteItem[] = [];

      try {
        const quoteKey = quote.id || quote.quote_number;
        const res = await apiFetch(`/api/vlb/quotes/${quoteKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.quote) targetQuote = { ...quote, ...data.quote };
          if (data.items && Array.isArray(data.items)) targetItems = data.items;
        } else {
          // Intentar ruta pública sin requerir token en caso de fallo
          const pubRes = await fetch(`/api/vlb/quotes/public/${quoteKey}`);
          if (pubRes.ok) {
            const pubData = await pubRes.json();
            if (pubData.quote) targetQuote = { ...quote, ...pubData.quote };
            if (pubData.items && Array.isArray(pubData.items)) targetItems = pubData.items;
          }
        }
      } catch (fetchErr) {
        console.warn('Could not fetch remote quote details, generating with local quote data:', fetchErr);
      }

      // Regla de negocio estricta: Stands = $1,000 fijo, Papelería = 50%
      const isService = targetQuote.quote_number?.startsWith('SV-') || targetItems.some(i => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT');
      const downPaymentRequired = isService ? Math.min(1000, targetQuote.total) : Math.round(targetQuote.total * 0.5);

      await generateVlbQuotePdf({
        ...targetQuote,
        down_payment_amount: downPaymentRequired
      }, targetItems, {
        contractType: (targetQuote as any).contract_type,
        includeContract
      });
      showToast(`Cotización ${quote.quote_number} exportada (${includeContract ? 'con contrato' : 'solo cotización'}).`);
    } catch (err: any) {
      showToast(err.message || 'Error al exportar cotización', 'error');
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

  const handleDeleteQuote = async (quoteId: string, quoteNumber?: string) => {
    if (!window.confirm(`¿Estás segura de eliminar la cotización ${quoteNumber || ''}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await apiFetch(`/api/vlb/quotes/${quoteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar cotización.');
      showToast('Cotización eliminada correctamente.');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteOrder = async (orderId: string, clientName?: string) => {
    if (!window.confirm(`¿Estás segura de eliminar el proyecto de ${clientName || 'esta pareja'}? Se eliminará de la lista, pagos y logística.`)) return;
    try {
      const res = await apiFetch(`/api/vlb/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar proyecto.');
      showToast('Proyecto eliminado correctamente.');
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('¿Deseas eliminar este registro de pago? Los saldos se recalcularán automáticamente.')) return;
    try {
      const res = await apiFetch(`/api/vlb/payments/${paymentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar el pago.');
      showToast('Pago eliminado y saldos recalculados.');
      if (selectedOrder) {
        handleOpenOrderDrawer(selectedOrder);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('¿Deseas eliminar este documento?')) return;
    try {
      const res = await apiFetch(`/api/vlb/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar el documento.');
      showToast('Documento eliminado.');
      if (selectedOrder) {
        handleOpenOrderDrawer(selectedOrder);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ----------------------------------------
  // WHATSAPP DIRECT INTEGRATION (SIN API)
  // ----------------------------------------
  const openWhatsAppMessage = (phone: string, text: string) => {
    if (!phone || !phone.trim()) {
      showToast('No se encontró teléfono para enviar WhatsApp.', 'error');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text.trim())}`;
    window.open(url, '_blank');
  };

  const handleSendQuoteWhatsApp = async (quote: VlbQuote | null, items?: VlbQuoteItem[]) => {
    let targetQuote = quote;
    let activeItems = items;

    // Si viene de una cotización guardada y no tenemos los artículos, cargarlos de la API
    if (quote?.id && (!activeItems || activeItems.length === 0)) {
      try {
        const res = await apiFetch(`/api/vlb/quotes/${quote.id}`);
        if (res.ok) {
          const data = await res.json();
          targetQuote = data.quote;
          activeItems = data.items;
        }
      } catch (e) {
        console.warn('Error fetching quote items for whatsapp:', e);
      }
    }

    const isCurrent = !targetQuote;
    activeItems = activeItems || (isCurrent ? quoteItems : []);

    const clientName = isCurrent ? quoteForm.client_name : targetQuote!.client_name;
    const partnerName = isCurrent ? quoteForm.partner_name : targetQuote!.partner_name;
    const phone = isCurrent ? quoteForm.client_phone : targetQuote!.client_phone;
    const eventDate = isCurrent ? formatDateMX(quoteForm.event_date) : formatDateMX(targetQuote!.event_date);
    const eventVenue = isCurrent ? quoteForm.event_venue : targetQuote!.event_venue;
    const total = isCurrent ? quoteTotal : targetQuote!.total;

    // Regla estricta de Stands ($1,000 separación) vs Papelería (50% anticipo)
    const hasStands = activeItems.some(i => i.category === 'STANDS_EXPERIENCIAS' || i.pricing_type === 'FIXED_EVENT') || (targetQuote?.quote_number?.startsWith('SV-') ?? false);
    const downPayment = hasStands ? Math.min(1000, total) : Math.round(total * 0.5);
    const balance = Math.max(0, total - downPayment);
    const folio = isCurrent ? currentPreviewFolio : targetQuote!.quote_number;

    if (!phone || !phone.trim()) {
      showToast('Por favor captura el WhatsApp de la clienta en el formulario.', 'error');
      return;
    }

    const couple = [clientName, partnerName].filter(Boolean).join(' & ');

    // Construir el objeto de cotización completo para el PDF
    const finalQuote: VlbQuote = targetQuote || {
      id: 'preview_' + Date.now(),
      quote_number: currentPreviewFolio,
      client_name: clientName || 'Novia',
      partner_name: partnerName,
      client_email: isCurrent ? quoteForm.client_email : targetQuote!.client_email,
      client_phone: phone,
      event_date: isCurrent ? quoteForm.event_date : targetQuote!.event_date,
      event_time: standardizeEventTime(isCurrent ? quoteForm.event_time : targetQuote!.event_time),
      event_venue: eventVenue,
      status: 'BORRADOR',
      subtotal: isCurrent ? quoteSubtotal : targetQuote!.subtotal,
      discount: isCurrent ? quoteDiscountAmount : targetQuote!.discount,
      total: total,
      down_payment_pct: hasStands ? (total > 0 ? Math.round((downPayment / total) * 100) : 50) : 50,
      down_payment_amount: downPayment,
      balance_due: balance,
      valid_until: isCurrent ? quoteForm.valid_until : targetQuote!.valid_until,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Generar el archivo PDF en memoria
    const effectiveContract = isCurrent
      ? (selectedContractType === 'AUTO' ? detectedContract : selectedContractType)
      : (targetQuote as any)?.contract_type;
    const { file, fileName } = await buildVlbQuotePdf(finalQuote, activeItems, {
      autoDownload: false,
      contractType: effectiveContract
    });

    // Subir el PDF al servidor para link directo si la cotización ya existe en base de datos
    let pdfDirectUrl = '';
    if (finalQuote?.id && !finalQuote.id.startsWith('preview_')) {
      try {
        const formData = new FormData();
        formData.append('file', file, fileName);
        await apiFetch(`/api/vlb/quotes/public/${finalQuote.id}/pdf`, {
          method: 'POST',
          body: formData
        });
        pdfDirectUrl = `${window.location.origin}/api/vlb/quotes/public/${finalQuote.id}/${encodeURIComponent(fileName)}`;
      } catch (e) {
        console.warn('PDF upload warning:', e);
      }
    }

    const cacheBuster = Date.now().toString(36);
    const proposalUrl = (finalQuote?.id && !finalQuote.id.startsWith('preview_'))
      ? `${window.location.origin}/vlb/propuesta/${finalQuote.id}?v=${cacheBuster}`
      : '';

    const directPdfText = pdfDirectUrl ? `\n📎 *Descargar archivo PDF oficial:* ${pdfDirectUrl}` : '';
    const proposalLinkText = proposalUrl ? `\n✍️ *Revisar propuesta y firmar en línea:* ${proposalUrl}` : '';

    const isQuoteDeliveryOnly = isDeliveryOnlyQuote(activeItems, finalQuote);

    const paymentConditionText = hasStands
      ? '• *Stands & Servicios:* Separación fija de $1,000 MXN; el saldo se liquida 10 días antes del evento.'
      : '• *Papelería & Favores:* 50% de anticipo; el saldo se liquida al entregar el pedido o programar envío.';

    const eventTime = standardizeEventTime(isCurrent ? quoteForm.event_time : targetQuote!.event_time);

    const logisticsInfo = isQuoteDeliveryOnly
      ? `📅 *Día de Entrega:* ${eventDate || 'Por definir'}\n📍 *Lugar de Entrega:* ${eventVenue || 'Por definir'}`
      : `📅 *Fecha del Evento:* ${eventDate || 'Por definir'}\n⏰ *Horario:* ${eventTime}\n🏛️ *Sede:* ${eventVenue || 'Por definir'}`;

    const msg = `¡Hola ${clientName || 'Novia'}! ✨ Te comparto tu *Cotización Oficial en PDF* de *Viva la Bride* (*${folio}*):\n\n💍 *Pareja:* ${couple || 'Novios'}\n${logisticsInfo}\n\n💳 *Total Contratado:* $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN\n✨ *${hasStands ? 'Separación Requerida' : 'Anticipo (50%)'}:* $${downPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN\n🏷️ *Saldo Pendiente:* $${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN${directPdfText}${proposalLinkText}\n\n*Condición de Pago:*\n${paymentConditionText}\n\n¡Quedo a tus órdenes para resolver cualquier duda o agendar tu sesión de diseño! 🤍`;

    // 1. INTENTO DE ENVÍO DIRECTO DEL ARCHIVO PDF VÍA WEB SHARE (Móviles & Mac Safari)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Cotización ${folio} · Viva la Bride`,
          text: msg
        });
        showToast('¡Archivo PDF compartido exitosamente por WhatsApp!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Cancelado por el usuario
        console.warn('Fallback standard WhatsApp:', err);
      }
    }

    // 2. EN ESCRITORIO / NAVEGADORES SIN WEB SHARE DE ARCHIVOS:
    // Descarga el PDF automáticamente y abre WhatsApp Web para arrastrar o enviar con el link directo
    try {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Direct file download error:', e);
    }
    showToast(`📄 Se descargó "${fileName}". Arrástralo a WhatsApp Web para enviarlo como documento.`);
    openWhatsAppMessage(phone, msg);
  };

  const handleSendOrderWhatsApp = (order: VlbOrder, type: 'anticipo' | 'vobo' | 'saldo' | 'contrato' | 'general') => {
    if (!order.client_phone) {
      showToast('Este pedido no tiene número de teléfono registrado.', 'error');
      return;
    }
    let text = '';
    const folioStr = formatOrderFolio(order.order_number);
    const eventDateStr = formatDateMX(order.event_date);
    if (type === 'contrato') {
      const cacheBuster = Date.now().toString(36);
      const proposalLink = `${window.location.origin}/vlb/propuesta/${order.quote_id || order.id}?v=${cacheBuster}`;
      text = `¡Hola ${order.client_name}! ✨ Te saluda Vivi de *Viva la Bride*.\n\n¡Tu anticipo / separación para tu evento del ${eventDateStr} ha sido acreditado con éxito! 🎉💍\n\nTe comparto tu *Liga Oficial de Contrato y Pagos en Vivo*:\n🔗 ${proposalLink}\n\nEn este enlace podrás:\n1. Revisar tu contrato formal y condiciones de tu servicio.\n2. Asentar tu firma digital formal.\n3. Monitorear tu estado de cuenta con cada abono registrado.\n\n¡Quedo a tus órdenes para cualquier duda! 🤍`;
    } else if (type === 'anticipo') {
      text = `¡Hola ${order.client_name}! ✨ Te saluda Vivi de *Viva la Bride*.\n\nQueremos confirmar tu proyecto con folio *${folioStr}* para su gran día. 💍\n\nPara apartar formalmente tu fecha en el taller de imprenta y asegurar el mobiliario, te recordamos que el anticipo es del 50%:\n💳 *Anticipo Requerido:* $${(order.total_amount * 0.5).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN.\n\nEn cuanto realices tu transferencia, por favor envíanos tu comprobante por aquí para agendar tu primera muestra personalizada. ¡Muchas gracias! 🌸`;
    } else if (type === 'vobo') {
      text = `¡Hola ${order.client_name}! 💌 Te saluda Vivi de *Viva la Bride*.\n\n¡El diseño de tu papelería / proyecto *${folioStr}* está listo para revisión!\nPor favor confírmanos tu VoBo (Visto Bueno) de ortografía, fechas y nombres para proceder al taller de impresión y sellado en lacre. ✨\n\n¡Quedamos atentas a tus comentarios!`;
    } else if (type === 'saldo') {
      const balanceAmount = order.balance_pending || Math.max(0, order.total_amount - (order.total_paid || 0));
      text = `¡Hola ${order.client_name}! 🥂 Te saluda Vivi de *Viva la Bride*.\n\nTu pedido *${folioStr}* está casi listo para entrega / montaje para el evento del ${eventDateStr}.\n\nTe compartimos el recordatorio del saldo pendiente:\n🏷️ *Saldo Final:* $${balanceAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN.\n\n¡Muchísimas gracias y estamos muy emocionadas de ser parte de su gran día! 🤍`;
    } else {
      text = `¡Hola ${order.client_name}! ✨ Te saluda Vivi de *Viva la Bride*. Me pongo en contacto contigo sobre tu proyecto *${folioStr}*. ¿Cómo estás?`;
    }
    openWhatsAppMessage(order.client_phone, text);
  };

  // ----------------------------------------
  // FORMATTERS: FECHAS MX, FOLIOS & CATEGORÍAS
  // ----------------------------------------
  const formatDateMX = (dateStr?: string | null): string => {
    if (!dateStr) return 'Por definir';
    const clean = dateStr.trim();
    const parts = clean.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthIdx = parseInt(month, 10) - 1;
      const monthName = months[monthIdx] || month;
      const rest = clean.includes('a las') ? ' ' + clean.substring(clean.indexOf('a las')) : '';
      return `${parseInt(day, 10)} ${monthName} ${year}${rest}`;
    }
    return dateStr;
  };

  const getServiceLabel = (serviceType?: string): string => {
    if (serviceType === 'STANDS_EXPERIENCIAS') return 'Stand bienvenida';
    if (serviceType === 'MIXTO') return 'Papelería + Stand';
    return 'Papelería social';
  };

  const formatOrderFolio = (folio?: string): string => {
    if (!folio) return 'VLB-001';
    return folio.replace(/^ORD-VLB-\d{4}-/, 'VLB-').replace(/^ORD-VLB-/, 'VLB-');
  };

  const getOrderTasks = (order: VlbOrder): VlbTask[] => {
    if (order.tasks && order.tasks.length > 0) return order.tasks;
    const evt = order.event_date ? new Date(order.event_date).getTime() : Date.now();
    const defTasks: VlbTask[] = [];
    const sType = order.service_type || 'PAPELERIA';
    if (sType === 'PAPELERIA' || sType === 'MIXTO') {
      defTasks.push({
        id: 't_vobo_' + order.id,
        title: 'Aprobación de Diseño Digital (VoBo)',
        due_date: order.vobo_design_deadline || new Date(evt - 21 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'PAPELERIA',
        notes: 'Límite previo a imprenta'
      });
      defTasks.push({
        id: 't_entrega_' + order.id,
        title: 'Entrega Física de Papelería',
        due_date: order.physical_delivery_date || new Date(evt - 5 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'PAPELERIA',
        notes: 'En atelier o envío a domicilio'
      });
    }
    if (sType === 'STANDS_EXPERIENCIAS' || sType === 'MIXTO') {
      defTasks.push({
        id: 't_insumos_' + order.id,
        title: 'Compra de bebidas e insumos',
        due_date: new Date(evt - 7 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'SERVICIO',
        notes: 'Licores, jarabes, botánicos o cristalería'
      });
      defTasks.push({
        id: 't_vinil_' + order.id,
        title: 'Armado e impresión de vinil',
        due_date: new Date(evt - 4 * 86400000).toISOString().split('T')[0],
        completed: false,
        category: 'SERVICIO',
        notes: 'Barras, letreros o copas'
      });
      defTasks.push({
        id: 't_montaje_' + order.id,
        title: 'Montaje de Stands en el Venue',
        due_date: order.stand_setup_date || order.event_date,
        due_time: order.stand_setup_time || '14:00',
        completed: false,
        category: 'SERVICIO',
        notes: 'Welcome Drinks, Audio Guestbook, Seating'
      });
    }
    return defTasks;
  };

  // ----------------------------------------
  // CRM ORDERS & DIRECT EVENT REGISTRATION
  // ----------------------------------------
  const addCatalogItemToDirectOrder = (item: VlbCatalogItem) => {
    const existingIndex = directOrderItems.findIndex(i => i.catalog_id === item.id);
    if (existingIndex >= 0) {
      const updated = [...directOrderItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setDirectOrderItems(updated);
      showToast(`Cantidad incrementada para "${item.name}".`);
    } else {
      const initialQty = item.pricing_type === 'FIXED_EVENT' ? 1 : Math.max(1, item.min_pieces || 1);
      const newItem = {
        id: 'dir_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        catalog_id: item.id,
        category: item.category,
        item_name: item.name,
        pricing_type: item.pricing_type,
        quantity: initialQty,
        unit_price: item.base_price,
        total_price: initialQty * item.base_price
      };
      setDirectOrderItems([...directOrderItems, newItem]);
      showToast(`"${item.name}" agregado a los servicios.`);
    }
  };

  const addPresetDirectItem = (
    name: string,
    category: 'STANDS_EXPERIENCIAS' | 'PAPELERIA',
    price: number,
    qty = 1,
    pricingType: 'FIXED_EVENT' | 'PER_PIECE' = 'FIXED_EVENT'
  ) => {
    const newItem = {
      id: 'dir_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      item_name: name,
      category,
      pricing_type: pricingType,
      quantity: qty,
      unit_price: price,
      total_price: qty * price
    };
    setDirectOrderItems([...directOrderItems, newItem]);
    showToast(`"${name}" agregado.`);
  };

  const updateDirectItemQty = (index: number, newQty: number) => {
    const updated = [...directOrderItems];
    const qty = Math.max(1, newQty);
    updated[index].quantity = qty;
    updated[index].total_price = qty * updated[index].unit_price;
    setDirectOrderItems(updated);
  };

  const updateDirectItemPrice = (index: number, newPrice: number) => {
    const updated = [...directOrderItems];
    const price = Math.max(0, newPrice);
    updated[index].unit_price = price;
    updated[index].total_price = updated[index].quantity * price;
    setDirectOrderItems(updated);
  };

  const updateDirectItemName = (index: number, newName: string) => {
    const updated = [...directOrderItems];
    updated[index].item_name = newName;
    setDirectOrderItems(updated);
  };

  const updateDirectItemCategory = (index: number, newCat: 'STANDS_EXPERIENCIAS' | 'PAPELERIA') => {
    const updated = [...directOrderItems];
    updated[index].category = newCat;
    setDirectOrderItems(updated);
  };

  const removeDirectItem = (index: number) => {
    setDirectOrderItems(directOrderItems.filter((_, i) => i !== index));
  };

  const directStandsTotal = directOrderItems
    .filter(i => i.category === 'STANDS_EXPERIENCIAS')
    .reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
  const directStationeryTotal = directOrderItems
    .filter(i => i.category === 'PAPELERIA')
    .reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
  const directItemsTotal = directStandsTotal + directStationeryTotal;
  const effectiveDirectTotal = directOrderItems.length > 0 ? directItemsTotal : (newOrderForm.total_amount || 0);
  const effectiveDownPayment = directOrderItems.length > 0
    ? Math.round(directItemsTotal * 0.5 * 100) / 100
    : (newOrderForm.down_payment_required || Math.round(effectiveDirectTotal * 0.5 * 100) / 100);

  const handleCreateDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.client_name.trim()) {
      showToast('El nombre de la clienta es requerido.', 'error');
      return;
    }
    if (!newOrderForm.event_date) {
      showToast('La fecha del evento es requerida.', 'error');
      return;
    }

    const standsSum = directStandsTotal;
    const stationerySum = directStationeryTotal;
    const finalTotal = effectiveDirectTotal;

    let finalServiceType = newOrderForm.service_type;
    if (directOrderItems.length > 0) {
      if (standsSum > 0 && stationerySum > 0) finalServiceType = 'MIXTO';
      else if (standsSum > 0) finalServiceType = 'STANDS';
      else if (stationerySum > 0) finalServiceType = 'PAPELERIA';
    }

    const payload = {
      ...newOrderForm,
      service_type: finalServiceType,
      total_amount: finalTotal,
      down_payment_required: effectiveDownPayment,
      stands_amount: standsSum,
      stationery_amount: stationerySum,
      items: directOrderItems
    };

    try {
      setLoading(true);
      const res = await apiFetch('/api/vlb/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al registrar pedido.');
      }
      showToast('¡Evento registrado exitosamente! Sincronizado en Nómina & Reparto ✨', 'success');
      setShowNewOrderModal(false);
      setDirectOrderItems([]);
      setNewOrderForm({
        client_name: '',
        partner_name: '',
        client_phone: '',
        client_email: '',
        event_date: new Date().toISOString().split('T')[0],
        event_venue: '',
        service_type: 'MIXTO',
        total_amount: 0,
        down_payment_required: 0,
        down_payment_covered: false,
        supplies_expense: 0,
        car_provider: 'NINGUNA_EXTERNO',
        external_staff_count: 0,
        external_staff_names: '',
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar pedido.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrderDetail = async (order: VlbOrder) => {
    const tasks = getOrderTasks(order);
    setSelectedOrder({ ...order, tasks });
    try {
      const res = await apiFetch(`/api/vlb/orders/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        const serverOrder = data.order || order;
        const serverTasks = getOrderTasks(serverOrder);
        setSelectedOrder({ ...serverOrder, tasks: serverTasks });
        setOrderPayments(data.payments || []);
        setOrderDocs(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskCompleted = async (taskId: string) => {
    if (!selectedOrder) return;
    const currentTasks = selectedOrder.tasks || [];
    const updatedTasks = currentTasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setSelectedOrder({ ...selectedOrder, tasks: updatedTasks });
    try {
      await apiFetch(`/api/vlb/orders/${selectedOrder.id}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks })
      });
      loadData();
    } catch (err: any) {
      showToast('Error al actualizar tarea', 'error');
    }
  };

  const handleAddNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newTaskTitle.trim()) return;
    const newTask: VlbTask = {
      id: 'task_' + Date.now(),
      title: newTaskTitle.trim(),
      due_date: newTaskDate || selectedOrder.event_date,
      completed: false,
      category: newTaskCategory
    };
    const updatedTasks = [...(selectedOrder.tasks || []), newTask];
    setSelectedOrder({ ...selectedOrder, tasks: updatedTasks });
    setNewTaskTitle('');
    setNewTaskDate('');
    setShowNewTaskRow(false);
    try {
      await apiFetch(`/api/vlb/orders/${selectedOrder.id}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks })
      });
      showToast('Tarea agregada exitosamente');
      loadData();
    } catch (err: any) {
      showToast('Error al guardar tarea', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedOrder) return;
    const updatedTasks = (selectedOrder.tasks || []).filter(t => t.id !== taskId);
    setSelectedOrder({ ...selectedOrder, tasks: updatedTasks });
    try {
      await apiFetch(`/api/vlb/orders/${selectedOrder.id}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks })
      });
      showToast('Tarea eliminada');
      loadData();
    } catch (err: any) {
      showToast('Error al eliminar tarea', 'error');
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
      const fileToSend = await convertHeicToJpeg(selectedFile);
      const formData = new FormData();
      formData.append('file', fileToSend);
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

  // Filtered and Alphabetically Sorted Catalog Items by Product Name
  const filteredCatalog = catalogItems
    .filter(item => {
      const matchesCat = catalogCategoryFilter === 'ALL' || item.category === catalogCategoryFilter;
      const matchesSearch = !catalogSearch.trim() ||
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.subcategory.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

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

      {/* Header Editorial Exclusivo Viva la Bride - Versión Compacta y Elegante */}
      <div className="bg-gradient-to-r from-[#FAF6F2] via-[#F6ECE8] to-[#FCFAF7] border border-[#EFE2DF] rounded-2xl px-5 py-3 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-3">
            <img
              src="/vlb-monogram-pink.png"
              alt="Viva la Bride"
              className="h-10 w-auto object-contain"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-serif text-xl sm:text-2xl text-[#332A28] font-bold tracking-tight">
                  Viva la Bride
                </h1>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#EFE2DF] text-[#70443D] text-[10px] font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-[#B88A82]" />
                  <span>Atelier & Experiencias</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tab Switcher Compacto */}
          <div className="flex items-center flex-wrap gap-1 bg-[#FFFFFF]/90 backdrop-blur-xs p-1 rounded-xl border border-[#EAE3DA] shadow-2xs self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('quotes')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'quotes'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cotizador</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>CRM Parejas</span>
              {orders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-[#EFE2DF] text-[#70443D] rounded-full">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('packing');
                const sList = orders.filter(o => o.service_type === 'STANDS_EXPERIENCIAS' || o.service_type === 'STANDS' || o.service_type === 'MIXTO');
                const isCurrentValid = sList.some(o => o.id === selectedPackingOrderId);
                const targetId = isCurrentValid ? selectedPackingOrderId : (sList.length > 0 ? sList[0].id : '');
                setSelectedPackingOrderId(targetId);
                if (targetId) {
                  loadOrderPackingList(targetId);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'packing'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Carga al Auto (Día D)</span>
              {serviceOrders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-[#EFE2DF] text-[#70443D] rounded-full font-bold">
                  {serviceOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Mis Actividades</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#7D6F6B] hover:text-[#332A28]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Catálogo</span>
            </button>
            {(!user || user.role === 'ADMINISTRADOR') && (
              <button
                onClick={() => setActiveTab('finances')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'finances'
                    ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                    : 'text-[#7D6F6B] hover:text-[#332A28]'
                }`}
                title="Módulo de Nómina, Gastos y Reparto de Utilidades (Exclusivo Administradores)"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Nómina & Reparto</span>
              </button>
            )}
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
              {/* Banner de Modo Edición */}
              {editingQuoteId && (
                <div className="p-4 rounded-2xl bg-[#FFF6F8] border border-[#F5C2CD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#E84E6D]/15 flex items-center justify-center text-[#E84E6D] shrink-0">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#E84E6D] uppercase tracking-wider block">
                        Modo Edición Activo · {editingQuoteFolio}
                      </span>
                      <p className="text-xs text-[#332A28]">
                        Puedes agregar o quitar artículos, cambiar cantidades, fecha o datos. Al finalizar haz clic en <strong>Actualizar Cotización</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEditQuote}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FDF2F4] border border-[#EAE3DA] text-[#70443D] text-xs font-semibold transition cursor-pointer self-start sm:self-center shrink-0 shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Edición</span>
                  </button>
                </div>
              )}

              {/* Datos de la Pareja / Evento */}
              <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-[#B88A82]" />
                    <h2 className="font-serif text-lg font-bold text-[#332A28]">
                      Datos de la Pareja & Evento
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(editingQuoteId || quoteItems.length > 0 || quoteForm.client_name) && (
                      <button
                        type="button"
                        onClick={resetQuoteForm}
                        className="text-xs text-[#7D6F6B] hover:text-[#9C665C] transition cursor-pointer underline flex items-center space-x-1 mr-1"
                        title="Limpiar cotizador para empezar una nueva cotización"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Limpiar</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-[#C83460] bg-[#F8E4E9] px-3 py-1 rounded-full font-mono border border-[#F0D5DD]">
                      Folio: {editingQuoteFolio || currentPreviewFolio}
                    </span>
                  </div>
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
                      Teléfono WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+52 33 1234 5678"
                      value={quoteForm.client_phone}
                      onChange={e => setQuoteForm({ ...quoteForm, client_phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      {isDeliveryOnly ? 'Día de Entrega' : 'Fecha del Evento'}
                    </label>
                    <input
                      type="date"
                      value={quoteForm.event_date}
                      onChange={e => setQuoteForm({ ...quoteForm, event_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                    />
                  </div>
                  {!isDeliveryOnly && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider">
                          Horario del Evento / Montaje
                        </label>
                        {(!quoteForm.event_time || quoteForm.event_time === 'Por definir') ? (
                          <span className="text-[10px] font-semibold text-[#9C665C] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#EAE3DA]">
                            Por definir
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQuoteForm({ ...quoteForm, event_time: 'Por definir' })}
                            className="text-[10px] text-[#7D6F6B] hover:text-[#9C665C] transition cursor-pointer underline"
                            title="Restablecer como por definir"
                          >
                            Marcar por definir
                          </button>
                        )}
                      </div>
                      <VlbTimePicker
                        value={quoteForm.event_time}
                        onChange={val => setQuoteForm({ ...quoteForm, event_time: val })}
                        placeholder="Ej. 04:00 PM o Por definir"
                      />
                    </div>
                  )}
                  <div className={isDeliveryOnly ? 'sm:col-span-1' : 'sm:col-span-2'}>
                    <label className="block text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-1">
                      {isDeliveryOnly ? 'Lugar de Entrega / Venue' : 'Sede / Venue'}
                    </label>
                    <input
                      type="text"
                      placeholder={isDeliveryOnly ? 'Ej. Casa de la Novia, Hacienda...' : 'Hacienda San José del Carmen'}
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
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#9C665C] hover:text-[#70443D] bg-[#FAF6F2] hover:bg-[#F6ECE8] px-3.5 py-1.5 rounded-full border border-[#EAE3DA] transition cursor-pointer"
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
                      Utiliza el botón <strong>"Explorar y Agregar del Catálogo"</strong> para añadir papelería social, stands de bienvenida, memorial walls o audio guestbook.
                    </p>
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
                  <button
                    type="button"
                    onClick={() => setCustomPaymentMode(m => m === 'FIXED_1000' ? 'PERCENT_50' : 'FIXED_1000')}
                    className="text-[11px] font-bold text-[#9C665C] bg-[#FAF6F2] hover:bg-[#F6ECE8] px-2.5 py-1 rounded-full border border-[#EAE3DA] transition cursor-pointer flex items-center space-x-1"
                    title="Haz clic para alternar entre Separación Fija de $1,000 y Anticipo 50%"
                  >
                    <span>{isServiceQuote ? 'Separación $1,000' : 'Anticipo 50%'}</span>
                    <span className="text-[9px] text-[#B88A82]">⇄</span>
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-[#7D6F6B]">
                    <span>Subtotal Artículos:</span>
                    <span className="font-semibold text-[#332A28]">
                      ${quoteSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#7D6F6B]">Descuento (%):</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quoteDiscountPct === 0 ? '' : quoteDiscountPct}
                      onChange={e => setQuoteDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-24 px-2 py-1 text-right text-xs font-semibold bg-[#FCFAF7] border border-[#EAE3DA] rounded-lg text-[#332A28]"
                      placeholder="0"
                    />
                  </div>

                  {quoteDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-[#9C665C] bg-[#FAF6F2] px-3 py-2 rounded-xl border border-[#EAE3DA]">
                      <span className="font-medium">Monto descontado ({quoteDiscountPct}%):</span>
                      <span className="font-bold">
                        -${quoteDiscountAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#F7F3EE] flex justify-between items-baseline">
                    <span className="font-serif font-bold text-[#332A28] text-base">
                      Total Contratado:
                    </span>
                    <span className="font-serif font-bold text-[#332A28] text-xl">
                      ${quoteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Highlight Box Separación / Anticipo */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF6F2] to-[#F6ECE8] border border-[#EAD2D0] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-[#70443D]">
                      <span>{isServiceQuote ? 'Separación Requerida:' : 'Anticipo Requerido (50%):'}</span>
                      <span className="text-sm">
                        ${quoteDownPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#7D6F6B]">
                      <span>Saldo Pendiente:</span>
                      <span className="font-semibold text-[#332A28]">
                        ${quoteBalanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7D6F6B] leading-relaxed pt-1 border-t border-[#EAE3DA]">
                      {isServiceQuote ? (
                        <p className="text-[#70443D] font-medium">
                          • <strong>Stands & Servicios:</strong> Separación fija de $1,000 MXN. El saldo se liquida 10 días antes del evento.
                        </p>
                      ) : (
                        <p className="text-[#70443D] font-medium">
                          • <strong>Papelería Social:</strong> Anticipo del 50%. El saldo se liquida al entregar el pedido o al programar envío.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selector / Indicador de Modelo de Contrato */}
                  <div className="pt-2 border-t border-[#F7F3EE] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#7D6F6B] uppercase tracking-wider">
                        Contrato Digital (Pág. 2):
                      </label>
                      <span className="text-[10px] text-[#9C665C] font-semibold">
                        {contractDisplayNames[selectedContractType === 'AUTO' ? detectedContract : selectedContractType]}
                      </span>
                    </div>
                    <select
                      value={selectedContractType}
                      onChange={e => setSelectedContractType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:ring-1 focus:ring-[#9C665C] cursor-pointer"
                    >
                      <option value="AUTO">✨ Automático según artículos ({contractDisplayNames[detectedContract]})</option>
                      <option value="SNACKS">🍿 Snacks, Favores & Cajas de Agradecimiento</option>
                      <option value="STANDS">🖼️ Stands Decorativos, Backdrops & Seating Charts</option>
                      <option value="MEMORIAL">🕯️ Memorial Wall & Homenaje Conmemorativo</option>
                      <option value="DRINKS">🥂 Beer & Mimosa Stands / Barras de Bebida</option>
                      <option value="PAPELERIA">💌 Papelería Social & Diseño Atelier</option>
                      <option value="COMBO">✨ Atelier & Experiencias de Bienvenida (Mixto)</option>
                    </select>
                  </div>
                </div>

                {/* Acciones Principales */}
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => handleExportPdfCurrent(true)}
                    disabled={quoteItems.length === 0}
                    className={`w-full py-3.5 px-4 bg-[#332A28] hover:bg-[#58352F] text-[#FFFFFF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer ${
                      quoteItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Download className="w-4 h-4 text-[#CCDACC]" />
                    <span>Descargar PDF Oficial</span>
                  </button>

                  <button
                    onClick={() => handleSendQuoteWhatsApp(null)}
                    disabled={quoteItems.length === 0}
                    className={`w-full py-3 px-4 bg-[#25D366] hover:bg-[#20BA5A] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer ${
                      quoteItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Enviar resumen de cotización prellenado al WhatsApp de la novia"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Enviar Cotización por WhatsApp</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleSaveQuote('BORRADOR')}
                      className={`w-full py-2.5 px-3 border text-xs font-bold uppercase tracking-wider rounded-2xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                        editingQuoteId
                          ? 'bg-[#E84E6D] hover:bg-[#D43B5B] text-[#FFFFFF] border-[#E84E6D] shadow-xs'
                          : 'bg-[#FFFFFF] hover:bg-[#FCFAF7] text-[#70443D] border-[#EAE3DA]'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>{editingQuoteId ? 'Actualizar' : 'Guardar'}</span>
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
                        try {
                          const endpoint = editingQuoteId ? `/api/vlb/quotes/${editingQuoteId}` : '/api/vlb/quotes';
                          const method = editingQuoteId ? 'PUT' : 'POST';
                          const res = await apiFetch(endpoint, {
                            method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...quoteForm,
                              event_time: standardizeEventTime(quoteForm.event_time),
                              quote_number: editingQuoteFolio || undefined,
                              discount: quoteDiscountAmount,
                              down_payment_pct: quoteTotal > 0 ? Math.round((quoteDownPayment / quoteTotal) * 100) : 50,
                              down_payment_amount: quoteDownPayment,
                              balance_due: quoteBalanceDue,
                              items: quoteItems
                            })
                          });
                          const data = await res.json();
                          const targetId = editingQuoteId || data.quote?.id;
                          if (targetId) {
                            await handleConvertQuoteToOrder(targetId);
                            resetQuoteForm();
                          }
                        } catch (e: any) {
                          showToast(e.message, 'error');
                        }
                      }}
                      className="w-full py-2.5 px-3 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Convertir</span>
                    </button>
                  </div>
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
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFE8E1] text-[#7D6F6B] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Folio</th>
                      <th className="py-3 px-3">Clienta / Pareja</th>
                      <th className="py-3 px-3">Fecha Evento</th>
                      <th className="py-3 px-3">Total</th>
                      <th className="py-3 px-3">Anticipo / Separación</th>
                      <th className="py-3 px-3">Estatus</th>
                      <th className="py-3 px-3 text-right pr-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F7F3EE]">
                    {quotes.map(q => {
                      const isService = Boolean((q as any).has_services) || q.quote_number?.startsWith('SV-') || q.down_payment_amount === 1000;
                      const downPayment = isService ? Math.min(1000, q.total) : (q.total * 0.5);
                      return (
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
                            {formatDateMX(q.event_date)}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-[#332A28]">
                            ${q.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-[#70443D]">
                            <div>
                              <span>${downPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                              <span className="text-[10px] text-[#7D6F6B] block font-normal">
                                {isService ? 'Separación fija $1,000' : 'Anticipo 50%'}
                              </span>
                            </div>
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
                        <td className="py-3.5 px-3 text-right whitespace-nowrap pr-4 space-x-1.5">
                          <button
                            onClick={() => handleEditQuote(q)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#FFF6F8] hover:bg-[#FEEBF0] text-[#E84E6D] border border-[#F5C2CD] font-semibold text-[11px] cursor-pointer"
                            title="Editar cotización (agregar/quitar artículos, cambiar precios o datos)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleCopyProposalLink(q.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F6ECE8] text-[#9C665C] border border-[#EAE3DA] font-semibold text-[11px] cursor-pointer"
                            title="Copiar liga pública para novios (PDF y Firma)"
                          >
                            <Link className="w-3.5 h-3.5" />
                            <span>Liga</span>
                          </button>
                          <button
                            onClick={() => handleSendQuoteWhatsApp(q)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#E8F8EE] hover:bg-[#D5F2DF] text-[#1EBE5D] border border-[#BCE8CB] font-semibold text-[11px] cursor-pointer"
                            title="Enviar Cotización por WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setPdfMenuQuoteId(pdfMenuQuoteId === q.id ? null : q.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F6ECE8] text-[#70443D] border border-[#EAE3DA] font-semibold text-[11px] cursor-pointer"
                              title="Opciones de descarga de PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                              <ChevronDown className="w-3 h-3 text-[#B88A82]" />
                            </button>

                            {pdfMenuQuoteId === q.id && (
                              <div className="absolute right-0 mt-1 w-56 rounded-2xl bg-[#FFFFFF] shadow-lg border border-[#EAE3DA] p-1.5 z-50 text-xs space-y-1">
                                <button
                                  onClick={() => {
                                    setPdfMenuQuoteId(null);
                                    handleExportSavedQuotePdf(q, false);
                                  }}
                                  className="w-full text-left p-2 rounded-xl text-[#332A28] hover:bg-[#FAF6F2] flex items-center space-x-2 transition cursor-pointer"
                                >
                                  <span className="text-base">📄</span>
                                  <div>
                                    <div className="font-bold text-[#332A28]">Solo Cotización (1 pág)</div>
                                    <div className="text-[10px] text-[#7D6F6B]">Ideal para precio inicial</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    setPdfMenuQuoteId(null);
                                    handleExportSavedQuotePdf(q, true);
                                  }}
                                  className="w-full text-left p-2 rounded-xl text-[#332A28] hover:bg-[#FAF6F2] flex items-center space-x-2 transition cursor-pointer border-t border-[#F7F3EE]"
                                >
                                  <span className="text-base">📑</span>
                                  <div>
                                    <div className="font-bold text-[#9C665C]">+ Contrato (2 págs)</div>
                                    <div className="text-[10px] text-[#7D6F6B]">Para apartado y cierre</div>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
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
                          <button
                            onClick={() => handleDeleteQuote(q.id, q.quote_number)}
                            className="inline-flex items-center space-x-1 px-2 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#FCE8E6] text-[#70443D] border border-[#EAE3DA] font-semibold text-[11px] cursor-pointer"
                            title="Eliminar cotización"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                type="button"
                onClick={() => setShowNewOrderModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-[#70443D] hover:bg-[#58352F] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Registrar Evento / Compra</span>
              </button>
              <button
                onClick={() => loadData()}
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
                      {formatOrderFolio(order.order_number)}
                    </span>
                    <div className="flex items-center space-x-1.5">
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
                          ? 'Anticipo Cubierto'
                          : 'Anticipo Pendiente'}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteOrder(order.id, order.client_name);
                        }}
                        className="p-1 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#FCE8E6] rounded-lg transition cursor-pointer"
                        title="Eliminar proyecto / pareja"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#332A28] group-hover:text-[#9C665C] transition">
                      {order.client_name} {order.partner_name ? `& ${order.partner_name}` : ''}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-[#7D6F6B] mt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#B88A82]" />
                      <span>{formatDateMX(order.event_date)}</span>
                      {order.event_venue && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[150px]">{order.event_venue}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* DISTINCIÓN VISUAL CLARA: Papelería + Stand, Stand bienvenida, Papelería social */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          order.service_type === 'PAPELERIA'
                            ? 'bg-[#F7EDEB] text-[#70443D] border border-[#ECD9D5]'
                            : order.service_type === 'STANDS_EXPERIENCIAS'
                            ? 'bg-[#EBF2EB] text-[#384C3A] border border-[#D3E0D3]'
                            : 'bg-gradient-to-r from-[#F7EDEB] to-[#EBF2EB] text-[#58352F] border border-[#E0D4CE]'
                        }`}
                      >
                        <Tag className="w-3 h-3 mr-0.5" />
                        <span>{getServiceLabel(order.service_type)}</span>
                      </span>
                    </div>

                    {/* Chips de Artículos Contratados */}
                    <div className="flex flex-wrap gap-1">
                      {order.items && order.items.length > 0 ? (
                        <>
                          {order.items.slice(0, 3).map((it, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[#FAF6F2] text-[#70443D] border border-[#EAE3DA] truncate max-w-[190px]"
                              title={it.item_name}
                            >
                              {it.pricing_type === 'PER_PIECE' ? `${it.quantity}x ` : ''}{it.item_name}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#F3EDE6] text-[#7D6F6B]">
                              +{order.items.length - 3} más
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-[#7D6F6B] italic">Proyecto personalizado</span>
                      )}
                    </div>
                  </div>

                  {/* TAREAS & FECHAS CRÍTICAS OPERATIVAS (Garantizadas en todas las tarjetas) */}
                  {(() => {
                    const cardTasks = getOrderTasks(order);
                    return (
                      <div className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-[#7D6F6B] pb-1 border-b border-[#F0EAE4]">
                          <div className="flex items-center space-x-1 font-semibold text-[#332A28]">
                            <ListTodo className="w-3.5 h-3.5 text-[#B88A82]" />
                            <span>Tareas & Logística</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#9C665C]">
                            {cardTasks.filter(t => t.completed).length}/{cardTasks.length} listas
                          </span>
                        </div>

                        <div className="space-y-1">
                          {cardTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="flex items-center justify-between text-[11px]">
                              <span className={`truncate max-w-[170px] ${task.completed ? 'line-through text-[#7D6F6B]' : 'text-[#332A28] font-medium'}`}>
                                {task.completed ? '✓ ' : '• '}{task.title}
                              </span>
                              <span className="text-[10px] font-bold text-[#9C665C] shrink-0 ml-1">
                                {formatDateMX(task.due_date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
                Papelería Social
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
              {/* Selector de modo de visualización en tarjetas */}
              <div className="hidden sm:inline-flex items-center bg-[#F4ECE6] p-0.5 rounded-xl text-[11px] font-medium text-[#7D6F6B]">
                <button
                  type="button"
                  onClick={() => setCatalogImageFit('contain')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    catalogImageFit === 'contain'
                      ? 'bg-[#FFFFFF] text-[#332A28] shadow-xs font-semibold'
                      : 'hover:text-[#332A28]'
                  }`}
                  title="Mostrar foto completa sin recortar en las tarjetas"
                >
                  Foto completa
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogImageFit('cover')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    catalogImageFit === 'cover'
                      ? 'bg-[#FFFFFF] text-[#332A28] shadow-xs font-semibold'
                      : 'hover:text-[#332A28]'
                  }`}
                  title="Llenar recuadro"
                >
                  Llenar
                </button>
              </div>

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
                  setCatalogImageError(null);
                  setShowManualImageUrl(false);
                  setCatalogForm({
                    category: 'PAPELERIA',
                    subcategory: 'Invitaciones',
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
                  <div className="h-52 sm:h-56 w-full bg-[#FAF6F2] overflow-hidden relative group/photo">
                    {item.image_url ? (
                      <div
                        onClick={() => setViewingPhotoItem(item)}
                        className="w-full h-full relative cursor-zoom-in"
                        title="Haz clic para ver la foto completa"
                      >
                        {/* Fondo difuminado cálido para ambientación cuando la foto no llena todo el espacio */}
                        {catalogImageFit === 'contain' && (
                          <div
                            className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-25 scale-110 pointer-events-none"
                            style={{ backgroundImage: `url(${item.image_url})` }}
                          />
                        )}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className={`relative z-10 w-full h-full transition duration-300 ${
                            catalogImageFit === 'contain'
                              ? 'object-contain p-2.5 group-hover/photo:scale-[1.03]'
                              : 'object-cover group-hover/photo:scale-105'
                          }`}
                        />
                        {/* Hover Overlay Badge */}
                        <div className="absolute inset-0 z-20 bg-[#1F1917]/15 opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1917]/80 backdrop-blur-md text-[#FFFFFF] text-[11px] font-medium rounded-full shadow-lg border border-white/10">
                            <ZoomIn className="w-3.5 h-3.5 text-[#F2C5BD]" />
                            <span>Ver foto completa</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FAF6F2] to-[#F6ECE8]">
                        <Package className="w-12 h-12 text-[#B88A82] opacity-40" />
                      </div>
                    )}
                    <span
                      className={`absolute top-3 left-3 z-30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs pointer-events-none ${
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
                        setCatalogImageError(null);
                        setShowManualImageUrl(Boolean(item.image_url && !item.image_url.startsWith('/uploads')));
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
      {/* TAB 4: CARGA AL AUTO (CHECKLIST OPERATIVO DÍA D)         */}
      {/* ======================================================== */}
      {activeTab === 'packing' && (
        <div className="space-y-6">
          {/* Header & Selector de Evento */}
          <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA]">
                  <Truck className="w-6 h-6 text-[#9C665C]" />
                </div>
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#332A28]">
                    Checklist de Carga al Auto · Día D
                  </h2>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">
                    Verificación operativa para subir todo el material y equipo al vehículo antes de salir al venue.
                  </p>
                </div>
              </div>

              {/* Selector de Evento */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-[#7D6F6B] shrink-0">
                  Evento de Servicio:
                </label>
                <select
                  value={selectedPackingOrderId}
                  onChange={e => {
                    setSelectedPackingOrderId(e.target.value);
                    loadOrderPackingList(e.target.value);
                  }}
                  className="px-3 py-2 text-xs font-semibold bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C] max-w-xs"
                >
                  {serviceOrders.length === 0 ? (
                    <option value="">No hay eventos de servicios activos</option>
                  ) : (
                    serviceOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {formatOrderFolio(o.order_number)} · {o.client_name} ({formatDateMX(o.event_date)})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Si no hay eventos de servicios contratados */}
            {serviceOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA] space-y-2">
                <Truck className="w-8 h-8 text-[#9C665C] mx-auto opacity-60" />
                <h4 className="font-serif font-bold text-sm text-[#332A28]">
                  No hay eventos de servicios o stands activos
                </h4>
                <p className="text-xs text-[#7D6F6B] max-w-md mx-auto">
                  El checklist de Carga al Auto aplica exclusivamente para eventos presenciales con montaje de stands, barras y experiencias. Los pedidos de solo papelería social no requieren vehículo de traslado.
                </p>
              </div>
            ) : (() => {
              const currentPackingOrder = serviceOrders.find(o => o.id === selectedPackingOrderId) || serviceOrders[0];
              const packedCount = packingList.filter(it => it.packed).length;
              const totalCount = packingList.length;
              const progressPct = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;
              const isAllPacked = totalCount > 0 && packedCount === totalCount;

              return (
                <div className="space-y-4">
                  {currentPackingOrder && (
                    <div className="flex flex-wrap items-center justify-between text-xs text-[#7D6F6B] gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#332A28] font-serif text-base">
                          {currentPackingOrder.client_name} {currentPackingOrder.partner_name ? `& ${currentPackingOrder.partner_name}` : ''}
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-[#9C665C] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#EAE3DA]">
                          {formatOrderFolio(currentPackingOrder.order_number)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          currentPackingOrder.service_type === 'PAPELERIA'
                            ? 'bg-[#F7EDEB] text-[#70443D]'
                            : currentPackingOrder.service_type === 'STANDS_EXPERIENCIAS'
                            ? 'bg-[#EBF2EB] text-[#384C3A]'
                            : 'bg-[#F3EDE6] text-[#58352F]'
                        }`}>
                          {getServiceLabel(currentPackingOrder.service_type)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-[#B88A82]" />
                          <span>{formatDateMX(currentPackingOrder.event_date)}</span>
                        </span>
                        {currentPackingOrder.event_venue && (
                          <span className="flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5 text-[#B88A82]" />
                            <span>{currentPackingOrder.event_venue}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Card */}
                  <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#332A28]">
                        Estado del Cargamento: {packedCount} de {totalCount} cosas en el auto
                      </span>
                      <span className={`font-bold ${isAllPacked ? 'text-[#1EBE5D]' : 'text-[#9C665C]'}`}>
                        {progressPct}% completado
                      </span>
                    </div>
                    <div className="w-full bg-[#EAE3DA] h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isAllPacked ? 'bg-[#1EBE5D]' : 'bg-[#9C665C]'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    {isAllPacked && totalCount > 0 && (
                      <div className="pt-2 text-center text-xs font-bold text-[#1EBE5D] flex items-center justify-center space-x-1">
                        <Sparkles className="w-4 h-4" />
                        <span>¡Vehículo 100% cargado! No falta nada para el evento. ¡Buen viaje al venue! 🚗💨</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Checklist Items Grouped by Category (solo si hay eventos de servicio) */}
          {serviceOrders.length > 0 && (
          <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-bold text-[#332A28]">
                Material, Estructuras & Herramientas a Subir
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegeneratePackingList}
                  className="text-xs text-[#9C665C] hover:text-[#70443D] hover:underline cursor-pointer flex items-center space-x-1 font-semibold"
                  title="Restaurar o generar automáticamente el checklist con los artículos del pedido y kit del auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Restaurar kit completo</span>
                </button>
                <span className="text-[#D1C6BD]">•</span>
                <button
                  type="button"
                  onClick={handleResetPackingList}
                  className="text-xs text-[#7D6F6B] hover:text-[#70443D] hover:underline cursor-pointer"
                >
                  Reiniciar casillas
                </button>
                <span className="hidden md:inline text-xs text-[#7D6F6B]">
                  (Toca cada casilla conforme lo coloques en la cajuela)
                </span>
              </div>
            </div>

            {loadingPacking ? (
              <div className="py-12 text-center text-xs text-[#7D6F6B]">
                Cargando lista de empaque...
              </div>
            ) : packingList.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7D6F6B] space-y-3">
                <p>No hay elementos en el checklist para este evento.</p>
                <button
                  type="button"
                  onClick={handleRegeneratePackingList}
                  className="px-4 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-white font-bold rounded-xl transition inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Checklist Inteligente para el Auto</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {packingList.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleTogglePackingItem(item.id, !item.packed)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      item.packed
                        ? 'bg-[#F2FAF4] border-[#BCE8CB] text-[#384C3A]'
                        : 'bg-[#FCFAF7] border-[#EAE3DA] hover:border-[#9C665C] text-[#332A28]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="shrink-0 text-xl">
                        {item.packed ? (
                          <CheckCircle2 className="w-6 h-6 text-[#1EBE5D]" />
                        ) : (
                          <div className="w-6 h-6 rounded-lg border-2 border-[#D1C6BD] bg-[#FFFFFF]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-sm font-bold block ${item.packed ? 'line-through text-[#7D6F6B]' : 'text-[#332A28]'}`}>
                          {item.name || item.item_name}
                        </span>
                        {item.notes && (
                          <span className="text-[11px] text-[#7D6F6B] block">
                            {item.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFFFFF] border border-[#EAE3DA] text-[#7D6F6B]">
                        {item.category}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeletePackingItem(item.id);
                        }}
                        className="p-1.5 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#F7EDEB] rounded-lg transition"
                        title="Eliminar de la lista de carga"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Custom Item */}
            <form onSubmit={handleAddCustomPackingItem} className="pt-4 border-t border-[#F7F3EE] flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Ej. Banquito, 2 manteles extras, Hielera grande..."
                value={newPackingItemName}
                onChange={e => setNewPackingItemName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
              />
              <select
                value={newPackingItemCategory}
                onChange={e => setNewPackingItemCategory(e.target.value)}
                className="px-3 py-2 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
              >
                <option value="Mobiliario / Stand">Mobiliario / Stand</option>
                <option value="Papelería">Papelería</option>
                <option value="Herramientas & Fijación">Herramientas & Fijación</option>
                <option value="Audio Guestbook">Audio Guestbook</option>
                <option value="Bebidas & Cristalería">Bebidas & Cristalería</option>
                <option value="Emergencia">Emergencia</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subir al Auto</span>
              </button>
            </form>
          </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MIS ACTIVIDADES (PLANTILLAS MAESTRAS DE TAREAS)   */}
      {/* ======================================================== */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA]">
                  <ListTodo className="w-6 h-6 text-[#9C665C]" />
                </div>
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#332A28]">
                    Mis Actividades Maestras
                  </h2>
                  <p className="text-xs text-[#7D6F6B] mt-0.5">
                    Define tus propias listas de actividades por defecto. Cada proyecto calculará sus fechas ideales según estos tiempos.
                  </p>
                </div>
              </div>

              {/* Category Pill Switcher */}
              <div className="flex items-center bg-[#FCFAF7] p-1 rounded-xl border border-[#EAE3DA]">
                <button
                  onClick={() => setTemplateFilterCategory('PAPELERIA')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    templateFilterCategory === 'PAPELERIA'
                      ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                      : 'text-[#7D6F6B] hover:text-[#332A28]'
                  }`}
                >
                  📦 Papelería Social
                </button>
                <button
                  onClick={() => setTemplateFilterCategory('SERVICIO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    templateFilterCategory === 'SERVICIO'
                      ? 'bg-[#9C665C] text-[#FFFFFF] shadow-2xs'
                      : 'text-[#7D6F6B] hover:text-[#332A28]'
                  }`}
                >
                  ✨ Stands & Servicios
                </button>
              </div>
            </div>

            {/* List of Templates for Selected Category */}
            <div className="space-y-2.5">
              {taskTemplates
                .filter(t => t.category === templateFilterCategory)
                .map((t, idx) => (
                  editingTemplateId === t.id ? (
                    <div
                      key={t.id}
                      className="p-4 bg-[#FFFFFF] rounded-2xl border-2 border-[#9C665C] shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-[#9C665C]">
                        <span>Editar Actividad Maestra #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                          className="text-[#7D6F6B] hover:text-[#332A28] p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-[#7D6F6B] block mb-1">
                            Título de la actividad *
                          </label>
                          <input
                            type="text"
                            required
                            value={editingTemplateForm.title}
                            onChange={e => setEditingTemplateForm({ ...editingTemplateForm, title: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-[#FAF7F5] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C] focus:bg-[#FFFFFF]"
                            placeholder="Nombre de la actividad..."
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#7D6F6B] block mb-1">
                            Días antes & Hora sugerida
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min={0}
                              value={editingTemplateForm.days_before_event}
                              onChange={e => setEditingTemplateForm({ ...editingTemplateForm, days_before_event: parseInt(e.target.value, 10) || 0 })}
                              className="w-full px-3 py-2 text-xs bg-[#FAF7F5] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                              placeholder="Días"
                            />
                            <input
                              type="time"
                              value={editingTemplateForm.default_time}
                              onChange={e => setEditingTemplateForm({ ...editingTemplateForm, default_time: e.target.value })}
                              className="w-28 px-2 py-2 text-xs bg-[#FAF7F5] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#7D6F6B] block mb-1">
                          Notas u observaciones
                        </label>
                        <input
                          type="text"
                          value={editingTemplateForm.notes}
                          onChange={e => setEditingTemplateForm({ ...editingTemplateForm, notes: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-[#FAF7F5] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C] focus:bg-[#FFFFFF]"
                          placeholder="Notas opcionales..."
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                          className="px-3 py-1.5 rounded-xl border border-[#EAE3DA] text-[#7D6F6B] hover:bg-[#FAF7F5] text-xs font-semibold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditTemplate(t.id)}
                          className="px-4 py-1.5 rounded-xl bg-[#9C665C] hover:bg-[#854E45] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar Cambios</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={t.id}
                      className="p-4 bg-[#FCFAF7] rounded-2xl border border-[#EAE3DA] flex items-center justify-between gap-3 text-xs hover:border-[#DACFC3] transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-full bg-[#FFFFFF] border border-[#EAE3DA] font-bold text-[#9C665C] flex items-center justify-center shrink-0 text-xs">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-[#332A28] text-sm block">
                            {t.title}
                          </span>
                          {t.notes && (
                            <span className="text-[11px] text-[#7D6F6B] block">
                              {t.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] text-[#9C665C] border border-[#EAE3DA] font-bold text-xs">
                          {t.days_before_event === 0 ? 'Día del Evento' : `${t.days_before_event} días antes`}
                          {t.default_time ? ` (${t.default_time})` : ''}
                        </span>
                        <button
                          onClick={() => startEditTemplate(t)}
                          className="p-1.5 text-[#7D6F6B] hover:text-[#9C665C] hover:bg-[#FAF6F2] rounded-lg transition cursor-pointer"
                          title="Editar actividad maestra"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMasterTemplate(t.id)}
                          className="p-1.5 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#F7EDEB] rounded-lg transition cursor-pointer"
                          title="Eliminar de la plantilla maestra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
            </div>

            {/* Add New Master Task */}
            <form onSubmit={handleAddMasterTemplate} className="p-4 bg-[#FCFAF7] rounded-2xl border border-[#BCE8CB] space-y-3 mt-4">
              <div className="text-xs font-bold text-[#384C3A]">
                + Agregar Nueva Actividad Maestra para {templateFilterCategory === 'PAPELERIA' ? 'Papelería Social' : 'Stands & Servicios'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Ej. Impresión de menús, Compra de hielo, Armado de vinil..."
                    value={newTemplateTitle}
                    onChange={e => {
                      setNewTemplateTitle(e.target.value);
                      setNewTemplateCategory(templateFilterCategory);
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Días antes (ej. 7)"
                    value={newTemplateDays}
                    onChange={e => setNewTemplateDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  />
                  <input
                    type="time"
                    placeholder="14:00"
                    value={newTemplateTime}
                    onChange={e => setNewTemplateTime(e.target.value)}
                    className="w-28 px-2 py-2 text-xs bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Notas u observaciones (opcional)"
                  value={newTemplateNotes}
                  onChange={e => setNewTemplateNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-[#1EBE5D] hover:bg-[#18A04E] text-[#FFFFFF] text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
                >
                  Guardar en Plantilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: NÓMINA, GASTOS & REPARTO DE UTILIDADES (PRIVADO)  */}
      {/* ======================================================== */}
      {activeTab === 'finances' && (
        <VlbFinanceModule
          user={user}
          onBack={() => setActiveTab('quotes')}
        />
      )}

      {/* ======================================================== */}
      {/* DRAWER / MODAL: DETALLE DEL PROYECTO (CRM)               */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FFFFFF] h-full overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Header Drawer */}
              <div className="flex items-start justify-between pb-4 border-b border-[#EFE8E1]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF6F2] text-[#9C665C] border border-[#EAE3DA]">
                      {formatOrderFolio(selectedOrder.order_number)}
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
                    {selectedOrder.event_venue || 'Sede sin definir'} · Evento el {formatDateMX(selectedOrder.event_date)}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.client_name)}
                    className="p-2 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#FCE8E6] rounded-xl transition cursor-pointer"
                    title="Eliminar este proyecto"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF6F2] rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* WhatsApp Quick Actions (1-Click directo sin API) */}
              <div className="p-4 rounded-2xl bg-[#E8F8EE] border border-[#BCE8CB] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#1EBE5D]">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Directo (Sin API · 1-Clic)</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#384C3A]">
                    {selectedOrder.client_phone || 'Sin número registrado'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleSendOrderWhatsApp(selectedOrder, 'contrato')}
                    className="px-3 py-1.5 rounded-xl bg-[#1EBE5D] hover:bg-[#18A14E] text-[#FFFFFF] text-xs font-bold shadow-2xs transition cursor-pointer flex items-center space-x-1"
                    title="Enviar a la novia su link con el contrato oficial y su estado de cuenta en vivo"
                  >
                    <span>📑 Enviar Liga de Contrato & Pagos</span>
                  </button>
                  <button
                    onClick={() => handleCopyProposalLink(selectedOrder.quote_id || selectedOrder.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF6F2] text-[#70443D] border border-[#EAE3DA] text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center space-x-1"
                    title="Copiar liga del cliente"
                  >
                    <Link className="w-3.5 h-3.5 text-[#9C665C]" />
                    <span>Copiar Liga</span>
                  </button>
                  <button
                    onClick={() => handleSendOrderWhatsApp(selectedOrder, 'anticipo')}
                    className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0FDF4] text-[#1EBE5D] border border-[#BCE8CB] text-xs font-semibold shadow-2xs transition cursor-pointer"
                    title="Enviar recordatorio formal de anticipo 50% con desglose"
                  >
                    💳 Recordar Anticipo
                  </button>
                  <button
                    onClick={() => handleSendOrderWhatsApp(selectedOrder, 'vobo')}
                    className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0FDF4] text-[#1EBE5D] border border-[#BCE8CB] text-xs font-semibold shadow-2xs transition cursor-pointer"
                    title="Pedir VoBo de ortografía y fechas antes de mandar al taller de imprenta"
                  >
                    💌 Solicitar VoBo de Diseño
                  </button>
                  <button
                    onClick={() => handleSendOrderWhatsApp(selectedOrder, 'saldo')}
                    className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0FDF4] text-[#1EBE5D] border border-[#BCE8CB] text-xs font-semibold shadow-2xs transition cursor-pointer"
                    title="Recordar liquidación de saldo previo a entrega y montaje"
                  >
                    🥂 Recordar Saldo Final
                  </button>
                </div>
              </div>

              {/* Artículos & Servicios Contratados */}
              <div className="p-5 rounded-3xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-[#B88A82]" />
                    <h4 className="font-serif text-base font-bold text-[#332A28]">
                      Artículos & Servicios Contratados
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedOrder.quote_id && (
                      <button
                        type="button"
                        onClick={() => {
                          const q = quotes.find(quote => quote.id === selectedOrder.quote_id);
                          if (q) {
                            setSelectedOrder(null);
                            setActiveTab('quotes');
                            handleEditQuote(q);
                          }
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#FAF6F2] hover:bg-[#F3EDE6] border border-[#EAE3DA] text-[#9C665C] text-xs font-semibold transition cursor-pointer"
                        title="Modificar artículos, cantidades o precios en el cotizador"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar en Cotizador</span>
                      </button>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedOrder.service_type === 'PAPELERIA'
                          ? 'bg-[#F7EDEB] text-[#70443D] border border-[#ECD9D5]'
                          : selectedOrder.service_type === 'STANDS_EXPERIENCIAS'
                          ? 'bg-[#EBF2EB] text-[#384C3A] border border-[#D3E0D3]'
                          : 'bg-[#F3EDE6] text-[#58352F] border border-[#E0D4CE]'
                      }`}
                    >
                      {getServiceLabel(selectedOrder.service_type)}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[#EFE8E1] bg-[#FFFFFF] rounded-2xl border border-[#EAE3DA] overflow-hidden">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-[#FCFAF7] transition">
                        <div>
                          <div className="font-semibold text-[#332A28]">
                            {it.item_name}
                          </div>
                          <div className="text-[11px] text-[#7D6F6B]">
                            {it.category === 'PAPELERIA' ? 'Papelería Social' : 'Stand / Servicio'} · {it.pricing_type === 'PER_PIECE' ? `${it.quantity} piezas a $${it.unit_price.toLocaleString('es-MX')} c/u` : 'Tarifa por evento'}
                          </div>
                        </div>
                        <span className="font-bold text-[#332A28] text-sm">
                          ${it.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[#7D6F6B] italic">
                      Sin desglose de artículos individuales.
                    </div>
                  )}
                </div>
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
                    <span className="text-[10px] text-[#7D6F6B] uppercase block">
                      {selectedOrder.service_type === 'STANDS_EXPERIENCIAS' ? 'Separación $1,000' : 'Anticipo 50%'}
                    </span>
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
                            {formatDateMX(p.payment_date)} {p.reference_num ? `· Ref: ${p.reference_num}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#384C3A] text-sm">
                            +${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#FCE8E6] rounded-lg transition cursor-pointer"
                            title="Eliminar este pago del historial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. LOGÍSTICA DE TAREAS Y FECHAS CRÍTICAS (Adaptable a Servicios y Papelería) */}
              <div className="p-5 rounded-3xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <ListTodo className="w-4 h-4 text-[#B88A82]" />
                    <h4 className="font-serif text-base font-bold text-[#332A28]">
                      Tareas & Fechas Críticas
                    </h4>
                    {selectedOrder.tasks && selectedOrder.tasks.length > 0 && (
                      <span className="text-[10px] font-bold text-[#9C665C] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#EAE3DA]">
                        {selectedOrder.tasks.filter(t => t.completed).length} de {selectedOrder.tasks.length} completadas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowNewTaskRow(!showNewTaskRow)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-semibold shadow-2xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva Tarea</span>
                    </button>
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
                      className="text-xs font-semibold text-[#7D6F6B] hover:text-[#9C665C] hover:underline cursor-pointer"
                      title="Editar fechas principales"
                    >
                      Fechas Clave
                    </button>
                  </div>
                </div>

                {/* Formulario Agregar Tarea */}
                {showNewTaskRow && (
                  <form onSubmit={handleAddNewTask} className="p-3 bg-[#FFFFFF] rounded-2xl border border-[#BCE8CB] space-y-2.5 animate-fadeIn">
                    <div className="text-xs font-bold text-[#384C3A]">
                      Agregar Nueva Tarea Operativa
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Ej. Compra de bebidas, Armado de vinil..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C]"
                        required
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="date"
                          value={newTaskDate}
                          onChange={e => setNewTaskDate(e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C] flex-1"
                        />
                        <select
                          value={newTaskCategory}
                          onChange={e => setNewTaskCategory(e.target.value as any)}
                          className="px-2 py-1.5 text-xs bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#332A28]"
                        >
                          <option value="SERVICIO">Servicio</option>
                          <option value="PAPELERIA">Papelería</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewTaskRow(false)}
                        className="px-2.5 py-1 text-xs text-[#7D6F6B] hover:text-[#332A28] cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#1EBE5D] hover:bg-[#18A04E] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                      >
                        Guardar Tarea
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista Interactiva de Tareas */}
                <div className="space-y-2">
                  {selectedOrder.tasks && selectedOrder.tasks.length > 0 ? (
                    selectedOrder.tasks.map(task => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between text-xs ${
                          task.completed
                            ? 'bg-[#F9FAF9] border-[#E2E8E2] text-[#7D6F6B]'
                            : 'bg-[#FFFFFF] border-[#EAE3DA] text-[#332A28]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskCompleted(task.id)}
                            className="text-[#9C665C] hover:scale-110 transition cursor-pointer shrink-0"
                            title={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                          >
                            {task.completed ? (
                              <CheckSquare className="w-4 h-4 text-[#1EBE5D]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#B88A82]" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <span className={`block font-medium truncate ${task.completed ? 'line-through text-[#7D6F6B]' : 'text-[#332A28]'}`}>
                              {task.title}
                            </span>
                            {task.notes && (
                              <span className="text-[10px] text-[#7D6F6B] block truncate">
                                {task.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            task.category === 'PAPELERIA'
                              ? 'bg-[#F7EDEB] text-[#70443D]'
                              : 'bg-[#EBF2EB] text-[#384C3A]'
                          }`}>
                            {task.category === 'PAPELERIA' ? 'Papelería' : 'Servicio'}
                          </span>
                          <span className="font-bold text-[#9C665C] bg-[#FAF6F2] px-2 py-0.5 rounded-lg text-[11px]">
                            {formatDateMX(task.due_date)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#F7EDEB] rounded-lg transition cursor-pointer"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[#7D6F6B]">
                      No hay tareas registradas. Haz clic en "+ Nueva Tarea" para agregar una.
                    </div>
                  )}
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
                            {(doc.file_size / 1024).toFixed(1)} KB · {formatDateMX(doc.created_at)}
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

                        {/* Download & Delete buttons */}
                        <div className="pt-2 flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="inline-flex items-center space-x-1 text-[#70443D] hover:underline font-semibold text-[11px] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDocUploadModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
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
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif"
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDatesEditModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
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
                  <VlbTimePicker
                    value={datesForm.stand_setup_time}
                    onChange={val => setDatesForm({ ...datesForm, stand_setup_time: val })}
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
      {/* MODAL / LIGHTBOX: VISOR EDITORIAL DE FOTO COMPLETA       */}
      {/* ======================================================== */}
      {viewingPhotoItem && (
        <div
          onClick={() => setViewingPhotoItem(null)}
          className="fixed inset-0 z-50 bg-[#140F0E]/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Header Bar */}
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 text-white"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md text-[#F4ECE6] border border-white/10">
                {viewingPhotoItem.subcategory || (viewingPhotoItem.category === 'PAPELERIA' ? 'Papelería Social' : 'Stands & Experiencias')}
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-medium text-white truncate">
                {viewingPhotoItem.name}
              </h3>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {viewingPhotoItem.image_url && (
                <a
                  href={viewingPhotoItem.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Abrir imagen en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setViewingPhotoItem(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Cerrar visor (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Photo Center - clic en espacio en blanco cierra el visor */}
          <div
            onClick={() => setViewingPhotoItem(null)}
            className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 cursor-pointer"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="relative max-h-[76vh] max-w-full flex items-center justify-center cursor-default"
            >
              <img
                src={viewingPhotoItem.image_url}
                alt={viewingPhotoItem.name}
                className="max-h-[76vh] max-w-[92vw] sm:max-w-4xl object-contain rounded-2xl shadow-2xl border border-white/10 select-none animate-in zoom-in-95 duration-200"
              />
            </div>
          </div>

          {/* Footer Bar */}
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl mx-auto bg-white/10 backdrop-blur-lg border border-white/15 rounded-2xl px-5 py-3 flex items-center justify-between text-white shadow-xl"
          >
            <div>
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Precio Base</p>
              <p className="font-serif text-lg font-bold text-white">
                ${viewingPhotoItem.base_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-white/70 font-sans">
                  {viewingPhotoItem.pricing_type === 'PER_PIECE' ? ' / pza' : ' / evento'}
                </span>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const it = viewingPhotoItem;
                  setViewingPhotoItem(null);
                  setEditingCatalogItem(it);
                  setCatalogImageError(null);
                  setShowManualImageUrl(Boolean(it.image_url && !it.image_url.startsWith('/uploads')));
                  setCatalogForm({
                    category: it.category,
                    subcategory: it.subcategory,
                    name: it.name,
                    description: it.description,
                    pricing_type: it.pricing_type,
                    base_price: it.base_price,
                    min_pieces: it.min_pieces || 1,
                    image_url: it.image_url || ''
                  });
                  setShowCatalogModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-xl transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const it = viewingPhotoItem;
                  setViewingPhotoItem(null);
                  handleAddItemToQuote(it);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cotizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR ARTÍCULO EN CATÁLOGO               */}
      {/* ======================================================== */}
      {showCatalogModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCatalogModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#332A28]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
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
                <label className="block font-semibold text-[#7D6F6B] uppercase mb-1.5 flex items-center justify-between">
                  <span>Foto del Artículo / Imagen Inspo</span>
                  {catalogForm.image_url && (
                    <span className="text-[10px] text-[#6E8C70] font-normal flex items-center gap-1">
                      <Check className="w-3 h-3" /> Foto asignada
                    </span>
                  )}
                </label>

                {/* Hidden File Input para seleccionar desde la laptop o iPhone */}
                <input
                  type="file"
                  ref={catalogImageInputRef}
                  onChange={handleUploadCatalogImage}
                  accept="image/*,.heic,.heif,image/heic,image/heif"
                  className="hidden"
                />

                {/* Contenedor Dropzone con soporte de Arrastrar y Soltar */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCatalogImage(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCatalogImage(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCatalogImage(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingCatalogImage(false);
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) {
                      await processCatalogImageFile(droppedFile);
                    }
                  }}
                >
                  {catalogForm.image_url ? (
                    /* Vista previa de la foto actual (también permite arrastrar una nueva encima) */
                    <div className={`p-3 bg-[#FCFAF7] rounded-2xl border transition flex items-center gap-3.5 ${
                      isDraggingCatalogImage
                        ? 'border-[#9C665C] bg-[#F7EDEB] ring-2 ring-[#9C665C]/30'
                        : 'border-[#EAE3DA]'
                    }`}>
                      <div
                        onClick={() => {
                          if (catalogForm.image_url) {
                            setViewingPhotoItem({
                              id: 'preview',
                              category: catalogForm.category,
                              subcategory: catalogForm.subcategory,
                              name: catalogForm.name || 'Vista Previa de Foto',
                              description: catalogForm.description || '',
                              pricing_type: catalogForm.pricing_type,
                              base_price: catalogForm.base_price || 0,
                              min_pieces: catalogForm.min_pieces || 1,
                              specs_json: '{}',
                              image_url: catalogForm.image_url,
                              is_active: 1,
                              created_at: '',
                              updated_at: ''
                            });
                          }
                        }}
                        className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-[#EAE3DA] shrink-0 relative group cursor-pointer"
                        title="Ver foto en tamaño completo"
                      >
                        <img
                          src={catalogForm.image_url}
                          alt="Preview"
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-[#1F1917]/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-xs font-semibold text-[#332A28] truncate">
                          {isDraggingCatalogImage ? '¡Suelta la nueva imagen para reemplazarla!' : 'Imagen cargada'}
                        </p>
                        <p className="text-[11px] text-[#7D6F6B] truncate">
                          {isDraggingCatalogImage ? 'Reemplazará la foto actual' : catalogForm.image_url.startsWith('/uploads') ? 'Subida desde tu dispositivo' : catalogForm.image_url}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => catalogImageInputRef.current?.click()}
                            disabled={uploadingCatalogImage}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#9C665C] bg-[#F7EDEB] hover:bg-[#F2E1DD] rounded-xl transition cursor-pointer"
                          >
                            {uploadingCatalogImage ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Subiendo...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3" />
                                <span>Cambiar o arrastrar foto</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCatalogForm({ ...catalogForm, image_url: '' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#F6ECE8] rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Quitar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Botón / Dropzone para arrastrar o hacer clic */
                    <div
                      onClick={() => catalogImageInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        isDraggingCatalogImage
                          ? 'border-[#9C665C] bg-[#F7EDEB] ring-4 ring-[#9C665C]/20 scale-[1.01]'
                          : uploadingCatalogImage
                          ? 'border-[#B88A82] bg-[#FAF5F2]'
                          : 'border-[#EAE3DA] bg-[#FCFAF7] hover:bg-[#FAF6F2] hover:border-[#B88A82]'
                      }`}
                    >
                      {uploadingCatalogImage ? (
                        <>
                          <Loader2 className="w-7 h-7 text-[#9C665C] animate-spin" />
                          <span className="text-xs font-semibold text-[#9C665C]">Optimizando y subiendo foto...</span>
                        </>
                      ) : isDraggingCatalogImage ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-[#9C665C] text-[#FFFFFF] flex items-center justify-center animate-bounce shadow-md">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#9C665C]">
                              ¡Suelta tu imagen aquí!
                            </p>
                            <p className="text-[11px] text-[#7D6F6B] mt-0.5">
                              Se cargará automáticamente
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-11 h-11 rounded-2xl bg-[#F7EDEB] text-[#9C665C] flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#332A28]">
                              Arrastra una foto aquí o haz clic para seleccionarla
                            </p>
                            <p className="text-[11px] text-[#7D6F6B] mt-0.5">
                              Formatos JPG, PNG, WEBP, HEIC o GIF (hasta 25MB)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {catalogImageError && (
                  <p className="text-xs text-[#70443D] mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{catalogImageError}</span>
                  </p>
                )}

                {/* Opción secundaria: URL web externa */}
                <div className="mt-2 text-right">
                  {!showManualImageUrl && !catalogForm.image_url ? (
                    <button
                      type="button"
                      onClick={() => setShowManualImageUrl(true)}
                      className="text-[11px] text-[#7D6F6B] hover:text-[#9C665C] underline cursor-pointer"
                    >
                      O ingresar enlace web (URL externa)
                    </button>
                  ) : showManualImageUrl || (!catalogForm.image_url.startsWith('/uploads') && catalogForm.image_url) ? (
                    <div className="text-left space-y-1 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-[#7D6F6B]">
                          URL externa de imagen
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowManualImageUrl(false)}
                          className="text-[10px] text-[#7D6F6B] hover:underline cursor-pointer"
                        >
                          Ocultar campo URL
                        </button>
                      </div>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={catalogForm.image_url}
                        onChange={e => setCatalogForm({ ...catalogForm, image_url: e.target.value })}
                        className="w-full px-3.5 py-1.5 bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-xs text-[#332A28]"
                      />
                    </div>
                  ) : null}
                </div>
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
                    disabled={savingCatalogItem}
                    className="px-4 py-2 text-xs font-semibold text-[#7D6F6B] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingCatalogItem || uploadingCatalogImage}
                    className="px-5 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-[#FFFFFF] text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingCatalogItem ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR NUEVO EVENTO / COMPRA DIRECTA EN CRM   */}
      {/* ======================================================== */}
      {showNewOrderModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewOrderModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-3xl border border-[#EAE3DA] shadow-2xl p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FCFAF7] text-[#70443D] flex items-center justify-center text-lg border border-[#EAE3DA]">
                  💍
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#332A28]">
                    Registrar Evento / Compra Directa
                  </h3>
                  <p className="text-xs text-[#7D6F6B]">
                    Guarda el evento en CRM Parejas y sincroniza su liquidación automáticamente en Nómina & Reparto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewOrderModal(false)}
                className="p-2 rounded-xl text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF6F2] transition cursor-pointer"
                title="Cerrar (Esc o clic afuera)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectOrder} className="space-y-4 text-xs">
              {/* 1. Datos Principales */}
              <div className="p-3.5 bg-[#FCFAF7] rounded-2xl border border-[#EAE3DA] space-y-3">
                <span className="font-bold text-[#70443D] uppercase tracking-wider block">
                  1. Datos del Cliente & Evento
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Nombre de la Novia / Clienta *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Valeria López"
                      value={newOrderForm.client_name}
                      onChange={e => setNewOrderForm({ ...newOrderForm, client_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Nombre de la Pareja / Novio (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Santiago Ramos"
                      value={newOrderForm.partner_name}
                      onChange={e => setNewOrderForm({ ...newOrderForm, partner_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Fecha del Evento *
                    </label>
                    <input
                      type="date"
                      required
                      value={newOrderForm.event_date}
                      onChange={e => setNewOrderForm({ ...newOrderForm, event_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Sede / Venue
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Hacienda San Carlos"
                      value={newOrderForm.event_venue}
                      onChange={e => setNewOrderForm({ ...newOrderForm, event_venue: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      WhatsApp / Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. 33 1234 5678"
                      value={newOrderForm.client_phone}
                      onChange={e => setNewOrderForm({ ...newOrderForm, client_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Tipo de Servicio
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setNewOrderForm({ ...newOrderForm, service_type: 'MIXTO' })}
                        className={`py-2 px-1 text-center font-bold rounded-xl transition cursor-pointer ${
                          (directOrderItems.length > 0
                            ? (directStandsTotal > 0 && directStationeryTotal > 0 ? 'MIXTO' : directStandsTotal > 0 ? 'STANDS' : 'PAPELERIA')
                            : newOrderForm.service_type) === 'MIXTO'
                            ? 'bg-[#70443D] text-white shadow-xs'
                            : 'bg-white border border-[#EAE3DA] text-[#7D6F6B]'
                        }`}
                      >
                        🍸💌 Mixto
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewOrderForm({ ...newOrderForm, service_type: 'STANDS' })}
                        className={`py-2 px-1 text-center font-bold rounded-xl transition cursor-pointer ${
                          (directOrderItems.length > 0
                            ? (directStandsTotal > 0 && directStationeryTotal > 0 ? 'MIXTO' : directStandsTotal > 0 ? 'STANDS' : 'PAPELERIA')
                            : newOrderForm.service_type) === 'STANDS'
                            ? 'bg-[#70443D] text-white shadow-xs'
                            : 'bg-white border border-[#EAE3DA] text-[#7D6F6B]'
                        }`}
                      >
                        🍸 Stands
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewOrderForm({ ...newOrderForm, service_type: 'PAPELERIA' })}
                        className={`py-2 px-1 text-center font-bold rounded-xl transition cursor-pointer ${
                          (directOrderItems.length > 0
                            ? (directStandsTotal > 0 && directStationeryTotal > 0 ? 'MIXTO' : directStandsTotal > 0 ? 'STANDS' : 'PAPELERIA')
                            : newOrderForm.service_type) === 'PAPELERIA'
                            ? 'bg-[#70443D] text-white shadow-xs'
                            : 'bg-white border border-[#EAE3DA] text-[#7D6F6B]'
                        }`}
                      >
                        💌 Papelería
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Servicios y Productos Contratados (Cotizador Rápido) */}
              <div className="p-3.5 bg-[#FCFAF7] rounded-2xl border border-[#EAE3DA] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#70443D] uppercase tracking-wider block">
                      2. Servicios & Productos Contratados (Cotizador)
                    </span>
                    <p className="text-[11px] text-[#7D6F6B]">
                      Agrega los servicios tal como en una cotización para registrar partidas exactas y nómina automática.
                    </p>
                  </div>
                  {directOrderItems.length > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#FAF0ED] text-[#70443D] border border-[#EFE2DF] shrink-0 self-start sm:self-center">
                      {directOrderItems.length} {directOrderItems.length === 1 ? 'concepto' : 'conceptos'}
                    </span>
                  )}
                </div>

                {/* Selector desde el Catálogo de VLB y Servicios Personalizados */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 relative">
                      <select
                        value=""
                        onChange={(e) => {
                          const item = catalogItems.find(c => c.id === e.target.value);
                          if (item) {
                            addCatalogItemToDirectOrder(item);
                          }
                          e.target.value = '';
                        }}
                        className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-medium text-xs cursor-pointer shadow-2xs"
                      >
                        <option value="">➕ Seleccionar del Catálogo de VLB...</option>
                        <optgroup label="🍸 Stands & Experiencias">
                          {catalogItems
                            .filter(c => c.category === 'STANDS_EXPERIENCIAS')
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                🍸 {c.name} — ${c.base_price.toLocaleString('es-MX')}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="💌 Papelería Social Atelier">
                          {catalogItems
                            .filter(c => c.category === 'PAPELERIA')
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                💌 {c.name} — ${c.base_price.toLocaleString('es-MX')}{c.pricing_type === 'PER_PIECE' ? '/pza' : ''}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => addPresetDirectItem('Stand / Barra Personalizada', 'STANDS_EXPERIENCIAS', 0, 1, 'FIXED_EVENT')}
                        className="px-2.5 py-2 rounded-xl bg-white border border-[#CCDACC] text-[#2D5A27] hover:bg-[#F2F7F2] font-semibold text-[11px] transition cursor-pointer flex items-center space-x-1"
                        title="Agregar un stand o barra personalizada"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Stand</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addPresetDirectItem('Papelería Personalizada', 'PAPELERIA', 0, 1, 'PER_PIECE')}
                        className="px-2.5 py-2 rounded-xl bg-white border border-[#F5C2CB] text-[#70443D] hover:bg-[#FAF0ED] font-semibold text-[11px] transition cursor-pointer flex items-center space-x-1"
                        title="Agregar papelería personalizada"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Papelería</span>
                      </button>
                    </div>
                  </div>

                  {/* Atajos Rápidos de 1-Clic */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-semibold text-[#7D6F6B] uppercase tracking-wider mr-1">
                      Atajos Rápidos:
                    </span>
                    <button
                      type="button"
                      onClick={() => addPresetDirectItem('Stand Beer Bar', 'STANDS_EXPERIENCIAS', 5500, 1, 'FIXED_EVENT')}
                      className="px-2 py-1 bg-white hover:bg-[#F2F7F2] text-[#2D5A27] border border-[#CCDACC] rounded-lg text-[10px] font-medium transition cursor-pointer"
                    >
                      + 🍸 Beer Bar ($5,500)
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetDirectItem('Stand Carajillos Bar', 'STANDS_EXPERIENCIAS', 2770, 1, 'FIXED_EVENT')}
                      className="px-2 py-1 bg-white hover:bg-[#F2F7F2] text-[#2D5A27] border border-[#CCDACC] rounded-lg text-[10px] font-medium transition cursor-pointer"
                    >
                      + 🍸 Carajillos ($2,770)
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetDirectItem('Stand Audio Guestbook', 'STANDS_EXPERIENCIAS', 2500, 1, 'FIXED_EVENT')}
                      className="px-2 py-1 bg-white hover:bg-[#F2F7F2] text-[#2D5A27] border border-[#CCDACC] rounded-lg text-[10px] font-medium transition cursor-pointer"
                    >
                      + 🍸 Audio Guestbook ($2,500)
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetDirectItem('Menús de Mesa Impresos', 'PAPELERIA', 45, 50, 'PER_PIECE')}
                      className="px-2 py-1 bg-white hover:bg-[#FAF0ED] text-[#70443D] border border-[#EFE2DF] rounded-lg text-[10px] font-medium transition cursor-pointer"
                    >
                      + 💌 Menús 50 pzas ($45 c/u)
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetDirectItem('Números de Mesa / Capitanes', 'PAPELERIA', 85, 12, 'PER_PIECE')}
                      className="px-2 py-1 bg-white hover:bg-[#FAF0ED] text-[#70443D] border border-[#EFE2DF] rounded-lg text-[10px] font-medium transition cursor-pointer"
                    >
                      + 💌 Números de Mesa ($85 c/u)
                    </button>
                  </div>
                </div>

                {/* Lista de Partidas Agregadas o Estado Vacío */}
                {directOrderItems.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[#EAE3DA] bg-white text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#FAF6F2] text-[#70443D] flex items-center justify-center mx-auto text-sm">
                      📝
                    </div>
                    <p className="text-xs font-semibold text-[#332A28]">
                      Aún no has agregado partidas a este pedido
                    </p>
                    <p className="text-[11px] text-[#7D6F6B] max-w-md mx-auto">
                      Usa el selector del catálogo o los atajos rápidos de arriba para añadir los conceptos como una cotización. O si prefieres, ingresa un monto total manual a continuación:
                    </p>
                    <div className="pt-2 max-w-xs mx-auto">
                      <label className="block text-[11px] font-semibold text-[#7D6F6B] mb-1 text-left">
                        Total Contratado Manual ($ MXN):
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0.00"
                        value={newOrderForm.total_amount || ''}
                        onChange={e => {
                          const tot = parseFloat(e.target.value) || 0;
                          setNewOrderForm({
                            ...newOrderForm,
                            total_amount: tot,
                            down_payment_required: Math.round(tot * 0.5 * 100) / 100
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono font-bold text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {directOrderItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-2.5 rounded-xl bg-white border border-[#EAE3DA] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[#DDD2C4] transition"
                      >
                        {/* Tipo de partida y Nombre editable */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateDirectItemCategory(
                                  idx,
                                  item.category === 'STANDS_EXPERIENCIAS' ? 'PAPELERIA' : 'STANDS_EXPERIENCIAS'
                                )
                              }
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer transition ${
                                item.category === 'PAPELERIA'
                                  ? 'bg-[#FAF0ED] text-[#70443D] border border-[#EFE2DF]'
                                  : 'bg-[#E8F0E8] text-[#2D5A27] border border-[#CCDACC]'
                              }`}
                              title="Haz clic para cambiar entre Stand y Papelería"
                            >
                              {item.category === 'PAPELERIA' ? '💌 Papelería' : '🍸 Stand'}
                            </button>
                            <span className="text-[10px] text-[#7D6F6B]">
                              {item.category === 'PAPELERIA' ? 'Aplica 20% atelier' : 'Genera nómina de turno/insumos'}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={e => updateDirectItemName(idx, e.target.value)}
                            placeholder="Nombre del servicio / concepto..."
                            className="w-full px-2 py-1 text-xs font-semibold bg-[#FAF6F2] border border-transparent hover:border-[#EAE3DA] focus:border-[#70443D] rounded-lg text-[#332A28]"
                          />
                        </div>

                        {/* Cantidad, Precio Unitario, Subtotal y Eliminar */}
                        <div className="flex items-center justify-between sm:justify-end space-x-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#F7F3EE]">
                          {/* Cantidad */}
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => updateDirectItemQty(idx, Math.max(1, item.quantity - 1))}
                              className="w-6 h-6 rounded-md bg-[#FAF6F2] hover:bg-[#EAE3DA] text-[#332A28] font-bold flex items-center justify-center cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => updateDirectItemQty(idx, parseInt(e.target.value) || 1)}
                              className="w-12 px-1 py-1 text-xs text-center font-bold bg-[#FAF6F2] border border-[#EAE3DA] rounded-lg text-[#332A28]"
                            />
                            <button
                              type="button"
                              onClick={() => updateDirectItemQty(idx, item.quantity + 1)}
                              className="w-6 h-6 rounded-md bg-[#FAF6F2] hover:bg-[#EAE3DA] text-[#332A28] font-bold flex items-center justify-center cursor-pointer text-xs"
                            >
                              +
                            </button>
                          </div>

                          {/* Precio Unitario */}
                          <div className="flex items-center space-x-1">
                            <span className="text-[11px] text-[#7D6F6B]">$</span>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.unit_price}
                              onChange={e => updateDirectItemPrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-1 text-xs text-right font-mono font-semibold bg-[#FAF6F2] border border-[#EAE3DA] rounded-lg text-[#332A28]"
                              title="Precio Unitario"
                            />
                          </div>

                          {/* Total Partida */}
                          <div className="text-right min-w-[80px]">
                            <div className="text-xs font-bold font-mono text-[#332A28]">
                              ${(item.total_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[9px] text-[#7D6F6B]">subtotal</div>
                          </div>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => removeDirectItem(idx)}
                            className="p-1.5 text-[#7D6F6B] hover:text-[#70443D] hover:bg-[#FAF0ED] rounded-lg transition cursor-pointer"
                            title="Eliminar partida"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resumen Financiero Calculado */}
                <div className="p-3 bg-white rounded-xl border border-[#EAE3DA] space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-[#FCFAF7] border border-[#F2ECE5]">
                      <span className="text-[10px] text-[#7D6F6B] block">🍸 Total Stands:</span>
                      <span className="text-xs font-bold text-[#2D5A27] font-mono">
                        ${directStandsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#FCFAF7] border border-[#F2ECE5]">
                      <span className="text-[10px] text-[#7D6F6B] block">💌 Total Papelería:</span>
                      <span className="text-xs font-bold text-[#70443D] font-mono">
                        ${directStationeryTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#FCFAF7] border border-[#F2ECE5]">
                      <span className="text-[10px] text-[#70443D] font-bold block">TOTAL CONTRATADO:</span>
                      <span className="text-sm font-bold text-[#332A28] font-mono">
                        ${effectiveDirectTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#FAF0ED] border border-[#EFE2DF]">
                      <span className="text-[10px] text-[#70443D] font-bold block">ANTICIPO 50%:</span>
                      <span className="text-sm font-bold text-[#70443D] font-mono">
                        ${effectiveDownPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F2ECE5]">
                    <label className="flex items-center space-x-2.5 cursor-pointer p-2 rounded-xl hover:bg-[#FAF6F2] transition border border-transparent hover:border-[#EAE3DA]">
                      <input
                        type="checkbox"
                        checked={newOrderForm.down_payment_covered}
                        onChange={e => setNewOrderForm({ ...newOrderForm, down_payment_covered: e.target.checked })}
                        className="w-4 h-4 accent-[#1EBE5D] rounded cursor-pointer"
                      />
                      <span className="font-semibold text-[#332A28] text-xs">
                        ¿El anticipo del 50% (${effectiveDownPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) ya fue cubierto y transferido por la pareja?
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 3. Operación y Nómina Inicial */}
              <div className="p-3.5 bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA] space-y-3">
                <span className="font-bold text-[#70443D] uppercase tracking-wider block">
                  3. Datos Operativos & Nómina Inicial (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Insumos Estimados ($ MXN)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      value={newOrderForm.supplies_expense || ''}
                      onChange={e => setNewOrderForm({ ...newOrderForm, supplies_expense: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      ¿Quién llevará carro?
                    </label>
                    <select
                      value={newOrderForm.car_provider}
                      onChange={e => setNewOrderForm({ ...newOrderForm, car_provider: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] cursor-pointer"
                    >
                      <option value="NINGUNA_EXTERNO">Ninguna / Flete Externo ($0)</option>
                      <option value="SCARLETTE">🚗 Solo Scarlette ($500)</option>
                      <option value="VICTORIA">🚗 Solo Victoria ($500)</option>
                      <option value="AMBAS_COMPLETO">🚗🚗 Ambas llevaron carro ($500 c/u)</option>
                      <option value="AMBAS_DIVIDIDO">🚗🚗 Ambas llevaron carro (50/50)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Staff Externo de Apoyo
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0 personas"
                      value={newOrderForm.external_staff_count || ''}
                      onChange={e => setNewOrderForm({ ...newOrderForm, external_staff_count: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#7D6F6B] mb-1">
                      Nombres del Staff (a quién se le paga)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Mariana López, Carlos Pérez"
                      value={newOrderForm.external_staff_names}
                      onChange={e => setNewOrderForm({ ...newOrderForm, external_staff_names: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#7D6F6B] mb-1">
                    Notas y Artículos Contratados
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Artículos solicitados, requerimientos especiales o notas..."
                    value={newOrderForm.notes}
                    onChange={e => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#EAE3DA] rounded-xl text-[#332A28] text-xs resize-none"
                  />
                </div>
              </div>

              {/* Botones Acción */}
              <div className="pt-2 border-t border-[#F7F3EE] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EAE3DA] text-[#7D6F6B] hover:text-[#332A28] font-semibold cursor-pointer"
                >
                  Cancelar (Esc)
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#70443D] hover:bg-[#58352F] text-white font-bold shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <span>{loading ? 'Guardando...' : '✨ Registrar Pedido y Nómina'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
