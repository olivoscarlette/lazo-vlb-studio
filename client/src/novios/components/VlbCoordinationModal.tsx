import React from 'react';
import { Sparkles, Check, MessageSquare } from 'lucide-react';
import { Modal } from './Modal';
import { WeddingProfile } from '../types/lazo';
import { formatShortDate } from '../data/seedWedding';

export const VLB_QUOTES_PHONE = '56661406247';

interface VlbCoordinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: WeddingProfile;
}

const VLB_PACKAGES = [
  {
    id: 'esencial',
    name: 'Plan Esencial',
    tag: 'Coordinación del Día',
    dark: false,
    previo: [
      'Layout del evento',
      'Logística y minuto a minuto',
      '2 Citas de planeación',
      'Confirmación de proveedores'
    ],
    granDia: [
      'Supervisión de montaje',
      'Coordinación ceremonia religiosa y proveedores',
      'Resguardo de artículos de valor',
      '1 coordinadora · 6 horas de servicio',
      'Cortesía: 1 hostess para recibir a tus invitados'
    ]
  },
  {
    id: 'integral',
    name: 'Plan Integral',
    tag: 'Más elegido',
    dark: false,
    previo: [
      'Moodboard con la visión de tu boda',
      'Presupuesto, control de gastos y layout',
      'Logística, minuto a minuto y 4 Citas',
      'Confirmación de invitados, testigos y padrinos'
    ],
    granDia: [
      'Supervisión de montaje y proveedores',
      'Coordinación ceremonia religiosa y civil',
      'Resguardo de artículos de valor',
      '1 Coordinadora + 1 hostess',
      '10 horas de servicio ó hasta ramo y liga'
    ]
  },
  {
    id: 'exclusivo',
    name: 'Plan Exclusivo',
    tag: 'Acompañamiento Total',
    dark: true,
    previo: [
      'Moodboard y Citas ilimitadas',
      'Presupuesto, control de gastos y layout',
      'Asesoría en trámites (civil, religioso o simbólico)',
      'Logística, minuto a minuto y confirmaciones'
    ],
    granDia: [
      'Acompañamiento en getting ready',
      'Supervisión de montaje y proveedores',
      'Coordinación ceremonia religiosa y civil',
      '2 hostess + resguardo de artículos de valor',
      'Servicio hasta el final del evento o 1:00 am'
    ]
  },
  {
    id: 'despedida',
    name: 'Despedida',
    tag: 'Evento Pre-Boda',
    dark: false,
    previo: [
      'Moodboard con la visión de tu evento',
      'Invitación digital interactiva (PDF) y confirmaciones',
      '1 cita de planeación y 1 de últimos detalles'
    ],
    granDia: [
      'Logística, montaje y coordinación de proveedores',
      '1 coordinadora + 1 hostess (1 hr previa + 3 hrs evento)',
      'Papelería personalizada (hasta 50 personas) y descuento en catálogo'
    ]
  }
];

export function buildVlbWhatsAppUrl(profile: WeddingProfile, topic: string): string {
  const couple = `${profile.partner1 || 'Novia'} & ${profile.partner2 || 'Novio'}`;
  const dateStr = profile.weddingDate ? formatShortDate(profile.weddingDate) : 'por definir';
  const details = [
    `¡Hola equipo de Viva la Bride!`,
    `Somos ${couple}, estamos planeando nuestra boda en Lazo para el ${dateStr} (${profile.estimatedGuests || 120} invitados aprox.${profile.city ? `, ${profile.city}` : ''}).`,
    `Nos encantaría cotizar: ${topic}.`
  ].join(' ');
  return `https://wa.me/${VLB_QUOTES_PHONE}?text=${encodeURIComponent(details)}`;
}

export const VlbCoordinationModal: React.FC<VlbCoordinationModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Coordinación Viva la Bride"
      subtitle="Disfruta tu Gran Día sin preocuparte por la logística. Todo lo que ya organizaste en Lazo se integra directo con nuestro equipo."
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VLB_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`rounded-3xl p-5 border flex flex-col justify-between space-y-4 ${
                pkg.dark
                  ? 'bg-[#2B2826] text-white border-[#2B2826]'
                  : 'bg-[#FAF8F5] text-[#2B2826] border-[#EFE8E1]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`font-editorial text-2xl ${pkg.dark ? 'text-white' : 'text-[#2B2826]'}`}>
                    {pkg.name}
                  </h4>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                      pkg.dark
                        ? 'bg-[#C48B81]/20 text-[#E5B7AE] border-[#C48B81]/30'
                        : 'bg-white text-[#A86B60] border-[#EFE8E1]'
                    }`}
                  >
                    {pkg.tag}
                  </span>
                </div>

                <div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.16em] font-semibold block mb-1.5 ${
                      pkg.dark ? 'text-[#C48B81]' : 'text-[#8A7E72]'
                    }`}
                  >
                    Previo a tu Gran Día
                  </span>
                  <ul className={`space-y-1 text-xs ${pkg.dark ? 'text-white/85' : 'text-[#5A524C]'}`}>
                    {pkg.previo.map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#C48B81] mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.16em] font-semibold block mb-1.5 ${
                      pkg.dark ? 'text-[#C48B81]' : 'text-[#8A7E72]'
                    }`}
                  >
                    El Gran Día
                  </span>
                  <ul className={`space-y-1 text-xs ${pkg.dark ? 'text-white/85' : 'text-[#5A524C]'}`}>
                    {pkg.granDia.map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#577355] mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <a
                href={buildVlbWhatsAppUrl(profile, pkg.name)}
                target="_blank"
                rel="noreferrer"
                className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-medium transition ${
                  pkg.dark
                    ? 'bg-[#C48B81] hover:bg-[#B3796F] text-white'
                    : 'bg-white hover:bg-[#EFE8E1] text-[#2B2826] border border-[#EFE8E1]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Cotizar {pkg.name}</span>
              </a>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#8A7E72] pt-1 font-light">
          <Sparkles className="w-3.5 h-3.5 text-[#C48B81]" />
          <span>Al contratar tu coordinación, se desbloquea automáticamente tu agenda de Reuniones en Lazo.</span>
        </div>
      </div>
    </Modal>
  );
};
