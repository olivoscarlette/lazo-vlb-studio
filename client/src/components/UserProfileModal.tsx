import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  X, Camera, Lock, User as UserIcon, Phone, Mail,
  Check, AlertCircle, Eye, EyeOff, ShieldCheck, Trash2
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, token, refreshUserData } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or user data changes
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar_url || null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  // Compress & crop image to 300x300 for sharp, lightweight avatar
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 300;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Cover crop centered
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(compressedBase64);
        setError('');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }
      if (user.role !== 'ADMINISTRADOR' && !currentPassword) {
        setError('Debes ingresar tu contraseña actual para confirmar el cambio.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl,
          current_password: currentPassword || undefined,
          new_password: newPassword ? newPassword.trim() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el perfil.');
      }

      setSuccess('¡Perfil y datos actualizados correctamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUserData();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios.');
    } finally {
      setSubmitting(false);
    }
  };

  const initialLetter = (name || user.name || 'U').charAt(0).toUpperCase();

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-[#2B2826]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-[#FFFFFF] rounded-3xl max-w-lg w-full border border-[#EFE8E1] shadow-2xl flex flex-col my-auto max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Always visible */}
        <div className="px-6 py-4 border-b border-[#EFE8E1] bg-[#FCFAF7] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-[#EFE2DF] text-[#A86B60] flex items-center justify-center shadow-2xs">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#332A28] text-base leading-tight">Mi Perfil y Contraseña</h3>
              <p className="text-[11px] text-[#7D6F6B]">Configuración de tu cuenta en LAZO</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF8F5] transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-[#E5EDE6] border border-[#D5E2D7] rounded-xl text-[#384C3A] text-xs flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0 text-[#384C3A]" />
                <span>{success}</span>
              </div>
            )}

            {/* AVATAR SELECTOR / UPLOAD */}
            <div className="flex flex-col items-center justify-center pb-4 border-b border-[#EFE8E1]">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#C48B81] shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#EFE2DF] text-[#A86B60] font-serif font-bold text-3xl flex items-center justify-center border-2 border-[#EFE8E1] shadow-xs">
                    {initialLetter}
                  </div>
                )}

                {/* Online Dot */}
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#6E8C70] border-2 border-white shadow-2xs" />

                {/* Change Button Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition cursor-pointer"
                  title="Cambiar foto de perfil"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-semibold">Cambiar</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <div className="flex items-center space-x-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl border border-[#EFE8E1] bg-[#FAF8F5] hover:bg-[#F3ECE2] text-xs font-semibold text-[#A86B60] flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-[#C48B81]" />
                  <span>Subir foto</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-xl border border-[#ECD9D5] bg-[#F7EDEB] hover:bg-[#F3DCD7] text-xs font-semibold text-[#A86B60] flex items-center space-x-1 transition cursor-pointer"
                    title="Eliminar foto personalizada"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#C48B81]" />
                    <span>Quitar foto</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#7D6F6B] mt-1.5 text-center">
                JPG, PNG o WebP. Se ajustará automáticamente en formato circular.
              </p>
            </div>

            {/* BASIC INFO */}
            <div className="space-y-3.5">
              <div>
                <label className="block font-semibold text-[#332A28] mb-1">Nombre Completo *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#EFE8E1] rounded-xl text-[#7D6F6B] cursor-not-allowed select-none"
                      title="El correo no se puede cambiar directamente"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                    <input
                      type="tel"
                      placeholder="+52 81 1234 5678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-[#7D6F6B] bg-[#FCFAF7] p-2.5 rounded-xl border border-[#EFE8E1]">
                <ShieldCheck className="w-4 h-4 text-[#C48B81] shrink-0" />
                <span>Rol en la plataforma: <strong className="text-[#332A28] uppercase">{user.role}</strong></span>
              </div>
            </div>

            {/* PASSWORD CHANGE */}
            <div className="space-y-3 pt-3 border-t border-[#EFE8E1]">
              <div className="flex items-center space-x-1.5 text-[#332A28]">
                <Lock className="w-4 h-4 text-[#C48B81]" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Cambiar Contraseña
                </span>
              </div>
              <p className="text-[11px] text-[#7D6F6B]">
                Deja estos campos vacíos si solo deseas actualizar tu foto o datos de contacto.
              </p>

              {user.role !== 'ADMINISTRADOR' && (
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Contraseña Actual *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full text-xs px-3 pr-9 py-2 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28] cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full text-xs px-3 pr-9 py-2 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28] cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#332A28] mb-1">Confirmar Contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full text-xs px-3 pr-9 py-2 bg-[#FFFFFF] border border-[#EFE8E1] rounded-xl focus:outline-none focus:border-[#C48B81]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28] cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Always visible */}
          <div className="px-6 py-4 bg-[#FCFAF7] border-t border-[#EFE8E1] flex items-center justify-end space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#EFE8E1] text-xs font-semibold text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF8F5] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#C48B81] hover:bg-[#85534A] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
