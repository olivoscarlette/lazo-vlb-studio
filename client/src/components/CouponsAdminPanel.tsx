import React, { useState, useEffect } from 'react';
import { Tag, Plus, Copy, Check, Trash2, Power } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  applicable_plan: 'ALL' | 'esencial' | 'pro';
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

interface CouponsAdminPanelProps {
  token: string | null;
}

export const CouponsAdminPanel: React.FC<CouponsAdminPanelProps> = ({ token }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENT' as 'PERCENT' | 'FIXED',
    discount_value: '20',
    applicable_plan: 'ALL' as 'ALL' | 'esencial' | 'pro',
    max_uses: '',
    expires_at: ''
  });

  const fetchCoupons = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/checkout/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.code.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/checkout/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          description: form.description.trim(),
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          applicable_plan: form.applicable_plan,
          max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
          expires_at: form.expires_at.trim() || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'No se pudo crear el código.' });
        return;
      }
      setFeedback({ type: 'success', text: `Código ${data.coupon.code} creado y activo en MercadoPago.` });
      setForm({
        code: '',
        description: '',
        discount_type: 'PERCENT',
        discount_value: '20',
        applicable_plan: 'ALL',
        max_uses: '',
        expires_at: ''
      });
      fetchCoupons();
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/checkout/coupons/${c.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !c.is_active })
      });
      if (res.ok) fetchCoupons();
    } catch {}
  };

  const handleDelete = async (c: Coupon) => {
    if (!token) return;
    if (!confirm(`¿Eliminar el código "${c.code}" permanentemente?`)) return;
    try {
      const res = await fetch(`/api/checkout/coupons/${c.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCoupons();
    } catch {}
  };

  const handleCopy = (c: Coupon) => {
    navigator.clipboard?.writeText(c.code).catch(() => {});
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const planLabel = (p: string) => {
    if (p === 'esencial') return 'Solo Plan Esencial';
    if (p === 'pro') return 'Solo Lazo Pro';
    return 'Todos los planes';
  };

  return (
    <div className="luxury-card bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8E1] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F5EFEB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C48B81]">
            <Tag className="w-3.5 h-3.5" />
            <span>Checkout MercadoPago · Promociones &amp; Upgrades</span>
          </div>
          <h3 className="font-editorial text-2xl text-[#2B2826] mt-1">
            Códigos de Descuento
          </h3>
          <p className="text-xs text-[#7D6F6B] mt-0.5">
            Crea cupones por porcentaje, monto fijo o cortesía (100%) para ex-novias, upgrades o referidas.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-[#E5EDE6] text-[#354B38] border border-[#CCDACC]'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="font-bold ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Formulario de creación */}
      <form onSubmit={handleCreate} className="bg-[#FAF8F5] rounded-2xl p-4 sm:p-5 border border-[#EFE8E1] space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D6F6B] mb-1">
              Código *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. EXNOVIA50"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs font-semibold uppercase tracking-wider focus:border-[#C48B81]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D6F6B] mb-1">
              Tipo de descuento
            </label>
            <select
              value={form.discount_type}
              onChange={e => setForm({ ...form, discount_type: e.target.value as 'PERCENT' | 'FIXED' })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs focus:border-[#C48B81]"
            >
              <option value="PERCENT">Porcentaje (%)</option>
              <option value="FIXED">Monto fijo ($ MXN)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D6F6B] mb-1">
              {form.discount_type === 'PERCENT' ? 'Porcentaje (1 - 100)' : 'Descuento en MXN'} *
            </label>
            <input
              type="number"
              required
              min={1}
              max={form.discount_type === 'PERCENT' ? 100 : 10000}
              value={form.discount_value}
              onChange={e => setForm({ ...form, discount_value: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs focus:border-[#C48B81]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D6F6B] mb-1">
              Aplica para
            </label>
            <select
              value={form.applicable_plan}
              onChange={e => setForm({ ...form, applicable_plan: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs focus:border-[#C48B81]"
            >
              <option value="ALL">Todos los planes</option>
              <option value="esencial">Solo Plan Esencial ($990)</option>
              <option value="pro">Solo Lazo Pro ($1,990)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D6F6B] mb-1">
              Nota interna (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Upgrade de despedida a boda"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs focus:border-[#C48B81]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D6F6B] mb-1">
              Límite de usos (opcional)
            </label>
            <input
              type="number"
              min={1}
              placeholder="Ilimitado"
              value={form.max_uses}
              onChange={e => setForm({ ...form, max_uses: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs focus:border-[#C48B81]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D6F6B] mb-1">
              Vigencia hasta (opcional)
            </label>
            <input
              type="date"
              value={form.expires_at}
              onChange={e => setForm({ ...form, expires_at: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#EFE8E1] text-xs focus:border-[#C48B81]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#2B2826] hover:bg-[#1E1B19] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5B7AE]" />
            <span>{saving ? 'Guardando...' : 'Crear Código'}</span>
          </button>
        </div>
      </form>

      {/* Lista de códigos */}
      {loading ? (
        <div className="text-xs text-[#7D6F6B] py-4 text-center">Cargando códigos...</div>
      ) : coupons.length === 0 ? (
        <div className="text-xs text-[#7D6F6B] py-6 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EFE8E1]">
          Aún no tienes códigos creados. Crea el primero arriba (por ejemplo <strong className="text-[#2B2826]">EXNOVIA50</strong> o <strong className="text-[#2B2826]">UPGRADE990</strong>).
        </div>
      ) : (
        <div className="divide-y divide-[#F5EFEB] border border-[#EFE8E1] rounded-2xl overflow-hidden bg-white">
          {coupons.map(c => (
            <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] transition">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold tracking-wider text-[#2B2826]">
                    {c.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7EDEB] text-[#A86B60]">
                    {c.discount_type === 'PERCENT'
                      ? `${c.discount_value}% OFF`
                      : `−$${Number(c.discount_value).toLocaleString('es-MX')} MXN`}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      c.is_active ? 'bg-[#E5EDE6] text-[#354B38]' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {c.is_active ? 'Activo' : 'Pausado'}
                  </span>
                  <span className="text-[11px] text-[#7D6F6B]">{planLabel(c.applicable_plan)}</span>
                </div>
                <div className="text-[11px] text-[#7D6F6B] flex items-center gap-2 flex-wrap">
                  {c.description && <span>{c.description} ·</span>}
                  <span>
                    Usos: <strong className="text-[#2B2826]">{c.used_count || 0}</strong>
                    {c.max_uses ? ` / ${c.max_uses}` : ' (ilimitado)'}
                  </span>
                  {c.expires_at && <span>· Vigencia: {c.expires_at}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(c)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#EFE8E1] border border-[#EFE8E1] text-[11px] font-medium text-[#2B2826] transition cursor-pointer"
                  title="Copiar código"
                >
                  {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-[#354B38]" /> : <Copy className="w-3.5 h-3.5 text-[#7D6F6B]" />}
                  <span>{copiedId === c.id ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(c)}
                  className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EFE8E1] border border-[#EFE8E1] text-[#7D6F6B] hover:text-[#2B2826] transition cursor-pointer"
                  title={c.is_active ? 'Pausar código' : 'Activar código'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c)}
                  className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-rose-50 border border-[#EFE8E1] text-[#7D6F6B] hover:text-rose-600 transition cursor-pointer"
                  title="Eliminar código"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
