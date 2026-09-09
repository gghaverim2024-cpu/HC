import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { XP_REWARDS } from '../lib/xp.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { getOrCreateChat } from '../lib/chatHelpers.js';
import { pushNotification } from '../lib/notify.js';

const router = Router();

async function serializeCommunity(c, userId) {
  const members = (await get('SELECT COUNT(*) c FROM community_members WHERE community_id = ?', [c.id]))?.c || 0;
  const isMember = userId
    ? !!(await get('SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?', [c.id, userId]))
    : false;
  const requestStatus = userId
    ? (
        await get(
          `SELECT status FROM community_join_requests WHERE community_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1`,
          [c.id, userId]
        )
      )?.status
    : null;
  const chat = await get(`SELECT id FROM chats WHERE type='community' AND ref_id = ?`, [c.id]);
  return {
    id: c.id,
    name: c.name,
    gameId: c.game_id,
    ownerId: c.owner_id,
    logoUrl: c.logo_url,
    bannerUrl: c.banner_url,
    description: c.description,
    isPrivate: !!c.is_private,
    createdAt: c.created_at,
    members,
    isMember,
    pendingRequest: requestStatus === 'pending',
    chatId: chat?.id,
  };
}

async function isOwnerOrAdmin(communityId, userId) {
  const m = await get('SELECT role FROM community_members WHERE community_id = ? AND user_id = ?', [communityId, userId]);
  return !!m && ['owner', 'admin'].includes(m.role);
}

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { gameId, q } = req.query;
    let rows = await all('SELECT * FROM communities');
    if (gameId) rows = rows.filter((c) => c.game_id === gameId);
    if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(String(q).toLowerCase()));
    res.json({ communities: await Promise.all(rows.map((c) => serializeCommunity(c, req.user?.id))) });
  })
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const c = await get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
    res.json({ community: await serializeCommunity(c, req.user?.id) });
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, description, gameId, logoUrl, bannerUrl, isPrivate } = req.body || {};
    if (!name) return res.status(400).json({ error: 'שם קהילה הוא שדה חובה' });
    const id = nanoid();
    await run(
      `INSERT INTO communities (id, name, game_id, owner_id, logo_url, banner_url, description, is_private) VALUES (?,?,?,?,?,?,?,?)`,
      [id, name, gameId || null, req.user.id, logoUrl || null, bannerUrl || null, description || '', isPrivate ? 1 : 0]
    );
    await run('INSERT INTO community_members (community_id, user_id, role) VALUES (?,?,\'owner\')', [id, req.user.id]);
    await getOrCreateChat('community', id, `צ'אט ${name}`);
    await run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.CREATE_COMMUNITY, req.user.id]);
    await checkAndAwardAchievements(req.user.id);
    const c = await get('SELECT * FROM communities WHERE id = ?', [id]);
    res.status(201).json({ community: await serializeCommunity(c, req.user.id) });
  })
);

router.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const c = await get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
    const already = await get('SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?', [c.id, req.user.id]);
    if (already) return res.json({ ok: true, unlocked: [] });

    if (c.is_private) {
      const pending = await get(
        `SELECT 1 FROM community_join_requests WHERE community_id = ? AND user_id = ? AND status = 'pending'`,
        [c.id, req.user.id]
      );
      if (pending) return res.json({ ok: true, pending: true, unlocked: [] });
      await run('INSERT INTO community_join_requests (id, community_id, user_id) VALUES (?,?,?)', [
        nanoid(),
        c.id,
        req.user.id,
      ]);
      await pushNotification(c.owner_id, 'join_request', {
        communityId: c.id,
        communityName: c.name,
        fromUserId: req.user.id,
        fromUsername: req.user.username,
      });
      return res.json({ ok: true, pending: true, unlocked: [] });
    }

    await run('INSERT OR IGNORE INTO community_members (community_id, user_id, role) VALUES (?,?,\'member\')', [
      c.id,
      req.user.id,
    ]);
    await run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.JOIN_COMMUNITY, req.user.id]);
    const unlocked = await checkAndAwardAchievements(req.user.id);
    res.json({ ok: true, unlocked });
  })
);

