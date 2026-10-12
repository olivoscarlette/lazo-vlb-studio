import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Guest, Table } from '../types';
import {
  Users, UserPlus, FileSpreadsheet, Download, Upload,
  Search, Filter, ChevronLeft, ChevronRight, Phone, MessageSquare,
  AlertTriangle, CheckCircle, Clock, XCircle, Edit2, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const InvitadosModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
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
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Form for Add/Edit
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '+52 ',
    companion_count: 0,
    status: 'Pendiente de confirmar' as Guest['status'],
    table_id: '',
    observations: ''
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
        tableId: tableFilter
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
  }, [currentWedding, token, page, statusFilter, tableFilter]);

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
        // Refresh list to update counters and table freed if 'No asistirá'
        await fetchGuests();
        await fetchTables();
      }
    } catch (err) {
      console.error('Error updating status:', err);
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
      status: guest.status,
      table_id: guest.table_id || '',
      observations: guest.observations || ''
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
      status: 'Pendiente de confirmar',
      table_id: '',
      observations: ''
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition border border-stone-200"
            title="Descargar plantilla limpia de Excel"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Descargar Plantilla Excel</span>
          </button>

          <button
            onClick={() => { setShowImportModal(true); setImportRows([]); setImportErrors([]); }}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition border border-stone-200"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Importar Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuevo Invitado</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip — Cuenta asistente + acompañante (+1) como cifra principal */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`luxury-card rounded-xl p-4 cursor-pointer transition select-none ${
            statusFilter === '' ? 'ring-2 ring-[#A6736E] bg-[#FFFFFF]' : 'hover:border-[#A6736E]'
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
            statusFilter === 'Confirmado' ? 'ring-2 ring-[#A6736E] shadow-xs' : 'hover:border-[#A6736E]'
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
            statusFilter === 'Pendiente de confirmar' ? 'ring-2 ring-[#A6736E] shadow-xs' : 'hover:border-[#A6736E]'
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
            statusFilter === 'No asistirá' ? 'ring-2 ring-[#A6736E] shadow-xs' : 'hover:border-[#A6736E]'
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

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#DDD2C4] shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#786C68]" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o teléfono (con o sin acentos)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#DDD2C4] rounded-xl focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {statusFilter && (
            <button
              onClick={() => { setStatusFilter(''); setPage(1); }}
              className="px-3 py-1.5 text-xs font-medium bg-[#EFE2DF] text-[#7A4E49] rounded-xl border border-[#DFC9C4] whitespace-nowrap"
            >
              Filtro: {statusFilter === 'Pendiente de confirmar' ? 'Pendientes' : statusFilter} ✕
            </button>
          )}

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
                <th className="py-3.5 px-4 whitespace-nowrap">NOMBRE Y APELLIDO</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[175px]">WHATSAPP</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap"># ACOMPAÑANTES</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[150px]">ESTATUS</th>
                <th className="py-3.5 px-4 whitespace-nowrap">MESA</th>
                <th className="py-3.5 px-4 whitespace-nowrap">OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEAE2]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#786C68]">
                    Cargando invitados...
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#786C68]">
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div
                        onClick={() => handleOpenEdit(guest)}
                        className="cursor-pointer font-semibold text-[#332C2A] group-hover:text-[#A6736E] inline-flex items-center space-x-2 whitespace-nowrap"
                      >
                        <span className="underline decoration-[#D2C4B4] decoration-1 underline-offset-4 whitespace-nowrap">
                          {guest.first_name} {guest.last_name}
                        </span>
                        <Edit2 className="w-3.5 h-3.5 text-[#C7B6A6] group-hover:text-[#A6736E] transition shrink-0" />
                      </div>
                    </td>

                    {/* WhatsApp — Single line, fits entire phone number */}
                    <td className="py-3 px-4 whitespace-nowrap min-w-[175px]">
                      <a
                        href={`https://wa.me/${guest.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-2 text-[#4A3F3C] hover:text-[#A6736E] transition font-mono whitespace-nowrap"
                        title="Abrir chat en WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#A6736E] shrink-0" />
                        <span className="whitespace-nowrap">{guest.phone}</span>
                      </a>
                    </td>

                    {/* Companion count — Single line */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5 whitespace-nowrap">
                        <span className="font-semibold text-[#332C2A] bg-[#EFE8DE] px-2.5 py-0.5 rounded-full border border-[#DDD2C4]">
                          {guest.companion_count}
                        </span>
                        <span className="text-[11px] text-[#786C68] whitespace-nowrap">
                          ({1 + guest.companion_count} {1 + guest.companion_count === 1 ? 'lugar' : 'lugares'})
                        </span>
                      </div>
                    </td>

                    {/* Inline Estatus Dropdown — Compact width */}
                    <td className="py-3 px-4 whitespace-nowrap w-[150px]">
                      <select
                        value={guest.status}
                        onChange={e => handleInlineStatusChange(guest, e.target.value as any)}
                        style={{ fontSize: '0.82rem' }}
                        className={`w-34 font-semibold rounded-lg px-2.5 py-1 border transition focus:outline-none cursor-pointer ${
                          guest.status === 'Confirmado'
                            ? 'bg-[#EFE2DF] text-[#7A4E49] border-[#DFC9C4]'
                            : guest.status === 'No asistirá'
                            ? 'bg-[#EFEBE9] text-[#6E5D59] border-[#D8CECA]'
                            : 'bg-[#EFE8DE] text-[#6D5A43] border-[#DDD2C4]'
                        }`}
                      >
                        <option value="Pendiente de confirmar">Pendiente</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="No asistirá">No asistirá</option>
                      </select>
                    </td>

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
                              : 'bg-white text-[#786C68] border-[#DDD2C4] hover:border-[#A6736E]'
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
    </div>
  );
};
