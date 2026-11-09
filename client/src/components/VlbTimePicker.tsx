import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check, X } from 'lucide-react';

interface VlbTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '10', '20', '30', '40', '50'];
const PERIODS = ['AM', 'PM'] as const;

const QUICK_PRESETS = [
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM'
];

export function parseTimeToParts(val: string | null | undefined): {
  hour: string;
  minute: string;
  ampm: 'AM' | 'PM';
  isDefined: boolean;
} {
  if (!val || typeof val !== 'string' || !val.trim() || /^por\s*def/i.test(val.trim())) {
    return { hour: '04', minute: '00', ampm: 'PM', isDefined: false };
  }

  const clean = val.trim();

  // 12-hour or 24-hour match
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*([aApP][mM])?$/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2] || '0', 10);
    let period: 'AM' | 'PM' = 'PM';

    if (match[3]) {
      period = match[3].toUpperCase() as 'AM' | 'PM';
    } else {
      if (h >= 13 && h <= 23) {
        h = h - 12;
        period = 'PM';
      } else if (h === 12) {
        period = 'PM';
      } else if (h >= 1 && h <= 9) {
        period = 'PM';
      } else {
        period = 'AM';
      }
    }

    if (h === 0) h = 12;
    if (h > 12) h = h % 12 || 12;

    // Round to nearest 10-minute increment: 00, 10, 20, 30, 40, 50
    const roundedM = Math.round(m / 10) * 10;
    const finalM = roundedM >= 60 ? 50 : roundedM;

    return {
      hour: String(h).padStart(2, '0'),
      minute: String(finalM).padStart(2, '0'),
      ampm: period,
      isDefined: true
    };
  }

  return { hour: '04', minute: '00', ampm: 'PM', isDefined: false };
}

export const VlbTimePicker: React.FC<VlbTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Ej. 04:00 PM o Por definir'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = parseTimeToParts(value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    const newTime = `${h}:${parsed.minute} ${parsed.ampm}`;
    onChange(newTime);
  };

  const handleSelectMinute = (m: string) => {
    const newTime = `${parsed.hour}:${m} ${parsed.ampm}`;
    onChange(newTime);
  };

  const handleSelectPeriod = (p: 'AM' | 'PM') => {
    const newTime = `${parsed.hour}:${parsed.minute} ${p}`;
    onChange(newTime);
  };

  const handleClear = () => {
    onChange('Por definir');
    setIsOpen(false);
  };

  const displayTime = parsed.isDefined
    ? `${parsed.hour}:${parsed.minute} ${parsed.ampm}`
    : (value && !/^por\s*def/i.test(value) ? value : 'Por definir');

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button / Input-like display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-[#FCFAF7] hover:bg-[#F9F5F0] border border-[#EAE3DA] focus:border-[#9C665C] rounded-xl text-left transition cursor-pointer shadow-2xs"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <Clock className={`w-4 h-4 shrink-0 ${parsed.isDefined ? 'text-[#9C665C]' : 'text-[#A0938F]'}`} />
          {parsed.isDefined ? (
            <span className="font-semibold text-[#332A28] tracking-wide font-mono text-sm">
              {displayTime}
            </span>
          ) : (
            <span className="text-[#8F817D] italic text-xs">
              {displayTime === 'Por definir' ? 'Por definir' : placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {parsed.isDefined && (
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider text-[#9C665C] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#EAE3DA]">
              {parsed.ampm}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-[#A0938F] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#9C665C]' : ''}`} />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#EAE3DA] p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#F7F3EE]">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-[#9C665C]" />
              <span className="text-xs font-bold text-[#70443D] uppercase tracking-wider">
                Seleccionar Horario
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-medium text-[#8F817D] hover:text-[#C83460] hover:underline cursor-pointer transition"
            >
              Marcar por definir
            </button>
          </div>

          {/* Time Picker Columns (Hora | Minutos en intervalos de 10 | AM-PM) */}
          <div className="grid grid-cols-3 gap-2">
            {/* Hours Column */}
            <div>
              <div className="text-[10px] font-bold text-[#8F817D] uppercase tracking-wider mb-1.5 text-center">
                Hora
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-0.5">
                {HOURS.map(h => {
                  const isSelected = parsed.hour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#9C665C] text-white shadow-2xs'
                          : 'bg-[#FCFAF7] hover:bg-[#F6ECE8] text-[#4A3B32]'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column (00, 10, 20, 30, 40, 50 - STRICTLY 10 min increments!) */}
            <div>
              <div className="text-[10px] font-bold text-[#8F817D] uppercase tracking-wider mb-1.5 text-center">
                Minutos (10m)
              </div>
              <div className="space-y-1">
                {MINUTES.map(m => {
                  const isSelected = parsed.minute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#E84E6D] text-white shadow-2xs'
                          : 'bg-[#FFF6F8] hover:bg-[#FEEBF0] text-[#70443D] border border-[#F5C2CD]'
                      }`}
                    >
                      :{m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period Column (AM / PM) */}
            <div>
              <div className="text-[10px] font-bold text-[#8F817D] uppercase tracking-wider mb-1.5 text-center">
                Período
              </div>
              <div className="space-y-1.5">
                {PERIODS.map(p => {
                  const isSelected = parsed.ampm === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPeriod(p)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition tracking-wider text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#332A28] text-white shadow-2xs'
                          : 'bg-[#FCFAF7] hover:bg-[#F0EAE1] text-[#70443D] border border-[#EAE3DA]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-[#F7F3EE]">
            <div className="text-[10px] font-bold text-[#8F817D] uppercase tracking-wider mb-1.5">
              Horarios Habituales
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_PRESETS.map(preset => {
                const isSelected = displayTime.toUpperCase() === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onChange(preset);
                      setIsOpen(false);
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#9C665C] text-white font-bold'
                        : 'bg-[#FCFAF7] hover:bg-[#F6ECE8] text-[#70443D] border border-[#EAE3DA]'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 bg-[#FCFAF7] hover:bg-[#F0EAE1] text-[#70443D] text-xs font-semibold rounded-xl border border-[#EAE3DA] transition cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
