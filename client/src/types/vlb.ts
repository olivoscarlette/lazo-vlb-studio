export type VlbCategory = 'PAPELERIA' | 'STANDS_EXPERIENCIAS';
export type VlbPricingType = 'PER_PIECE' | 'FIXED_EVENT';

export interface VlbCatalogItem {
  id: string;
  category: VlbCategory;
  subcategory: string;
  name: string;
  description: string;
  pricing_type: VlbPricingType;
  base_price: number;
  min_pieces: number;
  specs_json?: string;
  image_url?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface VlbQuoteItem {
  id: string;
  quote_id?: string;
  catalog_id?: string | null;
  category: VlbCategory;
  item_name: string;
  description: string;
  pricing_type: VlbPricingType;
  unit_price: number;
  quantity: number;
  total_price: number;
  custom_options_json?: string;
  sort_order: number;
}

export type VlbQuoteStatus = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'CONVERTIDA' | 'RECHAZADA';

export interface VlbQuote {
  id: string;
  quote_number: string;
  client_name: string;
  partner_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  event_venue?: string | null;
  status: VlbQuoteStatus;
  subtotal: number;
  discount: number;
  total: number;
  down_payment_pct: number;
  down_payment_amount: number;
  balance_due: number;
  total_paid?: number;
  balance_pending?: number;
  payment_status?: VlbPaymentStatus;
  signature_data?: string | null;
  signed_by_name?: string | null;
  signed_at?: string | null;
  short_url?: string | null;
  notes?: string | null;
  valid_until?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export type VlbPaymentStatus = 'ANTICIPO_PENDIENTE' | 'ANTICIPO_PAGADO' | 'LIQUIDADO';
export type VlbProductionStatus =
  | 'EN_COTIZACION'
  | 'DISENO_EN_PROCESO'
  | 'VOBO_PENDIENTE'
  | 'EN_PRODUCCION'
  | 'LISTO_ENTREGA'
  | 'ENTREGADO_MONTADO'
  | 'FINALIZADO';

export interface VlbTask {
  id: string;
  title: string;
  due_date?: string | null;
  due_time?: string | null;
  completed: boolean;
  category: 'PAPELERIA' | 'SERVICIO' | 'OTRO';
  notes?: string | null;
}

export interface VlbOrder {
  id: string;
  order_number: string;
  quote_id?: string | null;
  client_name: string;
  partner_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  event_date: string;
  event_venue?: string | null;
  total_amount: number;
  down_payment_required: number;
  total_paid: number;
  balance_pending: number;
  payment_status: VlbPaymentStatus;
  production_status: VlbProductionStatus;
  vobo_design_deadline?: string | null;
  physical_delivery_date?: string | null;
  stand_setup_date?: string | null;
  stand_setup_time?: string | null;
  notes?: string | null;
  service_type?: 'PAPELERIA' | 'STANDS_EXPERIENCIAS' | 'MIXTO';
  items?: VlbQuoteItem[];
  tasks?: VlbTask[];
  created_at: string;
  updated_at: string;
  docs_count?: number;
  payments_count?: number;
}

export interface VlbPayment {
  id: string;
  order_id: string;
  amount: number;
  payment_type: 'ANTICIPO_50' | 'ABONO' | 'LIQUIDACION_FINAL';
  payment_method: 'SPEI' | 'TARJETA' | 'EFECTIVO' | 'OTRO';
  payment_date: string;
  reference_num?: string | null;
  notes?: string | null;
  created_at: string;
}

export type VlbDocCategory = 'CONTRATO_FIRMADO' | 'COMPROBANTE_SPEI' | 'VOBO_DISENO' | 'OTRO';
export type VlbVoboStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface VlbDocument {
  id: string;
  order_id: string;
  category: VlbDocCategory;
  original_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  vobo_status: VlbVoboStatus;
  vobo_approved_at?: string | null;
  vobo_notes?: string | null;
  notes?: string | null;
  uploaded_by?: string;
  created_at: string;
}

export type VlbCarProvider = 'SCARLETTE' | 'VICTORIA' | 'NINGUNA_EXTERNO';
export type VlbStationeryProvider = 'SCARLETTE' | 'VICTORIA' | 'AMBAS' | 'NINGUNA' | 'EXTERNO';

export interface VlbEventSettlement {
  id: string;
  order_id?: string | null;
  quote_id?: string | null;
  order_number?: string | null;
  order_payment_status?: string | null;
  order_total_paid?: number;
  event_name: string;
  event_date: string;
  venue?: string | null;
  service_amount: number; // Total histórico / combinado
  stands_amount?: number; // Venta Stands & Experiencias
  stationery_amount?: number; // Venta Papelería Social
  freight_charged: number;
  extra_services: number;
  supplies_expense: number; // Total histórico / combinado
  supplies_services_expense?: number; // Insumos Stands/Bar (hielo, vasos, cerveza)
  supplies_stationery_expense?: number; // Insumos Papelería (papel, impresión, listón, sellos)
  car_provider: VlbCarProvider;
  stationery_provider: VlbStationeryProvider;
  stationery_labor_payout?: number; // Pago asignado por elaboración/corte de papelería
  staff_scarlette: boolean;
  staff_victoria: boolean;
  external_staff_count: number;
  status: 'PENDIENTE' | 'LIQUIDADO';
  paid_scarlette?: boolean | number;
  paid_victoria?: boolean | number;
  paid_external?: boolean | number;
  paid_scarlette_at?: string | null;
  paid_victoria_at?: string | null;
  paid_external_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VlbFinanceSettings {
  id: string;
  staff_rate: number;
  freight_rate: number;
  stationery_rate: number;
  stationery_labor_pct: number; // Porcentaje sugerido para mano de obra tras descontar insumos
  company_fund_pct: number;
  partners_profit_pct: number;
  has_pin: boolean;
  updated_at: string;
}

export interface VlbSettlementCalculation {
  totalRevenue: number;
  standsAmount: number;
  stationeryAmount: number;
  suppliesExpense: number;
  suppliesServicesExpense: number;
  suppliesStationeryExpense: number;
  stationeryNetMargin: number;
  suggestedStationeryLabor: number;
  freightPayout: number;
  freightBeneficiary: VlbCarProvider;
  stationeryPayout: number;
  stationeryBeneficiary: VlbStationeryProvider;
  scarletteStationeryPayout: number;
  victoriaStationeryPayout: number;
  externalStaffCount: number;
  externalStaffPayout: number;
  scarletteShiftPayout: number;
  victoriaShiftPayout: number;
  totalExpenses: number;
  netProfit: number;
  companyFundAmount: number;
  partnersProfitPool: number;
  scarletteProfitShare: number;
  victoriaProfitShare: number;
  scarletteTotalPayout: number;
  victoriaTotalPayout: number;
  externalTotalPayout: number;
}
