import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { UserPlus, Pencil, Lock, Server, Users, Trophy, Newspaper } from 'lucide-react';
import { usersApi, friendsApi } from '../api';
import { uploadImage } from '../api/client';
import { Avatar, Button, GlassCard, LevelBar, RoleBadge, Skeleton } from '../components/ui/Primitives';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import type { PublicUser } from '../types';

export function ProfilePage() {
  const { username: rawUsername = '' } = useParams();
  const authUser = useAuthStore((s) => s.user);
  const setAuthUser = useAuthStore((s) => s.setUser);
  const pushToast = useUiStore((s) => s.pushToast);
  const isMeRoute = rawUsername === 'me';
  const username = isMeRoute ? authUser?.username || '' : rawUsername;

  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<{ friends: number; achievements: number; servers: number; posts: number } | null>(null);
  const [achievements, setAchievements] = useState<{ earned: any[]; locked: any[] } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ bio: '', avatarUrl: '', bannerUrl: '' });
  const [friendSent, setFriendSent] = useState(false);

  const isSelf = authUser?.username === username;

  useEffect(() => {
    if (!username) return;
    setUser(null);
    usersApi.get(username).then((r) => {
      setUser(r.user);
      setStats(r.stats);
      setForm({ bio: r.user.bio, avatarUrl: r.user.avatarUrl || '', bannerUrl: r.user.bannerUrl || '' });
    });
    usersApi.achievements(username).then(setAchievements);
  }, [username]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { user: updated } = await usersApi.updateMe(form);
    setUser(updated);
    setAuthUser(updated);
    setEditOpen(false);
    pushToast({ title: 'הפרופיל עודכן', variant: 'success' });
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    setForm((f) => ({ ...f, avatarUrl: url }));
  }
  async function onBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    setForm((f) => ({ ...f, bannerUrl: url }));
  }

  async function sendFriendRequest() {
    if (!user) return;
    await friendsApi.request(user.id);
    setFriendSent(true);
    pushToast({ title: `בקשת חברות נשלחה ל-${user.username}`, variant: 'success' });
  }

  if (isMeRoute && !authUser) return <Navigate to="/login" replace />;
  if (isMeRoute && authUser) return <Navigate to={`/profile/${authUser.username}`} replace />;

  if (!user || !stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-40 mb-4" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="relative h-44 md:h-56">
        <img
          src={user.bannerUrl || 'https://picsum.photos/seed/hc-banner/1200/300'}
          className="w-full h-full object-cover"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-bg to-transparent" />
      </div>

      <div className="px-4 -mt-14 flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-end gap-4">
          <div className="ring-4 ring-hc-bg rounded-full">
            <Avatar src={user.avatarUrl} alt={user.username} size={96} online={user.isOnline} />
          </div>
          <div className="pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">{user.username}</h1>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-gray-400 text-sm">{user.bio || 'עדיין אין ביו'}</p>
          </div>
        </div>
        <div className="pb-2">
          {isSelf ? (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={15} /> ערוך פרופיל
            </Button>
          ) : authUser ? (
            <Button onClick={sendFriendRequest} disabled={friendSent}>
              <UserPlus size={15} /> {friendSent ? 'בקשה נשלחה' : 'הוסף חבר'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="px-4 mt-6 grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <GlassCard className="p-5">
            <LevelBar level={user.level} percent={user.xpPercent} />
            <p className="text-xs text-gray-500 mt-2">
              {user.xpIntoLevel} / {user.xpForNext} XP
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-hc-warn" /> הישגים
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {achievements?.earned.map((a) => (
                <div key={a.key} className="glass rounded-xl p-3 text-center border-emerald-500/20">
                  <div className="text-2xl mb-1">{a.icon}</div>
                  <p className="text-xs font-bold text-white">{a.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{a.description}</p>
                </div>
              ))}
              {achievements?.locked.map((a) => (
                <div key={a.key} className="glass rounded-xl p-3 text-center opacity-40">
                  <div className="text-2xl mb-1 flex items-center justify-center">
                    <Lock size={20} />
                  </div>
                  <p className="text-xs font-bold text-white">{a.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{a.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {user.favoriteGames.length > 0 && (
            <GlassCard className="p-5">
              <h3 className="font-bold text-white mb-2">🎮 משחקים מועדפים</h3>
              <p className="text-sm text-gray-400">{user.favoriteGames.join(' • ')}</p>
            </GlassCard>
          )}
        </div>

        <div className="space-y-3">
          <GlassCard className="p-4 flex items-center gap-3">
            <Users size={18} className="text-hc-accent" />
            <div>
              <p className="font-bold text-white">{stats.friends}</p>
              <p className="text-xs text-gray-500">חברים</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center gap-3">
            <Trophy size={18} className="text-hc-warn" />
            <div>
              <p className="font-bold text-white">{stats.achievements}</p>
              <p className="text-xs text-gray-500">הישגים</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center gap-3">
            <Server size={18} className="text-hc-primary" />
            <div>
              <p className="font-bold text-white">{stats.servers}</p>
              <p className="text-xs text-gray-500">שרתים</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center gap-3">
            <Newspaper size={18} className="text-hc-pink" />
            <div>
              <p className="font-bold text-white">{stats.posts}</p>
              <p className="text-xs text-gray-500">פוסטים</p>
            </div>
          </GlassCard>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="עריכת פרופיל">
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-1.5 block">תמונת פרופיל</label>
            <div className="flex items-center gap-3">
              <Avatar src={form.avatarUrl} alt={user.username} size={56} />
              <input type="file" accept="image/*" onChange={onAvatarFile} className="text-xs text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-1.5 block">Banner</label>
            <input type="file" accept="image/*" onChange={onBannerFile} className="text-xs text-gray-400" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-1.5 block">ביו</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white h-24"
              maxLength={200}
            />
          </div>
          <Button type="submit" className="w-full">
            שמור שינויים
          </Button>
        </form>
      </Modal>
    </div>
  );
}
