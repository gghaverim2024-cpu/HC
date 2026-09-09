import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { XP_REWARDS } from '../lib/xp.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { getOrCreateChat } from '../lib/chatHelpers.js';

const router = Router();

function serializeCommunity(c, userId) {
  const members = get('SELECT COUNT(*) c FROM community_members WHERE community_id = ?', [c.id])?.c || 0;
  const isMember = userId
    ? !!get('SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?', [c.id, userId])
    : false;
  const chat = get(`SELECT id FROM chats WHERE type='community' AND ref_id = ?`, [c.id]);
  return {
    id: c.id,
    name: c.name,
    gameId: c.game_id,
    ownerId: c.owner_id,
    logoUrl: c.logo_url,
    bannerUrl: c.banner_url,
    description: c.description,
    createdAt: c.created_at,
    members,
    isMember,
    chatId: chat?.id,
  };
}

router.get('/', optionalAuth, (req, res) => {
  const { gameId, q } = req.query;
  let rows = all('SELECT * FROM communities');
  if (gameId) rows = rows.filter((c) => c.game_id === gameId);
  if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(String(q).toLowerCase()));
  res.json({ communities: rows.map((c) => serializeCommunity(c, req.user?.id)) });
});

router.get('/:id', optionalAuth, (req, res) => {
  const c = get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
  res.json({ community: serializeCommunity(c, req.user?.id) });
});

router.post('/', requireAuth, (req, res) => {
  const { name, description, gameId, logoUrl, bannerUrl } = req.body || {};
  if (!name) return res.status(400).json({ error: 'שם קהילה הוא שדה חובה' });
  const id = nanoid();
  run(
    `INSERT INTO communities (id, name, game_id, owner_id, logo_url, banner_url, description) VALUES (?,?,?,?,?,?,?)`,
    [id, name, gameId || null, req.user.id, logoUrl || null, bannerUrl || null, description || '']
  );
  run('INSERT INTO community_members (community_id, user_id, role) VALUES (?,?,\'owner\')', [id, req.user.id]);
  getOrCreateChat('community', id, `צ'אט ${name}`);
  run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.CREATE_COMMUNITY, req.user.id]);
  checkAndAwardAchievements(req.user.id);
  const c = get('SELECT * FROM communities WHERE id = ?', [id]);
  res.status(201).json({ community: serializeCommunity(c, req.user.id) });
});

router.post('/:id/join', requireAuth, (req, res) => {
  const c = get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
  run('INSERT OR IGNORE INTO community_members (community_id, user_id, role) VALUES (?,?,\'member\')', [
    c.id,
    req.user.id,
  ]);
  run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.JOIN_COMMUNITY, req.user.id]);
  const unlocked = checkAndAwardAchievements(req.user.id);
  res.json({ ok: true, unlocked });
});

router.post('/:id/leave', requireAuth, (req, res) => {
  run('DELETE FROM community_members WHERE community_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

router.get('/:id/members', (req, res) => {
  const rows = all(
    `SELECT u.id, u.username, u.avatar_url, cm.role FROM community_members cm
     JOIN users u ON u.id = cm.user_id WHERE cm.community_id = ?`,
    [req.params.id]
  );
  res.json({ members: rows.map((r) => ({ id: r.id, username: r.username, avatarUrl: r.avatar_url, role: r.role })) });
});

// owner/admin can promote members to admin, or remove members
router.patch('/:id/members/:userId', requireAuth, (req, res) => {
  const community = get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
  if (!community) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
  const requester = get('SELECT role FROM community_members WHERE community_id = ? AND user_id = ?', [
    community.id,
    req.user.id,
  ]);
  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    return res.status(403).json({ error: 'אין לך הרשאה לנהל את הקהילה' });
  }
  const { role } = req.body || {};
  if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'תפקיד לא תקין' });
  run('UPDATE community_members SET role = ? WHERE community_id = ? AND user_id = ?', [
    role,
    community.id,
    req.params.userId,
  ]);
  res.json({ ok: true });
});

export default router;
