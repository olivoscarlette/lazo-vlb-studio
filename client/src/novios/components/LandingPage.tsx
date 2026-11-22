import React from 'react';
import {
  Sparkles, Check, ArrowRight, Heart, Wallet, Users, CalendarCheck2, Clock
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const scrollToPricing = () => {
    document.getElementById('planes-lazo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B2826]">
      {/* Minimalist Top Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EFE8E1]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <img
            src="/lazo-logo.png"
            alt="Lazo — Studio Planning"
            className="h-9 sm:h-10 w-auto object-contain select-none"
          />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={scrollToPricing}
              className="px-4 py-2 rounded-full text-xs font-medium text-[#7D6F6B] hover:text-[#2B2826] transition cursor-pointer"
            >
              Planes
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-full bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium transition cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-5 pt-14 pb-16 sm:pt-20 sm:pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EFE8E1] text-[11px] font-medium text-[#8A7E72] shadow-2xs mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#C48B81]" />
          <span>Diseñada por wedding planners · Hecha para tu celular</span>
        </div>

        <h1 className="font-editorial text-4xl sm:text-6xl text-[#2B2826] leading-[1.12] tracking-tight max-w-3xl mx-auto">
          Planea tu boda con paz mental, sin archivos de Excel eternos.
        </h1>

        <p className="text-sm sm:text-base text-[#7D6F6B] font-light max-w-xl mx-auto mt-5 leading-relaxed">
          Presupuesto, plan de ahorro, comparador de cotizaciones, invitados por WhatsApp, plano 2D de mesas, estilo y checklist con fechas reales — todo en una sola app para ti y tu pareja.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-sm font-medium shadow-sm transition cursor-pointer"
          >
            <span>Entrar a mi boda</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollToPricing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-[#F5F0EB] text-[#2B2826] border border-[#EFE8E1] text-sm font-medium transition cursor-pointer"
          >
            <span>Ver planes y precios</span>
          </button>
        </div>

        {/* Visual Preview Strip */}
        <div className="mt-14 rounded-3xl overflow-hidden border border-[#EFE8E1] shadow-md bg-white relative">
          <div className="relative h-64 sm:h-80 w-full">
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
              alt="Lazo Editorial Preview"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#181514]/75 via-[#181514]/30 to-transparent flex flex-col items-center justify-center text-white px-6">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/80 mb-2">TU ESPACIO PRIVADO</span>
              <div className="font-editorial text-4xl sm:text-6xl tracking-wide">SOFÍA & MATEO</div>
              <div className="mt-4 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs tracking-wider">
                ✨ FALTAN 240 DÍAS · TU BODA EN CALMA
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Pillars Section */}
      <section className="max-w-5xl mx-auto px-5 py-14 border-t border-[#EFE8E1]">
        <div className="text-center mb-10">
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
            Solo lo que realmente necesitas
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-2">
            5 secciones claras. Cero ruido.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Heart,
              num: '01',
              title: 'Mi Boda & Estilo',
              desc: 'Tu portada, cuenta regresiva, prioridades del mes, moodboard, paleta de colores y look de novios.'
            },
            {
              icon: Wallet,
              num: '02',
              title: 'Presupuesto & Proveedores',
              desc: 'Plan de ahorro familiar, comparador de 3 cotizaciones lado a lado, pagos y contratos en un mismo sitio.'
            },
            {
              icon: Users,
              num: '03',
              title: 'Invitados & Mesas',
              desc: 'Confirma asistencia en 1 clic por WhatsApp, registra alergias y acomoda mesas sin complicaciones.'
            },
            {
              icon: CalendarCheck2,
              num: '04',
              title: 'Checklist con Fechas Reales',
              desc: 'Calculado automáticamente según el día de tu boda. Sabrás qué toca este mes y quién lo hace.'
            },
            {
              icon: Clock,
              num: '05',
              title: 'El Gran Día',
              desc: 'Tu itinerario minuto a minuto y los detalles clave de ceremonia civil y religiosa si los necesitas.'
            }
          ].map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.num}
                className="bg-white rounded-2xl p-6 border border-[#EFE8E1] shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-editorial text-2xl text-[#C48B81]">{item.num}</span>
                    <div className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] flex items-center justify-center text-[#7D6F6B]">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-editorial text-xl text-[#2B2826]">{item.title}</h3>
                  <p className="text-xs text-[#7D6F6B] mt-2 leading-relaxed font-light">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Simple Direct-to-Consumer Pricing */}
      <section id="planes-lazo" className="max-w-4xl mx-auto px-5 py-16 border-t border-[#EFE8E1]">
        <div className="text-center mb-10">
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
            Un solo pago · Sin mensualidades
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#2B2826] mt-2">
            Elige tu acceso a Lazo
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Plan Esencial */}
          <div className="bg-white rounded-3xl p-7 border border-[#EFE8E1] shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8A7E72]">
                Plan Esencial
              </span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-editorial text-4xl text-[#2B2826]">$990</span>
                <span className="text-xs text-[#8A7E72]">MXN · pago único</span>
              </div>
              <p className="text-xs text-[#7D6F6B] mt-2 font-light">
                Acceso ilimitado para ti y tu pareja hasta el día de tu boda.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-[#5A524C]">
                {[
                  'Las 5 secciones completas (Celular + Web)',
                  'Sincronización en pareja en tiempo real',
                  'Comparador de cotizaciones y plan de ahorro',
                  'Invitados con confirmación 1-clic por WhatsApp',
                  'Checklist automático con fechas reales'
                ].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#577355] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={onOpenLogin}
              className="mt-7 w-full py-3 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1] text-xs font-medium transition cursor-pointer"
            >
              Entrar / Solicitar Plan Esencial
            </button>
          </div>

          {/* Plan Pro · RSVP Automatizado */}
          <div className="bg-[#2B2826] text-white rounded-3xl p-7 border border-[#2B2826] shadow-md flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C48B81]">
                  Lazo Pro · RSVP Automatizado
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#C48B81]/20 text-[#E5B7AE] border border-[#C48B81]/30 whitespace-nowrap">
                  Por tiempo limitado
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="font-editorial text-xl text-white/40 line-through">$2,290</span>
                <span className="font-editorial text-4xl text-white">$1,990</span>
                <span className="text-xs text-white/60">MXN · pago único</span>
              </div>
              <p className="text-xs text-white/70 mt-2 font-light">
                Todo lo del Plan Esencial + envío automatizado de invitaciones y confirmaciones actualizadas en tiempo real.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-white/85">
                {[
                  'Todo lo incluido en el Plan Esencial',
                  'Envío automatizado de invitaciones por WhatsApp',
                  'Confirmaciones actualizadas en tiempo real en tu lista',
                  'Recordatorios automáticos previos a la boda',
                  'Envío automático de número de mesa el día del evento'
                ].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#C48B81] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={onOpenLogin}
              className="mt-7 w-full py-3 rounded-full bg-[#C48B81] hover:bg-[#B3796F] text-white text-xs font-medium transition cursor-pointer"
            >
              Entrar / Solicitar Lazo Pro
            </button>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-[#EFE8E1] text-center text-xs text-[#8A7E72] font-light">
        <span className="font-editorial tracking-[0.2em] text-[#2B2826]">LAZO</span> · Tu boda, organizada con calma.
      </footer>
    </div>
  );
};
