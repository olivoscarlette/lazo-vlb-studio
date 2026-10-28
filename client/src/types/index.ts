export type UserRole = 'ADMINISTRADOR' | 'COORDINADOR' | 'STAFF' | 'NOVIOS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  wedding_id?: string | null;
  avatar_url?: string | null;
}

export interface WeddingTeamMember {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  assigned_role: string;
  avatar_url?: string | null;
}

export interface WeddingStats {
  guests: {
    total_guests: number;
    confirmed_count: number;
    pending_count: number;
    declined_count: number;
    confirmed_total_seats: number;
    total_seats_potential: number;
  };
  finance: {
    costo_real: number;
    monto_pagado: number;
    restante: number;
  };
}

export interface Wedding {
  id: string;
  name: string;
  slug: string;
  partner_1_name: string;
  partner_2_name: string;
  wedding_date: string;
  ceremony_time?: string;
  reception_time?: string;
  ceremony_venue?: string;
  reception_venue?: string;
  estimated_guests: number;
  status: 'PLANNING' | 'UPCOMING' | 'COMPLETED' | 'ARCHIVED';
  notes?: string;
  package_type: string;
  floor_plan_url?: string | null;
  invitation_type?: 'LINK' | 'PDF';
  invitation_url?: string | null;
  invitation_pdf_url?: string | null;
  invitation_pdf_filename?: string | null;
  dress_code?: string | null;
  no_children?: number | boolean | null;
  updated_at?: string;
  team?: WeddingTeamMember[];
  stats?: WeddingStats;
  total_guests?: number;
  confirmed_guests?: number;
  pending_guests?: number;
  declined_guests?: number;
  total_confirmed_seats?: number;
  pending_tasks?: number;
  total_tasks?: number;
}

export interface Guest {
  id: string;
  wedding_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  companion_count: number;
  priority?: 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente de confirmar' | 'Confirmado' | 'No asistirá';
  table_id: string | null;
  table_name?: string | null;
  observations: string | null;
  whatsapp_status?: 'NO_ENVIADO' | 'ENVIADO' | 'ENTREGADO' | 'LEÍDO' | 'ERROR';
  last_whatsapp_sent_at?: string | null;
  whatsapp_message_id?: string | null;
  dietary_requirements?: string | null;
  confirmed_places?: number;
  rsvp_step?: 'NONE' | 'INVITATION_SENT' | 'CONFIRMING_PLACES' | 'AWAITING_PLACES_NUMBER' | 'CONFIRMING_DIET' | 'AWAITING_DIET_TEXT' | 'COMPLETED' | 'DECLINED';
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  wedding_id: string;
  name: string;
  type: 'circular' | 'rectangular' | 'imperial';
  capacity: number;
  x: number;
  y: number;
  rotation: number;
  guests?: Guest[];
  used_seats?: number;
  available_seats?: number;
  is_overcapacity?: boolean;
}

export interface LayoutElement {
  id: string;
  wedding_id: string;
  name: string;
  type: 'pista_baile' | 'escenario' | 'barra' | 'entrada' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface LayoutVersion {
  id: string;
  wedding_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  wedding_id: string;
  name: string;
  phone: string;
  type: string;
  locations: string[]; // ['IGLESIA', 'CIVIL', 'RECEPCIÓN', 'OTRO']
  costo_real: number;
  payment_due_date?: string | null;
  contact_person?: string;
  notes?: string;
  total_pagado?: number;
  saldo_restante?: number;
  arrived?: number | boolean;
  arrived_at?: string | null;
}

export interface Payment {
  id: string;
  wedding_id: string;
  vendor_id: string | null;
  vendor_name?: string | null;
  concept: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  receipt_document_id?: string | null;
  created_at: string;
}

export interface CivilSong {
  id: string;
  moment: string;
  title: string;
  artist?: string;
  notes?: string;
}

export interface CivilCeremony {
  id: string;
  wedding_id: string;
  date: string | null;
  time: string | null;
  location: string | null;
  juez_oficial: string | null;
  witnesses: string[];
  requirements_status: { id: string; title: string; completed: boolean }[];
  notes: string | null;
  has_music?: boolean;
  music_songs?: CivilSong[];
}

export interface ReligiousCeremony {
  id: string;
  wedding_id: string;
  date: string | null;
  time: string | null;
  temple_name: string | null;
  officiant: string | null;
  music_notes: string | null;
  readings_notes: string | null;
  requirements_status?: { id: string; title: string; completed: boolean }[];
  notes: string | null;
}

export interface Meeting {
  id: string;
  wedding_id: string;
  title: string;
  date: string;
  time: string;
  participants: string[];
  status: 'PROGRAMADA' | 'SOLICITADA' | 'PROPUESTA' | 'REALIZADA' | 'CANCELADA';
  notes: string | null;
  agreements: string | null;
  pending_tasks: string | null;
  proposed_slots?: { date: string; time: string; note?: string }[] | null;
  accepted_by?: { userId: string; userName: string; role: string; acceptedAt: string }[];
  meet_url?: string | null;
  summary?: string | null;
  created_by: string;
  created_at: string;
}

export interface PackageInfo {
  packageName: string;
  maxMeetings: number;
  usedMeetings: number;
  remainingMeetings: number | string;
  description: string;
  includes?: string[];
}

export interface TimelineEvent {
  id: string;
  wedding_id: string;
  time: string;
  activity: string;
  location: string | null;
  responsible: string | null;
  notes: string | null;
  status: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO';
  order_index: number;
  day_type?: 'BODA' | 'CIVIL';
  completed_by?: string | null;
  completed_at?: string | null;
}

export interface Task {
  id: string;
  wedding_id: string;
  title: string;
  category: string;
  responsible: string | null;
  due_date: string | null;
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente' | 'En proceso' | 'Completada';
  notes: string | null;
}

export interface DocumentItem {
  id: string;
  wedding_id: string;
  category: 'contrato' | 'comprobante_pago' | 'proveedor' | 'operativo' | 'civil_iglesia';
  original_name: string;
  mime_type: string;
  file_size: number;
  notes: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  wedding_id: string | null;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  created_at: string;
  wedding_name?: string;
}

export interface NotificationItem {
  id: string;
  wedding_id?: string;
  user_id?: string;
  title: string;
  message: string;
  read: number;
  link?: string;
  created_at: string;
}
