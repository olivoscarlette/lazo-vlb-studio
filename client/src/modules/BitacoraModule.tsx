import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuditLog } from '../types';
import { History, Shield, User, Clock, AlertCircle } from 'lucide-react';

export const BitacoraModule: React.FC = () => {
  const { currentWedding, token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (action.includes('CREAR') || action.includes('AGREGAR')) return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    if (action.includes('ELIMINAR')) return 'bg-rose-100 text-rose-900 border-rose-200';
    if (action.includes('PAGO')) return 'bg-amber-100 text-amber-900 border-amber-200';
    return 'bg-stone-100 text-stone-800 border-stone-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
          Trazabilidad y Seguridad
        </span>
        <h2 className="font-serif text-3xl font-bold text-stone-900">
          Bitácora de Auditoría
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Registro cronológico inmutable de movimientos y cambios operativos en esta boda.
        </p>
      </div>

      <div className="luxury-card rounded-2xl overflow-hidden border border-stone-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">FECHA Y HORA</th>
                <th className="py-3 px-4">USUARIO RESPONSABLE</th>
                <th className="py-3 px-4">ACCIÓN</th>
                <th className="py-3 px-4">ENTIDAD</th>
                <th className="py-3 px-4">DETALLES DEL CAMBIO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-stone-400">Cargando bitácora...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-stone-400">No hay movimientos registrados aún.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-4 font-mono text-stone-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{log.user_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600 text-[11px]">{log.entity_type}</td>
                    <td className="py-3 px-4 text-stone-700 max-w-md">{log.details}</td>
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
