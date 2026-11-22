import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CeremonyDetails,
  CeremonyReadingItem,
  CeremonyRequirement,
  CeremonySongItem,
  ChecklistItem,
  FileItem,
  FloorElement,
  GuestItem,
  GuestStatus,
  PaymentRecord,
  TableItem,
  TimelineItem,
  VendorItem,
  WeddingProfile,
  WeddingState
} from '../types/lazo';
import {
  createInitialWeddingState,
  DEFAULT_COVER_PHOTOS,
  generateChecklistForDate
} from '../data/seedWedding';

const CURRENT_STUDIO_VERSION = 2;

type PersistedWeddingState = WeddingState & { studioVersion?: number };

interface WeddingContextValue {
  wedding: WeddingState | null;
  loading: boolean;
  saving: boolean;
  updateWedding: (updater: (prev: WeddingState) => WeddingState) => void;
  startNewWedding: (profile: WeddingProfile) => void;
  loadDemoWedding: () => void;
  exitToLanding: () => void;
}

const WeddingContext = createContext<WeddingContextValue | null>(null);

function parsePositionY(pos?: string): number {
  if (!pos) return 45;
  const match = pos.match(/(\d+)%/);
  return match ? Math.max(0, Math.min(100, Number(match[1]))) : 45;
}

function safeJsonArray<T = any>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

