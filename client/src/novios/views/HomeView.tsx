import React, { useState } from 'react';
import {
  Camera, CheckCircle2, ArrowRight, Share2, Check, ChevronUp, ChevronDown, Move, Upload, Trash2
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { daysUntil, formatMXN, formatShortDate } from '../data/seedWedding';
import { LazoTab } from '../types/lazo';

interface HomeViewProps {
  onNavigate: (tab: LazoTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { wedding, updateWedding } = useWedding();
  const [subTab, setSubTab] = useState<'resumen' | 'estilo'>('resumen');
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  if (!wedding) return null;

  const { profile, guests, vendors, checklist, style } = wedding;
  const days = daysUntil(profile.weddingDate);

  const confirmedPasses = guests
    .filter(g => g.status === 'Confirmado')
    .reduce((sum, g) => sum + g.passes, 0);
  const totalPasses = guests.reduce((sum, g) => sum + g.passes, 0);

  const totalContracted = vendors.reduce((sum, v) => sum + v.totalCost, 0);
  const totalPaid = vendors.reduce((sum, v) => sum + v.paidAmount, 0);

  const nextTasks = checklist.filter(t => !t.completed).slice(0, 3);
  const completedCount = checklist.filter(t => t.completed).length;

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateWedding(prev => ({
          ...prev,
          profile: { ...prev.profile, coverPhoto: reader.result as string, coverPositionY: 50 }
        }));
      }
    };
    reader.readAsDataURL(file);
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

  const handleCopyPartnerLink = () => {
    const text = `¡Planeemos nuestra boda juntos en Lazo! Código de pareja: ${profile.partnerInviteCode}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Editorial Hero Cover */}
      <div className="relative rounded-3xl overflow-hidden border border-[#EFE8E1] shadow-sm bg-[#181514]">
        <div className="relative h-60 sm:h-76 w-full">
          <img
            src={profile.coverPhoto}
            alt="Portada de boda"
            className="w-full h-full object-cover transition-all duration-300"
            style={{ objectPosition: `50% ${profile.coverPositionY}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181514]/80 via-[#181514]/35 to-[#181514]/15" />

          {/* Top-right cover controls */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
            {isRepositioning ? (
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-white text-[11px]">
                <button onClick={() => nudgeCover(-10)} className="p-1 hover:text-[#C48B81] cursor-pointer" title="Subir">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => nudgeCover(10)} className="p-1 hover:text-[#C48B81] cursor-pointer" title="Bajar">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
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
                  onClick={() => setIsRepositioning(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-[11px] border border-white/20 transition cursor-pointer"
                >
                  <Move className="w-3 h-3" />
                  <span className="hidden sm:inline">Encuadrar</span>
                </button>
                <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-[11px] border border-white/20 transition cursor-pointer">
                  <Camera className="w-3 h-3" />
                  <span className="hidden sm:inline">Cambiar Foto</span>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
              </>
            )}
          </div>

          {/* Centered Couple Title & Glassmorphic Countdown */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-5 pointer-events-none">
            <h1 className="font-editorial text-4xl sm:text-6xl tracking-wide drop-shadow-sm">
              {profile.partner1.toUpperCase()} <span className="italic font-normal text-[#E5B7AE]">&</span> {profile.partner2.toUpperCase()}
            </h1>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] sm:text-xs tracking-wider">
              <span>✨ FALTAN {days} DÍAS</span>
              <span className="opacity-50">·</span>
              <span>{formatShortDate(profile.weddingDate)}</span>
            </div>
          </div>
        </div>
      </div>

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
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#7D6F6B] border border-[#EFE8E1] shrink-0">
                      {task.owner}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Couple Sync Card */}
          <div className="bg-[#FAF8F5] rounded-2xl p-5 border border-[#EFE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-editorial text-lg text-[#2B2826]">Planea junto a {profile.partner2}</h3>
              <p className="text-xs text-[#7D6F6B] font-light mt-0.5">
                Comparte el acceso de pareja para que ambos vean pagos, tareas e invitados sincronizados.
              </p>
            </div>
            <button
              onClick={handleCopyPartnerLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#F3ECE6] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium shadow-2xs transition cursor-pointer shrink-0"
            >
              {copiedInvite ? <Check className="w-3.5 h-3.5 text-[#577355]" /> : <Share2 className="w-3.5 h-3.5 text-[#C48B81]" />}
              <span>{copiedInvite ? '¡Invitación copiada!' : 'Invitar a mi pareja'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* MOODBOARD & LOOK (Emotional heart of Mi Boda) */
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C48B81]">
                  Concepto Visual & Paleta
                </span>
                <input
                  type="text"
                  value={style.vibe}
                  onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, vibe: e.target.value } }))}
                  className="block w-full font-editorial text-xl text-[#2B2826] mt-0.5 bg-transparent focus:outline-none border-b border-transparent focus:border-[#EFE8E1]"
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {style.palette.map((c, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span
                      className="w-8 h-8 rounded-full border border-[#EFE8E1] shadow-2xs"
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                    <span className="text-[10px] text-[#8A7E72]">{c.name}</span>
                  </div>
                ))}
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
                placeholder="Diseñador del vestido, fechas de pruebas, velo, zapatos, joyería..."
                value={style.brideLook}
                onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, brideLook: e.target.value } }))}
                className="w-full p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
              />
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#EFE8E1] shadow-2xs space-y-2">
              <h3 className="font-editorial text-lg text-[#2B2826]">Look de {profile.partner2}</h3>
              <textarea
                rows={3}
                placeholder="Traje / smoking, sastrería, corbata o moño, zapatos, mancuernillas..."
                value={style.groomLook}
                onChange={e => updateWedding(prev => ({ ...prev, style: { ...prev.style, groomLook: e.target.value } }))}
                className="w-full p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
