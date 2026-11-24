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
      className={`min-h-screen bg-[#F8F5F0] flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden transition-opacity duration-300 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle luxury blush radial aura behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-[#EFE2E5]/80 blur-3xl"
      />

      {/* Official LAZO logo */}
      <div className="relative z-10 mb-7 sm:mb-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
        <img
          src="/lazo-logo.png"
          alt="LAZO — Studio Planning"
          className="h-16 sm:h-18 w-auto object-contain select-none"
        />
      </div>

      {/* Editorial Welcome Card (Opción A) */}
      <div className="relative z-10 bg-white rounded-[2rem] border border-[#E7E1D8] shadow-[0_24px_60px_-24px_rgba(43,40,38,0.14)] max-w-md w-full px-7 sm:px-11 py-10 sm:py-12 text-center animate-in fade-in zoom-in-95 duration-500">
        <span className="inline-block text-[11px] uppercase tracking-[0.22em] font-semibold text-[#6E2E3A]">
          {isVirtualNovios
            ? 'Tu espacio privado está listo'
            : 'Viva la Bride · Tu espacio privado está listo'}
        </span>

        <h1 className="font-editorial text-[2.2rem] sm:text-[2.6rem] text-[#1F1D1E] leading-[1.15] mt-4">
          {hasPartner2 && !isNonWedding ? (
            <>
              Bienvenidos a Lazo,
              <br />
              {profile.partner1} &amp; {profile.partner2}
            </>
          ) : (
            <>
              Bienvenida a Lazo,
              <br />
              {profile.partner1}
            </>
          )}
        </h1>

        <p className="text-sm sm:text-[15px] text-[#6B6462] font-light leading-relaxed mt-4 max-w-sm mx-auto">
          {isVirtualNovios
            ? 'Preparamos este espacio exclusivo para que disfrutes planear cada detalle de tu gran día con calma, claridad y estilo.'
            : 'Tu equipo de Viva la Bride preparó este espacio exclusivo para que disfrutes planear cada detalle de tu gran día con calma, claridad y estilo.'}
        </p>

        {profile.weddingDate && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8F5F0] border border-[#E7E1D8] text-xs text-[#5A524C]">
            <span>✨ Faltan {days} días</span>
            <span className="opacity-45">·</span>
            <span>{formatShortDate(profile.weddingDate)}</span>
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={handleEnter}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full bg-[#1F1D1E] hover:bg-[#191716] text-white text-sm font-medium tracking-wide shadow-sm transition cursor-pointer"
          >
            <span>{isNonWedding ? 'Entrar a mi evento' : 'Entrar a mi boda'}</span>
            <ArrowRight className="w-4 h-4 text-[#D9B6BC]" />
          </button>
        </div>
      </div>
    </div>
  );
};