function hydrateWeddingFromLegacyDb(apiData: any, existingStudio?: any): PersistedWeddingState {
  const w = apiData.wedding || {};
  const seed = apiData.seedFromDb || {};

  const nameParts = (w.name || '').split(/&| y /i).map((s: string) => s.trim()).filter(Boolean);
  const partner1 = w.partner_1_name || existingStudio?.profile?.partner1 || nameParts[0] || 'Novia';
  const partner2 = w.partner_2_name || existingStudio?.profile?.partner2 || nameParts[1] || 'Novio';
  const weddingDate = w.wedding_date || existingStudio?.profile?.weddingDate || new Date(Date.now() + 300 * 86400000).toISOString().split('T')[0];

  const profile: WeddingProfile = {
    partner1,
    partner2,
    weddingDate,
    city: w.reception_venue || w.ceremony_venue || existingStudio?.profile?.city || '',
    budgetGoal: Number(w.budget_estimated) || existingStudio?.profile?.budgetGoal || 350000,
    estimatedGuests: Number(w.estimated_guests) || existingStudio?.profile?.estimatedGuests || 120,
    coverPhoto: existingStudio?.profile?.coverPhoto || w.cover_photo_url || DEFAULT_COVER_PHOTOS[0].url,
    coverPositionY: existingStudio?.profile?.coverPositionY ?? parsePositionY(w.cover_photo_position),
    partnerInviteCode: `LAZO-${String(w.id || '0000').slice(-4).toUpperCase()}`
  };

  const base = createInitialWeddingState(profile);

  // 1. Guests (exact columns: first_name, last_name, phone, companion_count, status, table_id, observations, dietary_requirements)
  const guests: GuestItem[] = (seed.guests || []).map((g: any) => {
    const fn = (g.first_name || '').trim();
    const ln = (g.last_name || '').trim();
    const fullName = `${fn} ${ln}`.trim() || 'Invitado';
    const rawStatus = String(g.status || '').toLowerCase();
    const status: GuestStatus = rawStatus.includes('confirmado') && !rawStatus.includes('pendiente')
      ? 'Confirmado'
      : rawStatus.includes('no asist') || rawStatus.includes('declin') || rawStatus.includes('cancel')
      ? 'No asistirá'
      : 'Pendiente';
    const notesParts = [g.dietary_requirements, g.observations].filter(Boolean).join(' · ');
    return {
      id: String(g.id),
      name: fullName,
      firstName: fn || undefined,
      lastName: ln || undefined,
      phone: g.phone || '',
      passes: Math.max(1, 1 + Number(g.companion_count || 0)),
      status,
      dietary: notesParts,
      tableId: g.table_id ? String(g.table_id) : undefined,
      side: 'Ambos'
    };
  });

  // 2. Tables (exact columns: id, name, type, capacity, x, y, rotation)
  const tables: TableItem[] =
    (seed.tables || []).length > 0
      ? seed.tables.map((t: any, idx: number) => {
          const rawType = String(t.type || '').toLowerCase();
          let shape: TableItem['shape'] = 'Redonda';
          if (rawType.includes('serpent') || rawType.includes('espiral')) shape = 'Serpentina (S)';
          else if (rawType.includes('imperial') || rawType.includes('novio')) shape = 'Imperial';
          else if (rawType.includes('rect')) shape = 'Rectangular';
          return {
            id: String(t.id),
            name: t.name || `Mesa ${idx + 1}`,
            shape,
            capacity: Math.max(2, Number(t.capacity) || 10),
            x: typeof t.x === 'number' ? t.x : 150 + (idx % 3) * 200,
            y: typeof t.y === 'number' ? t.y : 120 + Math.floor(idx / 3) * 155,
            rotation: Number(t.rotation) || 0
          };
        })
      : base.tables;

  // 3. Layout Elements (exact columns: id, name, type, x, y, width, height, rotation — preserving shape/tone from existingStudio)
  const existingElMeta = new Map<string, any>(
    ((existingStudio?.floorElements as any[]) || []).map((e: any) => [String(e.id), e])
  );
  const floorElements: FloorElement[] =
    (seed.layoutElements || []).length > 0
      ? seed.layoutElements.map((el: any) => {
          const prevMeta = existingElMeta.get(String(el.id));
          const rawType = String(el.type || '').toLowerCase();
          let type: FloorElement['type'] = 'otro';
          if (rawType.includes('pista') || rawType.includes('dance')) type = 'pista';
          else if (rawType.includes('dj') || rawType.includes('escenario') || rawType.includes('stage')) type = 'dj';
          else if (rawType.includes('barra') || rawType.includes('bar')) type = 'barra';
          else if (rawType.includes('entrada') || rawType.includes('entry')) type = 'entrada';
          return {
            id: String(el.id),
            type,
            label: el.name || el.type || 'Elemento',
            x: typeof el.x === 'number' ? el.x : 340,
            y: typeof el.y === 'number' ? el.y : 260,
            width: Number(el.width) || 130,
            height: Number(el.height) || 52,
            rotation: Number(el.rotation) || 0,
            shape: prevMeta?.shape,
            tone: prevMeta?.tone
          };
        })
      : (existingStudio?.floorElements ?? base.floorElements ?? []);

  // 4. Vendors + Payments (exact tables: vendors.costo_real, vendors.type, vendors.payment_due_date + payments.vendor_id, payments.amount, payments.concept, payments.payment_date, payments.payment_method)
  const allPayments: any[] = seed.payments || [];
  const vendors: VendorItem[] = (seed.vendors || []).map((v: any) => {
    const vPayments: PaymentRecord[] = allPayments
      .filter(p => String(p.vendor_id) === String(v.id))
      .map(p => {
        const rawMethod = String(p.payment_method || '');
        const method: PaymentRecord['method'] =
          rawMethod === 'Tarjeta' || rawMethod === 'Efectivo' || rawMethod === 'Transferencia'
            ? rawMethod
            : 'Transferencia';
        return {
          id: String(p.id),
          date: p.payment_date || new Date().toISOString().split('T')[0],
          amount: Number(p.amount) || 0,
          concept: p.concept || 'Abono',
          method,
          notes: p.notes || ''
        };
      });
    const paidAmount = vPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      id: String(v.id),
      name: v.name || 'Proveedor',
      category: v.type || 'Otro',
      phone: v.phone || '',
      totalCost: Number(v.costo_real) || 0,
      paidAmount,
      nextDueDate: v.payment_due_date || '',
      notes: v.notes || '',
      payments: vPayments
    };
  });

  // Also include orphan payments (payments without a matching vendor_id) under a "Pagos Generales" vendor if any exist
  const vendorIds = new Set(vendors.map(v => v.id));
  const orphanPayments = allPayments.filter(p => !p.vendor_id || !vendorIds.has(String(p.vendor_id)));
  if (orphanPayments.length > 0) {
    const mappedOrphans: PaymentRecord[] = orphanPayments.map(p => ({
      id: String(p.id),
      date: p.payment_date || new Date().toISOString().split('T')[0],
      amount: Number(p.amount) || 0,
      concept: p.concept || 'Pago general',
      method: p.payment_method === 'Tarjeta' || p.payment_method === 'Efectivo' ? p.payment_method : 'Transferencia',
      notes: p.notes || ''
    }));
    const orphanTotal = mappedOrphans.reduce((s, p) => s + p.amount, 0);
    vendors.push({
      id: 'v_general_payments',
      name: 'Otros Pagos Registrados',
      category: 'General',
      phone: '',
      totalCost: orphanTotal,
      paidAmount: orphanTotal,
      nextDueDate: '',
      notes: 'Pagos generales importados',
      payments: mappedOrphans
    });
  }

  // 5. Tasks / Checklist (exact table: tasks)
  const dbTasks: any[] = seed.tasks || [];
  const checklist: ChecklistItem[] =
    dbTasks.length > 0
      ? dbTasks.map((c: any) => ({
          id: String(c.id),
          title: c.title || 'Tarea',
          category: c.category || '12 - 16 meses',
          monthsBefore: 0,
          dueDate: c.due_date || weddingDate,
          completed: String(c.status || '').toLowerCase().includes('complet'),
          owner:
            c.responsible === 'Novia' || c.responsible === 'Novio'
              ? c.responsible
              : 'Ambos',
          notes: c.notes || ''
        }))
      : generateChecklistForDate(weddingDate);

  // 6. Timeline (exact table: timeline_events with column `activity`)
  const timeline: TimelineItem[] =
    (seed.timeline || []).length > 0
      ? seed.timeline.map((t: any) => ({
          id: String(t.id),
          time: t.time || '18:00',
          title: t.activity || t.title || 'Momento',
          location: t.location || '',
          notes: [t.responsible, t.notes].filter(Boolean).join(' · ')
        }))
      : base.timeline;

  // 7. Ceremonies (exact tables: civil_ceremony & religious_ceremony)
  const civilRow = seed.civil;
  const relRow = seed.religious;

  let civilWitnessList: string[] = [];
  if (civilRow?.witnesses) {
    const parsedW = safeJsonArray<string>(civilRow.witnesses);
    civilWitnessList = parsedW.length > 0
      ? parsedW
      : String(civilRow.witnesses).split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  const civilReqs = safeJsonArray<CeremonyRequirement>(civilRow?.requirements_status);
  const civilSongs = safeJsonArray<CeremonySongItem>(civilRow?.music_songs);

  const relReqs = safeJsonArray<CeremonyRequirement>(relRow?.requirements_status);
  const relSongsRaw = safeJsonArray<any>(relRow?.music_notes);
  const relSongs: CeremonySongItem[] = relSongsRaw.map((m, idx) => ({
    id: m.id || `rsong_${idx}`,
    moment: m.moment || 'Repertorio',
    title: m.title || m.song || '',
    artist: m.artist
  })).filter(m => m.title);
  const relReadings = safeJsonArray<CeremonyReadingItem>(relRow?.readings_notes);

  const ceremonies: CeremonyDetails = {
    ...base.ceremonies,
    civilEnabled: Boolean(civilRow && (civilRow.location || civilRow.juez_oficial || civilRow.time || civilWitnessList.length > 0)),
    civilDate: civilRow?.date || weddingDate,
    civilTime: civilRow?.time || '16:30',
    civilVenue: civilRow?.location || '',
    civilJudge: civilRow?.juez_oficial || '',
    civilNotes: civilRow?.notes || '',
    civilWitnesses: civilWitnessList.join(', '),
    civilWitnessList,
    civilRequirements: civilReqs.length > 0 ? civilReqs : undefined,
    civilHasMusic: Boolean(civilRow?.has_music || civilSongs.length > 0),
    civilMusicSongs: civilSongs,
    religiousEnabled: Boolean(relRow && (relRow.temple_name || relRow.officiant || relRow.time || relSongs.length > 0 || relReadings.length > 0)),
    religiousDate: relRow?.date || weddingDate,
    religiousTime: relRow?.time || '',
    religiousVenue: relRow?.temple_name || '',
    religiousOfficiant: relRow?.officiant || '',
    religiousNotes: relRow?.notes || '',
    religiousMusicList: relSongs,
    religiousReadingsList: relReadings,
    religiousRequirements: relReqs.length > 0 ? relReqs : undefined
  };

  // 8. Documents (exact columns: id, category, original_name, stored_filename, mime_type, notes, created_at)
  const files: FileItem[] = (seed.documents || []).map((d: any) => ({
    id: String(d.id),
    name: d.original_name || d.title || 'Documento',
    category:
      d.category === 'Contrato' || d.category === 'Comprobante' || d.category === 'Cotización'
        ? d.category
        : 'Contrato',
    date: (d.created_at || new Date().toISOString()).split('T')[0],
    notes: d.notes || '',
    mimeType: d.mime_type || undefined,
    dataUrl: d.stored_filename ? `/uploads/${d.stored_filename}` : undefined
  }));

  return {
    ...base,
    studioVersion: CURRENT_STUDIO_VERSION,
    style: existingStudio?.style || base.style,
    quotes: existingStudio?.quotes || base.quotes,
    contributions: existingStudio?.contributions || base.contributions,
    guests,
    tables,
    floorElements,
    vendors,
    checklist,
    timeline,
    ceremonies,
    files
  };
}

