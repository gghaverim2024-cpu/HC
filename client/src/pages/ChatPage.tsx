import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe, Gamepad2, Server, Building2, MessageSquareText } from 'lucide-react';
import { chatsApi, gamesApi, serversApi, communitiesApi, friendsApi } from '../api';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Avatar, Skeleton } from '../components/ui/Primitives';
import { useAuthStore } from '../store/authStore';
import type { Game, HcServer, Community, PublicUser } from '../types';

interface ChatItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  avatar?: string | null;
}

export function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [globalChatId, setGlobalChatId] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [servers, setServers] = useState<HcServer[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [selected, setSelected] = useState<string | null>(chatId || null);

  useEffect(() => {
    chatsApi.global().then((r) => {
      setGlobalChatId(r.chat.id);
      if (!chatId) setSelected(r.chat.id);
    });
    gamesApi.list({ sort: 'popular' }).then((r) => setGames(r.games));
    if (user) {
      serversApi.list().then((r) => setServers(r.servers.filter((s) => s.following)));
      communitiesApi.list().then((r) => setCommunities(r.communities.filter((c) => c.isMember)));
      friendsApi.list().then((r) => setFriends(r.friends));
    }
  }, [user]);

  useEffect(() => {
    if (chatId) setSelected(chatId);
  }, [chatId]);

  async function openDm(friend: PublicUser) {
    const r = await chatsApi.dm(friend.id);
    setSelected(r.chat.id);
    navigate(`/chat/${r.chat.id}`);
  }

  function select(id: string) {
    setSelected(id);
    navigate(`/chat/${id}`);
  }

  const sections: { title: string; items: ChatItem[] }[] = useMemo(
    () => [
      {
        title: '',
        items: globalChatId ? [{ id: globalChatId, label: 'Global Chat', sub: 'הצ׳אט הכללי של HC Israel', icon: <Globe size={16} /> }] : [],
      },
      {
        title: 'משחקים',
        items: games.filter((g) => g.chatId).map((g) => ({ id: g.chatId!, label: `${g.name} ישראל`, icon: <Gamepad2 size={16} />, avatar: g.logoUrl })),
      },
      {
        title: 'שרתים שאני עוקב',
        items: servers.filter((s) => s.chatId).map((s) => ({ id: s.chatId!, label: s.name, icon: <Server size={16} />, avatar: s.imageUrl })),
      },
      {
        title: 'הקהילות שלי',
        items: communities.filter((c) => c.chatId).map((c) => ({ id: c.chatId!, label: c.name, icon: <Building2 size={16} />, avatar: c.logoUrl })),
      },
    ],
    [globalChatId, games, servers, communities]
  );

  return (
    <div className="max-w-7xl mx-auto md:px-4 md:py-6 h-[calc(100vh-64px)] md:h-[calc(100vh-88px)]">
      <div className="flex h-full gap-4">
        <aside className="hidden sm:flex flex-col w-72 shrink-0 glass rounded-2xl overflow-y-auto p-2">
          {sections.map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.title || 'global'} className="mb-2">
                  {section.title && <p className="text-[11px] font-bold text-gray-500 px-3 py-1.5 uppercase tracking-wide">{section.title}</p>}
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => select(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-right transition-colors ${
                        selected === item.id ? 'bg-hc-primary/15 text-white' : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {item.avatar ? (
                        <img src={item.avatar} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
                      ) : (
                        <span className="text-hc-accent shrink-0">{item.icon}</span>
                      )}
                      <span className="truncate font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              )
          )}

          {user && (
            <div className="mb-2">
              <p className="text-[11px] font-bold text-gray-500 px-3 py-1.5 uppercase tracking-wide flex items-center gap-1">
                <MessageSquareText size={12} /> הודעות פרטיות
              </p>
              {friends.length === 0 ? (
                <p className="text-xs text-gray-600 px-3 py-1">אין לך עדיין חברים להתכתב איתם</p>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => openDm(f)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-right text-gray-300 hover:bg-white/5"
                  >
                    <Avatar src={f.avatarUrl} alt={f.username} size={28} online={f.isOnline} />
                    <span className="truncate font-medium">{f.username}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </aside>

        <div className="flex-1 min-w-0">
          {selected ? <ChatWindow chatId={selected} className="h-full" /> : <Skeleton className="h-full" />}
        </div>
      </div>
    </div>
  );
}
