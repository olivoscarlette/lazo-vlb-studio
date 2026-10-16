import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, requireWeddingAccess } from '../middleware/auth.js';

const router = Router();

// GET /api/weddings/:weddingId/directory - Unified contacts directory
router.get('/:weddingId/directory', authenticateToken, requireWeddingAccess, (req, res) => {
  const { weddingId } = req.params;

  // 1. Team assigned
  const team = db.prepare(`
    SELECT u.id, u.name, u.role as user_role, u.phone, u.email, u.avatar_url, a.assigned_role as role_in_wedding
    FROM users u
    JOIN wedding_assignments a ON a.user_id = u.id
    WHERE a.wedding_id = ?
    ORDER BY u.name ASC
  `).all(weddingId) as any[];

  // 2. Vendors
  const vendors = db.prepare(`
    SELECT id, name, phone, type, locations, contact_person, notes
    FROM vendors
    WHERE wedding_id = ?
    ORDER BY name ASC
  `).all(weddingId) as any[];

  for (const v of vendors) {
    try {
      v.locations = JSON.parse(v.locations);
    } catch {
      v.locations = [];
    }
  }

  return res.json({
    team: team.map(t => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      email: t.email,
      role: t.role_in_wedding || t.user_role,
      avatar_url: t.avatar_url,
      category: 'Equipo VLB Studio'
    })),
    vendors: vendors.map(v => ({
      id: v.id,
      name: v.name,
      contact_person: v.contact_person,
      phone: v.phone,
      type: v.type,
      locations: v.locations,
      notes: v.notes,
      category: 'Proveedor'
    }))
  });
});

export default router;