export const WeddingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentWedding, token, logout } = useAuth();
  const [wedding, setWedding] = useState<PersistedWeddingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const weddingIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const weddingId = currentWedding?.id;
    weddingIdRef.current = weddingId || null;

    if (!weddingId || !token) {
      setWedding(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/weddings/${weddingId}/novios-studio`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('No se pudo cargar la boda'))))
      .then(data => {
        if (cancelled) return;
        // ALWAYS hydrate operational tables live from SQLite so Admin <-> Novios stay 100% in sync!
        const hydrated = hydrateWeddingFromLegacyDb(data, data.studio);
        setWedding(hydrated);
      })
      .catch(err => {
        console.error('Error loading novios studio:', err);
        if (!cancelled && currentWedding) {
          const fallback = hydrateWeddingFromLegacyDb({ wedding: currentWedding, seedFromDb: {} });
          setWedding(fallback);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [currentWedding?.id, token]);

  const schedulePersist = (nextState: PersistedWeddingState) => {
    const weddingId = weddingIdRef.current;
    if (!weddingId || !token) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaving(true);
    const payload = { ...nextState, studioVersion: CURRENT_STUDIO_VERSION };
    saveTimerRef.current = window.setTimeout(() => {
      fetch(`/api/weddings/${weddingId}/novios-studio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ studio: payload })
      })
        .catch(err => console.error('Error persisting novios studio:', err))
        .finally(() => setSaving(false));
    }, 500);
  };

  const updateWedding = (updater: (prev: WeddingState) => WeddingState) => {
    setWedding(prev => {
      if (!prev) return prev;
      const next: PersistedWeddingState = {
        ...updater(prev),
        studioVersion: CURRENT_STUDIO_VERSION
      };
      schedulePersist(next);
      return next;
    });
  };

  const startNewWedding = (profile: WeddingProfile) => {
    const next: PersistedWeddingState = {
      ...createInitialWeddingState(profile),
      studioVersion: CURRENT_STUDIO_VERSION
    };
    setWedding(next);
    schedulePersist(next);
  };

  const loadDemoWedding = () => {};

  const exitToLanding = () => {
    logout();
  };

  return (
    <WeddingContext.Provider
      value={{ wedding, loading, saving, updateWedding, startNewWedding, loadDemoWedding, exitToLanding }}
    >
      {children}
    </WeddingContext.Provider>
  );
};

export const useWedding = (): WeddingContextValue => {
  const ctx = useContext(WeddingContext);
  if (!ctx) throw new Error('useWedding must be used inside WeddingProvider');
  return ctx;
};
