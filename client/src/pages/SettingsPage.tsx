import { useEffect, useState } from 'react';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import { Check, X, ShieldCheck } from 'lucide-react';
import { usersApi, friendsApi, authApi } from '../api';
import { uploadImage } from '../api/client';
import { Avatar, Button, GlassCard, Skeleton } from '../components/ui/Primitives';
import { Tabs } from '../components/ui/Tabs';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const TABS = [
  { key: 'profile', label: 'פרופיל' },
  { key: 'password', label: 'סיסמה' },
  { key: 'friends', label: 'חברים' },
  { key: 'privacy', label: 'פרטיות' },
];

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setAuthUser = useAuthStore((s) => s.setUser);
  const pushToast = useUiStore((s) => s.pushToast);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';

  const [form, setForm] = useState({ bio: '', avatarUrl: '', bannerUrl: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
  const [requests, setRequests] = useState<{ incoming: any[]; outgoing: any[] } | null>(null);
  const [friends, setFriends] = useState<any[] | null>(null);

  useEffect(() => {
    if (user) setForm({ bio: user.bio, avatarUrl: user.avatarUrl || '', bannerUrl: user.bannerUrl || '' });
  }, [user]);

  useEffect(() => {
    if (tab === 'friends') {
      friendsApi.requests().then(setRequests);
      friendsApi.list().then((r) => setFriends(r.friends));
    }
  }, [tab]);

  if (!user) return <Navigate to="/login" replace />;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { user: updated } = await usersApi.updateMe(form);
    setAuthUser(updated);
    pushToast({ title: 'הפרופיל עודכן', variant: 'success' });
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, avatarUrl: '' }));
    const url = await uploadImage(file);
    setForm((f) => ({ ...f, avatarUrl: url }));
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await authApi.changePassword(passForm.currentPassword, passForm.newPassword);
      pushToast({ title: 'הסיסמה שונתה בהצלחה', variant: 'success' });
      setPassForm({ currentPassword: '', newPassword: '' });
    } catch {
      pushToast({ title: 'הסיסמה הנוכחית שגויה', variant: 'error' });
    }
  }

  async function acceptRequest(id: string) {
    const r = await friendsApi.accept(id);
    friendsApi.requests().then(setRequests);
    friendsApi.list().then((rr) => setFriends(rr.friends));
    r.unlocked?.forEach((a: any) => pushToast({ title: `הישג נפתח: ${a.name}`, icon: a.icon, variant: 'success' }));
  }

  async function removeFriendship(id: string) {
    await friendsApi.remove(id);
    friendsApi.requests().then(setRequests);
    friendsApi.list().then((rr) => setFriends(rr.friends));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">⚙️ הגדרות</h1>
      <Tabs tabs={TABS} active={tab} onChange={(k) => setParams({ tab: k })} />

      <div className="mt-6">
        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="space-y-4">
            <GlassCard className="p-5">
              <label className="text-sm font-semibold text-gray-300 mb-1.5 block">תמונת פרופיל</label>
              <div className="flex items-center gap-3">
                <Avatar src={form.avatarUrl} alt={user.username} size={56} />
                <input type="file" accept="image/*" onChange={onAvatarFile} className="text-xs text-gray-400" />
              </div>
              <label className="text-sm font-semibold text-gray-300 mb-1.5 block mt-4">ביו</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white h-24"
                maxLength={200}
              />
            </GlassCard>
            <Button type="submit">שמור שינויים</Button>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={changePassword} className="space-y-3 max-w-sm">
            <GlassCard className="p-5 space-y-3">
              <input
                type="password"
                required
                placeholder="סיסמה נוכחית"
                value={passForm.currentPassword}
                onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="סיסמה חדשה"
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
              />
            </GlassCard>
            <Button type="submit">עדכן סיסמה</Button>
          </form>
        )}

        {tab === 'friends' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-white mb-2 text-sm">בקשות נכנסות</h3>
              {requests === null ? (
                <Skeleton className="h-16" />
              ) : requests.incoming.length === 0 ? (
                <p className="text-sm text-gray-500">אין בקשות חברות ממתינות</p>
              ) : (
                <div className="space-y-2">
                  {requests.incoming.map((r) => (
                    <GlassCard key={r.id} className="p-3 flex items-center gap-3">
                      <Avatar src={r.from.avatarUrl} alt={r.from.username} size={34} />
                      <span className="flex-1 text-sm text-white font-medium">{r.from.username}</span>
                      <button onClick={() => acceptRequest(r.id)} className="p-1.5 text-emerald-400 hover:bg-white/5 rounded-lg">
                        <Check size={16} />
                      </button>
                      <button onClick={() => removeFriendship(r.id)} className="p-1.5 text-red-400 hover:bg-white/5 rounded-lg">
                        <X size={16} />
                      </button>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white mb-2 text-sm">חברים</h3>
              {friends === null ? (
                <Skeleton className="h-16" />
              ) : friends.length === 0 ? (
                <p className="text-sm text-gray-500">עדיין אין לך חברים. השתמש ב"מצא שחקנים" כדי למצוא!</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {friends.map((f) => (
                    <Link key={f.id} to={`/profile/${f.username}`}>
                      <GlassCard hover className="p-3 flex items-center gap-3">
                        <Avatar src={f.avatarUrl} alt={f.username} size={34} online={f.isOnline} />
                        <span className="text-sm text-white font-medium">{f.username}</span>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'privacy' && (
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3 text-emerald-400">
              <ShieldCheck size={18} />
              <h3 className="font-bold text-white">הפרטיות שלך מוגנת</h3>
            </div>
            <ul className="text-sm text-gray-400 space-y-2 list-disc pr-5">
              <li>כתובת המייל שלך לעולם לא נחשפת למשתמשים אחרים.</li>
              <li>רק אתה יכול לראות ולערוך את פרטי החשבון המלאים שלך.</li>
              <li>ניתן לחסום ולדווח על משתמשים בכל צ'אט או פוסט.</li>
              <li>מנהלי הקהילה יכולים לראות רק את הפעילות בתוך הקהילה שלהם.</li>
            </ul>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
