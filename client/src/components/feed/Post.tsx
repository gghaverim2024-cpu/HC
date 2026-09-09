import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Flag, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { postsApi, reportsApi } from '../../api';
import { uploadImage } from '../../api/client';
import { Avatar, Button, GlassCard } from '../ui/Primitives';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { timeAgo } from '../../lib/format';
import type { Post } from '../../types';

export function PostComposer({ communityId, onCreated }: { communityId?: string; onCreated: (p: Post) => void }) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const user = useAuthStore((s) => s.user);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await uploadImage(file));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!content.trim() && !imageUrl) return;
    setPosting(true);
    try {
      const { post } = await postsApi.create({ content, imageUrl: imageUrl || undefined, communityId });
      onCreated(post);
      setContent('');
      setImageUrl(null);
    } finally {
      setPosting(false);
    }
  }

  if (!user) return null;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <Avatar src={user.avatarUrl} alt={user.username} size={38} />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="מה קורה בעולם הגיימינג שלך?"
            className="w-full bg-white/5 border border-hc-border rounded-xl px-3 py-2 text-sm text-white h-16 resize-none focus:outline-none focus:border-hc-primary/60"
          />
          {imageUrl && <img src={imageUrl} className="mt-2 h-24 rounded-lg" alt="" />}
          <div className="flex items-center justify-between mt-2">
            <label className="cursor-pointer text-gray-400 hover:text-white">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              <input type="file" accept="image/*" hidden onChange={onFile} />
            </label>
            <Button size="sm" onClick={submit} disabled={posting}>
              פרסם
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function PostCard({ post, onChange }: { post: Post; onChange: (p: Post) => void }) {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [commentText, setCommentText] = useState('');
  const canModerate = user && ['moderator', 'admin', 'owner'].includes(user.role);

  async function toggleLike() {
    const { post: updated } = await postsApi.like(post.id);
    onChange(updated);
  }

  async function loadComments() {
    setShowComments((s) => !s);
    if (!comments) {
      const r = await postsApi.comments(post.id);
      setComments(r.comments);
    }
  }

  async function sendComment() {
    if (!commentText.trim()) return;
    await postsApi.comment(post.id, commentText);
    const r = await postsApi.comments(post.id);
    setComments(r.comments);
    setCommentText('');
    onChange({ ...post, comments: post.comments + 1 });
  }

  async function share() {
    await navigator.clipboard?.writeText(window.location.origin + '/feed#' + post.id).catch(() => {});
    pushToast({ title: 'הקישור הועתק ללוח', variant: 'success' });
  }

  async function report() {
    const reason = window.prompt('סיבת הדיווח:');
    if (!reason?.trim()) return;
    await reportsApi.create({ targetType: 'post', targetId: post.id, reason });
    pushToast({ title: 'הדיווח נשלח, תודה!', variant: 'success' });
  }

  async function remove() {
    await postsApi.remove(post.id);
    onChange({ ...post, content: '[הפוסט נמחק]', imageUrl: null });
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <Link to={`/profile/${post.author.username}`}>
          <Avatar src={post.author.avatarUrl} alt={post.author.username} size={40} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/profile/${post.author.username}`} className="font-bold text-white text-sm hover:underline">
            {post.author.username}
          </Link>
          <p className="text-xs text-gray-500">
            {timeAgo(post.createdAt)} {post.community && `· ${post.community.name}`}
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-200 mt-3 whitespace-pre-wrap">{post.content}</p>
      {post.imageUrl && <img src={post.imageUrl} className="mt-3 rounded-xl max-h-96 w-full object-cover" alt="" />}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-hc-border">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${post.liked ? 'text-hc-pink' : 'text-gray-400 hover:text-hc-pink'}`}
        >
          <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
          <MessageCircle size={16} /> {post.comments}
        </button>
        <button onClick={share} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
          <Share2 size={16} />
        </button>
        <button onClick={report} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-hc-warn mr-auto">
          <Flag size={14} />
        </button>
        {canModerate && (
          <button onClick={remove} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-hc-danger">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-hc-border space-y-2">
          {comments?.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar src={c.author?.avatarUrl} alt={c.author?.username} size={26} />
              <div className="bg-white/5 rounded-xl px-3 py-1.5 flex-1">
                <span className="text-xs font-bold text-white">{c.author?.username}</span>
                <p className="text-xs text-gray-300">{c.content}</p>
              </div>
            </div>
          ))}
          {user && (
            <div className="flex gap-2 mt-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                placeholder="הוסף תגובה..."
                className="flex-1 bg-white/5 border border-hc-border rounded-full px-3 py-1.5 text-xs text-white"
              />
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
