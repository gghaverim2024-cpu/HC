import { get, run } from '../db/index.js';
import { nanoid } from 'nanoid';
import { XP_REWARDS } from './xp.js';

export const ACHIEVEMENT_DEFS = [
  {
    key: 'first_server',
    name: 'First Server',
    description: 'הצטרפת לשרת הראשון שלך.',
    icon: '🏆',
    xpReward: 50,
    check: async (userId) =>
      (await get('SELECT 1 FROM server_followers WHERE user_id = ? LIMIT 1', [userId])) != null,
  },
  {
    key: 'chat_master',
    name: 'Chat Master',
    description: 'שלחת 1,000 הודעות.',
    icon: '💬',
    xpReward: 200,
    check: async (userId) =>
      ((await get('SELECT COUNT(*) c FROM chat_messages WHERE user_id = ?', [userId]))?.c || 0) >= 1000,
  },
  {
    key: 'social',
    name: 'Social',
    description: 'הוספת 50 חברים.',
    icon: '👥',
    xpReward: 150,
    check: async (userId) =>
      ((
        await get(
          `SELECT COUNT(*) c FROM friendships WHERE status='accepted' AND (user_a=? OR user_b=?)`,
          [userId, userId]
        )
      )?.c || 0) >= 50,
  },
  {
    key: 'veteran',
    name: 'Veteran',
    description: 'היית פעיל ב-HC Israel במשך 30 ימים.',
    icon: '🔥',
    xpReward: 100,
    check: async (userId) => {
      const u = await get('SELECT created_at FROM users WHERE id = ?', [userId]);
      if (!u) return false;
      const days = (Date.now() - new Date(u.created_at + 'Z').getTime()) / 86400000;
      return days >= 30;
    },
  },
  {
    key: 'community_builder',
    name: 'Community Builder',
    description: 'יצרת קהילה משלך.',
    icon: '🏢',
    xpReward: 100,
    check: async (userId) =>
      (await get('SELECT 1 FROM communities WHERE owner_id = ? LIMIT 1', [userId])) != null,
  },
  {
    key: 'event_goer',
    name: 'Event Goer',
    description: 'הצטרפת לאירוע הראשון שלך.',
    icon: '🎉',
    xpReward: 50,
    check: async (userId) =>
      (await get('SELECT 1 FROM event_participants WHERE user_id = ? LIMIT 1', [userId])) != null,
  },
];

export async function ensureAchievementRows() {
  for (const def of ACHIEVEMENT_DEFS) {
    const existing = await get('SELECT id FROM achievements WHERE key = ?', [def.key]);
    if (!existing) {
      await run('INSERT INTO achievements (id, key, name, description, icon, xp_reward) VALUES (?,?,?,?,?,?)', [
        nanoid(),
        def.key,
        def.name,
        def.description,
        def.icon,
        def.xpReward,
      ]);
    }
  }
}

export async function checkAndAwardAchievements(userId) {
  const unlocked = [];
  for (const def of ACHIEVEMENT_DEFS) {
    const row = await get('SELECT id, xp_reward, name, icon, description FROM achievements WHERE key = ?', [def.key]);
    if (!row) continue;
    const already = await get('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?', [
      userId,
      row.id,
    ]);
    if (already) continue;
    if (await def.check(userId)) {
      await run('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?,?)', [userId, row.id]);
      await run('UPDATE users SET xp = xp + ? WHERE id = ?', [row.xp_reward, userId]);
      unlocked.push({ key: def.key, name: row.name, icon: row.icon, description: row.description });
    }
  }
  return unlocked;
}
