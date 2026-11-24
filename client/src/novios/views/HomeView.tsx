import React, { useState } from 'react';
import {
  Camera, CheckCircle2, ArrowRight, ChevronUp, ChevronDown, Move, Upload, Trash2, Plus, X, Pencil, Sparkles
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../../context/AuthContext';
import { daysUntil, formatMXN, formatShortDate } from '../data/seedWedding';
import { LazoTab } from '../types/lazo';
import { Modal } from '../components/Modal';
import { VlbCoordinationModal } from '../components/VlbCoordinationModal';

interface HomeViewProps {
  onNavigate: (tab: LazoTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { wedding, flags, updateWedding } = useWedding();
  const { currentWedding, token } = useAuth();
  const [subTab, setSubTab] = useState<'resumen' | 'estilo'>('resumen');
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverIsPortrait, setCoverIsPortrait] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showVlbModal, setShowVlbModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    partner1: '',
    partner2: '',
    weddingDate: '',
    city: '',
    estimatedGuests: '120',
    budgetGoal: '350000'
  });

  if (!wedding) return null;

  const { profile, guests, vendors, checklist, style } = wedding;
  const isNonWedding = Boolean(profile.eventType && !profile.eventType.toLowerCase().includes('boda'));
  const hasPartner2 = Boolean(profile.partner2 && profile.partner2.trim());

  const openEditProfile = () => {
    setProfileForm({
      partner1: profile.partner1,
      partner2: profile.partner2 || '',
      weddingDate: profile.weddingDate,
      city: profile.city || '',
      estimatedGuests: String(profile.estimatedGuests || 120),
      budgetGoal: String(profile.budgetGoal || 350000)
    });
    setShowEditProfile(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.partner1.trim()) return;
    updateWedding(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        partner1: profileForm.partner1.trim(),
        partner2: profileForm.partner2.trim(),
        weddingDate: profileForm.weddingDate || prev.profile.weddingDate,
        city: profileForm.city.trim(),
        estimatedGuests: Math.max(1, Number(profileForm.estimatedGuests) || 120),
        budgetGoal: Math.max(0, Number(profileForm.budgetGoal) || 0)
      }
    }));
    setShowEditProfile(false);
  };
  const days = daysUntil(profile.weddingDate);

  const confirmedPasses = guests
    .filter(g => g.status === 'Confirmado')
    .reduce((sum, g) => sum + g.passes, 0);
  const pendingPasses = guests
    .filter(g => g.status === 'Pendiente')
    .reduce((sum, g) => sum + g.passes, 0);
  const declinedPasses = guests
    .filter(g => g.status === 'No asistirá')
    .reduce((sum, g) => sum + g.passes, 0);
  const totalPasses = guests.reduce((sum, g) => sum + g.passes, 0);
  const seatedPasses = guests
    .filter(g => g.status === 'Confirmado' && g.tableId)
    .reduce((sum, g) => sum + g.passes, 0);

  const totalContracted = vendors.reduce((sum, v) => sum + v.totalCost, 0);
  const totalPaid = vendors.reduce((sum, v) => sum + v.paidAmount, 0);

  const nextTasks = checklist.filter(t => !t.completed).slice(0, 4);
  const completedCount = checklist.filter(t => t.completed).length;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload original full-resolution file directly to server (/uploads/covers/...)
    if (currentWedding?.id && token) {
      setUploadingCover(true);
      try {
        const formData = new FormData();
        formData.append('cover_photo', file);
        const res = await fetch(`/api/weddings/${currentWedding.id}/cover-photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.cover_photo_url) {
          updateWedding(prev => ({
            ...prev,
            profile: { ...prev.profile, coverPhoto: data.cover_photo_url, coverPositionY: 50, coverFitMode: 'auto' }
          }));
          e.target.value = '';
          return;
        }
      } catch {
        // Fallback to local FileReader below
      } finally {
        setUploadingCover(false);
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateWedding(prev => ({
          ...prev,
          profile: { ...prev.profile, coverPhoto: reader.result as string, coverPositionY: 50, coverFitMode: 'auto' }
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadMoodPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateWedding(prev => ({
          ...prev,
          style: {
            ...prev.style,
            photos: [
              { id: `insp_${Date.now()}`, url: reader.result as string, caption: file.name.replace(/\.[^.]+$/, '') },
              ...prev.style.photos
            ]
          }
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const nudgeCover = (delta: number) => {
    updateWedding(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        coverPositionY: Math.min(100, Math.max(0, prev.profile.coverPositionY + delta))
      }
    }));
  };

  const toggleTask = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      checklist: prev.checklist.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Luminous Editorial Magazine Spread Hero (Marfil + Rosa Empolvado + Foto Limpia) */}
      {(() => {
        const savedFit = profile.coverFitMode || 'cover';
        const useCrispFrame = savedFit === 'contain';
        const setPersistedFitMode = (nextMode: 'cover' | 'contain') => {
          updateWedding(prev => ({
            ...prev,
            profile: { ...prev.profile, coverFitMode: nextMode }
          }));
        };
        const progressPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
        const tablesCount = (wedding.tables || []).length;

        return (
          <div className="bg-white rounded-[1.5rem] sm:rounded-[1.75rem] border border-[#EFE8E1] shadow-2xs overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left 5 cols (Desktop) / Bottom (Mobile): Pure Emotional Hero (Zero Redundant KPIs) */}
              <div className="order-2 lg:order-1 lg:col-span-5 p-6 sm:p-9 lg:p-11 flex flex-col justify-center bg-gradient-to-br from-white via-[#FCF9F6] to-[#F7EDEB]/40">
                {/* Quiet Event Type Eyebrow */}
                <div className="flex items-center gap-3">
                  <span className="h-px w-7 bg-[#C48B81]/75" />
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.26em] font-medium text-[#B3786E]">
                    {(profile.eventType || 'Boda').toUpperCase()}
                  </span>
                </div>

                {/* Protagonist Event / Couple Title */}
                <h1 className="font-editorial text-4xl sm:text-[3.1rem] lg:text-[3.55rem] leading-[1.04] tracking-[-0.015em] text-[#2B2826] mt-4">
                  {hasPartner2 ? (
                    <>
                      {profile.partner1}{' '}
                      <span className="text-[#C48B81] font-light">&amp;</span>{' '}
                      {profile.partner2}
                    </>
                  ) : (
                    profile.partner1
                  )}
                </h1>

                {/* Sculptural Editorial Countdown + Date & Venue */}
                <div className="mt-7 pt-6 border-t border-[#EFE8E1] flex items-center gap-5">
                  <div className="font-editorial text-[3.25rem] sm:text-[3.75rem] leading-none text-[#C48B81] tracking-[-0.02em] shrink-0">
                    {days === 0 ? '¡Hoy!' : days}
                  </div>
                  <div className="h-11 w-px bg-[#E5D7CE] shrink-0" />
                  <div className="min-w-0 space-y-1">
                    <div className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold text-[#2B2826]">
                      {days === 0
                        ? isNonWedding
                          ? 'Es tu gran celebración'
                          : 'Es el gran día'
                        : days === 1
                          ? isNonWedding
                            ? 'Día para tu celebración'
                            : 'Día para el gran día'
                          : isNonWedding
                            ? 'Días para tu celebración'
                            : 'Días para el gran día'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-[13px] text-[#7D6F6B] font-light">
                      {profile.weddingDate && <span>{formatShortDate(profile.weddingDate)}</span>}
                      {profile.weddingDate && profile.city && (
                        <span className="text-[#D4BEB7]">·</span>
                      )}
                      {profile.city && <span className="truncate">{profile.city}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 7 cols (Desktop) / Top (Mobile): Wide Luminous Celebration Photograph */}
              <div className="order-1 lg:order-2 lg:col-span-7 relative bg-[#FAF8F5] h-[220px] sm:h-[280px] lg:h-auto lg:min-h-[320px] overflow-hidden">
                {useCrispFrame ? (
                  <>
                    <img
                      src={profile.coverPhoto}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-65 brightness-90"
                      style={{ objectPosition: `50% ${profile.coverPositionY}%` }}
                    />
                    <img
                      src={profile.coverPhoto}
                      alt="Portada del evento"
                      onLoad={e => {
                        const img = e.currentTarget;
                        setCoverIsPortrait(img.naturalHeight > img.naturalWidth * 1.15);
                      }}
                      className="relative z-[1] w-full h-full object-contain contrast-[1.02] saturate-[1.03] transition-all duration-300"
                    />
                  </>
                ) : (
                  <img
                    src={profile.coverPhoto}
                    alt="Portada del evento"
                    onLoad={e => {
                      const img = e.currentTarget;
                      setCoverIsPortrait(img.naturalHeight > img.naturalWidth * 1.15);
                    }}
                    className="w-full h-full object-cover contrast-[1.02] saturate-[1.03] transition-all duration-300"
                    style={{ objectPosition: `50% ${profile.coverPositionY}%` }}
                  />
                )}

                {/* Discreet top-right controls */}
                <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
                  {isRepositioning ? (
                    <div className="flex items-center gap-1 bg-[#2B2826]/85 px-2.5 py-1 rounded-full border border-white/20 text-white text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPersistedFitMode(useCrispFrame ? 'cover' : 'contain')}
                        className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium cursor-pointer"
                      >
                        {useCrispFrame ? 'Rellenar' : 'Ajuste nítido'}
                      </button>
                      {!useCrispFrame && (
                        <>
                          <button onClick={() => nudgeCover(-10)} className="p-1 hover:text-[#E5B7AE] cursor-pointer" title="Subir">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => nudgeCover(10)} className="p-1 hover:text-[#E5B7AE] cursor-pointer" title="Bajar">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsRepositioning(false)}
                        className="ml-1 px-2.5 py-0.5 rounded-full bg-[#C48B81] text-white font-medium cursor-pointer"
                      >
                        Listo
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={openEditProfile}
                        title={isNonWedding ? 'Editar Evento' : 'Editar Boda'}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#2B2826] text-[11px] font-medium shadow-xs transition cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#C48B81]" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRepositioning(true)}
                        title="Encuadrar foto"
                        className="p-2 rounded-full bg-white/90 hover:bg-white text-[#2B2826] shadow-xs transition cursor-pointer"
                      >
                        <Move className="w-3.5 h-3.5 text-[#C48B81]" />
                      </button>
                      <label
                        title="Cambiar foto"
                        className="p-2 rounded-full bg-white/90 hover:bg-white text-[#2B2826] shadow-xs transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#C48B81]" />
                        <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} className="hidden" />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sub-Tabs inside Mi Evento: Resumen vs Moodboard & Dirección Visual */}
      <div className="flex items-center gap-6 border-b border-[#EFE8E1]">
        <button
          onClick={() => setSubTab('resumen')}
          className={`pb-2.5 text-xs tracking-wide border-b-2 transition cursor-pointer ${
            subTab === 'resumen'
              ? 'border-[#C48B81] text-[#A86B60] font-medium'
              : 'border-transparent text-[#7D6F6B] hover:text-[#2B2826]'
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setSubTab('estilo')}
          className={`pb-2.5 text-xs tracking-wide border-b-2 transition cursor-pointer ${
            subTab === 'estilo'
              ? 'border-[#C48B81] text-[#A86B60] font-medium'
              : 'border-transparent text-[#7D6F6B] hover:text-[#2B2826]'
          }`}
        >
          Moodboard &amp; Look
        </button>
      </div>

      {subTab === 'resumen' ? (
        <div className="space-y-6">
          {/* 2. Asymmetric Editorial Magazine Spread: Left 7 cols Checklist/Minuto a Minuto · Right 5 cols Unified Finance & Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT 7 COLS: Próximos Pasos (auto-switches to Minuto a Minuto when 100% done) */}
            {checklist.length > 0 && nextTasks.length === 0 ? (
              <div className="lg:col-span-7 bg-white rounded-[1.75rem] p-6 sm:p-8 border border-[#EFE8E1] shadow-2xs flex flex-col justify-between space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#577355]">
                      Checklist 100% listo · El Gran Día
                    </span>
                    <h2 className="font-editorial text-2xl sm:text-[1.75rem] text-[#2B2826] mt-1">
                      Minuto a Minuto
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('midia')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C48B81] hover:text-[#A86B60] cursor-pointer shrink-0 pt-1"
                  >
                    <span>Abrir cronograma</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(wedding.timeline || []).length === 0 ? (
                  <div className="py-12 text-center text-xs sm:text-sm text-[#7D6F6B] bg-[#FAF8F5] rounded-2xl px-6">
                    Aún no hay momentos cargados en tu itinerario. Agrégalos para coordinar el gran día.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F3EDE7] flex-1">
                    {(wedding.timeline || []).slice(0, 5).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate('midia')}
                        className="w-full text-left py-3.5 flex items-center justify-between gap-4 hover:bg-[#FAF8F5] px-3 -mx-3 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="text-xs font-semibold text-[#A86B60] bg-[#F7EDEB] px-3 py-1 rounded-full shrink-0">
                            {item.time || '--:--'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm sm:text-[15px] text-[#2B2826]">{item.title}</p>
                            {item.location && (
                              <p className="text-xs text-[#7D6F6B] font-light mt-0.5">
                                {item.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#D0BEB6] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-[#EFE8E1] flex items-center justify-between text-xs text-[#7D6F6B]">
                  <span>{(wedding.timeline || []).length} momentos programados</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('midia')}
                    className="font-medium text-[#2B2826] hover:text-[#C48B81] transition cursor-pointer"
                  >
                    Ver itinerario completo →
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 bg-white rounded-[1.75rem] p-6 sm:p-8 border border-[#EFE8E1] shadow-2xs flex flex-col justify-between space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
                      Checklist
                    </span>
                    <h2 className="font-editorial text-2xl sm:text-[1.75rem] text-[#2B2826] mt-1">
                      Próximos Pasos
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('checklist')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C48B81] hover:text-[#A86B60] cursor-pointer shrink-0 pt-1"
                  >
                    <span>Ver checklist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {nextTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs sm:text-sm text-[#7D6F6B] bg-[#FAF8F5] rounded-2xl px-6">
                    Agrega tus primeros pendientes en el checklist para comenzar.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F3EDE7] flex-1">
                    {nextTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F5] px-3 -mx-3 rounded-xl transition group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-5 h-5 rounded-full border border-[#C48B81]/55 bg-white flex items-center justify-center shrink-0 group-hover:border-[#C48B81] transition">
                            {task.completed && <CheckCircle2 className="w-4 h-4 text-[#577355]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm sm:text-[15px] text-[#2B2826] leading-snug">
                              {task.title}
                            </p>
                            <p className="text-xs text-[#7D6F6B] font-light mt-0.5">
                              {task.category}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#9A8B84] font-light shrink-0 hidden sm:inline">
                          {formatShortDate(task.dueDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-[#EFE8E1] space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#7D6F6B]">
                    <span>{completedCount} de {checklist.length} pasos completados</span>
                    <span className="font-medium text-[#577355]">
                      {checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0}% listo
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#577355] rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT 5 COLS: Single Unified Editorial Panel (Control Financiero + Asistencia & Mesas separated by a fine hairline) */}
            <div className="lg:col-span-5 bg-white rounded-[1.75rem] border border-[#EFE8E1] shadow-2xs divide-y divide-[#EFE8E1] flex flex-col justify-between">
              {/* Top Section: Control Financiero */}
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
                      Control Financiero
                    </span>
                    <h2 className="font-editorial text-2xl text-[#2B2826] mt-0.5">
                      Presupuesto
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('presupuesto')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#C48B81] hover:text-[#A86B60] cursor-pointer shrink-0 pt-1"
                  >
                    <span>Abrir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-editorial text-3xl text-[#2B2826]">
                      {formatMXN(totalPaid)}{' '}
                      <span className="text-xs sm:text-sm text-[#7D6F6B] font-light">
                        liquidado
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[#A86B60]">
                      {totalContracted > 0
                        ? Math.min(100, Math.round((totalPaid / totalContracted) * 100))
                        : 0}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C48B81] rounded-full transition-all"
                      style={{
                        width: `${
                          totalContracted > 0
                            ? Math.min(100, Math.round((totalPaid / totalContracted) * 100))
                            : 0
                        }%`
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-[#7D6F6B] pt-1">
                    <span>Meta {formatMXN(profile.budgetGoal)}</span>
                    <span>
                      Por liquidar{' '}
                      <strong className="font-medium text-[#2B2826]">
                        {formatMXN(Math.max(0, totalContracted - totalPaid))}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Asistencia & Acomodo */}
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
                      Asistencia &amp; Acomodo
                    </span>
                    <h2 className="font-editorial text-2xl text-[#2B2826] mt-0.5">
                      Invitados &amp; Mesas
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('invitados')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#C48B81] hover:text-[#A86B60] cursor-pointer shrink-0 pt-1"
                  >
                    <span>Plano 2D</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-editorial text-3xl text-[#2B2826]">
                      {confirmedPasses}{' '}
                      <span className="text-xs sm:text-sm text-[#7D6F6B] font-light">
                        de {totalPasses || profile.estimatedGuests} confirmados
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[#577355]">
                      {totalPasses > 0 ? Math.round((confirmedPasses / totalPasses) * 100) : 0}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-[#577355] transition-all"
                      style={{
                        width: `${totalPasses > 0 ? Math.round((confirmedPasses / totalPasses) * 100) : 0}%`
                      }}
                    />
                    <div
                      className="h-full bg-[#E5B7AE] transition-all"
                      style={{
                        width: `${totalPasses > 0 ? Math.round((pendingPasses / totalPasses) * 100) : 0}%`
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-[#7D6F6B] pt-1">
                    <span>
                      {pendingPasses} pendientes · {declinedPasses} declinados
                    </span>
                    <span>
                      <strong className="font-medium text-[#2B2826]">
                        {(wedding.tables || []).length} mesas
                      </strong>{' '}
                      · {seatedPasses} sentados
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Subtle Editorial VLB Coordination Offer (ONLY for Virtual Novios) */}
          {flags.isVirtualNovios && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EEDAD6] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C48B81]">
                  <Sparkles className="w-3 h-3" />
                  <span>Viva la Bride · Dirección Presencial</span>
                </span>
                <h3 className="font-editorial text-xl text-[#2B2826]">
                  ¿Prefieres disfrutar tu evento sin preocuparte por la logística?
                </h3>
                <p className="text-xs text-[#7D6F6B] font-light max-w-xl">
                  Nuestro equipo puede acompañarte con Coordinación del Día, Plan Integral o Exclusivo usando todo lo que ya organizaste aquí en Lazo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVlbModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium shadow-2xs transition cursor-pointer shrink-0"
              >
                <span>Conocer Paquetes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* MOODBOARD & LOOK (Emotional heart of Mi Boda) */
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C48B81] flex items-center gap-1.5">
                  <span>Concepto Visual & Paleta</span>
                  <Pencil className="w-2.5 h-2.5 opacity-60" />
                </span>
                <input
                  type="text"
                  value={style.vibe}
                  placeholder="Escribe el estilo de tu boda..."
                  onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, vibe: e.target.value } }))}
                  className="block w-full font-editorial text-xl text-[#2B2826] mt-0.5 bg-transparent focus:outline-none border-b border-transparent hover:border-[#EFE8E1] focus:border-[#C48B81] transition pb-0.5"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {style.palette.map((c, idx) => (
                  <div key={idx} className="relative group flex flex-col items-center gap-1">
                    <label
                      className="w-9 h-9 rounded-full border border-[#EFE8E1] shadow-2xs cursor-pointer transition-transform hover:scale-105 block overflow-hidden"
                      style={{ backgroundColor: c.hex }}
                      title="Haz clic para cambiar este color"
                    >
                      <input
                        type="color"
                        value={c.hex}
                        onChange={e => {
                          const nextHex = e.target.value;
                          updateWedding(prev => ({
                            ...prev,
                            style: {
                              ...prev.style,
                              palette: prev.style.palette.map((item, i) =>
                                i === idx ? { ...item, hex: nextHex } : item
                              )
                            }
                          }));
                        }}
                        className="opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    {style.palette.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateWedding(prev => ({
                            ...prev,
                            style: {
                              ...prev.style,
                              palette: prev.style.palette.filter((_, i) => i !== idx)
                            }
                          }))
                        }
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#EFE8E1] text-[#7D6F6B] hover:text-rose-600 shadow-2xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Quitar color"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={c.name}
                      onChange={e => {
                        const nextName = e.target.value;
                        updateWedding(prev => ({
                          ...prev,
                          style: {
                            ...prev.style,
                            palette: prev.style.palette.map((item, i) =>
                              i === idx ? { ...item, name: nextName } : item
                            )
                          }
                        }));
                      }}
                      className="w-16 text-center text-[10px] text-[#7D6F6B] bg-transparent border-b border-transparent hover:border-[#EFE8E1] focus:border-[#C48B81] focus:text-[#2B2826]"
                      title="Editar nombre del color"
                    />
                  </div>
                ))}

                {style.palette.length < 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateWedding(prev => ({
                        ...prev,
                        style: {
                          ...prev.style,
                          palette: [...prev.style.palette, { name: 'Nuevo', hex: '#D8C7B8' }]
                        }
                      }))
                    }
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                    title="Agregar color a la paleta"
                  >
                    <span className="w-9 h-9 rounded-full border border-dashed border-[#D8CFC8] bg-[#FAF8F5] group-hover:border-[#C48B81] flex items-center justify-center text-[#7D6F6B] group-hover:text-[#C48B81] transition">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] text-[#7D6F6B]">Agregar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {style.photos.map(p => (
                <div key={p.id} className="relative group rounded-2xl overflow-hidden border border-[#EFE8E1] aspect-[4/5] bg-[#FAF8F5]">
                  <img src={p.url} alt={p.caption} className="w-full h-full object-cover" />
                  <button
                    onClick={() =>
                      updateWedding(prev => ({
                        ...prev,
                        style: { ...prev.style, photos: prev.style.photos.filter(x => x.id !== p.id) }
                      }))
                    }
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <label className="rounded-2xl border border-dashed border-[#D8CFC8] bg-[#FAF8F5] hover:bg-[#F3ECE6] aspect-[4/5] flex flex-col items-center justify-center gap-2 text-[#7D6F6B] cursor-pointer transition">
                <Upload className="w-5 h-5 text-[#C48B81]" />
                <span className="text-xs font-medium">Subir inspiración</span>
                <input type="file" accept="image/*" onChange={handleUploadMoodPhoto} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs space-y-2">
              <h3 className="font-editorial text-lg text-[#2B2826]">Look de {profile.partner1}</h3>
              <textarea
                rows={3}
                placeholder={
                  isNonWedding || !hasPartner2
                    ? 'Vestido o outfit, peinado, maquillaje, accesorios, zapatos...'
                    : 'Diseñador del vestido, fechas de pruebas, velo, zapatos, joyería...'
                }
                value={style.brideLook}
                onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, brideLook: e.target.value } }))}
                className="w-full p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
              />
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs space-y-2">
              <h3 className="font-editorial text-lg text-[#2B2826]">
                {isNonWedding || !hasPartner2 ? 'Notas de Inspiración & Decoración' : `Look de ${profile.partner2}`}
              </h3>
              <textarea
                rows={3}
                placeholder={
                  isNonWedding || !hasPartner2
                    ? 'Flores, montaje, detalles especiales, dress code, música o ideas clave...'
                    : 'Traje / smoking, sastrería, corbata o moño, zapatos, mancuernillas...'
                }
                value={style.groomLook}
                onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, groomLook: e.target.value } }))}
                className="w-full p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Información del Evento / Boda */}
      <Modal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title={isNonWedding ? 'Información del Evento' : 'Información de tu Boda'}
        subtitle={isNonWedding ? 'Edita el nombre, fecha, sede o metas cuando necesites.' : 'Edita sus nombres, fecha, sede o metas cuando necesites.'}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          {isNonWedding ? (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Nombre del Festejado / Evento *
              </label>
              <input
                type="text"
                required
                value={profileForm.partner1}
                onChange={e => setProfileForm({ ...profileForm, partner1: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                  Novia / Pareja 1 *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.partner1}
                  onChange={e => setProfileForm({ ...profileForm, partner1: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                  Novio / Pareja 2 (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Agregar cuando gustes"
                  value={profileForm.partner2}
                  onChange={e => setProfileForm({ ...profileForm, partner2: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                {isNonWedding ? 'Fecha del Evento *' : 'Fecha de la Boda *'}
              </label>
              <input
                type="date"
                required
                value={profileForm.weddingDate}
                onChange={e => setProfileForm({ ...profileForm, weddingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Sede / Ciudad
              </label>
              <input
                type="text"
                placeholder="Ej. Monterrey, Hacienda..."
                value={profileForm.city}
                onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Invitados Estimados
              </label>
              <input
                type="number"
                min={1}
                value={profileForm.estimatedGuests}
                onChange={e => setProfileForm({ ...profileForm, estimatedGuests: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Meta Presupuesto (MXN)
              </label>
              <input
                type="number"
                min={0}
                value={profileForm.budgetGoal}
                onChange={e => setProfileForm({ ...profileForm, budgetGoal: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditProfile(false)}
              className="px-4 py-2 text-xs text-[#7D6F6B] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>

      <VlbCoordinationModal
        isOpen={showVlbModal}
        onClose={() => setShowVlbModal(false)}
        profile={profile}
      />
    </div>
  );
};
