import React, { useState, useEffect } from 'react';
import { Smartphone, Share, PlusSquare, MoreVertical, Download, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onTriggerNativeInstall?: () => Promise<void>;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerNativeInstall
}) => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android')) {
        setPlatform('android');
      } else {
        setPlatform('ios');
      }
    }
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lleva Lazo en tu celular"
      subtitle="Agrégalo a tu pantalla de inicio en 15 segundos para entrar en 1 toque, como una app real."
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {/* Mini visual preview of the app icon */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1]">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#EFE8E1] shadow-2xs flex items-center justify-center shrink-0 p-1.5">
            <img
              src="/lazo-logo.png"
              alt="Lazo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#2B2826]">LAZO · Studio Planning</div>
            <div className="text-[11px] text-[#7D6F6B] leading-snug mt-0.5">
              Sin ocupar espacio de almacenamiento y siempre actualizado en tiempo real.
            </div>
          </div>
        </div>

        {/* Direct native install button if supported on Android/Desktop Chrome */}
        {deferredPrompt && onTriggerNativeInstall && (
          <button
            type="button"
            onClick={onTriggerNativeInstall}
            className="w-full py-3 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-semibold uppercase tracking-wider shadow-2xs transition cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Instalar Lazo ahora</span>
          </button>
        )}

        {/* Platform Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-full bg-[#FAF8F5] border border-[#EFE8E1]">
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              platform === 'ios'
                ? 'bg-[#2B2826] text-white shadow-2xs'
                : 'text-[#7D6F6B] hover:text-[#2B2826]'
            }`}
          >
            iPhone (Safari)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              platform === 'android'
                ? 'bg-[#2B2826] text-white shadow-2xs'
                : 'text-[#7D6F6B] hover:text-[#2B2826]'
            }`}
          >
            Android (Chrome)
          </button>
        </div>

        {/* Step-by-step instructions */}
        {platform === 'ios' ? (
          <ol className="space-y-2.5 text-xs">
            <li className="flex items-start gap-3 p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
              <span className="w-6 h-6 rounded-full bg-[#F7EDEB] text-[#A86B60] font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <div className="space-y-0.5">
                <div className="font-semibold text-[#2B2826] flex items-center gap-1.5">
                  <span>Toca el botón Compartir en Safari</span>
                  <Share className="w-3.5 h-3.5 text-[#C48B81] inline" />
                </div>
                <p className="text-[11px] text-[#7D6F6B] leading-relaxed">
                  Es el cuadrito con la flecha hacia arriba en la barra inferior de Safari.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
              <span className="w-6 h-6 rounded-full bg-[#F7EDEB] text-[#A86B60] font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <div className="space-y-0.5">
                <div className="font-semibold text-[#2B2826] flex items-center gap-1.5">
                  <span>Elige «Agregar a inicio»</span>
                  <PlusSquare className="w-3.5 h-3.5 text-[#C48B81] inline" />
                </div>
                <p className="text-[11px] text-[#7D6F6B] leading-relaxed">
                  Desliza un poco hacia abajo en el menú hasta ver el ícono con el signo <strong>+</strong>.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
              <span className="w-6 h-6 rounded-full bg-[#E5EDE6] text-[#354B38] font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </span>
              <div className="space-y-0.5">
                <div className="font-semibold text-[#2B2826] flex items-center gap-1.5">
                  <span>Toca «Agregar» arriba a la derecha</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#577355] inline" />
                </div>
                <p className="text-[11px] text-[#7D6F6B] leading-relaxed">
                  ¡Listo! Ya verás el ícono de <strong>LAZO</strong> en tu pantalla junto a tus demás apps.
                </p>
              </div>
            </li>
          </ol>
        ) : (
          <ol className="space-y-2.5 text-xs">
            <li className="flex items-start gap-3 p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
              <span className="w-6 h-6 rounded-full bg-[#F7EDEB] text-[#A86B60] font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <div className="space-y-0.5">
                <div className="font-semibold text-[#2B2826] flex items-center gap-1.5">
                  <span>Abre el menú de Chrome</span>
                  <MoreVertical className="w-3.5 h-3.5 text-[#C48B81] inline" />
                </div>
                <p className="text-[11px] text-[#7D6F6B] leading-relaxed">
                  Toca los 3 puntitos verticales en la esquina superior derecha.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
              <span className="w-6 h-6 rounded-full bg-[#F7EDEB] text-[#A86B60] font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <div className="space-y-0.5">
                <div className="font-semibold text-[#2B2826] flex items-center gap-1.5">
                  <span>Selecciona «Instalar aplicación»</span>
                  <Smartphone className="w-3.5 h-3.5 text-[#C48B81] inline" />
                </div>
                <p className="text-[11px] text-[#7D6F6B] leading-relaxed">
                  También puede aparecer como <strong>«Agregar a la pantalla principal»</strong>.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 p-3 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1]">
              <span className="w-6 h-6 rounded-full bg-[#E5EDE6] text-[#354B38] font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </span>
              <div className="space-y-0.5">
                <div className="font-semibold text-[#2B2826] flex items-center gap-1.5">
                  <span>Confirma en «Instalar»</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#577355] inline" />
                </div>
                <p className="text-[11px] text-[#7D6F6B] leading-relaxed">
                  ¡Listo! Tendrás <strong>LAZO</strong> en tu celular como una aplicación nativa.
                </p>
              </div>
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-full bg-[#2B2826] hover:bg-[#191716] text-white text-xs font-medium transition cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </Modal>
  );
};
