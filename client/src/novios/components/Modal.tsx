import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-md',
  children
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className={`bg-white rounded-3xl ${maxWidthClass} w-full p-6 shadow-2xl border border-[#EFE8E1] max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-editorial text-2xl text-[#2B2826] leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-[#8A7E72] mt-1 font-light">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8A7E72] hover:text-[#2B2826] hover:bg-[#FAF8F5] transition cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
