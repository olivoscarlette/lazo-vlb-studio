import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReligiousCeremony, Vendor, Guest } from '../types';
import {
  Church, Calendar, Clock, MapPin, User, Music,
  BookOpen, MessageSquare, Sparkles, Save, Edit3, Lock, X, Plus, Trash2, CheckSquare, Square, Download
} from 'lucide-react';

interface MusicItem {
  id: string;
  moment: string;
  song: string;
}

interface ReadingItem {
  id: string;
  type: string;
  title: string;
  reader: string;
}

export const SACRAMENT_MOMENTS_ORDER = [
  'Entrada de novio y cortejo',
  'Entrada de la novia',
  'Rito del matrimonio',
  'Imposición de anillos, arras y lazo',
  'Ofertorio',
  'Comunión',
  'Entrega de ramo a la Virgen',
  'Firmas',
  'Salida de novios'
];

export const normalizeMomentName = (m: string): string => {
  const clean = (m || '').trim().toLowerCase();
  for (const canonical of SACRAMENT_MOMENTS_ORDER) {
    if (clean === canonical.toLowerCase()) return canonical;
  }
  if (clean.includes('cortejo') || (clean.includes('entrada') && clean.includes('novio'))) return 'Entrada de novio y cortejo';
  if (clean.includes('entrada') && clean.includes('novia')) return 'Entrada de la novia';
  if (clean.includes('rito') || clean.includes('consentimiento')) return 'Rito del matrimonio';
  if (clean.includes('anillo') || clean.includes('arras') || clean.includes('lazo')) return 'Imposición de anillos, arras y lazo';
  if (clean.includes('ofertorio') || clean.includes('dones')) return 'Ofertorio';
  if (clean.includes('comunión') || clean.includes('comunion')) return 'Comunión';
  if (clean.includes('ramo') || clean.includes('virgen')) return 'Entrega de ramo a la Virgen';
  if (clean.includes('firma')) return 'Firmas';
  if (clean.includes('salida')) return 'Salida de novios';
  return (m || '').trim();
};

export const deduplicateAndSortMusic = (items: MusicItem[]): MusicItem[] => {
  const map = new Map<string, MusicItem>();

  for (const item of items) {
    const canonical = normalizeMomentName(item.moment);
    const key = canonical.toLowerCase();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...item, moment: canonical });
    } else {
      const currentSong = (existing.song || '').trim();
      const newSong = (item.song || '').trim();
      const hasRealNew = newSong && newSong.toLowerCase() !== 'por definir';
      const hasRealCurrent = currentSong && currentSong.toLowerCase() !== 'por definir';

      // Keep the item with an actual entered song
      if (hasRealNew && !hasRealCurrent) {
        map.set(key, { ...existing, song: item.song });
      } else if (hasRealNew && hasRealCurrent && newSong !== currentSong) {
        map.set(key, { ...existing, song: item.song });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const idxA = SACRAMENT_MOMENTS_ORDER.findIndex(m => m.toLowerCase() === a.moment.toLowerCase());
    const idxB = SACRAMENT_MOMENTS_ORDER.findIndex(m => m.toLowerCase() === b.moment.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.moment.localeCompare(b.moment);
  });
};

const parseMusicList = (raw?: string): MusicItem[] => {
  if (!raw || !raw.trim()) return [];
  let items: MusicItem[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    // Legacy plain text fallback: split by lines or semicolons into list items
    items = raw
      .split(/\n|;/)
      .map(s => s.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const parts = line.split(':');
        if (parts.length > 1) {
          return {
            id: `m_legacy_${idx}`,
            moment: parts[0].trim(),
            song: parts.slice(1).join(':').trim()
          };
        }
        return {
          id: `m_legacy_${idx}`,
          moment: 'Repertorio',
          song: line
        };
      });
  }
  return deduplicateAndSortMusic(items);
};

