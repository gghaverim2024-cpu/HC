import { Link } from 'react-router-dom';
import { Star, Crown } from 'lucide-react';
import { LiveCount } from './LiveCount';
import { CoverImage } from './CoverImage';
import type { HcServer } from '../../types';

export function ServerCard({ server }: { server: HcServer }) {
  return (
    <Link
      to={`/servers/${server.id}`}
      className="group block rounded-2xl overflow-hidden glass hover:border-hc-border-strong transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-32">
        <CoverImage
          src={server.imageUrl}
          name={server.name}
          category={server.gameCategory}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-bg via-hc-bg/40 to-transparent" />
        {server.type === 'official' && (
          <span className="absolute top-2 right-2 flex items-center gap-1 bg-hc-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Crown size={10} /> רשמי
          </span>
        )}
        <span
          className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            server.status === 'online' ? 'bg-emerald-500/90 text-white' : 'bg-gray-600/90 text-gray-200'
          }`}
        >
          {server.status === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-white text-sm truncate">{server.name}</h3>
          <span className="flex items-center gap-1 text-[11px] text-hc-warn shrink-0">
            <Star size={11} fill="currentColor" /> {server.rating.toFixed(1)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <LiveCount count={server.onlinePlayers} label={`/ ${server.maxPlayers}`} />
        </div>
        {server.tags?.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {server.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-white/5 border border-hc-border rounded-full px-2 py-0.5 text-gray-400">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
