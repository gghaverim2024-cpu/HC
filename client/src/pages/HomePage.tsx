import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2, Users, Globe, MessageCircle, Flame, ArrowLeft } from 'lucide-react';
import { gamesApi, chatsApi, serversApi, lfgApi, eventsApi } from '../api';
import { GameCard } from '../components/games/GameCard';
import { ServerCard } from '../components/ui/ServerCard';
import { LfgCard } from '../components/ui/LfgCard';
import { Button, SectionHeading, Skeleton } from '../components/ui/Primitives';
import { CoverImage } from '../components/ui/CoverImage';
import { usePresenceCount } from '../context/SocketContext';
import { formatCompactNumber, countdownParts } from '../lib/format';
import type { Game, HcServer, LfgEntry, HcEvent } from '../types';

function TopChatRow({ chat }: { chat: { id: string; name: string; ref_id: string; messageCount: number } }) {
  const online = usePresenceCount(`game:${chat.ref_id}`);
  return (
    <Link
      to={`/chat/${chat.id}`}
      className="flex items-center justify-between glass rounded-xl px-4 py-3 hover:border-hc-border-strong transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
          <MessageCircle size={16} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{chat.name}</p>
          <p className="text-[11px] text-emerald-400">🟢 {formatCompactNumber(online)} מחוברים</p>
        </div>
      </div>
      <ArrowLeft size={16} className="text-gray-500" />
    </Link>
  );
}

function EventTeaser({ event }: { event: HcEvent }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const c = countdownParts(event.startTime);
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <CoverImage src={event.imageUrl} name={event.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white text-sm truncate">{event.title}</p>
        <p className="text-[11px] text-hc-accent font-mono mt-0.5">
          {c.days > 0 ? `${c.days}ד ` : ''}
          {String(c.hours).padStart(2, '0')}:{String(c.minutes).padStart(2, '0')}:{String(c.seconds).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}

export function HomePage() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [chats, setChats] = useState<any[] | null>(null);
  const [servers, setServers] = useState<HcServer[] | null>(null);
  const [lfg, setLfg] = useState<LfgEntry[] | null>(null);
  const [events, setEvents] = useState<HcEvent[] | null>(null);

  useEffect(() => {
    gamesApi.list({ sort: 'popular' }).then((r) => setGames(r.games.slice(0, 6)));
    chatsApi.top().then((r) => setChats(r.chats));
    serversApi.list({ sort: 'popular' }).then((r) => setServers(r.servers.slice(0, 4)));
    lfgApi.list().then((r) => setLfg(r.entries.slice(0, 6)));
    eventsApi.list().then((r) => setEvents(r.events.slice(0, 3)));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 md:pt-20 md:pb-24 text-center">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-hc-primary/25 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-hc-accent/20 blur-[120px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-hc-accent bg-hc-accent/10 border border-hc-accent/20 rounded-full px-3 py-1 mb-5">
            <Flame size={13} /> הפלטפורמה הגדולה בישראל לגיימרים
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight">
            HC <span className="text-gradient-brand">ISRAEL</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-semibold mt-3">כל עולם הגיימינג הישראלי במקום אחד.</p>
          <p className="text-gray-400 mt-2 max-w-xl mx-auto">
            מצא משחקים, שרתים, קהילות ושחקנים לשחק איתם.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link to="/games">
              <Button size="lg">
                <Gamepad2 size={18} /> גלה משחקים
              </Button>
            </Link>
            <Link to="/find-players">
              <Button size="lg" variant="secondary">
                <Users size={18} /> מצא שחקנים
              </Button>
            </Link>
            <Link to="/servers">
              <Button size="lg" variant="secondary">
                <Globe size={18} /> שרתים
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-4 space-y-12 pb-12">
        {/* Top games */}
        <section>
          <SectionHeading
            title="🔥 המשחקים המובילים"
            action={
              <Link to="/games" className="text-sm text-hc-accent hover:underline font-semibold">
                כל המשחקים
              </Link>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {games
              ? games.map((g, i) => <GameCard key={g.id} game={g} index={i} />)
              : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Top chats */}
          <section className="lg:col-span-1">
            <SectionHeading title="💬 הצ'אטים הגדולים ביותר" />
            <div className="space-y-2">
              {chats
                ? chats.map((c) => <TopChatRow key={c.id} chat={c} />)
                : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          </section>

          {/* What's hot */}
          <section className="lg:col-span-2">
            <SectionHeading title="🔥 מה חם עכשיו" />
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {servers
                ? servers.map((s) => <ServerCard key={s.id} server={s} />)
                : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
            </div>
            {events && events.length > 0 && (
              <div className="space-y-2">
                {events.map((e) => (
                  <EventTeaser key={e.id} event={e} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* LFG */}
        <section>
          <SectionHeading
            title="👥 שחקנים מחפשים קבוצה"
            action={
              <Link to="/find-players" className="text-sm text-hc-accent hover:underline font-semibold">
                לכל השחקנים
              </Link>
            }
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lfg
              ? lfg.map((e) => <LfgCard key={e.id} entry={e} />)
              : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </section>
      </div>
    </div>
  );
}
