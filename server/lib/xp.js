// Level N requires cumulative XP of 100 * (1+2+...+(N-1)) = 100 * N*(N-1)/2
export function xpForLevel(level) {
  return 100 * ((level - 1) * level) / 2;
}

export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const xpIntoLevel = xp - floor;
  const xpForNext = ceil - floor;
  const percent = Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100));
  return { level, xp, xpIntoLevel, xpForNext, percent };
}

export const XP_REWARDS = {
  SEND_MESSAGE: 1,
  CREATE_POST: 10,
  JOIN_COMMUNITY: 15,
  CREATE_COMMUNITY: 50,
  CREATE_SERVER: 50,
  CREATE_GAME: 30,
  JOIN_EVENT: 20,
  ADD_FRIEND: 5,
  ACHIEVEMENT: 50,
};
