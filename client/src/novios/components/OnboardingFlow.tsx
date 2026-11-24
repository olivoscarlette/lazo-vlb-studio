import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Sparkles } from 'lucide-react';
import { DEFAULT_COVER_PHOTOS } from '../data/seedWedding';
import { WeddingProfile } from '../types/lazo';

interface OnboardingFlowProps {
  onComplete: (profile: WeddingProfile) => void;
  onBack: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onBack }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const defaultDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 10);
    return d.toISOString().split('T')[0];
  };

  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [weddingDate, setWeddingDate] = useState(defaultDate());
  const [city, setCity] = useState('');
  const [budgetGoal, setBudgetGoal] = useState('350000');
  const [estimatedGuests, setEstimatedGuests] = useState('120');
  const [coverPhoto, setCoverPhoto] = useState(DEFAULT_COVER_PHOTOS[0].url);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinish = () => {
    const p1 = partner1.trim() || 'Novia';
    const p2 = partner2.trim() || 'Novio';
    onComplete({
      partner1: p1,
      partner2: p2,
      weddingDate,
      city: city.trim() || 'México',
      budgetGoal: Math.max(10000, Number(budgetGoal) || 350000),
      estimatedGuests: Math.max(10, Number(estimatedGuests) || 120),
      coverPhoto,
      coverPositionY: 50,
      partnerInviteCode: `${p1.toUpperCase().slice(0, 5)}-${p2.toUpperCase().slice(0, 5)}-${new Date().getFullYear()}`
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-9 border border-[#EFE8E1] shadow-sm space-y-6">
        {/* Progress Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step === 1 ? onBack() : setStep((step - 1) as 1 | 2))}
            className="inline-flex items-center gap-1 text-xs text-[#7D6F6B] hover:text-[#2B2826] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Atrás</span>
          </button>
          <span className="font-editorial text-base tracking-[0.25em] text-[#2B2826]">LAZO</span>
          <span className="text-[11px] font-medium text-[#7D6F6B]">Paso {step} de 3</span>
        </div>

        {/* Hairline progress bar */}
        <div className="h-1 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C48B81] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#C48B81]">
                ¡Felicidades por su compromiso!
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl text-[#2B2826] mt-1">
                Empecemos por lo más bonito
              </h2>
              <p className="text-xs text-[#7D6F6B] mt-1 font-light">
                Con tu fecha calcularemos automáticamente todo tu checklist.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-medium text-[#7D6F6B] mb-1.5">
                  Tu nombre
                </label>
                <input
                  type="text"
                  placeholder="Ej. Sofía"
                  value={partner1}
                  onChange={e => setPartner1(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-medium text-[#7D6F6B] mb-1.5">
                  Nombre de tu pareja
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mateo"
                  value={partner2}
                  onChange={e => setPartner2(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-medium text-[#7D6F6B] mb-1.5">
                  Fecha estimada de la boda
                </label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={e => setWeddingDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-medium text-[#7D6F6B] mb-1.5">
                  Ciudad o destino
                </label>
                <input
                  type="text"
                  placeholder="Ej. Monterrey / CDMX"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-full bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Continuar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#C48B81]">
                Tu panorama inicial
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl text-[#2B2826] mt-1">
                Presupuesto e invitados
              </h2>
              <p className="text-xs text-[#7D6F6B] mt-1 font-light">
                No tiene que ser exacto, podrás ajustarlo cuando quieras.
              </p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-medium text-[#7D6F6B] mb-1.5">
                Presupuesto meta (MXN)
              </label>
              <input
                type="number"
                value={budgetGoal}
                onChange={e => setBudgetGoal(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['150000', '250000', '400000', '600000'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBudgetGoal(preset)}
                    className={`px-3 py-1 rounded-full text-[11px] border transition cursor-pointer ${
                      budgetGoal === preset
                        ? 'bg-[#2B2826] text-white border-[#2B2826]'
                        : 'bg-white text-[#7D6F6B] border-[#EFE8E1] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    ${Number(preset).toLocaleString('es-MX')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-medium text-[#7D6F6B] mb-1.5">
                Invitados aproximados
              </label>
              <input
                type="number"
                value={estimatedGuests}
                onChange={e => setEstimatedGuests(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-sm focus:outline-none focus:border-[#C48B81]"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full py-3 rounded-full bg-[#2B2826] hover:bg-[#181514] text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Siguiente paso</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#C48B81]">
                El toque personal
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl text-[#2B2826] mt-1">
                Elige tu foto de portada
              </h2>
              <p className="text-xs text-[#7D6F6B] mt-1 font-light">
                Sube una foto de ustedes o elige una portada editorial para empezar.
              </p>
            </div>

            {/* Preview */}
            <div className="relative h-44 rounded-2xl overflow-hidden border border-[#EFE8E1]">
              <img src={coverPhoto} alt="Portada" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col items-center justify-center text-white">
                <div className="font-editorial text-2xl tracking-wide">
                  {(partner1 || 'SOFÍA').toUpperCase()} & {(partner2 || 'MATEO').toUpperCase()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {DEFAULT_COVER_PHOTOS.map(photo => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setCoverPhoto(photo.url)}
                  className={`relative h-16 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                    coverPhoto === photo.url ? 'border-[#C48B81]' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                  {coverPhoto === photo.url && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C48B81] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <label className="w-full py-2.5 rounded-full bg-[#FAF8F5] hover:bg-[#EFE8E1] border border-[#EFE8E1] text-xs font-medium text-[#2B2826] inline-flex items-center justify-center gap-2 cursor-pointer transition">
              <Camera className="w-3.5 h-3.5 text-[#C48B81]" />
              <span>Subir foto desde mi celular o computadora</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3.5 rounded-full bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium inline-flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Crear mi espacio de boda</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
