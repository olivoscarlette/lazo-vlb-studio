import React, { useState } from 'react';
import {
  Landmark,
  Church,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  CheckCircle2,
  Plus,
  Trash2,
  Music,
  BookOpen
} from 'lucide-react';
import {
  CeremonyDetails,
  CeremonyReadingItem,
  CeremonyRequirement,
  CeremonySongItem,
  GuestItem
} from '../types/lazo';

interface CeremoniesSectionProps {
  ceremonies: CeremonyDetails;
  weddingDate: string;
  guests: GuestItem[];
  weddingDayMode?: boolean;
  onChange: (updater: (prev: CeremonyDetails) => CeremonyDetails) => void;
}

const DEFAULT_CIVIL_REQS: CeremonyRequirement[] = [
  { id: 'creq_1', title: 'Acta de nacimiento certificada de ambos novios', completed: false },
  { id: 'creq_2', title: 'Identificación oficial vigente (INE o Pasaporte) de novios y testigos', completed: false },
  { id: 'creq_3', title: 'Certificado y análisis médicos prenupciales', completed: false },
  { id: 'creq_4', title: 'Solicitud de matrimonio civil requisitada', completed: false },
  { id: 'creq_5', title: 'Pago de derechos de Registro Civil / Juez a domicilio', completed: false }
];

const DEFAULT_RELIGIOUS_REQS: CeremonyRequirement[] = [
  { id: 'rreq_1', title: 'Pláticas prematrimoniales (constancia)', completed: false },
  { id: 'rreq_2', title: 'Actas de bautismo y confirmación actualizadas', completed: false },
  { id: 'rreq_3', title: 'Presentación matrimonial con testigos (2 por cada novio)', completed: false },
  { id: 'rreq_4', title: 'Carta de traslado de parroquia (si aplica)', completed: false },
  { id: 'rreq_5', title: 'Pago de ofrenda / derechos de templo', completed: false }
];

const SACRAMENT_MOMENTS = [
  'Entrada de novio y cortejo',
  'Entrada de la novia',
  'Rito del matrimonio',
  'Intercambio de anillos',
  'Imposición de anillos, arras y lazo',
  'Ofertorio',
  'Comunión',
  'Entrega de ramo a la Virgen',
  'Firmas',
  'Salida de novios'
];

const READING_TYPES = [
  'Primera Lectura',
  'Salmo Responsorial',
  'Segunda Lectura',
  'Oración de los Fieles / Peticiones',
  'Monición de Entrada'
];

