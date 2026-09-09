import { useEffect, useState } from 'react';
import { postsApi } from '../api';
import { PostComposer, PostCard } from '../components/feed/Post';
import { Skeleton, EmptyState } from '../components/ui/Primitives';
import type { Post } from '../types';

export function FeedPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    postsApi.list().then((r) => setPosts(r.posts));
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">📰 פיד</h1>
      <p className="text-gray-400 text-sm mb-6">עדכונים, הכרזות ותוצאות טורנירים מכל הקהילה</p>

      <PostComposer onCreated={(p) => setPosts((prev) => [p, ...(prev || [])])} />

      <div className="space-y-4 mt-4">
        {posts === null ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)
        ) : posts.length === 0 ? (
          <EmptyState icon="📰" title="אין עדיין פוסטים" description="תהיה הראשון לפרסם משהו!" />
        ) : (
          posts.map((p) => (
            <PostCard key={p.id} post={p} onChange={(np) => setPosts((prev) => prev!.map((x) => (x.id === np.id ? np : x)))} />
          ))
        )}
      </div>
    </div>
  );
}
