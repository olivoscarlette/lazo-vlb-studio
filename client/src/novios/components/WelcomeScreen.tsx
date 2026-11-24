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
    }, 360);
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-[#1F1A17] flex flex-col justify-between transition-all duration-400 ease-out ${
        exiting ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes lazoCinemaZoom {
          0% {
            transform: scale(1.07);
          }
          100% {
            transform: scale(1.0);
          }
        }
        @keyframes lazoCoverFadeUp {
          0% {
            opacity: 0;
            transform: translateY(18px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .lazo-cinema-zoom {
          animation: lazoCinemaZoom 12s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .lazo-cv-1 {
          animation: lazoCoverFadeUp 780ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
        }
        .lazo-cv-2 {
          animation: lazoCoverFadeUp 820ms cubic-bezier(0.22, 1, 0.36, 1) 280ms both;
        }
        .lazo-cv-3 {
          animation: lazoCoverFadeUp 840ms cubic-bezier(0.22, 1, 0.36, 1) 420ms both;
        }
        .lazo-cv-4 {
          animation: lazoCoverFadeUp 840ms cubic-bezier(0.22, 1, 0.36, 1) 560ms both;
        }
        .lazo-cv-5 {
          animation: lazoCoverFadeUp 840ms cubic-bezier(0.22, 1, 0.36, 1) 700ms both;
        }
      `}</style>

      {/* Full-Bleed Vogue Weddings Editorial Photograph */}
      <img
        src="/lazo-welcome-cover.jpg"
        alt="LAZO — Editorial Bridal Cover"
        className="lazo-cinema-zoom absolute inset-0 w-full h-full object-cover object-center select-none"
        draggable={false}
      />

      {/* Atmospheric Cinema Gradient — keeps the sunlit bride luminous in the center & ensures crisp legibility top/bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1C1613]/42 via-[#1C1613]/10 via-45% to-[#1C1613]/82"
      />

      {/* TOP MASTHEAD: Official LAZO Logo in Crisp White */}
      <header className="relative z-10 pt-8 sm:pt-11 px-6 flex flex-col items-center">
        <img
          src="/lazo-logo.png"
          alt="LAZO — Studio Planning"
          className="lazo-cv-1 h-12 sm:h-14 lg:h-16 w-auto object-contain select-none brightness-0 invert opacity-95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.28)]"
        />
      </header>

      {/* LOWER-CENTER EDITORIAL COVER COMPOSITION */}
      <main className="relative z-10 px-6 sm:px-10 pb-12 sm:pb-16 lg:pb-20 pt-24 flex flex-col items-center text-center max-w-3xl mx-auto">
        {profile.weddingDate && (
          <div className="lazo-cv-2 flex items-center justify-center gap-3.5 text-[11px] sm:text-xs uppercase tracking-[0.26em] text-white/80 mb-5">
            <span>{formatShortDate(profile.weddingDate)}</span>
            <span className="h-3 w-px bg-white/40" />
            <span className="text-[#F3D2CB] font-medium">
              {days === 0
                ? 'Hoy es el gran día'
                : days === 1
                  ? 'Falta 1 día'
                  : `Faltan ${days} días`}
            </span>
          </div>
        )}

        <h1 className="lazo-cv-3 font-editorial text-[2.5rem] sm:text-[3.6rem] lg:text-[4.35rem] text-white leading-[1.08] tracking-[-0.01em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.32)]">
          {hasPartner2 && !isNonWedding ? (
            <>
              Bienvenidos, {profile.partner1}{' '}
              <span className="text-[#E9B8AE]">&amp;</span> {profile.partner2}
            </>
          ) : (
            <>Bienvenida, {profile.partner1}</>
          )}
        </h1>

        <p className="lazo-cv-4 text-sm sm:text-base text-white/85 font-light tracking-[0.02em] leading-relaxed mt-4 max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
          {isNonWedding
            ? 'Aquí comienza la historia de tu celebración.'
            : 'Aquí comienza la historia de su gran día.'}
        </p>

        <div className="lazo-cv-5 mt-8 sm:mt-9 flex flex-col items-center">
          <button
            type="button"
            onClick={handleEnter}
            className="group inline-flex items-center justify-center gap-3 px-10 py-3.5 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#2B2826] backdrop-blur-md border border-white/60 text-[11.5px] sm:text-xs font-medium uppercase tracking-[0.22em] transition-all duration-300 cursor-pointer shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)]"
          >
            <span>{isNonWedding ? 'Entrar a mi evento' : 'Entrar a mi boda'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          {!isVirtualNovios && (
            <span className="mt-6 text-[10px] uppercase tracking-[0.28em] text-white/60">
              Curado por Viva la Bride
            </span>
          )}
        </div>
      </main>
    </div>
  );
};
