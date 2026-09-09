import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { publicUser } from '../lib/serialize.js';
import { XP_REWARDS } from '../lib/xp.js';

const router = Router();

async function serializePost(p, userId) {
  const author = await get('SELECT * FROM users WHERE id = ?', [p.user_id]);
  const likes = (await get('SELECT COUNT(*) c FROM post_likes WHERE post_id = ?', [p.id]))?.c || 0;
  const liked = userId ? !!(await get('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', [p.id, userId])) : false;
  const comments = (await get('SELECT COUNT(*) c FROM post_comments WHERE post_id = ?', [p.id]))?.c || 0;
  const community = p.community_id
    ? await get('SELECT id, name, logo_url FROM communities WHERE id = ?', [p.community_id])
    : null;
  return {
    id: p.id,
    content: p.content,
    imageUrl: p.image_url,
    createdAt: p.created_at,
    author: publicUser(author),
    community: community ? { id: community.id, name: community.name, logoUrl: community.logo_url } : null,
    likes,
    liked,
    comments,
  };
}

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { communityId } = req.query;
    let rows = await all('SELECT * FROM posts ORDER BY created_at DESC LIMIT 50');
    if (communityId) rows = rows.filter((p) => p.community_id === communityId);
    res.json({ posts: await Promise.all(rows.map((p) => serializePost(p, req.user?.id))) });
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { content, imageUrl, communityId } = req.body || {};
    if (!content?.trim() && !imageUrl) return res.status(400).json({ error: 'הפוסט לא יכול להיות ריק' });
    const id = nanoid();
    await run('INSERT INTO posts (id, user_id, community_id, content, image_url) VALUES (?,?,?,?,?)', [
      id,
      req.user.id,
      communityId || null,
      content || '',
      imageUrl || null,
    ]);
    await run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.CREATE_POST, req.user.id]);
    const p = await get('SELECT * FROM posts WHERE id = ?', [id]);
    res.status(201).json({ post: await serializePost(p, req.user.id) });
  })
);

router.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    const p = await get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'הפוסט לא נמצא' });
    const already = await get('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', [p.id, req.user.id]);
    if (already) await run('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [p.id, req.user.id]);
    else await run('INSERT INTO post_likes (post_id, user_id) VALUES (?,?)', [p.id, req.user.id]);
    res.json({ post: await serializePost(await get('SELECT * FROM posts WHERE id = ?', [p.id]), req.user.id) });
  })
);

router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const rows = await all('SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json({
      comments: await Promise.all(
        rows.map(async (c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.created_at,
          author: publicUser(await get('SELECT * FROM users WHERE id = ?', [c.user_id])),
        }))
      ),
    });
  })
);

router.post(
  '/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { content } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ error: 'תגובה ריקה' });
    const id = nanoid();
    await run('INSERT INTO post_comments (id, post_id, user_id, content) VALUES (?,?,?,?)', [
      id,
      req.params.id,
      req.user.id,
      content,
    ]);
    res.status(201).json({ ok: true });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const p = await get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'הפוסט לא נמצא' });
    const rank = { user: 0, verified: 1, helper: 2, moderator: 3, admin: 4, owner: 5 }[req.user.role] ?? 0;
    if (p.user_id !== req.user.id && rank < 3) return res.status(403).json({ error: 'אין הרשאה' });
    await run('DELETE FROM posts WHERE id = ?', [p.id]);
    res.json({ ok: true });
  })
);

export default router;
