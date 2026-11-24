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
  const [stage, setStage] = useState<'envelope' | 'flap' | 'reveal' | 'card'>('envelope');
  const [exiting, setExiting] = useState(false);

  const days = daysUntil(profile.weddingDate);
  const isNonWedding = Boolean(
    profile.eventType && !profile.eventType.toLowerCase().includes('boda')
  );
  const hasPartner2 = Boolean(profile.partner2 && profile.partner2.trim());

  const handleOpenEnvelope = () => {
    if (stage !== 'envelope') return;
    setStage('flap');
    setTimeout(() => {
      setStage('reveal');
    }, 340);
    setTimeout(() => {
      setStage('card');
    }, 920);
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
      className={`min-h-screen bg-[#F2EAE3] flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden transition-all duration-300 ease-out ${
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
            transform: translateY(28px) scale(0.97);
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
        @keyframes lazoEnvelopeFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes lazoSealBreathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.035);
          }
        }
        .lazo-card-reveal {
          animation: lazoCardReveal 740ms cubic-bezier(0.22, 1, 0.36, 1) both;
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
        .lazo-envelope-float {
          animation: lazoEnvelopeFloat 5.5s ease-in-out infinite;
        }
        .lazo-seal-breathe {
          animation: lazoSealBreathe 3.2s ease-in-out infinite;
        }
        .lazo-flap-closed {
          transform-origin: top center;
          transform: scaleY(1);
          transition: transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease;
        }
        .lazo-flap-folding {
          transform-origin: top center;
          transform: scaleY(0);
          transition: transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease;
        }
        .lazo-flap-opened-back {
          transform-origin: top center;
          transform: scaleY(-0.86);
          transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 360ms ease;
        }
        .lazo-cotton-paper {
          background-color: #FFFDF9;
          background-image:
            radial-gradient(circle at 20% 15%, rgba(255,255,255,0.9) 0%, transparent 55%),
            radial-gradient(circle at 85% 90%, rgba(226,210,198,0.22) 0%, transparent 55%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Soft living blush & warm daylight aura */}
      <div
        aria-hidden="true"
        className="lazo-aura-a pointer-events-none absolute -top-24 left-1/2 w-[580px] h-[580px] rounded-full bg-[#EFE0DC]/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="lazo-aura-b pointer-events-none absolute -bottom-32 right-1/4 w-[460px] h-[460px] rounded-full bg-[#EFE5DA]/80 blur-3xl"
      />

      {/* PHASE 1 & 2: Fine-Art Cotton-Paper European Envelope with Real Wax Seal */}
      {stage !== 'card' && (
        <div
          className={`relative z-10 flex flex-col items-center w-full max-w-[460px] transition-all duration-500 ${
            stage === 'reveal' ? 'translate-y-3' : ''
          }`}
        >
          {/* Official LAZO crest above */}
          <img
            src="/lazo-logo.png"
            alt="LAZO — Studio Planning"
            className={`h-13 sm:h-15 w-auto object-contain select-none mb-8 transition-all duration-400 ${
              stage !== 'envelope' ? 'opacity-0 -translate-y-2' : 'opacity-95'
            }`}
          />

          {/* Interactive Fine-Art European Wedding Envelope */}
          <button
            type="button"
            onClick={handleOpenEnvelope}
            aria-label="Abrir sobre de invitación"
            className={`group relative w-full aspect-[1.5/1] cursor-pointer focus:outline-none ${
              stage === 'envelope' ? 'lazo-envelope-float' : ''
            }`}
          >
            {/* Opened flap resting cleanly BEHIND the card (z-0, pure 2D so zero Safari z-fighting) */}
            <div
              className={`absolute inset-x-0 top-0 h-[60%] z-0 pointer-events-none ${
                stage === 'reveal'
                  ? 'lazo-flap-opened-back opacity-70'
                  : 'lazo-flap-folding opacity-0'
              }`}
            >
              <svg
                viewBox="0 0 460 190"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                <path
                  d="M 0 0 L 460 0 L 243 176 Q 230 186 217 176 L 0 0 Z"
                  fill="#F3E5E0"
                  stroke="#E4D7CC"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Soft blush-ivory inner envelope liner visible once flap opens */}
            <div
              className={`absolute inset-0 rounded-[4px] bg-gradient-to-b from-[#F4E6E1] to-[#FAF3EE] border border-[#E5D7CC] z-[5] transition-opacity duration-400 ${
                stage === 'reveal' ? 'opacity-90' : stage === 'flap' ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Inner stationery card rising cleanly IN FRONT of the opened flap */}
            <div
              className={`absolute left-[7%] right-[7%] top-[8%] bottom-[10%] rounded-[4px] bg-[#FFFEFC] border border-[#EAE0D7] shadow-[0_22px_48px_-14px_rgba(43,40,38,0.18)] flex flex-col items-center justify-center px-6 z-20 transition-all duration-500 ease-out ${
                stage === 'reveal'
                  ? '-translate-y-16 opacity-100 scale-100'
                  : 'translate-y-4 opacity-0 scale-95'
              }`}
            >
              <img
                src="/lazo-logo.png"
                alt="LAZO"
                className="h-10 w-auto object-contain opacity-95 mb-2.5"
              />
              <span className="font-editorial text-xl text-[#2B2826]">
                {hasPartner2 && !isNonWedding ? 'Bienvenidos,' : 'Bienvenida,'}{' '}
                {recipientLabel}
              </span>
            </div>

            {/* Cotton-paper envelope body — crisp tailored corners (rounded-[4px]) */}
            <div
              className={`lazo-cotton-paper relative w-full h-full rounded-[4px] border border-[#E2D5C9] shadow-[0_38px_76px_-22px_rgba(43,40,38,0.26),0_12px_26px_-10px_rgba(43,40,38,0.12)] overflow-hidden transition-all duration-500 z-10 ${
                stage === 'reveal' ? 'opacity-25 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
            >
              {/* Delicate tailored paper seams (ultra-soft cotton tone shifts, NO harsh email X) */}
              <svg
                viewBox="0 0 460 306"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                <defs>
                  <linearGradient id="lazoLeftPocket" x1="0" y1="0" x2="1" y2="0.5">
                    <stop offset="0%" stopColor="#F8F3EC" />
                    <stop offset="100%" stopColor="#FFFDF9" />
                  </linearGradient>
                  <linearGradient id="lazoRightPocket" x1="1" y1="0" x2="0" y2="0.5">
                    <stop offset="0%" stopColor="#F5EEE6" />
                    <stop offset="100%" stopColor="#FDFBF7" />
                  </linearGradient>
                  <linearGradient id="lazoBottomPocket" x1="0.5" y1="1" x2="0.5" y2="0">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#F9F4EE" />
                  </linearGradient>
                </defs>

                {/* Subtle side flaps */}
                <polygon
                  points="0,0 160,153 0,306"
                  fill="url(#lazoLeftPocket)"
                  opacity="0.72"
                />
                <polygon
                  points="460,0 300,153 460,306"
                  fill="url(#lazoRightPocket)"
                  opacity="0.72"
                />
                {/* Soft horizontal bottom pocket seam */}
                <path
                  d="M 0 306 L 148 164 Q 230 154 312 164 L 460 306 Z"
                  fill="url(#lazoBottomPocket)"
                  stroke="#E8DDD3"
                  strokeWidth="0.9"
                />
              </svg>
            </div>

            {/* Closed front European Pointed V-Flap — folds cleanly up to 0 height before card rises */}
            <div
              className={`absolute inset-x-0 top-0 h-[62%] z-30 pointer-events-none ${
                stage === 'envelope'
                  ? 'lazo-flap-closed opacity-100'
                  : 'lazo-flap-folding opacity-0'
              }`}
            >
              <svg
                viewBox="0 0 460 190"
                preserveAspectRatio="none"
                className="w-full h-full drop-shadow-[0_12px_18px_rgba(43,40,38,0.10)]"
              >
                <defs>
                  <linearGradient id="lazoEuroFlap" x1="0.2" y1="0" x2="0.8" y2="1">
                    <stop offset="0%" stopColor="#FFFDFB" />
                    <stop offset="55%" stopColor="#FAF5EE" />
                    <stop offset="100%" stopColor="#F3EBE2" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 0 L 460 0 L 243 176 Q 230 186 217 176 L 0 0 Z"
                  fill="url(#lazoEuroFlap)"
                  stroke="#E5D9CE"
                  strokeWidth="1"
                />
                {/* Subtle embossed inner border line along the European flap */}
                <path
                  d="M 16 4 L 230 171 L 444 4"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity="0.65"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* REAL Photorealistic Hand-Poured Dusty-Rose Wax Seal */}
            <div
              className={`absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 z-40 transition-all duration-250 ${
                stage !== 'envelope'
                  ? 'opacity-0 scale-75 -translate-y-4 pointer-events-none'
                  : 'opacity-100 scale-100 group-hover:scale-105'
              }`}
            >
              <img
                src="/lazo-wax-seal.png"
                alt="Sello de lacre LAZO"
                className="lazo-seal-breathe w-[78px] h-[78px] sm:w-[88px] sm:h-[88px] object-contain select-none drop-shadow-[0_10px_18px_rgba(43,40,38,0.22)]"
                draggable={false}
              />
            </div>
          </button>

          {/* Subtle editorial prompt */}
          <p
            className={`mt-8 text-[10.5px] uppercase tracking-[0.28em] text-[#8F8078] transition-opacity duration-250 ${
              stage !== 'envelope' ? 'opacity-0' : 'opacity-100'
            }`}
          >
            Toca para abrir
          </p>
        </div>
      )}

      {/* PHASE 3: Fine-Art Cotton Stationery Welcome Card */}
      {stage === 'card' && (
        <div className="lazo-card-reveal relative z-10 w-full max-w-[470px] bg-white/95 rounded-[1.5rem] p-3 sm:p-3.5 border border-[#E7DDD4] shadow-[0_32px_72px_-30px_rgba(43,40,38,0.16)]">
          <div className="rounded-[1.1rem] border border-[#F0E6DE] bg-gradient-to-b from-white via-[#FFFDFB] to-[#FAF5F1]/70 px-7 sm:px-11 py-11 sm:py-14 text-center flex flex-col items-center">
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
