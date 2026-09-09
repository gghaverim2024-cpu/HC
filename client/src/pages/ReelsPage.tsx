import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { reelsApi, gamesApi } from '../api';
import { ReelCard } from '../components/reels/ReelCard';
import { CreateReelModal } from '../components/reels/CreateReelModal';
import { EmptyState, Skeleton } from '../components/ui/Primitives';
import { useAuthStore } from '../store/authStore';
import type { Reel, Game } from '../types';

export function ReelsPage() {
  const user = useAuthStore((s) => s.user);
  const [reels, setReels] = useState<Reel[] | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    reelsApi.list().then((r) => setReels(r.reels));
    gamesApi.list().then((r) => setGames(r.games));
  }, []);

  return (
    <div className="max-w-lg mx-auto py-2">
      <div className="flex items-center justify-between px-4 mb-2">
        <h1 className="text-xl font-bold text-white">🎬 רילס</h1>
        {user && (
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white shadow-lg shadow-hc-primary/30"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {reels === null ? (
        <div className="px-4 space-y-3">
          <Skeleton className="h-[70vh]" />
        </div>
      ) : reels.length === 0 ? (
        <EmptyState icon="🎬" title="אין עדיין רילס" description="תהיה הראשון להעלות קליפ!" />
      ) : (
        <div className="snap-y snap-mandatory h-[calc(100vh-96px)] md:h-[calc(100vh-64px)] overflow-y-auto space-y-3 px-2 pb-4">
          {reels.map((r) => (
            <ReelCard key={r.id} reel={r} onChange={(nr) => setReels((prev) => prev!.map((x) => (x.id === nr.id ? nr : x)))} />
          ))}
        </div>
      )}

      <CreateReelModal
        open={open}
        onClose={() => setOpen(false)}
        games={games}
        onCreated={(r) => setReels((prev) => [r, ...(prev || [])])}
      />
    </div>
  );
}
