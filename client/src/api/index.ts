import { apiFetch } from './client';
import type {
  PublicUser, Game, HcServer, Community, ChatMessage, LfgEntry, HcEvent, Post, AppNotification, JoinRequest,
} from '../types';

export const authApi = {
  register: (data: { username: string; email: string; phone: string; password: string }) =>
    apiFetch<{ token: string; user: PublicUser }>('/auth/register', { method: 'POST', body: data }),
  login: (data: { usernameOrEmail: string; password: string }) =>
    apiFetch<{ token: string; user: PublicUser }>('/auth/login', { method: 'POST', body: data }),
  me: () => apiFetch<{ user: PublicUser }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  forgotPassword: (email: string) =>
    apiFetch<{ ok: boolean; devResetToken?: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
};

export const usersApi = {
  get: (idOrUsername: string) =>
    apiFetch<{ user: PublicUser; stats: { friends: number; achievements: number; servers: number; posts: number } }>(
      `/users/${idOrUsername}`
    ),
  achievements: (idOrUsername: string) =>
    apiFetch<{ earned: any[]; locked: any[] }>(`/users/${idOrUsername}/achievements`),
  updateMe: (data: Partial<Pick<PublicUser, 'bio' | 'avatarUrl' | 'bannerUrl' | 'favoriteGames'>>) =>
    apiFetch<{ user: PublicUser }>('/users/me', { method: 'PATCH', body: data }),
  search: (q: string) => apiFetch<{ users: PublicUser[] }>(`/users?q=${encodeURIComponent(q)}`),
};

export const gamesApi = {
  list: (params: { sort?: string; category?: string; q?: string } = {}) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch<{ games: Game[] }>(`/games${qs ? `?${qs}` : ''}`);
  },
  get: (idOrSlug: string) => apiFetch<{ game: Game }>(`/games/${idOrSlug}`),
};

