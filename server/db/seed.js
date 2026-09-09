import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { get, run } from './index.js';
import { ensureAchievementRows } from '../lib/achievements.js';
import { getOrCreateChat } from '../lib/chatHelpers.js';

function id() {
  return nanoid();
}

function daysFromNow(days, hours = 0) {
  const d = new Date(Date.now() + days * 86400000 + hours * 3600000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function seed() {
  if (get('SELECT id FROM games LIMIT 1')) {
    console.log('DB כבר מאותחלת — מדלג על seed.');
    return;
  }
  console.log('🌱 מזריע נתוני דמו ל-HC Israel...');

  ensureAchievementRows();

  // ---------- users ----------
  const adminId = id();
  run(
    `INSERT INTO users (id, username, email, password_hash, avatar_url, role, xp, bio, is_online)
     VALUES (?,?,?,?,?,?,?,?,0)`,
    [
      adminId,
      'HC_Admin',
      'admin@hcisrael.co.il',
      bcrypt.hashSync('admin123', 10),
      'https://api.dicebear.com/7.x/adventurer/svg?seed=HC_Admin',
      'owner',
      5000,
      'הצוות הרשמי של HC Israel 🎮',
    ]
  );

  const demoId = id();
  run(
    `INSERT INTO users (id, username, email, password_hash, avatar_url, role, xp, bio, is_online)
     VALUES (?,?,?,?,?,?,?,?,0)`,
    [
      demoId,
      'demo',
      'demo@hcisrael.co.il',
      bcrypt.hashSync('demo1234', 10),
      'https://api.dicebear.com/7.x/adventurer/svg?seed=demo_player',
      'verified',
      1200,
      'משתמש דמו לבדיקות 🕹️',
    ]
  );

  const botNames = [
    'NoamGamer', 'ShaharPro', 'YuvalCraft', 'TalSniper', 'RoeiFN', 'DanaBuilds',
    'ItayClutch', 'MayaLoot', 'OmerRush', 'LiorSquad', 'NoaValo', 'AviBrawler',
    'GalPixel', 'RonMine', 'AdiFrag', 'BarBlox', 'EitanRank', 'ShiraGG',
    'YosiTank', 'KerenAim', 'AsafDuel', 'NitzanFast', 'ElaCraft', 'MattanZone',
    'RazHunter', 'YaelSpray', 'TomerBoost', 'HilaWave', 'AmitCore', 'SaharPeak',
  ];
  // Bot accounts exist only to populate example servers/communities/LFG posts
  // with realistic-looking demo content. They are never marked online — only
  // real connected sockets count toward any "online" number in this app.
  const botIds = botNames.map((name) => {
    const uid = id();
    run(
      `INSERT INTO users (id, username, email, password_hash, avatar_url, role, xp, bio, is_bot, is_online)
       VALUES (?,?,?,?,?,?,?,?,1,0)`,
      [
        uid,
        name,
        `${name.toLowerCase()}@bots.hcisrael.co.il`,
        bcrypt.hashSync(nanoid(), 10),
        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        Math.random() < 0.1 ? 'verified' : 'user',
        Math.floor(Math.random() * 8000),
        '',
      ]
    );
    return uid;
  });

  // ---------- games ----------
  const gamesData = [
    { name: 'Minecraft', slug: 'minecraft', category: 'sandbox' },
    { name: 'Fortnite', slug: 'fortnite', category: 'battle-royale' },
    { name: 'Brawl Stars', slug: 'brawl-stars', category: 'action' },
    { name: 'Roblox', slug: 'roblox', category: 'sandbox' },
    { name: 'Valorant', slug: 'valorant', category: 'fps' },
    { name: 'CS2', slug: 'cs2', category: 'fps' },
    { name: 'FIFA 24', slug: 'fifa', category: 'sports' },
    { name: 'Rocket League', slug: 'rocket-league', category: 'sports' },
  ];
  const games = gamesData.map((g) => {
    const gid = id();
    run(
      `INSERT INTO games (id, name, slug, category, cover_url, logo_url) VALUES (?,?,?,?,?,?)`,
      [
        gid,
        g.name,
        g.slug,
        g.category,
        `https://picsum.photos/seed/${g.slug}/900/500`,
        `https://api.dicebear.com/7.x/shapes/svg?seed=${g.slug}`,
      ]
    );
    return { ...g, id: gid };
  });
  const gameBySlug = Object.fromEntries(games.map((g) => [g.slug, g]));

  // game chats
  for (const g of games) {
    getOrCreateChat('game', g.id, `${g.name} ישראל`);
  }
  getOrCreateChat('global', null, 'Global Chat');

  // ---------- servers ----------
  const serverTemplates = [
    { slug: 'minecraft', name: 'HC Survival', type: 'official', tags: ['survival', 'pvp'], max: 200, rating: 4.8 },
    { slug: 'minecraft', name: 'SkyBlock ישראל', type: 'community', tags: ['skyblock', 'creative'], max: 150, rating: 4.5 },
    { slug: 'minecraft', name: 'Hardcore Realms', type: 'community', tags: ['survival', 'hardcore'], max: 60, rating: 4.6 },
    { slug: 'fortnite', name: 'HC Battle Royale', type: 'official', tags: ['solo', 'squad'], max: 500, rating: 4.7 },
    { slug: 'fortnite', name: 'Zero Build ישראל', type: 'community', tags: ['zero-build', 'competitive'], max: 300, rating: 4.4 },
    { slug: 'brawl-stars', name: 'HC Brawlers', type: 'official', tags: ['ranked', 'competitive'], max: 400, rating: 4.6 },
    { slug: 'roblox', name: 'HC Community Hub', type: 'official', tags: ['casual', 'creative'], max: 500, rating: 4.3 },
    { slug: 'valorant', name: 'HC Ranked Arena', type: 'official', tags: ['ranked', 'competitive'], max: 200, rating: 4.8 },
    { slug: 'cs2', name: 'HC Competitive', type: 'official', tags: ['competitive', 'ranked'], max: 150, rating: 4.7 },
    { slug: 'fifa', name: 'HC Ultimate League', type: 'community', tags: ['tournament', 'casual'], max: 100, rating: 4.2 },
    { slug: 'rocket-league', name: 'HC 3v3 League', type: 'community', tags: ['ranked', 'casual'], max: 80, rating: 4.4 },
  ];
  const servers = serverTemplates.map((s) => {
    const game = gameBySlug[s.slug];
    const sid = id();
    const ownerId = s.type === 'official' ? adminId : botIds[Math.floor(Math.random() * botIds.length)];
    run(
      `INSERT INTO servers (id, name, game_id, owner_id, type, image_url, description, max_players, status, rating, tags)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        sid,
        s.name,
        game.id,
        ownerId,
        s.type,
        `https://picsum.photos/seed/${s.name.replace(/\s+/g, '-')}/700/400`,
        `שרת ${s.type === 'official' ? 'רשמי' : 'קהילתי'} ל-${game.name}. בואו להצטרף ולשחק!`,
        s.max,
        'online',
        s.rating,
        JSON.stringify(s.tags),
      ]
    );
    getOrCreateChat('server', sid, `צ'אט ${s.name}`);
    // a handful of followers per server
    const followerCount = 3 + Math.floor(Math.random() * 6);
    const shuffled = [...botIds].sort(() => Math.random() - 0.5).slice(0, followerCount);
    for (const uid of shuffled) {
      run('INSERT OR IGNORE INTO server_followers (server_id, user_id) VALUES (?,?)', [sid, uid]);
    }
    return { id: sid, name: s.name, gameId: game.id };
  });

  // ---------- communities ----------
  const communityTemplates = [
    { slug: 'minecraft', name: 'קהילת מיינקראפט ישראל', desc: 'הבית של בוני העולם הישראלים.' },
    { slug: 'fortnite', name: 'Fortnite IL Squad', desc: 'קהילה לתחרויות ולמשחק משותף.' },
    { slug: 'valorant', name: 'Valorant Israel Esports', desc: 'קהילת אסטרטגיה ותחרויות דירוג.' },
  ];
  const communities = communityTemplates.map((c) => {
    const game = gameBySlug[c.slug];
    const cid = id();
    const ownerId = botIds[Math.floor(Math.random() * botIds.length)];
    run(
      `INSERT INTO communities (id, name, game_id, owner_id, logo_url, banner_url, description) VALUES (?,?,?,?,?,?,?)`,
      [
        cid,
        c.name,
        game.id,
        ownerId,
        `https://api.dicebear.com/7.x/shapes/svg?seed=${c.slug}-community`,
        `https://picsum.photos/seed/${c.slug}-banner/1200/300`,
        c.desc,
      ]
    );
    run('INSERT INTO community_members (community_id, user_id, role) VALUES (?,?,\'owner\')', [cid, ownerId]);
    const memberCount = 5 + Math.floor(Math.random() * 8);
    const shuffled = [...botIds].sort(() => Math.random() - 0.5).slice(0, memberCount);
    for (const uid of shuffled) {
      run('INSERT OR IGNORE INTO community_members (community_id, user_id, role) VALUES (?,?,\'member\')', [cid, uid]);
    }
    getOrCreateChat('community', cid, `צ'אט ${c.name}`);
    return { id: cid, name: c.name };
  });

  // ---------- chat messages (seed some history so chats feel alive) ----------
  const chatLines = [
    'היי לכולם, מי משחק עכשיו?', 'מישהו רוצה סקווד?', 'השרת הזה אש 🔥',
    'מי מכיר קלאן טוב?', 'עשיתי עכשיו קרייז מטורף', 'למישהו יש טיפים למתחילים?',
    'הטורניר הקרוב נשמע מעולה', 'מחפש עוד שניים לדירוג', 'ברוכים הבאים לצ׳אט!',
  ];
  const gameChats = games.map((g) => get(`SELECT * FROM chats WHERE type='game' AND ref_id = ?`, [g.id]));
  for (const chat of gameChats) {
    const msgCount = 8 + Math.floor(Math.random() * 15);
    for (let i = 0; i < msgCount; i++) {
      const author = botIds[Math.floor(Math.random() * botIds.length)];
      run('INSERT INTO chat_messages (id, chat_id, user_id, content, created_at) VALUES (?,?,?,?,datetime(\'now\',?))', [
        id(),
        chat.id,
        author,
        chatLines[Math.floor(Math.random() * chatLines.length)],
        `-${(msgCount - i) * 3} minutes`,
      ]);
    }
  }
  const globalChat = get(`SELECT * FROM chats WHERE type = 'global'`);
  for (let i = 0; i < 10; i++) {
    run('INSERT INTO chat_messages (id, chat_id, user_id, content, created_at) VALUES (?,?,?,?,datetime(\'now\',?))', [
      id(),
      globalChat.id,
      botIds[Math.floor(Math.random() * botIds.length)],
      chatLines[Math.floor(Math.random() * chatLines.length)],
      `-${(10 - i) * 4} minutes`,
    ]);
  }

  // ---------- LFG ----------
  const lfgModes = ['Squad', 'Duo', 'Ranked', 'Casual', 'Tournament'];
  for (let i = 0; i < 14; i++) {
    const uid = botIds[Math.floor(Math.random() * botIds.length)];
    const g = games[Math.floor(Math.random() * games.length)];
    run('INSERT OR IGNORE INTO looking_for_group (id, user_id, game_id, mode, note) VALUES (?,?,?,?,?)', [
      id(),
      uid,
      g.id,
      lfgModes[Math.floor(Math.random() * lfgModes.length)],
      'מחפש חברים לשחק איתם עכשיו',
    ]);
  }

  // ---------- events ----------
  const eventTemplates = [
    { title: 'טורניר Fortnite הגדול', gameSlug: 'fortnite', type: 'tournament', inDays: 1, inHours: 3 },
    { title: 'ליגת Valorant עונה 1', gameSlug: 'valorant', type: 'tournament', inDays: 3 },
    { title: 'מפגש בילדים - Minecraft Build Off', gameSlug: 'minecraft', type: 'community', inDays: 5 },
    { title: 'טורניר Brawl Stars סוף שבוע', gameSlug: 'brawl-stars', type: 'tournament', inDays: 7 },
    { title: 'HC Israel פתיחת עונה', gameSlug: null, type: 'official', inDays: 10 },
  ];
  for (const e of eventTemplates) {
    const eid = id();
    const game = e.gameSlug ? gameBySlug[e.gameSlug] : null;
    run(
      `INSERT INTO events (id, title, description, image_url, type, game_id, organizer_id, start_time)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        eid,
        e.title,
        'הצטרפו אלינו לאירוע מיוחד עם פרסים לזוכים!',
        `https://picsum.photos/seed/${e.title.replace(/\s+/g, '-')}/800/400`,
        e.type,
        game?.id || null,
        adminId,
        daysFromNow(e.inDays, e.inHours || 0),
      ]
    );
    const participantCount = 5 + Math.floor(Math.random() * 20);
    const shuffled = [...botIds].sort(() => Math.random() - 0.5).slice(0, participantCount);
    for (const uid of shuffled) {
      run('INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?,?)', [eid, uid]);
    }
  }

  // ---------- feed posts ----------
  const postTemplates = [
    'ניצחנו הרגע בטורניר! תודה לכל מי שבא לתמוך 🏆',
    'עדכון גרסה חדש יצא היום, מי כבר ניסה?',
    'מחפשים אחראי קהילה חדש, מי מתאים?',
    'תוצאות הטורניר של אתמול בפנים 👇',
    'בואו לראות את השרת החדש שלנו!',
  ];
  for (let i = 0; i < 10; i++) {
    const uid = botIds[Math.floor(Math.random() * botIds.length)];
    run('INSERT INTO posts (id, user_id, community_id, content, created_at) VALUES (?,?,?,?,datetime(\'now\',?))', [
      id(),
      uid,
      Math.random() < 0.4 ? communities[Math.floor(Math.random() * communities.length)].id : null,
      postTemplates[Math.floor(Math.random() * postTemplates.length)],
      `-${(10 - i) * 40} minutes`,
    ]);
  }

  console.log(`✅ Seed הושלם: ${games.length} משחקים, ${servers.length} שרתים, ${communities.length} קהילות, ${botIds.length} בוטים.`);
  console.log('   התחברות אדמין: HC_Admin / admin123');
  console.log('   התחברות דמו:    demo / demo1234');
}

seed();
