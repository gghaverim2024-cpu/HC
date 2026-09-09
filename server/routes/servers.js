import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { serializeServer } from '../lib/serialize.js';
import { getCount, registerKey } from '../realtime/presence.js';
import { getOrCreateChat } from '../lib/chatHelpers.js';
import { XP_REWARDS } from '../lib/xp.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';

const router = Router();

function withExtras(s, userId) {
  const followers = get('SELECT COUNT(*) c FROM server_followers WHERE server_id = ?', [s.id])?.c || 0;
  const following = userId
    ? !!get('SELECT 1 FROM server_followers WHERE server_id = ? AND user_id = ?', [s.id, userId])
    : false;
  const owner = s.owner_id ? get('SELECT username, avatar_url FROM users WHERE id = ?', [s.owner_id]) : null;
  const chat = get(`SELECT id FROM chats WHERE type='server' AND ref_id = ?`, [s.id]);
  return serializeServer(s, {
    onlinePlayers: getCount(`server:${s.id}`),
    followers,
    following,
    ownerName: owner?.username,
    ownerAvatar: owner?.avatar_url,
    chatId: chat?.id,
  });
}

router.get('/', optionalAuth, (req, res) => {
  const { gameId, type, sort = 'popular', q } = req.query;
  let rows = all('SELECT * FROM servers');
  if (gameId) rows = rows.filter((s) => s.game_id === gameId);
  if (type) rows = rows.filter((s) => s.type === type);
  if (q) rows = rows.filter((s) => s.name.toLowerCase().includes(String(q).toLowerCase()));
  let out = rows.map((s) => withExtras(s, req.user?.id));
  if (sort === 'popular') out.sort((a, b) => b.onlinePlayers - a.onlinePlayers);
  else if (sort === 'rating') out.sort((a, b) => b.rating - a.rating);
  else if (sort === 'new') out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ servers: out });
});

router.get('/:id', optionalAuth, (req, res) => {
  const s = get('SELECT * FROM servers WHERE id = ?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'השרת לא נמצא' });
  res.json({ server: withExtras(s, req.user?.id) });
});

router.post('/', requireAuth, (req, res) => {
  const { name, gameId, description, maxPlayers, imageUrl, tags } = req.body || {};
  if (!name || !gameId) return res.status(400).json({ error: 'שם ומשחק הם שדות חובה' });
  const game = get('SELECT id FROM games WHERE id = ?', [gameId]);
  if (!game) return res.status(400).json({ error: 'משחק לא תקין' });

  const id = nanoid();
  run(
    `INSERT INTO servers (id, name, game_id, owner_id, type, image_url, description, max_players, tags)
     VALUES (?,?,?,?,'community',?,?,?,?)`,
    [id, name, gameId, req.user.id, imageUrl || null, description || '', maxPlayers || 100, JSON.stringify(tags || [])]
  );
  registerKey(`server:${id}`);
  const chat = getOrCreateChat('server', id, `צ'אט ${name}`);
  run('INSERT OR IGNORE INTO server_followers (server_id, user_id) VALUES (?,?)', [id, req.user.id]);
  run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.CREATE_SERVER, req.user.id]);
  checkAndAwardAchievements(req.user.id);

  const s = get('SELECT * FROM servers WHERE id = ?', [id]);
  res.status(201).json({ server: withExtras(s, req.user.id), chatId: chat.id });
});

router.post('/:id/follow', requireAuth, (req, res) => {
  const s = get('SELECT * FROM servers WHERE id = ?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'השרת לא נמצא' });
  run('INSERT OR IGNORE INTO server_followers (server_id, user_id) VALUES (?,?)', [s.id, req.user.id]);
  run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.JOIN_COMMUNITY, req.user.id]);
  const unlocked = checkAndAwardAchievements(req.user.id);
  res.json({ ok: true, unlocked });
});

router.delete('/:id/follow', requireAuth, (req, res) => {
  run('DELETE FROM server_followers WHERE server_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

export default router;
