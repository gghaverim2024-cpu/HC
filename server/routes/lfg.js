import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser } from '../lib/serialize.js';
import { pushNotification } from '../lib/notify.js';

const router = Router();

function serializeLfg(row) {
  const user = get('SELECT * FROM users WHERE id = ?', [row.user_id]);
  const game = get('SELECT id, name, slug, logo_url FROM games WHERE id = ?', [row.game_id]);
  return {
    id: row.id,
    mode: row.mode,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    user: publicUser(user),
    game: game ? { id: game.id, name: game.name, slug: game.slug, logoUrl: game.logo_url } : null,
  };
}

router.get('/', (req, res) => {
  const { gameId } = req.query;
  let rows = all(`SELECT * FROM looking_for_group WHERE status = 'open' ORDER BY created_at DESC LIMIT 100`);
  if (gameId) rows = rows.filter((r) => r.game_id === gameId);
  res.json({ entries: rows.map(serializeLfg) });
});

router.post('/', requireAuth, (req, res) => {
  const { gameId, mode, note } = req.body || {};
  if (!gameId) return res.status(400).json({ error: 'יש לבחור משחק' });
  const game = get('SELECT id FROM games WHERE id = ?', [gameId]);
  if (!game) return res.status(400).json({ error: 'משחק לא תקין' });

  // one open LFG post per user per game at a time
  const existing = get(
    `SELECT * FROM looking_for_group WHERE user_id = ? AND game_id = ? AND status = 'open'`,
    [req.user.id, gameId]
  );
  if (existing) {
    run('UPDATE looking_for_group SET mode = ?, note = ? WHERE id = ?', [mode || '', note || '', existing.id]);
    return res.json({ entry: serializeLfg(get('SELECT * FROM looking_for_group WHERE id = ?', [existing.id])) });
  }

  const id = nanoid();
  run('INSERT INTO looking_for_group (id, user_id, game_id, mode, note) VALUES (?,?,?,?,?)', [
    id,
    req.user.id,
    gameId,
    mode || '',
    note || '',
  ]);
  res.status(201).json({ entry: serializeLfg(get('SELECT * FROM looking_for_group WHERE id = ?', [id])) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const entry = get('SELECT * FROM looking_for_group WHERE id = ?', [req.params.id]);
  if (!entry || entry.user_id !== req.user.id) return res.status(403).json({ error: 'אין הרשאה' });
  run(`UPDATE looking_for_group SET status = 'closed' WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

router.post('/:id/invite', requireAuth, (req, res) => {
  const entry = get('SELECT * FROM looking_for_group WHERE id = ?', [req.params.id]);
  if (!entry) return res.status(404).json({ error: 'הבקשה לא נמצאה' });
  pushNotification(entry.user_id, 'group_invite', { fromUserId: req.user.id, fromUsername: req.user.username });
  res.json({ ok: true });
});

export default router;
