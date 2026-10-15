import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Meeting, PackageInfo } from '../types';
import {
  CalendarCheck2, Plus, Clock, Users, CheckCircle2,
  AlertCircle, MessageSquare, ChevronRight, Check, Sparkles
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
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Coordinación y Avances
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Información y Reuniones
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Agenda de sesiones de planeación, acuerdos firmados y asignación de pendientes.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isNovios ? 'Solicitar Reunión' : 'Agendar Reunión'}</span>
        </button>
      </div>

      {/* Package Allowance Card */}
      {packageInfo && (
        <div className="luxury-card rounded-2xl p-6 border border-stone-200 bg-gradient-to-r from-stone-50 via-white to-amber-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Paquete Contratado: {packageInfo.packageName}</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
                {packageInfo.description}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Límite contratado: <strong>{packageInfo.maxMeetings >= 999 ? 'Reuniones Ilimitadas' : `${packageInfo.maxMeetings} reuniones`}</strong>
              </p>
              {Array.isArray(packageInfo.includes) && packageInfo.includes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-200/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Incluye en tu paquete:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    {packageInfo.includes.map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5 text-xs text-stone-700">
                        <Check className="w-3.5 h-3.5 text-[#8a574e] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-stone-200 pt-3 md:pt-0 md:pl-6 shrink-0">
              <div>
                <div className="text-[10px] text-stone-400 uppercase font-bold">Realizadas o Agendadas</div>
                <div className="text-2xl font-serif font-bold text-stone-900">{packageInfo.usedMeetings}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-800 uppercase font-bold">Disponibles</div>
                <div className="text-2xl font-serif font-bold text-amber-900">{packageInfo.remainingMeetings}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl font-bold text-stone-900">Historial y Próximas Reuniones</h3>

        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs">Cargando reuniones...</div>
        ) : meetings.length === 0 ? (
          <div className="luxury-card rounded-2xl p-8 text-center text-stone-400 text-xs border border-dashed border-stone-300">
            No hay reuniones agendadas aún. Solicita tu primera reunión con el equipo.
          </div>
        ) : (
          meetings.map(m => {
            const hasProposed = m.status === 'PROPUESTA' && m.proposed_slots && m.proposed_slots.length > 0;

            return (
              <div
                key={m.id}
                className="luxury-card rounded-2xl p-6 border border-stone-200 hover:border-stone-400 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        m.status === 'REALIZADA'
                          ? 'bg-emerald-100 text-emerald-900'
                          : m.status === 'SOLICITADA'
                          ? 'bg-amber-100 text-amber-900 animate-pulse'
                          : m.status === 'PROPUESTA'
                          ? 'bg-blue-100 text-blue-900 font-semibold'
                          : 'bg-stone-100 text-stone-800'
                      }`}>
                        {m.status}
                      </span>
                      <span className="text-xs text-stone-400">Creada por: {m.created_by}</span>
                    </div>

                    <h4 className="font-serif text-xl font-bold text-stone-900 mt-1">{m.title}</h4>

                    <div className="flex items-center space-x-4 text-xs text-stone-600 mt-2">
                      <div className="flex items-center space-x-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{m.date} a las {m.time} hrs</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        <span>{m.participants.join(', ')}</span>
                      </div>
                    </div>

                    {m.notes && (
                      <p className="text-xs text-stone-500 mt-2 italic bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        {m.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions according to role and status */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* If SOLICITADA and user is Team (Admin/Coord): Accept or Propose 2 alternatives */}
                    {!isNovios && m.status === 'SOLICITADA' && (
                      <>
                        <button
                          onClick={() => handleAcceptMeeting(m.id)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow"
                        >
                          Aceptar Horario
                        </button>
                        <button
                          onClick={() => {
                            setProposingMeeting(m);
                            setSlot1({ date: m.date, time: '16:00', note: 'Opción A (Tarde)' });
                            setSlot2({ date: m.date, time: '11:00', note: 'Opción B (Mañana)' });
                          }}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl border border-stone-300 transition"
                        >
                          Proponer 2 Alternativas
                        </button>
                      </>
                    )}

                    {/* View/Edit Notes & Agreements button */}
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
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition"
                    >
                      Ver Acuerdos y Notas
                    </button>
                  </div>
                </div>

                {/* If PROPUESTA: show the 2 alternative options for Novios to pick! */}
                {hasProposed && (
                  <div className="mt-4 pt-4 border-t border-stone-100 bg-blue-50/40 p-4 rounded-xl border border-blue-200">
                    <div className="text-xs font-bold text-blue-950 mb-2 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>El equipo VLB ha propuesto 2 horarios alternativos para esta reunión:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {m.proposed_slots!.map((slot, i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-xl border border-blue-200 flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <div className="text-xs font-bold text-stone-900">{slot.note || `Opción ${i + 1}`}</div>
                            <div className="text-xs text-stone-600 font-mono mt-0.5">{slot.date} — {slot.time} hrs</div>
                          </div>

                          {isNovios && (
                            <button
                              onClick={() => handleSelectSlot(m.id, slot)}
                              className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold rounded-lg transition"
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
                  <div className="mt-3 pt-3 border-t border-stone-100 text-xs">
                    <span className="font-bold text-stone-700">Acuerdos pactados:</span>{' '}
                    <span className="text-stone-600">{m.agreements}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Solicitar / Agendar Reunión */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">
              {isNovios ? 'Solicitar Reunión con VLB Studio' : 'Agendar Nueva Reunión'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {isNovios
                ? 'El equipo de coordinación recibirá tu solicitud y confirmará la disponibilidad.'
                : 'Programa una sesión de planeación y asigna los participantes.'}
            </p>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMeeting} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Motivo o Título de la Sesión *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Revisión de Timeline y Minuta Final"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fecha Deseada *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Hora Deseada *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Temas o Notas Previas</label>
                <textarea
                  rows={2}
                  placeholder="Puntos clave que te gustaría revisar en esta sesión..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow"
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
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">
              Proponer 2 Opciones Alternativas
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Si el horario solicitado por los novios no tiene disponibilidad, envía 2 alternativas para que seleccionen su preferida.
            </p>

            <form onSubmit={handleSendAlternativeSlots} className="space-y-4">
              {/* Slot 1 */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-800">Opción 1:</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={slot1.date}
                    onChange={e => setSlot1({ ...slot1, date: e.target.value })}
                    className="px-2 py-1.5 border border-stone-300 rounded-lg text-xs"
                  />
                  <input
                    type="time"
                    required
                    value={slot1.time}
                    onChange={e => setSlot1({ ...slot1, time: e.target.value })}
                    className="px-2 py-1.5 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Slot 2 */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-800">Opción 2:</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={slot2.date}
                    onChange={e => setSlot2({ ...slot2, date: e.target.value })}
                    className="px-2 py-1.5 border border-stone-300 rounded-lg text-xs"
                  />
                  <input
                    type="time"
                    required
                    value={slot2.time}
                    onChange={e => setSlot2({ ...slot2, time: e.target.value })}
                    className="px-2 py-1.5 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setProposingMeeting(null)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow"
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
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">
              Minuta de Reunión: {viewingMeeting.title}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Fecha: {viewingMeeting.date} · {viewingMeeting.time} hrs
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Estatus de la Sesión</label>
                <select
                  disabled={isNovios}
                  value={meetingNotes.status}
                  onChange={e => setMeetingNotes({ ...meetingNotes, status: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                >
                  <option value="PROGRAMADA">PROGRAMADA</option>
                  <option value="SOLICITADA">SOLICITADA</option>
                  <option value="PROPUESTA">PROPUESTA</option>
                  <option value="REALIZADA">REALIZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Acuerdos Principales</label>
                <textarea
                  rows={3}
                  disabled={isNovios}
                  placeholder="Compromisos y decisiones tomadas en la sesión..."
                  value={meetingNotes.agreements}
                  onChange={e => setMeetingNotes({ ...meetingNotes, agreements: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tareas Pendientes Asignadas</label>
                <textarea
                  rows={2}
                  disabled={isNovios}
                  placeholder="Acciones a realizar antes de la siguiente sesión..."
                  value={meetingNotes.pending_tasks}
                  onChange={e => setMeetingNotes({ ...meetingNotes, pending_tasks: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900 disabled:bg-stone-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setViewingMeeting(null)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cerrar
                </button>
                {!isNovios && (
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow"
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
