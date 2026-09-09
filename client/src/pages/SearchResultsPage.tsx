import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchApi } from '../api';
import { GameCard } from '../components/games/GameCard';
import { ServerCard } from '../components/ui/ServerCard';
import { Avatar, GlassCard, SectionHeading, Skeleton, EmptyState } from '../components/ui/Primitives';

export function SearchResultsPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState<any | null>(null);

  useEffect(() => {
    if (!q) return;
    setResults(null);
    searchApi.search(q).then(setResults);
  }, [q]);

  const total = results
    ? results.games.length + results.servers.length + results.users.length + results.communities.length + results.events.length
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">🔎 תוצאות חיפוש עבור "{q}"</h1>
      {results && <p className="text-gray-400 text-sm mb-6">{total} תוצאות</p>}

      {!results ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : total === 0 ? (
        <EmptyState icon="🔎" title="לא נמצאו תוצאות" description="נסה מילות חיפוש אחרות" />
      ) : (
        <div className="space-y-10">
          {results.games.length > 0 && (
            <section>
              <SectionHeading title="משחקים" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.games.map((g: any) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}
          {results.servers.length > 0 && (
            <section>
              <SectionHeading title="שרתים" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.servers.map((s: any) => (
                  <ServerCard key={s.id} server={s} />
                ))}
              </div>
            </section>
          )}
          {results.users.length > 0 && (
            <section>
              <SectionHeading title="שחקנים" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.users.map((u: any) => (
                  <Link key={u.id} to={`/profile/${u.username}`}>
                    <GlassCard hover className="p-3 flex items-center gap-3">
                      <Avatar src={u.avatarUrl} alt={u.username} size={36} online={u.isOnline} />
                      <span className="font-semibold text-white text-sm">{u.username}</span>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.communities.length > 0 && (
            <section>
              <SectionHeading title="קהילות" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.communities.map((c: any) => (
                  <Link key={c.id} to={`/communities/${c.id}`}>
                    <GlassCard hover className="p-3 flex items-center gap-3">
                      <img src={c.logoUrl || ''} className="w-9 h-9 rounded-lg" alt="" />
                      <span className="font-semibold text-white text-sm">{c.name}</span>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.events.length > 0 && (
            <section>
              <SectionHeading title="אירועים" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.events.map((e: any) => (
                  <Link key={e.id} to="/events">
                    <GlassCard hover className="p-3 flex items-center gap-3">
                      <img src={e.imageUrl || ''} className="w-12 h-12 rounded-lg object-cover" alt="" />
                      <span className="font-semibold text-white text-sm">{e.title}</span>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
