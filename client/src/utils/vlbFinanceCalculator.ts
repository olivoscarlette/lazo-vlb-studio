import { VlbEventSettlement, VlbFinanceSettings, VlbSettlementCalculation } from '../types/vlb';

export const DEFAULT_FINANCE_SETTINGS: VlbFinanceSettings = {
  id: 'default',
  staff_rate: 450,
  freight_rate: 500,
  stationery_rate: 200,
  company_fund_pct: 60,
  partners_profit_pct: 40,
  has_pin: true,
  updated_at: new Date().toISOString()
};

/**
 * Calcula con precisión absoluta las finanzas, gastos operativos,
 * fondo de reserva y liquidación individual por evento.
 */
export function calculateEventSettlement(
  event: VlbEventSettlement,
  settings: VlbFinanceSettings = DEFAULT_FINANCE_SETTINGS
): VlbSettlementCalculation {
  const serviceAmount = Number(event.service_amount) || 0;
  const freightCharged = Number(event.freight_charged) || 0;
  const extraServices = Number(event.extra_services) || 0;

  // 1. Ingreso Total del Evento
  const totalRevenue = serviceAmount + freightCharged + extraServices;

  // 2. Gastos Operativos
  const suppliesExpense = Number(event.supplies_expense) || 0;

  // Pago Flete / Carro:
  // Si alguien llevó carro (Scarlette o Victoria), se le paga el flete cobrado o la tarifa base ($500)
  const freightRate = settings.freight_rate ?? 500;
  const freightPayout = event.car_provider !== 'NINGUNA_EXTERNO'
    ? (freightCharged > 0 ? freightCharged : freightRate)
    : 0;

  // Pago Papelería:
  // Si alguien elaboró la papelería (Scarlette o Victoria), se asigna la tarifa ($200)
  const stationeryRate = settings.stationery_rate ?? 200;
  const stationeryPayout = event.stationery_provider !== 'NINGUNA'
    ? stationeryRate
    : 0;

  // Staff Externo:
  const staffRate = settings.staff_rate ?? 450;
  const externalStaffCount = Math.max(0, Math.floor(Number(event.external_staff_count) || 0));
  const externalStaffPayout = externalStaffCount * staffRate;

  // Turnos de socias:
  const scarletteShiftPayout = event.staff_scarlette ? staffRate : 0;
  const victoriaShiftPayout = event.staff_victoria ? staffRate : 0;

  // Total Gastos Operativos:
  const totalExpenses =
    suppliesExpense +
    freightPayout +
    stationeryPayout +
    externalStaffPayout +
    scarletteShiftPayout +
    victoriaShiftPayout;

  // 3. Ganancia Neta Real
  const netProfit = totalRevenue - totalExpenses;

  // 4. Reparto de Ganancia Neta
  const positiveNetProfit = Math.max(0, netProfit);
  const companyFundPct = (settings.company_fund_pct ?? 60) / 100;
  const partnersProfitPct = (settings.partners_profit_pct ?? 40) / 100;

  const companyFundAmount = Math.round(positiveNetProfit * companyFundPct * 100) / 100;
  const partnersProfitPool = Math.round(positiveNetProfit * partnersProfitPct * 100) / 100;

  // 50% de la bolsa de utilidades para cada socia (20% neto cada una de la Ganancia Neta)
  const scarletteProfitShare = Math.round(partnersProfitPool * 0.50 * 100) / 100;
  const victoriaProfitShare = Math.round(partnersProfitPool * 0.50 * 100) / 100;

  // 5. Liquidaciones Finales
  const scarletteFreight = event.car_provider === 'SCARLETTE' ? freightPayout : 0;
  const scarletteStationery = event.stationery_provider === 'SCARLETTE' ? stationeryPayout : 0;
  const scarletteTotalPayout = scarletteShiftPayout + scarletteFreight + scarletteStationery + scarletteProfitShare;

  const victoriaFreight = event.car_provider === 'VICTORIA' ? freightPayout : 0;
  const victoriaStationery = event.stationery_provider === 'VICTORIA' ? stationeryPayout : 0;
  const victoriaTotalPayout = victoriaShiftPayout + victoriaFreight + victoriaStationery + victoriaProfitShare;

  const externalTotalPayout = externalStaffPayout;

  return {
    totalRevenue,
    suppliesExpense,
    freightPayout,
    freightBeneficiary: event.car_provider,
    stationeryPayout,
    stationeryBeneficiary: event.stationery_provider,
    externalStaffCount,
    externalStaffPayout,
    scarletteShiftPayout,
    victoriaShiftPayout,
    totalExpenses,
    netProfit,
    companyFundAmount,
    partnersProfitPool,
    scarletteProfitShare,
    victoriaProfitShare,
    scarletteTotalPayout,
    victoriaTotalPayout,
    externalTotalPayout
  };
}
