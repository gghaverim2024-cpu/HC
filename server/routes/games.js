import { Router } from 'express';
import { all, get } from '../db/index.js';
import { serializeGame } from '../lib/serialize.js';
import { getCount } from '../realtime/presence.js';

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

router.get('/:idOrSlug', (req, res) => {
  const g = get('SELECT * FROM games WHERE id = ? OR slug = ?', [req.params.idOrSlug, req.params.idOrSlug]);
  if (!g) return res.status(404).json({ error: 'המשחק לא נמצא' });
  res.json({ game: gameWithStats(g) });
});

export default router;
