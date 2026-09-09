import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, UserPlus, Gamepad2, MessageSquare, Trophy, Users } from 'lucide-react';
import { notificationsApi } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { useAuthStore } from '../../store/authStore';
import { timeAgo } from '../../lib/format';
import type { AppNotification } from '../../types';
import { useNavigate } from 'react-router-dom';

const ICONS: Record<string, any> = {
  friend_request: UserPlus,
  group_invite: Users,
  achievement: Trophy,
  message: MessageSquare,
  game: Gamepad2,
};

function notifText(n: AppNotification): string {
  switch (n.type) {
    case 'friend_request':
      return `${n.payload.fromUsername} שלח לך בקשת חברות`;
    case 'group_invite':
      return `${n.payload.fromUsername} הזמין אותך להצטרף לקבוצה`;
    default:
      return 'התראה חדשה';
  }
}

export function NotificationsBell() {
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    notificationsApi.list().then((r) => {
      setItems(r.notifications);
      setUnread(r.unreadCount);
    });
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;
    const handler = (n: AppNotification) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnread((c) => c + 1);
    };
    socket.on('notification:new', handler);
    return () => {
      socket.off('notification:new', handler);
    };
  }, [socket, user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  async function toggle() {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      await notificationsApi.readAll();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-300 hover:text-white transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 bg-hc-pink text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="absolute top-12 left-0 w-80 glass-strong rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[70vh] overflow-y-auto"
          >
            <div className="px-4 py-3 border-b border-hc-border font-bold text-white">התראות</div>
            {items.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">אין התראות חדשות</div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setOpen(false);
                      if (n.type === 'friend_request') navigate('/settings?tab=friends');
                    }}
                    className={`w-full text-right flex items-start gap-3 px-4 py-3 border-b border-hc-border/50 hover:bg-white/5 transition-colors ${
                      !n.read ? 'bg-hc-primary/5' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-100">{notifText(n)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
