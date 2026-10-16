import React, { useState, useRef } from 'react';
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
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios.');
    } finally {
      setSubmitting(false);
    }
  };

  const initialLetter = (name || user.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] rounded-3xl max-w-md w-full border border-[#EAE3DA] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE3DA] bg-[#FCFAF7] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#EFE2DF] text-[#8A574E] flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#332A28] text-base">Mi Perfil y Contraseña</h3>
              <p className="text-[11px] text-[#7D6F6B]">Configuración de cuenta en LAZO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#7D6F6B] hover:text-[#332A28] hover:bg-[#FAF8F5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* AVATAR SELECTOR / UPLOAD */}
          <div className="flex flex-col items-center justify-center pb-3 border-b border-[#EAE3DA]">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#9C665C] shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#EFE2DF] text-[#8A574E] font-serif font-bold text-3xl flex items-center justify-center border-2 border-[#EAE3DA] shadow-xs">
                  {initialLetter}
                </div>
              )}

              {/* Online Dot */}
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#6E8C70] border-2 border-white shadow-2xs" />

              {/* Change Button Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition cursor-pointer"
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

            <div className="flex items-center space-x-3 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl border border-[#EAE3DA] bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[11px] font-semibold text-[#8A574E] flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5 text-[#9C665C]" />
                <span>Subir foto</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-[11px] font-semibold text-red-700 flex items-center space-x-1 transition cursor-pointer"
                  title="Eliminar foto personalizada"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                  <span>Quitar foto</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-[#7D6F6B] mt-1.5">
              JPG, PNG o WebP. Se ajustará automáticamente a formato redondo.
            </p>
          </div>

          {/* BASIC INFO */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-[#332A28] mb-1">Nombre Completo *</label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl focus:outline-none focus:border-[#9C665C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#332A28] mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-[#FAF8F5] border border-[#EAE3DA] rounded-xl text-[#7D6F6B] cursor-not-allowed"
                    title="El correo no se puede cambiar directamente"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#332A28] mb-1">Teléfono / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
                  <input
                    type="tel"
                    placeholder="+52 81 1234 5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl focus:outline-none focus:border-[#9C665C]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-[#7D6F6B] bg-[#FCFAF7] p-2.5 rounded-xl border border-[#EAE3DA]">
              <ShieldCheck className="w-4 h-4 text-[#9C665C] shrink-0" />
              <span>Rol actual: <strong className="text-[#332A28] uppercase">{user.role}</strong></span>
            </div>
          </div>

          {/* PASSWORD CHANGE */}
          <div className="space-y-3 pt-3 border-t border-[#EAE3DA]">
            <div className="flex items-center space-x-1.5 text-[#332A28]">
              <Lock className="w-4 h-4 text-[#9C665C]" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Cambiar Contraseña
              </span>
            </div>
            <p className="text-[11px] text-[#7D6F6B]">
              Deja estos campos vacíos si solo deseas actualizar tu foto o datos.
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
                    className="w-full text-xs px-3 pr-8 py-2 bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl focus:outline-none focus:border-[#9C665C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28]"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#332A28] mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full text-xs px-3 pr-8 py-2 bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl focus:outline-none focus:border-[#9C665C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28]"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#332A28] mb-1">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full text-xs px-3 pr-8 py-2 bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl focus:outline-none focus:border-[#9C665C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D6F6B] hover:text-[#332A28]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-[#EAE3DA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#EAE3DA] text-xs font-semibold text-[#7D6F6B] hover:text-[#332A28]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#9C665C] hover:bg-[#85534A] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