const parseReadingsList = (raw?: string): ReadingItem[] => {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy plain text fallback
    return raw
      .split(/\n|;/)
      .map(s => s.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const parts = line.split(':');
        if (parts.length > 1) {
          return {
            id: `r_legacy_${idx}`,
            type: parts[0].trim(),
            title: parts.slice(1).join(':').trim(),
            reader: 'Por asignar'
          };
        }
        return {
          id: `r_legacy_${idx}`,
          type: 'Lectura',
          title: line,
          reader: 'Por asignar'
        };
      });
  }
  return [];
};

export const ReligiosaModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const isNovios = user?.role === 'NOVIOS';
  const [religious, setReligious] = useState<ReligiousCeremony | null>(null);
  const [reusedVendors, setReusedVendors] = useState<Vendor[]>([]);
  const [confirmedGuests, setConfirmedGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Read-only vs Edit mode for main ceremony details to prevent accidental edits
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    date: '',
    time: '',
    temple_name: '',
    officiant: '',
    notes: ''
  });

  // Structured Music List state
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [newMusicMoment, setNewMusicMoment] = useState('Entrada de novio y cortejo');
  const [newMusicSong, setNewMusicSong] = useState('');

  // Structured Readings List state
  const [readingsList, setReadingsList] = useState<ReadingItem[]>([]);
  const [newReadingType, setNewReadingType] = useState('Primera Lectura');
  const [newReadingTitle, setNewReadingTitle] = useState('');
  const [newReadingReader, setNewReadingReader] = useState('');
  const [newReq, setNewReq] = useState('');

  const handleDeactivateCeremony = async () => {
    if (!window.confirm('¿Deseas ocultar y desactivar la ceremonia religiosa para esta boda?')) return;
    await handleSave({
      date: '',
      time: '',
      temple_name: '',
      officiant: '',
      notes: '',
      music_notes: '',
      readings_notes: '',
      requirements_status: []
    });
    setMusicList([]);
    setReadingsList([]);
    setIsConfiguring(false);
    setIsEditingDetails(false);
  };

  const fetchReligiousData = async () => {
    if (!currentWedding || !token) return;
    try {
      const [relRes, guestsRes] = await Promise.all([
        fetch(`/api/weddings/${currentWedding.id}/religious`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}/guests?status=Confirmado&limit=500`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (relRes.ok) {
        const data = await relRes.json();
        setReligious(data.religious);
        setReusedVendors(data.reusedVendors || []);
        if (data.religious) {
          setDetailsDraft({
            date: data.religious.date || '',
            time: data.religious.time || '',
            temple_name: data.religious.temple_name || '',
            officiant: data.religious.officiant || '',
            notes: data.religious.notes || ''
          });
          setMusicList(parseMusicList(data.religious.music_notes));
          setReadingsList(parseReadingsList(data.religious.readings_notes));
        }
      }

      if (guestsRes.ok) {
        const gData = await guestsRes.json();
        setConfirmedGuests(gData.guests || []);
      }
    } catch (err) {
      console.error('Error fetching religious ceremony:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReligiousData();
  }, [currentWedding, token]);

  const handleSave = async (updatedData: Partial<ReligiousCeremony>) => {
    if (!religious) return;
    setSaving(true);
    const merged = { ...religious, ...updatedData };
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/religious`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(merged)
      });
      if (res.ok) {
        setReligious(merged as ReligiousCeremony);
      }
    } catch (err) {
      console.error('Error saving religious ceremony:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditDetails = () => {
    if (!religious) return;
    setDetailsDraft({
      date: religious.date || '',
      time: religious.time || '',
      temple_name: religious.temple_name || '',
      officiant: religious.officiant || '',
      notes: religious.notes || ''
    });
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSave(detailsDraft);
    setIsEditingDetails(false);
  };

  const handleToggleRequirement = (reqId: string) => {
    if (!religious) return;
    const reqs = religious.requirements_status || [];
    const updated = reqs.map(r => (r.id === reqId ? { ...r, completed: !r.completed } : r));
    handleSave({ requirements_status: updated });
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.trim() || !religious) return;
    const reqs = religious.requirements_status || [];
    const newItems = [...reqs, { id: 'req_rel_' + Date.now(), title: newReq.trim(), completed: false }];
    handleSave({ requirements_status: newItems });
    setNewReq('');
  };

  const handleRemoveRequirement = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!religious) return;
    const reqs = religious.requirements_status || [];
    const updated = reqs.filter(r => r.id !== reqId);
    handleSave({ requirements_status: updated });
  };

  const handleLoadMasterRequirements = async () => {
    if (!religious || !token) return;
    try {
      const res = await fetch('/api/catalogs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const masterReqs: string[] = data.catalogs?.master_religious_requirements || [];
        const currentReqs = religious.requirements_status || [];
        const existingTitles = new Set(currentReqs.map(r => r.title.toLowerCase()));
        const toAdd = masterReqs
          .filter(title => !existingTitles.has(title.toLowerCase()))
          .map((title, idx) => ({
            id: `req_rel_vlb_${Date.now()}_${idx}`,
            title,
            completed: false
          }));
        if (toAdd.length > 0) {
          await handleSave({ requirements_status: [...currentReqs, ...toAdd] });
        }
      }
    } catch (err) {
      console.error('Error loading master religious requirements:', err);
    }
  };

  // Music List Handlers
  const handleAddMusicItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMusicSong.trim()) return;
    const canonical = normalizeMomentName(newMusicMoment);
    const key = canonical.toLowerCase();

    // Check if moment already exists in musicList
    const existingIdx = musicList.findIndex(m => normalizeMomentName(m.moment).toLowerCase() === key);
    let updated: MusicItem[];

    if (existingIdx !== -1) {
      // Update existing moment - NEVER DUPLICATE!
      updated = musicList.map((item, idx) =>
        idx === existingIdx ? { ...item, song: newMusicSong.trim() } : item
      );
    } else {
      updated = deduplicateAndSortMusic([
        ...musicList,
        {
          id: `music_${Date.now()}`,
          moment: canonical,
          song: newMusicSong.trim()
        }
      ]);
    }

    setMusicList(updated);
    setNewMusicSong('');
    await handleSave({ music_notes: JSON.stringify(updated) });
  };

  const handleLoadSacramentMoments = async () => {
    // Preserve any existing songs that were entered (e.g. "ok")
    const existingMap = new Map<string, string>();
    for (const item of musicList) {
      const norm = normalizeMomentName(item.moment).toLowerCase();
      const current = existingMap.get(norm);
      const isReal = item.song && item.song.trim().toLowerCase() !== 'por definir';
      if (!current || isReal) {
        existingMap.set(norm, item.song.trim());
      }
    }

    const fullSacramentList: MusicItem[] = SACRAMENT_MOMENTS_ORDER.map((moment, idx) => {
      const existingSong = existingMap.get(moment.toLowerCase());
      return {
        id: `music_sacr_${idx + 1}`,
        moment,
        song: existingSong && existingSong.trim() ? existingSong : 'Por definir'
      };
    });

    setMusicList(fullSacramentList);
    await handleSave({ music_notes: JSON.stringify(fullSacramentList) });
  };

  const handleRemoveMusicItem = async (id: string) => {
    const updated = musicList.filter(item => item.id !== id);
    setMusicList(updated);
    await handleSave({ music_notes: JSON.stringify(updated) });
  };

  // Readings List Handlers
  const handleAddReadingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReadingTitle.trim() || !newReadingReader) return;
    const updated: ReadingItem[] = [
      ...readingsList,
      {
        id: `reading_${Date.now()}`,
        type: newReadingType,
        title: newReadingTitle.trim(),
        reader: newReadingReader
      }
    ];
    setReadingsList(updated);
    setNewReadingTitle('');
    setNewReadingReader('');
    await handleSave({ readings_notes: JSON.stringify(updated) });
  };

  const handleRemoveReadingItem = async (id: string) => {
    const updated = readingsList.filter(item => item.id !== id);
    setReadingsList(updated);
    await handleSave({ readings_notes: JSON.stringify(updated) });
  };

  if (loading || !religious) {
    return <div className="py-20 text-center text-[#8A7E72] text-sm">Cargando datos de ceremonia religiosa...</div>;
  }

  const confirmedGuestNames = confirmedGuests.map(g => `${g.first_name} ${g.last_name}`.trim());

  const liturgicalMoments = SACRAMENT_MOMENTS_ORDER;

  const readingTypes = [
    'Primera Lectura',
    'Salmo Responsorial',
    'Segunda Lectura',
    'Evangelio',
    'Oración de los Fieles (Peticiones)',
    'Monición de Entrada / Salida'
  ];

  const hasCeremony = Boolean(
    religious && (
      (religious.temple_name && religious.temple_name.trim().length > 0) ||
      (religious.date && religious.date.trim().length > 0) ||
      (religious.officiant && religious.officiant.trim().length > 0) ||
      (religious.requirements_status && religious.requirements_status.length > 0) ||
      musicList.length > 0 ||
      readingsList.length > 0
    )
  );

  if (!hasCeremony && !isConfiguring) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-[#C48B81]">
              Liturgia y Templo
            </span>
            <h2 className="font-serif text-3xl font-semibold text-[#2B2826]">
              Ceremonia Religiosa
            </h2>
            <p className="text-sm text-[#8A7E72] mt-1">
              Parroquia, celebrante, listado musical litúrgico y lecturas con lectores confirmados.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-10 border border-[#EFE8E1] shadow-xs text-center max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] flex items-center justify-center mx-auto mb-5 text-[#C48B81]">
            <Church className="w-8 h-8 stroke-[1.5]" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A7E72] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#EFE8E1]">
            Módulo Opcional
          </span>
          <h3 className="font-serif text-2xl font-semibold text-[#2B2826] mt-3 mb-2">
            Sin Ceremonia Religiosa Registrada
          </h3>
          <p className="text-sm text-[#8A7E72] leading-relaxed max-w-md mx-auto mb-6">
            Esta boda aún no tiene configurada una ceremonia o misa religiosa (o se celebrará únicamente ceremonia civil y fiesta). Puedes configurarla en cualquier momento si la pareja lo requiere.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsConfiguring(true);
                setIsEditingDetails(true);
              }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#C48B81] hover:bg-[#A86B60] text-white text-sm font-semibold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Configurar Ceremonia Religiosa</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-[#C48B81]">
            Liturgia y Templo
          </span>
          <h2 className="font-serif text-3xl font-semibold text-[#2B2826]">
            Ceremonia Religiosa
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1">
            Parroquia, celebrante, listado musical litúrgico y lecturas con lectores confirmados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isNovios && (
            <button
              type="button"
              onClick={handleDeactivateCeremony}
              className="text-xs font-semibold text-[#8A7E72] hover:text-rose-600 px-3 py-1.5 rounded-xl border border-[#EFE8E1] bg-white transition cursor-pointer"
              title="Ocultar y limpiar este módulo si la boda no tendrá ceremonia religiosa"
            >
              Desactivar Ceremonia
            </button>
          )}
          {saving && (
            <span className="text-xs text-[#8A7E72] animate-pulse">Guardando cambios...</span>
          )}
        </div>
      </div>

      {/* Main Details Card — Fixed / Read-Only by Default */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#FAF8F5]">
          <div className="flex items-center space-x-2.5">
            <Church className="w-5 h-5 text-[#C48B81]" />
            <div>
              <h3 className="font-serif text-xl font-semibold text-[#2B2826]">
                Datos del Templo y Celebración
              </h3>
              <p className="text-xs text-[#8A7E72] flex items-center space-x-1 mt-0.5">
                <span>Parroquia, templo, fecha, hora oficial y sacerdote celebrante.</span>
              </p>
            </div>
          </div>

          {!isEditingDetails ? (
            <button
              type="button"
              onClick={handleStartEditDetails}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EFE8E1] text-xs font-semibold transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Editar Datos</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          )}
        </div>

        {!isEditingDetails ? (
          /* Fixed Read-Only View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
                <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Fecha</span>
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {religious.date || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
                <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Hora de Inicio</span>
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {religious.time ? `${religious.time} hrs` : 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
                <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Templo / Parroquia</span>
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {religious.temple_name || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
                <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <User className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Sacerdote / Oficiante</span>
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {religious.officiant || 'Por definir'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                Notas Generales de la Iglesia
              </div>
              <div className="text-sm text-[#2B2826] leading-relaxed">
                {religious.notes || 'Sin notas adicionales registradas.'}
              </div>
            </div>
          </div>
        ) : (
          /* Editable Form Mode */
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Fecha</label>
                <input
                  type="date"
                  value={detailsDraft.date}
                  onChange={e => setDetailsDraft({ ...detailsDraft, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Hora de Inicio</label>
                <input
                  type="time"
                  value={detailsDraft.time}
                  onChange={e => setDetailsDraft({ ...detailsDraft, time: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Templo / Parroquia</label>
                <input
                  type="text"
                  placeholder="Parroquia Santa Teresita del Niño Jesús"
                  value={detailsDraft.temple_name}
                  onChange={e => setDetailsDraft({ ...detailsDraft, temple_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Sacerdote / Oficiante</label>
                <input
                  type="text"
                  placeholder="Pbro. Francisco Javier Gómez"
                  value={detailsDraft.officiant}
                  onChange={e => setDetailsDraft({ ...detailsDraft, officiant: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2B2826] mb-1">Notas Generales de la Iglesia</label>
              <textarea
                rows={2}
                placeholder="Reglamento del templo: lluvia de pétalos, fotógrafos autorizados, etc."
                value={detailsDraft.notes}
                onChange={e => setDetailsDraft({ ...detailsDraft, notes: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
              />
            </div>
          </form>
        )}
      </div>

      {/* Two Column Section: Structured Music List & Readings List with Confirmed Guests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Música de Ceremonia Religiosa (Structured List) */}
        <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs uppercase font-semibold tracking-wider text-[#C48B81]">
                  Programa Musical Litúrgico
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#2B2826] flex items-center space-x-2">
                  <Music className="w-4 h-4 text-[#C48B81]" />
                  <span>Música de Ceremonia Religiosa</span>
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadSacramentMoments}
                  className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EFE8E1] transition cursor-pointer"
                  title="Cargar momentos oficiales del Sacramento del Matrimonio en orden litúrgico"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Guía Litúrgica</span>
                </button>
                <span className="text-xs font-semibold text-[#A86B60] bg-[#FAF8F5] border border-[#EFE8E1] px-3 py-1 rounded-full">
                  {musicList.length} piezas
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
              {musicList.length === 0 ? (
                <div className="text-center py-6 px-4 bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EFE8E1] space-y-3">
                  <p className="text-xs text-[#8A7E72] italic">
                    No se han registrado piezas musicales aún.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSacramentMoments}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cargar Momentos del Sacramento del Matrimonio</span>
                  </button>
                </div>
              ) : (
                musicList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => {
                        setNewMusicMoment(item.moment);
                        setNewMusicSong(item.song && item.song !== 'Por definir' ? item.song : '');
                      }}
                      className="flex items-start space-x-3 flex-1 min-w-0 cursor-pointer group"
                      title="Haz clic para seleccionar este momento y escribir su canción abajo"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#FAF8F5] text-[#C48B81] border border-[#EFE8E1] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#C48B81]">
                          {item.moment}
                        </div>
                        <div className="text-sm font-medium text-[#2B2826] mt-0.5 group-hover:text-[#A86B60] transition-colors">
                          {item.song}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveMusicItem(item.id)}
                        className="text-[#8A7E72]/60 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                        title="Eliminar pieza"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddMusicItem} className="pt-3 border-t border-[#FAF8F5] space-y-2.5">
            <div className="text-xs font-semibold text-[#2B2826]">
              Asignar o actualizar canción por momento litúrgico:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={newMusicMoment}
                onChange={e => {
                  const m = e.target.value;
                  setNewMusicMoment(m);
                  const found = musicList.find(item => normalizeMomentName(item.moment).toLowerCase() === normalizeMomentName(m).toLowerCase());
                  if (found && found.song && found.song !== 'Por definir') {
                    setNewMusicSong(found.song);
                  } else {
                    setNewMusicSong('');
                  }
                }}
                className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
              >
                {liturgicalMoments.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Canción / Obra (ej. Canon en Re - Pachelbel)"
                value={newMusicSong}
                onChange={e => setNewMusicSong(e.target.value)}
                className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!newMusicSong.trim()}
              className="w-full py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-40 transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {musicList.some(m => normalizeMomentName(m.moment).toLowerCase() === normalizeMomentName(newMusicMoment).toLowerCase())
                  ? 'Guardar / Actualizar Canción de este Momento'
                  : 'Asignar Canción al Momento'}
              </span>
            </button>
          </form>
        </div>

        {/* Card 2: Lecturas de Ceremonia Religiosa (Title + Reader from Confirmed Guests) */}
        <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs uppercase font-semibold tracking-wider text-[#C48B81]">
                  Liturgia de la Palabra · Desde Confirmados
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#2B2826] flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-[#C48B81]" />
                  <span>Lecturas y Lectores Asignados</span>
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#A86B60] bg-[#FAF8F5] border border-[#EFE8E1] px-3 py-1 rounded-full">
                {readingsList.length} lecturas
              </span>
            </div>

            <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
              {readingsList.length === 0 ? (
                <p className="text-xs text-[#8A7E72] italic py-4 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EFE8E1]">
                  No se han registrado lecturas aún. Agrega el título y selecciona al lector de la lista de confirmados.
                </p>
              ) : (
                readingsList.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C48B81] bg-[#FAF8F5] border border-[#EFE8E1] px-2 py-0.5 rounded-full">
                          {item.type}
                        </span>
                        <span className="text-sm font-medium text-[#2B2826]">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-[#8A7E72] mt-1.5">
                        <User className="w-3.5 h-3.5 text-[#C48B81]" />
                        <span>Lector(a): <strong className="text-[#2B2826] font-medium">{item.reader}</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveReadingItem(item.id)}
                      className="text-[#8A7E72]/60 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition shrink-0 cursor-pointer"
                      title="Eliminar lectura"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddReadingItem} className="pt-3 border-t border-[#FAF8F5] space-y-2.5">
            <div className="text-xs font-semibold text-[#2B2826]">
              Agregar lectura con lector de la Lista de Confirmados ({confirmedGuests.length} confirmados):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={newReadingType}
                onChange={e => setNewReadingType(e.target.value)}
                className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
              >
                {readingTypes.map(rt => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Título o cita (ej. 1 Corintios 13, 4-8)"
                value={newReadingTitle}
                onChange={e => setNewReadingTitle(e.target.value)}
                className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newReadingReader}
                onChange={e => setNewReadingReader(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
              >
                <option value="">— Seleccionar lector(a) confirmado(a) —</option>
                {confirmedGuestNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!newReadingTitle.trim() || !newReadingReader}
                className="px-4 py-2 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-40 transition cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Requisitos y Trámites Eclesiásticos (Conectados a Plantilla Maestra) */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-[#C48B81]">Expediente Parroquial</span>
            <h3 className="font-serif text-lg font-semibold text-[#2B2826]">Requisitos y Trámites de Ceremonia Religiosa</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadMasterRequirements}
              className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EFE8E1] transition cursor-pointer"
              title="Cargar requisitos religiosos de la Plantilla Maestra"
            >
              <Download className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Cargar Plantilla Maestra</span>
            </button>
            <span className="text-xs font-semibold text-[#2B2826] bg-[#FAF8F5] border border-[#EFE8E1] px-2.5 py-1 rounded-full">
              {(religious.requirements_status || []).filter(r => r.completed).length} / {(religious.requirements_status || []).length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-5">
          {(religious.requirements_status || []).length === 0 ? (
            <p className="md:col-span-2 text-xs text-[#8A7E72] italic py-4 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EFE8E1]">
              No hay requisitos parroquiales cargados. Haz clic en "Cargar Plantilla Maestra" o agrega uno abajo.
            </p>
          ) : (
            (religious.requirements_status || []).map(r => (
              <div
                key={r.id}
                onClick={() => handleToggleRequirement(r.id)}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer text-xs transition ${
                  r.completed
                    ? 'bg-[#E4ECE5] border-[#D0DED2] text-[#2B5235] font-medium'
                    : 'bg-[#FCFAF7] border-[#EFE8E1] text-[#2B2826] hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {r.completed ? (
                    <CheckSquare className="w-4 h-4 text-[#2B5235] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-[#8A7E72] shrink-0" />
                  )}
                  <span className={r.completed ? 'line-through opacity-80' : ''}>{r.title}</span>
                </div>
                <button
                  type="button"
                  onClick={e => handleRemoveRequirement(r.id, e)}
                  className="text-[#8A7E72]/50 hover:text-rose-600 p-1 ml-2 transition cursor-pointer"
                  title="Eliminar requisito"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddRequirement} className="flex gap-2 pt-3 border-t border-[#FAF8F5]">
          <input
            type="text"
            placeholder="Agregar requisito parroquial a esta boda..."
            value={newReq}
            onChange={e => setNewReq(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-[#EFE8E1] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            Agregar
          </button>
        </form>
      </div>

      {/* AUTOMATIC REUSE: Reused Vendors Card for Iglesia */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-1.5 text-[#C48B81] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reutilización Automática de Proveedores</span>
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#2B2826]">
              Proveedores que participan en Iglesia / Templo
            </h3>
            <p className="text-sm text-[#8A7E72] mt-0.5">
              Reflejados automáticamente desde el módulo Proveedores y Pagos con la etiqueta <strong>IGLESIA</strong>. Sin volver a capturar.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#A86B60] bg-[#FAF8F5] border border-[#EFE8E1] px-3 py-1 rounded-full">
            {reusedVendors.length} proveedores
          </span>
        </div>

        {reusedVendors.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8A7E72] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EFE8E1]">
            No hay proveedores con etiqueta "IGLESIA". Ve a <strong>Proveedores y Pagos</strong> y marca la casilla IGLESIA en flores, música o foto.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reusedVendors.map(v => (
              <div
                key={v.id}
                className="bg-[#FCFAF7] p-4 rounded-2xl border border-[#EFE8E1] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#8A7E72] uppercase tracking-wider">{v.type}</span>
                    <span className="text-[10px] bg-[#FAF8F5] text-[#C48B81] font-semibold border border-[#EFE8E1] px-2 py-0.5 rounded-full">IGLESIA</span>
                  </div>
                  <h4 className="font-semibold text-[#2B2826] text-sm">{v.name}</h4>
                  {v.contact_person && (
                    <p className="text-xs text-[#8A7E72] mt-0.5">Contacto: {v.contact_person}</p>
                  )}
                  {v.notes && (
                    <p className="text-xs text-[#8A7E72]/70 mt-2 line-clamp-2 italic">{v.notes}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#EFE8E1] flex items-center justify-between">
                  <a
                    href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs text-[#A86B60] hover:text-[#2B2826] font-mono transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>{v.phone}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
