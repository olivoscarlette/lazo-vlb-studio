import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CeremonyDetails,
  ChecklistItem,
  FileItem,
  GuestItem,
  GuestStatus,
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

function hydrateWeddingFromLegacyDb(apiData: any): WeddingState {
  const w = apiData.wedding || {};
  const seed = apiData.seedFromDb || {};

  // Split couple name if partner names not explicitly set
  const nameParts = (w.name || '').split(/&| y /i).map((s: string) => s.trim()).filter(Boolean);
  const partner1 = w.partner_1_name || w.bride_name || nameParts[0] || 'Novia';
  const partner2 = w.partner_2_name || w.groom_name || nameParts[1] || 'Novio';
  const weddingDate = w.wedding_date || w.date || new Date(Date.now() + 300 * 86400000).toISOString().split('T')[0];

  const profile: WeddingProfile = {
    partner1,
    partner2,
    weddingDate,
    city: w.reception_venue || w.ceremony_venue || w.city || w.venue || '',
    budgetGoal: Number(w.budget_estimated) || 350000,
    estimatedGuests: Number(w.estimated_guests || w.guest_count_estimated) || 120,
    coverPhoto: w.cover_photo_url || DEFAULT_COVER_PHOTOS[0].url,
    coverPositionY: parsePositionY(w.cover_photo_position),
    partnerInviteCode: `LAZO-${String(w.id || '0000').slice(-4).toUpperCase()}`
  };

  const base = createInitialWeddingState(profile);

  // Hydrate guests
  const guests: GuestItem[] = (seed.guests || []).map((g: any) => {
    const fn = g.first_name || '';
    const ln = g.last_name || '';
    const fullName = `${fn} ${ln}`.trim() || g.name || 'Invitado';
    const rawStatus = String(g.status || 'Pendiente');
    const status: GuestStatus =
      rawStatus === 'Confirmado'
        ? 'Confirmado'
        : rawStatus === 'Declinado' || rawStatus === 'No asistirá'
        ? 'No asistirá'
        : 'Pendiente';
    return {
      id: String(g.id),
      name: fullName,
      firstName: fn || undefined,
      lastName: ln || undefined,
      phone: g.phone || '',
      passes: Math.max(1, Number(g.companions != null ? 1 + Number(g.companions) : g.passes || 1)),
      status,
      dietary: g.dietary_restrictions || g.notes || '',
      tableId: g.table_id ? String(g.table_id) : undefined,
      side: g.side === 'Novia' || g.side === 'Novio' ? g.side : 'Ambos'
    };
  });

  // Hydrate tables
  const tables: TableItem[] =
    (seed.tables || []).length > 0
      ? seed.tables.map((t: any, idx: number) => {
          const shapeMap: Record<string, TableItem['shape']> = {
            Redonda: 'Redonda',
            Rectangular: 'Rectangular',
            Imperial: 'Imperial',
            'Serpentina (S)': 'Serpentina (S)',
            Serpentina: 'Serpentina (S)'
          };
          return {
            id: String(t.id),
            name: t.name || `Mesa ${idx + 1}`,
            shape: shapeMap[t.shape] || 'Redonda',
            capacity: Math.max(2, Number(t.capacity) || 10),
            x: typeof t.pos_x === 'number' ? t.pos_x : 150 + (idx % 3) * 200,
            y: typeof t.pos_y === 'number' ? t.pos_y : 120 + Math.floor(idx / 3) * 155,
            rotation: Number(t.rotation) || 0
          };
        })
      : base.tables;

  // Hydrate vendors
  const vendors: VendorItem[] = (seed.vendors || []).map((v: any) => ({
    id: String(v.id),
    name: v.name || 'Proveedor',
    category: v.category || 'Otro',
    phone: v.contact_phone || v.phone || '',
    totalCost: Number(v.total_cost) || 0,
    paidAmount: Number(v.paid_amount) || 0,
    nextDueDate: v.next_payment_date || '',
    notes: v.notes || '',
    payments: Number(v.paid_amount) > 0
      ? [
          {
            id: `pay_init_${v.id}`,
            date: new Date().toISOString().split('T')[0],
            amount: Number(v.paid_amount),
            concept: 'Abonos previos registrados',
            method: 'Transferencia'
          }
        ]
      : []
  }));

  // Hydrate checklist (use existing DB tasks if present, else master checklist)
  const checklist: ChecklistItem[] =
    (seed.checklist || []).length > 0
      ? seed.checklist.map((c: any) => ({
          id: String(c.id),
          title: c.title || 'Tarea',
          category: c.category || '12 - 16 meses',
          monthsBefore: 0,
          dueDate: c.due_date || weddingDate,
          completed: c.status === 'Completada' || Boolean(c.completed),
          owner:
            c.responsible === 'Novia' || c.responsible === 'Novio'
              ? c.responsible
              : 'Ambos',
          notes: c.notes || ''
        }))
      : generateChecklistForDate(weddingDate);

  // Hydrate timeline
  const timeline: TimelineItem[] =
    (seed.timeline || []).length > 0
      ? seed.timeline.map((t: any) => ({
          id: String(t.id),
          time: t.time || '18:00',
          title: t.title || t.activity || 'Momento',
          location: t.location || '',
          notes: t.notes || ''
        }))
      : base.timeline;

  // Hydrate ceremonies
  const civilRow = seed.civil;
  const relRow = seed.religious;
  let civilWitnessList: string[] = [];
  if (civilRow?.witnesses) {
    try {
      const parsed = JSON.parse(civilRow.witnesses);
      if (Array.isArray(parsed)) civilWitnessList = parsed;
    } catch {
      civilWitnessList = String(civilRow.witnesses)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }

  const ceremonies: CeremonyDetails = {
    ...base.ceremonies,
    civilEnabled: Boolean(civilRow && (civilRow.location || civilRow.juez_oficial || civilRow.time)),
    civilDate: civilRow?.date || weddingDate,
    civilTime: civilRow?.time || '16:30',
    civilVenue: civilRow?.location || '',
    civilJudge: civilRow?.juez_oficial || '',
    civilNotes: civilRow?.notes || '',
    civilWitnesses: civilWitnessList.join(', '),
    civilWitnessList,
    religiousEnabled: Boolean(relRow && (relRow.temple_name || relRow.officiant || relRow.time)),
    religiousDate: relRow?.date || weddingDate,
    religiousTime: relRow?.time || '',
    religiousVenue: relRow?.temple_name || '',
    religiousOfficiant: relRow?.officiant || '',
    religiousNotes: relRow?.notes || ''
  };

  // Hydrate documents
  const files: FileItem[] = (seed.documents || []).map((d: any) => ({
    id: String(d.id),
    name: d.title || d.file_name || 'Documento',
    category:
      d.category === 'Contrato' || d.category === 'Comprobante' || d.category === 'Cotización'
        ? d.category
        : 'Contrato',
    date: (d.created_at || new Date().toISOString()).split('T')[0],
    notes: d.notes || '',
    dataUrl: d.file_url || undefined
  }));

  return {
    ...base,
    guests,
    tables,
    vendors,
    checklist,
    timeline,
    ceremonies,
    files
  };
}

export const WeddingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentWedding, token, logout } = useAuth();
  const [wedding, setWedding] = useState<WeddingState | null>(null);
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
        if (data.studio && data.studio.profile) {
          setWedding(data.studio);
        } else {
          const hydrated = hydrateWeddingFromLegacyDb(data);
          setWedding(hydrated);
          // Persist initial hydrated studio state immediately
          fetch(`/api/weddings/${weddingId}/novios-studio`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ studio: hydrated })
          }).catch(() => {});
        }
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

  const schedulePersist = (nextState: WeddingState) => {
    const weddingId = weddingIdRef.current;
    if (!weddingId || !token) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaving(true);
    saveTimerRef.current = window.setTimeout(() => {
      fetch(`/api/weddings/${weddingId}/novios-studio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ studio: nextState })
      })
        .catch(err => console.error('Error persisting novios studio:', err))
        .finally(() => setSaving(false));
    }, 500);
  };

  const updateWedding = (updater: (prev: WeddingState) => WeddingState) => {
    setWedding(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      schedulePersist(next);
      return next;
    });
  };

  const startNewWedding = (profile: WeddingProfile) => {
    const next = createInitialWeddingState(profile);
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