router.get(
  '/:id/join-requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const c = await get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
    if (!(await isOwnerOrAdmin(c.id, req.user.id))) return res.status(403).json({ error: 'אין לך הרשאה' });
    const rows = await all(
      `SELECT jr.*, u.username, u.avatar_url FROM community_join_requests jr
     JOIN users u ON u.id = jr.user_id WHERE jr.community_id = ? AND jr.status = 'pending' ORDER BY jr.created_at DESC`,
      [c.id]
    );
    res.json({
      requests: rows.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        user: { id: r.user_id, username: r.username, avatarUrl: r.avatar_url },
      })),
    });
  })
);

router.post(
  '/:id/join-requests/:requestId/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const c = await get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
    if (!(await isOwnerOrAdmin(c.id, req.user.id))) return res.status(403).json({ error: 'אין לך הרשאה' });
    const jr = await get(`SELECT * FROM community_join_requests WHERE id = ? AND community_id = ?`, [req.params.requestId, c.id]);
    if (!jr) return res.status(404).json({ error: 'הבקשה לא נמצאה' });
    await run(`UPDATE community_join_requests SET status = 'approved' WHERE id = ?`, [jr.id]);
    await run('INSERT OR IGNORE INTO community_members (community_id, user_id, role) VALUES (?,?,\'member\')', [c.id, jr.user_id]);
    await run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.JOIN_COMMUNITY, jr.user_id]);
    await checkAndAwardAchievements(jr.user_id);
    await pushNotification(jr.user_id, 'join_approved', { communityId: c.id, communityName: c.name });
    res.json({ ok: true });
  })
);

router.post(
  '/:id/join-requests/:requestId/reject',
  requireAuth,
  asyncHandler(async (req, res) => {
    const c = await get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
    if (!(await isOwnerOrAdmin(c.id, req.user.id))) return res.status(403).json({ error: 'אין לך הרשאה' });
    const jr = await get(`SELECT * FROM community_join_requests WHERE id = ? AND community_id = ?`, [req.params.requestId, c.id]);
    if (!jr) return res.status(404).json({ error: 'הבקשה לא נמצאה' });
    await run(`UPDATE community_join_requests SET status = 'rejected' WHERE id = ?`, [jr.id]);
    await pushNotification(jr.user_id, 'join_rejected', { communityId: c.id, communityName: c.name });
    res.json({ ok: true });
  })
);

router.post(
  '/:id/leave',
  requireAuth,
  asyncHandler(async (req, res) => {
    await run('DELETE FROM community_members WHERE community_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  })
);

router.get(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const rows = await all(
      `SELECT u.id, u.username, u.avatar_url, cm.role FROM community_members cm
     JOIN users u ON u.id = cm.user_id WHERE cm.community_id = ?`,
      [req.params.id]
    );
    res.json({ members: rows.map((r) => ({ id: r.id, username: r.username, avatarUrl: r.avatar_url, role: r.role })) });
  })
);

// owner/admin can promote members to admin, or remove members
router.patch(
  '/:id/members/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const community = await get('SELECT * FROM communities WHERE id = ?', [req.params.id]);
    if (!community) return res.status(404).json({ error: 'הקהילה לא נמצאה' });
    const requester = await get('SELECT role FROM community_members WHERE community_id = ? AND user_id = ?', [
      community.id,
      req.user.id,
    ]);
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      return res.status(403).json({ error: 'אין לך הרשאה לנהל את הקהילה' });
    }
    const { role } = req.body || {};
    if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'תפקיד לא תקין' });
    await run('UPDATE community_members SET role = ? WHERE community_id = ? AND user_id = ?', [
      role,
      community.id,
      req.params.userId,
    ]);
    res.json({ ok: true });
  })
);

export default router;
