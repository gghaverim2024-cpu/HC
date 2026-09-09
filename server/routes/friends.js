import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { publicUser } from '../lib/serialize.js';
import { XP_REWARDS } from '../lib/xp.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { pushNotification } from '../lib/notify.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await all(
      `SELECT * FROM friendships WHERE status = 'accepted' AND (user_a = ? OR user_b = ?)`,
      [req.user.id, req.user.id]
    );
    const friends = await Promise.all(
      rows.map(async (r) => {
        const otherId = r.user_a === req.user.id ? r.user_b : r.user_a;
        return publicUser(await get('SELECT * FROM users WHERE id = ?', [otherId]));
      })
    );
    res.json({ friends });
  })
);

router.get(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const incoming = await all(`SELECT * FROM friendships WHERE status = 'pending' AND user_b = ?`, [req.user.id]);
    const outgoing = await all(`SELECT * FROM friendships WHERE status = 'pending' AND user_a = ?`, [req.user.id]);
    res.json({
      incoming: await Promise.all(
        incoming.map(async (r) => ({
          id: r.id,
          from: publicUser(await get('SELECT * FROM users WHERE id = ?', [r.user_a])),
        }))
      ),
      outgoing: await Promise.all(
        outgoing.map(async (r) => ({
          id: r.id,
          to: publicUser(await get('SELECT * FROM users WHERE id = ?', [r.user_b])),
        }))
      ),
    });
  })
);

router.post(
  '/request/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const target = await get('SELECT id FROM users WHERE id = ?', [req.params.userId]);
    if (!target) return res.status(404).json({ error: 'משתמש לא נמצא' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'לא ניתן להוסיף את עצמך' });
    const existing = await get(
      `SELECT * FROM friendships WHERE (user_a=? AND user_b=?) OR (user_a=? AND user_b=?)`,
      [req.user.id, target.id, target.id, req.user.id]
    );
    if (existing) return res.status(409).json({ error: 'כבר קיימת בקשה או חברות' });
    const id = nanoid();
    await run(`INSERT INTO friendships (id, user_a, user_b, status) VALUES (?,?,?,'pending')`, [
      id,
      req.user.id,
      target.id,
    ]);
    await pushNotification(target.id, 'friend_request', { fromUserId: req.user.id, fromUsername: req.user.username });
    res.status(201).json({ ok: true });
  })
);

router.post(
  '/accept/:requestId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const fr = await get('SELECT * FROM friendships WHERE id = ?', [req.params.requestId]);
    if (!fr || fr.user_b !== req.user.id) return res.status(403).json({ error: 'אין הרשאה' });
    await run(`UPDATE friendships SET status = 'accepted' WHERE id = ?`, [fr.id]);
    await run('UPDATE users SET xp = xp + ? WHERE id IN (?, ?)', [XP_REWARDS.ADD_FRIEND, fr.user_a, fr.user_b]);
    const unlockedA = await checkAndAwardAchievements(fr.user_a);
    const unlockedB = await checkAndAwardAchievements(fr.user_b);
    res.json({ ok: true, unlocked: [...unlockedA, ...unlockedB] });
  })
);

router.delete(
  '/:requestId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const fr = await get('SELECT * FROM friendships WHERE id = ?', [req.params.requestId]);
    if (!fr || (fr.user_a !== req.user.id && fr.user_b !== req.user.id)) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    await run('DELETE FROM friendships WHERE id = ?', [fr.id]);
    res.json({ ok: true });
  })
);

export default router;
