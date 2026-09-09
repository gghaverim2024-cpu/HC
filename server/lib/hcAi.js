import { all, get } from '../db/index.js';
import { serializeServer, publicUser } from './serialize.js';
import { getCount } from '../realtime/presence.js';

// HC AI — a rule-based (keyword + DB query) recommendation engine, not an
// external LLM call (no API key configured in this environment). It parses
// the user's free-text Hebrew/English message for a game name + intent, then
// queries real data. Swap this module for a real Claude API call later
// without touching the /api/ai route contract.

const GAME_ALIASES = {
  minecraft: ['מיינקראפט', 'minecraft', 'mc'],
  fortnite: ['פורטנייט', 'פורטנייט', 'fortnite'],
  'brawl-stars': ['בראול סטארס', 'בראול', 'brawl stars', 'brawl'],
  roblox: ['רובלוקס', 'roblox'],
  valorant: ['ולורנט', 'valorant'],
  cs2: ['קאונטר', 'קונטר', 'סי אס', 'counter strike', 'cs2', 'cs'],
  fifa: ['פיפא', 'fifa'],
};

const LFG_HINTS = ['אנשים', 'שחקנים לשחק', 'סקווד', 'squad', 'קבוצה', 'group', 'party', 'טים', 'team'];
const SERVER_HINTS = ['שרת', 'server', 'שרתים'];
const BIG_HINTS = ['הרבה שחקנים', 'הכי גדול', 'פופולרי', 'popular', 'most players', 'גדול'];

function detectGame(text) {
  const lower = text.toLowerCase();
  const games = all('SELECT * FROM games');
  for (const game of games) {
    if (lower.includes(game.name.toLowerCase())) return game;
    const aliases = GAME_ALIASES[game.slug] || [];
    if (aliases.some((a) => lower.includes(a.toLowerCase()))) return game;
  }
  return null;
}

function detectTagKeywords(text) {
  const tags = ['survival', 'הישרדות', 'ranked', 'מדורג', 'creative', 'יצירתי', 'competitive', 'תחרותי', 'casual', 'קז\'ואל'];
  const lower = text.toLowerCase();
  return tags.filter((t) => lower.includes(t));
}

export function answerQuery(rawText, { excludeUserId } = {}) {
  const text = (rawText || '').trim();
  if (!text) {
    return { reply: 'ספר לי מה אתה מחפש — שרת, קבוצה למשחק, או קהילה, ואני אמצא לך משהו מתאים.', results: [] };
  }

  const game = detectGame(text);
  const wantsLfg = LFG_HINTS.some((h) => text.toLowerCase().includes(h));
  const wantsServer = SERVER_HINTS.some((h) => text.toLowerCase().includes(h)) || !wantsLfg;
  const wantsBig = BIG_HINTS.some((h) => text.toLowerCase().includes(h));
  const tagKeywords = detectTagKeywords(text);

  if (!game) {
    return {
      reply: 'לא הצלחתי לזהות משחק בהודעה שלך. נסה למשל: "אני מחפש שרת Minecraft Survival" או "מחפש אנשים לשחק Fortnite".',
      results: [],
    };
  }

  if (wantsLfg && !wantsServer) {
    let rows = all(
      `SELECT lfg.*, u.* FROM looking_for_group lfg
       JOIN users u ON u.id = lfg.user_id
       WHERE lfg.game_id = ? AND lfg.status = 'open' ${excludeUserId ? 'AND lfg.user_id != ?' : ''}
       ORDER BY lfg.created_at DESC LIMIT 8`,
      excludeUserId ? [game.id, excludeUserId] : [game.id]
    );
    if (!rows.length) {
      return {
        reply: `כרגע אין שחקנים שמחפשים קבוצה ב-${game.name}. תוכל לפתוח בקשה משלך במסך "מצא שחקנים".`,
        results: [],
      };
    }
    return {
      reply: `מצאתי ${rows.length} שחקנים שמחפשים קבוצה ב-${game.name} עכשיו:`,
      results: rows.map((r) => ({ type: 'player', user: publicUser(r), mode: r.mode, note: r.note })),
    };
  }

  // default: server recommendation
  let servers = all('SELECT * FROM servers WHERE game_id = ?', [game.id]);
  if (tagKeywords.length) {
    servers = servers.filter((s) => {
      const tags = JSON.parse(s.tags || '[]').join(' ').toLowerCase();
      return tagKeywords.some((k) => tags.includes(k.toLowerCase()));
    });
  }
  servers.sort((a, b) => getCount(`server:${b.id}`) - getCount(`server:${a.id}`));
  const top = servers.slice(0, 3);

  if (!top.length) {
    return { reply: `לא מצאתי שרתי ${game.name} שתואמים למה שביקשת כרגע.`, results: [] };
  }

  return {
    reply: `${wantsBig ? 'השרתים הכי גדולים' : 'הנה כמה שרתים מומלצים'} ל-${game.name} כרגע:`,
    results: top.map((s) => ({
      type: 'server',
      server: serializeServer(s, { onlinePlayers: getCount(`server:${s.id}`) }),
    })),
  };
}
