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
    return <div className="py-20 text-center text-[#8A7E72] text-sm">Generando reportes analíticos...</div>;
  }

  const { guests, tables, finance, tasks, wedding } = reports;

  return (
    <div className="space-y-8 print:p-0 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[#8A7E72]">
            Analítica y Resumen Ejecutivo
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B2826] mt-0.5">
            Reportes Consolidados
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1 leading-relaxed">
            Métricas oficiales y balance operativo en tiempo real de {wedding.name}.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Reporte</span>
        </button>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block border-b-2 border-[#2B2826] pb-4 mb-6">
        <h1 className="font-serif text-3xl font-bold text-[#2B2826]">LAZO — VLB Studio · Planning</h1>
        <h2 className="text-xl font-bold mt-1 text-[#2B2826]">Reporte Ejecutivo: {wedding.name}</h2>
        <div className="text-xs text-[#5A524C] mt-1">
          Fecha de Boda: {wedding.wedding_date} · Generado el: {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* 1. Sección Invitados y Confirmaciones */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8E1] shadow-xs">
        <div className="flex items-center justify-between mb-5 border-b border-[#EFE8E1] pb-4">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-[#C48B81]" />
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2826]">
              1. Resumen de Invitados y RSVP
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF8F5] text-[#8A7E72] border border-[#EFE8E1]">
            {guests.total} invitados registrados
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#E4ECE5]/50 border border-[#BDD4C1]">
            <div className="text-[11px] font-bold text-[#2B5235] uppercase tracking-wider">Confirmados</div>
            <div className="text-3xl font-serif font-bold text-[#2B5235] mt-1">{guests.confirmados}</div>
            <div className="text-xs text-[#355F40] font-medium mt-1">
              {guests.lugares_confirmados} lugares con acompañantes
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF3E8]/50 border border-[#EFE3CF]">
            <div className="text-[11px] font-bold text-[#7C5824] uppercase tracking-wider">Pendientes</div>
            <div className="text-3xl font-serif font-bold text-[#7C5824] mt-1">{guests.pendientes}</div>
            <div className="text-xs text-[#7C5824] font-medium mt-1">
              Por confirmar asistencia
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#F7EDEB]/50 border border-[#F0D5D1]">
            <div className="text-[11px] font-bold text-[#C48B81] uppercase tracking-wider">No Asistirán</div>
            <div className="text-3xl font-serif font-bold text-[#C48B81] mt-1">{guests.no_asistiran}</div>
            <div className="text-xs text-[#C48B81] font-medium mt-1">
              Lugares liberados
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
            <div className="text-[11px] font-bold text-[#8A7E72] uppercase tracking-wider">Total Acompañantes</div>
            <div className="text-3xl font-serif font-bold text-[#2B2826] mt-1">{guests.acompanantes_totales}</div>
            <div className="text-xs text-[#8A7E72] mt-1">
              {guests.lugares_potenciales} lugares potenciales
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sección Mesas y Capacidad */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8E1] shadow-xs">
        <div className="flex items-center justify-between mb-5 border-b border-[#EFE8E1] pb-4">
          <div className="flex items-center space-x-2.5">
            <Grid2x2Check className="w-5 h-5 text-[#C48B81]" />
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2826]">
              2. Ocupación y Capacidad de Mesas
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF8F5] text-[#8A7E72] border border-[#EFE8E1]">
            {tables.total_mesas} mesas configuradas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
            <div className="text-[11px] font-bold text-[#8A7E72] uppercase tracking-wider">Capacidad Total del Salón</div>
            <div className="text-3xl font-serif font-bold text-[#2B2826] mt-1">{tables.capacidad_total} lugares</div>
            <div className="text-xs text-[#8A7E72] mt-1">Suma de aforo de todas las mesas</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#E4ECE5]/50 border border-[#BDD4C1]">
            <div className="text-[11px] font-bold text-[#2B5235] uppercase tracking-wider">Lugares Asignados en Mesas</div>
            <div className="text-3xl font-serif font-bold text-[#2B5235] mt-1">{tables.lugares_asignados} lugares</div>
            <div className="text-xs text-[#355F40] mt-1">Invitados y acompañantes sentados</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF3E8]/50 border border-[#EFE3CF]">
            <div className="text-[11px] font-bold text-[#7C5824] uppercase tracking-wider">Lugares Disponibles en Mesas</div>
            <div className="text-3xl font-serif font-bold text-[#7C5824] mt-1">{tables.lugares_disponibles} lugares</div>
            <div className="text-xs text-[#7C5824] mt-1">Sillas vacías pendientes por asignar</div>
          </div>
        </div>
      </div>

      {/* 3. Sección Finanzas (COSTO REAL, MONTO PAGADO, RESTANTE) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8E1] shadow-xs">
        <div className="flex items-center justify-between mb-5 border-b border-[#EFE8E1] pb-4">
          <div className="flex items-center space-x-2.5">
            <DollarSign className="w-5 h-5 text-[#C48B81]" />
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2826]">
              3. Estado Financiero de Proveedores
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF8F5] text-[#8A7E72] border border-[#EFE8E1]">
            {finance.total_proveedores} contratos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
            <div className="text-[11px] font-bold text-[#8A7E72] uppercase tracking-wider">COSTO REAL CONTRATADO</div>
            <div className="text-3xl font-serif font-bold text-[#2B2826] mt-1">
              ${finance.costo_real.toLocaleString()}
            </div>
            <div className="text-xs text-[#8A7E72] mt-1">Monto total de proveedores</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#E4ECE5]/50 border border-[#BDD4C1]">
            <div className="text-[11px] font-bold text-[#2B5235] uppercase tracking-wider">MONTO PAGADO</div>
            <div className="text-3xl font-serif font-bold text-[#2B5235] mt-1">
              ${finance.monto_pagado.toLocaleString()}
            </div>
            <div className="text-xs text-[#355F40] mt-1">
              Liquidado y respaldado con comprobante
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF3E8]/50 border border-[#EFE3CF]">
            <div className="text-[11px] font-bold text-[#7C5824] uppercase tracking-wider">SALDO RESTANTE</div>
            <div className="text-3xl font-serif font-bold text-[#7C5824] mt-1">
              ${finance.restante.toLocaleString()}
            </div>
            <div className="text-xs text-[#7C5824] mt-1">
              Pendiente por liquidar antes del evento
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sección Checklist y Operación */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8E1] shadow-xs">
        <div className="flex items-center justify-between mb-5 border-b border-[#EFE8E1] pb-4">
          <div className="flex items-center space-x-2.5">
            <CheckSquare className="w-5 h-5 text-[#C48B81]" />
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2826]">
              4. Estado del Checklist Nupcial
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF8F5] text-[#8A7E72] border border-[#EFE8E1]">
            {tasks.avance_porcentaje}% avance global
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
            <div className="text-[11px] font-bold text-[#8A7E72] uppercase tracking-wider">Total Tareas</div>
            <div className="text-3xl font-serif font-bold text-[#2B2826] mt-1">{tasks.total}</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#E4ECE5]/50 border border-[#BDD4C1]">
            <div className="text-[11px] font-bold text-[#2B5235] uppercase tracking-wider">Completadas</div>
            <div className="text-3xl font-serif font-bold text-[#2B5235] mt-1">{tasks.completadas}</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF3E8]/50 border border-[#EFE3CF]">
            <div className="text-[11px] font-bold text-[#7C5824] uppercase tracking-wider">En Proceso</div>
            <div className="text-3xl font-serif font-bold text-[#7C5824] mt-1">{tasks.en_proceso}</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
            <div className="text-[11px] font-bold text-[#8A7E72] uppercase tracking-wider">Pendientes</div>
            <div className="text-3xl font-serif font-bold text-[#5A524C] mt-1">{tasks.pendientes}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
