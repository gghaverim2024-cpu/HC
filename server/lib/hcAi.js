import { all, get } from '../db/index.js';
import { serializeServer, publicUser } from './serialize.js';
import { getCount } from '../realtime/presence.js';

// HC AI — a rule-based (keyword + DB query) recommendation engine, not an
// external LLM call (no ongoing API cost). It parses the user's free-text
// Hebrew/English message for intent + a game name, then answers from real
// platform data. It intentionally stays scoped to gaming topics — anything
// clearly unrelated gets a polite redirect instead of a made-up answer.
// Swap this module for a real Claude API call later without touching the
// /api/ai route contract.

const GAME_ALIASES = {
  minecraft: ['מיינקראפט', 'minecraft', 'mc'],
  fortnite: ['פורטנייט', 'fortnite'],
  'brawl-stars': ['בראול סטארס', 'בראול', 'brawl stars', 'brawl'],
  roblox: ['רובלוקס', 'roblox'],
  valorant: ['ולורנט', 'valorant'],
  cs2: ['קאונטר', 'קונטר', 'סי אס', 'counter strike', 'cs2', 'cs'],
  'ea-fc-25': ['פיפא', 'fifa', 'איאף\'סי', 'ea fc', 'eafc'],
  'rocket-league': ['רוקט ליג', 'rocket league'],
  'league-of-legends': ['ליג אוף לג\'נדס', 'לול', 'league of legends', 'lol'],
  'free-fire': ['פרי פייר', 'free fire'],
  'pubg-mobile': ['פאבג', 'pubg'],
  'cod-warzone': ['וורזון', 'warzone'],
  'cod-mobile': ['קול אוף דיוטי', 'call of duty', 'קוד מובייל'],
  'apex-legends': ['אייפקס', 'apex'],
  'clash-royale': ['קלאש רויאל', 'clash royale'],
  'clash-of-clans': ['קלאש אוף קלאנס', 'clash of clans', 'קוק'],
  'genshin-impact': ['גנשין', 'genshin'],
  'among-us': ['אמאנג אס', 'among us'],
  'gta-v': ['גיטיאיי', 'gta', 'גילטה'],
  'world-of-warcraft': ['וורקראפט', 'wow', 'warcraft'],
  'dota-2': ['דוטה', 'dota'],
  'overwatch-2': ['אוברווטש', 'overwatch'],
};

const LFG_HINTS = ['אנשים', 'שחקנים לשחק', 'סקווד', 'squad', 'קבוצה', 'group', 'party', 'טים', 'team'];
const SERVER_HINTS = ['שרת', 'server', 'שרתים'];
const BIG_HINTS = ['הרבה שחקנים', 'הכי גדול', 'פופולרי', 'popular', 'most players', 'גדול'];

const GREETING_HINTS = ['שלום', 'היי', 'הי ', 'מה קורה', 'מה נשמע', 'hello', 'hi ', 'hey', 'yo'];
const HELP_HINTS = ['מה אתה יודע', 'מי אתה', 'מה זה hc', 'איך אתה עוזר', 'what can you do', 'who are you'];
const LEVEL_HINTS = ['רמה', 'level', 'xp', 'נקודות ניסיון', 'הישג', 'achievement'];
const RECOMMEND_GAME_HINTS = ['מה לשחק', 'איזה משחק', 'משחק טוב', 'מה כדאי לשחק', 'what should i play', 'recommend a game'];

// Any message that mentions gaming-adjacent vocabulary counts as on-topic,
// even if we can't match a specific game/server/LFG intent below.
const GAMING_SIGNAL_WORDS = [
  'משחק', 'משחקים', 'לשחק', 'שיחקתי', 'שרת', 'שרתים', 'קהילה', 'קהילות', 'טורניר', 'תחרות',
  'gaming', 'game', 'games', 'play', 'player', 'players', 'server', 'tournament', 'esports',
  'hc israel', 'hc ai', ...LFG_HINTS, ...SERVER_HINTS, ...LEVEL_HINTS, ...RECOMMEND_GAME_HINTS,
  ...Object.values(GAME_ALIASES).flat(),
];

