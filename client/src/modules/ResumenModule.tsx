import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Users, DollarSign, CheckCircle2,
  Clock, Sparkles, Edit3, ShieldCheck, Mail, Phone,
  ArrowRight, Calendar, Landmark, Church,
  Upload, FileText, Link as LinkIcon, ExternalLink, Trash2, Bot, Check, AlertCircle, Loader2, Camera, RotateCcw, Move, MessageSquare
} from 'lucide-react';
import { BroadcastScheduleModal } from '../components/BroadcastScheduleModal';

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
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [invitationFeedback, setInvitationFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCoordinationModal, setShowCoordinationModal] = useState(false);
  const [realTasks, setRealTasks] = useState<any[]>([]);

  const handleUploadCoverPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWedding || !token) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('cover_photo', file);

    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/cover-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setWeddingData((prev: any) => ({ ...prev, cover_photo_url: data.cover_photo_url }));
        setCurrentWedding({ ...currentWedding, cover_photo_url: data.cover_photo_url });
      } else {
        alert(data.error || 'Error al subir foto de portada.');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión.');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleDeleteCoverPhoto = async () => {
    if (!currentWedding || !token) return;
    if (!confirm('¿Deseas restablecer la foto de portada predeterminada?')) return;

    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/cover-photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setWeddingData((prev: any) => ({ ...prev, cover_photo_url: null, cover_photo_position: 'center 50%' }));
        setCurrentWedding({ ...currentWedding, cover_photo_url: null, cover_photo_position: 'center 50%' });
      }
    } catch {}
  };

  // Reposicionamiento interactivo de foto de portada
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [coverPosY, setCoverPosY] = useState(50);
  const [savingCoverPos, setSavingCoverPos] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPosY, setDragStartPosY] = useState(50);

  const parseCoverPosY = (posStr?: string) => {
    if (!posStr) return 50;
    const match = posStr.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 50;
  };

  useEffect(() => {
    if (weddingData?.cover_photo_position) {
      setCoverPosY(parseCoverPosY(weddingData.cover_photo_position));
    }
  }, [weddingData?.cover_photo_position]);

  const handleStartReposition = () => {
    setCoverPosY(parseCoverPosY(weddingData?.cover_photo_position));
    setIsRepositioning(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioning) return;
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartPosY(coverPosY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isRepositioning || !isDragging || !bannerRef.current) return;
    const bannerHeight = bannerRef.current.clientHeight || 350;
    const deltaY = e.clientY - dragStartY;
    const deltaPct = (deltaY / bannerHeight) * 100;
    const newPct = Math.max(0, Math.min(100, Math.round(dragStartPosY - deltaPct)));
    setCoverPosY(newPct);
  };

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRepositioning) return;
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragStartPosY(coverPosY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRepositioning || !isDragging || !bannerRef.current) return;
    const bannerHeight = bannerRef.current.clientHeight || 350;
    const deltaY = e.touches[0].clientY - dragStartY;
    const deltaPct = (deltaY / bannerHeight) * 100;
    const newPct = Math.max(0, Math.min(100, Math.round(dragStartPosY - deltaPct)));
    setCoverPosY(newPct);
  };

  const handleTouchEnd = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleSaveCoverPosition = async () => {
    if (!currentWedding || !token) return;
    setSavingCoverPos(true);
    const newPosition = `center ${coverPosY}%`;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/cover-position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cover_photo_position: newPosition })
      });
      const data = await res.json();
      if (res.ok) {
        setWeddingData((prev: any) => ({ ...prev, cover_photo_position: newPosition }));
        setCurrentWedding({ ...currentWedding, cover_photo_position: newPosition });
        setIsRepositioning(false);
      } else {
        alert(data.error || 'No se pudo guardar la posición.');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión.');
    } finally {
      setSavingCoverPos(false);
    }
  };

  const handleCancelReposition = () => {
    setCoverPosY(parseCoverPosY(weddingData?.cover_photo_position));
    setIsRepositioning(false);
  };

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
      const [res, catRes, checkRes] = await Promise.all([
        fetch(`/api/weddings/${currentWedding.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/catalogs', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}/checklist`, {
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
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (Array.isArray(checkData.tasks)) {
          setRealTasks(checkData.tasks);
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

  const isPlannerVirtual = Boolean(
    weddingData.package_type &&
    (weddingData.package_type.toLowerCase().includes('virtual') ||
     weddingData.package_type.toLowerCase().includes('autónomo'))
  );
  const coordinationBrand = isPlannerVirtual ? 'Lazo Studio' : 'Viva la Bride';

  const vivaLaBrideWhatsAppUrl =
    'https://wa.me/528128663440?text=' +
    encodeURIComponent(`¡Hola Viva la Bride! Soy cliente de Lazo (${weddingData?.name || currentWedding?.name || 'mi boda'}) y me gustaría recibir información sobre los paquetes de acompañamiento y coordinación presencial para mi evento.`);

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

  // Finanzas dinámicas: Monto pagado vs Costo total contratado
  const totalCostoReal = Number(finance.costo_real) || 0;
  const totalPagado = Number(finance.monto_pagado) || 0;
  const targetBudget = Number(weddingData.budget) > 0 ? Number(weddingData.budget) : totalCostoReal;
  const totalRestante = Number(finance.restante) || Math.max(0, (totalCostoReal > 0 ? totalCostoReal : targetBudget) - totalPagado);
  const budgetBase = totalCostoReal > 0 ? totalCostoReal : (targetBudget > 0 ? targetBudget : 1);
  const budgetPaidPercent = Math.min(100, Math.round((totalPagado / budgetBase) * 100));

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
      {/* 1. Cabecera Hero Cinematográfica Editorial (Idéntica al Mockup Autorizado) */}
      <div className="relative rounded-[32px] overflow-hidden shadow-md border border-[#EFE8E1] bg-[#181514]">
        {/* Foto de portada cinematográfica con overlay editorial y soporte de encuadre */}
        <div
          ref={bannerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative h-72 sm:h-84 md:h-96 w-full overflow-hidden ${
            isRepositioning ? 'cursor-grab active:cursor-grabbing select-none' : ''
          }`}
        >
          <img
            src={weddingData.cover_photo_url || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80"}
            alt="Boda Cover"
            style={{
              objectPosition: isRepositioning
                ? `center ${coverPosY}%`
                : (weddingData.cover_photo_position || 'center 50%')
            }}
            className={`w-full h-full object-cover filter brightness-[0.70] contrast-[1.05] pointer-events-none select-none ${
              !isRepositioning ? 'transition-all duration-500 hover:scale-[1.02]' : 'transition-none'
            }`}
          />
          {/* Degradado cinematográfico para máxima legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181514] via-[#181514]/40 to-black/30 pointer-events-none" />

          {/* Guía flotante durante el modo reposicionamiento */}
          {isRepositioning && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-black/75 backdrop-blur-md border border-white/30 text-white text-xs font-medium flex items-center space-x-2.5 shadow-2xl animate-in fade-in zoom-in-95 pointer-events-none">
              <Move className="w-4 h-4 text-[#E8D8CE] animate-bounce" />
              <span>Arrastra hacia arriba o abajo para encuadrar ({coverPosY}%)</span>
            </div>
          )}

          {/* Botones de Cabecera (Cambiar Portada, Ajustar Encuadre & Gestionar) */}
          <div className="absolute top-5 right-5 z-30 flex items-center space-x-2">
            {isRepositioning ? (
              <>
                {/* Botones de micro-ajuste rápido */}
                <div className="hidden sm:flex items-center space-x-1 bg-black/50 backdrop-blur-md border border-white/20 rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => setCoverPosY(p => Math.max(0, p - 5))}
                    title="Mover hacia arriba"
                    className="px-2 py-1 text-white hover:text-[#E8D8CE] text-xs font-bold transition cursor-pointer"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverPosY(p => Math.min(100, p + 5))}
                    title="Mover hacia abajo"
                    className="px-2 py-1 text-white hover:text-[#E8D8CE] text-xs font-bold transition cursor-pointer"
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCancelReposition}
                  disabled={savingCoverPos}
                  className="px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCoverPosition}
                  disabled={savingCoverPos}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#C48B81] hover:bg-[#B3796F] text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  {savingCoverPos ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Guardar</span>
                </button>
              </>
            ) : (
              <>
                {/* Botón Cambiar Foto de Portada */}
                <label className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/25 text-white text-xs font-medium cursor-pointer transition shadow-sm select-none">
                  {uploadingCover ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8D8CE]" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-[#E8D8CE]" />
                  )}
                  <span>{uploadingCover ? 'Subiendo...' : 'Cambiar Foto'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={handleUploadCoverPhoto}
                  />
                </label>

                {/* Botón Ajustar Posición de la Foto */}
                <button
                  type="button"
                  onClick={handleStartReposition}
                  title="Mover y encuadrar la foto"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/25 text-white text-xs font-medium cursor-pointer transition shadow-sm select-none"
                >
                  <Move className="w-3.5 h-3.5 text-[#E8D8CE]" />
                  <span className="hidden sm:inline">Ajustar</span>
                </button>

                {/* Botón Restablecer Foto si tiene foto personalizada */}
                {weddingData.cover_photo_url && (
                  <button
                    type="button"
                    onClick={handleDeleteCoverPhoto}
                    title="Restablecer foto predeterminada"
                    className="p-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/25 text-white/80 hover:text-white transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Botón Gestionar Boda (Solo Admin / Coordinador) */}
                {(user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR') && (
                  <button
                    onClick={() => setShowEditWeddingModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/25 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#E8D8CE]" />
                    <span className="hidden sm:inline">Gestionar</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Contenido Central: Nombres Monumentales & Píldora Flotante */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <h1 className="font-novios text-4xl sm:text-6xl md:text-7xl font-normal tracking-wide text-white drop-shadow-md select-none">
              {weddingData.partner_1_name && weddingData.partner_2_name ? (
                <>
                  <span>{weddingData.partner_1_name.toUpperCase()}</span>{' '}
                  <span className="font-novios italic text-[#E8D8CE] mx-2 font-normal">&</span>{' '}
                  <span>{weddingData.partner_2_name.toUpperCase()}</span>
                </>
              ) : coupleTitle.includes('&') ? (
                <>
                  <span>{coupleTitle.split('&')[0].trim().toUpperCase()}</span>{' '}
                  <span className="font-novios italic text-[#E8D8CE] mx-2 font-normal">&</span>{' '}
                  <span>{coupleTitle.split('&').slice(1).join('&').trim().toUpperCase()}</span>
                </>
              ) : (
                <span>{coupleTitle.toUpperCase()}</span>
              )}
            </h1>

            {/* Píldora Glassmorphic Centrada */}
            {weddingData.wedding_date && (
              <div className="inline-flex items-center space-x-2.5 px-6 py-2 rounded-full bg-white/20 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white text-xs sm:text-sm font-medium tracking-wide shadow-lg transition">
                <Sparkles className="w-3.5 h-3.5 text-[#E8D8CE]" />
                <span className="font-bold uppercase tracking-wider text-[11px] sm:text-xs">
                  {getCountdownText(weddingData.wedding_date)}
                </span>
                <span className="opacity-60">·</span>
                <span className="font-light">
                  {formatFullDateSpanish(weddingData.wedding_date)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tira Editorial Inferior en Fondo Alabaster Cálido (Civil, Religiosa, Recepción) */}
        <div className="bg-[#FAF8F5] p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 border-t border-[#EFE8E1]">
          {/* 1. Ceremonia Civil */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#7D6F6B]">
              <Landmark className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Ceremonia Civil</span>
            </div>
            <div className="text-sm font-semibold text-[#181514] font-sans mt-0.5 leading-snug break-words">
              {civilInfo.location || 'Lugar por definir'}
            </div>
            <div className="text-xs text-[#7D6F6B] leading-snug break-words">
              {civilInfo.time ? `${civilInfo.time} hrs` : 'Horario por definir'}
              {civilInfo.date && civilInfo.date !== weddingData.wedding_date ? ` · ${civilInfo.date}` : ''}
            </div>
          </div>

          {/* 2. Ceremonia Religiosa */}
          <div className="space-y-1 md:border-l md:border-[#EFE8E1] md:pl-6 lg:pl-8">
            <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#7D6F6B]">
              <Church className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Ceremonia Religiosa</span>
            </div>
            <div className="text-sm font-semibold text-[#181514] font-sans mt-0.5 leading-snug break-words">
              {relInfo.temple_name || weddingData.ceremony_venue || 'Lugar por definir'}
            </div>
            <div className="text-xs text-[#7D6F6B] leading-snug break-words">
              {relInfo.time || weddingData.ceremony_time ? `${relInfo.time || weddingData.ceremony_time} hrs` : 'Horario por definir'}
            </div>
          </div>

          {/* 3. Recepción */}
          <div className="space-y-1 md:border-l md:border-[#EFE8E1] md:pl-6 lg:pl-8">
            <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#7D6F6B]">
              <MapPin className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Recepción</span>
            </div>
            <div className="text-sm font-semibold text-[#181514] font-sans mt-0.5 leading-snug break-words">
              {weddingData.reception_venue || 'Lugar por definir'}
            </div>
            <div className="text-xs text-[#7D6F6B] leading-snug break-words">
              {weddingData.reception_time ? `${weddingData.reception_time} hrs` : 'Horario por definir'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas Principales (Diseño Editorial Minimalista & Escultural) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Asistencia & Invitados */}
        <div
          onClick={() => onNavigateTab('invitados')}
          className="bg-[#FAF8F5] rounded-[28px] p-6 sm:p-7 border border-[#EFE8E1] cursor-pointer group flex flex-col justify-between hover:border-[#C48B81]/40 transition-all shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(196,139,129,0.08)]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[#7D6F6B] uppercase tracking-widest">01 / Asistencia</span>
              <Users className="w-4 h-4 text-[#C48B81] group-hover:scale-110 transition-transform" />
            </div>

            <div className="py-2">
              <div className="flex items-baseline space-x-2">
                <span className="font-novios text-4xl sm:text-5xl font-normal text-[#181514] tracking-tight">
                  {confirmedSeats}
                </span>
                <span className="text-sm font-light text-[#7D6F6B]">
                  / {totalSeats > 0 ? totalSeats : 1} esperados
                </span>
              </div>
              <p className="text-xs text-[#7D6F6B] mt-1 font-light">
                {rsvpPercent > 0 ? `${rsvpPercent}% de asistencia confirmada` : 'Esperando primeras confirmaciones'}
              </p>

              {/* Barra hairline continua */}
              <div className="w-full h-1.5 bg-[#EFE8E1] rounded-full overflow-hidden mt-4 mb-1">
                <div
                  className="h-full bg-[#C48B81] rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(rsvpPercent, 2)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="pt-4 border-t border-[#EFE8E1]/80 flex items-center justify-between text-xs">
            <span className="inline-flex items-center space-x-1.5 text-[#2B2826] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#C48B81]" />
              <span>{confirmedSeats} Confirmados</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 text-[#7D6F6B]">
              <span className="w-2 h-2 rounded-full bg-[#EAE3DA]" />
              <span>{Math.max(0, totalSeats - confirmedSeats)} Pendientes</span>
            </span>
          </div>
        </div>

        {/* Card 2: Control Financiero */}
        <div
          onClick={() => onNavigateTab('proveedores')}
          className="bg-[#FAF8F5] rounded-[28px] p-6 sm:p-7 border border-[#EFE8E1] cursor-pointer group flex flex-col justify-between hover:border-[#C48B81]/40 transition-all shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(196,139,129,0.08)]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[#7D6F6B] uppercase tracking-widest">02 / Presupuesto</span>
              <DollarSign className="w-4 h-4 text-[#C48B81] group-hover:scale-110 transition-transform" />
            </div>

            <div className="py-2">
              {totalCostoReal > 0 || totalPagado > 0 ? (
                <>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-novios text-4xl sm:text-5xl font-normal text-[#181514] tracking-tight">
                      ${totalPagado.toLocaleString()}
                    </span>
                    <span className="text-sm font-light text-[#7D6F6B]">
                      / ${(totalCostoReal > 0 ? totalCostoReal : targetBudget).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#7D6F6B] mt-1 font-light">
                    {budgetPaidPercent}% cubierto al momento
                  </p>

                  {/* Barra hairline continua */}
                  <div className="w-full h-1.5 bg-[#EFE8E1] rounded-full overflow-hidden mt-4 mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-[#D9A59B] to-[#C48B81] rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(budgetPaidPercent, 2)}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="py-1 space-y-1">
                  <span className="font-novios text-3xl sm:text-4xl font-normal text-[#181514] tracking-tight">
                    Por definir
                  </span>
                  <p className="text-xs text-[#7D6F6B] font-light">
                    Agrega proveedores o costos para monitorear tu inversión.
                  </p>
                  <div className="w-full h-1.5 bg-[#EFE8E1] rounded-full mt-4 mb-1" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#EFE8E1]/80 flex items-center justify-between text-xs">
            <span className="text-[#7D6F6B]">Restante por pagar</span>
            <span className="font-semibold text-[#A86B60]">${totalRestante.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: Siguientes Pasos & Checklist */}
        <div
          onClick={() => onNavigateTab('checklist')}
          className="bg-[#FAF8F5] rounded-[28px] p-6 sm:p-7 border border-[#EFE8E1] cursor-pointer group flex flex-col justify-between hover:border-[#C48B81]/40 transition-all shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(196,139,129,0.08)]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[#7D6F6B] uppercase tracking-widest">03 / Siguientes Pasos</span>
              <CheckCircle2 className="w-4 h-4 text-[#C48B81] group-hover:scale-110 transition-transform" />
            </div>

            <div className="space-y-2 py-1">
              {(() => {
                const pendingTasks = realTasks.filter(t => t.status !== 'Completada');
                const displayTasks = pendingTasks.length > 0 ? pendingTasks.slice(0, 3) : realTasks.slice(0, 3);

                if (displayTasks.length === 0) {
                  return (
                    <div className="text-center py-6 px-3 text-xs text-[#7D6F6B] bg-white/60 rounded-2xl border border-dashed border-[#EFE8E1]">
                      <span>Todo al día. No hay tareas pendientes inmediatas.</span>
                    </div>
                  );
                }

                return displayTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-[#EFE8E1]/80 transition group-hover:border-[#EFE8E1] gap-2.5"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        task.status === 'Completada' ? 'bg-[#4B634D]' : task.status === 'En proceso' ? 'bg-[#C48B81]' : 'bg-[#D9CFC4]'
                      }`} />
                      <span className="text-xs font-medium text-[#2B2826] truncate" title={task.title}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7D6F6B] font-light shrink-0">
                      {task.status === 'Completada' ? 'Completado' : task.status === 'En proceso' ? 'En marcha' : 'Prioritario'}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="pt-4 border-t border-[#EFE8E1]/80 flex items-center justify-between text-xs text-[#C48B81] font-medium">
            <span>Explorar Checklist Completo</span>
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
              className="px-4 py-2 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
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
                    className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#EFE8E1] rounded-xl text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                  />
                  {weddingData.invitation_url && (
                    <a
                      href={weddingData.invitation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-white border border-[#EFE8E1] text-[#7D6F6B] hover:text-[#C48B81] transition shadow-2xs shrink-0"
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
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#FAF7F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EFE8E1] rounded-lg transition"
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
                  <div className="text-center py-4 px-3 border-2 border-dashed border-[#EFE8E1] rounded-xl bg-white">
                    <FileText className="w-8 h-8 mx-auto text-[#C7B6A6] mb-2" />
                    <p className="text-xs text-[#2B2826] font-semibold">
                      Aún no has subido el archivo PDF
                    </p>
                    <p className="text-[11px] text-[#7D6F6B] mt-0.5 mb-3">
                      Sube el PDF diseñado de la boda (máximo 25 MB).
                    </p>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-2xs">
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
                    <label className="inline-flex items-center space-x-1.5 text-xs text-[#C48B81] hover:underline cursor-pointer font-semibold">
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
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FAF7F5] border border-[#EFE8E1] rounded-xl text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
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
                      : 'bg-[#FAF7F5] border-[#EFE8E1] text-[#7D6F6B]'
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
                  <span className="font-bold text-[#2B2826]">3. Ficha Final & Entrega</span>
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

      {/* Envíos Automáticos Programados por WhatsApp (7 Días Antes & Día del Evento) */}
      {canSeeStaffSection && (
        <div className="luxury-card rounded-[28px] p-6 sm:p-8 border border-[#EFE8E1] bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F5EFEB]">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#A86B60] uppercase tracking-wider">
                <Clock className="w-4 h-4 text-[#C48B81]" />
                <span>Difusiones Automatizadas por WhatsApp</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2826] mt-1">
                Recordatorio 7 Días Antes & Mesas Día del Evento
              </h3>
              <p className="text-xs sm:text-sm text-[#7D6F6B] mt-1 leading-relaxed">
                Mensajes programados que se disparan automáticamente a los invitados confirmados para compartir la ubicación, dress code y su asignación de mesa.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer shrink-0"
            >
              <Clock className="w-4 h-4" />
              <span>Configurar & Programar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
            {/* Card 1: Recordatorio 7 Días */}
            <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBDCC5]/50 text-[#8A6332]">
                    📍 Plantilla 2 · Recordatorio
                  </span>
                  <span className="text-xs font-semibold text-[#25D366] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                    <span>7 Días Antes ({weddingData?.reminder_7days_time || '11:00'} hrs)</span>
                  </span>
                </div>
                <h4 className="font-serif text-lg font-bold text-[#332A28] mt-2">
                  Ubicación, Dress Code y Horarios
                </h4>
                <p className="text-xs text-[#7D6F6B] mt-1 leading-relaxed">
                  Envía el recordatorio editorial formal con templo, recepción, dress code y mapas a todos los invitados que tengan estatus <strong>Confirmado</strong>.
                </p>
              </div>

              <div className="pt-3 border-t border-[#EFE8E1]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#7D6F6B]">
                  Estatus:{' '}
                  <strong className="text-[#332A28]">
                    {weddingData?.reminder_7days_status === 'SENT' ? 'Enviado ✓' : 'Programado'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  className="text-xs font-bold text-[#C48B81] hover:underline cursor-pointer"
                >
                  Editar texto u hora →
                </button>
              </div>
            </div>

            {/* Card 2: Mesa Día del Evento */}
            <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E4ECE5] text-[#2B5235]">
                    🍽️ Plantilla 3 · Día de la Boda
                  </span>
                  <span className="text-xs font-semibold text-[#25D366] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                    <span>Día del Evento ({weddingData?.dayof_seating_time || '12:00'} hrs)</span>
                  </span>
                </div>
                <h4 className="font-serif text-lg font-bold text-[#332A28] mt-2">
                  Asignación de Mesa y Bienvenida
                </h4>
                <p className="text-xs text-[#7D6F6B] mt-1 leading-relaxed">
                  El día de la boda entrega el número y nombre de mesa asignada a los confirmados para que lleguen directamente a su lugar con el equipo {isPlannerVirtual ? 'de recepción' : 'Viva la Bride'}.
                </p>
              </div>

              <div className="pt-3 border-t border-[#EFE8E1]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#7D6F6B]">
                  Estatus:{' '}
                  <strong className="text-[#332A28]">
                    {weddingData?.dayof_seating_status === 'SENT' ? 'Enviado ✓' : 'Programado'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  className="text-xs font-bold text-[#C48B81] hover:underline cursor-pointer"
                >
                  Editar texto u hora →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Luxury Concierge Card for Novios in Virtual / Autonomous Mode */}
      {isNovios && isPlannerVirtual && (
        <div className="bg-[#FAF8F5] rounded-3xl p-6 sm:p-8 border border-[#EFE8E1] shadow-2xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-medium bg-white text-[#7D6F6B] border border-[#EFE8E1] shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E8C70]" />
                <span className="font-semibold text-[#2B2826]">Dirección Presencial Disponible</span>
                <span className="text-[#EFE8E1]">·</span>
                <span className="text-[#8A7E72]">Viva la Bride</span>
              </div>
              <h3 className="font-novios text-2xl sm:text-3xl text-[#2B2826] font-normal tracking-tight">
                ¿Deseas que nuestro equipo dirija tu boda en sitio?
              </h3>
              <p className="text-xs sm:text-sm text-[#7D6F6B] font-light leading-relaxed">
                Tu plataforma digital te da control total. Si buscas que coordinadores profesionales supervisen minuto a minuto, proveedores y montaje el gran día, conoce nuestros servicios presenciales de alta gama.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowCoordinationModal(true)}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium rounded-full shadow-2xs transition cursor-pointer"
              >
                <span>Conocer Servicios de Coordinación</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C48B81]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 4: Equipo Staff Asignado (OCULTO PARA NOVIOS, VISIBLE SOLO PARA ADMIN Y COORD) */}
      {canSeeStaffSection && (
        <div className="luxury-card rounded-2xl p-6 sm:p-7 border border-[#EFE8E1] bg-[#FFFFFF] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#F7F3EE]">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#7D6F6B] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#C48B81]" />
                <span>Gestión Operativa {coordinationBrand}</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#332A28] mt-1">
                Equipo {coordinationBrand} / Staff Asignado
              </h3>
              <p className="text-xs text-[#7D6F6B] mt-0.5 leading-relaxed">
                Coordinadores y staff con acceso operativo a esta boda (visible únicamente para administradores y coordinadores).
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('directorio')}
              className="text-xs font-semibold text-[#C48B81] hover:text-[#A86B60] hover:underline flex items-center space-x-1.5 self-start sm:self-auto"
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
                  className="p-4 rounded-xl border border-[#EFE8E1] bg-[#FCFAF7] hover:bg-[#F7F3EE] transition flex items-start space-x-3.5"
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#CCDACC] shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#EFE2DF] text-[#A86B60] font-serif font-bold text-base flex items-center justify-center shrink-0 border border-[#EFE8E1]">
                      {member.name?.charAt(0)?.toUpperCase() || 'V'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm text-[#332A28] truncate">{member.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFE2DF] text-[#A86B60] font-medium shrink-0">
                        {member.assigned_role || member.role}
                      </span>
                    </div>
                    <div className="text-xs text-[#7D6F6B] truncate mt-1.5 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-[#C48B81]" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="text-xs text-[#7D6F6B] truncate mt-1 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-[#C48B81]" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-7 text-xs text-[#7D6F6B] bg-[#FCFAF7] rounded-xl border border-dashed border-[#EFE8E1]">
              No hay coordinadores o staff asignados registrados aún para esta boda.
            </div>
          )}
        </div>
      )}

      {/* Modal: Editar Boda */}
      {showEditWeddingModal && (
        <div className="fixed inset-0 bg-[#332A28]/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#EFE8E1] max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-2xl font-bold text-[#332A28] mb-4">Editar Datos Operativos</h3>
            <form onSubmit={handleSaveWeddingEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#332A28] mb-1">Nombre de la Boda</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
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
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Novio / Contrayente 2</label>
                  <input
                    type="text"
                    required
                    value={editForm.partner_2_name || ''}
                    onChange={e => setEditForm({ ...editForm, partner_2_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
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
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Invitados Estimados</label>
                  <input
                    type="number"
                    value={editForm.estimated_guests || ''}
                    onChange={e => setEditForm({ ...editForm, estimated_guests: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
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
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Lugar Recepción</label>
                  <input
                    type="text"
                    value={editForm.reception_venue || ''}
                    onChange={e => setEditForm({ ...editForm, reception_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Paquete Contratado</label>
                  <select
                    value={editForm.package_type || 'Integral'}
                    onChange={e => setEditForm({ ...editForm, package_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
                  >
                    {packagesList.length > 0 ? (
                      packagesList.map(pkg => (
                        <option key={pkg.name} value={pkg.name}>
                          {pkg.name === 'Planner Virtual'
                            ? 'Planner Virtual Autónomo (Solo Suite Digital)'
                            : `Coordinación Viva la Bride — ${pkg.name} (${pkg.maxMeetings >= 999 ? 'Ilimitadas' : `${pkg.maxMeetings} reuniones`})`}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Planner Virtual">Planner Virtual Autónomo (Solo Suite Digital)</option>
                        <option value="Esencial">Coordinación Viva la Bride — Esencial (2 reuniones)</option>
                        <option value="Integral">Coordinación Viva la Bride — Integral (4 reuniones)</option>
                        <option value="Exclusivo">Coordinación Viva la Bride — Exclusivo (Ilimitado)</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332A28] mb-1">Estatus del Evento</label>
                  <select
                    value={editForm.status || 'PLANNING'}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm"
                  >
                    <option value="PLANNING">PLANNING (En planeación)</option>
                    <option value="UPCOMING">UPCOMING (Próxima)</option>
                    <option value="COMPLETED">COMPLETED (Realizada)</option>
                    <option value="CANCELLED">CANCELLED (Cancelada)</option>
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
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#C48B81] text-[#FFFFFF] rounded-xl hover:bg-[#A86B60]"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Programación de Envíos WhatsApp (Recordatorio 7 días & Asignación de mesa) */}
      {showBroadcastModal && currentWedding && (
        <BroadcastScheduleModal
          isOpen={showBroadcastModal}
          onClose={() => {
            setShowBroadcastModal(false);
            // Refresh wedding data to pick up new statuses
            if (currentWedding?.id) {
              fetch(`/api/weddings/${currentWedding.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
                .then(r => r.json())
                .then(d => {
                  if (d.wedding) setWeddingData(d.wedding);
                })
                .catch(() => {});
            }
          }}
          weddingId={currentWedding.id}
          token={token}
          weddingName={currentWedding.name}
          weddingDate={currentWedding.wedding_date || currentWedding.date}
        />
      )}
      {/* Modal: Servicios de Coordinación Viva la Bride para Novios */}
      {showCoordinationModal && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#EFE8E1] max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-[#FAF8F5]">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
                  Exclusivo Viva la Bride
                </span>
                <h3 className="font-novios text-2xl sm:text-3xl text-[#2B2826] mt-1 font-normal">
                  Coordinación & Dirección Presencial
                </h3>
                <p className="text-xs text-[#7D6F6B] mt-1 font-light leading-relaxed">
                  Para novias que desean delegar la supervisión de proveedores, minuto a minuto y montaje en manos de nuestro equipo profesional el gran día.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCoordinationModal(false)}
                className="text-[#8A7E72] hover:text-[#2B2826] p-1.5 rounded-full hover:bg-[#FAF8F5] transition cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {/* Pilar 1 */}
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EFE8E1] space-y-2">
                <span className="font-novios text-2xl text-[#C48B81]">01</span>
                <h4 className="font-novios text-base text-[#2B2826] font-normal">
                  Asesoría Personalizada
                </h4>
                <p className="text-xs text-[#7D6F6B] leading-relaxed font-light">
                  Sesiones 1 a 1 para afinar presupuesto, resolver dudas técnicas y revisar contratos de tus proveedores clave.
                </p>
              </div>

              {/* Pilar 2 */}
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EFE8E1] space-y-2">
                <span className="font-novios text-2xl text-[#C48B81]">02</span>
                <h4 className="font-novios text-base text-[#2B2826] font-normal">
                  Minuto a Minuto Oficial
                </h4>
                <p className="text-xs text-[#7D6F6B] leading-relaxed font-light">
                  Diseño de la escaleta técnica y logística, alineación con la locación y timing exacto de cada momento de tu evento.
                </p>
              </div>

              {/* Pilar 3 */}
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EFE8E1] space-y-2">
                <span className="font-novios text-2xl text-[#C48B81]">03</span>
                <h4 className="font-novios text-base text-[#2B2826] font-normal">
                  Dirección: El Gran Día
                </h4>
                <p className="text-xs text-[#7D6F6B] leading-relaxed font-light">
                  Coordinador titular y equipo de staff presencial en sitio para supervisar montaje, tiempos y resolver cualquier imprevisto.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EFE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[#7D6F6B] font-light">
                <span className="w-2 h-2 rounded-full bg-[#6E8C70]" />
                <span>Atención directa y personalizada por WhatsApp</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCoordinationModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs text-[#7D6F6B] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer font-medium"
                >
                  Cerrar
                </button>
                <a
                  href={vivaLaBrideWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium rounded-full shadow-2xs transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Hablar con Dirección de Viva la Bride</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