export const CeremoniesSection: React.FC<CeremoniesSectionProps> = ({
  ceremonies,
  weddingDate,
  guests,
  weddingDayMode = false,
  onChange
}) => {
  // Civil local inputs
  const [witnessMode, setWitnessMode] = useState<'guest' | 'custom'>('guest');
  const [selectedWitnessGuest, setSelectedWitnessGuest] = useState('');
  const [customWitness, setCustomWitness] = useState('');
  const [newCivilReq, setNewCivilReq] = useState('');
  const [civilSongDraft, setCivilSongDraft] = useState({ moment: '', title: '', artist: '' });

  // Religious local inputs
  const [newRelReq, setNewRelReq] = useState('');
  const [relSongDraft, setRelSongDraft] = useState({
    moment: SACRAMENT_MOMENTS[0],
    title: '',
    artist: ''
  });
  const [relReadingDraft, setRelReadingDraft] = useState({
    type: READING_TYPES[0],
    title: '',
    reader: ''
  });

  const civilReqs = ceremonies.civilRequirements ?? DEFAULT_CIVIL_REQS;
  const civilWitnesses =
    ceremonies.civilWitnessList ??
    (ceremonies.civilWitnesses
      ? ceremonies.civilWitnesses
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : []);
  const civilSongs = ceremonies.civilMusicSongs ?? [];

  const relReqs = ceremonies.religiousRequirements ?? DEFAULT_RELIGIOUS_REQS;
  const relSongs = ceremonies.religiousMusicList ?? [];
  const relReadings = ceremonies.religiousReadingsList ?? [];

  const activeGuests = guests.filter(g => g.status !== 'No asistirá');

  if (weddingDayMode) {
    return (
      <div className="space-y-5">
        {!ceremonies.civilEnabled && !ceremonies.religiousEnabled ? (
          <div className="bg-white rounded-3xl p-8 border border-[#EFE8E1] text-center text-xs text-[#7D6F6B]">
            No hay ceremonias activas configuradas para esta boda.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {ceremonies.civilEnabled && (
              <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#FAF8F5]">
                  <div className="w-9 h-9 rounded-2xl bg-[#FAF4F3] border border-[#EEDAD6] flex items-center justify-center text-[#C48B81]">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-editorial text-xl text-[#2B2826]">Ceremonia Civil</h3>
                    <p className="text-xs text-[#7D6F6B]">
                      {[ceremonies.civilDate || weddingDate, ceremonies.civilTime, ceremonies.civilVenue].filter(Boolean).join(' · ') || 'Sin horario definido'}
                    </p>
                  </div>
                </div>

                {ceremonies.civilJudge && (
                  <div className="text-xs text-[#2B2826] flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span className="text-[#7D6F6B]">Juez / Oficial:</span>
                    <span className="font-medium">{ceremonies.civilJudge}</span>
                  </div>
                )}

                {civilWitnesses.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#C48B81]" />
                      <span>Testigos ({civilWitnesses.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {civilWitnesses.map(w => (
                        <span key={w} className="px-2.5 py-1 rounded-full text-xs bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1]">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {civilSongs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-[#C48B81]" />
                      <span>Música Civil</span>
                    </div>
                    <div className="divide-y divide-[#FAF8F5]">
                      {civilSongs.map(s => (
                        <div key={s.id} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium text-[#A86B60] shrink-0">{s.moment}</span>
                          <span className="text-[#2B2826] text-right">
                            {s.title}{s.artist ? ` · ${s.artist}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ceremonies.civilNotes && (
                  <p className="text-xs text-[#5E524E] bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                    {ceremonies.civilNotes}
                  </p>
                )}
              </div>
            )}

            {ceremonies.religiousEnabled && (
              <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-2xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#FAF8F5]">
                  <div className="w-9 h-9 rounded-2xl bg-[#FAF4F3] border border-[#EEDAD6] flex items-center justify-center text-[#C48B81]">
                    <Church className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-editorial text-xl text-[#2B2826]">Ceremonia Religiosa</h3>
                    <p className="text-xs text-[#7D6F6B]">
                      {[ceremonies.religiousDate || weddingDate, ceremonies.religiousTime, ceremonies.religiousVenue].filter(Boolean).join(' · ') || 'Sin horario definido'}
                    </p>
                  </div>
                </div>

                {ceremonies.religiousOfficiant && (
                  <div className="text-xs text-[#2B2826] flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span className="text-[#7D6F6B]">Sacerdote / Celebrante:</span>
                    <span className="font-medium">{ceremonies.religiousOfficiant}</span>
                  </div>
                )}

                {relReadings.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#C48B81]" />
                      <span>Lecturas ({relReadings.length})</span>
                    </div>
                    <div className="divide-y divide-[#FAF8F5]">
                      {relReadings.map(r => (
                        <div key={r.id} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium text-[#A86B60] shrink-0">{r.type}</span>
                          <span className="text-[#2B2826] text-right">
                            {r.reader || 'Por asignar'}{r.title ? ` (${r.title})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {relSongs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-[#C48B81]" />
                      <span>Repertorio Musical ({relSongs.length})</span>
                    </div>
                    <div className="divide-y divide-[#FAF8F5]">
                      {relSongs.map(s => (
                        <div key={s.id} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium text-[#A86B60] shrink-0">{s.moment}</span>
                          <span className="text-[#2B2826] text-right">
                            {s.title}{s.artist ? ` · ${s.artist}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ceremonies.religiousNotes && (
                  <p className="text-xs text-[#5E524E] bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                    {ceremonies.religiousNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const handleAddWitness = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (witnessMode === 'guest' ? selectedWitnessGuest : customWitness).trim();
    if (!name || civilWitnesses.includes(name)) return;
    onChange(prev => ({
      ...prev,
      civilWitnessList: [...(prev.civilWitnessList ?? civilWitnesses), name],
      civilWitnesses: [...(prev.civilWitnessList ?? civilWitnesses), name].join(', ')
    }));
    setSelectedWitnessGuest('');
    setCustomWitness('');
  };

  const handleRemoveWitness = (name: string) => {
    const next = civilWitnesses.filter(w => w !== name);
    onChange(prev => ({ ...prev, civilWitnessList: next, civilWitnesses: next.join(', ') }));
  };

  const handleToggleCivilReq = (id: string) => {
    const next = civilReqs.map(r => (r.id === id ? { ...r, completed: !r.completed } : r));
    onChange(prev => ({ ...prev, civilRequirements: next }));
  };

  const handleAddCivilReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCivilReq.trim()) return;
    onChange(prev => ({
      ...prev,
      civilRequirements: [
        ...civilReqs,
        { id: `creq_${Date.now()}`, title: newCivilReq.trim(), completed: false }
      ]
    }));
    setNewCivilReq('');
  };

  const handleRemoveCivilReq = (id: string) => {
    onChange(prev => ({ ...prev, civilRequirements: civilReqs.filter(r => r.id !== id) }));
  };

  const handleAddCivilSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!civilSongDraft.moment.trim() || !civilSongDraft.title.trim()) return;
    const item: CeremonySongItem = {
      id: `csong_${Date.now()}`,
      moment: civilSongDraft.moment.trim(),
      title: civilSongDraft.title.trim(),
      artist: civilSongDraft.artist.trim() || undefined
    };
    onChange(prev => ({ ...prev, civilMusicSongs: [...civilSongs, item] }));
    setCivilSongDraft({ moment: '', title: '', artist: '' });
  };

  const handleToggleRelReq = (id: string) => {
    const next = relReqs.map(r => (r.id === id ? { ...r, completed: !r.completed } : r));
    onChange(prev => ({ ...prev, religiousRequirements: next }));
  };

  const handleAddRelReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelReq.trim()) return;
    onChange(prev => ({
      ...prev,
      religiousRequirements: [
        ...relReqs,
        { id: `rreq_${Date.now()}`, title: newRelReq.trim(), completed: false }
      ]
    }));
    setNewRelReq('');
  };

  const handleRemoveRelReq = (id: string) => {
    onChange(prev => ({ ...prev, religiousRequirements: relReqs.filter(r => r.id !== id) }));
  };

  const handleAddRelSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relSongDraft.title.trim()) return;
    const item: CeremonySongItem = {
      id: `rsong_${Date.now()}`,
      moment: relSongDraft.moment,
      title: relSongDraft.title.trim(),
      artist: relSongDraft.artist.trim() || undefined
    };
    onChange(prev => ({ ...prev, religiousMusicList: [...relSongs, item] }));
    setRelSongDraft({ moment: SACRAMENT_MOMENTS[0], title: '', artist: '' });
  };

  const handleAddRelReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relReadingDraft.title.trim()) return;
    const item: CeremonyReadingItem = {
      id: `rread_${Date.now()}`,
      type: relReadingDraft.type,
      title: relReadingDraft.title.trim(),
      reader: relReadingDraft.reader.trim() || 'Por asignar'
    };
    onChange(prev => ({ ...prev, religiousReadingsList: [...relReadings, item] }));
    setRelReadingDraft({ type: READING_TYPES[0], title: '', reader: '' });
  };

  const civilDoneCount = civilReqs.filter(r => r.completed).length;
  const relDoneCount = relReqs.filter(r => r.completed).length;

  return (
    <div className="space-y-5">
      {/* ==================== CEREMONIA CIVIL ==================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE8E1] shadow-2xs space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center text-[#C48B81] shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#7D6F6B] block">
                Protocolo Legal & Firma
              </span>
              <h3 className="font-editorial text-2xl text-[#2B2826] leading-tight">
                Ceremonia Civil
              </h3>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs text-[#7D6F6B] hidden sm:inline">
              {ceremonies.civilEnabled ? 'Activa' : 'Activar'}
            </span>
            <input
              type="checkbox"
              checked={ceremonies.civilEnabled}
              onChange={e => onChange(prev => ({ ...prev, civilEnabled: e.target.checked }))}
              className="w-5 h-5 accent-[#C48B81] cursor-pointer rounded"
            />
          </label>
        </div>

        {ceremonies.civilEnabled && (
          <div className="space-y-6 pt-4 border-t border-[#FAF8F5]">
            {/* 1. Datos Principales */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B]">
                Datos de la Ceremonia
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-[#C48B81]" /> Fecha
                  </label>
                  <input
                    type="date"
                    value={ceremonies.civilDate || weddingDate}
                    onChange={e => onChange(prev => ({ ...prev, civilDate: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] font-medium focus:outline-none"
                  />
                </div>
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-[#C48B81]" /> Hora
                  </label>
                  <input
                    type="time"
                    value={ceremonies.civilTime || ''}
                    onChange={e => onChange(prev => ({ ...prev, civilTime: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] font-medium focus:outline-none"
                  />
                </div>
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-[#C48B81]" /> Lugar / Juzgado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Jardín Hacienda / Oficialía 2"
                    value={ceremonies.civilVenue || ''}
                    onChange={e => onChange(prev => ({ ...prev, civilVenue: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none"
                  />
                </div>
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-[#C48B81]" /> Juez / Oficial
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del juez u oficial"
                    value={ceremonies.civilJudge || ''}
                    onChange={e => onChange(prev => ({ ...prev, civilJudge: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none"
                  />
                </div>
              </div>

              <textarea
                rows={2}
                placeholder="Notas de protocolo, régimen patrimonial, detalles de llegada del juez..."
                value={ceremonies.civilNotes || ''}
                onChange={e => onChange(prev => ({ ...prev, civilNotes: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
              />
            </div>

            {/* 2. Testigos + Requisitos en 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Testigos */}
              <div className="bg-[#FAF8F5]/70 rounded-2xl p-4 border border-[#EFE8E1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C48B81]" />
                    Testigos ({civilWitnesses.length})
                  </span>
                  <div className="flex items-center bg-white rounded-full border border-[#EFE8E1] p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setWitnessMode('guest')}
                      className={`px-2 py-0.5 rounded-full cursor-pointer focus:outline-none ${
                        witnessMode === 'guest' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B]'
                      }`}
                    >
                      De lista
                    </button>
                    <button
                      type="button"
                      onClick={() => setWitnessMode('custom')}
                      className={`px-2 py-0.5 rounded-full cursor-pointer focus:outline-none ${
                        witnessMode === 'custom' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B]'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {civilWitnesses.length === 0 ? (
                  <p className="text-xs text-[#7D6F6B] italic font-light">
                    Aún no has agregado testigos confirmados.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {civilWitnesses.map(w => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#EFE8E1] text-xs text-[#2B2826]"
                      >
                        {w}
                        <button
                          type="button"
                          onClick={() => handleRemoveWitness(w)}
                          className="text-[#7D6F6B] hover:text-rose-600 cursor-pointer focus:outline-none"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddWitness} className="flex gap-2">
                  {witnessMode === 'guest' && activeGuests.length > 0 ? (
                    <select
                      value={selectedWitnessGuest}
                      onChange={e => setSelectedWitnessGuest(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                    >
                      <option value="">Elegir de tus invitados...</option>
                      {activeGuests
                        .filter(g => !civilWitnesses.includes(g.name))
                        .map(g => (
                          <option key={g.id} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nombre completo del testigo..."
                      value={customWitness}
                      onChange={e => setCustomWitness(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                    />
                  )}
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-full bg-[#2B2826] text-white text-xs font-medium cursor-pointer focus:outline-none"
                  >
                    + Agregar
                  </button>
                </form>
              </div>

              {/* Requisitos Civiles */}
              <div className="bg-[#FAF8F5]/70 rounded-2xl p-4 border border-[#EFE8E1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B]">
                    Requisitos & Trámites Civiles
                  </span>
                  <span className="text-[11px] font-medium text-[#577355] bg-[#E5EDE6] px-2.5 py-0.5 rounded-full">
                    {civilDoneCount}/{civilReqs.length}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {civilReqs.map(req => (
                    <div
                      key={req.id}
                      onClick={() => handleToggleCivilReq(req.id)}
                      className="flex items-start justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#EFE8E1]/70 cursor-pointer group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            req.completed
                              ? 'bg-[#577355] border-[#577355] text-white'
                              : 'border-[#D8CFC8] bg-white'
                          }`}
                        >
                          {req.completed && <CheckCircle2 className="w-3 h-3" />}
                        </span>
                        <span
                          className={`text-xs leading-snug ${
                            req.completed ? 'line-through text-[#7D6F6B]' : 'text-[#2B2826]'
                          }`}
                        >
                          {req.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveCivilReq(req.id);
                        }}
                        className="text-[#7D6F6B]/40 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition cursor-pointer focus:outline-none"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddCivilReq} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar otro requisito..."
                    value={newCivilReq}
                    onChange={e => setNewCivilReq(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] text-xs text-[#2B2826] cursor-pointer focus:outline-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* 3. Música de Ceremonia Civil (Opcional) */}
            <div className="bg-[#FAF8F5]/70 rounded-2xl p-4 border border-[#EFE8E1] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-[#C48B81]" />
                  Música en Ceremonia Civil
                </span>
                <label className="inline-flex items-center gap-2 text-xs text-[#5A524C] cursor-pointer">
                  <span>¿Tendrá música?</span>
                  <input
                    type="checkbox"
                    checked={Boolean(ceremonies.civilHasMusic)}
                    onChange={e => onChange(prev => ({ ...prev, civilHasMusic: e.target.checked }))}
                    className="w-4 h-4 accent-[#C48B81] cursor-pointer"
                  />
                </label>
              </div>

              {ceremonies.civilHasMusic && (
                <div className="space-y-2.5 pt-1">
                  {civilSongs.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-[#EFE8E1]/70 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#A86B60]">{s.moment}:</span>{' '}
                        <span className="text-[#2B2826]">{s.title}</span>
                        {s.artist && <span className="text-[#7D6F6B]"> · {s.artist}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(prev => ({
                            ...prev,
                            civilMusicSongs: civilSongs.filter(x => x.id !== s.id)
                          }))
                        }
                        className="text-[#7D6F6B]/50 hover:text-rose-600 cursor-pointer focus:outline-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <form onSubmit={handleAddCivilSong} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Momento (ej. Entrada)"
                      value={civilSongDraft.moment}
                      onChange={e => setCivilSongDraft({ ...civilSongDraft, moment: e.target.value })}
                      className="px-3 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Canción *"
                      value={civilSongDraft.title}
                      onChange={e => setCivilSongDraft({ ...civilSongDraft, title: e.target.value })}
                      className="px-3 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                    />
                    <input
                      type="text"
                      placeholder="Artista (opcional)"
                      value={civilSongDraft.artist}
                      onChange={e => setCivilSongDraft({ ...civilSongDraft, artist: e.target.value })}
                      className="px-3 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full bg-[#2B2826] text-white text-xs font-medium cursor-pointer focus:outline-none"
                    >
                      + Canción
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== CEREMONIA RELIGIOSA ==================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE8E1] shadow-2xs space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center text-[#C48B81] shrink-0">
              <Church className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#7D6F6B] block">
                Sacramento & Liturgia
              </span>
              <h3 className="font-editorial text-2xl text-[#2B2826] leading-tight">
                Ceremonia Religiosa
              </h3>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs text-[#7D6F6B] hidden sm:inline">
              {ceremonies.religiousEnabled ? 'Activa' : 'Activar'}
            </span>
            <input
              type="checkbox"
              checked={ceremonies.religiousEnabled}
              onChange={e => onChange(prev => ({ ...prev, religiousEnabled: e.target.checked }))}
              className="w-5 h-5 accent-[#C48B81] cursor-pointer rounded"
            />
          </label>
        </div>

        {ceremonies.religiousEnabled && (
          <div className="space-y-6 pt-4 border-t border-[#FAF8F5]">
            {/* 1. Datos del Templo */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B]">
                Datos del Templo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-[#C48B81]" /> Fecha
                  </label>
                  <input
                    type="date"
                    value={ceremonies.religiousDate || weddingDate}
                    onChange={e => onChange(prev => ({ ...prev, religiousDate: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] font-medium focus:outline-none"
                  />
                </div>
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-[#C48B81]" /> Hora
                  </label>
                  <input
                    type="time"
                    value={ceremonies.religiousTime || ''}
                    onChange={e => onChange(prev => ({ ...prev, religiousTime: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] font-medium focus:outline-none"
                  />
                </div>
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-[#C48B81]" /> Parroquia / Templo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Parroquia de Guadalupe"
                    value={ceremonies.religiousVenue || ''}
                    onChange={e => onChange(prev => ({ ...prev, religiousVenue: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none"
                  />
                </div>
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFE8E1]">
                  <label className="text-[10px] uppercase tracking-wider text-[#7D6F6B] flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-[#C48B81]" /> Sacerdote / Oficiante
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del padre"
                    value={ceremonies.religiousOfficiant || ''}
                    onChange={e => onChange(prev => ({ ...prev, religiousOfficiant: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none"
                  />
                </div>
              </div>

              <textarea
                rows={2}
                placeholder="Notas del templo, padrinos (velación, anillos, arras, lazo), cortejo..."
                value={ceremonies.religiousNotes || ''}
                onChange={e => onChange(prev => ({ ...prev, religiousNotes: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs text-[#2B2826] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81]"
              />
            </div>

            {/* 2. Repertorio Musical por Momento */}
            <div className="bg-[#FAF8F5]/70 rounded-2xl p-4 border border-[#EFE8E1] space-y-3">
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#C48B81]" />
                Repertorio Musical ({relSongs.length})
              </span>

              {relSongs.length === 0 ? (
                <p className="text-xs text-[#7D6F6B] italic font-light">
                  Agrega las canciones para cada momento de la misa (entrada, anillos, firmas, salida).
                </p>
              ) : (
                <div className="space-y-1.5">
                  {relSongs.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-[#EFE8E1]/70 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#A86B60]">{s.moment}:</span>{' '}
                        <span className="text-[#2B2826]">{s.title}</span>
                        {s.artist && <span className="text-[#7D6F6B]"> · {s.artist}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(prev => ({
                            ...prev,
                            religiousMusicList: relSongs.filter(x => x.id !== s.id)
                          }))
                        }
                        className="text-[#7D6F6B]/50 hover:text-rose-600 cursor-pointer focus:outline-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddRelSong} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={relSongDraft.moment}
                  onChange={e => setRelSongDraft({ ...relSongDraft, moment: e.target.value })}
                  className="px-3 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs text-[#2B2826] focus:outline-none focus:border-[#C48B81]"
                >
                  {SACRAMENT_MOMENTS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Canción / Pieza *"
                  value={relSongDraft.title}
                  onChange={e => setRelSongDraft({ ...relSongDraft, title: e.target.value })}
                  className="px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                />
                <input
                  type="text"
                  placeholder="Coro / Intérprete (opcional)"
                  value={relSongDraft.artist}
                  onChange={e => setRelSongDraft({ ...relSongDraft, artist: e.target.value })}
                  className="px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#2B2826] text-white text-xs font-medium cursor-pointer focus:outline-none"
                >
                  + Agregar Canción
                </button>
              </form>
            </div>

            {/* 3. Lecturas + Requisitos Eclesiásticos en 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Lecturas */}
              <div className="bg-[#FAF8F5]/70 rounded-2xl p-4 border border-[#EFE8E1] space-y-3">
                <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#C48B81]" />
                  Lecturas & Lectores ({relReadings.length})
                </span>

                {relReadings.length === 0 ? (
                  <p className="text-xs text-[#7D6F6B] italic font-light">
                    Asigna las lecturas y quién pasará al ambón.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {relReadings.map(r => (
                      <div
                        key={r.id}
                        className="flex items-start justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-[#EFE8E1]/70 text-xs"
                      >
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#C48B81] block">
                            {r.type}
                          </span>
                          <p className="text-[#2B2826] font-medium">{r.title}</p>
                          <p className="text-[11px] text-[#7D6F6B] font-light">Lector: {r.reader}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onChange(prev => ({
                              ...prev,
                              religiousReadingsList: relReadings.filter(x => x.id !== r.id)
                            }))
                          }
                          className="text-[#7D6F6B]/50 hover:text-rose-600 cursor-pointer focus:outline-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddRelReading} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={relReadingDraft.type}
                      onChange={e => setRelReadingDraft({ ...relReadingDraft, type: e.target.value })}
                      className="px-3 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                    >
                      {READING_TYPES.map(rt => (
                        <option key={rt} value={rt}>
                          {rt}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Lector (ej. Hermana)"
                      value={relReadingDraft.reader}
                      onChange={e => setRelReadingDraft({ ...relReadingDraft, reader: e.target.value })}
                      className="px-3 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Cita o título (ej. 1 Corintios 13)"
                      value={relReadingDraft.title}
                      onChange={e => setRelReadingDraft({ ...relReadingDraft, title: e.target.value })}
                      className="flex-1 px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-full bg-[#2B2826] text-white text-xs font-medium cursor-pointer focus:outline-none"
                    >
                      + Lectura
                    </button>
                  </div>
                </form>
              </div>

              {/* Requisitos Eclesiásticos */}
              <div className="bg-[#FAF8F5]/70 rounded-2xl p-4 border border-[#EFE8E1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B]">
                    Requisitos Eclesiásticos
                  </span>
                  <span className="text-[11px] font-medium text-[#577355] bg-[#E5EDE6] px-2.5 py-0.5 rounded-full">
                    {relDoneCount}/{relReqs.length}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {relReqs.map(req => (
                    <div
                      key={req.id}
                      onClick={() => handleToggleRelReq(req.id)}
                      className="flex items-start justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#EFE8E1]/70 cursor-pointer group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            req.completed
                              ? 'bg-[#577355] border-[#577355] text-white'
                              : 'border-[#D8CFC8] bg-white'
                          }`}
                        >
                          {req.completed && <CheckCircle2 className="w-3 h-3" />}
                        </span>
                        <span
                          className={`text-xs leading-snug ${
                            req.completed ? 'line-through text-[#7D6F6B]' : 'text-[#2B2826]'
                          }`}
                        >
                          {req.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveRelReq(req.id);
                        }}
                        className="text-[#7D6F6B]/40 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition cursor-pointer focus:outline-none"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddRelReq} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar otro requisito..."
                    value={newRelReq}
                    onChange={e => setNewRelReq(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] text-xs focus:outline-none focus:border-[#C48B81]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-full bg-white border border-[#EFE8E1] hover:border-[#C48B81] text-xs text-[#2B2826] cursor-pointer focus:outline-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
