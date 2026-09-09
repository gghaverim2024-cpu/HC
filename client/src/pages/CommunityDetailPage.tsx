import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MessageCircle, Users, Newspaper, Crown, Lock, Volume2, UserCheck, Check, X } from 'lucide-react';
import { communitiesApi, postsApi } from '../api';
import { ChatWindow } from '../components/chat/ChatWindow';
import { VoiceRoom } from '../components/voice/VoiceRoom';
import { Tabs } from '../components/ui/Tabs';
import { Avatar, Button, GlassCard, Skeleton, EmptyState } from '../components/ui/Primitives';
import { PostComposer, PostCard } from '../components/feed/Post';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { timeAgo } from '../lib/format';
import type { Community, Post, JoinRequest } from '../types';

export function CommunityDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [community, setCommunity] = useState<Community | null>(null);
  const tab = params.get('tab') || 'chat';
  const [members, setMembers] = useState<any[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);

  function setTab(k: string) {
    setParams({ tab: k });
  }

  useEffect(() => {
    communitiesApi.get(id).then((r) => setCommunity(r.community));
    communitiesApi.members(id).then((r) => setMembers(r.members));
  }, [id]);

  const myRole = useMemo(() => members?.find((m) => m.id === user?.id)?.role, [members, user]);
  const canManage = myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    if (tab === 'posts' && !posts) postsApi.list(id).then((r) => setPosts(r.posts));
    if (tab === 'requests' && canManage) communitiesApi.joinRequests(id).then((r) => setRequests(r.requests));
  }, [tab, id, canManage]);

  const TABS = [
    { key: 'chat', label: "צ'אט", icon: <MessageCircle size={15} /> },
    { key: 'voice', label: 'קול', icon: <Volume2 size={15} /> },
    { key: 'members', label: 'חברים', icon: <Users size={15} /> },
    { key: 'posts', label: 'פוסטים', icon: <Newspaper size={15} /> },
    ...(canManage && community?.isPrivate
      ? [{ key: 'requests', label: 'בקשות הצטרפות', icon: <UserCheck size={15} /> }]
      : []),
  ];

  async function join() {
    if (!community) return;
    const r = await communitiesApi.join(community.id);
    if (r.pending) {
      setCommunity({ ...community, pendingRequest: true });
      pushToast({ title: 'בקשת ההצטרפות נשלחה, ממתין לאישור מנהל הקהילה', variant: 'success' });
      return;
    }
    setCommunity({ ...community, isMember: true, members: community.members + 1 });
    r.unlocked?.forEach((a: any) => pushToast({ title: `הישג נפתח: ${a.name}`, icon: a.icon, variant: 'success' }));
  }

  async function approve(reqId: string) {
    await communitiesApi.approveJoinRequest(id, reqId);
    setRequests((prev) => prev!.filter((r) => r.id !== reqId));
    setCommunity((c) => (c ? { ...c, members: c.members + 1 } : c));
    communitiesApi.members(id).then((r) => setMembers(r.members));
    pushToast({ title: 'הבקשה אושרה', variant: 'success' });
  }

  async function reject(reqId: string) {
    await communitiesApi.rejectJoinRequest(id, reqId);
    setRequests((prev) => prev!.filter((r) => r.id !== reqId));
    pushToast({ title: 'הבקשה נדחתה' });
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
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              {community.name} {community.isPrivate && <Lock size={16} className="text-hc-warn" />}
            </h1>
            <p className="text-sm text-gray-400">{community.members} חברים</p>
          </div>
        </div>
        {user && !community.isMember && !community.pendingRequest && (
          <Button onClick={join} className="mb-2">
            {community.isPrivate ? 'בקש להצטרף' : 'הצטרף לקהילה'}
          </Button>
        )}
        {user && community.pendingRequest && (
          <span className="mb-2 text-sm text-hc-warn font-semibold">ממתין לאישור הצטרפות</span>
        )}
      </div>
      <p className="px-4 mt-3 text-sm text-gray-400 max-w-2xl">{community.description}</p>

      <div className="px-4 mt-6">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-6">
          {tab === 'chat' && community.chatId && <ChatWindow chatId={community.chatId} className="h-[60vh]" />}

          {tab === 'voice' && <VoiceRoom roomKey={`community:${community.id}`} title={`חדר קול — ${community.name}`} />}

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

          {tab === 'requests' && canManage && (
            <div className="max-w-lg space-y-2">
              {requests === null ? (
                <Skeleton className="h-16" />
              ) : requests.length === 0 ? (
                <EmptyState icon="✅" title="אין בקשות הצטרפות ממתינות" />
              ) : (
                requests.map((r) => (
                  <GlassCard key={r.id} className="p-3 flex items-center gap-3">
                    <Avatar src={r.user.avatarUrl} alt={r.user.username} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{r.user.username}</p>
                      <p className="text-[11px] text-gray-500">{timeAgo(r.createdAt)}</p>
                    </div>
                    <button onClick={() => approve(r.id)} className="p-1.5 text-emerald-400 hover:bg-white/5 rounded-lg">
                      <Check size={16} />
                    </button>
                    <button onClick={() => reject(r.id)} className="p-1.5 text-red-400 hover:bg-white/5 rounded-lg">
                      <X size={16} />
                    </button>
                  </GlassCard>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
