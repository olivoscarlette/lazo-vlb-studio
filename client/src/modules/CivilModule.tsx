import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CivilCeremony, Vendor, Guest } from '../types';
import {
  Landmark, Calendar, Clock, MapPin, User, CheckSquare,
  Square, MessageSquare, Sparkles, Save, Plus, Trash2, Edit3, Lock, X, Download
} from 'lucide-react';

export const CivilModule: React.FC = () => {
  const { currentWedding, token } = useAuth();
  const [civil, setCivil] = useState<CivilCeremony | null>(null);
  const [reusedVendors, setReusedVendors] = useState<Vendor[]>([]);
  const [confirmedGuests, setConfirmedGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Read-only vs Edit mode for main ceremony details to prevent accidental edits
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    date: '',
    time: '',
    location: '',
    juez_oficial: '',
    notes: ''
  });

  // Selected witness from Confirmed Guests list
  const [selectedWitnessGuest, setSelectedWitnessGuest] = useState('');
  const [newReq, setNewReq] = useState('');

  const fetchCivilData = async () => {
    if (!currentWedding || !token) return;
    try {
      const [civilRes, guestsRes] = await Promise.all([
        fetch(`/api/weddings/${currentWedding.id}/civil`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/weddings/${currentWedding.id}/guests?status=Confirmado&limit=500`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (civilRes.ok) {
        const data = await civilRes.json();
        setCivil(data.civil);
        setReusedVendors(data.reusedVendors || []);
        if (data.civil) {
          setDetailsDraft({
            date: data.civil.date || '',
            time: data.civil.time || '',
            location: data.civil.location || '',
            juez_oficial: data.civil.juez_oficial || '',
            notes: data.civil.notes || ''
          });
        }
      }

      if (guestsRes.ok) {
        const gData = await guestsRes.json();
        setConfirmedGuests(gData.guests || []);
      }
    } catch (err) {
      console.error('Error fetching civil:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCivilData();
  }, [currentWedding, token]);

  const handleSave = async (updatedData: Partial<CivilCeremony>) => {
    if (!civil) return;
    setSaving(true);
    const merged = { ...civil, ...updatedData };
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/civil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(merged)
      });
      if (res.ok) {
        setCivil(merged as CivilCeremony);
      }
    } catch (err) {
      console.error('Error saving civil ceremony:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditDetails = () => {
    if (!civil) return;
    setDetailsDraft({
      date: civil.date || '',
      time: civil.time || '',
      location: civil.location || '',
      juez_oficial: civil.juez_oficial || '',
      notes: civil.notes || ''
    });
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSave(detailsDraft);
    setIsEditingDetails(false);
  };

  const handleToggleRequirement = (reqId: string) => {
    if (!civil) return;
    const updated = civil.requirements_status.map(r =>
      r.id === reqId ? { ...r, completed: !r.completed } : r
    );
    handleSave({ requirements_status: updated });
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.trim() || !civil) return;
    const newItems = [
      ...civil.requirements_status,
      { id: 'req_' + Date.now(), title: newReq.trim(), completed: false }
    ];
    handleSave({ requirements_status: newItems });
    setNewReq('');
  };

  const handleRemoveRequirement = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!civil) return;
    const updated = civil.requirements_status.filter(r => r.id !== reqId);
    handleSave({ requirements_status: updated });
  };

  const handleLoadMasterRequirements = async () => {
    if (!civil || !token) return;
    try {
      const res = await fetch('/api/catalogs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const masterReqs: string[] = data.catalogs?.master_civil_requirements || [
          'Acta de nacimiento certificada de ambos novios',
          'Identificación oficial vigente (INE o Pasaporte) de novios y testigos',
          'Certificado y análisis médicos prenupciales',
          'Solicitud de matrimonio civil requisitada',
          'Pago de derechos de Registro Civil / Juez a domicilio'
        ];
        const existingTitles = new Set(civil.requirements_status.map(r => r.title.toLowerCase()));
        const toAdd = masterReqs
          .filter(title => !existingTitles.has(title.toLowerCase()))
          .map((title, idx) => ({
            id: `req_vlb_${Date.now()}_${idx}`,
            title,
            completed: false
          }));
        if (toAdd.length > 0) {
          await handleSave({ requirements_status: [...civil.requirements_status, ...toAdd] });
        }
      }
    } catch (err) {
      console.error('Error loading master civil requirements:', err);
    }
  };

  const handleAddWitness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWitnessGuest || !civil) return;
    if (civil.witnesses.includes(selectedWitnessGuest)) return;
    const newWitnesses = [...civil.witnesses, selectedWitnessGuest];
    handleSave({ witnesses: newWitnesses });
    setSelectedWitnessGuest('');
  };

  const handleRemoveWitness = (index: number) => {
    if (!civil) return;
    const updated = civil.witnesses.filter((_, i) => i !== index);
    handleSave({ witnesses: updated });
  };

  if (loading || !civil) {
    return <div className="py-20 text-center text-stone-400 text-sm">Cargando datos de ceremonia civil...</div>;
  }

  // Confirmed guests full names available to pick as witnesses
  const availableConfirmedNames = confirmedGuests
    .map(g => `${g.first_name} ${g.last_name}`.trim())
    .filter(fullName => !civil.witnesses.includes(fullName));

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Protocolo Legal
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Ceremonia Civil
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Organización de juzgado, juez oficial, testigos y requisitos prenupciales.
          </p>
        </div>

        {saving && (
          <span className="text-xs text-stone-400 animate-pulse">Guardando cambios...</span>
        )}
      </div>

      {/* Ceremony Overview Details Card — Fixed / Read-Only by Default */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
          <div className="flex items-center space-x-2.5">
            <Landmark className="w-5 h-5 text-[#9C665C]" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  Datos Oficiales de la Ceremonia Civil
                </h3>
                {civil.date && currentWedding?.wedding_date && civil.date !== currentWedding.wedding_date ? (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EFE2DF] text-[#7A4E49] border border-[#DFC9C4]">
                    📅 Otro Día · Fecha Independiente ({civil.date})
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#EFE8DE] text-[#5A524C] border border-[#DDD2C4]">
                    📅 Mismo Día de la Boda
                  </span>
                )}
              </div>
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
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <span className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#9C665C]" />
                    <span>Fecha Civil</span>
                  </span>
                  {civil.date && currentWedding?.wedding_date && civil.date !== currentWedding.wedding_date && (
                    <span className="text-[#8a574e] font-bold">Otro día</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {civil.date || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Hora</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {civil.time ? `${civil.time} hrs` : 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Ubicación / Juzgado</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {civil.location || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
                <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  <User className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Juez u Oficial del Registro</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {civil.juez_oficial || 'Por definir'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F9F6F2] border border-[#EFE8DE]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Notas y Protocolo de Firma
              </div>
              <div className="text-xs text-stone-700 leading-relaxed">
                {civil.notes || 'Sin notas adicionales registradas.'}
              </div>
            </div>
          </div>
        ) : (
          /* Editable Form Mode */
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#F9F6F2] border border-[#DDD2C4] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#332C2A]">¿Cuándo se realiza la Ceremonia Civil?</div>
                <div className="text-[11px] text-[#786C68]">
                  Selecciona si el civil se celebra el mismo día de la boda o en una fecha diferente.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailsDraft({ ...detailsDraft, date: currentWedding?.wedding_date || '' })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    detailsDraft.date === currentWedding?.wedding_date
                      ? 'bg-[#363432] text-white border-[#363432]'
                      : 'bg-white text-[#5A524C] border-[#DDD2C4] hover:border-[#9C665C]'
                  }`}
                >
                  Mismo día de la boda ({currentWedding?.wedding_date})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (detailsDraft.date === currentWedding?.wedding_date) {
                      setDetailsDraft({ ...detailsDraft, date: '' });
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    detailsDraft.date !== currentWedding?.wedding_date
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-white text-[#5A524C] border-[#DDD2C4] hover:border-[#9C665C]'
                  }`}
                >
                  Otro día diferente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {detailsDraft.date !== currentWedding?.wedding_date ? 'Fecha de la Boda Civil (Otro día) *' : 'Fecha'}
                </label>
                <input
                  type="date"
                  value={detailsDraft.date}
                  onChange={e => setDetailsDraft({ ...detailsDraft, date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Hora</label>
                <input
                  type="time"
                  value={detailsDraft.time}
                  onChange={e => setDetailsDraft({ ...detailsDraft, time: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Ubicación / Juzgado</label>
                <input
                  type="text"
                  placeholder="Juzgado, Restaurante, Terraza..."
                  value={detailsDraft.location}
                  onChange={e => setDetailsDraft({ ...detailsDraft, location: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Juez u Oficial del Registro</label>
                <input
                  type="text"
                  placeholder="Lic. Fernando Morales (Oficialía 14)"
                  value={detailsDraft.juez_oficial}
                  onChange={e => setDetailsDraft({ ...detailsDraft, juez_oficial: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Notas y Protocolo de Firma</label>
              <textarea
                rows={2}
                placeholder="Mobiliario especial, pluma de firmas, copas de brindis nupcial..."
                value={detailsDraft.notes}
                onChange={e => setDetailsDraft({ ...detailsDraft, notes: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </form>
        )}
      </div>

      {/* Two Column Section: Testigos (from Confirmed Guests) & Requisitos Legales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Testigos List (Selected from Confirmed Guests) */}
        <div className="luxury-card rounded-2xl p-6 border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                  Firmantes · Desde Invitados Confirmados
                </span>
                <h3 className="font-serif text-lg font-bold text-stone-900">Testigos de Honor</h3>
              </div>
              <span className="text-xs font-semibold text-[#8a574e] bg-[#EFE2DF] px-3 py-1 rounded-full">
                {civil.witnesses.length} asignados
              </span>
            </div>

            <div className="space-y-2 mb-5">
              {civil.witnesses.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center bg-[#F9F6F2] rounded-xl border border-dashed border-[#DDD2C4]">
                  No se han asignado testigos aún. Selecciónalos de la lista de invitados confirmados abajo.
                </p>
              ) : (
                civil.witnesses.map((w, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-[#F9F6F2] border border-[#DDD2C4] flex items-center justify-between text-xs font-medium text-stone-800"
                  >
                    <div className="flex items-center space-x-2.5">
                      <User className="w-4 h-4 text-[#9C665C]" />
                      <span>{w}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveWitness(index)}
                      className="text-stone-400 hover:text-rose-600 p-1 transition"
                      title="Quitar testigo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddWitness} className="pt-3 border-t border-stone-100">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1.5">
              Seleccionar testigo de la Lista de Invitados Confirmados ({confirmedGuests.length} confirmados):
            </label>
            <div className="flex gap-2">
              <select
                value={selectedWitnessGuest}
                onChange={e => setSelectedWitnessGuest(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-stone-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
              >
                <option value="">— Seleccionar invitado confirmado —</option>
                {availableConfirmedNames.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!selectedWitnessGuest}
                className="px-4 py-2.5 bg-stone-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-stone-800 shadow disabled:opacity-40 transition"
              >
                Asignar
              </button>
            </div>
          </form>
        </div>

        {/* Trámites y Requisitos Prenupciales (with VLB Master Template Loader) */}
        <div className="luxury-card rounded-2xl p-6 border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Expediente VLB</span>
                <h3 className="font-serif text-lg font-bold text-stone-900">Requisitos y Trámites Legales</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadMasterRequirements}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-[#EFE8DE] hover:bg-[#EFE2DF] text-[#332C2A] border border-[#DDD2C4] transition"
                  title="Cargar requisitos estándar de VLB Studio"
                >
                  <Download className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Cargar Plantilla VLB</span>
                </button>
                <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
                  {civil.requirements_status.filter(r => r.completed).length} / {civil.requirements_status.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
              {civil.requirements_status.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center bg-[#F9F6F2] rounded-xl border border-dashed border-[#DDD2C4]">
                  No hay requisitos cargados. Haz clic en "Cargar Plantilla VLB" o agrega uno abajo.
                </p>
              ) : (
                civil.requirements_status.map(r => (
                  <div
                    key={r.id}
                    onClick={() => handleToggleRequirement(r.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition ${
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
                      onClick={(e) => handleRemoveRequirement(r.id, e)}
                      className="text-stone-300 hover:text-rose-600 p-1 ml-2"
                      title="Eliminar requisito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddRequirement} className="flex gap-2 pt-3 border-t border-stone-100">
            <input
              type="text"
              placeholder="Agregar requisito adicional a esta boda..."
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
      </div>

      {/* AUTOMATIC REUSE: Reused Vendors Card for Civil */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200 bg-stone-50/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-1.5 text-lazo-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reutilización Automática de Proveedores</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Proveedores que participan en Ceremonia Civil
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Reflejados automáticamente desde el módulo Proveedores y Pagos con la etiqueta <strong>CIVIL</strong>. Sin doble captura.
            </p>
          </div>
          <span className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
            {reusedVendors.length} proveedores
          </span>
        </div>

        {reusedVendors.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400 bg-white rounded-xl border border-stone-200">
            No hay proveedores etiquetados con participación en "CIVIL". Ve a <strong>Proveedores y Pagos</strong> y selecciona la casilla CIVIL en el proveedor correspondiente.
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
                    <span className="text-[9px] bg-[#EFE2DF] text-[#8a574e] font-bold px-2 py-0.5 rounded">CIVIL</span>
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
