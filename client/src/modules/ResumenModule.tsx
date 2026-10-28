import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Users, DollarSign, CheckCircle2,
  Clock, Sparkles, Edit3, ShieldCheck, Mail, Phone,
  ArrowRight, Calendar, Landmark, Church,
  Upload, FileText, Link as LinkIcon, ExternalLink, Trash2, Bot, Check, AlertCircle, Loader2
} from 'lucide-react';

interface ResumenProps {
  onNavigateTab: (tab: any) => void;
}

export const ResumenModule: React.FC<ResumenProps> = ({ onNavigateTab }) => {
  const { currentWedding, setCurrentWedding, token, user } = useAuth();
  const [weddingData, setWeddingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditWeddingModal, setShowEditWeddingModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [packagesList, setPackagesList] = useState<{ name: string; maxMeetings: number; description: string }[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [invitationFeedback, setInvitationFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUploadInvitationPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWedding || !token) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setInvitationFeedback({ text: 'El archivo debe estar en formato PDF.', type: 'error' });
      return;
    }

    setUploadingPdf(true);
    setInvitationFeedback(null);
    const formData = new FormData();
    formData.append('invitation_file', file);

    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/invitation-file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setInvitationFeedback({ text: '¡Invitación en PDF guardada y lista para WhatsApp!', type: 'success' });
        fetchWeddingDetails();
        setCurrentWedding({ ...currentWedding, invitation_type: 'PDF', invitation_pdf_url: data.invitation_pdf_url, invitation_pdf_filename: data.invitation_pdf_filename });
      } else {
        setInvitationFeedback({ text: data.error || 'Error al subir PDF.', type: 'error' });
      }
    } catch (err: any) {
      setInvitationFeedback({ text: err.message || 'Error de conexión', type: 'error' });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeleteInvitationPdf = async () => {
    if (!currentWedding || !token) return;
    if (!confirm('¿Deseas eliminar la invitación en PDF y volver al modo de enlace web?')) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/invitation-file`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setInvitationFeedback({ text: 'Invitación en PDF eliminada.', type: 'success' });
        fetchWeddingDetails();
        setCurrentWedding({ ...currentWedding, invitation_type: 'LINK', invitation_pdf_url: null, invitation_pdf_filename: null });
      }
    } catch {}
  };

  const handleSaveInvitationSettings = async () => {
    if (!currentWedding || !token) return;
    setSavingSettings(true);
    setInvitationFeedback(null);
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invitation_type: weddingData.invitation_type || 'LINK',
          invitation_url: weddingData.invitation_url || '',
          dress_code: weddingData.dress_code || '',
          no_children: Boolean(weddingData.no_children)
        })
      });
      if (res.ok) {
        setInvitationFeedback({ text: 'Configuración guardada exitosamente.', type: 'success' });
        fetchWeddingDetails();
      } else {
        setInvitationFeedback({ text: 'No se pudo guardar la configuración.', type: 'error' });
      }
    } catch (err: any) {
      setInvitationFeedback({ text: 'Error al guardar.', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchWeddingDetails = async () => {
    if (!currentWedding) return;
    try {
      const [res, catRes] = await Promise.all([
        fetch(`/api/weddings/${currentWedding.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/catalogs', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (res.ok) {
        const data = await res.json();
        setWeddingData(data.wedding);
        setEditForm(data.wedding);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData.catalogs?.meeting_packages)) {
          setPackagesList(catData.catalogs.meeting_packages);
        }
      }
    } catch (err) {
      console.error('Error fetching wedding details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentWedding && token) {
      fetchWeddingDetails();
    }
  }, [currentWedding, token]);

  const handleSaveWeddingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setShowEditWeddingModal(false);
        fetchWeddingDetails();
        setCurrentWedding({ ...currentWedding!, ...editForm });
      }
    } catch {}
  };

  if (loading || !weddingData) {
    return <div className="py-20 text-center text-[#7D6F6B] text-sm">Cargando información de la boda...</div>;
  }

  const stats = weddingData.stats || {};
  const guestStats = stats.guests || {};
  const finance = stats.finance || {};

  // Requirement 4: Strictly only ADMINISTRADOR and COORDINADOR can see internal team
  const canSeeStaffSection = user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR';

  // Helper para convertir nombres a Title Case y evitar empalmes de letras mayúsculas en Atteron
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(w => (w === '&' || w === 'y' ? '&' : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  };

  const coupleTitle = toTitleCase(
    weddingData.partner_1_name && weddingData.partner_2_name
      ? `${weddingData.partner_1_name} & ${weddingData.partner_2_name}`
      : weddingData.name
  );

  // Finanzas con cálculo seguro y porcentaje real
  const budgetSpent = Number(finance.costo_real) || 0;
  const budgetGoal = Number(weddingData.budget) || Number(finance.presupuesto_estimado) || (budgetSpent > 0 ? budgetSpent : 150000);
  const budgetPercent = budgetGoal > 0 ? Math.min(100, Math.round((budgetSpent / budgetGoal) * 100)) : 0;

  const getCountdownText = (dateStr: string) => {
    if (!dateStr) return '';
    const target = new Date(dateStr);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `Faltan ${diffDays} días`;
    if (diffDays === 0) return '¡Hoy es la boda!';
    return `Realizada hace ${Math.abs(diffDays)} días`;
  };

  const totalSeats = guestStats.total_seats_potential || weddingData.estimated_guests || 0;
  const confirmedSeats = guestStats.confirmed_total_seats || 0;
  const rsvpPercent = totalSeats > 0 ? Math.min(100, Math.round((confirmedSeats / totalSeats) * 100)) : 0;

  const formatFullDateSpanish = (raw?: string) => {
    if (!raw) return 'Fecha por definir';
    try {
      const [y, m, d] = raw.split('-').map(Number);
      if (!y || !m || !d) return raw;
      const dateObj = new Date(y, m - 1, d);
      const str = dateObj.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return raw;
    }
  };

  const civilInfo = weddingData.civil_ceremony || {};
  const relInfo = weddingData.religious_ceremony || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Cabecera Hero Luminosa y Cálida con Atteron y Sombras Flotantes */}
      <div className="luxury-card rounded-[28px] p-7 sm:p-9 border border-[#EFE8E1] relative overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <h1 className="font-atteron text-4xl sm:text-5xl lg:text-[54px] font-normal tracking-tight leading-tight">
              {weddingData.partner_1_name && weddingData.partner_2_name ? (
                <>
                  <span className="text-[#2B2826]">{toTitleCase(weddingData.partner_1_name)}</span>{' '}
                  <span className="text-[#C48B81] mx-1 sm:mx-2">&</span>{' '}
                  <span className="text-[#A86B60]">{toTitleCase(weddingData.partner_2_name)}</span>
                </>
              ) : coupleTitle.includes('&') ? (
                <>
                  <span className="text-[#2B2826]">{coupleTitle.split('&')[0].trim()}</span>{' '}
                  <span className="text-[#C48B81] mx-1 sm:mx-2">&</span>{' '}
                  <span className="text-[#A86B60]">{coupleTitle.split('&').slice(1).join('&').trim()}</span>
                </>
              ) : (
                <span className="text-[#2B2826]">{coupleTitle}</span>
              )}
            </h1>

            {/* Countdown pill badge en tono blush */}
            {weddingData.wedding_date && (
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#F7EDEB] text-[#A86B60] text-xs font-semibold border border-[#EEDAD6] shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#C48B81]" />
                <span>{getCountdownText(weddingData.wedding_date)}</span>
                <span className="text-[#A86B60]/60">·</span>
                <span className="font-normal">{formatFullDateSpanish(weddingData.wedding_date)}</span>
              </div>
            )}
          </div>

          {/* Quick Actions & Botón Gestionar Boda (Pill Rose Satin Glow) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateTab('invitados')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#FAF7F5] hover:bg-[#F5EFEB] text-[#2B2826] border border-[#EFE8E1] text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>+ Invitado</span>
            </button>

            <button
              onClick={() => onNavigateTab('proveedores')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#FAF7F5] hover:bg-[#F5EFEB] text-[#2B2826] border border-[#EFE8E1] text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#78967A]" />
              <span>+ Registrar Pago</span>
            </button>

            {(user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR') && (
              <button
                onClick={() => setShowEditWeddingModal(true)}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full bg-[#C48B81] hover:bg-[#B3796F] text-white text-xs sm:text-sm font-semibold transition shadow-[0_6px_20px_-3px_rgba(196,139,129,0.35)] hover:shadow-[0_8px_24px_-3px_rgba(196,139,129,0.45)] cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Gestionar Boda</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Fichas Informativas debajo del nombre: Fecha, Civil, Religiosa, Recepción */}
        <div className="pt-3 border-t border-[#F5EFEB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Fecha de la Boda */}
          <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1] flex items-start space-x-3 transition hover:bg-white hover:shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#EFE8E1] flex items-center justify-center text-[#C48B81] shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#7D6F6B]">
                Fecha de la Boda
              </div>
              <div className="text-sm font-semibold text-[#2B2826] mt-0.5 leading-snug break-words">
                {formatFullDateSpanish(weddingData.wedding_date)}
              </div>
            </div>
          </div>

          {/* 2. Ceremonia Civil */}
          <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1] flex items-start space-x-3 transition hover:bg-white hover:shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#EFE8E1] flex items-center justify-center text-[#C48B81] shrink-0 mt-0.5">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#7D6F6B]">
                Ceremonia Civil
              </div>
              <div className="text-sm font-semibold text-[#2B2826] mt-0.5 leading-snug break-words">
                {civilInfo.location || 'Lugar por definir'}
              </div>
              <div className="text-[11px] text-[#7D6F6B] mt-0.5 leading-snug break-words">
                {civilInfo.time ? `${civilInfo.time} hrs` : 'Horario por definir'}
                {civilInfo.date && civilInfo.date !== weddingData.wedding_date ? ` · ${civilInfo.date}` : ''}
              </div>
            </div>
          </div>

          {/* 3. Ceremonia Religiosa */}
          <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1] flex items-start space-x-3 transition hover:bg-white hover:shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#EFE8E1] flex items-center justify-center text-[#C48B81] shrink-0 mt-0.5">
              <Church className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#7D6F6B]">
                Ceremonia Religiosa
              </div>
              <div className="text-sm font-semibold text-[#2B2826] mt-0.5 leading-snug break-words">
                {relInfo.temple_name || weddingData.ceremony_venue || 'Lugar por definir'}
              </div>
              <div className="text-[11px] text-[#7D6F6B] mt-0.5 leading-snug break-words">
                {relInfo.time || weddingData.ceremony_time ? `${relInfo.time || weddingData.ceremony_time} hrs` : 'Horario por definir'}
              </div>
            </div>
          </div>

          {/* 4. Recepción */}
          <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1] flex items-start space-x-3 transition hover:bg-white hover:shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#EFE8E1] flex items-center justify-center text-[#C48B81] shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#7D6F6B]">
                Recepción
              </div>
              <div className="text-sm font-semibold text-[#2B2826] mt-0.5 leading-snug break-words">
                {weddingData.reception_venue || 'Lugar por definir'}
              </div>
              <div className="text-[11px] text-[#7D6F6B] mt-0.5 leading-snug break-words">
                {weddingData.reception_time ? `${weddingData.reception_time} hrs` : 'Horario por definir'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas Principales (RSVP Radial Ring, Presupuesto y Tareas — MOCKUP STYLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: RSVP Guest Tracker con Anillo Radial */}
        <div
          onClick={() => onNavigateTab('invitados')}
          className="luxury-card rounded-[28px] p-6 sm:p-7 border border-[#EFE8E1] cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-4">
              <span className="font-sans text-base sm:text-lg font-bold text-[#2B2826] tracking-tight">RSVP Guest Tracker</span>
              <Users className="w-4 h-4 text-[#C48B81] group-hover:scale-110 transition-transform" />
            </div>

            {/* Circular Progress Ring */}
            <div className="flex items-center justify-center py-3">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#F7EDEB"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#C48B81"
                    strokeWidth="8"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 - (263.89 * rsvpPercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-sans font-bold text-[#2B2826] leading-none">
                    {rsvpPercent}%
                  </span>
                  <span className="text-[11px] text-[#7D6F6B] font-medium mt-1">
                    Confirmados
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="pt-4 border-t border-[#F5EFEB] flex items-center justify-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-[#F7EDEB] text-[#A86B60] text-xs font-semibold">
              {confirmedSeats} Confirmados
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-[#FAF7F5] text-[#7D6F6B] border border-[#EFE8E1] text-xs font-medium">
              {Math.max(0, totalSeats - confirmedSeats)} Pendientes
            </span>
          </div>
        </div>

        {/* Card 2: Presupuesto & Finanzas */}
        <div
          onClick={() => onNavigateTab('proveedores')}
          className="luxury-card rounded-[28px] p-6 sm:p-7 border border-[#EFE8E1] cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-4">
              <span className="font-sans text-base sm:text-lg font-bold text-[#2B2826] tracking-tight">Presupuesto</span>
              <DollarSign className="w-4 h-4 text-[#C48B81] group-hover:scale-110 transition-transform" />
            </div>

            <div className="py-2">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl sm:text-4xl font-sans font-bold text-[#2B2826] tracking-tight">
                  ${budgetSpent.toLocaleString()}
                </span>
                <span className="text-sm text-[#7D6F6B] font-normal">
                  / ${budgetGoal.toLocaleString()}
                </span>
              </div>

              {/* Progress Bar with Soft Dusty Rose Gradient */}
              <div className="w-full h-2.5 bg-[#F7EDEB] rounded-full overflow-hidden mt-5 mb-2">
                <div
                  className="h-full bg-gradient-to-r from-[#D9A59B] to-[#C48B81] rounded-full transition-all duration-700"
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#7D6F6B] mt-2">
                <span>Total Comprometido</span>
                <span className="font-semibold text-[#2B2826]">
                  {budgetPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Micro-categorías */}
          <div className="pt-4 border-t border-[#F5EFEB]">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#7D6F6B] mb-2">
              Micro-categorías activas
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 text-xs text-[#5E524E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81]" />
                <span>Banquete</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-xs text-[#5E524E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#78967A]" />
                <span>Música</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-xs text-[#5E524E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9A59B]" />
                <span>Fotografía</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Próximas Tareas & Checklist */}
        <div
          onClick={() => onNavigateTab('checklist')}
          className="luxury-card rounded-[28px] p-6 sm:p-7 border border-[#EFE8E1] cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider mb-4">
              <div>
                <h3 className="font-sans text-base sm:text-lg font-bold text-[#2B2826] tracking-tight">Próximas Tareas</h3>
                <p className="text-[11px] text-[#7D6F6B] font-normal normal-case mt-0.5">Timeline & Checklist</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[#C48B81] group-hover:scale-110 transition-transform" />
            </div>

            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F5] border border-[#EFE8E1] transition hover:bg-white">
                <span className="text-xs font-medium text-[#2B2826] truncate">Degustación de Menú</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F7EDEB] text-[#A86B60] text-[10px] font-semibold">
                  Pendiente
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F5] border border-[#EFE8E1] transition hover:bg-white">
                <span className="text-xs font-medium text-[#2B2826] truncate">Prueba de Vestido</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F7EDEB] text-[#A86B60] text-[10px] font-semibold">
                  En curso
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F5] border border-[#EFE8E1] transition hover:bg-white">
                <span className="text-xs font-medium text-[#2B2826] truncate">Confirmar Layout de Mesas</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E5EDE6] text-[#4B634D] text-[10px] font-semibold">
                  Listo
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F5EFEB] flex items-center justify-between text-xs text-[#C48B81] font-semibold">
            <span>Ver Checklist Completo</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Invitación Formal & Flujo Automatizado de RSVP (Exclusivo Administrador y Coordinador) */}
      {canSeeStaffSection && (
        <div className="luxury-card rounded-[28px] p-6 sm:p-8 border border-[#EFE8E1] bg-white shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#F5EFEB]">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#A86B60] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#C48B81]" />
              <span>RSVP Interactivo & Invitación Digital</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2826] mt-1">
              Invitación de la Boda & Bot de WhatsApp
            </h3>
            <p className="text-xs sm:text-sm text-[#7D6F6B] mt-1 leading-relaxed">
              Configura cómo reciben tus invitados la invitación formal (PDF o Enlace Canva/Web) y supervisa el flujo de confirmación automática de 4 pasos.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start lg:self-center">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E4ECE5] text-[#354B38] border border-[#CCDACC]">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
              <span>Bot Meta API Activo</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('invitados')}
              className="px-4 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Enviar a Invitados</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {invitationFeedback && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
            invitationFeedback.type === 'success'
              ? 'bg-[#E4ECE5] text-[#354B38] border border-[#CCDACC]'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <span>{invitationFeedback.text}</span>
            <button
              type="button"
              onClick={() => setInvitationFeedback(null)}
              className="font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Columna Izquierda: Configuración de la Invitación (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7D6F6B] mb-2">
                Tipo de Invitación Formal
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWeddingData({ ...weddingData, invitation_type: 'LINK' })}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                    (weddingData.invitation_type || 'LINK') === 'LINK'
                      ? 'bg-[#F7EDEB] border-[#C48B81] text-[#2B2826] shadow-2xs'
                      : 'bg-[#FAF7F5] border-[#EFE8E1] text-[#7D6F6B] hover:bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    (weddingData.invitation_type || 'LINK') === 'LINK'
                      ? 'bg-white text-[#C48B81]'
                      : 'bg-white text-[#7D6F6B]'
                  }`}>
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Enlace Digital</div>
                    <div className="text-[11px] text-[#7D6F6B] opacity-80">Canva, microsite o web</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setWeddingData({ ...weddingData, invitation_type: 'PDF' })}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                    weddingData.invitation_type === 'PDF'
                      ? 'bg-[#F7EDEB] border-[#C48B81] text-[#2B2826] shadow-2xs'
                      : 'bg-[#FAF7F5] border-[#EFE8E1] text-[#7D6F6B] hover:bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    weddingData.invitation_type === 'PDF'
                      ? 'bg-white text-[#C48B81]'
                      : 'bg-white text-[#7D6F6B]'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Archivo PDF</div>
                    <div className="text-[11px] text-[#7D6F6B] opacity-80">Documento adjunto oficial</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Input según el modo seleccionado */}
            {(weddingData.invitation_type || 'LINK') === 'LINK' ? (
              <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1] space-y-2">
                <label className="block text-xs font-bold text-[#2B2826]">
                  URL de la Invitación Web o Canva
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://www.canva.com/design/... o https://laboda.com"
                    value={weddingData.invitation_url || ''}
                    onChange={e => setWeddingData({ ...weddingData, invitation_url: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#EAE3DA] rounded-xl text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                  />
                  {weddingData.invitation_url && (
                    <a
                      href={weddingData.invitation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-white border border-[#EAE3DA] text-[#7D6F6B] hover:text-[#C48B81] transition shadow-2xs shrink-0"
                      title="Probar enlace en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-[#7D6F6B] leading-relaxed">
                  El bot enviará este enlace directamente al invitado en WhatsApp con vista previa para que pueda abrir su invitación con 1 toque.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#EFE8E1] space-y-3">
                <label className="block text-xs font-bold text-[#2B2826]">
                  Archivo PDF de la Invitación
                </label>
                {weddingData.invitation_pdf_url ? (
                  <div className="p-3.5 rounded-xl bg-white border border-[#CCDACC] flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-[#25D366] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2B2826] truncate">
                          {weddingData.invitation_pdf_filename || 'Invitacion_Boda.pdf'}
                        </div>
                        <div className="text-[10px] text-[#354B38] font-medium">
                          ✓ Listo para entrega nativa en WhatsApp
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-3">
                      <a
                        href={weddingData.invitation_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#FAF7F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EAE3DA] rounded-lg transition"
                      >
                        Ver PDF
                      </a>
                      <button
                        type="button"
                        onClick={handleDeleteInvitationPdf}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Eliminar PDF"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 px-3 border-2 border-dashed border-[#DDD2C4] rounded-xl bg-white">
                    <FileText className="w-8 h-8 mx-auto text-[#C7B6A6] mb-2" />
                    <p className="text-xs text-[#2B2826] font-semibold">
                      Aún no has subido el archivo PDF
                    </p>
                    <p className="text-[11px] text-[#7D6F6B] mt-0.5 mb-3">
                      Sube el PDF diseñado de la boda (máximo 25 MB).
                    </p>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-2xs">
                      {uploadingPdf ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Subiendo archivo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Seleccionar archivo PDF</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleUploadInvitationPdf}
                        disabled={uploadingPdf}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                {weddingData.invitation_pdf_url && (
                  <div className="pt-1">
                    <label className="inline-flex items-center space-x-1.5 text-xs text-[#9C665C] hover:underline cursor-pointer font-semibold">
                      <Upload className="w-3 h-3" />
                      <span>{uploadingPdf ? 'Reemplazando...' : 'Reemplazar por otro PDF'}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleUploadInvitationPdf}
                        disabled={uploadingPdf}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Código de Vestimenta y Sólo Adultos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">
                  Código de Vestimenta
                </label>
                <input
                  type="text"
                  placeholder="Ej. Formal Riguroso, Playa Elegante"
                  value={weddingData.dress_code || ''}
                  onChange={e => setWeddingData({ ...weddingData, dress_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FAF7F5] border border-[#EAE3DA] rounded-xl text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1">
                  Restricción de Edad
                </label>
                <div
                  onClick={() => setWeddingData({ ...weddingData, no_children: !weddingData.no_children })}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                    weddingData.no_children
                      ? 'bg-[#F7EDEB] border-[#C48B81] text-[#A86B60]'
                      : 'bg-[#FAF7F5] border-[#EAE3DA] text-[#7D6F6B]'
                  }`}
                >
                  <span>Solo Adultos (No Niños)</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    weddingData.no_children ? 'bg-[#C48B81] border-[#C48B81] text-white' : 'border-[#C7B6A6]'
                  }`}>
                    {weddingData.no_children && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveInvitationSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-[#2B2826] hover:bg-[#1E1B19] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-40"
              >
                {savingSettings ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>

          {/* Columna Derecha: Flujo Visual del Bot (5 cols) */}
          <div className="lg:col-span-5 bg-[#FAF7F5] border border-[#EFE8E1] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#7D6F6B]">
              <Bot className="w-4 h-4 text-[#C48B81]" />
              <span>Flujo Conversacional Oficial</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Paso 1 */}
              <div className="p-3.5 bg-white border border-[#EFE8E1] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2B2826]">1. Invitación Inicial</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7EDEB] text-[#A86B60] font-semibold">Meta Template</span>
                </div>
                <p className="text-[11px] text-[#7D6F6B]">
                  Envía la invitación personalizada formal con botones: <strong>[Confirmar Asistencia]</strong> y <strong>[No podré asistir]</strong>.
                </p>
              </div>

              {/* Paso 2 */}
              <div className="p-3.5 bg-white border border-[#EFE8E1] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2B2826]">2. Validación de Asistentes</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EDE6] text-[#4B634D] font-semibold">Interactivo</span>
                </div>
                <p className="text-[11px] text-[#7D6F6B]">
                  Si tiene 2+ pases: <em>"¿Confirmas la asistencia de todas las personas?"</em> con botones <strong>[Asistiremos todos]</strong> o <strong>[Modificar número]</strong>.
                </p>
              </div>

              {/* Paso 3 */}
              <div className="p-3.5 bg-white border border-[#EFE8E1] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2B2826]">3. Ficha Final & Entrega ✨</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7EDEB] text-[#A86B60] font-semibold">PDF o Enlace</span>
                </div>
                <p className="text-[11px] text-[#7D6F6B]">
                  Entrega la confirmación formal (ceremonia, recepción, dress code, pases confirmados) y adjunta el <strong>archivo PDF</strong> o <strong>enlace Canva</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Requirement 4: Equipo VLB Studio / Staff Asignado (OCULTO PARA NOVIOS, VISIBLE SOLO PARA ADMIN Y COORD) */}
      {canSeeStaffSection && (
        <div className="luxury-card rounded-2xl p-6 sm:p-7 border border-[#EAE3DA] bg-[#FFFFFF] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#F7F3EE]">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#9C665C]" />
                <span>Gestión Operativa VLB Studio</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#332A28] mt-1">
                Equipo VLB Studio / Staff Asignado
              </h3>
              <p className="text-xs text-[#7D6F6B] mt-0.5 leading-relaxed">
                Coordinadores y staff con acceso operativo a esta boda (visible únicamente para administradores y coordinadores).
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('directorio')}
              className="text-xs font-semibold text-[#9C665C] hover:text-[#8A574E] hover:underline flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <span>Ver en Directorio Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {Array.isArray(weddingData.team) && weddingData.team.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weddingData.team.map((member: any) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl border border-[#EAE3DA] bg-[#FCFAF7] hover:bg-[#F7F3EE] transition flex items-start space-x-3.5"
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#CCDACC] shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#EFE2DF] text-[#8A574E] font-serif font-bold text-base flex items-center justify-center shrink-0 border border-[#EAE3DA]">
                      {member.name?.charAt(0)?.toUpperCase() || 'V'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm text-[#332A28] truncate">{member.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFE2DF] text-[#8A574E] font-medium shrink-0">
                        {member.assigned_role || member.role}
                      </span>
                    </div>
                    <div className="text-xs text-[#7D6F6B] truncate mt-1.5 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-[#9C665C]" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="text-xs text-[#7D6F6B] truncate mt-1 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-[#9C665C]" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-7 text-xs text-[#7D6F6B] bg-[#FCFAF7] rounded-xl border border-dashed border-[#DDD2C4]">
              No hay coordinadores o staff asignados registrados aún para esta boda.
            </div>
          )}
        </div>
      )}

      {/* Modal: Editar Boda */}
      {showEditWeddingModal && (
        <div className="fixed inset-0 bg-[#332A28]/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#EAE3DA] max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-2xl font-bold text-[#332A28] mb-4">Editar Datos Operativos</h3>
            <form onSubmit={handleSaveWeddingEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#332A28] mb-1">Nombre de la Boda</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Novia / Contrayente 1</label>
                  <input
                    type="text"
                    required
                    value={editForm.partner_1_name || ''}
                    onChange={e => setEditForm({ ...editForm, partner_1_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Novio / Contrayente 2</label>
                  <input
                    type="text"
                    required
                    value={editForm.partner_2_name || ''}
                    onChange={e => setEditForm({ ...editForm, partner_2_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={editForm.wedding_date || ''}
                    onChange={e => setEditForm({ ...editForm, wedding_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Invitados Estimados</label>
                  <input
                    type="number"
                    value={editForm.estimated_guests || ''}
                    onChange={e => setEditForm({ ...editForm, estimated_guests: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Lugar Ceremonia</label>
                  <input
                    type="text"
                    value={editForm.ceremony_venue || ''}
                    onChange={e => setEditForm({ ...editForm, ceremony_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Lugar Recepción</label>
                  <input
                    type="text"
                    value={editForm.reception_venue || ''}
                    onChange={e => setEditForm({ ...editForm, reception_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Paquete Contratado</label>
                  <select
                    value={editForm.package_type || 'Integral'}
                    onChange={e => setEditForm({ ...editForm, package_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  >
                    {packagesList.length > 0 ? (
                      packagesList.map(pkg => (
                        <option key={pkg.name} value={pkg.name}>
                          {pkg.name} ({pkg.maxMeetings >= 999 ? 'Ilimitadas' : `${pkg.maxMeetings} reuniones`})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Esencial">Esencial</option>
                        <option value="Integral">Integral</option>
                        <option value="Luxury Exclusivo">Luxury Exclusivo</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Estatus del Evento</label>
                  <select
                    value={editForm.status || 'PLANNING'}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm"
                  >
                    <option value="PLANNING">PLANNING (En planeación)</option>
                    <option value="UPCOMING">UPCOMING (Próxima)</option>
                    <option value="COMPLETED">COMPLETED (Realizada)</option>
                    <option value="ARCHIVED">ARCHIVED (Archivada)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#F7F3EE]">
                <button
                  type="button"
                  onClick={() => setShowEditWeddingModal(false)}
                  className="px-4 py-2.5 text-xs text-[#7D6F6B] hover:bg-[#F7F3EE] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#9C665C] text-[#FFFFFF] rounded-xl hover:bg-[#8A574E]"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
