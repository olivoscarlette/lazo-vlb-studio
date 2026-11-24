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
    }, 260);
  };

  return (
    <div
      className={`min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden transition-opacity duration-300 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Soft ambient blush & champagne glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[540px] h-[540px] rounded-full bg-[#EFE2DF]/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/4 w-[420px] h-[420px] rounded-full bg-[#F4EAE3]/70 blur-3xl"
      />

      {/* Fine-Art Stationery Frame */}
      <div className="relative z-10 w-full max-w-[460px] bg-white/90 rounded-[2.25rem] p-3 sm:p-3.5 border border-[#EAE0D8] shadow-[0_30px_70px_-30px_rgba(43,40,38,0.14)] animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-[1.65rem] border border-[#F1E8E2] bg-gradient-to-b from-white via-[#FFFDFB] to-[#FAF5F2]/60 px-7 sm:px-11 py-11 sm:py-14 text-center flex flex-col items-center">
          {/* Official LAZO Crest */}
          <img
            src="/lazo-logo.png"
            alt="LAZO — Studio Planning"
            className="h-11 sm:h-12 w-auto object-contain select-none opacity-95"
          />

          {/* Delicate hairline ornament */}
          <div className="flex items-center justify-center gap-3 my-7 w-28">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#DFCFC8]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#C48B81]/70" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#DFCFC8]" />
          </div>

          {/* Clean, non-redundant greeting */}
          <h1 className="font-editorial text-[2.25rem] sm:text-[2.75rem] text-[#2B2826] leading-[1.12] tracking-[-0.01em]">
            {hasPartner2 && !isNonWedding ? (
              <>
                Bienvenidos,
                <span className="block mt-1.5 text-[#2B2826]">
                  {profile.partner1}{' '}
                  <span className="text-[#C48B81]">&amp;</span>{' '}
                  {profile.partner2}
                </span>
              </>
            ) : (
              <>
                Bienvenida,
                <span className="block mt-1 text-[#2B2826]">
                  {profile.partner1}
                </span>
              </>
            )}
          </h1>

          {/* Single poetic, airy line */}
          <p className="text-[13.5px] sm:text-sm text-[#7D6F6B] font-light leading-relaxed mt-5 max-w-[300px]">
            {isNonWedding
              ? 'Todo listo para dar forma a cada detalle de tu celebración.'
              : 'Todo listo para dar forma a cada detalle de tu gran día.'}
          </p>

          {/* Editorial date & countdown row (no generic pill, no emoji) */}
          {profile.weddingDate && (
            <div className="mt-8 pt-6 border-t border-[#EFE8E1] w-full flex items-center justify-center gap-4 text-[11px] uppercase tracking-[0.18em] text-[#7D6F6B]">
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

          {/* Soft dusty-rose signature CTA */}
          <div className="mt-8 w-full flex flex-col items-center">
            <button
              type="button"
              onClick={handleEnter}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-3.5 rounded-full bg-[#C48B81] hover:bg-[#AE746A] text-white text-xs sm:text-[13px] font-medium uppercase tracking-[0.14em] shadow-[0_10px_24px_-10px_rgba(196,139,129,0.75)] transition-all duration-200 cursor-pointer"
            >
              <span>{isNonWedding ? 'Entrar a mi evento' : 'Entrar a mi boda'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
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
