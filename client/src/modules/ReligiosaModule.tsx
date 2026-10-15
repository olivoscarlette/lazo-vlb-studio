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

const parseMusicList = (raw?: string): MusicItem[] => {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy plain text fallback: split by lines or semicolons into list items
    return raw
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
  return [];
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
  const { currentWedding, token } = useAuth();
  const [religious, setReligious] = useState<ReligiousCeremony | null>(null);
  const [reusedVendors, setReusedVendors] = useState<Vendor[]>([]);
  const [confirmedGuests, setConfirmedGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Read-only vs Edit mode for main ceremony details to prevent accidental edits
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    date: '',
    time: '',
    temple_name: '',
    officiant: '',
    notes: ''
  });

  // Structured Music List state
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [newMusicMoment, setNewMusicMoment] = useState('Entrada de la Novia');
  const [newMusicSong, setNewMusicSong] = useState('');

  // Structured Readings List state
  const [readingsList, setReadingsList] = useState<ReadingItem[]>([]);
  const [newReadingType, setNewReadingType] = useState('Primera Lectura');
  const [newReadingTitle, setNewReadingTitle] = useState('');
  const [newReadingReader, setNewReadingReader] = useState('');
  const [newReq, setNewReq] = useState('');

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
    const updated: MusicItem[] = [
      ...musicList,
      {
        id: `music_${Date.now()}`,
        moment: newMusicMoment,
        song: newMusicSong.trim()
      }
    ];
    setMusicList(updated);
    setNewMusicSong('');
    await handleSave({ music_notes: JSON.stringify(updated) });
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
    return <div className="py-20 text-center text-stone-400 text-sm">Cargando datos de ceremonia religiosa...</div>;
  }

  const confirmedGuestNames = confirmedGuests.map(g => `${g.first_name} ${g.last_name}`.trim());

  const liturgicalMoments = [
    'Entrada del Novio y Cortejo',
    'Entrada de la Novia',
    'Señor Ten Piedad',
    'Gloria',
    'Aleluya',
    'Rito del Matrimonio / Votos',
    'Ofertorio',
    'Santo',
    'Cordero de Dios',
    'Comunión',
    'Entrega del Ramo / Ave María',
    'Firma de Actas',
    'Salida Nupcial'
  ];

  const readingTypes = [
    'Primera Lectura',
    'Salmo Responsorial',
    'Segunda Lectura',
    'Evangelio',
    'Oración de los Fieles (Peticiones)',
    'Monición de Entrada / Salida'
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Liturgia y Templo
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Ceremonia Religiosa
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Parroquia, celebrante, listado musical litúrgico y lecturas con lectores confirmados.
          </p>
        </div>

        {saving && (
          <span className="text-xs text-stone-400 animate-pulse">Guardando cambios...</span>
        )}
      </div>

      {/* Main Details Card — Fixed / Read-Only by Default */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
          <div className="flex items-center space-x-2.5">
            <Church className="w-5 h-5 text-[#9C665C]" />
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Datos del Templo y Celebración
              </h3>
              <p className="text-[11px] text-stone-500 flex items-center space-x-1 mt-0.5">
                <Lock className="w-3 h-3 text-stone-400" />
                <span>Información protegida contra cambios accidentales.</span>
              </p>
            </div>
          </div>

          {!isEditingDetails ? (
            <button
              type="button"
              onClick={handleStartEditDetails}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#EFE8DE] hover:bg-[#EFE2DF] text-[#332C2A] border border-[#DDD2C4] text-xs font-semibold transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#9C665C]" />
              <span>Editar Datos</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 text-xs font-medium transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition shadow-xs"
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
              <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Fecha</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {religious.date || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Hora de Inicio</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {religious.time ? `${religious.time} hrs` : 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Templo / Parroquia</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {religious.temple_name || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <User className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Sacerdote / Oficiante</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {religious.officiant || 'Por definir'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Notas Generales de la Iglesia
              </div>
              <div className="text-xs text-stone-700 leading-relaxed">
                {religious.notes || 'Sin notas adicionales registradas.'}
              </div>
            </div>
          </div>
        ) : (
          /* Editable Form Mode */
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={detailsDraft.date}
                  onChange={e => setDetailsDraft({ ...detailsDraft, date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Hora de Inicio</label>
                <input
                  type="time"
                  value={detailsDraft.time}
                  onChange={e => setDetailsDraft({ ...detailsDraft, time: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Templo / Parroquia</label>
                <input
                  type="text"
                  placeholder="Parroquia Santa Teresita del Niño Jesús"
                  value={detailsDraft.temple_name}
                  onChange={e => setDetailsDraft({ ...detailsDraft, temple_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Sacerdote / Oficiante</label>
                <input
                  type="text"
                  placeholder="Pbro. Francisco Javier Gómez"
                  value={detailsDraft.officiant}
                  onChange={e => setDetailsDraft({ ...detailsDraft, officiant: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Notas Generales de la Iglesia</label>
              <textarea
                rows={2}
                placeholder="Reglamento del templo: lluvia de pétalos, fotógrafos autorizados, etc."
                value={detailsDraft.notes}
                onChange={e => setDetailsDraft({ ...detailsDraft, notes: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </form>
        )}
      </div>

      {/* Two Column Section: Structured Music List & Readings List with Confirmed Guests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Música de Ceremonia Religiosa (Structured List) */}
        <div className="luxury-card rounded-2xl p-6 border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                  Programa Musical Litúrgico
                </span>
                <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center space-x-2">
                  <Music className="w-4 h-4 text-[#9C665C]" />
                  <span>Música de Ceremonia Religiosa</span>
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#8a574e] bg-[#EFE2DF] px-3 py-1 rounded-full">
                {musicList.length} piezas
              </span>
            </div>

            <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
              {musicList.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center bg-[#F9F6F2] rounded-xl border border-dashed border-[#DDD2C4]">
                  No se han agregado piezas musicales aún. Regístralas en el listado abajo.
                </p>
              ) : (
                musicList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#F9F6F2] border border-[#DDD2C4] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="w-5 h-5 rounded-full bg-[#EFE2DF] text-[#8a574e] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a574e]">
                          {item.moment}
                        </div>
                        <div className="text-xs font-semibold text-stone-900 mt-0.5">
                          {item.song}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMusicItem(item.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 transition shrink-0"
                      title="Eliminar pieza"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddMusicItem} className="pt-3 border-t border-stone-100 space-y-2.5">
            <div className="text-[11px] font-semibold text-stone-600">
              Agregar pieza al programa musical:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={newMusicMoment}
                onChange={e => setNewMusicMoment(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
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
                className="px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!newMusicSong.trim()}
              className="w-full py-2.5 bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-stone-800 shadow disabled:opacity-40 transition flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar al Listado Musical</span>
            </button>
          </form>
        </div>

        {/* Card 2: Lecturas de Ceremonia Religiosa (Title + Reader from Confirmed Guests) */}
        <div className="luxury-card rounded-2xl p-6 border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                  Liturgia de la Palabra · Desde Confirmados
                </span>
                <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-[#9C665C]" />
                  <span>Lecturas y Lectores Asignados</span>
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#8a574e] bg-[#EFE2DF] px-3 py-1 rounded-full">
                {readingsList.length} lecturas
              </span>
            </div>

            <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
              {readingsList.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center bg-[#F9F6F2] rounded-xl border border-dashed border-[#DDD2C4]">
                  No se han registrado lecturas aún. Agrega el título y selecciona al lector de la lista de confirmados.
                </p>
              ) : (
                readingsList.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#F9F6F2] border border-[#DDD2C4] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a574e] bg-[#EFE2DF] px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                        <span className="text-xs font-semibold text-stone-900">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[11px] text-stone-600 mt-1.5">
                        <User className="w-3.5 h-3.5 text-[#9C665C]" />
                        <span>Lector(a): <strong className="text-stone-900">{item.reader}</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveReadingItem(item.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 transition shrink-0"
                      title="Eliminar lectura"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddReadingItem} className="pt-3 border-t border-stone-100 space-y-2.5">
            <div className="text-[11px] font-semibold text-stone-600">
              Agregar lectura con lector de la Lista de Confirmados ({confirmedGuests.length} confirmados):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={newReadingType}
                onChange={e => setNewReadingType(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
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
                className="px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newReadingReader}
                onChange={e => setNewReadingReader(e.target.value)}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
              >
                <option value="">— Seleccionar lector(a) confirmado(a) —</option>
                {confirmedGuestNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!newReadingTitle.trim() || !newReadingReader}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-stone-800 shadow disabled:opacity-40 transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Requisitos y Trámites Eclesiásticos (Conectados a Plantilla Maestra VLB) */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Expediente Parroquial VLB</span>
            <h3 className="font-serif text-lg font-bold text-stone-900">Requisitos y Trámites de Ceremonia Religiosa</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadMasterRequirements}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-[#EFE8DE] hover:bg-[#EFE2DF] text-[#332C2A] border border-[#DDD2C4] transition"
              title="Cargar requisitos religiosos de la Plantilla Maestra de VLB Studio"
            >
              <Download className="w-3.5 h-3.5 text-[#9C665C]" />
              <span>Cargar Plantilla VLB</span>
            </button>
            <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
              {(religious.requirements_status || []).filter(r => r.completed).length} / {(religious.requirements_status || []).length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-5">
          {(religious.requirements_status || []).length === 0 ? (
            <p className="md:col-span-2 text-xs text-stone-400 italic py-4 text-center bg-[#F9F6F2] rounded-xl border border-dashed border-[#DDD2C4]">
              No hay requisitos parroquiales cargados. Haz clic en "Cargar Plantilla VLB" o agrega uno abajo.
            </p>
          ) : (
            (religious.requirements_status || []).map(r => (
              <div
                key={r.id}
                onClick={() => handleToggleRequirement(r.id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition ${
                  r.completed
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium'
                    : 'bg-[#F9F6F2] border-[#DDD2C4] text-stone-700 hover:bg-[#EFE8DE]/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {r.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400 shrink-0" />
                  )}
                  <span className={r.completed ? 'line-through opacity-80' : ''}>{r.title}</span>
                </div>
                <button
                  type="button"
                  onClick={e => handleRemoveRequirement(r.id, e)}
                  className="text-stone-300 hover:text-rose-600 p-1 ml-2"
                  title="Eliminar requisito"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddRequirement} className="flex gap-2 pt-3 border-t border-stone-100">
          <input
            type="text"
            placeholder="Agregar requisito parroquial a esta boda..."
            value={newReq}
            onChange={e => setNewReq(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-stone-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-stone-800 shadow"
          >
            Agregar
          </button>
        </form>
      </div>

      {/* AUTOMATIC REUSE: Reused Vendors Card for Iglesia */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200 bg-stone-50/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-1.5 text-lazo-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reutilización Automática de Proveedores</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Proveedores que participan en Iglesia / Templo
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Reflejados automáticamente desde el módulo Proveedores y Pagos con la etiqueta <strong>IGLESIA</strong>. Sin volver a capturar.
            </p>
          </div>
          <span className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
            {reusedVendors.length} proveedores
          </span>
        </div>

        {reusedVendors.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400 bg-white rounded-xl border border-stone-200">
            No hay proveedores con etiqueta "IGLESIA". Ve a <strong>Proveedores y Pagos</strong> y marca la casilla IGLESIA en flores, música o foto.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reusedVendors.map(v => (
              <div
                key={v.id}
                className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">{v.type}</span>
                    <span className="text-[9px] bg-[#EFE2DF] text-[#8a574e] font-bold px-2 py-0.5 rounded">IGLESIA</span>
                  </div>
                  <h4 className="font-bold text-stone-900 text-xs">{v.name}</h4>
                  {v.contact_person && (
                    <p className="text-[11px] text-stone-500 mt-0.5">Contacto: {v.contact_person}</p>
                  )}
                  {v.notes && (
                    <p className="text-[10px] text-stone-400 mt-2 line-clamp-2 italic">{v.notes}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <a
                    href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-mono"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
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
