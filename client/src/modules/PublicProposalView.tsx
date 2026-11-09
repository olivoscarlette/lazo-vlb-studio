import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, CheckCircle2, AlertCircle, Heart,
  Sparkles, Calendar, MapPin, Tag, ShieldCheck, PenTool, RotateCcw, Clock,
  CreditCard, MessageSquare
} from 'lucide-react';
import { VlbQuote, VlbQuoteItem } from '../types/vlb';
import { generateVlbQuotePdf, getContractClauses, standardizeEventTime } from '../utils/vlbPdfGenerator';

interface PublicProposalViewProps {
  token: string;
}

export const PublicProposalView: React.FC<PublicProposalViewProps> = ({ token }) => {
  const [quote, setQuote] = useState<VlbQuote | null>(null);
  const [items, setItems] = useState<VlbQuoteItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signature States
  const [signerName, setSignerName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [token]);

  const loadProposal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vlb/quotes/public/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'No se pudo cargar la propuesta.');
      }
      const data = await res.json();
      setQuote(data.quote);
      setItems(data.items || []);
      setPayments(data.payments || []);
      if (data.quote?.client_name) {
        setSignerName(data.quote.client_name);
      }
      if (data.quote?.signature_data) {
        setSignSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // CANVAS DRAWING (TOUCH & MOUSE)
  // ----------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to displayed size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#222222';
  }, [quote, signSuccess]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignError(null);

    if (!signerName.trim()) {
      setSignError('Por favor ingresa tu nombre completo para autorizar la propuesta.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      setSignError('Por favor dibuja tu firma en el recuadro antes de autorizar.');
      return;
    }

    const signatureData = canvas.toDataURL('image/png');

    setSigning(true);
    try {
      const res = await fetch(`/api/vlb/quotes/public/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_data: signatureData,
          signer_name: signerName.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al procesar la firma digital.');
      }

      setSignSuccess(true);
      loadProposal();
    } catch (err: any) {
      setSignError(err.message || 'Error al autorizar.');
    } finally {
      setSigning(false);
    }
  };

  // ----------------------------------------
  // FORMATTERS
  // ----------------------------------------
  const formatDateMX = (dateStr?: string | null): string => {
    if (!dateStr) return 'Por definir';
    const clean = dateStr.trim();
    const parts = clean.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthIdx = parseInt(month, 10) - 1;
      const monthName = months[monthIdx] || month;
      return `${parseInt(day, 10)} ${monthName} ${year}`;
    }
    return dateStr;
  };

  const formatFolio = (folio?: string): string => {
    if (!folio) return 'VLB-PROP';
    return folio.replace(/^ORD-VLB-\d{4}-/, 'VLB-').replace(/^ORD-VLB-/, 'VLB-');
  };

  // ----------------------------------------
  // FINANCIAL CALCULATIONS (REGLA DE NEGOCIO EXACTA)
  // ----------------------------------------
  // En servicios la separación es de $1,000.
  // Papelería se liquida al entregar el pedido o al programar envío.
  // Servicios se liquida 10 días antes del evento.
  const hasPapeleria = items.some(i => i.category === 'PAPELERIA');
  const hasServicios = items.some(i => i.category === 'STANDS_EXPERIENCIAS');

  const papeleriaSubtotal = items
    .filter(i => i.category === 'PAPELERIA')
    .reduce((sum, i) => sum + i.total_price, 0);

  const serviciosSubtotal = items
    .filter(i => i.category === 'STANDS_EXPERIENCIAS')
    .reduce((sum, i) => sum + i.total_price, 0);

  const totalCalculated = quote ? quote.total : (papeleriaSubtotal + serviciosSubtotal);

  // Regla estricta: uno u otro (Servicios = $1,000 | Papelería = 50%)
  const isServiceProposal = Boolean(
    quote?.quote_number?.startsWith('SV-') ||
    quote?.down_payment_amount === 1000 ||
    hasServicios ||
    items.some(i => i.pricing_type === 'FIXED_EVENT')
  );
  const downPaymentRequired = isServiceProposal
    ? Math.min(1000, totalCalculated)
    : Math.round(totalCalculated * 0.5);

  // Pagos en vivo registrados desde el CRM / Pedidos
  const totalPaid = Number(quote?.total_paid) || (payments.length > 0 ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0);
  const remainingAfterPaid = Math.max(0, totalCalculated - totalPaid);
  const balancePending = totalPaid > 0 ? remainingAfterPaid : Math.max(0, totalCalculated - downPaymentRequired);
  const isLiquidated = totalPaid >= totalCalculated && totalCalculated > 0;
  const isSigned = Boolean(signSuccess || quote?.signature_data);

  const formatConceptDateNumeric = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const clean = dateStr.trim().split('T')[0].split(' ')[0].split('-');
    if (clean.length === 3) {
      const [y, m, d] = clean;
      return `${d.padStart(2, '0')}${m.padStart(2, '0')}${y.slice(-2)}`;
    }
    return '';
  };

  const conceptDateNum = formatConceptDateNumeric(quote?.event_date);
  const isContractUnlocked = totalPaid > 0 || isSigned || quote?.status === 'CONVERTIDA' || quote?.status === 'APROBADA';
  const { clauses: contractClauses } = quote ? getContractClauses(items, quote, formatFolio(quote.quote_number)) : { clauses: [] };
  const [showClausesPreview, setShowClausesPreview] = useState(false);

  const handleDownloadPdf = async () => {
    if (!quote) return;
    await generateVlbQuotePdf({
      ...quote,
      down_payment_amount: downPaymentRequired,
      total_paid: totalPaid,
      balance_due: totalPaid > 0 ? remainingAfterPaid : (totalCalculated - downPaymentRequired)
    }, items);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] flex flex-col items-center justify-center p-4 text-[#332A28]">
        <div className="w-10 h-10 rounded-full border-2 border-[#EFE8E1] border-t-[#C83460] animate-spin mb-4" />
        <span className="font-serif text-2xl font-bold tracking-tight">Viva la Bride</span>
        <span className="text-xs text-[#7D6F6B] uppercase tracking-widest mt-1">Cargando propuesta digital...</span>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] flex flex-col items-center justify-center p-4 text-[#332A28]">
        <div className="bg-[#FFFFFF] p-8 rounded-3xl border border-[#EFE8E1] max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-[#C83460] mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Propuesta No Encontrada</h2>
          <p className="text-xs text-[#7D6F6B] leading-relaxed">
            {error || 'El enlace que recibiste es inválido o la propuesta fue removida. Por favor contacta al equipo de Viva la Bride para solicitar un nuevo enlace.'}
          </p>
          <a
            href="https://wa.me/525661406247"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-[#FFFFFF] text-xs font-bold"
          >
            <span>Contactar por WhatsApp</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F2] py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* TOP BRANDING BAR */}
        <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F7F3EE] pb-5">
            <div className="flex items-center">
              <img
                src="/vlb-monogram-pink.png"
                alt="Viva la Bride"
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </div>

            <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono font-bold text-[#C83460] bg-[#FAF6F2] px-3 py-1 rounded-full border border-[#EAE3DA]">
                {formatFolio(quote.quote_number)}
              </span>
              {isSigned ? (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-[#CCDACC] text-[#384C3A]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#384C3A]" />
                  <span>Contrato Firmado Digitalmente</span>
                </span>
              ) : totalPaid > 0 ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F8EE] text-[#1EBE5D] border border-[#BCE8CB]">
                  Separación Acreditada · Pendiente de Firma
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F8E4E9] text-[#C83460]">
                  Propuesta Vigente
                </span>
              )}
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#222222] hover:bg-[#333333] text-white cursor-pointer transition shadow-2xs"
                title="Descargar Cotización en PDF"
              >
                <Download className="w-3.5 h-3.5 text-[#F8E4E9]" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* DATOS DE LA CELEBRACIÓN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-[#FCFAF7] p-3.5 rounded-2xl border border-[#EAE3DA]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D6F6B] block">
                Pareja / Novios
              </span>
              <span className="font-serif font-bold text-base text-[#222222] block mt-0.5 truncate">
                {quote.client_name} {quote.partner_name ? `& ${quote.partner_name}` : ''}
              </span>
            </div>

            <div className="bg-[#FCFAF7] p-3.5 rounded-2xl border border-[#EAE3DA]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D6F6B] block">
                Fecha del Gran Día
              </span>
              <span className="font-bold text-sm text-[#C83460] flex items-center space-x-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{formatDateMX(quote.event_date)}</span>
              </span>
            </div>

            <div className="bg-[#FCFAF7] p-3.5 rounded-2xl border border-[#EAE3DA]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D6F6B] block">
                Sede / Venue
              </span>
              <span className="font-semibold text-xs text-[#222222] flex items-center space-x-1.5 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#B88A82] shrink-0" />
                <span className="truncate">{quote.event_venue || 'Por definir'}</span>
              </span>
            </div>

            <div className="bg-[#FCFAF7] p-3.5 rounded-2xl border border-[#EAE3DA]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D6F6B] block">
                Horario
              </span>
              <span className="font-semibold text-xs text-[#222222] flex items-center space-x-1.5 mt-0.5 truncate">
                <Clock className="w-3.5 h-3.5 text-[#B88A82] shrink-0" />
                <span className="truncate">{standardizeEventTime(quote.event_time || quote.ceremony_time || quote.service_time)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* DESGLOSE DE PARTIDAS Y ARTÍCULOS */}
        <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-[#C83460]" />
              <h3 className="font-serif text-lg font-bold text-[#222222]">
                Artículos & Experiencias Seleccionadas
              </h3>
            </div>
          </div>

          <div className="divide-y divide-[#F7F3EE]">
            {items.map((it, idx) => (
              <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-serif font-bold text-base text-[#222222]">
                      {it.item_name}
                    </span>
                  </div>
                  {it.description && (
                    <p className="text-xs text-[#7D6F6B] leading-relaxed max-w-xl">
                      {it.description}
                    </p>
                  )}
                  {it.pricing_type === 'PER_PIECE' && (
                    <div className="text-[11px] text-[#7D6F6B]">
                      {it.quantity} piezas a ${it.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-serif font-bold text-base text-[#222222]">
                    ${it.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DESGLOSE FINANCIERO Y POLÍTICA DE SEPARACIÓN */}
        <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F7F3EE]">
            <h3 className="font-serif text-lg font-bold text-[#222222]">
              Inversión & Esquema de Pagos
            </h3>
            <span className="text-xs font-semibold text-[#7D6F6B]">
              Valores en MXN
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-[#7D6F6B]">
              <span>Subtotal Artículos:</span>
              <span className="font-semibold text-[#222222]">
                ${(quote.subtotal || totalCalculated).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {quote.discount > 0 && (
              <div className="flex justify-between text-[#384C3A]">
                <span>Descuento aplicado:</span>
                <span className="font-semibold">
                  -${quote.discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-[#F7F3EE] flex justify-between items-baseline">
              <span className="font-serif font-bold text-lg text-[#222222]">
                Total Contratado:
              </span>
              <span className="font-serif font-bold text-2xl text-[#C83460]">
                ${totalCalculated.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* ABONOS REGISTRADOS EN VIVO */}
            {totalPaid > 0 && (
              <div className="p-5 rounded-2xl bg-[#F0FDF4] border border-[#BCE8CB] space-y-3 mt-3">
                <div className="flex justify-between items-center text-sm font-bold text-[#1EBE5D] pb-2 border-b border-[#BCE8CB]/60">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1EBE5D]" />
                    <span>Total Abonado a la Fecha:</span>
                  </span>
                  <span className="text-base text-[#1EBE5D]">
                    ${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </span>
                </div>

                {payments && payments.length > 0 && (
                  <div className="pt-1 space-y-1.5 text-xs text-[#384C3A]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#384C3A] block mb-1">
                      Comprobante de Pagos Aplicados:
                    </span>
                    {payments.map((p, pIdx) => (
                      <div key={p.id || pIdx} className="flex justify-between items-center py-1 border-b border-[#BCE8CB]/40 last:border-b-0">
                        <span>
                          • <strong className="font-semibold">{formatDateMX(p.payment_date)}</strong>{' '}
                          <span className="text-[#7D6F6B]">({p.payment_method || 'Abono'}{p.reference_notes ? ` · ${p.reference_notes}` : ''})</span>
                        </span>
                        <span className="font-bold text-[#384C3A]">
                          ${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-[#BCE8CB]/60">
                  <span className="text-xs font-bold text-[#384C3A]">
                    {isLiquidated ? 'Estatus de Liquidación:' : 'Saldo Pendiente por Liquidar:'}
                  </span>
                  <span className={`font-serif font-bold text-lg ${isLiquidated ? 'text-[#1EBE5D]' : 'text-[#C83460]'}`}>
                    {isLiquidated ? '✓ TOTALMENTE LIQUIDADO' : `$${remainingAfterPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`}
                  </span>
                </div>
              </div>
            )}

            {/* ESQUEMA EXACTO DE SEPARACIÓN Y LIQUIDACIÓN */}
            <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#EAD2D0] space-y-3 mt-3">
              <div className="flex justify-between items-center text-sm font-bold text-[#70443D] pb-2 border-b border-[#EAE3DA]">
                <span>{isServiceProposal ? 'Separación Requerida para Apartar:' : 'Anticipo Requerido (50%):'}</span>
                <span className="text-base text-[#C83460]">
                  ${downPaymentRequired.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-2 text-xs text-[#58352F] leading-relaxed">
                {isServiceProposal ? (
                  <div className="flex items-start space-x-2">
                    <span className="font-bold shrink-0">✨ Stands & Servicios:</span>
                    <span>
                      Separación fija de <strong>$1,000 MXN</strong>.
                      {totalPaid > 0 ? (
                        <>
                          {' '}Cuentas con <strong>${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong> registrados en abonos.{' '}
                          {isLiquidated ? (
                            <strong className="text-[#1EBE5D]">¡Tu paquete está 100% liquidado!</strong>
                          ) : (
                            <>El saldo restante (<strong>${remainingAfterPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>) se liquida <strong>10 días antes del evento</strong>.</>
                          )}
                        </>
                      ) : (
                        <>
                          {' '}El saldo restante (<strong>${balancePending.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>) se liquida <strong>10 días antes del evento</strong>.
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <span className="font-bold shrink-0">📦 Papelería Social:</span>
                    <span>
                      Anticipo del <strong>50% (${downPaymentRequired.toLocaleString('es-MX', { minimumFractionDigits: 2 })})</strong> para apartar taller de imprenta.
                      {totalPaid > 0 ? (
                        <>
                          {' '}Cuentas con <strong>${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong> registrados en abonos.{' '}
                          {isLiquidated ? (
                            <strong className="text-[#1EBE5D]">¡Tu pedido está 100% liquidado!</strong>
                          ) : (
                            <>El saldo restante (<strong>${remainingAfterPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>) <strong>se liquida al entregar el pedido o al programar el envío</strong>.</>
                          )}
                        </>
                      ) : (
                        <>
                          {' '}El saldo restante (<strong>${balancePending.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>) <strong>se liquida al entregar el pedido o al programar el envío</strong>.
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DATOS BANCARIOS PARA SEPARACIÓN (SI AÚN NO HA ABONADO)  */}
        {/* ======================================================== */}
        {totalPaid === 0 && !isSigned && (
          <div className="bg-gradient-to-br from-[#FAF6F2] via-[#FBF4F3] to-[#F6ECE8] p-6 sm:p-8 rounded-3xl border border-[#EAD2D0] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE3DA] gap-2">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-[#C83460]" />
                <h3 className="font-serif text-lg font-bold text-[#70443D]">
                  Datos Bancarios para Separar tu Fecha
                </h3>
              </div>
              <span className="text-xs font-bold text-[#C83460] bg-[#F8E4E9] px-3 py-1 rounded-full border border-[#F0D5DD] self-start sm:self-auto">
                {isServiceProposal ? 'Separación Fija de $1,000 MXN' : 'Anticipo Requerido del 50%'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-[#FFFFFF]/90 backdrop-blur-xs p-3.5 rounded-2xl border border-[#EAE3DA]">
                <span className="text-[10px] text-[#7D6F6B] uppercase font-bold tracking-wider block">Beneficiario</span>
                <span className="text-sm font-bold text-[#222222] mt-0.5 block">Scarlette Olivo</span>
              </div>
              <div className="bg-[#FFFFFF]/90 backdrop-blur-xs p-3.5 rounded-2xl border border-[#EAE3DA]">
                <span className="text-[10px] text-[#7D6F6B] uppercase font-bold tracking-wider block">Banco</span>
                <span className="text-sm font-bold text-[#222222] mt-0.5 block">BBVA</span>
              </div>
              <div className="bg-[#FFFFFF]/90 backdrop-blur-xs p-3.5 rounded-2xl border border-[#EAE3DA] sm:col-span-2">
                <span className="text-[10px] text-[#7D6F6B] uppercase font-bold tracking-wider block">Cuenta CLABE (SPEI)</span>
                <span className="text-base font-mono font-bold text-[#C83460] select-all tracking-wider mt-0.5 block">
                  012 180 01519982172 1
                </span>
              </div>
              <div className="bg-[#FFFFFF]/90 backdrop-blur-xs p-3.5 rounded-2xl border border-[#EAE3DA] sm:col-span-2">
                <span className="text-[10px] text-[#7D6F6B] uppercase font-bold tracking-wider block">Concepto de Transferencia Sugerido</span>
                <span className="text-xs font-semibold text-[#222222] select-all mt-0.5 block">
                  {quote.client_name} {conceptDateNum}
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#EAE3DA]/80">
              <p className="text-xs text-[#7D6F6B] leading-relaxed">
                ✨ <strong>Paso siguiente:</strong> Realiza tu transferencia y envía el comprobante. En cuanto se registre, se desbloqueará de inmediato tu <strong>Contrato Digital Oficial y Módulo de Firma</strong>.
              </p>
              <a
                href={`https://wa.me/525661406247?text=${encodeURIComponent(`¡Hola Vivi! Te comparto mi comprobante de anticipo para la cotización ${formatFolio(quote.quote_number)} a nombre de ${quote.client_name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-[#FFFFFF] text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Comprobante por WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CONTRATO MAESTRO DINÁMICO & CLÁUSULAS LEGALES            */}
        {/* ======================================================== */}
        <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F7F3EE] gap-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#C83460]" />
              <h3 className="font-serif text-lg font-bold text-[#222222]">
                Contrato de Prestación de Servicios
              </h3>
            </div>
            {isContractUnlocked ? (
              <span className="text-xs font-bold text-[#384C3A] bg-[#CCDACC] px-3 py-1 rounded-full border border-[#B8CEB8]">
                {totalPaid > 0 ? '✓ Separación Acreditada · Contrato Activo' : '✓ Contrato Desbloqueado'}
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#7D6F6B] bg-[#F7F3EE] px-3 py-1 rounded-full">
                Se activa al registrar anticipo
              </span>
            )}
          </div>

          <p className="text-xs text-[#7D6F6B] leading-relaxed">
            Contrato celebrado entre <strong>{quote.client_name} {quote.partner_name ? `& ${quote.partner_name}` : ''}</strong> ("La Contratante") y <strong>Viva la Bride</strong> ("La Prestadora de Servicios"), correspondiente a los servicios y especificaciones del folio <strong>{formatFolio(quote.quote_number)}</strong>.
          </p>

          {/* Mostrar cláusulas únicamente cuando está desbloqueado (anticipo registrado) */}
          {isContractUnlocked ? (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-[#FAF6F2] rounded-2xl border border-[#EAE3DA] flex items-center justify-between text-xs text-[#70443D]">
                <span className="font-bold">Estatus del Contrato:</span>
                <span className="font-semibold">
                  {isLiquidated ? '100% Liquidado' : (totalPaid > 0 ? `Anticipo Acreditado ($${totalPaid.toLocaleString('es-MX')})` : 'Pendiente de Separación')}
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {contractClauses.map((cl, cIdx) => (
                  <div key={cIdx} className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EFE8E1] space-y-1">
                    <h4 className="text-xs font-bold text-[#C83460] uppercase tracking-wider">
                      {cl.title}
                    </h4>
                    <p className="text-xs text-[#332A28] leading-relaxed text-justify">
                      {cl.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-dashed border-[#EAE3DA] text-center space-y-2">
              <Sparkles className="w-6 h-6 text-[#B88A82] mx-auto opacity-70" />
              <p className="text-xs text-[#7D6F6B] max-w-md mx-auto leading-relaxed">
                El texto legal oficial y el módulo de firma digital se activan en cuanto se registre tu anticipo de separación.
              </p>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* FIRMA DIGITAL & ACEPTACIÓN EN LA NUBE                    */}
        {/* ======================================================== */}
        <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-3xl border border-[#EFE8E1] shadow-xs space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#F7F3EE]">
            <ShieldCheck className="w-5 h-5 text-[#C83460]" />
            <h3 className="font-serif text-lg font-bold text-[#222222]">
              Aceptación Formal & Firma Digital
            </h3>
          </div>

          {isSigned ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-[#F0FDF4] border border-[#BCE8CB] text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#1EBE5D] mx-auto" />
              <div className="space-y-1">
                <h4 className="font-serif text-xl font-bold text-[#1EBE5D]">
                  ¡Propuesta Aceptada y Firmada Digitalmente!
                </h4>
                <p className="text-xs text-[#384C3A] max-w-md mx-auto leading-relaxed">
                  Tu aceptación y contrato digital han sido resguardados formalmente en la nube de Viva la Bride.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 max-w-lg mx-auto text-left">
                {/* Firma Contratante */}
                <div className="p-3.5 bg-white rounded-xl border border-[#BCE8CB] flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#7D6F6B] uppercase font-bold block mb-1">
                    Firma de la Contratante
                  </span>
                  {quote.signature_data ? (
                    <img
                      src={quote.signature_data}
                      alt="Firma Digital"
                      className="max-h-20 max-w-full my-1 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-[#7D6F6B] italic my-4">Registrada digitalmente</span>
                  )}
                  <span className="text-xs font-bold text-[#384C3A] block mt-1">
                    {quote.signed_by_name || quote.client_name}
                  </span>
                  <span className="text-[10px] text-[#7D6F6B] block">Contratante</span>
                  {quote.signed_at && (
                    <span className="text-[10px] text-[#7D6F6B] block mt-0.5">
                      {formatDateMX(quote.signed_at)}
                    </span>
                  )}
                </div>

                {/* Firma Prestadora */}
                <div className="p-3.5 bg-white rounded-xl border border-[#BCE8CB] flex flex-col items-center text-center">
                  <span className="text-[10px] text-[#7D6F6B] uppercase font-bold block mb-1">
                    Firma Prestadora de Servicios
                  </span>
                  <img
                    src="/vlb-scarlette-signature.png"
                    alt="Firma Scarlette Olivo"
                    className="max-h-20 max-w-full my-1 object-contain"
                  />
                  <span className="text-xs font-bold text-[#C83460] block mt-1">
                    Scarlette Olivo
                  </span>
                  <span className="text-[10px] text-[#222222] font-semibold block">
                    Representante de Viva la Bride
                  </span>
                  <span className="text-[10px] text-[#7D6F6B] block mt-0.5">
                    Viva la Bride Atelier
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDownloadPdf}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#1EBE5D] hover:bg-[#18A14E] text-[#FFFFFF] rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 mx-auto cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Descargar Contrato Oficial Firmado en PDF</span>
                </button>
                <p className="text-[11px] text-[#7D6F6B] mt-2">
                  El PDF generado incluye todos los conceptos contratados y tu firma digital estampada.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitSignature} className="space-y-4">
              <p className="text-xs text-[#7D6F6B] leading-relaxed">
                Al firmar en este recuadro confirmas la aceptación de los conceptos, montos y políticas de pago estipuladas. Tu firma quedará encriptada y archivada como comprobante digital de aceptación.
              </p>

              {signError && (
                <div className="p-3.5 rounded-xl bg-[#FBF4F3] border border-[#EAD2D0] text-xs text-[#70443D] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#70443D]" />
                  <span>{signError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1 uppercase tracking-wider">
                  Nombre Completo de quien Autoriza *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sofía Villaseñor"
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#FCFAF7] border border-[#EAE3DA] rounded-xl text-[#222222] focus:outline-none focus:border-[#C83460]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#222222] uppercase tracking-wider flex items-center space-x-1">
                    <PenTool className="w-3.5 h-3.5 text-[#C83460]" />
                    <span>Dibuja tu Firma con el Dedo o Ratón *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#7D6F6B] hover:text-[#C83460] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar trazo</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-[#EAE3DA] rounded-2xl bg-[#FFFFFF] overflow-hidden relative touch-none">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-44 cursor-crosshair block"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-[#7D6F6B]/60 italic">
                      Firma aquí con tu dedo o cursor
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={signing}
                className="w-full py-4 px-6 bg-[#C83460] hover:bg-[#a6264d] text-[#FFFFFF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{signing ? 'Guardando en la Nube...' : 'Aceptar Propuesta & Firmar Formalmente'}</span>
              </button>
            </form>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center py-4 space-y-1">
          <p className="text-xs text-[#7D6F6B]">
            Viva la Bride · Atelier de Papelería Social & Experiencias de Bienvenida
          </p>
          <p className="text-[10px] text-[#7D6F6B]/60">
            Contacto: 56 6140 6247
          </p>
        </div>

      </div>
    </div>
  );
};
