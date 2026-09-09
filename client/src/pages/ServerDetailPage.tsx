import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Crown, Plug, Heart, HeartOff, Users, MessageCircle, Volume2 } from 'lucide-react';
import { serversApi, gamesApi } from '../api';
import { ChatWindow } from '../components/chat/ChatWindow';
import { VoiceRoom } from '../components/voice/VoiceRoom';
import { Tabs } from '../components/ui/Tabs';
import { Button, GlassCard, Skeleton } from '../components/ui/Primitives';
import { CoverImage } from '../components/ui/CoverImage';
import { LiveCount } from '../components/ui/LiveCount';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useScopePresence } from '../context/SocketContext';
import type { HcServer, Game } from '../types';

export function ServerDetailPage() {
  const { id = '' } = useParams();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [server, setServer] = useState<HcServer | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [connected, setConnected] = useState(false);
  const [rightTab, setRightTab] = useState<'chat' | 'voice'>('chat');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    serversApi.get(id).then((r) => {
      setServer(r.server);
      gamesApi.get(r.server.gameId).then((gr) => setGame(gr.game));
    });
  }, [id]);

  useScopePresence('server', server?.id);

  async function toggleFollow() {
    if (!server || !user) return;
    if (server.following) {
      await serversApi.unfollow(server.id);
      setServer({ ...server, following: false, followers: (server.followers || 1) - 1 });
    } else {
      const r = await serversApi.follow(server.id);
      setServer({ ...server, following: true, followers: (server.followers || 0) + 1 });
      r.unlocked?.forEach((a: any) => pushToast({ title: `הישג נפתח: ${a.name}`, icon: a.icon, variant: 'success' }));
    }
  }

  function connect() {
    setConnected(true);
    pushToast({ title: `התחברת ל-${server?.name}!`, description: 'מצטרפים לצ׳אט השרת...', variant: 'success' });
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!server) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="relative rounded-2xl overflow-hidden h-52 mb-6">
        <CoverImage src={server.imageUrl} name={server.name} category={server.gameCategory} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-bg via-hc-bg/50 to-transparent" />
        <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {server.type === 'official' && (
                <span className="flex items-center gap-1 bg-hc-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Crown size={10} /> רשמי
                </span>
              )}
              {game && (
                <Link to={`/games/${game.slug}`} className="text-xs text-hc-accent hover:underline">
                  {game.name}
                </Link>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">{server.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <LiveCount count={server.onlinePlayers} label={`/ ${server.maxPlayers} שחקנים`} />
              <span className="flex items-center gap-1 text-hc-warn text-sm">
                <Star size={13} fill="currentColor" /> {server.rating.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={connect} disabled={connected}>
              <Plug size={16} /> {connected ? 'מחובר ✓' : 'התחבר'}
            </Button>
            {user && (
              <Button variant="secondary" onClick={toggleFollow}>
                {server.following ? <HeartOff size={16} /> : <Heart size={16} />}
                {server.following ? 'הפסק לעקוב' : 'עקוב'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <GlassCard className="p-4">
            <h3 className="font-bold text-white mb-2">תיאור</h3>
            <p className="text-sm text-gray-400">{server.description}</p>
          </GlassCard>
          <GlassCard className="p-4 flex items-center gap-2 text-sm text-gray-300">
            <Users size={16} className="text-hc-accent" /> {server.followers ?? 0} עוקבים
          </GlassCard>
          {server.tags?.length > 0 && (
            <GlassCard className="p-4">
              <h3 className="font-bold text-white mb-2 text-sm">תגיות</h3>
              <div className="flex flex-wrap gap-1.5">
                {server.tags.map((t) => (
                  <span key={t} className="text-xs bg-white/5 border border-hc-border rounded-full px-2.5 py-1 text-gray-300">
                    {t}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}
          {server.ownerName && (
            <GlassCard className="p-4 flex items-center gap-2 text-sm text-gray-300">
              בעל השרת: <Link to={`/profile/${server.ownerName}`} className="text-hc-accent hover:underline">{server.ownerName}</Link>
            </GlassCard>
          )}
        </div>

        <div ref={chatRef} className="md:col-span-2">
          <div className="mb-3">
            <Tabs
              tabs={[
                { key: 'chat', label: "צ'אט", icon: <MessageCircle size={15} /> },
                { key: 'voice', label: 'קול', icon: <Volume2 size={15} /> },
              ]}
              active={rightTab}
              onChange={(k) => setRightTab(k as 'chat' | 'voice')}
            />
          </div>
          {rightTab === 'chat' && server.chatId && <ChatWindow chatId={server.chatId} className="h-[60vh]" />}
          {rightTab === 'voice' && <VoiceRoom roomKey={`server:${server.id}`} title={`חדר קול — ${server.name}`} />}
        </div>
      </div>
    </div>
  );
}
