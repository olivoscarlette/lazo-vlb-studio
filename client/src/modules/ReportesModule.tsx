import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, Users, DollarSign, CheckCircle2,
  Clock, Printer, Grid2x2Check, CheckSquare, Sparkles
} from 'lucide-react';

export const ReportesModule: React.FC = () => {
  const { currentWedding, token } = useAuth();
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentWedding, token]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !reports) {
    return <div className="py-20 text-center text-stone-400 text-xs">Generando reportes analíticos...</div>;
  }

  const { guests, tables, finance, tasks, wedding } = reports;

  return (
    <div className="space-y-8 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Analítica y Resumen Ejecutivo
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Reportes Consolidados
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Datos en tiempo real calculados directamente desde la base de datos de {wedding.name}.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir Reporte</span>
        </button>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block border-b-2 border-stone-900 pb-4 mb-6">
        <h1 className="font-serif text-3xl font-bold">LAZO — VLB Studio · Planning</h1>
        <h2 className="text-xl font-bold mt-1">Reporte Ejecutivo: {wedding.name}</h2>
        <div className="text-xs text-stone-600 mt-1">
          Fecha de Boda: {wedding.wedding_date} · Generado el: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* 1. Sección Invitados y Confirmaciones */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-lazo-700" />
            <h3 className="font-serif text-xl font-bold text-stone-900">1. Resumen de Invitados y RSVP</h3>
          </div>
          <span className="text-xs font-bold text-stone-500">{guests.total} invitados registrados</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Confirmados</div>
            <div className="text-2xl font-serif font-bold text-emerald-800 mt-0.5">{guests.confirmados}</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              {guests.lugares_confirmados} lugares con acompañantes
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Pendientes</div>
            <div className="text-2xl font-serif font-bold text-amber-800 mt-0.5">{guests.pendientes}</div>
            <div className="text-[11px] text-stone-500 mt-1">
              Por confirmar asistencia
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">No Asistirán</div>
            <div className="text-2xl font-serif font-bold text-rose-800 mt-0.5">{guests.no_asistiran}</div>
            <div className="text-[11px] text-stone-500 mt-1">
              Lugares liberados
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Total Acompañantes</div>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-0.5">{guests.acompanantes_totales}</div>
            <div className="text-[11px] text-stone-500 mt-1">
              {guests.lugares_potenciales} lugares potenciales
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sección Mesas y Capacidad */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2">
            <Grid2x2Check className="w-5 h-5 text-lazo-700" />
            <h3 className="font-serif text-xl font-bold text-stone-900">2. Ocupación y Capacidad de Mesas</h3>
          </div>
          <span className="text-xs font-bold text-stone-500">{tables.total_mesas} mesas configuradas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Capacidad Total del Salón</div>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-0.5">{tables.capacidad_total} lugares</div>
            <div className="text-[11px] text-stone-500 mt-1">Suma de aforo de todas las mesas</div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Lugares Asignados en Mesas</div>
            <div className="text-2xl font-serif font-bold text-emerald-800 mt-0.5">{tables.lugares_asignados} lugares</div>
            <div className="text-[11px] text-stone-500 mt-1">Invitados y acompañantes sentados</div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Lugares Disponibles en Mesas</div>
            <div className="text-2xl font-serif font-bold text-amber-900 mt-0.5">{tables.lugares_disponibles} lugares</div>
            <div className="text-[11px] text-stone-500 mt-1">Sillas vacías pendientes por asignar</div>
          </div>
        </div>
      </div>

      {/* 3. Sección Finanzas (COSTO REAL, MONTO PAGADO, RESTANTE) */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-lazo-700" />
            <h3 className="font-serif text-xl font-bold text-stone-900">3. Estado Financiero de Proveedores</h3>
          </div>
          <span className="text-xs font-bold text-stone-500">{finance.total_proveedores} contratos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">COSTO REAL</div>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
              ${finance.costo_real.toLocaleString()}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">Monto total contratado</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-800 uppercase">MONTO PAGADO</div>
            <div className="text-2xl font-serif font-bold text-emerald-900 mt-0.5">
              ${finance.monto_pagado.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              Liquidado y respaldado con comprobante
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <div className="text-[10px] font-bold text-amber-800 uppercase">SALDO RESTANTE</div>
            <div className="text-2xl font-serif font-bold text-amber-950 mt-0.5">
              ${finance.restante.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-800 font-semibold mt-1">
              Pendiente por liquidar antes del evento
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sección Checklist y Operación */}
      <div className="luxury-card rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-lazo-700" />
            <h3 className="font-serif text-xl font-bold text-stone-900">4. Estado de Tareas y Pendientes</h3>
          </div>
          <span className="text-xs font-bold text-stone-500">{tasks.avance_porcentaje}% avance</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Total Tareas</div>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-0.5">{tasks.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Completadas</div>
            <div className="text-2xl font-serif font-bold text-emerald-800 mt-0.5">{tasks.completadas}</div>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">En Proceso</div>
            <div className="text-2xl font-serif font-bold text-amber-800 mt-0.5">{tasks.en_proceso}</div>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Pendientes</div>
            <div className="text-2xl font-serif font-bold text-stone-700 mt-0.5">{tasks.pendientes}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
