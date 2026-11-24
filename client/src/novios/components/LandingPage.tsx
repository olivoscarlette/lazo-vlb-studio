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
  const [couponInput, setCouponInput] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    description?: string;
    discount_type: string;
    discount_value: number;
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
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
    setCouponInput('');
    setCouponError('');
    setAppliedCoupon(null);
    setCheckoutPlan(plan);
  };

  const handleApplyCoupon = async () => {
    if (!checkoutPlan || !couponInput.trim()) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), planId: checkoutPlan })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAppliedCoupon(null);
        setCouponError(data.error || 'Código inválido.');
        return;
      }
      setAppliedCoupon({
        code: data.coupon.code,
        description: data.coupon.description,
        discount_type: data.coupon.discount_type,
        discount_value: data.coupon.discount_value,
        baseAmount: data.baseAmount,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount
      });
    } catch {
      setCouponError('No se pudo validar el código.');
    } finally {
      setCouponChecking(false);
    }
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
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          weddingDate: form.weddingDate,
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          couponCode: appliedCoupon?.code || undefined
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
      if (data.freeActivation && data.token) {
        localStorage.setItem('lazo_token', data.token);
        window.location.href = '/';
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
        `¡Hola! Soy ${`${form.firstName} ${form.lastName}`.trim() || 'nueva clienta'} (${form.email || 'sin correo'}), fecha del evento ${form.weddingDate}, y quiero adquirir ${
          checkoutPlan === 'pro' ? 'Lazo Pro ($1,990 MXN)' : 'Plan Esencial ($990 MXN)'
        }.`
      )}`
    : `https://wa.me/${VLB_QUOTES_PHONE}`;

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#1F1D1E] overflow-x-hidden">
      {/* ==================== 1. EDITORIAL HEADER ==================== */}
      <header className="sticky top-0 z-40 bg-[#F8F5F0] pt-[env(safe-area-inset-top)] border-b border-[#E7E1D8]">
        <div className="max-w-6xl mx-auto px-5 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          <img
            src="/lazo-logo.png"
            alt="Lazo — Studio Planning"
            className="h-9 sm:h-10 w-auto object-contain select-none"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-5 py-2 rounded-full bg-[#1F1D1E] hover:bg-[#181514] text-white text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* ==================== 2. HAUTE COUTURE ARCHITECTURAL HERO ==================== */}
      <section className="relative max-w-6xl mx-auto px-5 pt-12 pb-16 sm:pt-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Editorial Copy */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <span className="inline-block text-[11px] uppercase tracking-[0.22em] font-semibold text-[#6E2E3A]">
              Estudio Digital de Eventos · Plano 2D · RSVP
            </span>

            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[56px] text-[#1F1D1E] leading-[1.08] tracking-tight">
              Diseña tu salón, tus invitados{' '}
              <span className="text-[#6E2E3A]">y cada instante.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#6B6462] font-light leading-relaxed max-w-lg mx-auto lg:mx-0">
              El estudio privado para planear bodas, despedidas y celebraciones inolvidables con plano 2D interactivo, confirmaciones por WhatsApp y logística en vivo.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 pt-1">
              <button
                type="button"
                onClick={() => scrollToSection('planes-lazo')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#5A232E] hover:bg-[#481B24] text-white text-sm font-medium shadow-sm transition cursor-pointer"
              >
                <span>Conocer planes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Signature Differentiator Pills */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[11px] text-[#1F1D1E]">
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E7E1D8]">
                Plano 2D interactivo
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E7E1D8]">
                RSVP por WhatsApp
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E7E1D8]">
                Hasta 3 eventos incluidos
              </span>
            </div>
          </div>

          {/* Right Architectural 2D Floor Plan Showcase Card */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[2rem] bg-white border border-[#E7E1D8] shadow-xl p-5 sm:p-6">
              <div className="rounded-2xl border-2 border-[#1F1D1E] bg-[#F8F5F0] p-4 relative overflow-hidden">
                <svg viewBox="0 0 460 320" className="w-full h-auto">
                  {/* Architectural Walls & Doors */}
                  <rect x="4" y="4" width="452" height="312" fill="#F8F5F0" stroke="#1F1D1E" strokeWidth="2.5" />
                  {/* Dance Floor */}
                  <rect x="295" y="100" width="95" height="125" fill="#FFFFFF" stroke="#6B6462" strokeWidth="1" />
                  <text x="342" y="166" textAnchor="middle" fontSize="10" fill="#1F1D1E" letterSpacing="2">PISTA</text>
                  {/* DJ Booth */}
                  <rect x="404" y="112" width="38" height="100" fill="#FFFFFF" stroke="#6B6462" strokeWidth="1" />
                  <text x="423" y="166" textAnchor="middle" fontSize="9" fill="#1F1D1E" letterSpacing="1.5">DJ</text>
                  {/* Mesa Imperial */}
                  <rect x="85" y="146" width="170" height="30" rx="2" fill="#FFFFFF" stroke="#1F1D1E" strokeWidth="1.2" />
                  <text x="170" y="164" textAnchor="middle" fontSize="9" fill="#1F1D1E" letterSpacing="1.4">MESA IMPERIAL</text>
                  {/* Round Tables */}
                  {[
                    { cx: 70, cy: 58, n: 1 },
                    { cx: 148, cy: 92, n: 2 },
                    { cx: 225, cy: 58, n: 3 },
                    { cx: 312, cy: 52, n: 11 },
                    { cx: 398, cy: 54, n: 12, active: true },
                    { cx: 70, cy: 262, n: 5 },
                    { cx: 150, cy: 230, n: 8 },
                    { cx: 225, cy: 230, n: 7 },
                    { cx: 312, cy: 268, n: 6 },
                    { cx: 398, cy: 268, n: 9 }
                  ].map(t => (
                    <g key={t.n}>
                      <circle
                        cx={t.cx}
                        cy={t.cy}
                        r={t.active ? 28 : 24}
                        fill={t.active ? '#6E2E3A' : '#FFFFFF'}
                        fillOpacity={t.active ? 0.16 : 1}
                        stroke={t.active ? '#5A232E' : '#1F1D1E'}
                        strokeWidth={t.active ? 2 : 1.1}
                      />
                      <circle
                        cx={t.cx}
                        cy={t.cy}
                        r={t.active ? 19 : 16}
                        fill={t.active ? '#5A232E' : '#F8F5F0'}
                        stroke={t.active ? '#5A232E' : '#6B6462'}
                        strokeWidth="0.9"
                      />
                      <text
                        x={t.cx}
                        y={t.cy + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight={t.active ? '600' : '400'}
                        fill={t.active ? '#FFFFFF' : '#1F1D1E'}
                      >
                        {t.n}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Floating WhatsApp Mesa Confirmada Pill */}
              <div className="mt-4 flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E7E1D8] shadow-md text-xs text-[#1F1D1E]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#5A232E]" />
                  <span className="font-medium">Mesa 12 confirmada ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 3. ARCHITECTURAL STUDIO STRIP ==================== */}
      <section className="border-y border-[#E7E1D8] bg-white">
        <div className="max-w-5xl mx-auto px-5 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <span className="font-editorial text-3xl text-[#6E2E3A]">Plano 2D</span>
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#1F1D1E] mt-1">
              Arquitectura real de tu salón
            </p>
            <p className="text-xs text-[#6B6462] font-light mt-1.5 leading-relaxed">
              Diseña mesas redondas, imperiales y serpentinas, pista, DJ y barras a escala y descarga el plano listo para montaje.
            </p>
          </div>
          <div>
            <span className="font-editorial text-3xl text-[#6E2E3A]">Hasta 3</span>
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#1F1D1E] mt-1">
              Eventos en una misma cuenta
            </p>
            <p className="text-xs text-[#6B6462] font-light mt-1.5 leading-relaxed">
              Organiza tu despedida, civil, boda o cualquier celebración social desde un solo estudio privado.
            </p>
          </div>
          <div>
            <span className="font-editorial text-3xl text-[#6E2E3A]">1 clic</span>
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#1F1D1E] mt-1">
              PDFs listos para tu montaje
            </p>
            <p className="text-xs text-[#6B6462] font-light mt-1.5 leading-relaxed">
              Exporta tu plano 2D de mesas, lista de invitados con alergias e itinerario minuto a minuto para proveedores y salón.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== 4. VISUAL FEATURE SHOWCASE (6 PILLARS) ==================== */}
      <section id="experiencia-lazo" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 space-y-12">
        <div className="max-w-2xl">
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#6E2E3A]">
            Estudio Integral de Eventos
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl text-[#1F1D1E] mt-2 leading-tight">
            Arquitectura, invitados y logística en un solo lugar.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              num: '01',
              title: 'Plano 2D Interactivo',
              desc: 'Acomoda mesas redondas, imperiales y serpentina en S; agrega pista, DJ, barras o alberca, gíralos, ajusta medidas y descarga en PDF.',
              pill: 'Exclusivo Lazo Pro'
            },
            {
              num: '02',
              title: 'Invitados & WhatsApp RSVP',
              desc: 'Control exacto de pases, alergias y asignación de mesa. Confirmación 1-clic o envío automatizado con entrega de número de mesa el día del evento.',
              pill: 'Asistencia'
            },
            {
              num: '03',
              title: 'Dirección Visual & Moodboard',
              desc: 'Tablero de inspiración, paleta cromática editable y notas de estilo y decoración para alinear a todos tus proveedores.',
              pill: 'Diseño'
            },
            {
              num: '04',
              title: 'Finanzas & Contratos',
              desc: 'Control de inversión, proveedores contratados, historial de abonos, próximos vencimientos y carpeta centralizada de contratos.',
              pill: 'Administración'
            },
            {
              num: '05',
              title: 'Operación del Evento',
              desc: 'Itinerario minuto a minuto editable con exportación a PDF y módulos opcionales de Ceremonia Civil y Religiosa cuando es boda.',
              pill: 'Logística'
            },
            {
              num: '06',
              title: 'Ruta de Planeación',
              desc: 'Organización por etapas con seguimiento claro del avance para coordinar cada entrega antes de tu evento.',
              pill: 'Seguimiento'
            }
          ].map(card => (
            <div
              key={card.num}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E1D8] shadow-2xs hover:border-[#6E2E3A]/50 transition flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-editorial text-2xl text-[#6E2E3A]">{card.num}</span>
                  <span className="text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full bg-[#F8F5F0] border border-[#E7E1D8] text-[#6B6462]">
                    {card.pill}
                  </span>
                </div>
                <h3 className="font-editorial text-2xl text-[#1F1D1E] leading-snug">{card.title}</h3>
                <p className="text-xs sm:text-[13px] text-[#6B6462] font-light leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 5. SPOTLIGHT: PLANO 2D + RSVP AUTOMATIZADO ==================== */}
      <section id="plano-2d" className="max-w-6xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="bg-[#1F1D1E] text-white rounded-[2.25rem] p-7 sm:p-12 overflow-hidden relative">
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#6E2E3A]/20 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-6 space-y-5">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold text-[#D9B6BC]">
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
                    <Check className="w-4 h-4 text-[#6E2E3A] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openCheckout('pro')}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#6E2E3A] hover:bg-[#5A232E] text-white text-xs font-medium transition cursor-pointer"
                >
                  <span>Quiero Lazo Pro · $1,990 MXN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stylized Editorial Mini 2D Floor Plan Visual */}
            <div className="lg:col-span-6">
              <div
                className="rounded-3xl bg-[#FCFBF9] text-[#1F1D1E] p-6 border border-white/10 shadow-2xl relative"
                style={{
                  backgroundImage: 'radial-gradient(#DDD4CB 1px, transparent 1px)',
                  backgroundSize: '18px 18px'
                }}
              >
                <div className="flex items-center justify-between text-[10px] text-[#6B6462] pb-4">
                  <span className="uppercase tracking-widest font-semibold">Plano 2D · Vista Previa</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#577355]" /> Ocupado</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-[#D8CFC8]" /> Libre</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center py-3">
                  {/* Round Table */}
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-[#6E2E3A] shadow-sm flex flex-col items-center justify-center">
                      <span className="text-[10px] font-medium">Mesa 1</span>
                      <span className="text-[9px] text-[#577355] font-semibold">8/10</span>
                    </div>
                  </div>
                  {/* Dancefloor */}
                  <div className="h-24 rounded-2xl bg-[#F5EFEA]/90 border border-dashed border-[#D2C2B6] flex items-center justify-center text-center px-2">
                    <span className="text-[9px] uppercase tracking-[0.16em] font-semibold text-[#6B6462]">
                      Pista de Baile
                    </span>
                  </div>
                  {/* Round Table 2 */}
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-white border border-[#E5DDD5] shadow-sm flex flex-col items-center justify-center">
                      <span className="text-[10px] font-medium">Mesa 2</span>
                      <span className="text-[9px] text-[#6B6462] font-semibold">10/10</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-[#E7E1D8]">
                  <div className="px-4 py-2 rounded-xl bg-[#1F1D1E] text-white text-[9px] uppercase tracking-[0.16em] font-semibold">
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
      <section id="planes-lazo" className="max-w-4xl mx-auto px-5 py-16 sm:py-20 border-t border-[#E7E1D8]">
        <div className="text-center mb-12">
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#6E2E3A]">
            Un solo pago · Sin mensualidades
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl text-[#1F1D1E] mt-2">
            Elige tu acceso a Lazo
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6462] font-light mt-2 max-w-md mx-auto">
            Acceso inmediato en cuanto se confirma tu pago con MercadoPago.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Esencial */}
          <div className="bg-white rounded-[2rem] p-8 border border-[#E7E1D8] shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#6B6462]">
                Plan Esencial
              </span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-editorial text-5xl text-[#1F1D1E]">$990</span>
                <span className="text-xs text-[#6B6462]">MXN · pago único</span>
              </div>
              <p className="text-xs text-[#6B6462] mt-2.5 font-light leading-relaxed">
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
              className="mt-8 w-full py-3.5 rounded-full bg-[#F8F5F0] hover:bg-[#E7E1D8] text-[#1F1D1E] border border-[#E7E1D8] text-xs font-semibold tracking-wide transition cursor-pointer"
            >
              Adquirir Plan Esencial · $990
            </button>
          </div>

          {/* Plan Pro · RSVP Automatizado + Plano 2D */}
          <div className="bg-[#1F1D1E] text-white rounded-[2rem] p-8 border border-[#1F1D1E] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#6E2E3A]/20 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D9B6BC]">
                  Lazo Pro · Plano 2D + RSVP
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#6E2E3A]/25 text-[#F2CFC8] border border-[#6E2E3A]/40 whitespace-nowrap">
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
                    <Check className="w-4 h-4 text-[#6E2E3A] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => openCheckout('pro')}
              className="relative z-10 mt-8 w-full py-3.5 rounded-full bg-[#6E2E3A] hover:bg-[#5A232E] text-white text-xs font-semibold tracking-wide shadow-md transition cursor-pointer"
            >
              Adquirir Lazo Pro · $1,990
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 7. FAQ ACCORDION ==================== */}
      <section id="faq-lazo" className="max-w-3xl mx-auto px-5 py-16 border-t border-[#E7E1D8]">
        <div className="text-center mb-10">
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#6B6462]">
            Dudas frecuentes
          </span>
          <h2 className="font-editorial text-3xl text-[#1F1D1E] mt-2">
            Todo claro antes de empezar
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.q}
                className="bg-white rounded-2xl border border-[#E7E1D8] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-sm font-medium text-[#1F1D1E]">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#6E2E3A] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[#6B6462] font-light leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 8. EDITORIAL FOOTER ==================== */}
      <footer className="py-10 border-t border-[#E7E1D8] bg-white">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B6462] font-light">
          <div className="flex items-center gap-3">
            <img src="/lazo-logo.png" alt="Lazo" className="h-7 w-auto object-contain" />
            <span>· Planeación de bodas con calma.</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={`https://wa.me/${VLB_QUOTES_PHONE}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#1F1D1E] transition"
            >
              WhatsApp de soporte
            </a>
            <button
              type="button"
              onClick={onOpenLogin}
              className="hover:text-[#1F1D1E] transition cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1F1D1E] text-white text-[11px] font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Solicitar acceso por WhatsApp</span>
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Sofía"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Garza"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                Fecha del evento *
              </label>
              <input
                type="date"
                required
                value={form.weddingDate}
                onChange={e => setForm({ ...form, weddingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
                WhatsApp
              </label>
              <input
                type="tel"
                placeholder="+52 ..."
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
              Correo electrónico (para iniciar sesión) *
            </label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block mb-1">
              Crea tu contraseña (mín. 6 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-sm focus:border-[#6E2E3A]"
            />
          </div>

          {/* Código de descuento opcional */}
          <div className="pt-1 space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6462] block">
              ¿Tienes un código de descuento? (Opcional)
            </label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#E5EDE6] border border-[#CCDACC] text-[#354B38] text-xs">
                <div>
                  <span className="font-bold tracking-wider">{appliedCoupon.code}</span>
                  <span className="ml-2 text-[11px]">
                    −${appliedCoupon.discountAmount.toLocaleString('es-MX')} MXN
                    {appliedCoupon.discount_type === 'PERCENT' ? ` (${appliedCoupon.discount_value}% off)` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput('');
                    setCouponError('');
                  }}
                  className="text-[11px] font-semibold underline cursor-pointer"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ingresa tu código"
                  value={couponInput}
                  onChange={e => {
                    setCouponInput(e.target.value.toUpperCase());
                    if (couponError) setCouponError('');
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#F8F5F0] border border-[#E7E1D8] text-xs uppercase tracking-wider focus:border-[#6E2E3A]"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponChecking || !couponInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#1F1D1E] hover:bg-[#1E1B19] text-white text-xs font-medium transition cursor-pointer disabled:opacity-40"
                >
                  {couponChecking ? 'Validando...' : 'Aplicar'}
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-[11px] text-[#9A4A3E]">{couponError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-full bg-[#6E2E3A] hover:bg-[#521F29] text-white text-xs font-semibold uppercase tracking-wider shadow-2xs transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {submitting
                ? 'Procesando...'
                : appliedCoupon
                ? appliedCoupon.finalAmount <= 0
                  ? 'Activar acceso de cortesía gratis'
                  : `Pagar $${appliedCoupon.finalAmount.toLocaleString('es-MX')} MXN con MercadoPago`
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
              className="text-[11px] text-[#6B6462] hover:text-[#1F1D1E] underline cursor-pointer"
            >
              ¿Ya tienes cuenta? Inicia sesión aquí
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
