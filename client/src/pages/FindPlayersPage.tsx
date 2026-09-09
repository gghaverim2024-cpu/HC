import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, UserPlus, Check } from 'lucide-react';
import { lfgApi, gamesApi, usersApi, friendsApi } from '../api';
import { LfgCard } from '../components/ui/LfgCard';
import { Tabs } from '../components/ui/Tabs';
import { Avatar, Button, GlassCard, Skeleton, EmptyState } from '../components/ui/Primitives';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import type { LfgEntry, Game, PublicUser } from '../types';

function AllUsersBrowser() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) friendsApi.list().then((r) => setFriendIds(new Set(r.friends.map((f) => f.id))));
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      usersApi.search(q).then((r) => setUsers(r.users));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function addFriend(id: string) {
    try {
      await friendsApi.request(id);
      setSentIds((prev) => new Set(prev).add(id));
      pushToast({ title: 'בקשת חברות נשלחה', variant: 'success' });
    } catch {
      pushToast({ title: 'לא ניתן לשלוח בקשה (אולי כבר קיימת)', variant: 'error' });
    }
  }

  return (
    <div>
      <div className="relative max-w-sm mb-6">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חפש שחקן לפי שם משתמש..."
          className="w-full bg-white/5 border border-hc-border rounded-xl py-2.5 pr-9 pl-4 text-sm text-white focus:outline-none focus:border-hc-primary/60"
        />
      </div>

      {users === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="לא נמצאו משתמשים" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u) => {
            const isFriend = friendIds.has(u.id);
            const sent = sentIds.has(u.id);
            return (
              <GlassCard key={u.id} className="p-3 flex items-center gap-3">
                <Link to={`/profile/${u.username}`}>
                  <Avatar src={u.avatarUrl} alt={u.username} size={40} online={u.isOnline} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${u.username}`} className="font-semibold text-white text-sm hover:underline truncate block">
                    {u.username}
                  </Link>
                  <p className="text-[11px] text-gray-500">HC Level {u.level}</p>
                </div>
                {user && user.id !== u.id && (
                  <Button size="sm" variant={isFriend || sent ? 'secondary' : 'primary'} disabled={isFriend || sent} onClick={() => addFriend(u.id)}>
                    {isFriend ? <Check size={14} /> : <UserPlus size={14} />}
                  </Button>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FindPlayersPage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState('lfg');
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState('');
  const [entries, setEntries] = useState<LfgEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ gameId: '', mode: 'Squad', note: '' });

  useEffect(() => {
    gamesApi.list().then((r) => setGames(r.games));
  }, []);

  useEffect(() => {
    if (tab !== 'lfg') return;
    setEntries(null);
    lfgApi.list(gameId || undefined).then((r) => setEntries(r.entries));
  }, [gameId, tab]);

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gameId) return;
    await lfgApi.create(form);
    pushToast({ title: 'הפוסט שלך פורסם! עכשיו שחקנים יכולים למצוא אותך', variant: 'success' });
    setOpen(false);
    lfgApi.list(gameId || undefined).then((r) => setEntries(r.entries));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">👥 מצא שחקנים</h1>
        {user && tab === 'lfg' && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={16} /> מחפש קבוצה
          </Button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">מערכת Matchmaking חברתית — מצא אנשים לשחק איתם עכשיו</p>

      <div className="mb-6">
        <Tabs
          tabs={[
            { key: 'lfg', label: 'מחפשים קבוצה' },
            { key: 'all', label: 'כל המשתמשים' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'all' ? (
        <AllUsersBrowser />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setGameId('')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                !gameId ? 'gradient-brand text-white' : 'glass text-gray-400 hover:text-white'
              }`}
            >
              הכל
            </button>
            {games.map((g) => (
              <button
                key={g.id}
                onClick={() => setGameId(g.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  gameId === g.id ? 'gradient-brand text-white' : 'glass text-gray-400 hover:text-white'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {entries === null ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState icon="👥" title="אף אחד לא מחפש קבוצה כרגע" description="תהיה הראשון לפרסם בקשה!" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map((e) => (
                <LfgCard key={e.id} entry={e} />
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="מחפש קבוצה">
        <form onSubmit={createEntry} className="space-y-3">
          <select
            required
            value={form.gameId}
            onChange={(e) => setForm({ ...form, gameId: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">איזה משחק אתה רוצה לשחק?</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          >
            {['Squad', 'Duo', 'Ranked', 'Casual', 'Tournament'].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <textarea
            placeholder="הערה קצרה (אופציונלי)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white h-20"
          />
          <Button type="submit" className="w-full">
            פרסם בקשה
          </Button>
        </form>
      </Modal>
    </div>
  );
}
