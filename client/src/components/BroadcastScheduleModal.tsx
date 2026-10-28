import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  FileText,
  Users
} from 'lucide-react';

interface BroadcastScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddingId: string;
  token: string | null;
  weddingName?: string;
  weddingDate?: string;
}

export const BroadcastScheduleModal: React.FC<BroadcastScheduleModalProps> = ({
  isOpen,
  onClose,
  weddingId,
  token,
  weddingName = 'Boda',
  weddingDate = ''
}) => {
  const [activeTab, setActiveTab] = useState<'REMINDER' | 'SEATING'>('REMINDER');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Schedule data from server
  const [scheduleData, setScheduleData] = useState<any>(null);

  // Form states for Reminder (7 days)
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('11:00');
  const [reminderText, setReminderText] = useState('');

  // Form states for Seating (Day-of)
  const [seatingEnabled, setSeatingEnabled] = useState(true);
  const [seatingTime, setSeatingTime] = useState('12:00');
  const [seatingText, setSeatingText] = useState('');

  // Test phone state
  const [testPhone, setTestPhone] = useState('');

  const fetchSchedule = async () => {
    if (!weddingId || !token) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/whatsapp/scheduled/${weddingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.schedule) {
        setScheduleData(data.schedule);
        setReminderEnabled(data.schedule.reminder7Days.enabled);
        setReminderTime(data.schedule.reminder7Days.time);
        setReminderText(data.schedule.reminder7Days.templateText);

        setSeatingEnabled(data.schedule.dayOfSeating.enabled);
        setSeatingTime(data.schedule.dayOfSeating.time);
        setSeatingText(data.schedule.dayOfSeating.templateText);
      } else {
        setFeedback({ type: 'error', text: data.error || 'Error al cargar programación.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSchedule();
    }
  }, [isOpen, weddingId]);

  if (!isOpen) return null;

  const handleSaveSettings = async () => {
    if (!weddingId || !token) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/whatsapp/scheduled/${weddingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reminder7DaysEnabled: reminderEnabled,
          reminder7DaysTime: reminderTime,
          reminderTemplateText: reminderText,
          dayOfSeatingEnabled: seatingEnabled,
          dayOfSeatingTime: seatingTime,
          seatingTemplateText: seatingText
        })
      });
      const data = await res.json();
      if (res.ok && data.schedule) {
        setScheduleData(data.schedule);
        setFeedback({ type: 'success', text: '¡Configuración de programación guardada exitosamente!' });
      } else {
        setFeedback({ type: 'error', text: data.error || 'No se pudo guardar la configuración.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (type: 'REMINDER' | 'SEATING') => {
    if (!testPhone.trim() || !token) {
      setFeedback({ type: 'error', text: 'Por favor ingresa un número de teléfono celular para la prueba.' });
      return;
    }
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/whatsapp/scheduled/${weddingId}/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type, testPhone })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `¡Mensaje de prueba enviado exitosamente por WhatsApp a ${testPhone}!`
        });
      } else {
        setFeedback({
          type: 'error',
          text: data.result?.details?.[0]?.result?.error || data.error || 'Error al enviar la prueba.'
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error de conexión.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSendNow = async (type: 'REMINDER' | 'SEATING') => {
    const isReminder = type === 'REMINDER';
    const targetLabel = isReminder
      ? 'Recordatorio de 7 días a todos los invitados confirmados'
      : 'Asignación de mesa a todos los confirmados con mesa';

    if (!window.confirm(`¿Estás segura de enviar de inmediato este ${targetLabel}?`)) {
      return;
    }

    setSendingNow(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/whatsapp/scheduled/${weddingId}/send-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScheduleData(data.schedule);
        setFeedback({
          type: 'success',
          text: `¡Difusión enviada con éxito! Se procesaron ${data.result.sentCount} mensajes enviados (${data.result.errorCount} errores).`
        });
      } else {
        setFeedback({ type: 'error', text: data.error || 'Error al ejecutar el envío masivo.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al ejecutar el envío.' });
    } finally {
      setSendingNow(false);
    }
  };

  const handleReset = async (type: 'REMINDER' | 'SEATING') => {
    if (!window.confirm('¿Deseas reiniciar el estado a "Programado" para permitir un nuevo envío automático?')) {
      return;
    }
    try {
      const res = await fetch(`/api/whatsapp/scheduled/${weddingId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok) {
        setScheduleData(data.schedule);
        setFeedback({ type: 'success', text: 'Estado reiniciado a Programado.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const insertTag = (tag: string, target: 'REMINDER' | 'SEATING') => {
    if (target === 'REMINDER') {
      setReminderText(prev => prev + ' ' + tag);
    } else {
      setSeatingText(prev => prev + ' ' + tag);
    }
  };

  const restoreDefault = (target: 'REMINDER' | 'SEATING') => {
    if (target === 'REMINDER' && scheduleData) {
      setReminderText(scheduleData.reminder7Days.defaultTemplate);
    } else if (target === 'SEATING' && scheduleData) {
      setSeatingText(scheduleData.dayOfSeating.defaultTemplate);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2826]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-3xl border border-[#EFE8E1] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Elegante Didone + Outfit */}
        <div className="px-6 py-5 border-b border-[#EFE8E1] bg-[#FCFAF7] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C48B81]/10 text-[#C48B81] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#C48B81]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif text-xl font-bold text-[#332A28]">
                  Programación de Envíos WhatsApp
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EFE8E1] text-[#695D59]">
                  VLB Studio
                </span>
              </div>
              <p className="text-xs text-[#7D6F6B]">
                Difusiones automatizadas para {weddingName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#EFE8E1]/60 text-[#7D6F6B] hover:text-[#332A28] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-2xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-bold text-sm ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-[#EFE8E1] bg-[#FFFFFF] flex space-x-3">
          <button
            type="button"
            onClick={() => setActiveTab('REMINDER')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center space-x-2 cursor-pointer ${
              activeTab === 'REMINDER'
                ? 'border-[#C48B81] text-[#C48B81]'
                : 'border-transparent text-[#7D6F6B] hover:text-[#332A28]'
            }`}
          >
            <span>📍 2. Recordatorio 7 Días Antes</span>
            {scheduleData && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FAF8F5] border border-[#EFE8E1] text-[#7D6F6B]">
                {scheduleData.reminder7Days.status === 'SENT' ? 'Enviado ✓' : 'Programado'}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SEATING')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center space-x-2 cursor-pointer ${
              activeTab === 'SEATING'
                ? 'border-[#C48B81] text-[#C48B81]'
                : 'border-transparent text-[#7D6F6B] hover:text-[#332A28]'
            }`}
          >
            <span>🍽️ 3. Asignación de Mesa (Día Evento)</span>
            {scheduleData && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FAF8F5] border border-[#EFE8E1] text-[#7D6F6B]">
                {scheduleData.dayOfSeating.status === 'SENT' ? 'Enviado ✓' : 'Programado'}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !scheduleData ? (
            <div className="py-16 text-center text-[#7D6F6B]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C48B81]" />
              <p className="text-xs">Cargando programación oficial...</p>
            </div>
          ) : activeTab === 'REMINDER' ? (
            /* ============================================================== */
            /* TAB 1: RECORDATORIO 7 DÍAS ANTES                              */
            /* ============================================================== */
            <div className="space-y-5">
              {/* Card de Configuración Automática */}
              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EBDCC5]/50 text-[#8A6332] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#332A28] uppercase tracking-wide">
                      Disparo Automático (7 Días Antes)
                    </h4>
                    <p className="text-xs text-[#7D6F6B] mt-0.5">
                      Fecha calculada:{' '}
                      <strong className="text-[#332A28]">
                        {scheduleData?.reminder7Days?.targetFormattedDate || 'Por calcular'}
                      </strong>
                    </p>
                    <p className="text-[11px] text-[#7D6F6B]/80 mt-1 flex items-center space-x-1">
                      <Users className="w-3 h-3 text-[#C48B81]" />
                      <span>
                        Destinatarios elegibles:{' '}
                        <strong className="text-[#332A28]">
                          {scheduleData?.reminder7Days?.eligibleCount || 0} invitados confirmados
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-center">
                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] font-semibold text-[#7D6F6B]">Hora:</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={e => setReminderTime(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-[#EFE8E1] rounded-lg font-mono text-[#332A28] focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>

                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={e => setReminderEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#EFE8E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C48B81]"></div>
                    <span className="text-xs font-semibold text-[#332A28]">
                      {reminderEnabled ? 'Activo' : 'Pausado'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Status Banner */}
              {scheduleData?.reminder7Days?.status === 'SENT' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <span>
                    ✓ Este recordatorio ya fue enviado automáticamente el{' '}
                    <strong>{scheduleData.reminder7Days.sentAt?.split('T')[0]}</strong>.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReset('REMINDER')}
                    className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer ml-2"
                  >
                    Reprogramar
                  </button>
                </div>
              )}

              {/* Template Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7D6F6B] flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Redacción de la Plantilla</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => restoreDefault('REMINDER')}
                    className="text-[11px] font-semibold text-[#C48B81] hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restaurar texto oficial</span>
                  </button>
                </div>

                {/* Variable Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="text-[10px] font-bold text-[#7D6F6B] py-1 mr-1">Insertar tag:</span>
                  {[
                    '{{Novios}}',
                    '{{Ceremonia}}',
                    '{{HoraCeremonia}}',
                    '{{Recepcion}}',
                    '{{HoraRecepcion}}',
                    '{{DressCode}}',
                    '{{Lugares}}',
                    '{{Ubicacion}}'
                  ].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTag(tag, 'REMINDER')}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#A86B60] border border-[#EFE8E1] cursor-pointer transition shadow-2xs"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={9}
                  value={reminderText}
                  onChange={e => setReminderText(e.target.value)}
                  className="w-full px-3.5 py-3 text-xs bg-[#FAF8F5] border border-[#EFE8E1] rounded-xl text-[#332A28] leading-relaxed font-sans focus:outline-none focus:border-[#C48B81] focus:bg-white resize-none"
                  placeholder="Escribe el texto de la plantilla..."
                />
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-[#EFE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Send Test Section */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#7D6F6B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tel. de prueba (10 dígitos)"
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className="pl-8 pr-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#EFE8E1] rounded-lg text-[#332A28] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81] w-48"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendTest('REMINDER')}
                    disabled={testing || !testPhone.trim()}
                    className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#332A28] text-xs font-semibold rounded-lg transition border border-[#EFE8E1] cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#C48B81]" />}
                    <span>Probar en mi celular</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleSendNow('REMINDER')}
                    disabled={sendingNow}
                    className="px-3.5 py-2 bg-[#FAF7F5] hover:bg-[#F5EFEB] text-[#2B2826] border border-[#EFE8E1] text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
                    title="Enviar inmediatamente a todos los invitados confirmados"
                  >
                    {sendingNow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#C48B81]" />}
                    <span>Enviar a confirmados ahora</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-4 py-2 bg-[#2B2826] hover:bg-[#1E1B19] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* TAB 2: ASIGNACIÓN DE MESA (DÍA DEL EVENTO)                    */
            /* ============================================================== */
            <div className="space-y-5">
              {/* Card de Configuración Automática */}
              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EBDCC5]/50 text-[#8A6332] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#332A28] uppercase tracking-wide">
                      Disparo Automático (Día del Evento)
                    </h4>
                    <p className="text-xs text-[#7D6F6B] mt-0.5">
                      Fecha de la boda:{' '}
                      <strong className="text-[#332A28]">
                        {scheduleData?.dayOfSeating?.targetFormattedDate || 'Por calcular'}
                      </strong>
                    </p>
                    <p className="text-[11px] text-[#7D6F6B]/80 mt-1 flex items-center space-x-1">
                      <Users className="w-3 h-3 text-[#C48B81]" />
                      <span>
                        Destinatarios elegibles:{' '}
                        <strong className="text-[#332A28]">
                          {scheduleData?.dayOfSeating?.eligibleCount || 0} confirmados con mesa asignada
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-center">
                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] font-semibold text-[#7D6F6B]">Hora:</label>
                    <input
                      type="time"
                      value={seatingTime}
                      onChange={e => setSeatingTime(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-[#EFE8E1] rounded-lg font-mono text-[#332A28] focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>

                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seatingEnabled}
                      onChange={e => setSeatingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#EFE8E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C48B81]"></div>
                    <span className="text-xs font-semibold text-[#332A28]">
                      {seatingEnabled ? 'Activo' : 'Pausado'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Status Banner */}
              {scheduleData?.dayOfSeating?.status === 'SENT' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <span>
                    ✓ La asignación de mesas ya fue enviada el{' '}
                    <strong>{scheduleData.dayOfSeating.sentAt?.split('T')[0]}</strong>.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReset('SEATING')}
                    className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer ml-2"
                  >
                    Reprogramar
                  </button>
                </div>
              )}

              {/* Template Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7D6F6B] flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Redacción de la Plantilla</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => restoreDefault('SEATING')}
                    className="text-[11px] font-semibold text-[#C48B81] hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restaurar texto oficial</span>
                  </button>
                </div>

                {/* Variable Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="text-[10px] font-bold text-[#7D6F6B] py-1 mr-1">Insertar tag:</span>
                  {['{{Nombre}}', '{{Novios}}', '{{Mesa}}', '{{Lugares}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTag(tag, 'SEATING')}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#A86B60] border border-[#EFE8E1] cursor-pointer transition shadow-2xs"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={9}
                  value={seatingText}
                  onChange={e => setSeatingText(e.target.value)}
                  className="w-full px-3.5 py-3 text-xs bg-[#FAF8F5] border border-[#EFE8E1] rounded-xl text-[#332A28] leading-relaxed font-sans focus:outline-none focus:border-[#C48B81] focus:bg-white resize-none"
                  placeholder="Escribe el texto de la plantilla..."
                />
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-[#EFE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Send Test Section */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#7D6F6B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tel. de prueba (10 dígitos)"
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className="pl-8 pr-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#EFE8E1] rounded-lg text-[#332A28] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#C48B81] w-48"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendTest('SEATING')}
                    disabled={testing || !testPhone.trim()}
                    className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#332A28] text-xs font-semibold rounded-lg transition border border-[#EFE8E1] cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#C48B81]" />}
                    <span>Probar en mi celular</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleSendNow('SEATING')}
                    disabled={sendingNow}
                    className="px-3.5 py-2 bg-[#FAF7F5] hover:bg-[#F5EFEB] text-[#2B2826] border border-[#EFE8E1] text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
                    title="Enviar inmediatamente a confirmados con mesa asignada"
                  >
                    {sendingNow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#C48B81]" />}
                    <span>Enviar a confirmados con mesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-4 py-2 bg-[#2B2826] hover:bg-[#1E1B19] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
