export type LazoTab = 'inicio' | 'presupuesto' | 'invitados' | 'checklist' | 'midia' | 'reuniones';

export interface WeddingProfile {
  partner1: string;
  partner2: string;
  eventType?: string;
  eventName?: string;
  weddingDate: string; // YYYY-MM-DD
  city: string;
  budgetGoal: number;
  estimatedGuests: number;
  coverPhoto: string;
  coverPositionY: number; // 0 to 100
  coverFitMode?: 'auto' | 'cover' | 'contain';
  floorPlanUrl?: string;
  floorPlanUrl2?: string;
  civilFloorPlanUrl?: string;
  civilFloorPlanUrl2?: string;
  floorPlanDualLayout?: 'side-by-side' | 'stacked';
  partnerInviteCode: string;
  welcomeSeen?: boolean;
}

export interface ContributionItem {
  id: string;
  label: string; // Novia, Novio, Familia de ella, Familia de él, Ahorro mensual
  pledged: number;
  saved: number;
}

export interface QuoteOption {
  id: string;
  category: string;
  vendorName: string;
  price: number;
  includes: string;
  pros: string;
  cons: string;
  phone: string;
  selected?: boolean;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  concept: string;
  method: 'Transferencia' | 'Tarjeta' | 'Efectivo' | 'Otro';
  notes?: string;
}

export interface VendorItem {
  id: string;
  name: string;
  category: string;
  phone: string;
  totalCost: number;
  paidAmount: number;
  nextDueDate: string;
  contractName?: string;
  locations?: string[];
  teamResponsible?: string;
  notes?: string;
  payments?: PaymentRecord[];
}

export type GuestStatus = 'Confirmado' | 'Pendiente' | 'No asistirá';

export interface GuestItem {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  passes: number;
  status: GuestStatus;
  dietary?: string;
  tableId?: string;
  civilTableId?: string;
  isInvitedPrincipal?: boolean;
  isInvitedCivil?: boolean;
  statusCivil?: GuestStatus;
  passesCivil?: number;
  side: 'Novia' | 'Novio' | 'Ambos';
  whatsappStatus?: string;
}

export interface TableItem {
  id: string;
  name: string;
  shape: 'Redonda' | 'Cuadrada' | 'Rectangular' | 'Imperial' | 'Serpentina (S)';
  capacity: number;
  x?: number;
  y?: number;
  rotation?: number; // 0, 45, 90...
  scale?: number; // 0.5 to 1.8 (visual size multiplier)
  headSeats?: boolean; // legacy toggle (Rectangular/Imperial)
  headSeatsLeft?: number; // 0, 1, or 2 chairs on left head
  headSeatsRight?: number; // 0, 1, or 2 chairs on right head
  seatSides?: 'both' | 'top' | 'bottom'; // which long sides have chairs (Rectangular/Imperial)
  locked?: boolean; // prevent accidental drag on canvas
  seatAssignments?: Array<string | null>; // exact seat index -> `${guestId}::${passIndex}`
}

export interface FloorElement {
  id: string;
  type: 'pista' | 'dj' | 'barra' | 'entrada' | 'otro';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  shape?: 'rect' | 'circle' | 'curve-path' | 'arch' | 'line' | 'ceremony';
  tone?: 'neutral' | 'nature' | 'water' | 'accent' | 'stone';
}

export interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  monthsBefore: number;
  dueDate: string; // YYYY-MM-DD calculated from weddingDate
  completed: boolean;
  owner: 'Novia' | 'Novio' | 'Ambos';
  notes?: string;
}

export interface TimelineItem {
  id: string;
  time: string;
  title: string;
  location: string;
  notes?: string;
}

export interface CeremonyRequirement {
  id: string;
  title: string;
  completed: boolean;
}

export interface CeremonySongItem {
  id: string;
  moment: string;
  title: string;
  artist?: string;
}

export interface CeremonyReadingItem {
  id: string;
  type: string;
  title: string;
  reader: string;
}

export interface CeremonyDetails {
  civilEnabled: boolean;
  civilDate: string;
  civilTime: string;
  civilVenue: string;
  civilJudge?: string;
  civilNotes?: string;
  civilWitnesses: string;
  civilWitnessList?: string[];
  civilRequirements?: CeremonyRequirement[];
  civilHasMusic?: boolean;
  civilMusicSongs?: CeremonySongItem[];

  religiousEnabled: boolean;
  religiousDate?: string;
  religiousTime: string;
  religiousVenue: string;
  religiousOfficiant?: string;
  religiousNotes?: string;
  religiousSongs: string;
  religiousMusicList?: CeremonySongItem[];
  religiousReadings: string;
  religiousReadingsList?: CeremonyReadingItem[];
  religiousRequirements?: CeremonyRequirement[];
}

export interface StyleBoard {
  palette: { name: string; hex: string }[];
  vibe: string;
  brideLook: string;
  groomLook: string;
  photos: { id: string; url: string; caption: string }[];
}

export interface FileItem {
  id: string;
  name: string;
  category: 'Contrato' | 'Comprobante' | 'Cotización' | 'Personal';
  date: string;
  notes?: string;
  dataUrl?: string;
  mimeType?: string;
}

export interface HandoverItem {
  id: string;
  name: string;
  category: string;
  qtyDelivered: string;
  deliveredNotes?: string;
  receivedByStaff: boolean;
  receivedAt?: string;
  returnedToCouple: boolean;
  qtyReturned?: string;
  returnedToWhom?: string;
  returnNotes?: string;
}

export interface WeddingState {
  onboarded: boolean;
  profile: WeddingProfile;
  contributions: ContributionItem[];
  quotes: QuoteOption[];
  vendors: VendorItem[];
  guests: GuestItem[];
  tables: TableItem[];
  floorElements?: FloorElement[];
  civilTables?: TableItem[];
  civilFloorElements?: FloorElement[];
  checklist: ChecklistItem[];
  timeline: TimelineItem[];
  ceremonies: CeremonyDetails;
  style: StyleBoard;
  files: FileItem[];
  handoverItems?: HandoverItem[];
}
