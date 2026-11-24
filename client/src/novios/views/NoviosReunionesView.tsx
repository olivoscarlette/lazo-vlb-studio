import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Video,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Meeting, PackageInfo } from '../../types';
import { Modal } from '../components/Modal';
import { formatShortDate } from '../data/seedWedding';

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  SOLICITADA: {
    label: 'Solicitud enviada',
    badgeClass: 'bg-[#FAF3E8] text-[#7C5824] border-[#E8D7B8]'
  },
  PROPUESTA: {
    label: 'Elige un horario',
    badgeClass: 'bg-[#F4EAEC] text-[#521F29] border-[#E5D1D5]'
  },
  PROGRAMADA: {
    label: 'Confirmada',
    badgeClass: 'bg-[#E5EDE6] text-[#384C3A] border-[#D0DDD1]'
  },
  CONFIRMADA: {
    label: 'Confirmada',
    badgeClass: 'bg-[#E5EDE6] text-[#384C3A] border-[#D0DDD1]'
  },
  REALIZADA: {
    label: 'Realizada',
    badgeClass: 'bg-[#F8F5F0] text-[#6B6462] border-[#E7E1D8]'
  },
  CANCELADA: {
    label: 'Cancelada',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
  }
};

export const NoviosReunionesView: React.FC = () => {
  const { currentWedding, token } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPackageDetails, setShowPackageDetails] = useState(false);

  // Request Meeting Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    title: '',
    date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    time: '11:00',
    notes: ''
  });

  // View Meeting Summary Modal
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

  const fetchMeetings = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
        setPackageInfo(data.packageInfo || null);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [currentWedding?.id, token]);

  const handleRequestMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding || !token) return;
    setFormError('');
    if (!form.title.trim() || !form.date || !form.time) {
      setFormError('Por favor completa el tema, fecha y hora.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title.trim(),
          date: form.date,
          time: form.time,
          notes: form.notes.trim()
        })
      });
      if (res.ok) {
        setShowRequestModal(false);
        setForm({
          title: '',
          date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          time: '11:00',
          notes: ''
        });
        await fetchMeetings();
      } else {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.error || 'No se pudo enviar la solicitud.');
      }
    } catch {
      setFormError('Error de conexión. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProposedSlot = async (meetingId: string, slot: { date: string; time: string }) => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ selected_slot: slot })
      });
      if (res.ok) {
        await fetchMeetings();
      }
    } catch (err) {
      console.error('Error accepting slot:', err);
    }
  };

  const parseProposedSlots = (raw: any): Array<{ date: string; time: string; note?: string }> => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  const upcomingMeetings = meetings.filter(m => m.status !== 'REALIZADA' && m.status !== 'CANCELADA');
  const pastMeetings = meetings.filter(m => m.status === 'REALIZADA' || m.status === 'CANCELADA');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#6B6462]">
            Coordinación Viva la Bride
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#1F1D1E] mt-1">
            Reuniones
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-medium shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Solicitar Reunión</span>
        </button>
      </div>

      {/* Coordination Package Card (Collapsible) */}
      {packageInfo && (
        <div className="bg-white rounded-3xl border border-[#E7E1D8] shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPackageDetails(!showPackageDetails)}
            className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 bg-[#F8F5F0]/70 hover:bg-[#F8F5F0] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F4EAEC] border border-[#E5D1D5] flex items-center justify-center text-[#6E2E3A] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#6E2E3A] block">
                  Tu Paquete de Coordinación
                </span>
                <p className="font-editorial text-lg text-[#1F1D1E] leading-tight">
                  {(packageInfo as any).title || currentWedding?.package_type || 'Coordinación Viva la Bride'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-[#6B6462]">
              <span className="hidden sm:inline">{showPackageDetails ? 'Ocultar' : 'Ver detalles'}</span>
              {showPackageDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          </button>

          {showPackageDetails && (
            <div className="px-5 sm:px-6 py-4 border-t border-[#F8F5F0] space-y-2.5 text-xs text-[#5A524C]">
              {packageInfo.description && (
                <p className="font-light leading-relaxed">{packageInfo.description}</p>
              )}
              {Array.isArray(packageInfo.includes) && packageInfo.includes.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {packageInfo.includes.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#577355] mt-0.5 shrink-0" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meetings List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E1D8] text-xs text-[#6B6462]">
          Cargando tus reuniones...
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#E7E1D8] shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F8F5F0] border border-[#E7E1D8] flex items-center justify-center mx-auto text-[#6E2E3A]">
            <CalendarDays className="w-5 h-5" />
          </div>
          <h3 className="font-editorial text-2xl text-[#1F1D1E]">Agenda tu próxima sesión</h3>
          <p className="text-xs text-[#6B6462] max-w-sm mx-auto font-light">
            Solicita una reunión con tu equipo de Viva la Bride cuando necesites revisar proveedores, avances o detalles de tu boda.
          </p>
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Solicitar primera reunión</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Upcoming & Active Requests */}
          {upcomingMeetings.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#6B6462] px-1">
                Próximas Reuniones & Solicitudes
              </span>
              {upcomingMeetings.map(m => {
                const meta = STATUS_META[m.status] || {
                  label: m.status,
                  badgeClass: 'bg-[#F8F5F0] text-[#6B6462] border-[#E7E1D8]'
                };
                const proposed = parseProposedSlots((m as any).proposed_slots);

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E1D8] shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-[#6B6462] inline-flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-[#6E2E3A]" />
                            {formatShortDate(m.date)}
                          </span>
                          {m.time && (
                            <span className="text-xs text-[#6B6462] inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#6E2E3A]" />
                              {m.time} hrs
                            </span>
                          )}
                        </div>
                        <h3 className="font-editorial text-xl text-[#1F1D1E]">{m.title}</h3>
                        {m.notes && (
                          <p className="text-xs text-[#6B6462] font-light">{m.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(m as any).meet_url && (
                          <a
                            href={(m as any).meet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1F1D1E] hover:bg-[#181514] text-white text-xs font-medium transition"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Unirme</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingMeeting(m)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F8F5F0] hover:bg-[#E7E1D8] text-[#5A524C] border border-[#E7E1D8] text-xs font-medium transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#6E2E3A]" />
                          <span>Detalles</span>
                        </button>
                      </div>
                    </div>

                    {/* Proposed Alternative Slots (if VLB sent 2 options) */}
                    {m.status === 'PROPUESTA' && proposed.length > 0 && (
                      <div className="pt-3 border-t border-[#F8F5F0] space-y-2.5">
                        <p className="text-xs font-medium text-[#521F29]">
                          Tu equipo VLB propuso estas opciones de horario — elige la que mejor te funcione:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {proposed.map((slot, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectProposedSlot(m.id, slot)}
                              className="text-left p-3.5 rounded-2xl bg-[#F8F5F0] hover:bg-[#F4EAEC] border border-[#E7E1D8] hover:border-[#6E2E3A] transition cursor-pointer flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6E2E3A] block">
                                  {slot.note || `Opción ${idx + 1}`}
                                </span>
                                <span className="text-sm font-medium text-[#1F1D1E]">
                                  {formatShortDate(slot.date)} · {slot.time} hrs
                                </span>
                              </div>
                              <span className="px-3 py-1 rounded-full bg-white border border-[#E7E1D8] text-[11px] font-medium text-[#1F1D1E]">
                                Elegir
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Past Meetings & Agreements */}
          {pastMeetings.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#6B6462] px-1">
                Historial & Minutas ({pastMeetings.length})
              </span>
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E7E1D8] shadow-2xs divide-y divide-[#F8F5F0]">
                {pastMeetings.map(m => {
                  const meta = STATUS_META[m.status] || {
                    label: m.status,
                    badgeClass: 'bg-[#F8F5F0] text-[#6B6462] border-[#E7E1D8]'
                  };
                  return (
                    <div
                      key={m.id}
                      onClick={() => setViewingMeeting(m)}
                      className="py-3.5 px-2 rounded-2xl flex items-center justify-between gap-3 hover:bg-[#F8F5F0]/70 transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1F1D1E] truncate">{m.title}</p>
                        <p className="text-[11px] text-[#6B6462] font-light mt-0.5">
                          {formatShortDate(m.date)} · {m.time} hrs
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#6B6462]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Solicitar Reunión */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Solicitar Reunión"
        subtitle="Propón un día y horario; tu equipo de Viva la Bride te confirmará o sugerirá alternativas."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleRequestMeeting} className="space-y-3.5">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
              Tema de la reunión *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Revisión de presupuesto y proveedores"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Fecha deseada *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Hora *
              </label>
              <input
                type="time"
                required
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
              Dudas o puntos a tratar (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Cuéntanos qué temas te gustaría revisar en esta sesión..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="px-4 py-2 text-xs text-[#6B6462] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-full bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-medium cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detalle / Minuta de Reunión */}
      <Modal
        isOpen={Boolean(viewingMeeting)}
        onClose={() => setViewingMeeting(null)}
        title={viewingMeeting?.title || 'Detalle de Reunión'}
        subtitle={
          viewingMeeting
            ? `${formatShortDate(viewingMeeting.date)} · ${viewingMeeting.time || ''} hrs`
            : undefined
        }
        maxWidthClass="max-w-lg"
      >
        {viewingMeeting && (
          <div className="space-y-4 text-xs text-[#5A524C]">
            {(viewingMeeting as any).meet_url && (
              <a
                href={(viewingMeeting as any).meet_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1F1D1E] text-white font-medium"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Abrir enlace de videollamada</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}

            {viewingMeeting.notes && (
              <div className="bg-[#F8F5F0] rounded-2xl p-4 border border-[#E7E1D8]">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6B6462] block mb-1">
                  Notas
                </span>
                <p className="whitespace-pre-line leading-relaxed text-[#1F1D1E]">{viewingMeeting.notes}</p>
              </div>
            )}

            {viewingMeeting.agreements && (
              <div className="bg-[#F8F5F0] rounded-2xl p-4 border border-[#E7E1D8]">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#577355] block mb-1">
                  Acuerdos
                </span>
                <p className="whitespace-pre-line leading-relaxed text-[#1F1D1E]">{viewingMeeting.agreements}</p>
              </div>
            )}

            {viewingMeeting.pending_tasks && (
              <div className="bg-[#F8F5F0] rounded-2xl p-4 border border-[#E7E1D8]">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6E2E3A] block mb-1">
                  Pendientes
                </span>
                <p className="whitespace-pre-line leading-relaxed text-[#1F1D1E]">{viewingMeeting.pending_tasks}</p>
              </div>
            )}

            {!viewingMeeting.notes && !viewingMeeting.agreements && !viewingMeeting.pending_tasks && (
              <p className="text-center py-6 text-[#6B6462] italic font-light">
                Aún no hay acuerdos ni notas registradas para esta sesión.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
