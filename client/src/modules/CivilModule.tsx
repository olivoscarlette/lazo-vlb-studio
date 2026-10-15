import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CivilCeremony, Vendor, Guest } from '../types';
import {
  Landmark, Calendar, Clock, MapPin, User, CheckSquare,
  Square, MessageSquare, Sparkles, Save, Plus, Trash2, Edit3, Lock, X, Download, Wine, FileCheck, Users
} from 'lucide-react';

export const CivilModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const isNovios = user?.role === 'NOVIOS';
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
    return <div className="py-20 text-center text-[#8A7E72] text-sm">Cargando datos de ceremonia civil...</div>;
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
          <span className="text-xs uppercase font-semibold tracking-wider text-[#9C665C]">
            Protocolo Legal
          </span>
          <h2 className="font-serif text-3xl font-semibold text-[#2B2826]">
            Ceremonia Civil
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1">
            Organización de juzgado, juez oficial, testigos y requisitos prenupciales.
          </p>
        </div>

        {saving && (
          <span className="text-xs text-[#8A7E72] animate-pulse">Guardando cambios...</span>
        )}
      </div>

      {/* Ficha Logística Civil Destacada */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9C665C]"></span>
            <h3 className="font-serif text-lg font-bold text-[#2B2826]">
              Ficha Logística Ejecutiva · Civil
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#8A7E72] uppercase tracking-wider bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#EAE3DA]">
            Protocolo Legal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Juez u Oficial */}
          <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
            <div className="flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A7E72] mb-1.5">
              <User className="w-3.5 h-3.5 text-[#9C665C]" />
              <span>Juez Oficial</span>
            </div>
            <div className="text-sm font-bold text-[#2B2826] truncate">
              {civil.juez_oficial || 'Pendiente de asignar'}
            </div>
            <div className="text-[11px] text-[#8A7E72] mt-0.5 truncate">
              {civil.location || 'Sede por confirmar'}
            </div>
          </div>

          {/* Testigos Confirmados */}
          <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8A7E72] mb-1.5">
              <span className="flex items-center space-x-2">
                <Users className="w-3.5 h-3.5 text-[#9C665C]" />
                <span>Testigos</span>
              </span>
              <span className="font-bold text-[#9C665C] bg-[#F7EFEF] px-1.5 py-0.5 rounded text-[10px]">
                {civil.witnesses.length} listos
              </span>
            </div>
            <div className="text-sm font-bold text-[#2B2826] truncate" title={civil.witnesses.join(', ')}>
              {civil.witnesses.length > 0 ? civil.witnesses.join(', ') : 'Sin testigos registrados'}
            </div>
            <div className="text-[11px] text-[#8A7E72] mt-0.5">
              Firmantes confirmados
            </div>
          </div>

          {/* Documentos Legales Entregados */}
          <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8A7E72] mb-1.5">
              <span className="flex items-center space-x-2">
                <FileCheck className="w-3.5 h-3.5 text-[#9C665C]" />
                <span>Documentos</span>
              </span>
              <span className="font-bold text-[#4B7355] bg-[#E4ECE5] px-1.5 py-0.5 rounded text-[10px]">
                {civil.requirements_status.filter(r => r.completed).length}/{civil.requirements_status.length}
              </span>
            </div>
            <div className="text-sm font-bold text-[#2B2826]">
              {civil.requirements_status.length > 0 && civil.requirements_status.filter(r => r.completed).length === civil.requirements_status.length
                ? 'Expediente Completo'
                : `${civil.requirements_status.filter(r => !r.completed).length} trámite(s) pendiente(s)`}
            </div>
            <div className="text-[11px] text-[#8A7E72] mt-0.5">
              Requisitos prenupciales
            </div>
          </div>

          {/* Horario de Firma & Brindis */}
          <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
            <div className="flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A7E72] mb-1.5">
              <Wine className="w-3.5 h-3.5 text-[#9C665C]" />
              <span>Firma y Brindis</span>
            </div>
            <div className="text-sm font-bold text-[#2B2826]">
              {civil.time ? `${civil.time} hrs` : 'Horario a convenir'}
            </div>
            <div className="text-[11px] text-[#8A7E72] mt-0.5">
              {civil.date ? `Fecha: ${civil.date}` : 'Fecha no definida'}
            </div>
          </div>
        </div>
      </div>

      {/* Ceremony Overview Details Card — Fixed / Read-Only by Default */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#FAF8F5]">
          <div className="flex items-center space-x-2.5">
            <Landmark className="w-5 h-5 text-[#9C665C]" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-xl font-semibold text-[#2B2826]">
                  Datos Oficiales de la Ceremonia Civil
                </h3>
                {civil.date && currentWedding?.wedding_date && civil.date !== currentWedding.wedding_date ? (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#FDF6F5] text-[#9C665C] border border-[#F0D5D1]">
                    📅 Otro Día · Fecha Independiente ({civil.date})
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#FAF8F5] text-[#8A7E72] border border-[#EAE3DA]">
                    📅 Mismo Día de la Boda
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A7E72] flex items-center space-x-1 mt-0.5">
                <Lock className="w-3 h-3 text-[#9C665C]" />
                <span>Información protegida contra cambios accidentales.</span>
              </p>
            </div>
          </div>

          {isNovios ? (
            <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] text-[#8A7E72] border border-[#EAE3DA] text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-[#9C665C]" />
              <span>Registro Oficial VLB</span>
            </span>
          ) : !isEditingDetails ? (
            <button
              type="button"
              onClick={handleStartEditDetails}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EAE3DA] text-xs font-semibold transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#9C665C]" />
              <span>Editar Datos</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA] text-xs font-medium transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
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
              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <span className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#9C665C]" />
                    <span>Fecha Civil</span>
                  </span>
                  {civil.date && currentWedding?.wedding_date && civil.date !== currentWedding.wedding_date && (
                    <span className="text-[#9C665C] font-semibold">Otro día</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {civil.date || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
                <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Hora</span>
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {civil.time ? `${civil.time} hrs` : 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
                <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Ubicación / Juzgado</span>
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {civil.location || 'Por definir'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
                <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                  <User className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Juez u Oficial del Registro</span>
                </div>
                <div className="text-sm font-semibold text-[#2B2826]">
                  {civil.juez_oficial || 'Por definir'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#8A7E72] mb-1">
                Notas y Protocolo de Firma
              </div>
              <div className="text-sm text-[#2B2826] leading-relaxed">
                {civil.notes || 'Sin notas adicionales registradas.'}
              </div>
            </div>
          </div>
        ) : (
          /* Editable Form Mode */
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE3DA] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#2B2826]">¿Cuándo se realiza la Ceremonia Civil?</div>
                <div className="text-xs text-[#8A7E72]">
                  Selecciona si el civil se celebra el mismo día de la boda o en una fecha diferente.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailsDraft({ ...detailsDraft, date: currentWedding?.wedding_date || '' })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    detailsDraft.date === currentWedding?.wedding_date
                      ? 'bg-[#2B2826] text-white border-[#2B2826]'
                      : 'bg-white text-[#2B2826] border-[#EAE3DA] hover:border-[#9C665C]'
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    detailsDraft.date !== currentWedding?.wedding_date
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-white text-[#2B2826] border-[#EAE3DA] hover:border-[#9C665C]'
                  }`}
                >
                  Otro día diferente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">
                  {detailsDraft.date !== currentWedding?.wedding_date ? 'Fecha de la Boda Civil (Otro día) *' : 'Fecha'}
                </label>
                <input
                  type="date"
                  value={detailsDraft.date}
                  onChange={e => setDetailsDraft({ ...detailsDraft, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Hora</label>
                <input
                  type="time"
                  value={detailsDraft.time}
                  onChange={e => setDetailsDraft({ ...detailsDraft, time: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Ubicación / Juzgado</label>
                <input
                  type="text"
                  placeholder="Juzgado, Restaurante, Terraza..."
                  value={detailsDraft.location}
                  onChange={e => setDetailsDraft({ ...detailsDraft, location: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B2826] mb-1">Juez u Oficial del Registro</label>
                <input
                  type="text"
                  placeholder="Lic. Fernando Morales (Oficialía 14)"
                  value={detailsDraft.juez_oficial}
                  onChange={e => setDetailsDraft({ ...detailsDraft, juez_oficial: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2B2826] mb-1">Notas y Protocolo de Firma</label>
              <textarea
                rows={2}
                placeholder="Mobiliario especial, pluma de firmas, copas de brindis nupcial..."
                value={detailsDraft.notes}
                onChange={e => setDetailsDraft({ ...detailsDraft, notes: e.target.value })}
                className="w-full px-3 py-2 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
              />
            </div>
          </form>
        )}
      </div>

      {/* Two Column Section: Testigos (from Confirmed Guests) & Requisitos Legales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Testigos List (Selected from Confirmed Guests) */}
        {/* Testigos List (Selected from Confirmed Guests) */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs uppercase font-semibold tracking-wider text-[#9C665C]">
                  Firmantes · Desde Invitados Confirmados
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#2B2826]">Testigos de Honor</h3>
              </div>
              <span className="text-xs font-semibold text-[#8A574E] bg-[#FAF8F5] border border-[#EAE3DA] px-3 py-1 rounded-full">
                {civil.witnesses.length} asignados
              </span>
            </div>

            <div className="space-y-2 mb-5">
              {civil.witnesses.length === 0 ? (
                <p className="text-xs text-[#8A7E72] italic py-4 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EAE3DA]">
                  No se han asignado testigos aún. Selecciónalos de la lista de invitados confirmados abajo.
                </p>
              ) : (
                civil.witnesses.map((w, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA] flex items-center justify-between text-xs font-medium text-[#2B2826]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <User className="w-4 h-4 text-[#9C665C]" />
                      <span>{w}</span>
                    </div>
                    {!isNovios && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWitness(index)}
                        className="text-[#8A7E72]/60 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Quitar testigo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {!isNovios && (
            <form onSubmit={handleAddWitness} className="pt-3 border-t border-[#FAF8F5]">
              <label className="block text-xs font-semibold text-[#2B2826] mb-1.5">
                Seleccionar testigo de la Lista de Invitados Confirmados ({confirmedGuests.length} confirmados):
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedWitnessGuest}
                  onChange={e => setSelectedWitnessGuest(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#9C665C] focus:outline-none"
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
                  className="px-4 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-40 transition cursor-pointer"
                >
                  Asignar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Trámites y Requisitos Prenupciales (with VLB Master Template Loader) */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-xs uppercase font-semibold tracking-wider text-[#9C665C]">Expediente VLB</span>
                <h3 className="font-serif text-lg font-semibold text-[#2B2826]">Requisitos y Trámites Legales</h3>
              </div>
              <div className="flex items-center space-x-2">
                {!isNovios && (
                  <button
                    type="button"
                    onClick={handleLoadMasterRequirements}
                    className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EAE3DA] transition cursor-pointer"
                    title="Cargar requisitos estándar de VLB Studio"
                  >
                    <Download className="w-3.5 h-3.5 text-[#9C665C]" />
                    <span>Cargar Plantilla VLB</span>
                  </button>
                )}
                <span className="text-xs font-semibold text-[#2B2826] bg-[#FAF8F5] border border-[#EAE3DA] px-2.5 py-1 rounded-full">
                  {civil.requirements_status.filter(r => r.completed).length} / {civil.requirements_status.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
              {civil.requirements_status.length === 0 ? (
                <p className="text-xs text-[#8A7E72] italic py-4 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EAE3DA]">
                  No hay requisitos cargados. Haz clic en "Cargar Plantilla VLB" o agrega uno abajo.
                </p>
              ) : (
                civil.requirements_status.map(r => (
                  <div
                    key={r.id}
                    onClick={() => handleToggleRequirement(r.id)}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer text-xs transition ${
                      r.completed
                        ? 'bg-[#E4ECE5] border-[#D0DED2] text-[#2B5235] font-medium'
                        : 'bg-[#FCFAF7] border-[#EAE3DA] text-[#2B2826] hover:bg-[#FAF8F5]'
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
                    {!isNovios && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRequirement(r.id, e)}
                        className="text-[#8A7E72]/50 hover:text-rose-600 p-1 ml-2 transition cursor-pointer"
                        title="Eliminar requisito"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {!isNovios && (
            <form onSubmit={handleAddRequirement} className="flex gap-2 pt-3 border-t border-[#FAF8F5]">
              <input
                type="text"
                placeholder="Agregar requisito adicional a esta boda..."
                value={newReq}
                onChange={e => setNewReq(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-[#EAE3DA] rounded-xl text-xs bg-[#FAF8F5] text-[#2B2826] focus:ring-2 focus:ring-[#9C665C] focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                Agregar
              </button>
            </form>
          )}
        </div>
      </div>

      {/* AUTOMATIC REUSE: Reused Vendors Card for Civil */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-1.5 text-[#9C665C] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reutilización Automática de Proveedores</span>
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#2B2826]">
              Proveedores que participan en Ceremonia Civil
            </h3>
            <p className="text-sm text-[#8A7E72] mt-0.5">
              Reflejados automáticamente desde el módulo Proveedores y Pagos con la etiqueta <strong>CIVIL</strong>. Sin doble captura.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#8A574E] bg-[#FAF8F5] border border-[#EAE3DA] px-3 py-1 rounded-full">
            {reusedVendors.length} proveedores
          </span>
        </div>

        {reusedVendors.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8A7E72] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EAE3DA]">
            No hay proveedores etiquetados con participación en "CIVIL". Ve a <strong>Proveedores y Pagos</strong> y selecciona la casilla CIVIL en el proveedor correspondiente.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reusedVendors.map(v => (
              <div
                key={v.id}
                className="bg-[#FCFAF7] p-4 rounded-2xl border border-[#EAE3DA] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#8A7E72] uppercase tracking-wider">{v.type}</span>
                    <span className="text-[10px] bg-[#FAF8F5] text-[#9C665C] font-semibold border border-[#EAE3DA] px-2 py-0.5 rounded-full">CIVIL</span>
                  </div>
                  <h4 className="font-semibold text-[#2B2826] text-sm">{v.name}</h4>
                  {v.contact_person && (
                    <p className="text-xs text-[#8A7E72] mt-0.5">Contacto: {v.contact_person}</p>
                  )}
                  {v.notes && (
                    <p className="text-xs text-[#8A7E72]/70 mt-2 line-clamp-2 italic">{v.notes}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#EAE3DA] flex items-center justify-between">
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
