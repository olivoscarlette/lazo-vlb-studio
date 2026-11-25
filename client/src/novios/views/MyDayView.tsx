import React, { useState } from 'react';
import { Plus, Trash2, Clock, MapPin, Pencil, Download, Sparkles } from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { CeremoniesSection } from '../components/CeremoniesSection';
import { HandoverSection } from '../components/HandoverSection';
import { Modal } from '../components/Modal';
import { VlbCoordinationModal } from '../components/VlbCoordinationModal';
import { TimelineItem } from '../types/lazo';
import { exportTimelinePdf, sortTimelineItems } from '../utils/pdfExport';

export const MyDayView: React.FC = () => {
  const { wedding, flags, updateWedding } = useWedding();
  const [subTab, setSubTab] = useState<'itinerario' | 'entregas' | 'ceremonias'>('itinerario');
  const [timelineEvent, setTimelineEvent] = useState<'principal' | 'civil'>('principal');
  const [showVlbModal, setShowVlbModal] = useState(false);

  // Add / Edit Timeline Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    time: '18:00',
    title: '',
    location: '',
    notes: ''
  });

  if (!wedding) return null;

  const { profile, timeline, ceremonies } = wedding;
  const civilTimeline = wedding.civilTimeline ?? [];
  const handoverItems = wedding.handoverItems || [];
  const isNonWedding = Boolean(profile.eventType && !profile.eventType.toLowerCase().includes('boda'));
  const activeSubTab = isNonWedding && subTab === 'ceremonias' ? 'itinerario' : subTab;

  const weddingDayKey = (profile.weddingDate || '').slice(0, 10);
  const civilDayKey = (ceremonies.civilDate || '').slice(0, 10);
  const hasCivilTimeline = Boolean(
    !isNonWedding &&
      ((ceremonies.civilEnabled && (!civilDayKey || !weddingDayKey || civilDayKey !== weddingDayKey)) ||
        civilTimeline.length > 0)
  );
  const isCivilTimeline = hasCivilTimeline && timelineEvent === 'civil';
  const activeTimeline = sortTimelineItems(isCivilTimeline ? civilTimeline : timeline);

  const formatShortDate = (raw?: string) => {
    if (!raw) return '';
    const d = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };
  const principalDateShort = formatShortDate(profile.weddingDate);
  const civilDateShort = formatShortDate(ceremonies.civilDate);

  const openAddEvent = () => {
    setEditingEventId(null);
    setEventForm({
      time: isCivilTimeline ? ceremonies.civilTime || '18:00' : '18:00',
      title: '',
      location: isCivilTimeline ? ceremonies.civilVenue || '' : '',
      notes: ''
    });
    setShowEventModal(true);
  };

  const openEditEvent = (item: TimelineItem) => {
    setEditingEventId(item.id);
    setEventForm({
      time: item.time,
      title: item.title,
      location: item.location || '',
      notes: item.notes || ''
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;

    if (editingEventId) {
      updateWedding(prev => {
        const list = isCivilTimeline ? prev.civilTimeline ?? [] : prev.timeline;
        const nextList = sortTimelineItems(
          list.map(item =>
            item.id === editingEventId
              ? {
                  ...item,
                  time: eventForm.time,
                  title: eventForm.title.trim(),
                  location: eventForm.location.trim(),
                  notes: eventForm.notes.trim()
                }
              : item
          )
        );
        return isCivilTimeline ? { ...prev, civilTimeline: nextList } : { ...prev, timeline: nextList };
      });
    } else {
      const nextItem: TimelineItem = {
        id: `tl_${Date.now()}`,
        time: eventForm.time,
        title: eventForm.title.trim(),
        location: eventForm.location.trim(),
        notes: eventForm.notes.trim()
      };
      updateWedding(prev => {
        const list = isCivilTimeline ? prev.civilTimeline ?? [] : prev.timeline;
        const nextList = sortTimelineItems([...list, nextItem]);
        return isCivilTimeline ? { ...prev, civilTimeline: nextList } : { ...prev, timeline: nextList };
      });
    }

    setShowEventModal(false);
    setEditingEventId(null);
  };

  const handleDeleteEvent = (id: string) => {
    updateWedding(prev =>
      isCivilTimeline
        ? { ...prev, civilTimeline: (prev.civilTimeline ?? []).filter(x => x.id !== id) }
        : { ...prev, timeline: prev.timeline.filter(x => x.id !== id) }
    );
    if (editingEventId === id) {
      setShowEventModal(false);
      setEditingEventId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#7D6F6B]">
            Logística del Evento
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-1">
            El Gran Día
          </h2>
        </div>

        {activeSubTab === 'itinerario' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() =>
                isCivilTimeline
                  ? exportTimelinePdf(profile, civilTimeline, {
                      eventLabel: 'Boda Civil',
                      eventDate: ceremonies.civilDate || profile.weddingDate,
                      eventVenue: ceremonies.civilVenue || profile.city
                    })
                  : exportTimelinePdf(profile, timeline)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>{isCivilTimeline ? 'PDF Civil' : 'PDF'}</span>
            </button>
            <button
              type="button"
              onClick={openAddEvent}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Momento</span>
            </button>
          </div>
        )}
      </div>

      {/* Clean Sub-Tabs: Ceremonias (solo bodas) · Minuto a Minuto · Artículos & Entregas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center p-1 bg-white rounded-full border border-[#EFE8E1] w-fit shadow-2xs gap-1">
          {!isNonWedding && (
            <button
              type="button"
              onClick={() => setSubTab('ceremonias')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer ${
                activeSubTab === 'ceremonias' ? 'bg-[#C48B81] text-white' : 'text-[#6E605C] hover:text-[#2B2826]'
              }`}
            >
              Ceremonias
            </button>
          )}
          <button
            type="button"
            onClick={() => setSubTab('itinerario')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer ${
              activeSubTab === 'itinerario' ? 'bg-[#C48B81] text-white' : 'text-[#6E605C] hover:text-[#2B2826]'
            }`}
          >
            Minuto a Minuto ({hasCivilTimeline ? timeline.length + civilTimeline.length : timeline.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('entregas')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer ${
              activeSubTab === 'entregas' ? 'bg-[#C48B81] text-white' : 'text-[#6E605C] hover:text-[#2B2826]'
            }`}
          >
            Artículos &amp; Entregas ({handoverItems.length})
          </button>
        </div>

        {/* Dual-day Switcher: Boda Principal vs Boda Civil */}
        {activeSubTab === 'itinerario' && hasCivilTimeline && (
          <div className="flex items-center p-1 bg-[#FAF8F5] rounded-full border border-[#EFE8E1] shadow-2xs gap-1">
            <button
              type="button"
              onClick={() => setTimelineEvent('principal')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                !isCivilTimeline
                  ? 'bg-[#2B2826] text-white shadow-2xs'
                  : 'text-[#6E605C] hover:text-[#2B2826]'
              }`}
            >
              <span>Boda Principal</span>
              {principalDateShort && (
                <span className={`text-[10px] ${!isCivilTimeline ? 'text-white/75' : 'text-[#8C7E79]'}`}>
                  · {principalDateShort}
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  !isCivilTimeline ? 'bg-white/20 text-white' : 'bg-white text-[#7D6F6B]'
                }`}
              >
                {timeline.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTimelineEvent('civil')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                isCivilTimeline
                  ? 'bg-[#2B2826] text-white shadow-2xs'
                  : 'text-[#6E605C] hover:text-[#2B2826]'
              }`}
            >
              <span>Boda Civil</span>
              {civilDateShort && (
                <span className={`text-[10px] ${isCivilTimeline ? 'text-white/75' : 'text-[#8C7E79]'}`}>
                  · {civilDateShort}
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isCivilTimeline ? 'bg-white/20 text-white' : 'bg-white text-[#7D6F6B]'
                }`}
              >
                {civilTimeline.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* SUB-TAB 2: CONTROL DE ARTÍCULOS & ENTREGAS (Recepción previa + Devolución al cierre) */}
      {activeSubTab === 'entregas' && (
        <HandoverSection
          profile={profile}
          items={handoverItems}
          onChange={nextItems =>
            updateWedding(prev => ({
              ...prev,
              handoverItems: nextItems
            }))
          }
        />
      )}

      {/* SUB-TAB 1: ITINERARIO EDITABLE */}
      {activeSubTab === 'itinerario' && (
        <div className="space-y-4">
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE8E1] shadow-2xs">
          {isCivilTimeline && (ceremonies.civilDate || ceremonies.civilVenue) && (
            <div className="mb-4 pb-3 border-b border-[#FAF8F5] flex flex-wrap items-center justify-between gap-2 text-xs text-[#7D6F6B]">
              <span className="font-medium text-[#2B2826]">
                Itinerario de Boda Civil
                {civilDateShort ? ` · ${civilDateShort}` : ''}
                {ceremonies.civilVenue ? ` · ${ceremonies.civilVenue}` : ''}
              </span>
              {ceremonies.civilTime && (
                <span className="text-[11px] text-[#A86B60] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#EFE8E1]">
                  Ceremonia: {ceremonies.civilTime}
                </span>
              )}
            </div>
          )}
          {activeTimeline.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="font-editorial text-xl text-[#2B2826]">
                {isCivilTimeline ? 'Arma el minuto a minuto de tu Boda Civil' : 'Arma tu minuto a minuto'}
              </p>
              <p className="text-xs text-[#7D6F6B] font-light max-w-sm mx-auto">
                {isCivilTimeline
                  ? 'Registra los horarios de tu ceremonia civil, llegada del juez, brindis y comida para compartirlo en PDF.'
                  : 'Registra cada momento del día para compartirlo en PDF con tu fotógrafo, DJ, banquete y familia.'}
              </p>
              <button
                type="button"
                onClick={openAddEvent}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C48B81] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar primer momento</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#FAF8F5]">
              {activeTimeline.map(item => (
                <div
                  key={item.id}
                  onClick={() => openEditEvent(item)}
                  className="py-4 px-2 rounded-2xl flex items-start justify-between gap-4 group hover:bg-[#FAF8F5]/70 transition cursor-pointer"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <span className="font-editorial text-lg text-[#C48B81] w-20 shrink-0 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                      {item.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#2B2826] group-hover:text-[#A86B60] transition-colors">
                        {item.title}
                      </p>
                      {item.location && (
                        <p className="text-xs text-[#7D6F6B] font-light flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#C48B81]" />
                          {item.location}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-[#A86B60] italic font-light mt-1">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEditEvent(item)}
                      className="p-2 rounded-full text-[#7D6F6B] hover:text-[#2B2826] hover:bg-white transition cursor-pointer"
                      title="Editar momento"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(item.id)}
                      className="p-2 rounded-full text-[#7D6F6B]/40 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Eliminar momento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {flags.isVirtualNovios && (
          <div className="bg-[#FAF8F5] rounded-2xl p-4 sm:p-5 border border-[#EEDAD6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F7EDEB] border border-[#EEDAD6] flex items-center justify-center text-[#C48B81] shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#2B2826]">
                  ¿Quién va a operar este minuto a minuto el día de tu boda?
                </p>
                <p className="text-[11px] text-[#7D6F6B] font-light mt-0.5">
                  Deja la coordinación de proveedores, montaje y tiempos en manos de Viva la Bride.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVlbModal(true)}
              className="px-4 py-2 rounded-full bg-white hover:bg-[#F7EDEB] text-[#A86B60] border border-[#EEDAD6] text-xs font-medium transition cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Cotizar Coordinación
            </button>
          </div>
        )}
        </div>
      )}

      {/* SUB-TAB 2: CEREMONIAS OPCIONALES (MÓDULOS COMPLETOS CIVIL & RELIGIOSA) */}
      {activeSubTab === 'ceremonias' && !isNonWedding && (
        <CeremoniesSection
          ceremonies={ceremonies}
          weddingDate={wedding.profile.weddingDate}
          guests={wedding.guests}
          onChange={updater =>
            updateWedding(prev => ({ ...prev, ceremonies: updater(prev.ceremonies) }))
          }
        />
      )}

      {/* Modal: Agregar / Editar Momento */}
      <Modal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEventId(null);
        }}
        title={`${editingEventId ? 'Editar Momento' : 'Agregar Momento'}${isCivilTimeline ? ' · Boda Civil' : ''}`}
        subtitle="Se ordenará automáticamente según el horario."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Hora *
              </label>
              <input
                type="time"
                required
                value={eventForm.time}
                onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
                Actividad *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Entrada de Novios y Primer Baile"
                value={eventForm.title}
                onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
              Lugar / Espacio
            </label>
            <input
              type="text"
              placeholder="Ej. Jardín Principal, Terraza, Capilla..."
              value={eventForm.location}
              onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7D6F6B] block mb-1">
              Notas / Responsable
            </label>
            <textarea
              rows={3}
              placeholder="Ej. Avisar a DJ 5 min antes, entra foto y video, entregar bengalas..."
              value={eventForm.notes}
              onChange={e => setEventForm({ ...eventForm, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {editingEventId ? (
              <button
                type="button"
                onClick={() => handleDeleteEvent(editingEventId)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEventId(null);
                }}
                className="px-4 py-2 text-xs text-[#7D6F6B] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <VlbCoordinationModal
        isOpen={showVlbModal}
        onClose={() => setShowVlbModal(false)}
        profile={profile}
      />
    </div>
  );
};
