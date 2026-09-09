import { levelProgress } from './xp.js';

// Public-facing user shape — never leak email/password_hash/reset_token to other users.
export function publicUser(u) {
  if (!u) return null;
  const progress = levelProgress(u.xp);
  return {
    id: u.id,
    username: u.username,
    avatarUrl: u.avatar_url,
    bannerUrl: u.banner_url,
    bio: u.bio,
    favoriteGames: JSON.parse(u.favorite_games || '[]'),
    role: u.role,
    level: progress.level,
    xp: u.xp,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNext: progress.xpForNext,
    xpPercent: progress.percent,
    status: u.status,
    isOnline: !!u.is_online,
    lastSeen: u.last_seen,
    createdAt: u.created_at,
  };
}

// Includes private fields — only for the authenticated user viewing their own profile.
export function privateUser(u) {
  if (!u) return null;
  return { ...publicUser(u), email: u.email, phone: u.phone };
}

export function serializeGame(g, extra = {}) {
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    category: g.category,
    coverUrl: g.cover_url,
    logoUrl: g.logo_url,
    ...extra,
  };
}

export function serializeServer(s, extra = {}) {
  return {
    id: s.id,
    name: s.name,
    gameId: s.game_id,
    ownerId: s.owner_id,
    type: s.type,
    imageUrl: s.image_url,
    description: s.description,
    maxPlayers: s.max_players,
    status: s.status,
    rating: s.rating,
    tags: JSON.parse(s.tags || '[]'),
    createdAt: s.created_at,
    ...extra,
  };
}

export function serializeMessage(m, author) {
  return {
    id: m.id,
    chatId: m.chat_id,
    content: m.content,
    imageUrl: m.image_url,
    replyToId: m.reply_to_id,
    deleted: !!m.deleted,
    createdAt: m.created_at,
    author: author ? publicUser(author) : undefined,
  };
}
