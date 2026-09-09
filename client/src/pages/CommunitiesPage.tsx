import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { communitiesApi, gamesApi } from '../api';
import { Button, GlassCard, Skeleton, EmptyState } from '../components/ui/Primitives';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import type { Community, Game } from '../types';

export function CommunitiesPage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', gameId: '' });

  function reload() {
    communitiesApi.list().then((r) => setCommunities(r.communities));
  }

  useEffect(() => {
    reload();
    gamesApi.list().then((r) => setGames(r.games));
  }, []);

  async function createCommunity(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    await communitiesApi.create(form);
    pushToast({ title: 'הקהילה נוצרה בהצלחה!', variant: 'success' });
    setOpen(false);
    setForm({ name: '', description: '', gameId: '' });
    reload();
  }

  async function joinCommunity(id: string) {
    const r = await communitiesApi.join(id);
    reload();
    r.unlocked?.forEach((a: any) => pushToast({ title: `הישג נפתח: ${a.name}`, icon: a.icon, variant: 'success' }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">🏢 קהילות</h1>
        {user && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={16} /> צור קהילה
          </Button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">מצא קהילות של שחקנים כמוך, או פתח קהילה משלך</p>

      {communities === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <EmptyState icon="🏢" title="אין עדיין קהילות" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((c) => (
            <GlassCard key={c.id} hover className="overflow-hidden">
              <Link to={`/communities/${c.id}`}>
                <img src={c.bannerUrl || ''} className="h-20 w-full object-cover" alt="" />
              </Link>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <img src={c.logoUrl || ''} className="w-11 h-11 rounded-xl -mt-8 border-2 border-hc-surface" alt="" />
                  <Link to={`/communities/${c.id}`} className="font-bold text-white text-sm hover:underline">
                    {c.name}
                  </Link>
                </div>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Users size={13} /> {c.members} חברים
                  </span>
                  {user && !c.isMember && (
                    <Button size="sm" variant="secondary" onClick={() => joinCommunity(c.id)}>
                      הצטרף
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="יצירת קהילה חדשה">
        <form onSubmit={createCommunity} className="space-y-3">
          <input
            required
            placeholder="שם הקהילה"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          />
          <select
            value={form.gameId}
            onChange={(e) => setForm({ ...form, gameId: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">ללא משחק ספציפי</option>
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
          <Button type="submit" className="w-full">
            צור קהילה
          </Button>
        </form>
      </Modal>
    </div>
  );
}
