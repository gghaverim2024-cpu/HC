import { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { serversApi, gamesApi } from '../api';
import { ServerCard } from '../components/ui/ServerCard';
import { Tabs } from '../components/ui/Tabs';
import { Button, Skeleton, EmptyState, SectionHeading } from '../components/ui/Primitives';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import type { HcServer, Game } from '../types';

const SORTS = [
  { key: 'popular', label: 'פופולריים' },
  { key: 'rating', label: 'דירוג' },
  { key: 'new', label: 'חדשים' },
];

export function ServersPage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [servers, setServers] = useState<HcServer[] | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [sort, setSort] = useState('popular');
  const [gameId, setGameId] = useState('');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', gameId: '', description: '', tags: '' });

  useEffect(() => {
    gamesApi.list().then((r) => setGames(r.games));
  }, []);

  useEffect(() => {
    setServers(null);
    serversApi.list({ sort, gameId: gameId || undefined, q: q || undefined }).then((r) => setServers(r.servers));
  }, [sort, gameId, q]);

  async function createServer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.gameId) return;
    await serversApi.create({
      name: form.name,
      gameId: form.gameId,
      description: form.description,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    pushToast({ title: 'השרת נוצר בהצלחה!', variant: 'success' });
    setCreateOpen(false);
    setForm({ name: '', gameId: '', description: '', tags: '' });
    serversApi.list({ sort, gameId: gameId || undefined }).then((r) => setServers(r.servers));
  }

  const official = servers?.filter((s) => s.type === 'official') || [];
  const community = servers?.filter((s) => s.type === 'community') || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">🌐 שרתים</h1>
        {user && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> צור שרת
          </Button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">שרתי HC Israel הרשמיים ושרתי קהילה</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפש שרת..."
            className="w-full bg-white/5 border border-hc-border rounded-xl py-2.5 pr-9 pl-4 text-sm text-white focus:outline-none focus:border-hc-primary/60"
          />
        </div>
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          className="bg-white/5 border border-hc-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="">כל המשחקים</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Tabs tabs={SORTS} active={sort} onChange={setSort} />
      </div>

      {servers === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <EmptyState icon="🌐" title="לא נמצאו שרתים" />
      ) : (
        <div className="space-y-10">
          <section>
            <SectionHeading title="HC Israel Servers — שרתים רשמיים" />
            {official.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {official.map((s) => (
                  <ServerCard key={s.id} server={s} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">אין שרתים רשמיים תואמים לסינון.</p>
            )}
          </section>
          <section>
            <SectionHeading title="Community Servers — שרתי קהילה" />
            {community.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {community.map((s) => (
                  <ServerCard key={s.id} server={s} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">אין שרתי קהילה תואמים לסינון.</p>
            )}
          </section>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="יצירת שרת חדש">
        <form onSubmit={createServer} className="space-y-3">
          <input
            required
            placeholder="שם השרת"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          />
          <select
            required
            value={form.gameId}
            onChange={(e) => setForm({ ...form, gameId: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">בחר משחק</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="תיאור"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white h-20"
          />
          <input
            placeholder="תגיות (מופרדות בפסיק)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          />
          <Button type="submit" className="w-full">
            צור שרת
          </Button>
        </form>
      </Modal>
    </div>
  );
}
