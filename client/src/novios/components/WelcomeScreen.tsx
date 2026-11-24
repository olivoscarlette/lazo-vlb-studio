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
      className={`min-h-screen w-full bg-[#FAF8F5] flex items-center justify-center px-5 sm:px-10 lg:px-14 py-8 sm:py-10 overflow-hidden transition-all duration-400 ease-out ${
        exiting ? 'opacity-0 scale-[1.01]' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes lazoEditorialReveal {
          0% {
            opacity: 0;
            transform: translateY(14px);
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
          transform-origin: center;
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

      {/* Balanced Gallery Spread Container */}
      <div className="w-full max-w-[1120px] grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-14">
        {/* LEFT: Editorial Arch Photograph framed with generous ivory passe-partout */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="lazo-ed-1 relative w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[460px] aspect-[3/4] rounded-t-[16rem] rounded-b-[1.25rem] overflow-hidden border border-[#EAE0D7] shadow-[0_30px_70px_-34px_rgba(43,40,38,0.22)] bg-[#EFE8E1]">
            <img
              src="/lazo-welcome-editorial.jpg"
              alt="LAZO — Editorial Bridal Atelier"
              className="lazo-photo-breathe w-full h-full object-cover object-center select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* RIGHT: Centered, Harmonious Editorial Composition */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center px-2 sm:px-6">
          {/* Official LAZO Crest integrated into the vertical rhythm */}
          <div className="lazo-ed-1">
            <img
              src="/lazo-logo.png"
              alt="LAZO — Studio Planning"
              className="h-14 sm:h-16 lg:h-[4.25rem] w-auto object-contain select-none"
            />
          </div>

          {/* Delicate centered hairline rule */}
          <div className="lazo-ed-2 flex items-center justify-center gap-3 my-7 sm:my-8 w-28">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#DFC8C2]" />
            <span className="w-1 h-1 rounded-full bg-[#C48B81]" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#DFC8C2]" />
          </div>

          {/* Sculptural Marcellus Greeting */}
          <h1 className="font-editorial text-[2.6rem] sm:text-[3.35rem] lg:text-[3.85rem] text-[#2B2826] leading-[1.08] tracking-[-0.015em]">
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

          {/* Single serene line */}
          <p className="lazo-ed-5 text-sm sm:text-[15px] text-[#7D6F6B] font-light leading-relaxed mt-5 max-w-[330px]">
            {isNonWedding
              ? 'Todo listo para dar forma a cada detalle de tu celebración.'
              : 'Todo listo para dar forma a cada detalle de tu gran día.'}
          </p>

          {/* Subtle date & countdown */}
          {profile.weddingDate && (
            <div className="lazo-ed-5 flex items-center justify-center gap-3.5 text-[11px] uppercase tracking-[0.22em] text-[#8E7F79] mt-7">
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

          {/* Slim, refined couture outline-to-blush CTA */}
          <div className="lazo-ed-6 mt-9">
            <button
              type="button"
              onClick={handleEnter}
              className="group inline-flex items-center justify-center gap-3 px-9 py-3.5 rounded-full border border-[#C48B81] bg-white/60 hover:bg-[#C48B81] text-[#2B2826] hover:text-white text-[11.5px] sm:text-xs font-medium uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer"
            >
              <span>{isNonWedding ? 'Entrar a mi evento' : 'Entrar a mi boda'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C48B81] group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          {!isVirtualNovios && (
            <span className="lazo-ed-6 mt-8 text-[10px] uppercase tracking-[0.24em] text-[#A89B95]">
              Curado por Viva la Bride
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
