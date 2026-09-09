export type Role = 'user' | 'verified' | 'helper' | 'moderator' | 'admin' | 'owner';

export interface PublicUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string;
  favoriteGames: string[];
  role: Role;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNext: number;
  xpPercent: number;
  status: 'active' | 'muted' | 'banned';
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
  email?: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  category: string;
  coverUrl: string | null;
  logoUrl: string | null;
  onlinePlayers: number;
  servers: number;
  communities: number;
  chats: number;
  chatId?: string;
}

export interface HcServer {
  id: string;
  name: string;
  gameId: string;
  ownerId: string | null;
  type: 'official' | 'community';
  imageUrl: string | null;
  description: string;
  maxPlayers: number;
  status: 'online' | 'offline';
  rating: number;
  tags: string[];
  createdAt: string;
  onlinePlayers: number;
  followers?: number;
  following?: boolean;
  ownerName?: string;
  ownerAvatar?: string;
  chatId?: string;
}

export interface Community {
  id: string;
  name: string;
  gameId: string | null;
  ownerId: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string;
  isPrivate: boolean;
  createdAt: string;
  members: number;
  isMember: boolean;
  pendingRequest: boolean;
  chatId?: string;
}

export interface JoinRequest {
  id: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
}

export interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  muted: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  imageUrl: string | null;
  replyToId: string | null;
  deleted: boolean;
  createdAt: string;
  author?: PublicUser;
}

export interface LfgEntry {
  id: string;
  mode: string;
  note: string;
  status: string;
  createdAt: string;
  user: PublicUser;
  game: { id: string; name: string; slug: string; logoUrl: string | null } | null;
}

export interface HcEvent {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  type: string;
  gameId: string | null;
  startTime: string;
  organizerName?: string;
  organizerAvatar?: string;
  participants: number;
  joined: boolean;
}

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: PublicUser;
  community: { id: string; name: string; logoUrl: string | null } | null;
  likes: number;
  liked: boolean;
  comments: number;
}

export interface AppNotification {
  id: string;
  type: string;
  payload: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface PresenceSnapshot {
  [key: string]: number;
}
