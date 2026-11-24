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
  const [stage, setStage] = useState<'envelope' | 'opening' | 'card'>('envelope');
  const [exiting, setExiting] = useState(false);

  const days = daysUntil(profile.weddingDate);
  const isNonWedding = Boolean(
    profile.eventType && !profile.eventType.toLowerCase().includes('boda')
  );
  const hasPartner2 = Boolean(profile.partner2 && profile.partner2.trim());

  const handleOpenEnvelope = () => {
    if (stage !== 'envelope') return;
    setStage('opening');
    setTimeout(() => {
      setStage('card');
    }, 900);
  };

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      onEnter();
    }, 340);
  };

  const recipientLabel =
    hasPartner2 && !isNonWedding
      ? `${profile.partner1} & ${profile.partner2}`
      : profile.partner1;

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
            transform: translateY(28px) scale(0.96);
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
        @keyframes lazoSealPulse {
          0%, 100% {
            box-shadow: 0 10px 24px -6px rgba(168, 107, 96, 0.45), 0 0 0 0 rgba(196, 139, 129, 0.35);
          }
          50% {
            box-shadow: 0 12px 28px -6px rgba(168, 107, 96, 0.55), 0 0 0 10px rgba(196, 139, 129, 0);
          }
        }
        @keyframes lazoEnvelopeFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .lazo-card-reveal {
          animation: lazoCardReveal 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .lazo-stagger-1 {
          animation: lazoWelcomeFadeUp 640ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
        }
        .lazo-stagger-2 {
          animation: lazoLineDraw 720ms cubic-bezier(0.22, 1, 0.36, 1) 220ms both;
          transform-origin: center;
        }
        .lazo-stagger-3 {
          animation: lazoWelcomeFadeUp 660ms cubic-bezier(0.22, 1, 0.36, 1) 340ms both;
        }
        .lazo-stagger-4 {
          animation: lazoWelcomeFadeUp 660ms cubic-bezier(0.22, 1, 0.36, 1) 460ms both;
        }
        .lazo-stagger-5 {
          animation: lazoWelcomeFadeUp 660ms cubic-bezier(0.22, 1, 0.36, 1) 580ms both;
        }
        .lazo-stagger-6 {
          animation: lazoWelcomeFadeUp 660ms cubic-bezier(0.22, 1, 0.36, 1) 700ms both;
        }
        .lazo-stagger-7 {
          animation: lazoWelcomeFadeUp 660ms cubic-bezier(0.22, 1, 0.36, 1) 820ms both;
        }
        .lazo-aura-a {
          animation: lazoAuraDriftA 14s ease-in-out infinite;
        }
        .lazo-aura-b {
          animation: lazoAuraDriftB 17s ease-in-out infinite;
        }
        .lazo-silk-sheen {
          animation: lazoSilkSheen 4.8s ease-in-out 1.6s infinite;
        }
        .lazo-seal-pulse {
          animation: lazoSealPulse 2.8s ease-in-out infinite;
        }
        .lazo-envelope-float {
          animation: lazoEnvelopeFloat 5s ease-in-out infinite;
        }
        .lazo-envelope-perspective {
          perspective: 1100px;
        }
        .lazo-flap-3d {
          transform-origin: top center;
          transition: transform 620ms cubic-bezier(0.32, 0.72, 0, 1);
          transform-style: preserve-3d;
        }
        .lazo-flap-open {
          transform: rotateX(-165deg);
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

      {/* PHASE 1 & 2: Minimalist Luxury Cotton-Paper Envelope */}
      {stage !== 'card' && (
        <div
          className={`relative z-10 flex flex-col items-center w-full max-w-[430px] transition-all duration-500 ${
            stage === 'opening' ? 'scale-[1.03]' : ''
          }`}
        >
          {/* Subtle LAZO crest above envelope */}
          <img
            src="/lazo-logo.png"
            alt="LAZO — Studio Planning"
            className={`h-12 sm:h-14 w-auto object-contain select-none mb-7 transition-opacity duration-500 ${
              stage === 'opening' ? 'opacity-0' : 'opacity-90'
            }`}
          />

          {/* Interactive 3D Envelope */}
          <button
            type="button"
            onClick={handleOpenEnvelope}
            aria-label="Abrir invitación"
            className={`group lazo-envelope-perspective relative w-full aspect-[1.48/1] cursor-pointer focus:outline-none ${
              stage === 'envelope' ? 'lazo-envelope-float' : ''
            }`}
          >
            {/* Inner letter peeking out when opening */}
            <div
              className={`absolute left-[7%] right-[7%] top-[10%] bottom-[12%] rounded-2xl bg-white border border-[#EFE8E1] shadow-md flex flex-col items-center justify-center px-6 transition-all duration-700 ease-out z-10 ${
                stage === 'opening'
                  ? '-translate-y-24 opacity-100 scale-100'
                  : 'translate-y-0 opacity-0 scale-95'
              }`}
            >
              <img
                src="/lazo-logo.png"
                alt="LAZO"
                className="h-9 w-auto object-contain opacity-85 mb-2"
              />
              <span className="font-editorial text-lg text-[#2B2826]">
                {hasPartner2 && !isNonWedding ? 'Bienvenidos,' : 'Bienvenida,'}{' '}
                {recipientLabel}
              </span>
            </div>

            {/* Envelope base body */}
            <div
              className={`relative w-full h-full rounded-[1.5rem] bg-gradient-to-br from-[#FFFDFB] via-[#FAF6F1] to-[#F3EBE4] border border-[#E5D9CE] shadow-[0_28px_65px_-24px_rgba(43,40,38,0.18)] overflow-hidden transition-opacity duration-500 ${
                stage === 'opening' ? 'opacity-30' : 'opacity-100'
              }`}
            >
              {/* Side & bottom folded paper triangles (crisp SVG) */}
              <svg
                viewBox="0 0 440 300"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
              >
                {/* Left fold */}
                <polygon
                  points="0,0 218,154 0,300"
                  fill="#FBF8F4"
                  stroke="#EAE0D7"
                  strokeWidth="1"
                />
                {/* Right fold */}
                <polygon
                  points="440,0 222,154 440,300"
                  fill="#F8F2EC"
                  stroke="#EAE0D7"
                  strokeWidth="1"
                />
                {/* Bottom fold */}
                <polygon
                  points="0,300 220,142 440,300"
                  fill="#FFFDFB"
                  stroke="#E7DCD2"
                  strokeWidth="1.2"
                />
              </svg>

              {/* Subtle recipient name engraved near bottom of envelope */}
              <div className="absolute bottom-5 inset-x-0 z-20 text-center pointer-events-none">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#A2938C] mb-0.5">
                  Para
                </p>
                <p className="font-editorial text-base sm:text-lg text-[#2B2826]/90">
                  {recipientLabel}
                </p>
              </div>
            </div>

            {/* Top V-Flap with 3D open rotation */}
            <div
              className={`lazo-flap-3d absolute inset-x-0 top-0 h-[58%] z-30 pointer-events-none ${
                stage === 'opening' ? 'lazo-flap-open' : ''
              }`}
            >
              <svg
                viewBox="0 0 440 174"
                preserveAspectRatio="none"
                className="w-full h-full drop-shadow-[0_8px_14px_rgba(43,40,38,0.07)]"
              >
                <path
                  d="M 18 0 L 422 0 Q 440 0 440 18 L 234 162 Q 220 172 206 162 L 0 18 Q 0 0 18 0 Z"
                  fill="#FFFFFF"
                  stroke="#E7DCD2"
                  strokeWidth="1.2"
                />
              </svg>
            </div>

            {/* Dusty-Rose Wax Seal at the center tip */}
            <div
              className={`absolute left-1/2 top-[53%] -translate-x-1/2 -translate-y-1/2 z-40 transition-all duration-300 ${
                stage === 'opening'
                  ? 'opacity-0 scale-75'
                  : 'opacity-100 scale-100 group-hover:scale-105'
              }`}
            >
              <div className="lazo-seal-pulse w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full bg-gradient-to-br from-[#D0988E] via-[#C48B81] to-[#A86B60] p-1.5 flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-white/40 flex items-center justify-center bg-[#C48B81]/30">
                  <span className="font-editorial text-white text-xl sm:text-2xl tracking-wider select-none">
                    L
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Subtle tap hint */}
          <p
            className={`mt-7 text-[11px] uppercase tracking-[0.24em] text-[#9A8B84] transition-opacity duration-300 ${
              stage === 'opening' ? 'opacity-0' : 'opacity-100'
            }`}
          >
            Toca el sello para abrir
          </p>
        </div>
      )}

      {/* PHASE 3: Fine-Art Stationery Welcome Card */}
      {stage === 'card' && (
        <div className="lazo-card-reveal relative z-10 w-full max-w-[470px] bg-white/95 rounded-[2.25rem] p-3 sm:p-3.5 border border-[#EAE0D8] shadow-[0_32px_72px_-30px_rgba(43,40,38,0.14)]">
          <div className="rounded-[1.65rem] border border-[#F1E8E2] bg-gradient-to-b from-white via-[#FFFDFB] to-[#FAF5F2]/65 px-7 sm:px-11 py-11 sm:py-14 text-center flex flex-col items-center">
            {/* Official LAZO Crest — larger & focal */}
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

            {/* Clean, non-redundant greeting in true Marcellus serif */}
            <h1 className="font-editorial text-[2.35rem] sm:text-[2.85rem] text-[#2B2826] leading-[1.12] tracking-[-0.01em]">
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
      )}
    </div>
  );
};
