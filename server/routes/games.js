import { Router } from 'express';
import { nanoid } from 'nanoid';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeGame } from '../lib/serialize.js';
import { getCount, registerKey } from '../realtime/presence.js';
import { getOrCreateChat } from '../lib/chatHelpers.js';
import { XP_REWARDS } from '../lib/xp.js';

const CATEGORIES = [
  'battle-royale', 'sandbox', 'fps', 'moba', 'strategy', 'rpg', 'sports', 'arcade',
  'puzzle', 'action', 'mmo', 'ar', 'fighting', 'racing', 'simulation', 'survival',
  'board', 'casual', 'social',
];

function slugify(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'game';
}

const router = Router();

function gameWithStats(g) {
  const servers = get('SELECT COUNT(*) c FROM servers WHERE game_id = ?', [g.id])?.c || 0;
  const communities = get('SELECT COUNT(*) c FROM communities WHERE game_id = ?', [g.id])?.c || 0;
  const chats = get(`SELECT COUNT(*) c FROM chats WHERE type='game' AND ref_id = ?`, [g.id])?.c || 0;
  const chat = get(`SELECT id FROM chats WHERE type='game' AND ref_id = ?`, [g.id]);
  return serializeGame(g, {
    onlinePlayers: getCount(`game:${g.id}`),
    servers,
    communities,
    chats,
    chatId: chat?.id,
  });
}

router.get('/', (req, res) => {
  const { sort = 'popular', category, q } = req.query;
  let games = all('SELECT * FROM games');
  if (category) games = games.filter((g) => g.category === category);
  if (q) games = games.filter((g) => g.name.toLowerCase().includes(String(q).toLowerCase()));
  let out = games.map(gameWithStats);
  if (sort === 'popular') out.sort((a, b) => b.onlinePlayers - a.onlinePlayers);
  else if (sort === 'new') out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  else if (sort === 'players') out.sort((a, b) => b.onlinePlayers - a.onlinePlayers);
  res.json({ games: out });
});

router.post('/', requireAuth, (req, res) => {
  const { name, category, coverUrl, logoUrl } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'שם המשחק הוא שדה חובה' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'קטגוריה לא תקינה' });
  if (get('SELECT id FROM games WHERE name = ? COLLATE NOCASE', [name.trim()])) {
    return res.status(409).json({ error: 'משחק בשם הזה כבר קיים' });
  }

  let slug = slugify(name);
  if (get('SELECT id FROM games WHERE slug = ?', [slug])) slug = `${slug}-${nanoid(6).toLowerCase()}`;

  const id = nanoid();
  run(
    `INSERT INTO games (id, name, slug, category, cover_url, logo_url, created_by) VALUES (?,?,?,?,?,?,?)`,
    [
      id,
      name.trim(),
      slug,
      category,
      coverUrl || null,
      logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${slug}`,
      req.user.id,
    ]
  );
  getOrCreateChat('game', id, `${name.trim()} ישראל`);
  registerKey(`game:${id}`);
  run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.CREATE_GAME, req.user.id]);

  const g = get('SELECT * FROM games WHERE id = ?', [id]);
  res.status(201).json({ game: gameWithStats(g) });
});

router.get('/:idOrSlug', (req, res) => {
  const g = get('SELECT * FROM games WHERE id = ? OR slug = ?', [req.params.idOrSlug, req.params.idOrSlug]);
  if (!g) return res.status(404).json({ error: 'המשחק לא נמצא' });
  res.json({ game: gameWithStats(g) });
});

export default router;
