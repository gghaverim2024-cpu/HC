import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { gamesApi } from '../api';
import { GameCard } from '../components/games/GameCard';
import { Tabs } from '../components/ui/Tabs';
import { Skeleton, EmptyState } from '../components/ui/Primitives';
import type { Game } from '../types';

const SORTS = [
  { key: 'popular', label: 'פופולריים' },
  { key: 'new', label: 'חדשים' },
  { key: 'players', label: 'מספר שחקנים' },
];

export function GamesPage() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [sort, setSort] = useState('popular');
  const [q, setQ] = useState('');

  useEffect(() => {
    setGames(null);
    gamesApi.list({ sort, q: q || undefined }).then((r) => setGames(r.games));
  }, [sort, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">🎮 משחקים</h1>
      <p className="text-gray-400 text-sm mb-6">כל המשחקים הזמינים ב-HC Israel</p>

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
    </div>
  );
}
