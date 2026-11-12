import { VlbEventSettlement, VlbFinanceSettings, VlbSettlementCalculation } from '../types/vlb';

export const DEFAULT_FINANCE_SETTINGS: VlbFinanceSettings = {
  id: 'default',
  staff_rate: 450,
  freight_rate: 500,
  stationery_rate: 200,
  stationery_labor_pct: 25, // Por defecto 25% del margen neto de papelería
  company_fund_pct: 60,
  partners_profit_pct: 40,
  has_pin: true,
  updated_at: new Date().toISOString()
};

/**
 * Calcula con precisión absoluta las finanzas, gastos operativos,
 * fondo de reserva y liquidación individual por evento, separando
 * Stands/Servicios y Papelería Social ("quitando gastos").
 */
export function calculateEventSettlement(
  event: VlbEventSettlement,
  settings: VlbFinanceSettings = DEFAULT_FINANCE_SETTINGS
): VlbSettlementCalculation {
  // 1. Ingresos Desglosados
  const hasStandsSplit = event.stands_amount !== undefined && event.stands_amount !== null;
  const hasStationerySplit = event.stationery_amount !== undefined && event.stationery_amount !== null;

  let standsAmount = 0;
  let stationeryAmount = 0;

  if (hasStandsSplit || hasStationerySplit) {
    standsAmount = Number(event.stands_amount) || 0;
    stationeryAmount = Number(event.stationery_amount) || 0;
  } else {
    // Compatibilidad histórica: si no viene desglosado, se toma service_amount completo
    standsAmount = Number(event.service_amount) || 0;
    stationeryAmount = 0;
  }

  const freightCharged = Number(event.freight_charged) || 0;
  const extraServices = Number(event.extra_services) || 0;
  const totalRevenue = standsAmount + stationeryAmount + freightCharged + extraServices;

  // 2. Insumos Desglosados
  const suppliesServicesExpense = Number(event.supplies_services_expense) || 0;
  const suppliesStationeryExpense = Number(event.supplies_stationery_expense) || 0;
  const suppliesExpense = (suppliesServicesExpense + suppliesStationeryExpense > 0)
    ? (suppliesServicesExpense + suppliesStationeryExpense)
    : (Number(event.supplies_expense) || 0);

  // 3. Papelería Social: Margen Neto y Mano de Obra ("quitando gastos")
  // Margen de papelería = Venta de Papelería MENOS sus insumos directos
  const stationeryNetMargin = Math.max(0, stationeryAmount - suppliesStationeryExpense);
  const laborPct = (settings.stationery_labor_pct ?? 25) / 100;
  const suggestedStationeryLabor = Math.round(stationeryNetMargin * laborPct * 100) / 100;

  let stationeryPayout = 0;
  if (event.stationery_provider && event.stationery_provider !== 'NINGUNA') {
    if (event.stationery_labor_payout !== undefined && event.stationery_labor_payout !== null && Number(event.stationery_labor_payout) > 0) {
      // Monto explícito capturado o confirmado por la socia
      stationeryPayout = Number(event.stationery_labor_payout);
    } else if (stationeryAmount > 0) {
      // Cálculo sugerido automático basado en el margen tras descontar gastos
      stationeryPayout = suggestedStationeryLabor;
    } else {
      // Fallback para eventos históricos sin desglose
      stationeryPayout = settings.stationery_rate ?? 200;
    }
  }

  // 4. Pago Flete / Carro
  const freightRate = settings.freight_rate ?? 500;
  const baseFreight = freightCharged > 0 ? freightCharged : freightRate;

  let freightPayout = 0;
  let scarletteFreight = 0;
  let victoriaFreight = 0;

  if (event.car_provider === 'SCARLETTE') {
    freightPayout = baseFreight;
    scarletteFreight = baseFreight;
  } else if (event.car_provider === 'VICTORIA') {
    freightPayout = baseFreight;
    victoriaFreight = baseFreight;
  } else if (event.car_provider === 'AMBAS_COMPLETO') {
    // Ambas llevaron carro: cada una recibe tarifa completa de flete ($500 c/u = $1,000 total)
    scarletteFreight = freightRate;
    victoriaFreight = freightRate;
    freightPayout = scarletteFreight + victoriaFreight;
  } else if (event.car_provider === 'AMBAS_DIVIDIDO') {
    // Ambas llevaron carro: se divide el flete al 50/50 (ej. $250 c/u de una bolsa de $500)
    freightPayout = baseFreight;
    scarletteFreight = Math.round((baseFreight / 2) * 100) / 100;
    victoriaFreight = Math.round((baseFreight - scarletteFreight) * 100) / 100;
  }

  // 5. Staff Externo & Turnos Socias
  const staffRate = settings.staff_rate ?? 450;
  const externalStaffCount = Math.max(0, Math.floor(Number(event.external_staff_count) || 0));
  const externalStaffPayout = externalStaffCount * staffRate;

  const scarletteShiftPayout = event.staff_scarlette ? staffRate : 0;
  const victoriaShiftPayout = event.staff_victoria ? staffRate : 0;

  // 6. Gastos Operativos Totales
  const totalExpenses =
    suppliesExpense +
    freightPayout +
    stationeryPayout +
    externalStaffPayout +
    scarletteShiftPayout +
    victoriaShiftPayout;

  // 7. Ganancia Neta Real
  const netProfit = totalRevenue - totalExpenses;

  // 8. Reparto de Ganancia Neta (60% Fondo Empresa / 40% Utilidad Socias)
  const positiveNetProfit = Math.max(0, netProfit);
  const companyFundPct = (settings.company_fund_pct ?? 60) / 100;
  const partnersProfitPct = (settings.partners_profit_pct ?? 40) / 100;

  const companyFundAmount = Math.round(positiveNetProfit * companyFundPct * 100) / 100;
  const partnersProfitPool = Math.round(positiveNetProfit * partnersProfitPct * 100) / 100;

  // 50% de la bolsa de utilidades para cada socia (20% neto cada una)
  const scarletteProfitShare = Math.round(partnersProfitPool * 0.50 * 100) / 100;
  const victoriaProfitShare = Math.round(partnersProfitPool * 0.50 * 100) / 100;

  // 9. Liquidaciones Finales
  let scarletteStationery = 0;
  let victoriaStationery = 0;
  let externalStationery = 0;

  if (event.stationery_provider === 'SCARLETTE') {
    scarletteStationery = stationeryPayout;
  } else if (event.stationery_provider === 'VICTORIA') {
    victoriaStationery = stationeryPayout;
  } else if (event.stationery_provider === 'AMBAS') {
    // Ambas socias elaboraron la papelería: se divide en partes iguales (50% y 50%)
    scarletteStationery = Math.round((stationeryPayout / 2) * 100) / 100;
    victoriaStationery = Math.round((stationeryPayout - scarletteStationery) * 100) / 100;
  } else if (event.stationery_provider === 'EXTERNO') {
    externalStationery = stationeryPayout;
  }

  const scarletteTotalPayout = scarletteShiftPayout + scarletteFreight + scarletteStationery + scarletteProfitShare;
  const victoriaTotalPayout = victoriaShiftPayout + victoriaFreight + victoriaStationery + victoriaProfitShare;
  const externalTotalPayout = externalStaffPayout + externalStationery;

  return {
    totalRevenue,
    standsAmount,
    stationeryAmount,
    suppliesExpense,
    suppliesServicesExpense,
    suppliesStationeryExpense,
    stationeryNetMargin,
    suggestedStationeryLabor,
    freightPayout,
    freightBeneficiary: event.car_provider,
    scarletteFreightPayout: scarletteFreight,
    victoriaFreightPayout: victoriaFreight,
    stationeryPayout,
    stationeryBeneficiary: event.stationery_provider,
    scarletteStationeryPayout: scarletteStationery,
    victoriaStationeryPayout: victoriaStationery,
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
