import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const rows = all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [
    req.user.id,
  ]);
  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      payload: JSON.parse(n.payload || '{}'),
      read: !!n.read,
      createdAt: n.created_at,
    })),
    unreadCount: get('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0', [req.user.id])?.c || 0,
  });
});

router.post('/read-all', requireAuth, (req, res) => {
  run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/read', requireAuth, (req, res) => {
  run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

export default router;
