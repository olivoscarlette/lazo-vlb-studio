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
      {/* 1. Asymmetric Haute Couture Split Hero (Atelier Burdeos + Fotografía Editorial) */}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 5 cols: Signature Deep Burgundy Editorial Card */}
            <div className="lg:col-span-5 rounded-3xl bg-[#5A232E] text-white p-6 sm:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[250px] sm:min-h-[290px]">
              <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/5 blur-2xl" />

              <div className="relative z-10 space-y-2.5">
                <span className="inline-block text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-[#E6CCD1] font-medium">
                  {(profile.eventType || 'Boda').toUpperCase()} · {formatShortDate(profile.weddingDate).toUpperCase()}
                </span>

                <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.08] tracking-tight text-white">
                  {hasPartner2 ? (
                    <>
                      {profile.partner1} <span className="text-[#D9B6BC] font-light">&amp;</span> {profile.partner2}
                    </>
                  ) : (
                    profile.partner1
                  )}
                </h1>

                <p className="text-xs uppercase tracking-[0.2em] text-white/75 pt-1">
                  {days} días para el evento
                </p>
              </div>

              {/* Integrated 3-Metric Architectural Strip inside Burgundy Card */}
              <div className="relative z-10 mt-6 pt-5 border-t border-white/15 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('invitados')}
                  className="text-left group cursor-pointer"
                >
                  <div className="font-editorial text-2xl sm:text-3xl text-white group-hover:text-[#E6CCD1] transition">
                    {confirmedPasses}
                  </div>
                  <div className="text-[11px] text-white/70 mt-0.5">Confirmados</div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('invitados')}
                  className="text-left border-l border-white/15 pl-3 group cursor-pointer"
                >
                  <div className="font-editorial text-2xl sm:text-3xl text-white group-hover:text-[#E6CCD1] transition">
                    {tablesCount}
                  </div>
                  <div className="text-[11px] text-white/70 mt-0.5">Mesas 2D</div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('checklist')}
                  className="text-left border-l border-white/15 pl-3 group cursor-pointer"
                >
                  <div className="font-editorial text-2xl sm:text-3xl text-white group-hover:text-[#E6CCD1] transition">
                    {progressPct}%
                  </div>
                  <div className="text-[11px] text-white/70 mt-0.5">Listo</div>
                </button>
              </div>
            </div>

            {/* Right 7 cols: Full-bleed Celebration Photograph */}
            <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-[#E7E1D8] shadow-sm bg-[#1F1D1E] min-h-[230px] sm:min-h-[290px]">
              {useCrispFrame ? (
                <>
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

              {/* Discreet top-right controls */}
              <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
                {isRepositioning ? (
                  <div className="flex items-center gap-1 bg-[#1F1D1E]/85 px-2.5 py-1 rounded-full border border-white/20 text-white text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPersistedFitMode(useCrispFrame ? 'cover' : 'contain')}
                      className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium cursor-pointer"
                    >
                      {useCrispFrame ? 'Rellenar' : 'Ajuste nítido'}
                    </button>
                    {!useCrispFrame && (
                      <>
                        <button onClick={() => nudgeCover(-10)} className="p-1 hover:text-[#D9B6BC] cursor-pointer" title="Subir">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => nudgeCover(10)} className="p-1 hover:text-[#D9B6BC] cursor-pointer" title="Bajar">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setIsRepositioning(false)}
                      className="ml-1 px-2.5 py-0.5 rounded-full bg-[#6E2E3A] text-white font-medium cursor-pointer"
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#1F1D1E] text-[11px] font-medium shadow-xs transition cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-[#6E2E3A]" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRepositioning(true)}
                      title="Encuadrar foto"
                      className="p-2 rounded-full bg-white/90 hover:bg-white text-[#1F1D1E] shadow-xs transition cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5 text-[#6E2E3A]" />
                    </button>
                    <label
                      title="Cambiar foto"
                      className="p-2 rounded-full bg-white/90 hover:bg-white text-[#1F1D1E] shadow-xs transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#6E2E3A]" />
                      <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} className="hidden" />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sub-Tabs inside Mi Evento: Resumen vs Moodboard & Look */}
      <div className="flex items-center gap-6 border-b border-[#E7E1D8]">
        <button
          onClick={() => setSubTab('resumen')}
          className={`pb-2.5 text-xs tracking-wide border-b-2 transition cursor-pointer ${
            subTab === 'resumen'
              ? 'border-[#6E2E3A] text-[#6E2E3A] font-medium'
              : 'border-transparent text-[#6B6462] hover:text-[#1F1D1E]'
          }`}
        >
          Resumen del Estudio
        </button>
        <button
          onClick={() => setSubTab('estilo')}
          className={`pb-2.5 text-xs tracking-wide border-b-2 transition cursor-pointer ${
            subTab === 'estilo'
              ? 'border-[#6E2E3A] text-[#6E2E3A] font-medium'
              : 'border-transparent text-[#6B6462] hover:text-[#1F1D1E]'
          }`}
        >
          Moodboard &amp; Dirección Visual
        </button>
      </div>

      {subTab === 'resumen' ? (
        <div className="space-y-5">
          {/* 2. Architectural 2-Column Studio Grid: Plano 2D del Salón + Próximos Pasos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Live Mini Schematic Preview of Plano 2D del Salón */}
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#E7E1D8] shadow-2xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#6E2E3A]">
                    Arquitectura de Salón
                  </span>
                  <h2 className="font-editorial text-2xl text-[#1F1D1E] mt-0.5">
                    Plano 2D del Salón
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('invitados')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6E2E3A] hover:text-[#521F29] cursor-pointer shrink-0"
                >
                  <span>Abrir Plano 2D</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Crisp SVG Architectural Mini Floor Plan */}
              <button
                type="button"
                onClick={() => onNavigate('invitados')}
                className="w-full rounded-2xl border border-[#E7E1D8] bg-[#F8F5F0] p-4 hover:border-[#6E2E3A]/50 transition cursor-pointer text-left"
                title="Abrir editor de Plano 2D"
              >
                <svg viewBox="0 0 360 175" className="w-full h-40">
                  <rect x="6" y="6" width="348" height="163" rx="6" fill="#FFFFFF" stroke="#1F1D1E" strokeWidth="1.2" />
                  {/* Subtle dance floor & DJ */}
                  <rect x="148" y="42" width="64" height="90" rx="2" fill="#F8F5F0" stroke="#D8D0C5" strokeWidth="0.9" strokeDasharray="3 2" />
                  <text x="180" y="90" textAnchor="middle" fontSize="8" fill="#6B6462" letterSpacing="1.6">PISTA</text>
                  {/* Schematic tables */}
                  {[
                    { cx: 56, cy: 52 },
                    { cx: 112, cy: 52 },
                    { cx: 56, cy: 122 },
                    { cx: 112, cy: 122 },
                    { cx: 248, cy: 52 },
                    { cx: 304, cy: 52 },
                    { cx: 248, cy: 122 },
                    { cx: 304, cy: 122 }
                  ].map((pos, idx) => (
                    <g key={idx}>
                      <circle
                        cx={pos.cx}
                        cy={pos.cy}
                        r="16"
                        fill={idx === 0 || idx === 5 ? '#5A232E' : '#F8F5F0'}
                        stroke={idx === 0 || idx === 5 ? '#5A232E' : '#6B6462'}
                        strokeWidth="1"
                      />
                      <text
                        x={pos.cx}
                        y={pos.cy + 3}
                        textAnchor="middle"
                        fontSize="8"
                        fill={idx === 0 || idx === 5 ? '#FFFFFF' : '#1F1D1E'}
                      >
                        {idx + 1}
                      </text>
                    </g>
                  ))}
                </svg>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#6B6462]">
                  <span>
                    {(wedding.tables || []).length} mesas configuradas · {totalPasses || profile.estimatedGuests} lugares
                  </span>
                  <span className="font-medium text-[#6E2E3A]">
                    {totalContracted > 0 ? `Liquidado: ${formatMXN(totalPaid)}` : 'Ver distribución'}
                  </span>
                </div>
              </button>
            </div>

            {/* Right: Próximos Pasos */}
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#E7E1D8] shadow-2xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#6E2E3A]">
                    Operación &amp; Avance
                  </span>
                  <h2 className="font-editorial text-2xl text-[#1F1D1E] mt-0.5">
                    Próximos Pasos
                  </h2>
                </div>
                <button
                  onClick={() => onNavigate('checklist')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6E2E3A] hover:text-[#521F29] cursor-pointer"
                >
                  <span>Ver todo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {nextTasks.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#577355] bg-[#F8F5F0] rounded-2xl">
                  ¡Increíble! Tienes todos los pasos completados.
                </div>
              ) : (
                <div className="divide-y divide-[#E7E1D8]/70 flex-1">
                  {nextTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className="py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F8F5F0]/70 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-5 h-5 rounded-full border border-[#6E2E3A]/40 bg-white flex items-center justify-center shrink-0 hover:border-[#6E2E3A]">
                          {task.completed && <CheckCircle2 className="w-4 h-4 text-[#6E2E3A]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-[#1F1D1E] truncate">{task.title}</p>
                          <p className="text-[11px] text-[#6B6462] font-light">
                            {task.category} · {formatShortDate(task.dueDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-[#E7E1D8]/70 flex items-center justify-between text-[11px] text-[#6B6462]">
                <span>{completedCount} de {checklist.length} pasos listos</span>
                <button
                  type="button"
                  onClick={() => onNavigate('presupuesto')}
                  className="font-medium text-[#1F1D1E] hover:text-[#6E2E3A] cursor-pointer"
                >
                  Finanzas: {totalContracted > 0 ? formatMXN(totalPaid) : 'Por iniciar'} →
                </button>
              </div>
            </div>
          </div>

          {/* 3. Subtle Editorial VLB Coordination Offer (ONLY for Virtual Novios) */}
          {flags.isVirtualNovios && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5D1D5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#6E2E3A]">
                  <Sparkles className="w-3 h-3" />
                  <span>Viva la Bride · Dirección Presencial</span>
                </span>
                <h3 className="font-editorial text-xl text-[#1F1D1E]">
                  ¿Prefieres disfrutar tu evento sin preocuparte por la logística?
                </h3>
                <p className="text-xs text-[#6B6462] font-light max-w-xl">
                  Nuestro equipo puede acompañarte con Coordinación del Día, Plan Integral o Exclusivo usando todo lo que ya organizaste aquí en Lazo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVlbModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1F1D1E] hover:bg-[#181514] text-white text-xs font-medium shadow-2xs transition cursor-pointer shrink-0"
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
          <div className="bg-white rounded-3xl p-6 border border-[#E7E1D8] shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#6E2E3A] flex items-center gap-1.5">
                  <span>Concepto Visual & Paleta</span>
                  <Pencil className="w-2.5 h-2.5 opacity-60" />
                </span>
                <input
                  type="text"
                  value={style.vibe}
                  placeholder="Escribe el estilo de tu boda..."
                  onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, vibe: e.target.value } }))}
                  className="block w-full font-editorial text-xl text-[#1F1D1E] mt-0.5 bg-transparent focus:outline-none border-b border-transparent hover:border-[#E7E1D8] focus:border-[#6E2E3A] transition pb-0.5"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {style.palette.map((c, idx) => (
                  <div key={idx} className="relative group flex flex-col items-center gap-1">
                    <label
                      className="w-9 h-9 rounded-full border border-[#E7E1D8] shadow-2xs cursor-pointer transition-transform hover:scale-105 block overflow-hidden"
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
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#E7E1D8] text-[#6B6462] hover:text-rose-600 shadow-2xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
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
                      className="w-16 text-center text-[10px] text-[#6B6462] bg-transparent border-b border-transparent hover:border-[#E7E1D8] focus:border-[#6E2E3A] focus:text-[#1F1D1E]"
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
                    <span className="w-9 h-9 rounded-full border border-dashed border-[#D8CFC8] bg-[#F8F5F0] group-hover:border-[#6E2E3A] flex items-center justify-center text-[#6B6462] group-hover:text-[#6E2E3A] transition">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] text-[#6B6462]">Agregar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {style.photos.map(p => (
                <div key={p.id} className="relative group rounded-2xl overflow-hidden border border-[#E7E1D8] aspect-[4/5] bg-[#F8F5F0]">
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

              <label className="rounded-2xl border border-dashed border-[#D8CFC8] bg-[#F8F5F0] hover:bg-[#F3ECE6] aspect-[4/5] flex flex-col items-center justify-center gap-2 text-[#6B6462] cursor-pointer transition">
                <Upload className="w-5 h-5 text-[#6E2E3A]" />
                <span className="text-xs font-medium">Subir inspiración</span>
                <input type="file" accept="image/*" onChange={handleUploadMoodPhoto} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E7E1D8] shadow-2xs space-y-2">
              <h3 className="font-editorial text-lg text-[#1F1D1E]">Look de {profile.partner1}</h3>
              <textarea
                rows={3}
                placeholder={
                  isNonWedding || !hasPartner2
                    ? 'Vestido o outfit, peinado, maquillaje, accesorios, zapatos...'
                    : 'Diseñador del vestido, fechas de pruebas, velo, zapatos, joyería...'
                }
                value={style.brideLook}
                onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, brideLook: e.target.value } }))}
                className="w-full p-3 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-xs focus:outline-none focus:border-[#6E2E3A]"
              />
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E7E1D8] shadow-2xs space-y-2">
              <h3 className="font-editorial text-lg text-[#1F1D1E]">
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
                className="w-full p-3 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-xs focus:outline-none focus:border-[#6E2E3A]"
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
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Nombre del Festejado / Evento *
              </label>
              <input
                type="text"
                required
                value={profileForm.partner1}
                onChange={e => setProfileForm({ ...profileForm, partner1: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                  Novia / Pareja 1 *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.partner1}
                  onChange={e => setProfileForm({ ...profileForm, partner1: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                  Novio / Pareja 2 (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Agregar cuando gustes"
                  value={profileForm.partner2}
                  onChange={e => setProfileForm({ ...profileForm, partner2: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                {isNonWedding ? 'Fecha del Evento *' : 'Fecha de la Boda *'}
              </label>
              <input
                type="date"
                required
                value={profileForm.weddingDate}
                onChange={e => setProfileForm({ ...profileForm, weddingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Sede / Ciudad
              </label>
              <input
                type="text"
                placeholder="Ej. Monterrey, Hacienda..."
                value={profileForm.city}
                onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Invitados Estimados
              </label>
              <input
                type="number"
                min={1}
                value={profileForm.estimatedGuests}
                onChange={e => setProfileForm({ ...profileForm, estimatedGuests: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Meta Presupuesto (MXN)
              </label>
              <input
                type="number"
                min={0}
                value={profileForm.budgetGoal}
                onChange={e => setProfileForm({ ...profileForm, budgetGoal: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditProfile(false)}
              className="px-4 py-2 text-xs text-[#6B6462] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-medium cursor-pointer"
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
