import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Guest, Table } from '../types';
import {
  Users, UserPlus, FileSpreadsheet, Download, Upload,
  Search, Filter, ChevronLeft, ChevronRight, Phone, MessageSquare,
  AlertTriangle, CheckCircle, Clock, XCircle, Edit2, AlertCircle,
  Send, Loader2, Check, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const InvitadosModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Sort
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [sortBy, setSortBy] = useState<'alpha_asc' | 'alpha_desc' | 'lastname_asc' | 'lastname_desc' | 'priority_desc' | 'priority_asc'>('alpha_asc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 25 });
  const [summary, setSummary] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    declined: 0,
    total_places_all: 0,
    confirmed_places: 0,
    pending_places: 0,
    declined_places: 0
  });

  // Modal / Drawer states
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDownloadsMenu, setShowDownloadsMenu] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // WhatsApp Sending states
  const [sendingWhatsappIds, setSendingWhatsappIds] = useState<Record<string, boolean>>({});
  const [bulkSendingWhatsapp, setBulkSendingWhatsapp] = useState(false);
  const [whatsappBanner, setWhatsappBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // WhatsApp Conversation Modal states
  const [chatGuest, setChatGuest] = useState<Guest | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  // Permiso exclusivo: solo Administradores y Coordinadores pueden enviar WhatsApps
  const canSendWhatsApp = user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR';

  // Form for Add/Edit
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '+52 ',
    companion_count: 0,
    priority: 'Media' as 'Alta' | 'Media' | 'Baja',
    status: 'Pendiente de confirmar' as Guest['status'],
    table_id: '',
    observations: '',
    dietary_requirements: '',
    confirmed_places: 0
  });
  const [formError, setFormError] = useState('');

  const fetchGuests = async () => {
    if (!currentWedding || !token) return;
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search: search.trim(),
        status: statusFilter,
        priority: priorityFilter,
        tableId: tableFilter,
        sortBy
      });
      const res = await fetch(`/api/weddings/${currentWedding.id}/guests?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGuests(data.guests || []);
        setPagination(data.pagination);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching guests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/tables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchGuests();
  }, [currentWedding, token, page, statusFilter, priorityFilter, tableFilter, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchGuests();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTables();
  }, [currentWedding, token]);

  // Inline Status Change (Direct update in backend)
  const handleInlineStatusChange = async (guest: Guest, newStatus: Guest['status']) => {
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/guests/${guest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchGuests();
        await fetchTables();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Inline Priority Change (Direct update in backend)
  const handleInlinePriorityChange = async (guest: Guest, newPriority: 'Alta' | 'Media' | 'Baja') => {
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/guests/${guest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ priority: newPriority })
      });
      if (res.ok) {
        await fetchGuests();
      }
    } catch (err) {
      console.error('Error updating priority:', err);
    }
  };

  // Inline Table Change (Direct update in backend from main guest list)
  const handleInlineTableChange = async (guest: Guest, selectedValue: string) => {
    if (!currentWedding || !token) return;

    let targetTableId: string | null = selectedValue || null;

    if (selectedValue === '__new__') {
      const nextNum = tables.length + 1;
      const newTableName = window.prompt('Nombre de la nueva mesa:', `Mesa ${nextNum}`);
      if (!newTableName || !newTableName.trim()) return;
      try {
        const createRes = await fetch(`/api/weddings/${currentWedding.id}/tables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newTableName.trim(),
            type: 'circular',
            capacity: 10,
            x: 150 + (tables.length % 4) * 170,
            y: 200 + Math.floor(tables.length / 4) * 160
          })
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          alert(createData.error || 'No se pudo crear la mesa.');
          return;
        }
        targetTableId = createData.table?.id || null;
      } catch {
        return;
      }
    }

    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/guests/${guest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ table_id: targetTableId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al asignar mesa.');
        return;
      }
      await fetchGuests();
      await fetchTables();
    } catch (err) {
      console.error('Error updating table:', err);
    }
  };

  // Open fast edit drawer on guest name click
  const handleOpenEdit = (guest: Guest) => {
    setIsNewGuest(false);
    setEditingGuest(guest);
    setFormData({
      first_name: guest.first_name,
      last_name: guest.last_name,
      phone: guest.phone,
      companion_count: guest.companion_count,
      priority: guest.priority || 'Media',
      status: guest.status,
      table_id: guest.table_id || '',
      observations: guest.observations || '',
      dietary_requirements: guest.dietary_requirements || '',
      confirmed_places: guest.confirmed_places || (guest.status === 'Confirmado' ? 1 + guest.companion_count : 0)
    });
    setFormError('');
  };

  // Open Add Guest drawer
  const handleOpenAdd = () => {
    setIsNewGuest(true);
    setEditingGuest({} as Guest);
    setFormData({
      first_name: '',
      last_name: '',
      phone: '+52 ',
      companion_count: 0,
      priority: 'Media',
      status: 'Pendiente de confirmar',
      table_id: '',
      observations: '',
      dietary_requirements: '',
      confirmed_places: 0
    });
    setFormError('');
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.first_name || !formData.last_name || !formData.phone) {
      setFormError('Nombre, apellido y WhatsApp son campos obligatorios.');
      return;
    }

    try {
      const url = isNewGuest
        ? `/api/weddings/${currentWedding!.id}/guests`
        : `/api/weddings/${currentWedding!.id}/guests/${editingGuest!.id}`;
      const method = isNewGuest ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          table_id: formData.status === 'No asistirá' ? null : (formData.table_id || null)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar invitado.');
      }

      setEditingGuest(null);
      await fetchGuests();
      await fetchTables();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('¿Deseas eliminar a este invitado de la lista?')) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/guests/${guestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setEditingGuest(null);
        await fetchGuests();
        await fetchTables();
      }
    } catch {}
  };

  // Excel Template Download
  const handleDownloadTemplate = () => {
    window.open(`/api/weddings/${currentWedding!.id}/guests/template?token=${token}`, '_blank');
  };

  // Export Guest Lists to Excel (.xlsx)
  const handleExportGuestList = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/guests?page=1&limit=5000&sortBy=${sortBy}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        alert('Error al obtener la lista de invitados para descargar.');
        return;
      }
      const data = await res.json();
      const allGuests: Guest[] = data.guests || [];

      if (allGuests.length === 0) {
        alert('Aún no hay invitados registrados para descargar.');
        return;
      }

      const formatGuestRows = (list: Guest[]) =>
        list.map(g => ({
          'NOMBRE': g.first_name,
          'APELLIDO': g.last_name,
          'WHATSAPP': g.phone,
          'ACOMPAÑANTES': g.companion_count,
          'TOTAL LUGARES': 1 + (g.companion_count || 0),
          'ESTATUS': g.status,
          'MESA': g.status === 'No asistirá' ? 'Liberada' : (g.table_name || 'Sin mesa'),
          'OBSERVACIONES': g.observations || ''
        }));

      const wb = XLSX.utils.book_new();

      // If user has an active filter, put filtered view as first sheet
      if (statusFilter || priorityFilter || tableFilter || search.trim()) {
        const filteredQuery = new URLSearchParams({
          page: '1',
          limit: '5000',
          search: search.trim(),
          status: statusFilter,
          priority: priorityFilter,
          tableId: tableFilter,
          sortBy
        });
        const fRes = await fetch(`/api/weddings/${currentWedding.id}/guests?${filteredQuery.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fRes.ok) {
          const fData = await fRes.json();
          const fGuests: Guest[] = fData.guests || [];
          const wsFiltered = XLSX.utils.json_to_sheet(formatGuestRows(fGuests));
          XLSX.utils.book_append_sheet(wb, wsFiltered, 'Vista Filtrada');
        }
      }

      // Sheet 1: Todos los invitados
      const wsAll = XLSX.utils.json_to_sheet(formatGuestRows(allGuests));
      XLSX.utils.book_append_sheet(wb, wsAll, 'Todos los Invitados');

      // Sheet 2: Confirmados
      const confirmedList = allGuests.filter(g => g.status === 'Confirmado');
      const wsConfirmed = XLSX.utils.json_to_sheet(formatGuestRows(confirmedList));
      XLSX.utils.book_append_sheet(wb, wsConfirmed, 'Confirmados');

      // Sheet 3: Pendientes
      const pendingList = allGuests.filter(g => g.status === 'Pendiente de confirmar');
      const wsPending = XLSX.utils.json_to_sheet(formatGuestRows(pendingList));
      XLSX.utils.book_append_sheet(wb, wsPending, 'Pendientes');

      // Sheet 4: No asistirán
      const declinedList = allGuests.filter(g => g.status === 'No asistirá');
      const wsDeclined = XLSX.utils.json_to_sheet(formatGuestRows(declinedList));
      XLSX.utils.book_append_sheet(wb, wsDeclined, 'No Asistiran');

      const safeWeddingName = currentWedding.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `Lista_Invitados_${safeWeddingName}.xlsx`);
    } catch (err) {
      alert('Ocurrió un error al descargar la lista de invitados.');
    }
  };

  // Excel File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);
        setImportRows(data);
        setImportErrors([]);
      } catch (err) {
        alert('Error al leer el archivo Excel. Verifica el formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportErrors([]);

    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/guests/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ guests: importRows })
      });
      const data = await res.json();
      if (!res.ok) {
        setImportErrors(data.errors || [{ error: data.error }]);
      } else {
        alert(`¡Importación exitosa! Se importaron ${data.insertedCount} invitados.`);
        setShowImportModal(false);
        setImportRows([]);
        await fetchGuests();
        await fetchTables();
      }
    } catch (err: any) {
      setImportErrors([{ error: err.message }]);
    } finally {
      setImporting(false);
    }
  };

  const handleSendSingleWhatsapp = async (guest: Guest) => {
    if (!currentWedding || !token) return;
    setSendingWhatsappIds(prev => ({ ...prev, [guest.id]: true }));
    setWhatsappBanner(null);

    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/guests/${guest.id}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        setWhatsappBanner({
          text: `${data.error || 'Meta API no disponible'}. Puedes enviar el mensaje directamente haciendo clic en el ícono de WhatsApp junto al teléfono del invitado.`,
          type: 'error'
        });
      } else {
        setWhatsappBanner({ text: data.message, type: 'success' });
        // Update local guest whatsapp_status
        setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, whatsapp_status: 'ENVIADO', last_whatsapp_sent_at: data.last_whatsapp_sent_at } : g));
      }
    } catch (err: any) {
      setWhatsappBanner({ text: err.message || 'Error de conexión', type: 'error' });
    } finally {
      setSendingWhatsappIds(prev => ({ ...prev, [guest.id]: false }));
    }
  };

  const handleOpenGuestChat = async (guest: Guest) => {
    setChatGuest(guest);
    setChatInput('');
    setChatError(null);
    setLoadingChat(true);
    if (!currentWedding || !token || !guest.phone) {
      setLoadingChat(false);
      return;
    }
    try {
      const res = await fetch(`/api/whatsapp/conversations/${currentWedding.id}/${encodeURIComponent(guest.phone)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch {
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendChatReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatGuest || !chatInput.trim() || !currentWedding || !token || sendingChat) return;
    setSendingChat(true);
    setChatError(null);
    const textToSend = chatInput.trim();

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          weddingId: currentWedding.id,
          guestId: chatGuest.id,
          phone: chatGuest.phone,
          content: textToSend,
          messageType: 'text'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatInput('');
        const convRes = await fetch(`/api/whatsapp/conversations/${currentWedding.id}/${encodeURIComponent(chatGuest.phone)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          setChatMessages(convData.messages || []);
        }
      } else {
        setChatError(data.error || 'No se pudo enviar el mensaje por Meta Cloud API.');
      }
    } catch (err: any) {
      setChatError(err.message || 'Error de conexión');
    } finally {
      setSendingChat(false);
    }
  };

  const handleSendInvitationDirect = async () => {
    if (!chatGuest || !currentWedding || !token || sendingInvitation) return;
    setSendingInvitation(true);
    setChatError(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          weddingId: currentWedding.id,
          guestId: chatGuest.id,
          phone: chatGuest.phone,
          content: 'Invitación oficial',
          messageType: 'invitation'
        })
      });
      const data = await res.json();
      if (res.ok) {
        const convRes = await fetch(`/api/whatsapp/conversations/${currentWedding.id}/${encodeURIComponent(chatGuest.phone)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          setChatMessages(convData.messages || []);
        }
      } else {
        setChatError(data.error || 'No se pudo enviar la invitación por Meta Cloud API.');
      }
    } catch (err: any) {
      setChatError(err.message || 'Error de conexión');
    } finally {
      setSendingInvitation(false);
    }
  };

  const handleSendBulkWhatsapp = async () => {
    if (!currentWedding || !token) return;
    const pendingGuests = guests.filter(g => g.status === 'Pendiente de confirmar');
    const count = summary.pending || pendingGuests.length;

    if (count === 0) {
      alert('No hay invitados pendientes de confirmar en esta boda.');
      return;
    }

    if (!confirm(`¿Deseas enviar la confirmación de RSVP por WhatsApp a los ${count} invitados pendientes?`)) {
      return;
    }

    setBulkSendingWhatsapp(true);
    setWhatsappBanner(null);

    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/guests/send-whatsapp-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ onlyPending: true })
      });
      const data = await res.json();

      if (!res.ok) {
        setWhatsappBanner({ text: data.error || 'Error en envío masivo', type: 'error' });
      } else {
        setWhatsappBanner({ text: data.message, type: 'success' });
        await fetchGuests();
      }
    } catch (err: any) {
      setWhatsappBanner({ text: err.message || 'Error de conexión', type: 'error' });
    } finally {
      setBulkSendingWhatsapp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Lista Oficial
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Invitados y Confirmaciones
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Gestión unificada de asistencia, acompañantes y asignación de mesas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown Descargables */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadsMenu(!showDownloadsMenu)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF8F5] text-[#332C2A] text-xs font-semibold rounded-xl transition border border-[#DDD2C4] shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#786C68]" />
              <span>Descargables</span>
              <span className="text-[10px] text-[#786C68]">▾</span>
            </button>

            {showDownloadsMenu && (
              <div
                className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-[#DDD2C4] py-1.5 z-30 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowDownloadsMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloadsMenu(false);
                    handleDownloadTemplate();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#332C2A] hover:bg-[#FAF8F5] flex items-center space-x-2.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#9C665C] shrink-0" />
                  <div>
                    <div className="font-semibold text-[#2B2826]">Descargar plantilla vacía</div>
                    <div className="text-[10px] text-[#786C68]">Formato oficial para importar</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloadsMenu(false);
                    setShowImportModal(true);
                    setImportRows([]);
                    setImportErrors([]);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#332C2A] hover:bg-[#FAF8F5] flex items-center space-x-2.5 cursor-pointer border-t border-[#F5EFEB]"
                >
                  <Upload className="w-3.5 h-3.5 text-[#9C665C] shrink-0" />
                  <div>
                    <div className="font-semibold text-[#2B2826]">Importar archivo Excel</div>
                    <div className="text-[10px] text-[#786C68]">Cargar lista desde archivo</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {canSendWhatsApp && (
            <button
              onClick={handleSendBulkWhatsapp}
              disabled={bulkSendingWhatsapp}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
              title="Enviar plantilla oficial de WhatsApp RSVP a los invitados pendientes"
            >
              {bulkSendingWhatsapp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-emerald-100" />
              )}
              <span>{bulkSendingWhatsapp ? 'Enviando...' : 'Enviar RSVP WhatsApp'}</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuevo Invitado</span>
          </button>
        </div>
      </div>

      {/* Barra de Pestañas de Filtro Rápido */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => { setStatusFilter(''); setTableFilter(''); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs ${
            statusFilter === '' && tableFilter === ''
              ? 'bg-[#9C665C] text-white shadow-xs'
              : 'bg-[#FFFFFF] text-[#5E524E] border border-[#EAE3DA] hover:bg-[#F7F3EE]'
          }`}
        >
          Todos ({summary.total})
        </button>
        <button
          onClick={() => { setStatusFilter('Confirmado'); setTableFilter(''); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs ${
            statusFilter === 'Confirmado' && tableFilter === ''
              ? 'bg-[#6E8C70] text-white shadow-xs'
              : 'bg-[#FFFFFF] text-[#354B38] border border-[#CCDACC] hover:bg-[#E4ECE5]'
          }`}
        >
          Confirmados ({summary.confirmed})
        </button>
        <button
          onClick={() => { setStatusFilter('Pendiente de confirmar'); setTableFilter(''); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs ${
            statusFilter === 'Pendiente de confirmar' && tableFilter === ''
              ? 'bg-[#8A574E] text-white shadow-xs'
              : 'bg-[#FFFFFF] text-[#6D5A43] border border-[#EAE3DA] hover:bg-[#F7F3EE]'
          }`}
        >
          Pendientes ({summary.pending})
        </button>
        <button
          onClick={() => { setStatusFilter('No asistirá'); setTableFilter(''); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs ${
            statusFilter === 'No asistirá' && tableFilter === ''
              ? 'bg-[#70443D] text-white shadow-xs'
              : 'bg-[#FFFFFF] text-[#70443D] border border-[#EAD2D0] hover:bg-[#FBF4F3]'
          }`}
        >
          No asistirán ({summary.declined})
        </button>
        <button
          onClick={() => { setTableFilter('unassigned'); setStatusFilter(''); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs ${
            tableFilter === 'unassigned'
              ? 'bg-[#9C665C] text-white shadow-xs'
              : 'bg-[#FFFFFF] text-[#7D6F6B] border border-[#EAE3DA] hover:bg-[#F7F3EE]'
          }`}
        >
          Sin Mesa Asignada ({(summary as any).unassigned ?? '—'})
        </button>
      </div>

      {/* WhatsApp Feedback Banner */}
      {whatsappBanner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
            whatsappBanner.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {whatsappBanner.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{whatsappBanner.text}</span>
          </div>
          <button
            onClick={() => setWhatsappBanner(null)}
            className="text-stone-400 hover:text-stone-600 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Strip — Cuenta asistente + acompañante (+1) como cifra principal */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`luxury-card rounded-xl p-4 cursor-pointer transition select-none ${
            statusFilter === '' ? 'ring-2 ring-[#9C665C] bg-[#FFFFFF]' : 'hover:border-[#9C665C]'
          }`}
          title="Ver todos los invitados"
        >
          <div className="text-[10px] uppercase font-bold text-[#786C68]">Total Invitados</div>
          <div className="text-2xl font-serif font-bold text-[#332C2A] mt-0.5">{summary.total_places_all}</div>
          <div className="text-[11px] text-[#786C68]">Asistentes con +1 ({summary.total} registros)</div>
        </div>

        <div
          onClick={() => { setStatusFilter('Confirmado'); setPage(1); }}
          className={`luxury-card rounded-xl p-4 cursor-pointer transition select-none bg-[#EFE2DF]/45 border-[#DFC9C4] ${
            statusFilter === 'Confirmado' ? 'ring-2 ring-[#9C665C] shadow-xs' : 'hover:border-[#9C665C]'
          }`}
          title="Filtrar solo Confirmados"
        >
          <div className="text-[10px] uppercase font-bold text-[#82524D]">Confirmados</div>
          <div className="text-2xl font-serif font-bold text-[#6E433F] mt-0.5">{summary.confirmed_places}</div>
          <div className="text-[11px] text-[#82524D] font-semibold">Lugares confirmados ({summary.confirmed} registros)</div>
        </div>

        <div
          onClick={() => { setStatusFilter('Pendiente de confirmar'); setPage(1); }}
          className={`luxury-card rounded-xl p-4 cursor-pointer transition select-none bg-[#EFE8DE]/60 border-[#DDD2C4] ${
            statusFilter === 'Pendiente de confirmar' ? 'ring-2 ring-[#9C665C] shadow-xs' : 'hover:border-[#9C665C]'
          }`}
          title="Filtrar solo Pendientes de confirmar"
        >
          <div className="text-[10px] uppercase font-bold text-[#6D5A43]">Pendientes</div>
          <div className="text-2xl font-serif font-bold text-[#564734] mt-0.5">{summary.pending_places ?? summary.pending}</div>
          <div className="text-[11px] text-[#857056]">Por confirmar ({summary.pending} registros)</div>
        </div>

        <div
          onClick={() => { setStatusFilter('No asistirá'); setPage(1); }}
          className={`luxury-card rounded-xl p-4 cursor-pointer transition select-none bg-[#F5ECEB]/60 border-[#DBC1BE] ${
            statusFilter === 'No asistirá' ? 'ring-2 ring-[#9C665C] shadow-xs' : 'hover:border-[#9C665C]'
          }`}
          title="Filtrar quienes No asistirán"
        >
          <div className="text-[10px] uppercase font-bold text-[#6E4541]">No asistirán</div>
          <div className="text-2xl font-serif font-bold text-[#593734] mt-0.5">{summary.declined_places ?? summary.declined}</div>
          <div className="text-[11px] text-[#855652]">Lugares liberados ({summary.declined} registros)</div>
        </div>

        <div className="luxury-card rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-[#786C68]">Avance RSVP</div>
          <div className="text-2xl font-serif font-bold text-[#332C2A] mt-0.5">
            {summary.total_places_all > 0 ? Math.round((summary.confirmed_places / summary.total_places_all) * 100) : 0}%
          </div>
          <div className="text-[11px] text-[#786C68]">Tasa de asistencia</div>
        </div>
      </div>

      {/* Filters, Search & Sort Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#DDD2C4] shadow-xs">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#786C68]" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o teléfono (con o sin acentos)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#DDD2C4] rounded-xl focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Sort By Selector: Alphabetical */}
          <div className="inline-flex items-center space-x-1.5 bg-[#F9F6F2] px-2.5 py-1 rounded-xl border border-[#DDD2C4]">
            <span className="text-[11px] font-bold text-[#786C68] whitespace-nowrap">Ordenar:</span>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value as any); setPage(1); }}
              className="py-1 text-xs font-semibold bg-transparent text-[#332C2A] focus:outline-none cursor-pointer"
            >
              <option value="alpha_asc">Alfabético: Nombre (A → Z)</option>
              <option value="alpha_desc">Alfabético: Nombre (Z → A)</option>
              <option value="lastname_asc">Alfabético: Apellido (A → Z)</option>
              <option value="lastname_desc">Alfabético: Apellido (Z → A)</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs border border-[#DDD2C4] rounded-xl bg-white text-[#332C2A] focus:outline-none"
          >
            <option value="">Todos los Estatus</option>
            <option value="Confirmado">Confirmados</option>
            <option value="Pendiente de confirmar">Pendientes</option>
            <option value="No asistirá">No asistirán</option>
          </select>

          <select
            value={tableFilter}
            onChange={e => { setTableFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs border border-[#DDD2C4] rounded-xl bg-white text-[#332C2A] focus:outline-none"
          >
            <option value="">Todas las Mesas</option>
            <option value="assigned">Con Mesa Asignada</option>
            <option value="unassigned">Sin Mesa Asignada</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table: Operational, Single-Line & Properly Proportioned Columns */}
      <div className="luxury-card rounded-2xl overflow-hidden border border-[#DDD2C4]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EFE8DE] border-b border-[#DDD2C4] font-bold uppercase tracking-wider text-[#786C68]">
                <th
                  onClick={() => {
                    setSortBy(sortBy === 'alpha_asc' ? 'alpha_desc' : 'alpha_asc');
                    setPage(1);
                  }}
                  className="py-3.5 px-4 whitespace-nowrap cursor-pointer hover:text-[#332C2A] select-none transition"
                  title="Haz clic para ordenar alfabéticamente"
                >
                  NOMBRE Y APELLIDO {sortBy === 'alpha_asc' ? '↑' : sortBy === 'alpha_desc' ? '↓' : '↕'}
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[175px]">WHATSAPP</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap"># ACOMPAÑANTES</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[150px]">ESTATUS</th>
                {canSendWhatsApp && (
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">RSVP WHATSAPP</th>
                )}
                <th className="py-3.5 px-4 whitespace-nowrap">MESA</th>
                <th className="py-3.5 px-4 whitespace-nowrap">OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEAE2]">
              {loading ? (
                <tr>
                  <td colSpan={canSendWhatsApp ? 7 : 6} className="py-12 text-center text-[#786C68]">
                    Cargando invitados...
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={canSendWhatsApp ? 7 : 6} className="py-12 text-center text-[#786C68]">
                    No se encontraron invitados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                guests.map(guest => (
                  <tr
                    key={guest.id}
                    className="hover:bg-[#F9F6F2] transition group"
                  >
                    {/* Clickable name opens fast edit — Single line */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div
                        onClick={() => handleOpenEdit(guest)}
                        className="cursor-pointer font-semibold text-sm text-[#2B2826] group-hover:text-[#9C665C] inline-flex items-center space-x-2 whitespace-nowrap"
                      >
                        <span className="underline decoration-[#D2C4B4] decoration-1 underline-offset-4 whitespace-nowrap">
                          {guest.first_name} {guest.last_name}
                        </span>
                        <Edit2 className="w-3.5 h-3.5 text-[#C7B6A6] group-hover:text-[#9C665C] transition shrink-0" />
                      </div>
                    </td>

                    {/* WhatsApp — Single line with 1-click personalized link */}
                    <td className="py-3.5 px-4 whitespace-nowrap min-w-[195px]">
                      {guest.phone ? (
                        <div className="inline-flex items-center space-x-2">
                          <a
                            href={(() => {
                              let cleaned = guest.phone.replace(/\D/g, '');
                              if (cleaned.length === 10) cleaned = '52' + cleaned;
                              if (cleaned.length === 13 && cleaned.startsWith('521')) cleaned = '52' + cleaned.slice(3);
                              const text = `Hola ${guest.first_name}! 💍 Nos emociona mucho celebrar nuestra boda contigo (${
                                currentWedding?.partner_1_name && currentWedding?.partner_2_name
                                  ? `${currentWedding.partner_1_name} & ${currentWedding.partner_2_name}`
                                  : (currentWedding?.name || 'VLB Studio')
                              }). ¿Nos confirmas tu asistencia? (Tienes ${1 + guest.companion_count} ${1 + guest.companion_count === 1 ? 'pase reservado' : 'pases reservados'}).`;
                              return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
                            })()}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-[#E4ECE5] hover:bg-[#CCDACC] text-[#354B38] transition shadow-2xs shrink-0"
                            title="Enviar mensaje personalizado por WhatsApp (1 clic)"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <span className="font-mono text-sm text-[#4A3F3C]">{guest.phone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#7D6F6B] italic">Sin teléfono</span>
                      )}
                    </td>

                    {/* Companion count — Single line with confirmed places badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <div className="inline-flex items-center space-x-1.5 whitespace-nowrap">
                          <span className="font-semibold text-xs text-[#2B2826] bg-[#EFE8DE] px-2.5 py-0.5 rounded-full border border-[#DDD2C4]">
                            {guest.companion_count}
                          </span>
                          <span className="text-xs text-[#7D6F6B] whitespace-nowrap">
                            ({1 + guest.companion_count} {1 + guest.companion_count === 1 ? 'pase' : 'pases'})
                          </span>
                        </div>
                        {guest.confirmed_places ? (
                          <span className="text-[10px] font-semibold text-[#354B38] bg-[#E4ECE5] px-2 py-0.5 rounded-full mt-1">
                            ✓ {guest.confirmed_places} confirmados
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Inline Estatus Dropdown & Dietary / Bot State badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <select
                          value={guest.status}
                          onChange={e => handleInlineStatusChange(guest, e.target.value as any)}
                          className={`w-36 text-xs font-semibold rounded-xl px-2.5 py-1.5 border transition focus:outline-none cursor-pointer ${
                            guest.status === 'Confirmado'
                              ? 'bg-[#E4ECE5] text-[#354B38] border-[#CCDACC]'
                              : guest.status === 'No asistirá'
                              ? 'bg-[#FBF4F3] text-[#70443D] border-[#EAD2D0]'
                              : 'bg-[#F7F3EE] text-[#6D5A43] border-[#EAE3DA]'
                          }`}
                        >
                          <option value="Pendiente de confirmar">Pendiente</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="No asistirá">No asistirá</option>
                        </select>

                        {guest.dietary_requirements && guest.dietary_requirements !== 'Ninguna' && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 truncate max-w-[144px]" title={guest.dietary_requirements}>
                            🥗 {guest.dietary_requirements}
                          </span>
                        )}
                        {guest.rsvp_step === 'COMPLETED' && (
                          <span className="text-[10px] font-semibold text-[#A86B60] bg-[#F7EDEB] px-2 py-0.5 rounded-md border border-[#ECD9D5] truncate max-w-[144px]">
                            ✨ Bot: Completado
                          </span>
                        )}
                      </div>
                    </td>

                    {/* RSVP WhatsApp Action & Status — Only visible for ADMINISTRADOR & COORDINADOR */}
                    {canSendWhatsApp && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {sendingWhatsappIds[guest.id] ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                            <span>Enviando...</span>
                          </span>
                        ) : guest.whatsapp_status === 'ENVIADO' ? (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenGuestChat(guest)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-[#8A574E] bg-[#F7EDEB] rounded-lg border border-[#ECD9D5] hover:bg-[#EEDAD6] transition shadow-2xs cursor-pointer"
                              title="Abrir conversación para chatear y responderle al invitado"
                            >
                              <MessageSquare className="w-3 h-3 text-[#C48B81]" />
                              <span>Conversación</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendSingleWhatsapp(guest)}
                              className="p-1 text-stone-400 hover:text-emerald-700 transition cursor-pointer"
                              title={`Reenviar plantilla RSVP inicial (Último envío: ${guest.last_whatsapp_sent_at ? new Date(guest.last_whatsapp_sent_at).toLocaleDateString() : 'hoy'})`}
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          </div>
                        ) : guest.whatsapp_status === 'ERROR' ? (
                          <button
                            onClick={() => handleSendSingleWhatsapp(guest)}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                            title="Reintentar envío"
                          >
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Reintentar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendSingleWhatsapp(guest)}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow-xs"
                            title="Enviar plantilla oficial de WhatsApp RSVP"
                          >
                            <Send className="w-3 h-3 text-emerald-100" />
                            <span>Enviar RSVP</span>
                          </button>
                        )}
                      </td>
                    )}

                    {/* Mesa — Inline Editable Dropdown */}
                    <td className="py-3 px-4 whitespace-nowrap min-w-[170px]">
                      {guest.status === 'No asistirá' ? (
                        <span className="text-[#786C68] italic text-[11px] whitespace-nowrap">Liberada</span>
                      ) : (
                        <select
                          value={guest.table_id || ''}
                          onChange={e => handleInlineTableChange(guest, e.target.value)}
                          style={{ fontSize: '0.82rem' }}
                          className={`w-full max-w-[190px] font-medium rounded-lg px-2.5 py-1 border transition focus:outline-none cursor-pointer ${
                            guest.table_id
                              ? 'bg-[#EFE8DE] text-[#332C2A] border-[#DDD2C4] font-semibold'
                              : 'bg-white text-[#786C68] border-[#DDD2C4] hover:border-[#9C665C]'
                          }`}
                        >
                          <option value="">Sin mesa</option>
                          {tables.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.used_seats || 0}/{t.capacity})
                            </option>
                          ))}
                          <option value="__new__">+ Crear nueva mesa...</option>
                        </select>
                      )}
                    </td>

                    {/* Single Observaciones field — Single line */}
                    <td className="py-3 px-4 max-w-xs truncate text-[#5E524E] whitespace-nowrap">
                      {guest.observations ? (
                        <span title={guest.observations}>{guest.observations}</span>
                      ) : (
                        <span className="text-[#D2C4B4] italic">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <div>
            Mostrando <strong>{guests.length}</strong> de <strong>{pagination.total}</strong> invitados
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1 rounded-lg border border-stone-300 disabled:opacity-30 hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2">
              Página {page} de {Math.max(1, pagination.totalPages)}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1 rounded-lg border border-stone-300 disabled:opacity-30 hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer / Fast Edit Modal (No 3-dot menu, triggered directly by clicking guest name) */}
      {editingGuest && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                  {isNewGuest ? 'Registro de Invitado' : 'Edición Rápida'}
                </span>
                <h3 className="font-serif text-2xl font-bold text-stone-900">
                  {isNewGuest ? 'Nuevo Invitado' : `${formData.first_name} ${formData.last_name}`}
                </h3>
              </div>
              <button
                onClick={() => setEditingGuest(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGuest} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  WhatsApp / Teléfono (con código de país) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+52 55 1234 5678"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1"># Acompañantes</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.companion_count}
                    onChange={e => setFormData({ ...formData, companion_count: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    Total: {1 + formData.companion_count} lugares
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Estatus</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  >
                    <option value="Pendiente de confirmar">Pendiente</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="No asistirá">No asistirá</option>
                  </select>
                </div>
              </div>

              {formData.status === 'Confirmado' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Lugares Confirmados
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.confirmed_places || (1 + formData.companion_count)}
                      onChange={e => setFormData({ ...formData, confirmed_places: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Alergias / Restricciones
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Vegetariano, celíaco"
                      value={formData.dietary_requirements || ''}
                      onChange={e => setFormData({ ...formData, dietary_requirements: e.target.value })}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>
                </div>
              )}

              {formData.status !== 'No asistirá' && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Mesa Asignada</label>
                  <select
                    value={formData.table_id}
                    onChange={e => setFormData({ ...formData, table_id: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  >
                    <option value="">Sin mesa asignada</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Capacidad: {t.capacity} pax)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Single Observaciones field */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Observaciones Operativas</label>
                <textarea
                  rows={2}
                  placeholder="Restricciones alimentarias, detalles de transporte, etc."
                  value={formData.observations}
                  onChange={e => setFormData({ ...formData, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                {!isNewGuest ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteGuest(editingGuest.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Eliminar
                  </button>
                ) : <div />}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingGuest(null)}
                    className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal with line validation and preview */}
      {showImportModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Importación Masiva</span>
                <h3 className="font-serif text-2xl font-bold text-stone-900">Cargar Invitados desde Excel</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 mt-2">
              Sube un archivo Excel (.xlsx, .xls) o CSV con las columnas: <strong>NOMBRE, APELLIDO, WHATSAPP, ACOMPAÑANTES, ESTATUS, OBSERVACIONES</strong>.
            </p>

            <div className="mt-4 border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center hover:bg-stone-50 transition cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-stone-800">
                Selecciona o arrastra tu archivo Excel aquí
              </div>
              <div className="text-[10px] text-stone-400 mt-1">Formatos soportados: .xlsx, .xls, .csv</div>
            </div>

            {/* Error alerts */}
            {importErrors.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1 max-h-36 overflow-y-auto">
                <div className="font-bold flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Errores detectados en la validación:</span>
                </div>
                {importErrors.map((err, i) => (
                  <div key={i} className="text-[11px] pl-5">
                    Fila {err.row || '?'}: {err.error}
                  </div>
                ))}
              </div>
            )}

            {/* Preview table */}
            {importRows.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-bold text-stone-800 mb-2">
                  Previsualización ({importRows.length} filas detectadas):
                </div>
                <div className="border border-stone-200 rounded-xl overflow-x-auto max-h-56">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                      <tr>
                        <th className="p-2">NOMBRE</th>
                        <th className="p-2">APELLIDO</th>
                        <th className="p-2">WHATSAPP</th>
                        <th className="p-2">ACOMPAÑANTES</th>
                        <th className="p-2">ESTATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td className="p-2">{row['NOMBRE'] || row['Nombre'] || '—'}</td>
                          <td className="p-2">{row['APELLIDO'] || row['Apellido'] || '—'}</td>
                          <td className="p-2">{row['WHATSAPP'] || row['Whatsapp'] || '—'}</td>
                          <td className="p-2">{row['ACOMPAÑANTES'] ?? row['Acompañantes'] ?? 0}</td>
                          <td className="p-2">{row['ESTATUS'] || row['Estatus'] || 'Pendiente'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importRows.length > 5 && (
                  <div className="text-[10px] text-stone-400 mt-1 italic">
                    ... y {importRows.length - 5} filas más.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-6 border-t border-stone-100 mt-6">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importRows.length === 0 || importing}
                onClick={handleCommitImport}
                className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow disabled:opacity-40"
              >
                {importing ? 'Importando...' : `Confirmar Importación (${importRows.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conversación con el Invitado (Para chatear y responderle lo que quieras) */}
      {chatGuest && (
        <div className="fixed inset-0 z-50 bg-[#2B2826]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#EFE8E1] rounded-[24px] max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#EFE8E1] bg-[#FAF7F5] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#2B2826] flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-[#C48B81]" />
                  <span>{chatGuest.first_name} {chatGuest.last_name}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-xs text-[#7D6F6B]">
                    {chatGuest.phone} · {1 + (chatGuest.companion_count || 0)} pase(s)
                  </span>
                  {chatGuest.confirmed_places ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E4ECE5] text-[#354B38]">
                      ✓ {chatGuest.confirmed_places} confirmados
                    </span>
                  ) : null}
                  {chatGuest.dietary_requirements && chatGuest.dietary_requirements !== 'Ninguna' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      🥗 {chatGuest.dietary_requirements}
                    </span>
                  )}
                  {chatGuest.rsvp_step === 'COMPLETED' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F7EDEB] text-[#A86B60]">
                      ✨ Bot: Completado
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatGuest(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#EFE8E1] text-[#7D6F6B] hover:text-[#2B2826] flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chat Bubbles */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFAF7] min-h-[260px] max-h-[380px]">
              {loadingChat ? (
                <div className="py-12 text-center text-xs text-[#7D6F6B] flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C48B81]" />
                  <span>Cargando conversación...</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#7D6F6B]">
                  <p>Aún no hay mensajes registrados con este invitado.</p>
                </div>
              ) : (
                chatMessages.map(m => {
                  const isOutbound = m.direction === 'OUTBOUND';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                          isOutbound
                            ? 'bg-[#F7EDEB] text-[#2B2826] border border-[#ECD9D5] rounded-tr-xs'
                            : 'bg-white text-[#2B2826] border border-[#EFE8E1] rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <span className="text-[10px] text-[#7D6F6B]/60 mt-1 px-1">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Error banner if Meta fails */}
            {chatError && (
              <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                <span>{chatError}</span>
                <button
                  type="button"
                  onClick={() => setChatError(null)}
                  className="font-bold text-rose-900 ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Composer */}
            <form onSubmit={handleSendChatReply} className="p-4 bg-white border-t border-[#EFE8E1] space-y-3">
              <textarea
                rows={2}
                placeholder={`Escribe tu mensaje para responder a ${chatGuest.first_name}... (Presiona Enter para enviar)`}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatReply();
                  }
                }}
                className="w-full px-3.5 py-2 text-xs bg-[#FAF7F5] border border-[#EFE8E1] rounded-xl text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81] resize-none"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendInvitationDirect}
                  disabled={sendingInvitation || sendingChat}
                  className="px-3.5 py-2 bg-[#F7EDEB] hover:bg-[#EFE2DF] text-[#A86B60] border border-[#ECD9D5] text-xs font-semibold rounded-xl transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-40"
                  title="Enviar la invitación formal de la boda (PDF o Enlace) por WhatsApp"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{sendingInvitation ? 'Enviando...' : 'Enviar Invitación (PDF/Web)'}</span>
                </button>

                <button
                  type="submit"
                  disabled={sendingChat || !chatInput.trim()}
                  className="px-5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingChat ? 'Enviando...' : 'Enviar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
