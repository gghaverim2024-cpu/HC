-- HC Israel schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT DEFAULT '',
  favorite_games TEXT DEFAULT '[]', -- json array of game ids
  role TEXT NOT NULL DEFAULT 'user', -- owner|admin|moderator|helper|verified|user
  hc_level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active|muted|banned
  is_bot INTEGER NOT NULL DEFAULT 0,
  is_online INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT,
  reset_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'action',
  cover_url TEXT,
  logo_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_id TEXT NOT NULL REFERENCES games(id),
  owner_id TEXT REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'community', -- official|community
  image_url TEXT,
  description TEXT DEFAULT '',
  max_players INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'online', -- online|offline
  rating REAL NOT NULL DEFAULT 4.5,
  tags TEXT DEFAULT '[]', -- json array
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS server_followers (
  server_id TEXT NOT NULL REFERENCES servers(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (server_id, user_id)
);

CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_id TEXT REFERENCES games(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  logo_url TEXT,
  banner_url TEXT,
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS community_members (
  community_id TEXT NOT NULL REFERENCES communities(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member', -- owner|admin|member
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- global|game|server|community|dm
  ref_id TEXT, -- game_id/server_id/community_id, null for global, dm-pair-id for dm
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  image_url TEXT,
  reply_to_id TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user_a TEXT NOT NULL REFERENCES users(id),
  user_b TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|accepted
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS looking_for_group (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  mode TEXT DEFAULT '',
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open', -- open|closed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  xp_reward INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id),
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  type TEXT NOT NULL DEFAULT 'community', -- official|community|server|tournament
  game_id TEXT REFERENCES games(id),
  organizer_id TEXT NOT NULL REFERENCES users(id),
  start_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  community_id TEXT REFERENCES communities(id),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL, -- user|message|post
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open|resolved
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_servers_game ON servers(game_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lfg_game ON looking_for_group(game_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
