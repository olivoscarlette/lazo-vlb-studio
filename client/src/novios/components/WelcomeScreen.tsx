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
      className={`min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden transition-all duration-300 ease-out ${
        exiting ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes lazoWelcomeFadeUp {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes lazoCardReveal {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes lazoLineDraw {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        @keyframes lazoAuraDriftA {
          0%, 100% {
            transform: translate(-50%, 0) scale(1);
          }
          50% {
            transform: translate(-46%, 18px) scale(1.06);
          }
        }
        @keyframes lazoAuraDriftB {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-20px, -16px) scale(1.08);
          }
        }
        @keyframes lazoSilkSheen {
          0% {
            transform: translateX(-140%) skewX(-20deg);
          }
          35%, 100% {
            transform: translateX(260%) skewX(-20deg);
          }
        }
        .lazo-card-reveal {
          animation: lazoCardReveal 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .lazo-stagger-1 {
          animation: lazoWelcomeFadeUp 680ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
        }
        .lazo-stagger-2 {
          animation: lazoLineDraw 760ms cubic-bezier(0.22, 1, 0.36, 1) 280ms both;
          transform-origin: center;
        }
        .lazo-stagger-3 {
          animation: lazoWelcomeFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) 420ms both;
        }
        .lazo-stagger-4 {
          animation: lazoWelcomeFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) 560ms both;
        }
        .lazo-stagger-5 {
          animation: lazoWelcomeFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) 700ms both;
        }
        .lazo-stagger-6 {
          animation: lazoWelcomeFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) 840ms both;
        }
        .lazo-stagger-7 {
          animation: lazoWelcomeFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) 960ms both;
        }
        .lazo-aura-a {
          animation: lazoAuraDriftA 14s ease-in-out infinite;
        }
        .lazo-aura-b {
          animation: lazoAuraDriftB 17s ease-in-out infinite;
        }
        .lazo-silk-sheen {
          animation: lazoSilkSheen 4.8s ease-in-out 1.8s infinite;
        }
      `}</style>

      {/* Soft living blush & champagne ambient light */}
      <div
        aria-hidden="true"
        className="lazo-aura-a pointer-events-none absolute -top-24 left-1/2 w-[560px] h-[560px] rounded-full bg-[#EFE2DF]/65 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="lazo-aura-b pointer-events-none absolute -bottom-32 right-1/4 w-[440px] h-[440px] rounded-full bg-[#F4EAE3]/75 blur-3xl"
      />

      {/* Fine-Art Stationery Frame */}
      <div className="lazo-card-reveal relative z-10 w-full max-w-[470px] bg-white/90 rounded-[2.25rem] p-3 sm:p-3.5 border border-[#EAE0D8] shadow-[0_32px_72px_-30px_rgba(43,40,38,0.14)]">
        <div className="rounded-[1.65rem] border border-[#F1E8E2] bg-gradient-to-b from-white via-[#FFFDFB] to-[#FAF5F2]/65 px-7 sm:px-11 py-11 sm:py-14 text-center flex flex-col items-center">
          {/* Official LAZO Crest — slightly larger & focal */}
          <img
            src="/lazo-logo.png"
            alt="LAZO — Studio Planning"
            className="lazo-stagger-1 h-14 sm:h-16 w-auto object-contain select-none opacity-95"
          />

          {/* Delicate animated hairline ornament */}
          <div className="lazo-stagger-2 flex items-center justify-center gap-3 my-7 w-32">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#DFCFC8]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81]/75" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#DFCFC8]" />
          </div>

          {/* Clean, non-redundant greeting with staggered entrance */}
          <h1 className="font-editorial text-[2.25rem] sm:text-[2.75rem] text-[#2B2826] leading-[1.12] tracking-[-0.01em]">
            {hasPartner2 && !isNonWedding ? (
              <>
                <span className="lazo-stagger-3 block">Bienvenidos,</span>
                <span className="lazo-stagger-4 block mt-1.5 text-[#2B2826]">
                  {profile.partner1}{' '}
                  <span className="text-[#C48B81]">&amp;</span>{' '}
                  {profile.partner2}
                </span>
              </>
            ) : (
              <>
                <span className="lazo-stagger-3 block">Bienvenida,</span>
                <span className="lazo-stagger-4 block mt-1 text-[#2B2826]">
                  {profile.partner1}
                </span>
              </>
            )}
          </h1>

          {/* Single poetic, airy line */}
          <p className="lazo-stagger-5 text-[13.5px] sm:text-sm text-[#7D6F6B] font-light leading-relaxed mt-5 max-w-[300px]">
            {isNonWedding
              ? 'Todo listo para dar forma a cada detalle de tu celebración.'
              : 'Todo listo para dar forma a cada detalle de tu gran día.'}
          </p>

          {/* Editorial date & countdown row */}
          {profile.weddingDate && (
            <div className="lazo-stagger-6 mt-8 pt-6 border-t border-[#EFE8E1] w-full flex items-center justify-center gap-4 text-[11px] uppercase tracking-[0.18em] text-[#7D6F6B]">
              <span>{formatShortDate(profile.weddingDate)}</span>
              <span className="h-3 w-px bg-[#DFCFC8]" />
              <span className="text-[#A86B60] font-medium">
                {days === 0
                  ? 'Hoy es el gran día'
                  : days === 1
                    ? 'Falta 1 día'
                    : `Faltan ${days} días`}
              </span>
            </div>
          )}

          {/* Soft dusty-rose signature CTA with gentle silk sheen */}
          <div className="lazo-stagger-7 mt-8 w-full flex flex-col items-center">
            <button
              type="button"
              onClick={handleEnter}
              className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-3.5 rounded-full bg-[#C48B81] hover:bg-[#AE746A] text-white text-xs sm:text-[13px] font-medium uppercase tracking-[0.14em] shadow-[0_12px_26px_-10px_rgba(196,139,129,0.75)] transition-all duration-200 cursor-pointer"
            >
              <span
                aria-hidden="true"
                className="lazo-silk-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />
              <span className="relative z-10">
                {isNonWedding ? 'Entrar a mi evento' : 'Entrar a mi boda'}
              </span>
              <ArrowRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            {!isVirtualNovios && (
              <span className="mt-6 text-[10px] uppercase tracking-[0.22em] text-[#A89B95]">
                Curado por Viva la Bride
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
