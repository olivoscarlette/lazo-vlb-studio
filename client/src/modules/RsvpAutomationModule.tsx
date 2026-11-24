import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Sparkles,
  ArrowRight,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  Trash2,
  Upload,
  Loader2,
  Check,
  Bot,
} from 'lucide-react';
import { BroadcastScheduleModal } from '../components/BroadcastScheduleModal';
import { WorkspaceTab } from '../components/Sidebar';

interface RsvpAutomationModuleProps {
  onNavigateTab: (tab: WorkspaceTab) => void;
}

export const RsvpAutomationModule: React.FC<RsvpAutomationModuleProps> = ({ onNavigateTab }) => {
  const { currentWedding, setCurrentWedding, token } = useAuth();
  const [weddingData, setWeddingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [invitationFeedback, setInvitationFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const fetchWeddingDetails = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.wedding) setWeddingData(data.wedding);
      }
    } catch (err) {
      console.error('Error fetching wedding details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentWedding && token) {
      fetchWeddingDetails();
    }
  }, [currentWedding?.id, token]);

  const handleUploadInvitationPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWedding || !token) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setInvitationFeedback({ text: 'El archivo debe estar en formato PDF.', type: 'error' });
      return;
    }

    setUploadingPdf(true);
    setInvitationFeedback(null);
    const formData = new FormData();
    formData.append('invitation_file', file);

    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/invitation-file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setInvitationFeedback({ text: '¡Invitación en PDF guardada y lista para WhatsApp!', type: 'success' });
        fetchWeddingDetails();
        setCurrentWedding({
          ...currentWedding,
          invitation_type: 'PDF',
          invitation_pdf_url: data.invitation_pdf_url,
          invitation_pdf_filename: data.invitation_pdf_filename,
        });
      } else {
        setInvitationFeedback({ text: data.error || 'Error al subir PDF.', type: 'error' });
      }
    } catch (err: any) {
      setInvitationFeedback({ text: err.message || 'Error de conexión', type: 'error' });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeleteInvitationPdf = async () => {
    if (!currentWedding || !token) return;
    if (!confirm('¿Deseas eliminar la invitación en PDF y volver al modo de enlace web?')) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/invitation-file`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setInvitationFeedback({ text: 'Invitación en PDF eliminada.', type: 'success' });
        fetchWeddingDetails();
        setCurrentWedding({
          ...currentWedding,
          invitation_type: 'LINK',
          invitation_pdf_url: null,
          invitation_pdf_filename: null,
        });
      }
    } catch {}
  };

  const handleSaveInvitationSettings = async () => {
    if (!currentWedding || !token || !weddingData) return;
    setSavingSettings(true);
    setInvitationFeedback(null);
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invitation_type: weddingData.invitation_type || 'LINK',
          invitation_url: weddingData.invitation_url || '',
          dress_code: weddingData.dress_code || '',
          no_children: Boolean(weddingData.no_children),
        }),
      });
      if (res.ok) {
        setInvitationFeedback({ text: 'Configuración guardada exitosamente.', type: 'success' });
        fetchWeddingDetails();
      } else {
        setInvitationFeedback({ text: 'No se pudo guardar la configuración.', type: 'error' });
      }
    } catch {
      setInvitationFeedback({ text: 'Error al guardar.', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading || !weddingData) {
    return (
      <div className="py-20 text-center text-[#6B6462] text-sm">
        Cargando programación de RSVP y envíos...
      </div>
    );
  }

  const isPlannerVirtual = Boolean(
    weddingData.package_type &&
      (weddingData.package_type.toLowerCase().includes('virtual') ||
        weddingData.package_type.toLowerCase().includes('autónomo'))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Encabezado Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6462]">
            Agencia & Operación · Envíos Meta API
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#1F1D1E] mt-1 leading-tight">
            Programación RSVP &amp; Mesas
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6462] mt-1">
            Configura los mensajes programados por WhatsApp (recordatorio 7 días antes y asignación de mesa el día del evento) y la invitación formal de la boda.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('invitados')}
          className="self-start sm:self-auto px-4 py-2.5 bg-[#1F1D1E] hover:bg-[#1E1B19] text-white text-xs font-semibold rounded-full transition shadow-2xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Ir a Invitados &amp; RSVP</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#D9B6BC]" />
        </button>
      </div>

      {/* 1. Envíos Automáticos Programados por WhatsApp (7 Días Antes & Día del Evento) */}
      <div className="luxury-card rounded-[28px] p-6 sm:p-8 border border-[#E7E1D8] bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F5EFEB]">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#521F29] uppercase tracking-wider">
              <Clock className="w-4 h-4 text-[#6E2E3A]" />
              <span>Difusiones Automatizadas por WhatsApp</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl text-[#1F1D1E] mt-1">
              Recordatorio 7 Días Antes &amp; Mesas Día del Evento
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6462] mt-1 leading-relaxed">
              Mensajes programados que se disparan automáticamente a los invitados confirmados para compartir la ubicación, dress code y su asignación de mesa.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBroadcastModal(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer shrink-0 self-start sm:self-center"
          >
            <Clock className="w-4 h-4" />
            <span>Configurar &amp; Programar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
          {/* Card 1: Recordatorio 7 Días */}
          <div className="p-5 rounded-2xl bg-[#F8F5F0] border border-[#E7E1D8] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBDCC5]/50 text-[#8A6332]">
                  Plantilla 2 · Recordatorio
                </span>
                <span className="text-xs font-semibold text-[#25D366] flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                  <span>7 Días Antes ({weddingData?.reminder_7days_time || '11:00'} hrs)</span>
                </span>
              </div>
              <h3 className="font-editorial text-lg text-[#332A28] mt-2.5">
                Ubicación, Dress Code y Horarios
              </h3>
              <p className="text-xs text-[#6B6462] mt-1 leading-relaxed">
                Envía el recordatorio editorial formal con templo, recepción, dress code y mapas a todos los invitados que tengan estatus <strong>Confirmado</strong>.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E7E1D8]/60 flex items-center justify-between">
              <span className="text-[11px] text-[#6B6462]">
                Estatus:{' '}
                <strong className="text-[#332A28]">
                  {weddingData?.reminder_7days_status === 'SENT' ? 'Enviado ✓' : 'Programado'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="text-xs font-bold text-[#6E2E3A] hover:underline cursor-pointer"
              >
                Editar texto u hora →
              </button>
            </div>
          </div>

          {/* Card 2: Mesa Día del Evento */}
          <div className="p-5 rounded-2xl bg-[#F8F5F0] border border-[#E7E1D8] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E4ECE5] text-[#2B5235]">
                  Plantilla 3 · Día de la Boda
                </span>
                <span className="text-xs font-semibold text-[#25D366] flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                  <span>Día del Evento ({weddingData?.dayof_seating_time || '12:00'} hrs)</span>
                </span>
              </div>
              <h3 className="font-editorial text-lg text-[#332A28] mt-2.5">
                Asignación de Mesa y Bienvenida
              </h3>
              <p className="text-xs text-[#6B6462] mt-1 leading-relaxed">
                El día de la boda entrega el número y nombre de mesa asignada a los confirmados para que lleguen directamente a su lugar con el equipo{' '}
                {isPlannerVirtual ? 'de recepción' : 'Viva la Bride'}.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E7E1D8]/60 flex items-center justify-between">
              <span className="text-[11px] text-[#6B6462]">
                Estatus:{' '}
                <strong className="text-[#332A28]">
                  {weddingData?.dayof_seating_status === 'SENT' ? 'Enviado ✓' : 'Programado'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="text-xs font-bold text-[#6E2E3A] hover:underline cursor-pointer"
              >
                Editar texto u hora →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Invitación Formal & Flujo Automatizado de RSVP */}
      <div className="luxury-card rounded-[28px] p-6 sm:p-8 border border-[#E7E1D8] bg-white shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#F5EFEB]">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#521F29] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#6E2E3A]" />
              <span>RSVP Interactivo &amp; Invitación Digital</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl text-[#1F1D1E] mt-1">
              Invitación de la Boda &amp; Bot de WhatsApp
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6462] mt-1 leading-relaxed">
              Configura cómo reciben tus invitados la invitación formal (PDF o Enlace Canva/Web) y supervisa el flujo de confirmación automática.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start lg:self-center">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E4ECE5] text-[#354B38] border border-[#CCDACC]">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span>Bot Meta API Activo</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('invitados')}
              className="px-4 py-2 bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Enviar a Invitados</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {invitationFeedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
              invitationFeedback.type === 'success'
                ? 'bg-[#E4ECE5] text-[#354B38] border border-[#CCDACC]'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{invitationFeedback.text}</span>
            <button
              type="button"
              onClick={() => setInvitationFeedback(null)}
              className="font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Columna Izquierda: Configuración de la Invitación */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6462] mb-2">
                Tipo de Invitación Formal
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWeddingData({ ...weddingData, invitation_type: 'LINK' })}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                    (weddingData.invitation_type || 'LINK') === 'LINK'
                      ? 'bg-[#F4EAEC] border-[#6E2E3A] text-[#1F1D1E] shadow-2xs'
                      : 'bg-[#F8F5F0] border-[#E7E1D8] text-[#6B6462] hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      (weddingData.invitation_type || 'LINK') === 'LINK'
                        ? 'bg-white text-[#6E2E3A]'
                        : 'bg-white text-[#6B6462]'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Enlace Digital</div>
                    <div className="text-[11px] text-[#6B6462] opacity-80">Canva, microsite o web</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setWeddingData({ ...weddingData, invitation_type: 'PDF' })}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                    weddingData.invitation_type === 'PDF'
                      ? 'bg-[#F4EAEC] border-[#6E2E3A] text-[#1F1D1E] shadow-2xs'
                      : 'bg-[#F8F5F0] border-[#E7E1D8] text-[#6B6462] hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      weddingData.invitation_type === 'PDF'
                        ? 'bg-white text-[#6E2E3A]'
                        : 'bg-white text-[#6B6462]'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Archivo PDF</div>
                    <div className="text-[11px] text-[#6B6462] opacity-80">Documento adjunto oficial</div>
                  </div>
                </button>
              </div>
            </div>

            {(weddingData.invitation_type || 'LINK') === 'LINK' ? (
              <div className="p-4 rounded-2xl bg-[#F8F5F0] border border-[#E7E1D8] space-y-2">
                <label className="block text-xs font-bold text-[#1F1D1E]">
                  URL de la Invitación Web o Canva
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://www.canva.com/design/... o https://laboda.com"
                    value={weddingData.invitation_url || ''}
                    onChange={e => setWeddingData({ ...weddingData, invitation_url: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#E7E1D8] rounded-xl text-[#1F1D1E] focus:outline-none focus:border-[#6E2E3A]"
                  />
                  {weddingData.invitation_url && (
                    <a
                      href={weddingData.invitation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-white border border-[#E7E1D8] text-[#6B6462] hover:text-[#6E2E3A] transition shadow-2xs shrink-0"
                      title="Probar enlace en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-[#6B6462] leading-relaxed">
                  El bot enviará este enlace directamente al invitado en WhatsApp con vista previa para que pueda abrir su invitación con 1 toque.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F8F5F0] border border-[#E7E1D8] space-y-3">
                <label className="block text-xs font-bold text-[#1F1D1E]">
                  Archivo PDF de la Invitación
                </label>
                {weddingData.invitation_pdf_url ? (
                  <div className="p-3.5 rounded-xl bg-white border border-[#CCDACC] flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-[#25D366] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1F1D1E] truncate">
                          {weddingData.invitation_pdf_filename || 'Invitacion_Boda.pdf'}
                        </div>
                        <div className="text-[10px] text-[#354B38] font-medium">
                          ✓ Listo para entrega nativa en WhatsApp
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-3">
                      <a
                        href={weddingData.invitation_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#F8F5F0] hover:bg-[#F3ECE2] text-[#1F1D1E] border border-[#E7E1D8] rounded-lg transition"
                      >
                        Ver PDF
                      </a>
                      <button
                        type="button"
                        onClick={handleDeleteInvitationPdf}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Eliminar PDF"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 px-3 border-2 border-dashed border-[#E7E1D8] rounded-xl bg-white">
                    <FileText className="w-8 h-8 mx-auto text-[#C7B6A6] mb-2" />
                    <p className="text-xs text-[#1F1D1E] font-semibold">
                      Aún no has subido el archivo PDF
                    </p>
                    <p className="text-[11px] text-[#6B6462] mt-0.5 mb-3">
                      Sube el PDF diseñado de la boda (máximo 25 MB).
                    </p>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-2xs">
                      {uploadingPdf ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Subiendo archivo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Seleccionar archivo PDF</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleUploadInvitationPdf}
                        disabled={uploadingPdf}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                {weddingData.invitation_pdf_url && (
                  <div className="pt-1">
                    <label className="inline-flex items-center space-x-1.5 text-xs text-[#6E2E3A] hover:underline cursor-pointer font-semibold">
                      <Upload className="w-3 h-3" />
                      <span>{uploadingPdf ? 'Reemplazando...' : 'Reemplazar por otro PDF'}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleUploadInvitationPdf}
                        disabled={uploadingPdf}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1F1D1E] mb-1">
                  Código de Vestimenta
                </label>
                <input
                  type="text"
                  placeholder="Ej. Formal Riguroso, Playa Elegante"
                  value={weddingData.dress_code || ''}
                  onChange={e => setWeddingData({ ...weddingData, dress_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F5F0] border border-[#E7E1D8] rounded-xl text-[#1F1D1E] focus:outline-none focus:border-[#6E2E3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1D1E] mb-1">
                  Restricción de Edad
                </label>
                <div
                  onClick={() => setWeddingData({ ...weddingData, no_children: !weddingData.no_children })}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                    weddingData.no_children
                      ? 'bg-[#F4EAEC] border-[#6E2E3A] text-[#521F29]'
                      : 'bg-[#F8F5F0] border-[#E7E1D8] text-[#6B6462]'
                  }`}
                >
                  <span>Solo Adultos (No Niños)</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      weddingData.no_children ? 'bg-[#6E2E3A] border-[#6E2E3A] text-white' : 'border-[#C7B6A6]'
                    }`}
                  >
                    {weddingData.no_children && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveInvitationSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-[#1F1D1E] hover:bg-[#1E1B19] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-40"
              >
                {savingSettings ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>

          {/* Columna Derecha: Flujo Visual del Bot */}
          <div className="lg:col-span-5 bg-[#F8F5F0] border border-[#E7E1D8] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#6B6462]">
              <Bot className="w-4 h-4 text-[#6E2E3A]" />
              <span>Flujo Conversacional Oficial</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-white border border-[#E7E1D8] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F1D1E]">1. Invitación Inicial</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4EAEC] text-[#521F29] font-semibold">
                    Meta Template
                  </span>
                </div>
                <p className="text-[11px] text-[#6B6462]">
                  Envía la invitación personalizada formal con botones: <strong>[Confirmar Asistencia]</strong> y <strong>[No podré asistir]</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-[#E7E1D8] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F1D1E]">2. Validación de Asistentes</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EDE6] text-[#4B634D] font-semibold">
                    Interactivo
                  </span>
                </div>
                <p className="text-[11px] text-[#6B6462]">
                  Si tiene 2+ pases: <em>"¿Confirmas la asistencia de todas las personas?"</em> con botones <strong>[Asistiremos todos]</strong> o <strong>[Modificar número]</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-[#E7E1D8] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F1D1E]">3. Ficha Final &amp; Entrega</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4EAEC] text-[#521F29] font-semibold">
                    PDF o Enlace
                  </span>
                </div>
                <p className="text-[11px] text-[#6B6462]">
                  Entrega la confirmación formal (ceremonia, recepción, dress code, pases confirmados) y adjunta el <strong>archivo PDF</strong> o <strong>enlace Canva</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Programación de Envíos WhatsApp */}
      {showBroadcastModal && currentWedding && (
        <BroadcastScheduleModal
          isOpen={showBroadcastModal}
          onClose={() => {
            setShowBroadcastModal(false);
            fetchWeddingDetails();
          }}
          weddingId={currentWedding.id}
          token={token}
          weddingName={currentWedding.name}
          weddingDate={currentWedding.wedding_date || currentWedding.date}
        />
      )}
    </div>
  );
};
