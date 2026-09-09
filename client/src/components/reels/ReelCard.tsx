import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Flag, Trash2 } from 'lucide-react';
import { reelsApi, reportsApi } from '../../api';
import { Avatar } from '../ui/Primitives';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { timeAgo } from '../../lib/format';
import type { Reel } from '../../types';

export function ReelCard({ reel, onChange }: { reel: Reel; onChange: (r: Reel) => void }) {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [commentText, setCommentText] = useState('');
  const canModerate = user && ['moderator', 'admin', 'owner'].includes(user.role);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  async function toggleLike() {
    if (!user) return;
    const { reel: updated } = await reelsApi.like(reel.id);
    onChange(updated);
  }

  async function loadComments() {
    setShowComments((s) => !s);
    if (!comments) {
      const r = await reelsApi.comments(reel.id);
      setComments(r.comments);
    }
  }

  async function sendComment() {
    if (!commentText.trim()) return;
    await reelsApi.comment(reel.id, commentText);
    const r = await reelsApi.comments(reel.id);
    setComments(r.comments);
    setCommentText('');
    onChange({ ...reel, comments: reel.comments + 1 });
  }

  async function share() {
    await navigator.clipboard?.writeText(window.location.origin + '/reels#' + reel.id).catch(() => {});
    pushToast({ title: 'הקישור הועתק ללוח', variant: 'success' });
  }

  async function report() {
    const reason = window.prompt('סיבת הדיווח:');
    if (!reason?.trim()) return;
    await reportsApi.create({ targetType: 'post', targetId: reel.id, reason });
    pushToast({ title: 'הדיווח נשלח, תודה!', variant: 'success' });
  }

  async function remove() {
    if (!window.confirm('למחוק את הרילס הזה?')) return;
    await reelsApi.remove(reel.id);
    onChange({ ...reel, videoUrl: '', caption: '[הרילס נמחק]' });
  }

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-64px)] md:h-[calc(100vh-32px)] snap-start rounded-2xl overflow-hidden bg-black">
      {reel.videoUrl ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          loop
          muted={muted}
          playsInline
          className="w-full h-full object-contain bg-black"
          onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">{reel.caption}</div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <Link to={`/profile/${reel.author.username}`} className="flex items-center gap-2 mb-2">
          <Avatar src={reel.author.avatarUrl} alt={reel.author.username} size={32} />
          <span className="text-white font-bold text-sm">{reel.author.username}</span>
          <span className="text-gray-400 text-xs">· {timeAgo(reel.createdAt)}</span>
        </Link>
        {reel.caption && <p className="text-white text-sm mb-1">{reel.caption}</p>}
        {reel.game && <p className="text-hc-accent text-xs">🎮 {reel.game.name}</p>}
      </div>

      <div className="absolute left-3 bottom-24 flex flex-col items-center gap-4">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1 text-white">
          <span className={`p-2.5 rounded-full glass ${reel.liked ? 'text-hc-pink' : ''}`}>
            <Heart size={22} fill={reel.liked ? 'currentColor' : 'none'} />
          </span>
          <span className="text-xs">{reel.likes}</span>
        </button>
        <button onClick={loadComments} className="flex flex-col items-center gap-1 text-white">
          <span className="p-2.5 rounded-full glass">
            <MessageCircle size={22} />
          </span>
          <span className="text-xs">{reel.comments}</span>
        </button>
        <button onClick={share} className="flex flex-col items-center gap-1 text-white">
          <span className="p-2.5 rounded-full glass">
            <Share2 size={20} />
          </span>
        </button>
        <button onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1 text-white">
          <span className="p-2.5 rounded-full glass">{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</span>
        </button>
        {user && (
          <button onClick={report} className="flex flex-col items-center gap-1 text-white">
            <span className="p-2.5 rounded-full glass">
              <Flag size={18} />
            </span>
          </button>
        )}
        {canModerate && (
          <button onClick={remove} className="flex flex-col items-center gap-1 text-white">
            <span className="p-2.5 rounded-full glass text-hc-danger">
              <Trash2 size={18} />
            </span>
          </button>
        )}
      </div>

      {showComments && (
        <div className="absolute inset-x-0 bottom-0 max-h-[60%] glass-strong rounded-t-2xl p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-white">תגובות</h4>
            <button onClick={() => setShowComments(false)} className="text-gray-400">
              ✕
            </button>
          </div>
          <div className="space-y-2 mb-3">
            {comments?.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar src={c.author?.avatarUrl} alt={c.author?.username} size={26} />
                <div className="bg-white/5 rounded-xl px-3 py-1.5 flex-1">
                  <span className="text-xs font-bold text-white">{c.author?.username}</span>
                  <p className="text-xs text-gray-300">{c.content}</p>
                </div>
              </div>
            ))}
            {comments?.length === 0 && <p className="text-sm text-gray-500 text-center py-4">אין עדיין תגובות</p>}
          </div>
          {user && (
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                placeholder="הוסף תגובה..."
                className="flex-1 bg-white/5 border border-hc-border rounded-full px-3 py-2 text-xs text-white"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
