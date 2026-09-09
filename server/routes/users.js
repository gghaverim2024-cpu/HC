import { Router } from 'express';
import { get, all, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { publicUser, privateUser } from '../lib/serialize.js';

const router = Router();

function userStats(userId) {
  const friends =
    get(
      `SELECT COUNT(*) c FROM friendships WHERE status='accepted' AND (user_a=? OR user_b=?)`,
      [userId, userId]
    )?.c || 0;
  const achievements = get('SELECT COUNT(*) c FROM user_achievements WHERE user_id = ?', [userId])?.c || 0;
  const servers = get('SELECT COUNT(*) c FROM server_followers WHERE user_id = ?', [userId])?.c || 0;
  const posts = get('SELECT COUNT(*) c FROM posts WHERE user_id = ?', [userId])?.c || 0;
  return { friends, achievements, servers, posts };
}

router.get('/:id', optionalAuth, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ? OR username = ?', [req.params.id, req.params.id]);
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
  const isSelf = req.user?.id === user.id;
  res.json({
    user: isSelf ? privateUser(user) : publicUser(user),
    stats: userStats(user.id),
  });
});

router.get('/:id/achievements', (req, res) => {
  const user = get('SELECT id FROM users WHERE id = ? OR username = ?', [req.params.id, req.params.id]);
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
  const rows = all(
    `SELECT a.key, a.name, a.description, a.icon, a.xp_reward as xpReward, ua.earned_at as earnedAt
     FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = ? ORDER BY ua.earned_at DESC`,
    [user.id]
  );
  const all_ = all('SELECT key, name, description, icon FROM achievements');
  const earnedKeys = new Set(rows.map((r) => r.key));
  res.json({
    earned: rows,
    locked: all_.filter((a) => !earnedKeys.has(a.key)),
  });
});

router.patch('/me', requireAuth, (req, res) => {
  const { bio, avatarUrl, bannerUrl, favoriteGames } = req.body || {};
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  run(
    `UPDATE users SET bio = ?, avatar_url = ?, banner_url = ?, favorite_games = ? WHERE id = ?`,
    [
      bio ?? user.bio,
      avatarUrl ?? user.avatar_url,
      bannerUrl ?? user.banner_url,
      favoriteGames ? JSON.stringify(favoriteGames) : user.favorite_games,
      user.id,
    ]
  );
  const updated = get('SELECT * FROM users WHERE id = ?', [user.id]);
  res.json({ user: privateUser(updated) });
});

router.get('/', (req, res) => {
  const q = (req.query.q || '').toString();
  const rows = all(`SELECT * FROM users WHERE username LIKE ? LIMIT 20`, [`%${q}%`]);
  res.json({ users: rows.map(publicUser) });
});

export default router;
