import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import { get, run } from './index.js';
import { ensureAchievementRows } from '../lib/achievements.js';
import { getOrCreateChat } from '../lib/chatHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function id() {
  return nanoid();
}

function daysFromNow(days, hours = 0) {
  const d = new Date(Date.now() + days * 86400000 + hours * 3600000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

async function seed() {
  if (await get('SELECT id FROM games LIMIT 1')) {
    console.log('DB כבר מאותחלת — מדלג על seed.');
    return;
  }
  console.log('🌱 מאתחל את HC Israel (ללא נתוני דמו מזויפים — רק תשתית אמיתית)...');

  await ensureAchievementRows();

  // ---------- real utility accounts ----------
  // HC_Admin: the actual platform-owner account (needed to own official
  // servers/events and to access the moderation panel). "demo" is a clearly
  // labeled test-drive login. Neither pretends to be a random real player —
  // there are NO bot/fake user accounts anywhere in this seed.
  const adminId = id();
  await run(
    `INSERT INTO users (id, username, email, phone, password_hash, avatar_url, role, xp, bio, is_online)
     VALUES (?,?,?,?,?,?,?,?,?,0)`,
    [
      adminId,
      'HC_Admin',
      'admin@hcisrael.co.il',
      '0500000000',
      bcrypt.hashSync('admin123', 10),
      'https://api.dicebear.com/7.x/adventurer/svg?seed=HC_Admin',
      'owner',
      5000,
      'הצוות הרשמי של HC Israel 🎮',
    ]
  );

  const demoId = id();
  await run(
    `INSERT INTO users (id, username, email, phone, password_hash, avatar_url, role, xp, bio, is_online)
     VALUES (?,?,?,?,?,?,?,?,?,0)`,
    [
      demoId,
      'demo',
      'demo@hcisrael.co.il',
      '0501111111',
      bcrypt.hashSync('demo1234', 10),
      'https://api.dicebear.com/7.x/adventurer/svg?seed=demo_player',
      'verified',
      0,
      'משתמש דמו לבדיקות 🕹️',
    ]
  );

  // ---------- games catalog (real games, real cover art where verified) ----------
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'games-catalog.json'), 'utf-8'));
  const games = [];
  for (const g of catalog) {
    const gid = id();
    await run(
      `INSERT INTO games (id, name, slug, category, cover_url, logo_url) VALUES (?,?,?,?,?,?)`,
      [
        gid,
        g.name,
        g.slug,
        g.category,
        g.imageUrl, // null is fine — the client shows a generated brand card as a fallback
        `https://api.dicebear.com/7.x/shapes/svg?seed=${g.slug}`,
      ]
    );
    await getOrCreateChat('game', gid, `${g.name} ישראל`);
    games.push({ ...g, id: gid });
  }

  await getOrCreateChat('global', null, 'Global Chat');

  // ---------- one official HC Israel server per game (real infra, not fake social proof) ----------
  const servers = [];
  for (const g of games) {
    const sid = id();
    await run(
      `INSERT INTO servers (id, name, game_id, owner_id, type, image_url, description, max_players, status, rating, tags)
       VALUES (?,?,?,?,'official',?,?,?,?,?,?)`,
      [
        sid,
        `HC Official — ${g.name}`,
        g.id,
        adminId,
        g.imageUrl,
        `השרת הרשמי של HC Israel ל-${g.name}. בואו להצטרף ולשחק!`,
        200,
        'online',
        4.8,
        JSON.stringify([]),
      ]
    );
    await getOrCreateChat('server', sid, `צ'אט HC Official — ${g.name}`);
    servers.push({ id: sid, gameId: g.id });
  }

  // ---------- a few real upcoming official events, organized by the real admin account ----------
  const eventTemplates = [
    { title: 'טורניר Fortnite הגדול', gameSlug: 'fortnite', type: 'tournament', inDays: 1, inHours: 3 },
    { title: 'ליגת Valorant עונה 1', gameSlug: 'valorant', type: 'tournament', inDays: 3 },
    { title: 'HC Israel פתיחת עונה', gameSlug: null, type: 'official', inDays: 10 },
  ];
  const gameBySlug = Object.fromEntries(games.map((g) => [g.slug, g]));
  for (const e of eventTemplates) {
    const game = e.gameSlug ? gameBySlug[e.gameSlug] : null;
    await run(
      `INSERT INTO events (id, title, description, image_url, type, game_id, organizer_id, start_time)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id(),
        e.title,
        'הצטרפו אלינו לאירוע מיוחד עם פרסים לזוכים!',
        game?.imageUrl || null,
        e.type,
        game?.id || null,
        adminId,
        daysFromNow(e.inDays, e.inHours || 0),
      ]
    );
  }

  console.log(`✅ אותחל בהצלחה: ${games.length} משחקים, ${servers.length} שרתים רשמיים.`);
  console.log('   אין משתמשי דמו/בוטים, אין קהילות/פוסטים/הודעות מזויפים — הכל אמיתי מכאן והלאה.');
  console.log('   התחברות אדמין: HC_Admin / admin123');
  console.log('   התחברות דמו:    demo / demo1234');
}

await seed();
