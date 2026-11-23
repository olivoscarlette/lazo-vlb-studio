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
  const totalPasses = guests.reduce((sum, g) => sum + g.passes, 0);

  const totalContracted = vendors.reduce((sum, v) => sum + v.totalCost, 0);
  const totalPaid = vendors.reduce((sum, v) => sum + v.paidAmount, 0);

  const nextTasks = checklist.filter(t => !t.completed).slice(0, 3);
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
      {/* 1. Editorial Hero Cover */}
      {(() => {
        const savedFit = profile.coverFitMode || 'cover';
        const useCrispFrame = savedFit === 'contain';
        const setPersistedFitMode = (nextMode: 'cover' | 'contain') => {
          updateWedding(prev => ({
            ...prev,
            profile: { ...prev.profile, coverFitMode: nextMode }
          }));
        };
        return (
      <div className="relative rounded-3xl overflow-hidden border border-[#EFE8E1] shadow-sm bg-[#181514]">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          {useCrispFrame ? (
            <>
              {/* Atmospheric blurred backdrop so vertical photos never stretch or pixelate */}
              <img
                src={profile.coverPhoto}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-65 brightness-75"
                style={{ objectPosition: `50% ${profile.coverPositionY}%` }}
              />
              <img
                src={profile.coverPhoto}
                alt="Portada del evento"
                onLoad={e => {
                  const img = e.currentTarget;
                  setCoverIsPortrait(img.naturalHeight > img.naturalWidth * 1.15);
                }}
                className="relative z-[1] w-full h-full object-contain contrast-[1.03] saturate-[1.04] transition-all duration-300"
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
              className="w-full h-full object-cover contrast-[1.03] saturate-[1.04] transition-all duration-300"
              style={{ objectPosition: `50% ${profile.coverPositionY}%` }}
            />
          )}
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#181514]/75 via-[#181514]/25 to-[#181514]/15 pointer-events-none" />

          {/* Top-right cover controls */}
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
            {isRepositioning ? (
              <div className="flex items-center gap-1 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-white text-[11px]">
                <button
                  type="button"
                  onClick={() => setPersistedFitMode(useCrispFrame ? 'cover' : 'contain')}
                  className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium cursor-pointer"
                  title="Alternar entre rellenar todo el banner o mantener nitidez sin recortar"
                >
                  {useCrispFrame ? 'Rellenar' : 'Ajuste nítido'}
                </button>
                {!useCrispFrame && (
                  <>
                    <button onClick={() => nudgeCover(-10)} className="p-1 hover:text-[#C48B81] cursor-pointer" title="Subir">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => nudgeCover(10)} className="p-1 hover:text-[#C48B81] cursor-pointer" title="Bajar">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsRepositioning(false)}
                  className="ml-1 px-2 py-0.5 rounded-full bg-[#C48B81] text-white font-medium cursor-pointer"
                >
                  Listo
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openEditProfile}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-[11px] border border-white/20 transition cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span className="hidden sm:inline">{isNonWedding ? 'Editar Evento' : 'Editar Boda'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRepositioning(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-[11px] border border-white/20 transition cursor-pointer"
                >
                  <Move className="w-3 h-3" />
                  <span className="hidden sm:inline">Encuadrar</span>
                </button>
                <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-[11px] border border-white/20 transition cursor-pointer">
                  <Camera className="w-3 h-3" />
                  <span className="hidden sm:inline">{uploadingCover ? 'Subiendo...' : 'Cambiar Foto'}</span>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} className="hidden" />
                </label>
              </>
            )}
          </div>

          {/* Centered Event / Couple Title & Glassmorphic Countdown */}
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center text-white px-5 pointer-events-none">
            {isNonWedding && profile.eventType && (
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.28em] text-[#E5B7AE] font-medium mb-2 drop-shadow-xs">
                {profile.eventType}
              </span>
            )}
            <h1 className="font-editorial text-4xl sm:text-6xl tracking-wide drop-shadow-sm">
              {hasPartner2 ? (
                <>
                  {profile.partner1.toUpperCase()} <span className="italic font-normal text-[#E5B7AE]">&amp;</span> {profile.partner2.toUpperCase()}
                </>
              ) : (
                profile.partner1.toUpperCase()
              )}
            </h1>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] sm:text-xs tracking-wider">
              <span>✨ FALTAN {days} DÍAS</span>
              <span className="opacity-50">·</span>
              <span>{formatShortDate(profile.weddingDate)}</span>
            </div>
          </div>
        </div>
      </div>
        );
      })()}

      {/* Sub-Tabs inside Mi Boda: Resumen vs Moodboard & Look */}
      <div className="flex items-center p-1 bg-white rounded-full border border-[#EFE8E1] w-fit shadow-2xs">
        <button
          onClick={() => setSubTab('resumen')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
            subTab === 'resumen' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setSubTab('estilo')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
            subTab === 'estilo' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
          }`}
        >
          Moodboard & Look
        </button>
      </div>

      {subTab === 'resumen' ? (
        <div className="space-y-6">
          {/* 2. Three Editorial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => onNavigate('invitados')}
              className="text-left bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs hover:border-[#C48B81]/60 transition cursor-pointer"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8A7E72]">
                01 / Asistencia
              </span>
              <div className="font-editorial text-3xl text-[#2B2826] mt-2">
                {confirmedPasses} <span className="text-base text-[#8A7E72] font-light">/ {totalPasses || profile.estimatedGuests}</span>
              </div>
              <p className="text-xs text-[#8A7E72] mt-1 font-light">
                {totalPasses > 0 ? 'Invitados confirmados' : 'Empieza tu lista de invitados'}
              </p>
            </button>

            <button
              onClick={() => onNavigate('presupuesto')}
              className="text-left bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs hover:border-[#C48B81]/60 transition cursor-pointer"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8A7E72]">
                02 / Presupuesto
              </span>
              <div className="font-editorial text-3xl text-[#2B2826] mt-2">
                {totalContracted > 0 ? formatMXN(totalPaid) : 'Por iniciar'}
              </div>
              <p className="text-xs text-[#8A7E72] mt-1 font-light">
                Meta: {formatMXN(profile.budgetGoal)}
              </p>
            </button>

            <button
              onClick={() => onNavigate('checklist')}
              className="text-left bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs hover:border-[#C48B81]/60 transition cursor-pointer"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8A7E72]">
                03 / Tu Avance
              </span>
              <div className="font-editorial text-3xl text-[#2B2826] mt-2">
                {checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0}%
              </div>
              <p className="text-xs text-[#8A7E72] mt-1 font-light">
                {completedCount} de {checklist.length} pasos listos
              </p>
            </button>
          </div>

          {/* 3. Focus of the Month (Only 3 tasks) */}
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C48B81]">
                  Paso a paso · Sin abrumarte
                </span>
                <h2 className="font-editorial text-2xl text-[#2B2826] mt-0.5">
                  Tus 3 prioridades ahora
                </h2>
              </div>
              <button
                onClick={() => onNavigate('checklist')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#C48B81] hover:text-[#A86B60] cursor-pointer"
              >
                <span>Ver todo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {nextTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#577355] bg-[#FAF8F5] rounded-2xl">
                ¡Increíble! Tienes todas tus tareas completadas.
              </div>
            ) : (
              <div className="divide-y divide-[#FAF8F5]">
                {nextTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FAF8F5]/60 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-5 h-5 rounded-full border border-[#D8CFC8] bg-white flex items-center justify-center shrink-0 hover:border-[#C48B81]">
                        {task.completed && <CheckCircle2 className="w-4 h-4 text-[#577355]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[#2B2826] truncate">{task.title}</p>
                        <p className="text-[11px] text-[#8A7E72] font-light">
                          {task.category} · Ideal antes del {formatShortDate(task.dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Subtle Editorial VLB Coordination Offer (ONLY for Virtual Novios) */}
          {flags.isVirtualNovios && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EEDAD6] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C48B81]">
                  <Sparkles className="w-3 h-3" />
                  <span>Viva la Bride · Coordinación</span>
                </span>
                <h3 className="font-editorial text-xl text-[#2B2826]">
                  ¿Prefieres disfrutar tu boda sin preocuparte por la logística?
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
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#EFE8E1] text-[#8A7E72] hover:text-rose-600 shadow-2xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
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
                      className="w-16 text-center text-[10px] text-[#8A7E72] bg-transparent border-b border-transparent hover:border-[#EFE8E1] focus:border-[#C48B81] focus:text-[#2B2826]"
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
                    <span className="w-9 h-9 rounded-full border border-dashed border-[#D8CFC8] bg-[#FAF8F5] group-hover:border-[#C48B81] flex items-center justify-center text-[#8A7E72] group-hover:text-[#C48B81] transition">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] text-[#8A7E72]">Agregar</span>
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

              <label className="rounded-2xl border border-dashed border-[#D8CFC8] bg-[#FAF8F5] hover:bg-[#F3ECE6] aspect-[4/5] flex flex-col items-center justify-center gap-2 text-[#8A7E72] cursor-pointer transition">
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
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
                <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
                <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
              className="px-4 py-2 text-xs text-[#8A7E72] cursor-pointer"
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
