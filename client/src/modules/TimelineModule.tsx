import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TimelineEvent } from '../types';
import {
  Clock, Plus, MapPin, User, CheckCircle2,
  AlertCircle, Printer, Trash2, Edit3, Filter
} from 'lucide-react';

export const TimelineModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [formData, setFormData] = useState({
    time: '12:00',
    activity: '',
    location: '',
    responsible: '',
    notes: '',
    status: 'PENDIENTE' as TimelineEvent['status'],
    order_index: 0
  });

  const fetchTimeline = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/timeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [currentWedding, token]);

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setFormData({
      time: '12:00',
      activity: '',
      location: '',
      responsible: '',
      notes: '',
      status: 'PENDIENTE',
      order_index: timeline.length + 1
    });
    setShowEventModal(true);
  };

  const handleOpenEdit = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      time: event.time,
      activity: event.activity,
      location: event.location || '',
      responsible: event.responsible || '',
      notes: event.notes || '',
      status: event.status,
      order_index: event.order_index
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time || !formData.activity) return;

    try {
      const url = editingEvent
        ? `/api/weddings/${currentWedding!.id}/timeline/${editingEvent.id}`
        : `/api/weddings/${currentWedding!.id}/timeline`;
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowEventModal(false);
        await fetchTimeline();
      }
    } catch {}
  };

  const handleToggleStatus = async (event: TimelineEvent) => {
    const nextStatus: Record<TimelineEvent['status'], TimelineEvent['status']> = {
      'PENDIENTE': 'EN_CURSO',
      'EN_CURSO': 'COMPLETADO',
      'COMPLETADO': 'PENDIENTE'
    };
    const newStatus = nextStatus[event.status];

    try {
      await fetch(`/api/weddings/${currentWedding!.id}/timeline/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchTimeline();
    } catch {}
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta actividad del timeline?')) return;
    try {
      await fetch(`/api/weddings/${currentWedding!.id}/timeline/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchTimeline();
    } catch {}
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Minuto a Minuto del Día B
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Timeline Operativo
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Cronograma detallado del evento para coordinación en campo, staff y proveedores.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Minuta</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Actividad</span>
          </button>
        </div>
      </div>

      {/* Timeline Stream Cards */}
      {loading ? (
        <div className="py-12 text-center text-stone-400 text-xs">Cargando timeline...</div>
      ) : timeline.length === 0 ? (
        <div className="luxury-card rounded-2xl p-8 text-center text-stone-400 text-xs border border-dashed border-stone-300">
          No hay actividades programadas en el timeline. Haz clic en "Agregar Actividad".
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
          {timeline.map(item => {
            return (
              <div
                key={item.id}
                className="relative luxury-card rounded-2xl p-5 border border-stone-200 hover:border-stone-400 transition"
              >
                {/* Status Dot on the vertical line */}
                <div
                  onClick={() => handleToggleStatus(item)}
                  title="Haz clic para avanzar estatus"
                  className={`absolute -left-7 sm:-left-8 top-6 w-3 h-3 rounded-full cursor-pointer ring-4 ring-white transition ${
                    item.status === 'COMPLETADO'
                      ? 'bg-emerald-600'
                      : item.status === 'EN_CURSO'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-stone-400'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg">
                      {item.time}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      {item.activity}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border transition ${
                        item.status === 'COMPLETADO'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : item.status === 'EN_CURSO'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="text-stone-400 hover:text-stone-700 p-1"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(item.id)}
                      className="text-stone-300 hover:text-rose-600 p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-2">
                  {item.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{item.location}</span>
                    </div>
                  )}
                  {item.responsible && (
                    <div className="flex items-center space-x-1 font-medium">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>Resp: {item.responsible}</span>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-stone-500 mt-2 bg-stone-50 p-2 rounded-xl italic">
                    {item.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Agregar / Editar Evento */}
      {showEventModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">
              {editingEvent ? 'Editar Actividad' : 'Nueva Actividad en Timeline'}
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Hora *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Actividad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Entrada de Novios al Salón"
                    value={formData.activity}
                    onChange={e => setFormData({ ...formData, activity: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Ubicación</label>
                  <input
                    type="text"
                    placeholder="Salón Principal"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Responsable</label>
                  <input
                    type="text"
                    placeholder="Mariana / DJ"
                    value={formData.responsible}
                    onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Estatus</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_CURSO">EN CURSO</option>
                  <option value="COMPLETADO">COMPLETADO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Notas Operativas</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones para el staff, música especial, etc."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
