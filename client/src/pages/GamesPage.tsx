import { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { gamesApi } from '../api';
import { uploadImage } from '../api/client';
import { GameCard } from '../components/games/GameCard';
import { Tabs } from '../components/ui/Tabs';
import { Button, Skeleton, EmptyState } from '../components/ui/Primitives';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { GAME_CATEGORIES } from '../lib/categories';
import { ApiError } from '../api/client';
import type { Game } from '../types';

const SORTS = [
  { key: 'popular', label: 'פופולריים' },
  { key: 'new', label: 'חדשים' },
  { key: 'players', label: 'מספר שחקנים' },
];

export function GamesPage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [games, setGames] = useState<Game[] | null>(null);
  const [sort, setSort] = useState('popular');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'action', coverUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function reload() {
    gamesApi.list({ sort, q: q || undefined }).then((r) => setGames(r.games));
  }

  useEffect(() => {
    setGames(null);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, q]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, coverUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  async function createGame(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await gamesApi.create(form);
      pushToast({ title: 'המשחק נוסף בהצלחה!', variant: 'success' });
      setOpen(false);
      setForm({ name: '', category: 'action', coverUrl: '' });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה ביצירת המשחק');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">🎮 משחקים</h1>
        {user && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={16} /> הוסף משחק
          </Button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">כל המשחקים הזמינים ב-HC Israel — ואפשר גם להוסיף משחק שחסר</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפש משחק..."
            className="w-full bg-white/5 border border-hc-border rounded-xl py-2.5 pr-9 pl-4 text-sm text-white focus:outline-none focus:border-hc-primary/60"
          />
        </div>
        <Tabs tabs={SORTS} active={sort} onChange={setSort} />
      </div>

      {games === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <EmptyState icon="🎮" title="לא נמצאו משחקים" description="נסה לחפש משהו אחר" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {games.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="הוספת משחק חדש">
        <form onSubmit={createGame} className="space-y-3">
          <input
            required
            placeholder="שם המשחק"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          >
            {GAME_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-1.5 block">תמונת שער (אופציונלי)</label>
            <input type="file" accept="image/*" onChange={onFile} disabled={uploading} className="text-xs text-gray-400" />
            {form.coverUrl && <img src={form.coverUrl} className="mt-2 h-24 rounded-lg" alt="" />}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={uploading}>
            הוסף משחק
          </Button>
        </form>
      </Modal>
    </div>
  );
}
