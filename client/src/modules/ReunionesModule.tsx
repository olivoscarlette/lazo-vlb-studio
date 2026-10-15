import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Meeting, PackageInfo } from '../types';
import {
  CalendarCheck2, Plus, Clock, Users, CheckCircle2,
  AlertCircle, MessageSquare, ChevronRight, Check, Sparkles, X
} from 'lucide-react';

export const ReunionesModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // New Meeting / Request Meeting Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '11:00',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Propose 2 Slots Modal (For Team when requested date is not available)
  const [proposingMeeting, setProposingMeeting] = useState<Meeting | null>(null);
  const [slot1, setSlot1] = useState({ date: '', time: '16:00', note: 'Opción A (Tarde)' });
  const [slot2, setSlot2] = useState({ date: '', time: '11:00', note: 'Opción B (Mañana)' });

  // Details / Meeting Notes Modal
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [meetingNotes, setMeetingNotes] = useState({
    agreements: '',
    pending_tasks: '',
    notes: '',
    status: 'PROGRAMADA'
  });

  const fetchMeetings = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
        setPackageInfo(data.packageInfo);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [currentWedding, token]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.title || !formData.date || !formData.time) {
      setFormError('Título, fecha y hora son obligatorios.');
      return;
    }

    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowScheduleModal(false);
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '11:00',
        notes: ''
      });
      await fetchMeetings();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Team accepts meeting directly
  const handleAcceptMeeting = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'PROGRAMADA' })
      });
      if (res.ok) fetchMeetings();
    } catch {}
  };

  // Team submits 2 alternative slots
  const handleSendAlternativeSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingMeeting) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/meetings/${proposingMeeting.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          proposed_slots: [slot1, slot2]
        })
      });
      if (res.ok) {
        setProposingMeeting(null);
        fetchMeetings();
      }
    } catch {}
  };

  // Novios selects an alternative slot
  const handleSelectSlot = async (meetingId: string, slot: { date: string; time: string }) => {
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          selected_slot: slot
        })
      });
      if (res.ok) fetchMeetings();
    } catch {}
  };

  // Save notes & agreements
  const handleSaveNotes = async () => {
    if (!viewingMeeting) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/meetings/${viewingMeeting.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(meetingNotes)
      });
      if (res.ok) {
        setViewingMeeting(null);
        fetchMeetings();
      }
    } catch {}
  };

  const isNovios = user?.role === 'NOVIOS';

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#8A7E72]">
            Coordinación y Avances
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#2B2826] mt-1">
            Información y Reuniones
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1 leading-relaxed">
            Agenda de sesiones de planeación, acuerdos firmados y asignación de pendientes.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>{isNovios ? 'Solicitar Reunión' : 'Agendar Reunión'}</span>
        </button>
      </div>

      {/* Compact Package Allowance Banner */}
      {packageInfo && (
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3DA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#EAE3DA] flex items-center justify-center text-[#9C665C] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#9C665C] uppercase tracking-wider bg-[#FDF6F5] px-2 py-0.5 rounded border border-[#F3DCD7]">
                  {packageInfo.packageName}
                </span>
                <span className="text-xs font-semibold text-[#2B2826] truncate">
                  {packageInfo.description}
                </span>
              </div>
              <p className="text-[11px] text-[#8A7E72] mt-0.5">
                Tope acordado: <strong>{packageInfo.maxMeetings >= 999 ? 'Reuniones ilimitadas' : `${packageInfo.maxMeetings} sesiones`}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 text-xs">
            <span className="px-3 py-1 rounded-xl bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA] font-semibold">
              Agendadas: <strong>{packageInfo.usedMeetings}</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#F7ECE8] text-[#8A574E] border border-[#E8D1CB] font-semibold">
              Disponibles: <strong>{packageInfo.remainingMeetings}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        <h3 className="font-serif text-2xl font-bold text-[#2B2826]">Historial y Próximas Reuniones</h3>

        {loading ? (
          <div className="py-12 text-center text-[#8A7E72] text-sm">Cargando reuniones...</div>
        ) : meetings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-[#8A7E72] text-sm border border-dashed border-[#EAE3DA]">
            No hay reuniones agendadas aún. Solicita tu primera reunión con el equipo.
          </div>
        ) : (
          meetings.map(m => {
            const hasProposed = m.status === 'PROPUESTA' && m.proposed_slots && m.proposed_slots.length > 0;

            return (
              <div
                key={m.id}
                className="bg-white rounded-3xl p-6 border border-[#EAE3DA] shadow-xs hover:border-[#DDD2C4] transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        m.status === 'REALIZADA'
                          ? 'bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1]'
                          : m.status === 'SOLICITADA'
                          ? 'bg-[#FAF3E8] text-[#7C5824] border border-[#E8D7B8] animate-pulse'
                          : m.status === 'PROPUESTA'
                          ? 'bg-[#FDF6F5] text-[#9C665C] border border-[#F3DCD7] font-semibold'
                          : 'bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA]'
                      }`}>
                        {m.status}
                      </span>
                      <span className="text-xs text-[#8A7E72]">Creada por: {m.created_by}</span>
                    </div>

                    <h4 className="font-serif text-2xl font-bold text-[#2B2826] mt-2">{m.title}</h4>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[#5A524C] mt-2">
                      <div className="flex items-center space-x-2 font-medium">
                        <Clock className="w-4 h-4 text-[#8A7E72]" />
                        <span>{m.date} a las {m.time} hrs</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-[#8A7E72]" />
                        <span>{m.participants.join(', ')}</span>
                      </div>
                    </div>

                    {m.notes && (
                      <p className="text-sm text-[#5A524C] mt-3 italic bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE3DA] leading-relaxed">
                        {m.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions according to role and status */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {!isNovios && m.status === 'SOLICITADA' && (
                      <>
                        <button
                          onClick={() => handleAcceptMeeting(m.id)}
                          className="px-4 py-2 bg-[#E4ECE5] hover:bg-[#D5E3D7] text-[#2B5235] text-xs font-bold uppercase tracking-wider rounded-xl border border-[#BDD4C1] transition shadow-xs"
                        >
                          Aceptar Horario
                        </button>
                        <button
                          onClick={() => {
                            setProposingMeeting(m);
                            setSlot1({ date: m.date, time: '16:00', note: 'Opción A (Tarde)' });
                            setSlot2({ date: m.date, time: '11:00', note: 'Opción B (Mañana)' });
                          }}
                          className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] text-xs font-semibold rounded-xl border border-[#EAE3DA] transition"
                        >
                          Proponer 2 Alternativas
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setViewingMeeting(m);
                        setMeetingNotes({
                          agreements: m.agreements || '',
                          pending_tasks: m.pending_tasks || '',
                          notes: m.notes || '',
                          status: m.status
                        });
                      }}
                      className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] text-xs font-semibold rounded-xl border border-[#EAE3DA] transition"
                    >
                      Ver Acuerdos y Notas
                    </button>
                  </div>
                </div>

                {/* If PROPUESTA: show the 2 alternative options for Novios to pick! */}
                {hasProposed && (
                  <div className="mt-4 pt-4 border-t border-[#FAF8F5] bg-[#FDF6F5]/60 p-4 rounded-2xl border border-[#F3DCD7]">
                    <div className="text-xs font-bold text-[#9C665C] mb-2.5 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#9C665C]" />
                      <span>El equipo VLB ha propuesto 2 horarios alternativos para esta reunión:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {m.proposed_slots!.map((slot, i) => (
                        <div
                          key={i}
                          className="bg-white p-3.5 rounded-xl border border-[#F3DCD7] flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <div className="text-sm font-bold text-[#2B2826]">{slot.note || `Opción ${i + 1}`}</div>
                            <div className="text-xs text-[#8A7E72] font-mono mt-0.5">{slot.date} — {slot.time} hrs</div>
                          </div>

                          {isNovios && (
                            <button
                              onClick={() => handleSelectSlot(m.id, slot)}
                              className="px-3.5 py-1.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-bold rounded-lg transition"
                            >
                              Seleccionar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agreements preview if present */}
                {m.agreements && (
                  <div className="mt-4 pt-3 border-t border-[#FAF8F5] text-sm">
                    <span className="font-bold text-[#2B2826]">Acuerdos pactados:</span>{' '}
                    <span className="text-[#5A524C]">{m.agreements}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Solicitar / Agendar Reunión */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3DA]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">
                {isNovios ? 'Solicitar Reunión con VLB Studio' : 'Agendar Nueva Reunión'}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-[#8A7E72] hover:text-[#2B2826] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#8A7E72] mb-4 leading-relaxed">
              {isNovios
                ? 'El equipo de coordinación recibirá tu solicitud y confirmará la disponibilidad.'
                : 'Programa una sesión de planeación y asigna los participantes.'}
            </p>

            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 text-rose-800 text-sm border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Motivo o Título de la Sesión *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Revisión de Timeline y Minuta Final"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Fecha Deseada *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Hora Deseada *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Temas o Notas Previas</label>
                <textarea
                  rows={3}
                  placeholder="Puntos clave que te gustaría revisar en esta sesión..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EAE3DA]">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition"
                >
                  {isNovios ? 'Enviar Solicitud' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Proponer 2 Alternativas (Team Only) */}
      {proposingMeeting && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3DA]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">
                Proponer 2 Alternativas
              </h3>
              <button onClick={() => setProposingMeeting(null)} className="text-[#8A7E72] hover:text-[#2B2826] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#8A7E72] mb-4 leading-relaxed">
              Si el horario solicitado por los novios no tiene disponibilidad, envía 2 alternativas para que seleccionen su preferida.
            </p>

            <form onSubmit={handleSendAlternativeSlots} className="space-y-4">
              {/* Slot 1 */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE3DA] space-y-2">
                <div className="text-xs font-bold text-[#2B2826] uppercase tracking-wider">Opción 1:</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    required
                    value={slot1.date}
                    onChange={e => setSlot1({ ...slot1, date: e.target.value })}
                    className="px-3 py-2 border border-[#EAE3DA] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                  <input
                    type="time"
                    required
                    value={slot1.time}
                    onChange={e => setSlot1({ ...slot1, time: e.target.value })}
                    className="px-3 py-2 border border-[#EAE3DA] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                </div>
              </div>

              {/* Slot 2 */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE3DA] space-y-2">
                <div className="text-xs font-bold text-[#2B2826] uppercase tracking-wider">Opción 2:</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    required
                    value={slot2.date}
                    onChange={e => setSlot2({ ...slot2, date: e.target.value })}
                    className="px-3 py-2 border border-[#EAE3DA] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                  <input
                    type="time"
                    required
                    value={slot2.time}
                    onChange={e => setSlot2({ ...slot2, time: e.target.value })}
                    className="px-3 py-2 border border-[#EAE3DA] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EAE3DA]">
                <button
                  type="button"
                  onClick={() => setProposingMeeting(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition"
                >
                  Enviar 2 Opciones a Novios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver / Editar Acuerdos y Notas */}
      {viewingMeeting && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3DA]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">
                Minuta: {viewingMeeting.title}
              </h3>
              <button onClick={() => setViewingMeeting(null)} className="text-[#8A7E72] hover:text-[#2B2826] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#8A7E72] mb-4">
              Fecha: {viewingMeeting.date} · {viewingMeeting.time} hrs
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Estatus de la Sesión</label>
                <select
                  disabled={isNovios}
                  value={meetingNotes.status}
                  onChange={e => setMeetingNotes({ ...meetingNotes, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C] disabled:bg-[#FAF8F5]"
                >
                  <option value="PROGRAMADA">PROGRAMADA</option>
                  <option value="SOLICITADA">SOLICITADA</option>
                  <option value="PROPUESTA">PROPUESTA</option>
                  <option value="REALIZADA">REALIZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Acuerdos Principales</label>
                <textarea
                  rows={3}
                  disabled={isNovios}
                  placeholder="Compromisos y decisiones tomadas en la sesión..."
                  value={meetingNotes.agreements}
                  onChange={e => setMeetingNotes({ ...meetingNotes, agreements: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C] disabled:bg-[#FAF8F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Tareas Pendientes Asignadas</label>
                <textarea
                  rows={2}
                  disabled={isNovios}
                  placeholder="Acciones a realizar antes de la siguiente sesión..."
                  value={meetingNotes.pending_tasks}
                  onChange={e => setMeetingNotes({ ...meetingNotes, pending_tasks: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#9C665C] disabled:bg-[#FAF8F5]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EAE3DA]">
                <button
                  type="button"
                  onClick={() => setViewingMeeting(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cerrar
                </button>
                {!isNovios && (
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs transition"
                  >
                    Guardar Minuta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
