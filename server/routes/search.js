import { Router } from 'express';
import { all } from '../db/index.js';
import { serializeGame, serializeServer, publicUser } from '../lib/serialize.js';
import { getCount } from '../realtime/presence.js';

const router = Router();

router.get('/', (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();
  if (!q) return res.json({ games: [], servers: [], users: [], communities: [], events: [] });

  const games = all('SELECT * FROM games')
    .filter((g) => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
    .slice(0, 8)
    .map((g) => serializeGame(g, { onlinePlayers: getCount(`game:${g.id}`) }));

  const servers = all('SELECT * FROM servers')
    .filter((s) => s.name.toLowerCase().includes(q) || (s.tags || '').toLowerCase().includes(q))
    .slice(0, 8)
    .map((s) => serializeServer(s, { onlinePlayers: getCount(`server:${s.id}`) }));

  const users = all('SELECT * FROM users')
    .filter((u) => u.username.toLowerCase().includes(q))
    .slice(0, 8)
    .map(publicUser);

  const communities = all('SELECT * FROM communities')
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 8)
    .map((c) => ({ id: c.id, name: c.name, logoUrl: c.logo_url, description: c.description }));

  const events = all('SELECT * FROM events')
    .filter((e) => e.title.toLowerCase().includes(q))
    .slice(0, 8)
    .map((e) => ({ id: e.id, title: e.title, startTime: e.start_time, imageUrl: e.image_url }));

  res.json({ games, servers, users, communities, events });
});

export default router;
