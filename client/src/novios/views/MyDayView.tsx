import React, { useState } from 'react';
import { Plus, Trash2, Clock, MapPin, Pencil, Download, Sparkles } from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { CeremoniesSection } from '../components/CeremoniesSection';
import { Modal } from '../components/Modal';
import { VlbCoordinationModal } from '../components/VlbCoordinationModal';
import { TimelineItem } from '../types/lazo';
import { exportTimelinePdf } from '../utils/pdfExport';

export const MyDayView: React.FC = () => {
  const { wedding, flags, updateWedding } = useWedding();
  const [subTab, setSubTab] = useState<'itinerario' | 'ceremonias'>('itinerario');
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

  const openAddEvent = () => {
    setEditingEventId(null);
    setEventForm({ time: '18:00', title: '', location: '', notes: '' });
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
      updateWedding(prev => ({
        ...prev,
        timeline: prev.timeline
          .map(item =>
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
          .sort((a, b) => a.time.localeCompare(b.time))
      }));
    } else {
      const nextItem: TimelineItem = {
        id: `tl_${Date.now()}`,
        time: eventForm.time,
        title: eventForm.title.trim(),
        location: eventForm.location.trim(),
        notes: eventForm.notes.trim()
      };
      updateWedding(prev => ({
        ...prev,
        timeline: [...prev.timeline, nextItem].sort((a, b) => a.time.localeCompare(b.time))
      }));
    }

    setShowEventModal(false);
    setEditingEventId(null);
  };

  const handleDeleteEvent = (id: string) => {
    updateWedding(prev => ({
      ...prev,
      timeline: prev.timeline.filter(x => x.id !== id)
    }));
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
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
            Logística del Evento
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-1">
            El Gran Día
          </h2>
        </div>

        {subTab === 'itinerario' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => exportTimelinePdf(profile, timeline)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>PDF</span>
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

      {/* 2 Clean Sub-Tabs: Itinerario + Ceremonias */}
      <div className="flex items-center p-1 bg-white rounded-full border border-[#EFE8E1] w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setSubTab('itinerario')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
            subTab === 'itinerario' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
          }`}
        >
          Itinerario ({timeline.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ceremonias')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
            subTab === 'ceremonias' ? 'bg-[#2B2826] text-white' : 'text-[#7D6F6B] hover:text-[#2B2826]'
          }`}
        >
          Ceremonias
        </button>
      </div>

      {/* SUB-TAB 1: ITINERARIO EDITABLE */}
      {subTab === 'itinerario' && (
        <div className="space-y-4">
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE8E1] shadow-2xs">
          {timeline.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="font-editorial text-xl text-[#2B2826]">Arma tu minuto a minuto</p>
              <p className="text-xs text-[#8A7E72] font-light max-w-sm mx-auto">
                Registra cada momento del día para compartirlo en PDF con tu fotógrafo, DJ, banquete y familia.
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
              {timeline.map(item => (
                <div
                  key={item.id}
                  onClick={() => openEditEvent(item)}
                  className="py-4 px-2 rounded-2xl flex items-start justify-between gap-4 group hover:bg-[#FAF8F5]/70 transition cursor-pointer"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <span className="font-editorial text-lg text-[#C48B81] w-16 shrink-0 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 opacity-60" />
                      {item.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#2B2826] group-hover:text-[#A86B60] transition-colors">
                        {item.title}
                      </p>
                      {item.location && (
                        <p className="text-xs text-[#8A7E72] font-light flex items-center gap-1 mt-0.5">
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
                      className="p-2 rounded-full text-[#8A7E72] hover:text-[#2B2826] hover:bg-white transition cursor-pointer"
                      title="Editar momento"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(item.id)}
                      className="p-2 rounded-full text-[#8A7E72]/40 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
      {subTab === 'ceremonias' && (
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
        title={editingEventId ? 'Editar Momento' : 'Agregar Momento'}
        subtitle="Se ordenará automáticamente según el horario."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
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
                className="px-4 py-2 text-xs text-[#8A7E72] cursor-pointer"
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
