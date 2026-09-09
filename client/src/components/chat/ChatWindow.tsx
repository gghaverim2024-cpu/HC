import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Send, Image as ImageIcon, Smile, Reply, X, Trash2, Flag, Loader2 } from 'lucide-react';
import { chatsApi, reportsApi } from '../../api';
import { uploadImage } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Avatar } from '../ui/Primitives';
import { timeAgo } from '../../lib/format';
import type { ChatMessage } from '../../types';

const EMOJIS = ['😀', '😂', '🔥', '👍', '❤️', '🎮', '😢', '😮', '🏆', '💀', '🙏', '👀'];

function renderContent(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_א-ת]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-hc-accent font-semibold">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function ChatWindow({ chatId, className }: { chatId: string; className?: string }) {
  const { socket } = useSocket();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canModerate = user && ['moderator', 'admin', 'owner'].includes(user.role);

  useEffect(() => {
    setLoading(true);
    chatsApi.messages(chatId).then((r) => {
      setMessages(r.messages);
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    });
  }, [chatId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('chat:join', { chatId });
    const onMessage = (m: ChatMessage) => {
      if (m.chatId !== chatId) return;
      setMessages((prev) => [...prev, m]);
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      });
    };
    const onTyping = (data: { chatId: string; username: string }) => {
      if (data.chatId !== chatId) return;
      setTypingUser(data.username);
      setTimeout(() => setTypingUser((u) => (u === data.username ? null : u)), 2500);
    };
    socket.on('chat:message', onMessage);
    socket.on('typing', onTyping);
    return () => {
      socket.emit('chat:leave', { chatId });
      socket.off('chat:message', onMessage);
      socket.off('typing', onTyping);
    };
  }, [socket, chatId]);

  const send = useCallback(() => {
    if (!socket || !user) return;
    if (!text.trim() && !pendingImage) return;
    socket.emit('chat:message', { chatId, content: text.trim(), imageUrl: pendingImage, replyToId: replyTo?.id });
    setText('');
    setPendingImage(null);
    setReplyTo(null);
  }, [socket, user, text, pendingImage, replyTo, chatId]);

  function onTypingInput(v: string) {
    setText(v);
    if (!socket || !user) return;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socket.emit('typing', { chatId });
    typingTimeout.current = setTimeout(() => {}, 1500);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setPendingImage(url);
    } catch {
      pushToast({ title: 'העלאת התמונה נכשלה', variant: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function deleteMessage(m: ChatMessage) {
    await chatsApi.deleteMessage(chatId, m.id);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deleted: true, content: '[הודעה נמחקה]' } : x)));
  }

  async function reportMessage(m: ChatMessage) {
    const reason = window.prompt('סיבת הדיווח:');
    if (!reason?.trim()) return;
    await reportsApi.create({ targetType: 'message', targetId: m.id, reason });
    pushToast({ title: 'הדיווח נשלח, תודה!', variant: 'success' });
  }

  return (
    <div className={clsx('flex flex-col glass rounded-2xl overflow-hidden', className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm mt-10">אין עדיין הודעות. תהיה הראשון לכתוב! 👋</p>
        ) : (
          messages.map((m) => {
            const isSelf = m.author?.id === user?.id;
            return (
              <div key={m.id} className="group flex items-start gap-2.5 animate-fade-in">
                <Link to={`/profile/${m.author?.username}`}>
                  <Avatar src={m.author?.avatarUrl} alt={m.author?.username || '?'} size={32} />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${m.author?.username}`} className="font-bold text-sm text-white hover:underline">
                      {m.author?.username}
                    </Link>
                    <span className="text-[11px] text-gray-500">{timeAgo(m.createdAt)}</span>
                  </div>
                  {m.imageUrl && (
                    <img src={m.imageUrl} className="mt-1 max-w-[240px] rounded-xl border border-hc-border" alt="" />
                  )}
                  {m.content && (
                    <p className={clsx('text-sm mt-0.5 break-words', m.deleted ? 'italic text-gray-500' : 'text-gray-200')}>
                      {renderContent(m.content)}
                    </p>
                  )}
                </div>
                {!m.deleted && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                    {user && (
                      <button onClick={() => setReplyTo(m)} className="p-1.5 text-gray-500 hover:text-white" title="הגב">
                        <Reply size={14} />
                      </button>
                    )}
                    {user && !isSelf && (
                      <button onClick={() => reportMessage(m)} className="p-1.5 text-gray-500 hover:text-hc-warn" title="דווח">
                        <Flag size={14} />
                      </button>
                    )}
                    {canModerate && (
                      <button onClick={() => deleteMessage(m)} className="p-1.5 text-gray-500 hover:text-hc-danger" title="מחק">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {typingUser && <p className="px-4 text-[11px] text-gray-500 -mt-2 pb-1">{typingUser} מקליד...</p>}

      {user ? (
        <div className="border-t border-hc-border p-3">
          {replyTo && (
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5 mb-2 text-xs text-gray-400">
              <span className="truncate">מגיב ל{replyTo.author?.username}: {replyTo.content?.slice(0, 40)}</span>
              <button onClick={() => setReplyTo(null)}>
                <X size={14} />
              </button>
            </div>
          )}
          {pendingImage && (
            <div className="relative inline-block mb-2">
              <img src={pendingImage} className="h-16 rounded-lg border border-hc-border" alt="" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -left-1.5 bg-hc-danger rounded-full p-0.5 text-white"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 relative">
            <input
              value={text}
              onChange={(e) => onTypingInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder="כתוב הודעה..."
              className="flex-1 bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-hc-primary/60"
            />
            <button onClick={() => setShowEmoji((s) => !s)} className="p-2 text-gray-400 hover:text-white">
              <Smile size={19} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 text-gray-400 hover:text-white"
            >
              {uploading ? <Loader2 size={19} className="animate-spin" /> : <ImageIcon size={19} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickImage} />
            <button onClick={send} className="p-2.5 rounded-xl gradient-brand text-white">
              <Send size={17} />
            </button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 glass-strong rounded-xl p-2 grid grid-cols-6 gap-1 z-20">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setText((t) => t + e);
                      setShowEmoji(false);
                    }}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-hc-border p-3 text-center text-sm text-gray-500">
          <Link to="/login" className="text-hc-accent font-semibold hover:underline">
            התחבר
          </Link>{' '}
          כדי לשלוח הודעות
        </div>
      )}
    </div>
  );
}
