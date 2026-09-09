import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadBuffer } from '../lib/storage.js';
import { publicUser } from '../lib/serialize.js';
import { XP_REWARDS } from '../lib/xp.js';

const ALLOWED_VIDEO = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 }, // 80MB — good-quality short clips
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_VIDEO.has(ext) && !file.mimetype.startsWith('video/')) {
      return cb(new Error('סוג קובץ לא נתמך — יש להעלות סרטון'));
    }
    cb(null, true);
  },
});

const router = Router();

function serializeReel(r, userId) {
  const author = get('SELECT * FROM users WHERE id = ?', [r.user_id]);
  const likes = get('SELECT COUNT(*) c FROM reel_likes WHERE reel_id = ?', [r.id])?.c || 0;
  const liked = userId ? !!get('SELECT 1 FROM reel_likes WHERE reel_id = ? AND user_id = ?', [r.id, userId]) : false;
  const comments = get('SELECT COUNT(*) c FROM reel_comments WHERE reel_id = ?', [r.id])?.c || 0;
  const game = r.game_id ? get('SELECT id, name, slug FROM games WHERE id = ?', [r.game_id]) : null;
  return {
    id: r.id,
    videoUrl: r.video_url,
    caption: r.caption,
    createdAt: r.created_at,
    author: publicUser(author),
    game: game ? { id: game.id, name: game.name, slug: game.slug } : null,
    likes,
    liked,
    comments,
  };
}

router.get('/', optionalAuth, (req, res) => {
  const { gameId, before } = req.query;
  let rows = all(
    `SELECT * FROM reels ${before ? 'WHERE created_at < ?' : ''} ORDER BY created_at DESC LIMIT 20`,
    before ? [before] : []
  );
  if (gameId) rows = rows.filter((r) => r.game_id === gameId);
  res.json({ reels: rows.map((r) => serializeReel(r, req.user?.id)) });
});

router.post('/', requireAuth, upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'לא הועלה סרטון' });
  const { caption, gameId } = req.body || {};
  try {
    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp4';
    const videoUrl = await uploadBuffer(req.file.buffer, `reels/${nanoid()}${ext}`, req.file.mimetype);

    const id = nanoid();
    run('INSERT INTO reels (id, user_id, game_id, video_url, caption) VALUES (?,?,?,?,?)', [
      id,
      req.user.id,
      gameId || null,
      videoUrl,
      (caption || '').slice(0, 300),
    ]);
    run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.CREATE_POST, req.user.id]);

    const r = get('SELECT * FROM reels WHERE id = ?', [id]);
    res.status(201).json({ reel: serializeReel(r, req.user.id) });
  } catch (err) {
    console.error('reel upload failed:', err);
    res.status(500).json({ error: 'העלאת הסרטון נכשלה, נסה שוב' });
  }
});

router.post('/:id/like', requireAuth, (req, res) => {
  const r = get('SELECT * FROM reels WHERE id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'הרילס לא נמצא' });
  const already = get('SELECT 1 FROM reel_likes WHERE reel_id = ? AND user_id = ?', [r.id, req.user.id]);
  if (already) run('DELETE FROM reel_likes WHERE reel_id = ? AND user_id = ?', [r.id, req.user.id]);
  else run('INSERT INTO reel_likes (reel_id, user_id) VALUES (?,?)', [r.id, req.user.id]);
  res.json({ reel: serializeReel(get('SELECT * FROM reels WHERE id = ?', [r.id]), req.user.id) });
});

router.get('/:id/comments', (req, res) => {
  const rows = all('SELECT * FROM reel_comments WHERE reel_id = ? ORDER BY created_at ASC', [req.params.id]);
  res.json({
    comments: rows.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      author: publicUser(get('SELECT * FROM users WHERE id = ?', [c.user_id])),
    })),
  });
});

router.post('/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: 'תגובה ריקה' });
  run('INSERT INTO reel_comments (id, reel_id, user_id, content) VALUES (?,?,?,?)', [
    nanoid(),
    req.params.id,
    req.user.id,
    content.slice(0, 500),
  ]);
  res.status(201).json({ ok: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const r = get('SELECT * FROM reels WHERE id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'הרילס לא נמצא' });
  const rank = { user: 0, verified: 1, helper: 2, moderator: 3, admin: 4, owner: 5 }[req.user.role] ?? 0;
  if (r.user_id !== req.user.id && rank < 3) return res.status(403).json({ error: 'אין הרשאה' });
  run('DELETE FROM reels WHERE id = ?', [r.id]);
  res.json({ ok: true });
});

export default router;
