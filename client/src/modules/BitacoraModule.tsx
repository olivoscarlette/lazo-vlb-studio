import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuditLog } from '../types';
import { History, Shield, User, Clock, AlertCircle, Search, Filter } from 'lucide-react';

export const BitacoraModule: React.FC = () => {
  const { currentWedding, token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'CREAR' | 'PAGO' | 'ELIMINAR'>('ALL');

  const fetchAudit = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/audit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [currentWedding, token]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREAR') || action.includes('AGREGAR')) return 'bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1]';
    if (action.includes('ELIMINAR')) return 'bg-[#FDF6F5] text-[#9C665C] border border-[#F0D5D1]';
    if (action.includes('PAGO')) return 'bg-[#FAF3E8] text-[#7C5824] border border-[#EFE3CF]';
    return 'bg-[#FAF8F5] text-[#5A524C] border border-[#EAE3DA]';
  };

  const filteredLogs = logs.filter(log => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      log.user_name?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.entity_type?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q);

    let matchesAction = true;
    if (actionFilter === 'CREAR') matchesAction = log.action.includes('CREAR') || log.action.includes('AGREGAR');
    if (actionFilter === 'PAGO') matchesAction = log.action.includes('PAGO');
    if (actionFilter === 'ELIMINAR') matchesAction = log.action.includes('ELIMINAR');

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[#8A7E72]">
            Trazabilidad y Seguridad
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B2826] mt-0.5">
            Bitácora de Movimientos
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1 leading-relaxed">
            Registro cronológico inmutable de cambios operativos, pagos y modificaciones en esta boda.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#8A7E72] bg-[#FAF8F5] px-3.5 py-1.5 rounded-full border border-[#EAE3DA]">
          <Shield className="w-3.5 h-3.5 text-[#9C665C]" />
          <span>Auditoría Certificada VLB</span>
        </div>
      </div>

      {/* Search & Action Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActionFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              actionFilter === 'ALL'
                ? 'bg-[#9C665C] text-white shadow-xs'
                : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
            }`}
          >
            Todos ({logs.length})
          </button>
          <button
            onClick={() => setActionFilter('CREAR')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              actionFilter === 'CREAR'
                ? 'bg-[#9C665C] text-white shadow-xs'
                : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
            }`}
          >
            Creaciones
          </button>
          <button
            onClick={() => setActionFilter('PAGO')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              actionFilter === 'PAGO'
                ? 'bg-[#9C665C] text-white shadow-xs'
                : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
            }`}
          >
            Pagos
          </button>
          <button
            onClick={() => setActionFilter('ELIMINAR')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              actionFilter === 'ELIMINAR'
                ? 'bg-[#9C665C] text-white shadow-xs'
                : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
            }`}
          >
            Eliminaciones
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7E72]" />
          <input
            type="text"
            placeholder="Buscar en bitácora..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#EAE3DA] rounded-xl text-[#2B2826] placeholder-[#8A7E72]/60 focus:outline-none focus:ring-1 focus:ring-[#9C665C]"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl overflow-hidden border border-[#EAE3DA] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE3DA] text-[11px] font-bold uppercase tracking-wider text-[#8A7E72]">
                <th className="py-3.5 px-5">FECHA Y HORA</th>
                <th className="py-3.5 px-4">USUARIO RESPONSABLE</th>
                <th className="py-3.5 px-4">ACCIÓN</th>
                <th className="py-3.5 px-4">ENTIDAD</th>
                <th className="py-3.5 px-5">DETALLES DEL CAMBIO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3DA]">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-[#8A7E72]">Cargando bitácora...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-[#8A7E72]">No hay movimientos registrados que coincidan con la búsqueda.</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#FAF8F5]/70 transition">
                    <td className="py-3.5 px-5 font-mono text-[#8A7E72] text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#2B2826]">
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-[#9C665C] shrink-0" />
                        <span>{log.user_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#5A524C] text-xs">{log.entity_type}</td>
                    <td className="py-3.5 px-5 text-[#5A524C] text-xs max-w-md leading-relaxed">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
