import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { publicUser } from '../lib/serialize.js';

const router = Router();
router.use(requireAuth, requireRole('moderator'));

router.get(
  '/reports',
  asyncHandler(async (_req, res) => {
    const rows = await all(`SELECT * FROM reports WHERE status = 'open' ORDER BY created_at DESC`);
    res.json({
      reports: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          targetType: r.target_type,
          targetId: r.target_id,
          reason: r.reason,
          createdAt: r.created_at,
          reporter: publicUser(await get('SELECT * FROM users WHERE id = ?', [r.reporter_id])),
        }))
      ),
    });
  })
);

router.post(
  '/reports/:id/resolve',
  asyncHandler(async (req, res) => {
    await run(`UPDATE reports SET status = 'resolved' WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  })
);

router.post(
  '/users/:id/mute',
  asyncHandler(async (req, res) => {
    await run(`UPDATE users SET status = 'muted' WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  })
);

router.post(
  '/users/:id/ban',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await run(`UPDATE users SET status = 'banned' WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  })
);

router.post(
  '/users/:id/unban',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await run(`UPDATE users SET status = 'active' WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  })
);

router.post(
  '/users/:id/role',
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const { role } = req.body || {};
    const validRoles = ['user', 'verified', 'helper', 'moderator', 'admin', 'owner'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'תפקיד לא תקין' });
    await run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ ok: true });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').toString();
    const rows = await all('SELECT * FROM users WHERE username LIKE ? ORDER BY created_at DESC LIMIT 50', [`%${q}%`]);
    res.json({
      users: rows.map((u) => ({ ...publicUser(u), email: u.email, status: u.status })),
    });
  })
);

export default router;
