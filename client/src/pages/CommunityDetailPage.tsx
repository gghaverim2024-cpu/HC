import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle, Users, Newspaper, Crown } from 'lucide-react';
import { communitiesApi, postsApi } from '../api';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Tabs } from '../components/ui/Tabs';
import { Avatar, Button, GlassCard, Skeleton, EmptyState } from '../components/ui/Primitives';
import { PostComposer, PostCard } from '../components/feed/Post';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import type { Community, Post } from '../types';

const TABS = [
  { key: 'chat', label: "צ'אט", icon: <MessageCircle size={15} /> },
  { key: 'members', label: 'חברים', icon: <Users size={15} /> },
  { key: 'posts', label: 'פוסטים', icon: <Newspaper size={15} /> },
];

export function CommunityDetailPage() {
  const { id = '' } = useParams();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [community, setCommunity] = useState<Community | null>(null);
  const [tab, setTab] = useState('chat');
  const [members, setMembers] = useState<any[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    communitiesApi.get(id).then((r) => setCommunity(r.community));
  }, [id]);

  useEffect(() => {
    if (tab === 'members' && !members) communitiesApi.members(id).then((r) => setMembers(r.members));
    if (tab === 'posts' && !posts) postsApi.list(id).then((r) => setPosts(r.posts));
  }, [tab, id]);

  async function join() {
    if (!community) return;
    const r = await communitiesApi.join(community.id);
    setCommunity({ ...community, isMember: true, members: community.members + 1 });
    r.unlocked?.forEach((a: any) => pushToast({ title: `הישג נפתח: ${a.name}`, icon: a.icon, variant: 'success' }));
  }

  if (!community) return <Skeleton className="h-80 m-6" />;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="relative h-40 md:h-52">
        <img src={community.bannerUrl || ''} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-bg via-hc-bg/40 to-transparent" />
      </div>
      <div className="px-4 -mt-10 flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-end gap-4">
          <img src={community.logoUrl || ''} className="w-20 h-20 rounded-2xl border-4 border-hc-bg" alt="" />
          <div className="pb-2">
            <h1 className="text-2xl font-black text-white">{community.name}</h1>
            <p className="text-sm text-gray-400">{community.members} חברים</p>
          </div>
        </div>
        {user && !community.isMember && (
          <Button onClick={join} className="mb-2">
            הצטרף לקהילה
          </Button>
        )}
      </div>
      <p className="px-4 mt-3 text-sm text-gray-400 max-w-2xl">{community.description}</p>

      <div className="px-4 mt-6">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-6">
          {tab === 'chat' && community.chatId && <ChatWindow chatId={community.chatId} className="h-[60vh]" />}

          {tab === 'members' &&
            (members ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((m) => (
                  <GlassCard key={m.id} className="p-3 flex items-center gap-3">
                    <Avatar src={m.avatar_url} alt={m.username} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white text-sm truncate">{m.username}</p>
                      <p className="text-[11px] text-gray-500">{m.role}</p>
                    </div>
                    {m.role === 'owner' && <Crown size={14} className="text-hc-warn shrink-0" />}
                  </GlassCard>
                ))}
              </div>
            ) : (
              <Skeleton className="h-20" />
            ))}

          {tab === 'posts' && (
            <div className="max-w-xl">
              {user && (
                <PostComposer
                  communityId={community.id}
                  onCreated={(p) => setPosts((prev) => [p, ...(prev || [])])}
                />
              )}
              <div className="space-y-4 mt-4">
                {posts === null ? (
                  <Skeleton className="h-32" />
                ) : posts.length === 0 ? (
                  <EmptyState icon="📰" title="אין עדיין פוסטים בקהילה" />
                ) : (
                  posts.map((p) => <PostCard key={p.id} post={p} onChange={(np) => setPosts((prev) => prev!.map((x) => (x.id === np.id ? np : x)))} />)
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
