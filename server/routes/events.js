import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { XP_REWARDS } from '../lib/xp.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';

const router = Router();

async function serializeEvent(e, userId) {
  const participants = (await get('SELECT COUNT(*) c FROM event_participants WHERE event_id = ?', [e.id]))?.c || 0;
  const joined = userId
    ? !!(await get('SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?', [e.id, userId]))
    : false;
  const organizer = await get('SELECT username, avatar_url FROM users WHERE id = ?', [e.organizer_id]);
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    imageUrl: e.image_url,
    type: e.type,
    gameId: e.game_id,
    startTime: e.start_time,
    organizerName: organizer?.username,
    organizerAvatar: organizer?.avatar_url,
    participants,
    joined,
  };
}

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const rows = await all('SELECT * FROM events ORDER BY start_time ASC');
    res.json({ events: await Promise.all(rows.map((e) => serializeEvent(e, req.user?.id))) });
  })
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const e = await get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!e) return res.status(404).json({ error: 'האירוע לא נמצא' });
    res.json({ event: await serializeEvent(e, req.user?.id) });
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { title, description, imageUrl, type, gameId, startTime } = req.body || {};
    if (!title || !startTime) return res.status(400).json({ error: 'כותרת ותאריך הם שדות חובה' });
    const id = nanoid();
    await run(
      `INSERT INTO events (id, title, description, image_url, type, game_id, organizer_id, start_time)
     VALUES (?,?,?,?,?,?,?,?)`,
      [id, title, description || '', imageUrl || null, type || 'community', gameId || null, req.user.id, startTime]
    );
    const e = await get('SELECT * FROM events WHERE id = ?', [id]);
    res.status(201).json({ event: await serializeEvent(e, req.user.id) });
  })
);

router.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const e = await get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!e) return res.status(404).json({ error: 'האירוע לא נמצא' });
    await run('INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?,?)', [e.id, req.user.id]);
    await run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.JOIN_EVENT, req.user.id]);
    const unlocked = await checkAndAwardAchievements(req.user.id);
    res.json({ ok: true, unlocked });
  })
);

router.delete(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    await run('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  })
);

export default router;