async function detectGame(text) {
  const lower = text.toLowerCase();
  const games = await all('SELECT * FROM games');
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

function hasAny(lower, hints) {
  return hints.some((h) => lower.includes(h));
}

async function topActiveGames(limit = 3) {
  const games = await all('SELECT * FROM games');
  const withCounts = games.map((g) => ({ g, count: getCount(`game:${g.id}`) }));
  withCounts.sort((a, b) => b.count - a.count);
  return withCounts.slice(0, limit).map((x) => x.g);
}

export async function answerQuery(rawText, { excludeUserId } = {}) {
  const text = (rawText || '').trim();
  if (!text) {
    return { reply: 'ספר לי מה אתה מחפש — שרת, קבוצה למשחק, או קהילה, ואני אמצא לך משהו מתאים.', results: [] };
  }
  const lower = text.toLowerCase();

  if (hasAny(lower, GREETING_HINTS) && text.length < 25) {
    return {
      reply: 'היי! אני HC AI 🎮 אני יכול לעזור לך למצוא שרתים, שחקנים לשחק איתם, או המלצות במשחקים ב-HC Israel. מה בא לך לעשות?',
      results: [],
    };
  }

  if (hasAny(lower, HELP_HINTS)) {
    return {
      reply: 'אני HC AI, העוזר של HC Israel. אני יכול: למצוא לך שרת מתאים למשחק, למצוא שחקנים שמחפשים קבוצה, ולהמליץ על המשחקים הכי פעילים כרגע. נסה לשאול למשל "אני מחפש שרת Minecraft Survival".',
      results: [],
    };
  }

  if (hasAny(lower, LEVEL_HINTS) && !hasAny(lower, SERVER_HINTS)) {
    return {
      reply: 'ה-HC Level שלך עולה כשאתה פעיל בפלטפורמה — שולח הודעות, מצטרף לשרתים/קהילות, משתתף באירועים ופותח הישגים. אפשר לראות את ההתקדמות שלך בעמוד הפרופיל.',
      results: [],
    };
  }

  const game = await detectGame(text);

  if (!game && hasAny(lower, RECOMMEND_GAME_HINTS)) {
    const top = await topActiveGames(3);
    if (!top.length) return { reply: 'עדיין אין מספיק נתונים כדי להמליץ — נסה שוב מאוחר יותר.', results: [] };
    return {
      reply: `המשחקים הכי פעילים ב-HC Israel כרגע: ${top.map((g) => g.name).join(', ')}. רוצה שאמצא לך שרת או קבוצה לאחד מהם?`,
      results: [],
    };
  }

  if (!game) {
    if (!hasAny(lower, GAMING_SIGNAL_WORDS)) {
      return {
        reply: 'אני HC AI ומתמקד רק בנושאי גיימינג ב-HC Israel 🎮 — אני יכול לעזור לך למצוא משחקים, שרתים, קבוצות או שחקנים. נסה לשאול אותי משהו בכיוון הזה!',
        results: [],
      };
    }
    return {
      reply: 'לא הצלחתי לזהות משחק ספציפי בהודעה שלך. נסה למשל: "אני מחפש שרת Minecraft Survival" או "מחפש אנשים לשחק Fortnite".',
      results: [],
    };
  }

  const wantsLfg = hasAny(lower, LFG_HINTS);
  const wantsServer = hasAny(lower, SERVER_HINTS) || !wantsLfg;
  const wantsBig = hasAny(lower, BIG_HINTS);
  const tagKeywords = detectTagKeywords(text);

  if (wantsLfg && !wantsServer) {
    let rows = await all(
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
  let servers = await all('SELECT * FROM servers WHERE game_id = ?', [game.id]);
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
