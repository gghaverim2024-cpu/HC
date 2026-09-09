import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser } from '../lib/serialize.js';
import { XP_REWARDS } from '../lib/xp.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { pushNotification } from '../lib/notify.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const rows = all(
    `SELECT * FROM friendships WHERE status = 'accepted' AND (user_a = ? OR user_b = ?)`,
    [req.user.id, req.user.id]
  );
  const friends = rows.map((r) => {
    const otherId = r.user_a === req.user.id ? r.user_b : r.user_a;
    return publicUser(get('SELECT * FROM users WHERE id = ?', [otherId]));
  });
  res.json({ friends });
});

router.get('/requests', requireAuth, (req, res) => {
  const incoming = all(`SELECT * FROM friendships WHERE status = 'pending' AND user_b = ?`, [req.user.id]);
  const outgoing = all(`SELECT * FROM friendships WHERE status = 'pending' AND user_a = ?`, [req.user.id]);
  res.json({
    incoming: incoming.map((r) => ({ id: r.id, from: publicUser(get('SELECT * FROM users WHERE id = ?', [r.user_a])) })),
    outgoing: outgoing.map((r) => ({ id: r.id, to: publicUser(get('SELECT * FROM users WHERE id = ?', [r.user_b])) })),
  });
});

router.post('/request/:userId', requireAuth, (req, res) => {
  const target = get('SELECT id FROM users WHERE id = ?', [req.params.userId]);
  if (!target) return res.status(404).json({ error: 'משתמש לא נמצא' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'לא ניתן להוסיף את עצמך' });
  const existing = get(
    `SELECT * FROM friendships WHERE (user_a=? AND user_b=?) OR (user_a=? AND user_b=?)`,
    [req.user.id, target.id, target.id, req.user.id]
  );
  if (existing) return res.status(409).json({ error: 'כבר קיימת בקשה או חברות' });
  const id = nanoid();
  run(`INSERT INTO friendships (id, user_a, user_b, status) VALUES (?,?,?,'pending')`, [
    id,
    req.user.id,
    target.id,
  ]);
  pushNotification(target.id, 'friend_request', { fromUserId: req.user.id, fromUsername: req.user.username });
  res.status(201).json({ ok: true });
});

router.post('/accept/:requestId', requireAuth, (req, res) => {
  const fr = get('SELECT * FROM friendships WHERE id = ?', [req.params.requestId]);
  if (!fr || fr.user_b !== req.user.id) return res.status(403).json({ error: 'אין הרשאה' });
  run(`UPDATE friendships SET status = 'accepted' WHERE id = ?`, [fr.id]);
  run('UPDATE users SET xp = xp + ? WHERE id IN (?, ?)', [XP_REWARDS.ADD_FRIEND, fr.user_a, fr.user_b]);
  const unlockedA = checkAndAwardAchievements(fr.user_a);
  const unlockedB = checkAndAwardAchievements(fr.user_b);
  res.json({ ok: true, unlocked: [...unlockedA, ...unlockedB] });
});

router.delete('/:requestId', requireAuth, (req, res) => {
  const fr = get('SELECT * FROM friendships WHERE id = ?', [req.params.requestId]);
  if (!fr || (fr.user_a !== req.user.id && fr.user_b !== req.user.id)) {
    return res.status(403).json({ error: 'אין הרשאה' });
  }
  run('DELETE FROM friendships WHERE id = ?', [fr.id]);
  res.json({ ok: true });
});

export default router;
