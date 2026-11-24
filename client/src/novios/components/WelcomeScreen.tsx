import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { WeddingProfile } from '../types/lazo';
import { daysUntil, formatShortDate } from '../data/seedWedding';

interface WelcomeScreenProps {
  profile: WeddingProfile;
  isVirtualNovios: boolean;
  onEnter: () => void;
}

const DEFAULT_EDITORIAL_BW_PHOTO =
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=85';

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

  const backgroundPhoto =
    profile.coverPhoto && profile.coverPhoto.trim()
      ? profile.coverPhoto
      : DEFAULT_EDITORIAL_BW_PHOTO;

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      onEnter();
    }, 360);
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-[#FAF8F5] flex flex-col justify-between transition-all duration-400 ease-out ${
        exiting ? 'opacity-0 scale-[1.015]' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes lazoCinemaDrift {
          0% {
            transform: scale(1.06);
          }
          100% {
            transform: scale(1.0);
          }
        }
        @keyframes lazoCoverFadeUp {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes lazoLineExpand {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        .lazo-cinema-drift {
          animation: lazoCinemaDrift 14s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .lazo-cv-1 {
          animation: lazoCoverFadeUp 760ms cubic-bezier(0.22, 1, 0.36, 1) 100ms both;
        }
        .lazo-cv-2 {
          animation: lazoLineExpand 800ms cubic-bezier(0.22, 1, 0.36, 1) 240ms both;
          transform-origin: center;
        }
        .lazo-cv-3 {
          animation: lazoCoverFadeUp 800ms cubic-bezier(0.22, 1, 0.36, 1) 360ms both;
        }
        .lazo-cv-4 {
          animation: lazoCoverFadeUp 820ms cubic-bezier(0.22, 1, 0.36, 1) 500ms both;
        }
        .lazo-cv-5 {
          animation: lazoCoverFadeUp 820ms cubic-bezier(0.22, 1, 0.36, 1) 640ms both;
        }
      `}</style>

      {/* Authentic Real Documentary Wedding Photograph in Editorial Black & White with Soft Silk Transparency */}
      <img
        src={backgroundPhoto}
        alt=""
        aria-hidden="true"
        className="lazo-cinema-drift absolute inset-0 w-full h-full object-cover object-center grayscale contrast-[1.06] opacity-[0.26] select-none pointer-events-none"
        draggable={false}
      />

      {/* Luminous Ivory-Silk Translucent Veil — soft editorial atmosphere & effortless readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,248,245,0.82)_0%,rgba(250,248,245,0.48)_58%,rgba(244,235,231,0.72)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/75 via-transparent to-[#FAF8F5]/85"
      />

      {/* Subtle top spacing / masthead */}
      <header className="relative z-10 pt-10 sm:pt-14 px-6 flex flex-col items-center">
        <img
          src="/lazo-logo.png"
          alt="LAZO — Studio Planning"
          className="lazo-cv-1 h-14 sm:h-16 lg:h-[4.5rem] w-auto object-contain select-none"
        />
      </header>

      {/* Center Sculptural Editorial Composition */}
      <main className="relative z-10 px-6 sm:px-10 py-10 flex flex-col items-center text-center max-w-3xl mx-auto">
        {profile.weddingDate && (
          <div className="lazo-cv-1 flex items-center justify-center gap-3.5 text-[11px] sm:text-xs uppercase tracking-[0.26em] text-[#7D6F6B] mb-6">
            <span>{formatShortDate(profile.weddingDate)}</span>
            <span className="h-3 w-px bg-[#D7C6BE]" />
            <span className="text-[#A86B60] font-medium">
              {days === 0
                ? 'Hoy es el gran día'
                : days === 1
                  ? 'Falta 1 día'
                  : `Faltan ${days} días`}
            </span>
          </div>
        )}

        <div className="lazo-cv-2 w-14 h-px bg-[#C48B81]/70 mb-7" />

        <h1 className="lazo-cv-3 font-editorial text-[2.75rem] sm:text-[3.85rem] lg:text-[4.6rem] text-[#2B2826] leading-[1.06] tracking-[-0.015em]">
          {hasPartner2 && !isNonWedding ? (
            <>
              Bienvenidos, {profile.partner1}{' '}
              <span className="text-[#C48B81]">&amp;</span> {profile.partner2}
            </>
          ) : (
            <>Bienvenida, {profile.partner1}</>
          )}
        </h1>

        <p className="lazo-cv-4 text-sm sm:text-base text-[#5E524E] font-light tracking-[0.015em] leading-relaxed mt-5 max-w-md">
          {isNonWedding
            ? 'Aquí comienza la historia de tu celebración.'
            : 'Aquí comienza la historia de su gran día.'}
        </p>

        <div className="lazo-cv-5 mt-10">
          <button
            type="button"
            onClick={handleEnter}
            className="group inline-flex items-center justify-center gap-3 px-10 py-3.5 rounded-full bg-white/60 hover:bg-[#C48B81] text-[#2B2826] hover:text-white backdrop-blur-md border border-[#C48B81]/75 text-[11.5px] sm:text-xs font-medium uppercase tracking-[0.22em] transition-all duration-300 cursor-pointer shadow-[0_12px_30px_-14px_rgba(43,40,38,0.18)]"
          >
            <span>{isNonWedding ? 'Entrar a mi evento' : 'Entrar a mi boda'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C48B81] group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="relative z-10 pb-8 sm:pb-10 px-6 text-center">
        <span className="lazo-cv-5 inline-block text-[10px] uppercase tracking-[0.28em] text-[#9A8B84]">
          {isVirtualNovios ? 'LAZO Studio · Planning' : 'Curado por Viva la Bride'}
        </span>
      </footer>
    </div>
  );
};
