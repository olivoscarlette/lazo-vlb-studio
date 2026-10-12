import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Users, DollarSign, CheckCircle2,
  Clock, Sparkles, Edit3
} from 'lucide-react';

interface ResumenProps {
  onNavigateTab: (tab: any) => void;
}

export const ResumenModule: React.FC<ResumenProps> = ({ onNavigateTab }) => {
  const { currentWedding, setCurrentWedding, token, user } = useAuth();
  const [weddingData, setWeddingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditWeddingModal, setShowEditWeddingModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [packagesList, setPackagesList] = useState<{ name: string; maxMeetings: number; description: string }[]>([]);

  const fetchWeddingDetails = async () => {
    if (!currentWedding) return;
    try {
      const [res, catRes] = await Promise.all([
        fetch(`/api/weddings/${currentWedding.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/catalogs', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (res.ok) {
        const data = await res.json();
        setWeddingData(data.wedding);
        setEditForm(data.wedding);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData.catalogs?.meeting_packages)) {
          setPackagesList(catData.catalogs.meeting_packages);
        }
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
  }, [currentWedding, token]);

  const handleSaveWeddingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setShowEditWeddingModal(false);
        fetchWeddingDetails();
        setCurrentWedding({ ...currentWedding!, ...editForm });
      }
    } catch {}
  };

  if (loading || !weddingData) {
    return <div className="py-20 text-center text-[#786C68] text-sm">Cargando información de la boda...</div>;
  }

  const stats = weddingData.stats || {};
  const guestStats = stats.guests || {};
  const finance = stats.finance || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Editorial Hero Header — Rosa Quemado Suave & Crema */}
      <div className="bg-[#9E6B66] rounded-3xl p-8 text-[#FFFFFF] relative overflow-hidden shadow-md border border-[#8E5B56]">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#B88782]/35 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-[#F7EEEC] text-xs font-semibold tracking-widest uppercase mb-1.5">
              <Sparkles className="w-4 h-4" />
              <span>VLB Studio · Proyecto de Boda</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#FFFFFF]">
              {weddingData.name}
            </h1>
            <p className="text-[#FAF5F3] text-sm mt-2.5 flex items-center space-x-3">
              <span>{weddingData.partner_1_name} & {weddingData.partner_2_name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EFE2DF]" />
              <span className="text-[#EFE2DF] font-medium">{weddingData.wedding_date}</span>
            </p>
          </div>

          {(user?.role === 'ADMINISTRADOR' || user?.role === 'COORDINADOR') && (
            <button
              onClick={() => setShowEditWeddingModal(true)}
              className="inline-flex items-center space-x-2 bg-[#FFFFFF]/20 hover:bg-[#FFFFFF]/30 text-[#FFFFFF] px-4 py-2.5 rounded-2xl text-xs font-semibold border border-[#FFFFFF]/30 transition shadow-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Datos de Boda</span>
            </button>
          )}
        </div>

        {/* Venues Pill row */}
        <div className="mt-6 pt-6 border-t border-[#B5837E]/60 flex flex-wrap gap-3 text-xs text-[#FFFFFF]">
          {weddingData.ceremony_venue && (
            <div className="flex items-center space-x-2 bg-[#885853]/60 px-4 py-2 rounded-full border border-[#B5837E]/50">
              <MapPin className="w-4 h-4 text-[#EFE2DF]" />
              <span><strong>Ceremonia:</strong> {weddingData.ceremony_venue} ({weddingData.ceremony_time || 'Por definir'})</span>
            </div>
          )}
          {weddingData.reception_venue && (
            <div className="flex items-center space-x-2 bg-[#885853]/60 px-4 py-2 rounded-full border border-[#B5837E]/50">
              <MapPin className="w-4 h-4 text-[#EFE2DF]" />
              <span><strong>Recepción:</strong> {weddingData.reception_venue} ({weddingData.reception_time || 'Por definir'})</span>
            </div>
          )}
          {weddingData.civil_ceremony && (weddingData.civil_ceremony.date || weddingData.civil_ceremony.location) && (() => {
            const civDate = weddingData.civil_ceremony.date;
            const isSeparateCivilDay = Boolean(civDate && weddingData.wedding_date && civDate !== weddingData.wedding_date);
            return (
              <div
                onClick={() => onNavigateTab('civil')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full border cursor-pointer transition ${
                  isSeparateCivilDay
                    ? 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA] shadow-xs font-semibold'
                    : 'bg-[#885853]/60 text-[#FFFFFF] border-[#B5837E]/50'
                }`}
                title="Ir a Ceremonia Civil"
              >
                <span>⚖️</span>
                <span>
                  <strong>Ceremonia Civil:</strong>{' '}
                  {isSeparateCivilDay ? `Otro día (${civDate})` : 'Mismo día de la boda'}
                  {weddingData.civil_ceremony.location ? ` · ${weddingData.civil_ceremony.location}` : ''}
                  {weddingData.civil_ceremony.time ? ` (${weddingData.civil_ceremony.time} hrs)` : ''}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Guests Card */}
        <div
          onClick={() => onNavigateTab('invitados')}
          className="luxury-card rounded-2xl p-6 cursor-pointer hover:border-[#A6736E] group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#786C68] uppercase tracking-wider mb-2">
            <span>Confirmaciones</span>
            <Users className="w-4 h-4 text-[#A6736E] group-hover:text-[#885853] transition" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#332C2A]">
            {guestStats.confirmed_total_seats || 0}
            <span className="text-xs text-[#786C68] font-sans font-normal ml-1.5">
              / {guestStats.total_seats_potential || 0} invitados
            </span>
          </div>
          <div className="text-[11px] text-[#885853] bg-[#EFE2DF] px-2.5 py-1 rounded-lg inline-block font-medium mt-2.5">
            Asistentes con +1 ({guestStats.confirmed_count || 0} registros)
          </div>
        </div>

        {/* Financial KPI: COSTO REAL */}
        <div
          onClick={() => onNavigateTab('proveedores')}
          className="luxury-card rounded-2xl p-6 cursor-pointer hover:border-[#A6736E] group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#786C68] uppercase tracking-wider mb-2">
            <span>Costo Real Proveedores</span>
            <DollarSign className="w-4 h-4 text-[#A6736E] group-hover:text-[#885853] transition" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#332C2A]">
            ${(finance.costo_real || 0).toLocaleString()}
          </div>
          <div className="text-xs text-[#786C68] mt-2">
            Suma de contratos vigentes
          </div>
        </div>

        {/* Financial KPI: MONTO PAGADO */}
        <div
          onClick={() => onNavigateTab('proveedores')}
          className="luxury-card rounded-2xl p-6 cursor-pointer hover:border-[#A6736E] group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#786C68] uppercase tracking-wider mb-2">
            <span>Monto Pagado</span>
            <CheckCircle2 className="w-4 h-4 text-[#A6736E] group-hover:text-[#885853] transition" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#885853]">
            ${(finance.monto_pagado || 0).toLocaleString()}
          </div>
          <div className="text-xs text-[#786C68] mt-2">
            Pagos asentados en bitácora
          </div>
        </div>

        {/* Financial KPI: RESTANTE */}
        <div
          onClick={() => onNavigateTab('proveedores')}
          className="luxury-card rounded-2xl p-6 cursor-pointer hover:border-[#A6736E] group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#786C68] uppercase tracking-wider mb-2">
            <span>Saldo Restante</span>
            <Clock className="w-4 h-4 text-[#9E896E] group-hover:text-[#6D5A43] transition" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#6D5A43]">
            ${(finance.restante || 0).toLocaleString()}
          </div>
          <div className="text-xs text-[#786C68] font-medium mt-2">
            Pendiente por liquidar
          </div>
        </div>
      </div>

      {/* Modal: Editar Boda */}
      {showEditWeddingModal && (
        <div className="fixed inset-0 bg-[#332C2A]/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#DDD2C4] max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-2xl font-bold text-[#332C2A] mb-4">Editar Datos Operativos</h3>
            <form onSubmit={handleSaveWeddingEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#332C2A] mb-1">Nombre de la Boda</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Novia / Contrayente 1</label>
                  <input
                    type="text"
                    required
                    value={editForm.partner_1_name || ''}
                    onChange={e => setEditForm({ ...editForm, partner_1_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Novio / Contrayente 2</label>
                  <input
                    type="text"
                    required
                    value={editForm.partner_2_name || ''}
                    onChange={e => setEditForm({ ...editForm, partner_2_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={editForm.wedding_date || ''}
                    onChange={e => setEditForm({ ...editForm, wedding_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Invitados Estimados</label>
                  <input
                    type="number"
                    value={editForm.estimated_guests || ''}
                    onChange={e => setEditForm({ ...editForm, estimated_guests: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Lugar Ceremonia</label>
                  <input
                    type="text"
                    value={editForm.ceremony_venue || ''}
                    onChange={e => setEditForm({ ...editForm, ceremony_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Lugar Recepción</label>
                  <input
                    type="text"
                    value={editForm.reception_venue || ''}
                    onChange={e => setEditForm({ ...editForm, reception_venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Paquete Contratado</label>
                  <select
                    value={editForm.package_type || 'Integral'}
                    onChange={e => setEditForm({ ...editForm, package_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  >
                    {packagesList.length > 0 ? (
                      packagesList.map(pkg => (
                        <option key={pkg.name} value={pkg.name}>
                          {pkg.name} ({pkg.maxMeetings >= 999 ? 'Ilimitadas' : `${pkg.maxMeetings} reuniones`})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Esencial">Esencial</option>
                        <option value="Integral">Integral</option>
                        <option value="Luxury Exclusivo">Luxury Exclusivo</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#332C2A] mb-1">Estatus del Evento</label>
                  <select
                    value={editForm.status || 'PLANNING'}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#DDD2C4] rounded-xl text-sm"
                  >
                    <option value="PLANNING">PLANNING (En planeación)</option>
                    <option value="UPCOMING">UPCOMING (Próxima)</option>
                    <option value="COMPLETED">COMPLETED (Realizada)</option>
                    <option value="ARCHIVED">ARCHIVED (Archivada)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EFE8DE]">
                <button
                  type="button"
                  onClick={() => setShowEditWeddingModal(false)}
                  className="px-4 py-2.5 text-xs text-[#786C68] hover:bg-[#EFE8DE] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#A6736E] text-[#FFFFFF] rounded-xl hover:bg-[#885853]"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