export const serversApi = {
  list: (params: { gameId?: string; type?: string; sort?: string; q?: string } = {}) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch<{ servers: HcServer[] }>(`/servers${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => apiFetch<{ server: HcServer }>(`/servers/${id}`),
  create: (data: { name: string; gameId: string; description?: string; maxPlayers?: number; imageUrl?: string; tags?: string[] }) =>
    apiFetch<{ server: HcServer; chatId: string }>('/servers', { method: 'POST', body: data }),
  follow: (id: string) => apiFetch<{ ok: boolean; unlocked: any[] }>(`/servers/${id}/follow`, { method: 'POST' }),
  unfollow: (id: string) => apiFetch<{ ok: boolean }>(`/servers/${id}/follow`, { method: 'DELETE' }),
};

export const communitiesApi = {
  list: (params: { gameId?: string; q?: string } = {}) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch<{ communities: Community[] }>(`/communities${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => apiFetch<{ community: Community }>(`/communities/${id}`),
  create: (data: { name: string; description?: string; gameId?: string; logoUrl?: string; bannerUrl?: string; isPrivate?: boolean }) =>
    apiFetch<{ community: Community }>('/communities', { method: 'POST', body: data }),
  join: (id: string) => apiFetch<{ ok: boolean; pending?: boolean; unlocked: any[] }>(`/communities/${id}/join`, { method: 'POST' }),
  leave: (id: string) => apiFetch<{ ok: boolean }>(`/communities/${id}/leave`, { method: 'POST' }),
  joinRequests: (id: string) => apiFetch<{ requests: JoinRequest[] }>(`/communities/${id}/join-requests`),
  approveJoinRequest: (id: string, requestId: string) =>
    apiFetch<{ ok: boolean }>(`/communities/${id}/join-requests/${requestId}/approve`, { method: 'POST' }),
  rejectJoinRequest: (id: string, requestId: string) =>
    apiFetch<{ ok: boolean }>(`/communities/${id}/join-requests/${requestId}/reject`, { method: 'POST' }),
  members: (id: string) => apiFetch<{ members: any[] }>(`/communities/${id}/members`),
};

export const chatsApi = {
  global: () => apiFetch<{ chat: { id: string; type: string; name: string } }>('/chats/global'),
  top: () => apiFetch<{ chats: { id: string; name: string; ref_id: string; messageCount: number }[] }>('/chats/top'),
  dm: (userId: string) => apiFetch<{ chat: { id: string; type: string; name: string } }>(`/chats/dm/${userId}`),
  messages: (chatId: string, before?: string) =>
    apiFetch<{ messages: ChatMessage[]; onlineCount: number }>(
      `/chats/${chatId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`
    ),
  deleteMessage: (chatId: string, messageId: string) =>
    apiFetch<{ ok: boolean }>(`/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' }),
};

export const lfgApi = {
  list: (gameId?: string) => apiFetch<{ entries: LfgEntry[] }>(`/lfg${gameId ? `?gameId=${gameId}` : ''}`),
  create: (data: { gameId: string; mode?: string; note?: string }) =>
    apiFetch<{ entry: LfgEntry }>('/lfg', { method: 'POST', body: data }),
  close: (id: string) => apiFetch<{ ok: boolean }>(`/lfg/${id}`, { method: 'DELETE' }),
  invite: (id: string) => apiFetch<{ ok: boolean }>(`/lfg/${id}/invite`, { method: 'POST' }),
};

export const friendsApi = {
  list: () => apiFetch<{ friends: PublicUser[] }>('/friends'),
  requests: () => apiFetch<{ incoming: any[]; outgoing: any[] }>('/friends/requests'),
  request: (userId: string) => apiFetch<{ ok: boolean }>(`/friends/request/${userId}`, { method: 'POST' }),
  accept: (requestId: string) => apiFetch<{ ok: boolean; unlocked: any[] }>(`/friends/accept/${requestId}`, { method: 'POST' }),
  remove: (requestId: string) => apiFetch<{ ok: boolean }>(`/friends/${requestId}`, { method: 'DELETE' }),
};

export const eventsApi = {
  list: () => apiFetch<{ events: HcEvent[] }>('/events'),
  get: (id: string) => apiFetch<{ event: HcEvent }>(`/events/${id}`),
  create: (data: { title: string; description?: string; imageUrl?: string; type?: string; gameId?: string; startTime: string }) =>
    apiFetch<{ event: HcEvent }>('/events', { method: 'POST', body: data }),
  join: (id: string) => apiFetch<{ ok: boolean; unlocked: any[] }>(`/events/${id}/join`, { method: 'POST' }),
  leave: (id: string) => apiFetch<{ ok: boolean }>(`/events/${id}/join`, { method: 'DELETE' }),
};

export const postsApi = {
  list: (communityId?: string) => apiFetch<{ posts: Post[] }>(`/posts${communityId ? `?communityId=${communityId}` : ''}`),
  create: (data: { content: string; imageUrl?: string; communityId?: string }) =>
    apiFetch<{ post: Post }>('/posts', { method: 'POST', body: data }),
  like: (id: string) => apiFetch<{ post: Post }>(`/posts/${id}/like`, { method: 'POST' }),
  comments: (id: string) => apiFetch<{ comments: any[] }>(`/posts/${id}/comments`),
  comment: (id: string, content: string) =>
    apiFetch<{ ok: boolean }>(`/posts/${id}/comments`, { method: 'POST', body: { content } }),
  remove: (id: string) => apiFetch<{ ok: boolean }>(`/posts/${id}`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: () => apiFetch<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),
  readAll: () => apiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),
  read: (id: string) => apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
};

export const searchApi = {
  search: (q: string) =>
    apiFetch<{ games: Game[]; servers: HcServer[]; users: PublicUser[]; communities: any[]; events: any[] }>(
      `/search?q=${encodeURIComponent(q)}`
    ),
};

export const reportsApi = {
  create: (data: { targetType: 'user' | 'message' | 'post'; targetId: string; reason: string }) =>
    apiFetch<{ ok: boolean }>('/reports', { method: 'POST', body: data }),
};

export const adminApi = {
  reports: () => apiFetch<{ reports: any[] }>('/admin/reports'),
  resolveReport: (id: string) => apiFetch<{ ok: boolean }>(`/admin/reports/${id}/resolve`, { method: 'POST' }),
  mute: (userId: string) => apiFetch<{ ok: boolean }>(`/admin/users/${userId}/mute`, { method: 'POST' }),
  ban: (userId: string) => apiFetch<{ ok: boolean }>(`/admin/users/${userId}/ban`, { method: 'POST' }),
  unban: (userId: string) => apiFetch<{ ok: boolean }>(`/admin/users/${userId}/unban`, { method: 'POST' }),
  setRole: (userId: string, role: string) =>
    apiFetch<{ ok: boolean }>(`/admin/users/${userId}/role`, { method: 'POST', body: { role } }),
  users: (q = '') => apiFetch<{ users: any[] }>(`/admin/users?q=${encodeURIComponent(q)}`),
};

export const aiApi = {
  ask: (message: string) => apiFetch<{ reply: string; results: any[] }>('/ai/ask', { method: 'POST', body: { message } }),
};
