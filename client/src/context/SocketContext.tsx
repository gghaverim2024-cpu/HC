import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import type { PresenceSnapshot } from '../types';

interface SocketContextValue {
  socket: Socket | null;
  presence: PresenceSnapshot;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, presence: {} });

export function SocketProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const pushToast = useUiStore((s) => s.pushToast);
  const [presence, setPresence] = useState<PresenceSnapshot>({});
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io('/', { auth: token ? { token } : {}, transports: ['websocket', 'polling'] });
    socketRef.current = s;
    setSocket(s);

    s.on('presence:snapshot', (snap: PresenceSnapshot) => setPresence(snap));
    s.on('achievement:unlocked', (ach: { name: string; icon: string; description: string }) => {
      pushToast({ title: `הישג נפתח: ${ach.name}`, description: ach.description, icon: ach.icon, variant: 'success' });
    });
    s.on('error:message', (err: { error: string }) => {
      pushToast({ title: err.error, variant: 'error' });
    });

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return <SocketContext.Provider value={{ socket, presence }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

export function usePresenceCount(key: string | undefined | null): number {
  const { presence } = useSocket();
  if (!key) return 0;
  return presence[key] ?? 0;
}

export function useScopePresence(scope: 'game' | 'server', id: string | undefined) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('presence:join', { scope, id });
    return () => {
      socket.emit('presence:leave', { scope, id });
    };
  }, [socket, scope, id]);
}
