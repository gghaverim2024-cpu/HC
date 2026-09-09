import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Server, Building2, MessageCircle, Users, CalendarDays } from 'lucide-react';
import { gamesApi, serversApi, communitiesApi, lfgApi, eventsApi } from '../api';
import { ServerCard } from '../components/ui/ServerCard';
import { LfgCard } from '../components/ui/LfgCard';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Tabs } from '../components/ui/Tabs';
import { LiveCount } from '../components/ui/LiveCount';
import { GlassCard, Skeleton, EmptyState } from '../components/ui/Primitives';
import { useScopePresence } from '../context/SocketContext';
import { formatDateTime } from '../lib/format';
import type { Game, HcServer, Community, LfgEntry, HcEvent } from '../types';

const TABS = [
  { key: 'servers', label: 'שרתים', icon: <Server size={15} /> },
  { key: 'communities', label: 'קהילות', icon: <Building2 size={15} /> },
  { key: 'chat', label: "צ'אט", icon: <MessageCircle size={15} /> },
  { key: 'players', label: 'שחקנים', icon: <Users size={15} /> },
  { key: 'events', label: 'אירועים', icon: <CalendarDays size={15} /> },
];

export function GameDetailPage() {
  const { slug = '' } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [tab, setTab] = useState('servers');
  const [servers, setServers] = useState<HcServer[] | null>(null);
  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [lfg, setLfg] = useState<LfgEntry[] | null>(null);
  const [events, setEvents] = useState<HcEvent[] | null>(null);

  useEffect(() => {
    setGame(null);
    gamesApi.get(slug).then((r) => setGame(r.game));
  }, [slug]);

  useScopePresence('game', game?.id);

  useEffect(() => {
    if (!game) return;
    if (tab === 'servers' && !servers) serversApi.list({ gameId: game.id }).then((r) => setServers(r.servers));
    if (tab === 'communities' && !communities) communitiesApi.list({ gameId: game.id }).then((r) => setCommunities(r.communities));
    if (tab === 'players' && !lfg) lfgApi.list(game.id).then((r) => setLfg(r.entries));
    if (tab === 'events' && !events) eventsApi.list().then((r) => setEvents(r.events.filter((e) => e.gameId === game.id)));
  }, [tab, game]);

  if (!game) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-56 w-full mb-6" />
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-56 md:h-72 -mt-1">
        <img src={game.coverUrl || ''} className="w-full h-full object-cover" alt={game.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-bg via-hc-bg/50 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 max-w-6xl mx-auto px-4 pb-5 flex items-end gap-4">
          <img src={game.logoUrl || ''} className="w-16 h-16 rounded-2xl border-2 border-hc-bg bg-hc-surface" alt="" />
          <div>
            <h1 className="text-3xl font-black text-white">{game.name}</h1>
            <LiveCount count={game.onlinePlayers} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        <div className="mt-6">
          {tab === 'servers' &&
            (servers ? (
              servers.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {servers.map((s) => (
                    <ServerCard key={s.id} server={s} />
                  ))}
                </div>
              ) : (
                <EmptyState icon="🌐" title="אין עדיין שרתים למשחק הזה" />
              )
            ) : (
              <Skeleton className="h-40" />
            ))}

          {tab === 'communities' &&
            (communities ? (
              communities.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {communities.map((c) => (
                    <Link key={c.id} to={`/communities/${c.id}`}>
                      <GlassCard hover className="p-4 flex items-center gap-3">
                        <img src={c.logoUrl || ''} className="w-12 h-12 rounded-xl" alt="" />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.members} חברים</p>
                        </div>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon="🏢" title="אין עדיין קהילות למשחק הזה" />
              )
            ) : (
              <Skeleton className="h-40" />
            ))}

          {tab === 'chat' && game.chatId && <ChatWindow chatId={game.chatId} className="h-[65vh]" />}

          {tab === 'players' &&
            (lfg ? (
              lfg.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lfg.map((e) => (
                    <LfgCard key={e.id} entry={e} />
                  ))}
                </div>
              ) : (
                <EmptyState icon="👥" title="אף אחד לא מחפש קבוצה כרגע" />
              )
            ) : (
              <Skeleton className="h-20" />
            ))}

          {tab === 'events' &&
            (events ? (
              events.length ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {events.map((e) => (
                    <Link key={e.id} to="/events">
                      <GlassCard hover className="p-3 flex items-center gap-3">
                        <img src={e.imageUrl || ''} className="w-14 h-14 rounded-lg object-cover" alt="" />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{e.title}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(e.startTime)}</p>
                        </div>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon="🎉" title="אין אירועים קרובים למשחק הזה" />
              )
            ) : (
              <Skeleton className="h-20" />
            ))}
        </div>
      </div>
    </div>
  );
}
