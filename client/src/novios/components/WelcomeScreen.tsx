import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { WeddingProfile } from '../types/lazo';
import { daysUntil, formatShortDate } from '../data/seedWedding';

interface WelcomeScreenProps {
  profile: WeddingProfile;
  isVirtualNovios: boolean;
  onEnter: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  profile,
  isVirtualNovios,
  onEnter
}) => {
  const [exiting, setExiting] = useState(false);

  const days = daysUntil(profile.weddingDate);
  const isNonWedding = Boolean(
    profile.eventType && !profile.eventType.toLowerCase().includes('boda')
  );
  const hasPartner2 = Boolean(profile.partner2 && profile.partner2.trim());

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      onEnter();
    }, 340);
  };

  return (
    <div
      className={`min-h-screen w-full bg-[#FAF8F5] grid grid-cols-1 lg:grid-cols-12 overflow-hidden transition-all duration-400 ease-out ${
        exiting ? 'opacity-0 scale-[1.01]' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes lazoEditorialReveal {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes lazoPhotoBreathe {
          0% {
            transform: scale(1.06);
          }
          100% {
            transform: scale(1.0);
          }
        }
        @keyframes lazoRuleGrow {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }
        .lazo-photo-breathe {
          animation: lazoPhotoBreathe 9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .lazo-ed-1 {
          animation: lazoEditorialReveal 720ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
        }
        .lazo-ed-2 {
          animation: lazoRuleGrow 780ms cubic-bezier(0.22, 1, 0.36, 1) 200ms both;
          transform-origin: left center;
        }
        .lazo-ed-3 {
          animation: lazoEditorialReveal 760ms cubic-bezier(0.22, 1, 0.36, 1) 300ms both;
        }
        .lazo-ed-4 {
          animation: lazoEditorialReveal 760ms cubic-bezier(0.22, 1, 0.36, 1) 420ms both;
        }
        .lazo-ed-5 {
          animation: lazoEditorialReveal 760ms cubic-bezier(0.22, 1, 0.36, 1) 540ms both;
        }
        .lazo-ed-6 {
          animation: lazoEditorialReveal 760ms cubic-bezier(0.22, 1, 0.36, 1) 660ms both;
        }
      `}</style>

      {/* LEFT HALF: Full-Bleed Fine-Art Editorial Still Life (Silk LAZO Bow & Morning Light) */}
      <div className="relative h-[42vh] min-h-[280px] sm:h-[46vh] lg:h-auto lg:min-h-screen lg:col-span-6 overflow-hidden bg-[#EFE8E1]">
        <img
          src="/lazo-welcome-editorial.jpg"
          alt="LAZO — Editorial Bridal Atelier"
          className="lazo-photo-breathe w-full h-full object-cover object-center select-none"
          draggable={false}
        />
        {/* Whisper-soft luminous seam into ivory on mobile */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/40 to-transparent lg:hidden"
        />
        {/* Subtle right-edge light feather on desktop */}
        <div
          aria-hidden="true"
          className="pointer-events-none hidden lg:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#FAF8F5]/35 to-transparent"
        />
      </div>

      {/* RIGHT HALF: Open Luminous Ivory Editorial Space — NO boxed card, pure negative space */}
      <div className="lg:col-span-6 flex flex-col justify-between px-7 sm:px-14 lg:px-20 xl:px-24 py-9 sm:py-12 lg:py-16 bg-[#FAF8F5] text-center lg:text-left">
        {/* Top Crest */}
        <div className="lazo-ed-1 flex justify-center lg:justify-start">
          <img
            src="/lazo-logo.png"
            alt="LAZO — Studio Planning"
            className="h-11 sm:h-13 w-auto object-contain select-none"
          />
        </div>

        {/* Center Sculptural Editorial Copy */}
        <div className="my-auto py-8 sm:py-12 max-w-lg mx-auto lg:mx-0">
          {profile.weddingDate && (
            <div className="lazo-ed-1 flex items-center justify-center lg:justify-start gap-3 text-[11px] uppercase tracking-[0.22em] text-[#8E7F79] mb-6">
              <span>{formatShortDate(profile.weddingDate)}</span>
              <span className="h-3 w-px bg-[#DFCFC8]" />
              <span className="text-[#B2766C] font-medium">
                {days === 0
                  ? 'Hoy es el gran día'
                  : days === 1
                    ? 'Falta 1 día'
                    : `Faltan ${days} días`}
              </span>
            </div>
          )}

          <div className="lazo-ed-2 h-px w-12 bg-[#D6B8B1] mx-auto lg:mx-0 mb-7" />

          <h1 className="font-editorial text-[2.65rem] sm:text-[3.5rem] lg:text-[4.1rem] text-[#2B2826] leading-[1.06] tracking-[-0.015em]">
            {hasPartner2 && !isNonWedding ? (
              <>
                <span className="lazo-ed-3 block">Bienvenidos,</span>
                <span className="lazo-ed-4 block mt-1.5">
                  {profile.partner1}{' '}
                  <span className="text-[#C48B81]">&amp;</span>{' '}
                  {profile.partner2}
                </span>
              </>
            ) : (
              <>
                <span className="lazo-ed-3 block">Bienvenida,</span>
                <span className="lazo-ed-4 block mt-1.5">
                  {profile.partner1}
                </span>
              </>
            )}
          </h1>

          <p className="lazo-ed-5 text-sm sm:text-[15.5px] text-[#7D6F6B] font-light leading-relaxed mt-6 max-w-sm mx-auto lg:mx-0">
            {isNonWedding
              ? 'Todo listo para dar forma a cada detalle de tu celebración.'
              : 'Todo listo para dar forma a cada detalle de tu gran día.'}
          </p>

          <div className="lazo-ed-6 mt-9 sm:mt-10 flex justify-center lg:justify-start">
            <button
              type="button"
              onClick={handleEnter}
              className="group inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#C48B81] hover:bg-[#AD7268] text-white text-xs sm:text-[13px] font-medium uppercase tracking-[0.16em] shadow-[0_14px_30px_-12px_rgba(196,139,129,0.75)] transition-all duration-200 cursor-pointer"
            >
              <span>{isNonWedding ? 'Entrar a mi evento' : 'Entrar a mi boda'}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Quiet Editorial Footer Signature */}
        <div className="lazo-ed-6 flex items-center justify-center lg:justify-between text-[10px] uppercase tracking-[0.24em] text-[#A89B95] pt-4">
          <span>
            {isVirtualNovios ? 'LAZO Studio · Planning' : 'Curado por Viva la Bride'}
          </span>
        </div>
      </div>
    </div>
  );
};
