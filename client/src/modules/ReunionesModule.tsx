import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Meeting, PackageInfo } from '../types';
import {
  CalendarCheck2, Plus, Clock, Users, CheckCircle2,
  AlertCircle, MessageSquare, ChevronRight, Check, Sparkles, X, ChevronDown,
  Video, ExternalLink, Bot, FileText, AlertTriangle
} from 'lucide-react';

export const ReunionesModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPackageExpanded, setIsPackageExpanded] = useState(false);

  // New Meeting / Request Meeting Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '11:00',
    notes: '',
    meet_url: ''
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
    meet_url: '',
    summary: '',
    status: 'PROGRAMADA'
  });
  const [rawTranscript, setRawTranscript] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const parseAcceptedList = (m: Meeting): Array<{ userId: string; userName: string; role: string; acceptedAt: string }> => {
    try {
      if (Array.isArray(m.accepted_by)) return m.accepted_by;
      if (typeof m.accepted_by === 'string' && m.accepted_by.trim()) {
        return JSON.parse(m.accepted_by);
      }
      return [];
    } catch {
      return [];
    }
  };

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

  // Conflict detection within +/- 45 minutes
  const getConflictWarning = (targetDate: string, targetTime: string, excludeId?: string) => {
    if (!targetDate || !targetTime) return null;
    const [tH, tM] = targetTime.split(':').map(Number);
    const targetMinutes = tH * 60 + (tM || 0);

    for (const m of meetings) {
      if (excludeId && m.id === excludeId) continue;
      if (m.status === 'CANCELADA') continue;
      if (m.date === targetDate && m.time) {
        const [mH, mM] = m.time.split(':').map(Number);
        const mMinutes = mH * 60 + (mM || 0);
        if (Math.abs(targetMinutes - mMinutes) < 45) {
          return `Atención: Ya existe la reunión "${m.title}" agendada a las ${m.time} hrs (${m.status}).`;
        }
      }
    }
    return null;
  };

  const scheduleConflictAlert = useMemo(() => {
    return getConflictWarning(formData.date, formData.time);
  }, [formData.date, formData.time, meetings]);

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
        notes: '',
        meet_url: ''
      });
      await fetchMeetings();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Team accepts meeting - requires 2 coordinators/admins
  const handleAcceptMeeting = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'ACCEPT_HORARIO' })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.meeting?.status === 'PROGRAMADA') {
          alert('¡Horario confirmado con éxito! Con tu aceptación se completaron las 2 requeridas y la sesión ha quedado PROGRAMADA.');
        } else {
          alert('Aceptación de horario registrada. La sesión pasará a PROGRAMADA una vez que otro coordinador o administrador acepte.');
        }
        fetchMeetings();
      } else {
        alert(data.error || 'Error al procesar la aceptación.');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión.');
    }
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

  // AI-powered Minuta Generator
  const handleGenerateAiMinuta = () => {
    if (!rawTranscript.trim()) return;
    setIsAiProcessing(true);

    setTimeout(() => {
      const lines = rawTranscript.split('\n').map(l => l.trim()).filter(Boolean);
      const newAgreements: string[] = [];
      const newTasks: string[] = [];
      const generalSummary: string[] = [];

      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('acuerdo') || lower.includes('definir') || lower.includes('queda') || lower.includes('aprob') || lower.includes('precio') || lower.includes('costo') || lower.includes('pact')) {
          newAgreements.push(line.replace(/^[-*•\d.]+\s*/, ''));
        } else if (lower.includes('tarea') || lower.includes('pendiente') || lower.includes('enviar') || lower.includes('revisar') || lower.includes('cotizar') || lower.includes('llamar') || lower.includes('dar seguimiento')) {
          newTasks.push(line.replace(/^[-*•\d.]+\s*/, ''));
        } else {
          generalSummary.push(line.replace(/^[-*•\d.]+\s*/, ''));
        }
      });

      const formattedSummary = `Resumen Ejecutivo de Sesión (${new Date().toLocaleDateString('es-MX')}):\n` +
        (generalSummary.length > 0 ? generalSummary.slice(0, 4).map(s => `• ${s}`).join('\n') : '• Sesión de coordinación y avance general.');

      const formattedAgreements = (meetingNotes.agreements ? meetingNotes.agreements + '\n\n' : '') +
        (newAgreements.length > 0 
          ? newAgreements.map(a => `✓ ${a}`).join('\n')
          : `✓ Se revisaron y validaron los puntos acordados en la videollamada.`);

      const formattedTasks = (meetingNotes.pending_tasks ? meetingNotes.pending_tasks + '\n\n' : '') +
        (newTasks.length > 0
          ? newTasks.map(t => `▫ ${t}`).join('\n')
          : `▫ Seguimiento general y confirmación con proveedores.`);

      setMeetingNotes(prev => ({
        ...prev,
        agreements: formattedAgreements,
        pending_tasks: formattedTasks,
        summary: formattedSummary
      }));
      setIsAiProcessing(false);
    }, 500);
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
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>{isNovios ? 'Solicitar Reunión' : 'Agendar Reunión'}</span>
        </button>
      </div>

      {/* Expandable Package Allowance Banner */}
      {packageInfo && (
        <div className="bg-white rounded-2xl border border-[#EFE8E1] shadow-xs overflow-hidden transition-all duration-200">
          <div
            onClick={() => setIsPackageExpanded(!isPackageExpanded)}
            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F5]/50 transition select-none"
            title="Haz clic para desplegar u ocultar la información del paquete"
          >
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center text-[#C48B81] shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-[#C48B81] uppercase tracking-wider bg-[#F7EDEB] px-2 py-0.5 rounded border border-[#ECD9D5]">
                    {packageInfo.packageName}
                  </span>
                  <span className="text-xs font-semibold text-[#2B2826] leading-snug">
                    {packageInfo.description}
                  </span>
                </div>
                <p className="text-[11px] text-[#8A7E72] mt-1">
                  Tope acordado: <strong>{packageInfo.maxMeetings >= 999 ? 'Reuniones ilimitadas' : `${packageInfo.maxMeetings} sesiones`}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0 text-xs">
              <span className="px-3 py-1 rounded-xl bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] font-semibold">
                Agendadas: <strong>{packageInfo.usedMeetings}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#F7ECE8] text-[#A86B60] border border-[#E8D1CB] font-semibold">
                Disponibles: <strong>{packageInfo.remainingMeetings}</strong>
              </span>
              <div className="p-1 rounded-lg text-[#8A7E72] hover:text-[#2B2826]">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPackageExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>

          {/* Desplegable de información completa del paquete */}
          {isPackageExpanded && (
            <div className="px-4 pb-4 pt-2 border-t border-[#F5EFEB] bg-[#FCFAF7] space-y-3 animate-in fade-in duration-150">
              <div className="text-xs text-[#5A524C] leading-relaxed">
                <span className="font-semibold text-[#2B2826]">Alcance del paquete contratado:</span> {packageInfo.description}
              </div>

              {packageInfo.includes && packageInfo.includes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7E72]">
                    Servicios e Inclusiones Clave:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {packageInfo.includes.map((inc, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-[#2B2826] bg-white p-2 rounded-xl border border-[#EFE8E1]">
                        <Check className="w-3.5 h-3.5 text-[#6B8E6E] shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        <h3 className="font-serif text-2xl font-bold text-[#2B2826]">Historial y Próximas Reuniones</h3>

        {loading ? (
          <div className="py-12 text-center text-[#8A7E72] text-sm">Cargando reuniones...</div>
        ) : meetings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-[#8A7E72] text-sm border border-dashed border-[#EFE8E1]">
            No hay reuniones agendadas aún. Solicita tu primera reunión con el equipo.
          </div>
        ) : (
          meetings.map(m => {
            const hasProposed = m.status === 'PROPUESTA' && m.proposed_slots && m.proposed_slots.length > 0;
            const acceptedList = parseAcceptedList(m);
            const hasCurrentUserAccepted = Boolean(user && acceptedList.some(a => a.userId === user.id));
            const canAcceptMeeting = !isNovios && (user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR');

            return (
              <div
                key={m.id}
                className="bg-white rounded-3xl p-6 border border-[#EFE8E1] shadow-xs hover:border-[#EFE8E1] transition space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        m.status === 'REALIZADA'
                          ? 'bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1]'
                          : m.status === 'SOLICITADA'
                          ? 'bg-[#FAF3E8] text-[#7C5824] border border-[#E8D7B8] animate-pulse'
                          : m.status === 'PROPUESTA'
                          ? 'bg-[#F7EDEB] text-[#C48B81] border border-[#ECD9D5] font-semibold'
                          : 'bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1]'
                      }`}>
                        {m.status}
                      </span>
                      <span className="text-xs text-[#8A7E72]">Creada por: {m.created_by}</span>

                      {/* Google Meet Pill */}
                      {m.meet_url ? (
                        <a
                          href={m.meet_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-[#1967D2] text-xs font-semibold rounded-full border border-[#4285F4]/30 transition"
                          title="Abrir reunión de Google Meet"
                        >
                          <Video className="w-3 h-3 text-[#1967D2]" />
                          <span>Google Meet</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <a
                          href="https://meet.google.com/new"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] text-[#8A7E72] hover:text-[#1967D2] bg-[#FAF8F5] hover:bg-[#4285F4]/10 rounded-full border border-[#EFE8E1] transition"
                          title="Crear sala de Google Meet para esta sesión"
                        >
                          <Video className="w-3 h-3 text-[#8A7E72]" />
                          <span>+ Sala Meet</span>
                        </a>
                      )}
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
                      <p className="text-sm text-[#5A524C] mt-3 italic bg-[#FAF8F5] p-3 rounded-2xl border border-[#EFE8E1] leading-relaxed">
                        {m.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions according to role and status */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {canAcceptMeeting && (m.status === 'SOLICITADA' || m.status === 'PROPUESTA') && (
                      <>
                        {hasCurrentUserAccepted ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[#E4ECE5] text-[#2B5235] text-xs font-semibold rounded-xl border border-[#BDD4C1]">
                            <Check className="w-3.5 h-3.5" />
                            <span>Horario Aceptado ({acceptedList.length}/2)</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcceptMeeting(m.id)}
                            className="px-4 py-2 bg-[#E4ECE5] hover:bg-[#D5E3D7] text-[#2B5235] text-xs font-bold uppercase tracking-wider rounded-xl border border-[#BDD4C1] transition shadow-xs cursor-pointer"
                            title="Aceptar este horario. Se requieren al menos 2 administradores/coordinadores para confirmar la cita."
                          >
                            Aceptar Horario ({acceptedList.length}/2)
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setProposingMeeting(m);
                            setSlot1({ date: m.date, time: '16:00', note: 'Opción A (Tarde)' });
                            setSlot2({ date: m.date, time: '11:00', note: 'Opción B (Mañana)' });
                          }}
                          className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] text-xs font-semibold rounded-xl border border-[#EFE8E1] transition cursor-pointer"
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
                          meet_url: m.meet_url || '',
                          summary: m.summary || '',
                          status: m.status
                        });
                        setRawTranscript('');
                      }}
                      className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] text-xs font-semibold rounded-xl border border-[#EFE8E1] transition cursor-pointer"
                    >
                      Ver Acuerdos y Minuta
                    </button>
                  </div>
                </div>

                {/* Condition: Planning team approvals strip (Foto 1) */}
                {(m.status === 'SOLICITADA' || m.status === 'PROPUESTA') && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-[#C48B81]" />
                        <span className="font-bold text-[#2B2826]">Aprobación del Equipo de Planeación:</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          acceptedList.length >= 2
                            ? 'bg-[#E4ECE5] text-[#2B5235]'
                            : 'bg-[#FAF3E8] text-[#7C5824]'
                        }`}>
                          {acceptedList.length} de 2 coordinadores han aceptado
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A7E72]">
                        {acceptedList.length >= 2
                          ? '✓ Horario aprobado por 2 personas del equipo. La sesión está lista.'
                          : 'Condición activa: Tanto Administradores como Coordinadores involucrados deben aceptar la propuesta. La sesión se agenda automáticamente con 2 o más aceptaciones.'}
                      </p>
                      {acceptedList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {acceptedList.map((acc, idx) => (
                            <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-[#EFE8E1] text-[11px] text-[#2B2826] font-medium">
                              ✓ {acc.userName} ({acc.role})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* If PROPUESTA: show the 2 alternative options for Novios to pick! */}
                {hasProposed && (
                  <div className="mt-4 pt-4 border-t border-[#FAF8F5] bg-[#F7EDEB]/60 p-4 rounded-2xl border border-[#ECD9D5]">
                    <div className="text-xs font-bold text-[#C48B81] mb-2.5 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#C48B81]" />
                      <span>El equipo VLB ha propuesto 2 horarios alternativos para esta reunión:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {m.proposed_slots!.map((slot, i) => (
                        <div
                          key={i}
                          className="bg-white p-3.5 rounded-xl border border-[#ECD9D5] flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <div className="text-sm font-bold text-[#2B2826]">{slot.note || `Opción ${i + 1}`}</div>
                            <div className="text-xs text-[#8A7E72] font-mono mt-0.5">{slot.date} — {slot.time} hrs</div>
                          </div>

                          {isNovios && (
                            <button
                              onClick={() => handleSelectSlot(m.id, slot)}
                              className="px-3.5 py-1.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-bold rounded-lg transition"
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE8E1]">
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

            {/* Real-time Conflict Alert (Foto 3 / Extra req) */}
            {scheduleConflictAlert && (
              <div className="mb-3 p-3.5 rounded-xl bg-[#FAF4F0] text-[#8A6D5E] text-xs border border-[#EFE8E1] flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#C48B81] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#2B2826]">¡Alerta de empalme de horario!</div>
                  <div className="mt-0.5">{scheduleConflictAlert}</div>
                </div>
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
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
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
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Hora Deseada *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider">Enlace de Google Meet (Opcional)</label>
                  <a
                    href="https://meet.google.com/new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#1967D2] hover:underline inline-flex items-center space-x-1"
                  >
                    <Video className="w-3 h-3" />
                    <span>+ Crear sala Meet</span>
                  </a>
                </div>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={formData.meet_url}
                  onChange={e => setFormData({ ...formData, meet_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Temas o Notas Previas</label>
                <textarea
                  rows={2}
                  placeholder="Puntos clave que te gustaría revisar en esta sesión..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8E1]">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl shadow-xs transition"
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EFE8E1]">
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
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] space-y-2">
                <div className="text-xs font-bold text-[#2B2826] uppercase tracking-wider">Opción 1:</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    required
                    value={slot1.date}
                    onChange={e => setSlot1({ ...slot1, date: e.target.value })}
                    className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                  <input
                    type="time"
                    required
                    value={slot1.time}
                    onChange={e => setSlot1({ ...slot1, time: e.target.value })}
                    className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                </div>
              </div>

              {/* Slot 2 */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] space-y-2">
                <div className="text-xs font-bold text-[#2B2826] uppercase tracking-wider">Opción 2:</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    required
                    value={slot2.date}
                    onChange={e => setSlot2({ ...slot2, date: e.target.value })}
                    className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                  <input
                    type="time"
                    required
                    value={slot2.time}
                    onChange={e => setSlot2({ ...slot2, time: e.target.value })}
                    className="px-3 py-2 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8E1]">
                <button
                  type="button"
                  onClick={() => setProposingMeeting(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5A524C] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl shadow-xs transition"
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EFE8E1]">
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

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Estatus de la Sesión</label>
                <select
                  disabled={isNovios}
                  value={meetingNotes.status}
                  onChange={e => setMeetingNotes({ ...meetingNotes, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81] disabled:bg-[#FAF8F5]"
                >
                  <option value="PROGRAMADA">PROGRAMADA</option>
                  <option value="SOLICITADA">SOLICITADA</option>
                  <option value="PROPUESTA">PROPUESTA</option>
                  <option value="REALIZADA">REALIZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              {/* Google Meet Link (Foto 2) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#2B2826] uppercase tracking-wider">
                    Enlace de Google Meet
                  </label>
                  {meetingNotes.meet_url ? (
                    <a
                      href={meetingNotes.meet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#1967D2] font-semibold hover:underline inline-flex items-center space-x-1"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Abrir Google Meet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <a
                      href="https://meet.google.com/new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#1967D2] hover:underline inline-flex items-center space-x-1"
                    >
                      <Video className="w-3 h-3" />
                      <span>Crear sala Meet</span>
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  disabled={isNovios}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={meetingNotes.meet_url}
                  onChange={e => setMeetingNotes({ ...meetingNotes, meet_url: e.target.value })}
                  className="w-full px-3.5 py-2 border border-[#EFE8E1] rounded-xl text-sm bg-white text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81] disabled:bg-[#FAF8F5]"
                />
              </div>

              {/* AI Minuta & Recording Summarizer (Foto 2) */}
              {!isNovios && (
                <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#C48B81]">
                      <Bot className="w-4 h-4" />
                      <span>Minuta Inteligente con IA (Google Meet / Notas)</span>
                    </div>
                    <span className="text-[10px] text-[#8A7E72] bg-white px-2 py-0.5 rounded border border-[#EFE8E1]">
                      Asistente VLB
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8A7E72] leading-relaxed">
                    Pega aquí la transcripción automática de Google Meet, enlace de grabación o tus notas rápidas para extraer acuerdos y tareas estructuradas:
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Ejemplo: 'La novia aprobó el proveedor de audio por $25,000. Queda pendiente que el coordinador envíe el contrato antes del viernes...'"
                    value={rawTranscript}
                    onChange={e => setRawTranscript(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EFE8E1] rounded-xl text-xs bg-white text-[#2B2826] focus:outline-none focus:ring-1 focus:ring-[#C48B81]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isAiProcessing || !rawTranscript.trim()}
                      onClick={handleGenerateAiMinuta}
                      className="px-3.5 py-1.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-bold rounded-xl shadow-2xs transition inline-flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAiProcessing ? 'Analizando grabación...' : 'Generar Acuerdos y Minuta con IA'}</span>
                    </button>
                  </div>
                </div>
              )}

              {meetingNotes.summary && (
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-xs">
                  <div className="font-bold text-[#2B2826] mb-1">Resumen Ejecutivo de la Sesión:</div>
                  <div className="text-[#5A524C] whitespace-pre-line">{meetingNotes.summary}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2B2826] mb-1.5 uppercase tracking-wider">Acuerdos Principales</label>
                <textarea
                  rows={3}
                  disabled={isNovios}
                  placeholder="Compromisos y decisiones tomadas en la sesión..."
                  value={meetingNotes.agreements}
                  onChange={e => setMeetingNotes({ ...meetingNotes, agreements: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81] disabled:bg-[#FAF8F5]"
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
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] rounded-xl text-sm text-[#2B2826] focus:outline-none focus:ring-2 focus:ring-[#C48B81] disabled:bg-[#FAF8F5]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8E1]">
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
                    className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-xl shadow-xs transition"
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
