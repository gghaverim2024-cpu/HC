import { useEffect, useState } from 'react';
import { Bell, UserPlus, Users, Trophy, MessageSquare, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { notificationsApi } from '../api';
import { GlassCard, Skeleton, EmptyState } from '../components/ui/Primitives';
import { timeAgo } from '../lib/format';
import type { AppNotification } from '../types';

const ICONS: Record<string, any> = {
  friend_request: UserPlus,
  group_invite: Users,
  achievement: Trophy,
  message: MessageSquare,
  join_request: Building2,
  join_approved: CheckCircle2,
  join_rejected: XCircle,
};

function notifText(n: AppNotification): string {
  switch (n.type) {
    case 'friend_request':
      return `${n.payload.fromUsername} שלח לך בקשת חברות`;
    case 'group_invite':
      return `${n.payload.fromUsername} הזמין אותך להצטרף לקבוצה`;
    case 'join_request':
      return `${n.payload.fromUsername} ביקש להצטרף לקהילה "${n.payload.communityName}"`;
    case 'join_approved':
      return `בקשת ההצטרפות שלך ל-"${n.payload.communityName}" אושרה!`;
    case 'join_rejected':
      return `בקשת ההצטרפות שלך ל-"${n.payload.communityName}" נדחתה`;
    default:
      return 'התראה חדשה';
  }
}

export function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    notificationsApi.list().then((r) => {
      setItems(r.notifications);
      notificationsApi.readAll();
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">🔔 התראות</h1>
      {items === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="🔔" title="אין התראות" />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <GlassCard key={n.id} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-100">{notifText(n)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
