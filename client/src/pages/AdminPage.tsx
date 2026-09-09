import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Search, Shield, VolumeX, Ban, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../api';
import { Avatar, Button, GlassCard, RoleBadge, Skeleton, EmptyState } from '../components/ui/Primitives';
import { Tabs } from '../components/ui/Tabs';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { timeAgo } from '../lib/format';
import type { Role } from '../types';

const ROLE_RANK: Record<Role, number> = { user: 0, verified: 1, helper: 2, moderator: 3, admin: 4, owner: 5 };
const ROLES: Role[] = ['user', 'verified', 'helper', 'moderator', 'admin', 'owner'];

export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState<any[] | null>(null);
  const [users, setUsers] = useState<any[] | null>(null);
  const [q, setQ] = useState('');

  const canModerate = user && ROLE_RANK[user.role] >= ROLE_RANK.moderator;
  const isOwner = user?.role === 'owner';
  const isAdmin = user && ROLE_RANK[user.role] >= ROLE_RANK.admin;

  useEffect(() => {
    if (!canModerate) return;
    if (tab === 'reports') adminApi.reports().then((r) => setReports(r.reports));
    if (tab === 'users') adminApi.users(q).then((r) => setUsers(r.users));
  }, [tab, canModerate, q]);

  if (!user) return <Navigate to="/login" replace />;
  if (!canModerate) return <Navigate to="/" replace />;

  async function resolveReport(id: string) {
    await adminApi.resolveReport(id);
    setReports((prev) => prev!.filter((r) => r.id !== id));
  }

  async function mute(id: string) {
    await adminApi.mute(id);
    pushToast({ title: 'המשתמש הושתק', variant: 'success' });
    adminApi.users(q).then((r) => setUsers(r.users));
  }
  async function ban(id: string) {
    await adminApi.ban(id);
    pushToast({ title: 'המשתמש נחסם', variant: 'success' });
    adminApi.users(q).then((r) => setUsers(r.users));
  }
  async function unban(id: string) {
    await adminApi.unban(id);
    pushToast({ title: 'המשתמש שוחרר', variant: 'success' });
    adminApi.users(q).then((r) => setUsers(r.users));
  }
  async function setRole(id: string, role: string) {
    await adminApi.setRole(id, role);
    pushToast({ title: 'התפקיד עודכן', variant: 'success' });
    adminApi.users(q).then((r) => setUsers(r.users));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
        <Shield size={22} className="text-hc-accent" /> ניהול ומודרציה
      </h1>
      <p className="text-gray-400 text-sm mb-6">גלוי רק לבעלי תפקידי Moderator ומעלה</p>

      <Tabs
        tabs={[
          { key: 'reports', label: 'דיווחים' },
          { key: 'users', label: 'משתמשים' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {tab === 'reports' &&
          (reports === null ? (
            <Skeleton className="h-40" />
          ) : reports.length === 0 ? (
            <EmptyState icon="🛡️" title="אין דיווחים פתוחים" />
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <GlassCard key={r.id} className="p-4 flex items-center gap-3">
                  <Avatar src={r.reporter?.avatarUrl} alt={r.reporter?.username || '?'} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <b>{r.reporter?.username}</b> דיווח על {r.targetType === 'user' ? 'משתמש' : r.targetType === 'message' ? 'הודעה' : 'פוסט'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">"{r.reason}"</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{timeAgo(r.createdAt)}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => resolveReport(r.id)}>
                    <CheckCircle2 size={14} /> טיפול הושלם
                  </Button>
                </GlassCard>
              ))}
            </div>
          ))}

        {tab === 'users' && (
          <div>
            <div className="relative max-w-xs mb-4">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="חפש משתמש..."
                className="w-full bg-white/5 border border-hc-border rounded-xl py-2 pr-9 pl-4 text-sm text-white"
              />
            </div>
            {users === null ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <GlassCard key={u.id} className="p-3 flex items-center gap-3 flex-wrap">
                    <Avatar src={u.avatarUrl} alt={u.username} size={34} online={u.isOnline} />
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-sm text-white font-medium flex items-center gap-1.5">
                        {u.username} <RoleBadge role={u.role} />
                      </p>
                      <p className="text-xs text-gray-500">{u.status}</p>
                    </div>
                    {isOwner && (
                      <select
                        value={u.role}
                        onChange={(e) => setRole(u.id, e.target.value)}
                        className="bg-white/5 border border-hc-border rounded-lg px-2 py-1 text-xs text-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => mute(u.id)} className="p-1.5 text-hc-warn hover:bg-white/5 rounded-lg" title="השתק">
                      <VolumeX size={16} />
                    </button>
                    {isAdmin &&
                      (u.status === 'banned' ? (
                        <button onClick={() => unban(u.id)} className="p-1.5 text-emerald-400 hover:bg-white/5 rounded-lg" title="בטל חסימה">
                          <CheckCircle2 size={16} />
                        </button>
                      ) : (
                        <button onClick={() => ban(u.id)} className="p-1.5 text-hc-danger hover:bg-white/5 rounded-lg" title="חסום">
                          <Ban size={16} />
                        </button>
                      ))}
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
