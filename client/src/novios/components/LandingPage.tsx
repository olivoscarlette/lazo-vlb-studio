import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ArrowRight,
  Lock,
  MessageSquare,
  ChevronDown,
  ShieldCheck,
  Smartphone,
  FileDown,
  Map
} from 'lucide-react';
import { Modal } from './Modal';
import { VLB_QUOTES_PHONE } from './VlbCoordinationModal';

interface LandingPageProps {
  onOpenLogin: () => void;
}

const FAQS = [
  {
    q: '¿Es un pago único o se cobra cada mes?',
    a: 'Es un solo pago único por boda, sin mensualidades ni cargos ocultos. Tienes acceso ilimitado desde hoy hasta después de tu Gran Día.'
  },
  {
    q: '¿Funciona en celular y computadora?',
    a: 'Sí. Lazo está diseñado para usarse cómodamente desde tu celular (iPhone o Android) y también en computadora o iPad, todo sincronizado en tiempo real.'
  },
  {
    q: '¿Podemos entrar mi pareja y yo al mismo tiempo?',
    a: 'Sí, ambos pueden iniciar sesión con su cuenta desde sus celulares para revisar pagos, invitados, mesas y tareas sincronizadas.'
  },
  {
    q: '¿Si elijo el Plan Esencial ($990) puedo subir a Lazo Pro después?',
    a: '¡Claro! En cualquier momento puedes activar el Plano 2D y el envío automatizado de invitaciones pagando solo la diferencia.'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const [checkoutPlan, setCheckoutPlan] = useState<'esencial' | 'pro' | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mpNotConfigured, setMpNotConfigured] = useState(false);
  const [form, setForm] = useState({
    partner1: '',
    partner2: '',
    weddingDate: new Date(Date.now() + 300 * 86400000).toISOString().split('T')[0],
    email: '',
    phone: '+52 ',
    password: ''
  });

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openCheckout = (plan: 'esencial' | 'pro') => {
    setError('');
    setMpNotConfigured(false);
    setCheckoutPlan(plan);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    setError('');
    setMpNotConfigured(false);

    if (form.password.length < 6) {
      setError('Tu contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutPlan,
          partner1: form.partner1.trim(),
          partner2: form.partner2.trim(),
          weddingDate: form.weddingDate,
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'MP_NOT_CONFIGURED') {
          setMpNotConfigured(true);
        }
        setError(data.error || 'No se pudo iniciar el pago.');
        return;
      }
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappFallbackUrl = checkoutPlan
    ? `https://wa.me/${VLB_QUOTES_PHONE}?text=${encodeURIComponent(
        `¡Hola! Somos ${form.partner1 || 'Novia'} & ${form.partner2 || 'Novio'} (${form.email || 'sin correo'}), fecha de boda ${form.weddingDate}, y queremos adquirir ${
          checkoutPlan === 'pro' ? 'Lazo Pro ($1,990 MXN)' : 'Plan Esencial ($990 MXN)'
        }.`
      )}`
    : `https://wa.me/${VLB_QUOTES_PHONE}`;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B2826] overflow-x-hidden">
      {/* ==================== 1. GLASS EDITORIAL HEADER ==================== */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/85 backdrop-blur-xl border-b border-[#EFE8E1]/80">
        <div className="max-w-6xl mx-auto px-5 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          <img
            src="/lazo-logo.png"
            alt="Lazo — Studio Planning"
            className="h-9 sm:h-10 w-auto object-contain select-none"
          />

          <nav className="hidden md:flex items-center gap-7 text-xs text-[#7D6F6B]">
            <button
              type="button"
              onClick={() => scrollToSection('experiencia-lazo')}
              className="hover:text-[#2B2826] transition cursor-pointer"
            >
              Qué incluye
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('plano-2d')}
              className="hover:text-[#2B2826] transition cursor-pointer"
            >
              Plano 2D & RSVP
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('planes-lazo')}
              className="hover:text-[#2B2826] transition cursor-pointer"
            >
              Planes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq-lazo')}
              className="hover:text-[#2B2826] transition cursor-pointer"
            >
              Preguntas
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-5 py-2 rounded-full bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* ==================== 2. ASYMMETRIC MAGAZINE HERO ==================== */}
      <section className="relative max-w-6xl mx-auto px-5 pt-12 pb-16 sm:pt-16 sm:pb-24">
        {/* Soft editorial blush glow */}
        <div className="absolute -top-10 right-0 w-[420px] h-[420px] rounded-full bg-[#EFE2DF]/60 blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Editorial Copy */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EFE8E1] text-[11px] font-medium text-[#8A7E72] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Creado por wedding planners en México</span>
            </div>

            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[56px] text-[#2B2826] leading-[1.08] tracking-tight">
              Tu boda, diseñada con{' '}
              <span className="italic text-[#A86B60]">calma y claridad</span>.
            </h1>

            <p className="text-sm sm:text-base text-[#7D6F6B] font-light leading-relaxed max-w-lg mx-auto lg:mx-0">
              Deja atrás los archivos de Excel infinitos y las notas perdidas en WhatsApp. Organiza presupuesto, proveedores, invitados, plano 2D de mesas, checklist con fechas reales e itinerario en un espacio tan bonito como tu boda.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 pt-1">
              <button
                type="button"
                onClick={() => scrollToSection('planes-lazo')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-sm font-medium shadow-sm transition cursor-pointer"
              >
                <span>Ver planes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle Trust Micro-Strip */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[11px] text-[#8A7E72]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#577355]" /> Pago único · Sin mensualidades
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#C48B81]" /> Celular + Computadora
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileDown className="w-3.5 h-3.5 text-[#C48B81]" /> Exportación a PDF
              </span>
            </div>
          </div>

          {/* Right Editorial Visual Collage */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[2rem] overflow-hidden border border-[#EFE8E1] shadow-xl bg-white aspect-[4/5] max-h-[540px] w-full">
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85"
                alt="Lazo Editorial"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1614]/80 via-[#1A1614]/20 to-transparent" />

              {/* Floating Top Glass Countdown Pill */}
              <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] uppercase tracking-[0.2em] font-semibold text-[#2B2826] shadow-sm">
                  Tu espacio privado
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#2B2826]/75 backdrop-blur-md text-white text-[10px] tracking-wider border border-white/15">
                  ✨ Faltan 184 días
                </span>
              </div>

              {/* Bottom Editorial Overlay Card */}
              <div className="absolute bottom-5 left-5 right-5 space-y-3">
                <div className="text-white">
                  <div className="font-editorial text-3xl sm:text-4xl tracking-wide">
                    SOFÍA <span className="italic text-[#E5B7AE]">&</span> MATEO
                  </div>
                  <p className="text-[11px] text-white/80 tracking-widest uppercase mt-1">
                    18 Noviembre · Monterrey
                  </p>
                </div>

                {/* Mini Live Metrics Glass Strip */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/92 backdrop-blur-md p-3 border border-white/40">
                    <span className="text-[9px] uppercase tracking-wider text-[#8A7E72] block">Asistencia</span>
                    <span className="font-editorial text-lg text-[#2B2826]">142 / 180</span>
                  </div>
                  <div className="rounded-2xl bg-white/92 backdrop-blur-md p-3 border border-white/40">
                    <span className="text-[9px] uppercase tracking-wider text-[#8A7E72] block">Avance</span>
                    <span className="font-editorial text-lg text-[#577355]">68% listo</span>
                  </div>
                  <div className="rounded-2xl bg-white/92 backdrop-blur-md p-3 border border-white/40">
                    <span className="text-[9px] uppercase tracking-wider text-[#8A7E72] block">Mesas 2D</span>
                    <span className="font-editorial text-lg text-[#A86B60]">18 mesas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 3. EDITORIAL MANIFESTO STRIP ==================== */}
      <section className="border-y border-[#EFE8E1] bg-white">
        <div className="max-w-5xl mx-auto px-5 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <span className="font-editorial text-3xl text-[#C48B81]">117</span>
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#2B2826] mt-1">
              Pasos reales de planeación
            </p>
            <p className="text-xs text-[#7D6F6B] font-light mt-1.5 leading-relaxed">
              Checklist maestro calculado automáticamente según la fecha exacta de tu boda.
            </p>
          </div>
          <div>
            <span className="font-editorial text-3xl text-[#C48B81]">0</span>
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#2B2826] mt-1">
              Anuncios ni ruido visual
            </p>
            <p className="text-xs text-[#7D6F6B] font-light mt-1.5 leading-relaxed">
              Un espacio privado, sereno y editorial — sin publicidad invasiva ni directorios que te distraigan.
            </p>
          </div>
          <div>
            <span className="font-editorial text-3xl text-[#C48B81]">1 clic</span>
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#2B2826] mt-1">
              PDFs listos para tu salón
            </p>
            <p className="text-xs text-[#7D6F6B] font-light mt-1.5 leading-relaxed">
              Descarga tu lista de invitados con alergias, tu plano 2D de mesas y tu itinerario del Gran Día.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== 4. VISUAL FEATURE SHOWCASE (5 PILLARS) ==================== */}
      <section id="experiencia-lazo" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 space-y-12">
        <div className="max-w-2xl">
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
            Todo en un solo lugar
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl text-[#2B2826] mt-2 leading-tight">
            Diseñado para disfrutar el proceso, no sufrirlo.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              num: '01',
              title: 'Mi Boda & Moodboard',
              desc: 'Tu portada personalizada, cuenta regresiva, prioridades del mes, paleta de colores editable, tablero de inspiración y look de novios.',
              pill: 'Visión & Estilo'
            },
            {
              num: '02',
              title: 'Presupuesto & Proveedores',
              desc: 'Meta de ahorro con aportaciones familiares, comparador de 3 cotizaciones lado a lado, historial de cada abono y vista previa de contratos.',
              pill: 'Finanzas Claras'
            },
            {
              num: '03',
              title: 'Invitados & Confirmaciones',
              desc: 'Control exacto de pases, alergias y restricciones. Confirmación 1-clic por WhatsApp o envío automatizado en tiempo real en Lazo Pro.',
              pill: 'Asistencia'
            },
            {
              num: '04',
              title: 'Checklist por Etapas',
              desc: 'Resalta automáticamente tu etapa actual según los meses que faltan para tu boda para que sepas qué toca hoy sin abrumarte.',
              pill: 'Fechas Reales'
            },
            {
              num: '05',
              title: 'El Gran Día & Ceremonias',
              desc: 'Itinerario minuto a minuto editable con descarga en PDF, además de módulos completos opcionales para Ceremonia Civil y Religiosa.',
              pill: 'Logística'
            },
            {
              num: '06',
              title: 'Plano 2D Interactivo',
              desc: 'Acomoda mesas redondas, imperiales y serpentina en S; agrega pista, DJ, alberca o espejos, gíralos, cambia su tamaño y descarga en PDF.',
              pill: 'Exclusivo Lazo Pro'
            }
          ].map(card => (
            <div
              key={card.num}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8E1] shadow-2xs hover:border-[#C48B81]/50 transition flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-editorial text-2xl text-[#C48B81]">{card.num}</span>
                  <span className="text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#EFE8E1] text-[#7D6F6B]">
                    {card.pill}
                  </span>
                </div>
                <h3 className="font-editorial text-2xl text-[#2B2826] leading-snug">{card.title}</h3>
                <p className="text-xs sm:text-[13px] text-[#7D6F6B] font-light leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 5. SPOTLIGHT: PLANO 2D + RSVP AUTOMATIZADO ==================== */}
      <section id="plano-2d" className="max-w-6xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="bg-[#2B2826] text-white rounded-[2.25rem] p-7 sm:p-12 overflow-hidden relative">
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#C48B81]/20 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-6 space-y-5">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold text-[#E5B7AE]">
                <Map className="w-3.5 h-3.5" />
                <span>Estrella de Lazo Pro</span>
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl leading-tight">
                Diseña tu salón en 2D y automatiza tus confirmaciones por WhatsApp.
              </h2>
              <p className="text-xs sm:text-sm text-white/75 font-light leading-relaxed">
                Olvídate de perseguir a 200 invitados por mensaje ni dibujar mesas en papel. Con Lazo Pro ves cada silla ocupada en tu plano 2D interactivo y recibes tus confirmaciones actualizadas en tiempo real.
              </p>
              <ul className="space-y-2.5 text-xs text-white/90 pt-1">
                {[
                  'Mesas redondas, rectangulares, imperiales y serpentina en S',
                  'Agrega pista, DJ, barra, árboles, alberca, espejos o stands y ajústalos a escala',
                  'Envío automatizado de invitaciones y recordatorios por WhatsApp',
                  'Envío automático de número de mesa el día de tu boda'
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C48B81] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openCheckout('pro')}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#C48B81] hover:bg-[#B3796F] text-white text-xs font-medium transition cursor-pointer"
                >
                  <span>Quiero Lazo Pro · $1,990 MXN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stylized Editorial Mini 2D Floor Plan Visual */}
            <div className="lg:col-span-6">
              <div
                className="rounded-3xl bg-[#FCFBF9] text-[#2B2826] p-6 border border-white/10 shadow-2xl relative"
                style={{
                  backgroundImage: 'radial-gradient(#DDD4CB 1px, transparent 1px)',
                  backgroundSize: '18px 18px'
                }}
              >
                <div className="flex items-center justify-between text-[10px] text-[#8A7E72] pb-4">
                  <span className="uppercase tracking-widest font-semibold">Plano 2D · Vista Previa</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#577355]" /> Ocupado</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-[#D8CFC8]" /> Libre</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center py-3">
                  {/* Round Table */}
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-[#C48B81] shadow-sm flex flex-col items-center justify-center">
                      <span className="text-[10px] font-medium">Mesa 1</span>
                      <span className="text-[9px] text-[#577355] font-semibold">8/10</span>
                    </div>
                  </div>
                  {/* Dancefloor */}
                  <div className="h-24 rounded-2xl bg-[#F5EFEA]/90 border border-dashed border-[#D2C2B6] flex items-center justify-center text-center px-2">
                    <span className="text-[9px] uppercase tracking-[0.16em] font-semibold text-[#7D6F6B]">
                      Pista de Baile
                    </span>
                  </div>
                  {/* Round Table 2 */}
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-white border border-[#E5DDD5] shadow-sm flex flex-col items-center justify-center">
                      <span className="text-[10px] font-medium">Mesa 2</span>
                      <span className="text-[9px] text-[#8A7E72] font-semibold">10/10</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-[#EFE8E1]">
                  <div className="px-4 py-2 rounded-xl bg-[#2B2826] text-white text-[9px] uppercase tracking-[0.16em] font-semibold">
                    DJ / Escenario
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-[#EBF4F8] border border-[#C5DCE8] text-[#355A6E] text-[9px] uppercase tracking-[0.14em] font-semibold">
                    Alberca
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-[#E5EDE6] border border-[#BDD4C1] text-[#354B38] text-[9px] uppercase tracking-[0.14em] font-semibold">
                    Jardín
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 6. PRICING SECTION ==================== */}
      <section id="planes-lazo" className="max-w-4xl mx-auto px-5 py-16 sm:py-20 border-t border-[#EFE8E1]">
        <div className="text-center mb-12">
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C48B81]">
            Un solo pago · Sin mensualidades
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl text-[#2B2826] mt-2">
            Elige tu acceso a Lazo
          </h2>
          <p className="text-xs sm:text-sm text-[#7D6F6B] font-light mt-2 max-w-md mx-auto">
            Acceso inmediato en cuanto se confirma tu pago con MercadoPago.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Esencial */}
          <div className="bg-white rounded-[2rem] p-8 border border-[#EFE8E1] shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
                Plan Esencial
              </span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-editorial text-5xl text-[#2B2826]">$990</span>
                <span className="text-xs text-[#8A7E72]">MXN · pago único</span>
              </div>
              <p className="text-xs text-[#7D6F6B] mt-2.5 font-light leading-relaxed">
                Acceso ilimitado para ti y tu pareja hasta el día de tu boda.
              </p>

              <ul className="mt-7 space-y-3 text-xs text-[#5A524C]">
                {[
                  'Las 5 secciones completas (Celular + Web)',
                  'Comparador de cotizaciones, pagos y contratos',
                  'Checklist maestro con fechas reales y ceremonias',
                  'Lista de invitados y asignación de mesas (vista lista)',
                  'Confirmación manual 1-clic por WhatsApp y PDFs'
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#577355] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => openCheckout('esencial')}
              className="mt-8 w-full py-3.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1] text-xs font-semibold tracking-wide transition cursor-pointer"
            >
              Adquirir Plan Esencial · $990
            </button>
          </div>

          {/* Plan Pro · RSVP Automatizado + Plano 2D */}
          <div className="bg-[#2B2826] text-white rounded-[2rem] p-8 border border-[#2B2826] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#C48B81]/20 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#E5B7AE]">
                  Lazo Pro · Plano 2D + RSVP
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#C48B81]/25 text-[#F2CFC8] border border-[#C48B81]/40 whitespace-nowrap">
                  Por tiempo limitado
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
                <span className="font-editorial text-2xl text-white/40 line-through">$2,290</span>
                <span className="font-editorial text-5xl text-white">$1,990</span>
                <span className="text-xs text-white/60">MXN · pago único</span>
              </div>
              <p className="text-xs text-white/75 mt-2.5 font-light leading-relaxed">
                Todo lo del Plan Esencial + Plano 2D interactivo de mesas y envío automatizado de invitaciones en tiempo real.
              </p>

              <ul className="mt-7 space-y-3 text-xs text-white/90">
                {[
                  'Todo lo incluido en el Plan Esencial',
                  'Plano 2D interactivo del salón (mesas, serpentina, elementos y PDF)',
                  'Envío automatizado de invitaciones por WhatsApp',
                  'Confirmaciones actualizadas en tiempo real en tu lista',
                  'Recordatorios automáticos y envío de mesa el día del evento'
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#C48B81] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => openCheckout('pro')}
              className="relative z-10 mt-8 w-full py-3.5 rounded-full bg-[#C48B81] hover:bg-[#B3796F] text-white text-xs font-semibold tracking-wide shadow-md transition cursor-pointer"
            >
              Adquirir Lazo Pro · $1,990
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 7. FAQ ACCORDION ==================== */}
      <section id="faq-lazo" className="max-w-3xl mx-auto px-5 py-16 border-t border-[#EFE8E1]">
        <div className="text-center mb-10">
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
            Dudas frecuentes
          </span>
          <h2 className="font-editorial text-3xl text-[#2B2826] mt-2">
            Todo claro antes de empezar
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.q}
                className="bg-white rounded-2xl border border-[#EFE8E1] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-sm font-medium text-[#2B2826]">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#C48B81] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[#7D6F6B] font-light leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 8. EDITORIAL FOOTER ==================== */}
      <footer className="py-10 border-t border-[#EFE8E1] bg-white">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8A7E72] font-light">
          <div className="flex items-center gap-3">
            <img src="/lazo-logo.png" alt="Lazo" className="h-7 w-auto object-contain" />
            <span>· Planeación de bodas con calma.</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={`https://wa.me/${VLB_QUOTES_PHONE}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#2B2826] transition"
            >
              WhatsApp de soporte
            </a>
            <button
              type="button"
              onClick={onOpenLogin}
              className="hover:text-[#2B2826] transition cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </footer>

      {/* ==================== CHECKOUT MODAL (MERCADOPAGO) ==================== */}
      <Modal
        isOpen={Boolean(checkoutPlan)}
        onClose={() => setCheckoutPlan(null)}
        title={checkoutPlan === 'pro' ? 'Lazo Pro · $1,990 MXN' : 'Plan Esencial · $990 MXN'}
        subtitle="Crea tu cuenta y paga de forma segura con MercadoPago. Entrarás directo a tu boda al confirmar."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-2">
              <p>{error}</p>
              {mpNotConfigured && (
                <a
                  href={whatsappFallbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#2B2826] text-white text-[11px] font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Solicitar acceso por WhatsApp</span>
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                Novia / Pareja 1 *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Sofía"
                value={form.partner1}
                onChange={e => setForm({ ...form, partner1: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                Novio / Pareja 2 *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Mateo"
                value={form.partner2}
                onChange={e => setForm({ ...form, partner2: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                Fecha de la boda *
              </label>
              <input
                type="date"
                required
                value={form.weddingDate}
                onChange={e => setForm({ ...form, weddingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
                WhatsApp
              </label>
              <input
                type="tel"
                placeholder="+52 ..."
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
              Correo electrónico (para iniciar sesión) *
            </label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A7E72] block mb-1">
              Crea tu contraseña (mín. 6 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:border-[#C48B81]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold uppercase tracking-wider shadow-2xs transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {submitting
                ? 'Conectando con MercadoPago...'
                : `Pagar $${checkoutPlan === 'pro' ? '1,990' : '990'} MXN con MercadoPago`}
            </span>
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setCheckoutPlan(null);
                onOpenLogin();
              }}
              className="text-[11px] text-[#8A7E72] hover:text-[#2B2826] underline cursor-pointer"
            >
              ¿Ya tienes cuenta? Inicia sesión aquí
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
