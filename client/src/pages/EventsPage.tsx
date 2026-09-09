import { useEffect, useState } from 'react';
import { Plus, Users, Trophy } from 'lucide-react';
import { eventsApi, gamesApi } from '../api';
import { Button, GlassCard, Skeleton, EmptyState } from '../components/ui/Primitives';
import { CoverImage } from '../components/ui/CoverImage';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { countdownParts, formatDateTime } from '../lib/format';
import type { HcEvent, Game } from '../types';

function Countdown({ startTime }: { startTime: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const c = countdownParts(startTime);
  if (c.done) return <span className="text-emerald-400 font-bold text-sm">האירוע התחיל!</span>;
  return (
    <div className="flex items-center gap-1 font-mono text-lg font-bold text-white">
      {c.days > 0 && <span>{c.days}ד </span>}
      <span>{String(c.hours).padStart(2, '0')}</span>:<span>{String(c.minutes).padStart(2, '0')}</span>:
      <span className="text-hc-accent">{String(c.seconds).padStart(2, '0')}</span>
    </div>
  );
}

export function EventsPage() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [events, setEvents] = useState<HcEvent[] | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'community', gameId: '', startTime: '' });

  function reload() {
    eventsApi.list().then((r) => setEvents(r.events));
  }

  useEffect(() => {
    reload();
    gamesApi.list().then((r) => setGames(r.games));
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.startTime) return;
    await eventsApi.create({ ...form, startTime: new Date(form.startTime).toISOString() });
    pushToast({ title: 'האירוע נוצר בהצלחה!', variant: 'success' });
    setOpen(false);
    reload();
  }

  async function toggleJoin(ev: HcEvent) {
    if (!user) return;
    if (ev.joined) {
      await eventsApi.leave(ev.id);
      setEvents((prev) => prev!.map((e) => (e.id === ev.id ? { ...e, joined: false, participants: e.participants - 1 } : e)));
    } else {
      const r = await eventsApi.join(ev.id);
      setEvents((prev) => prev!.map((e) => (e.id === ev.id ? { ...e, joined: true, participants: e.participants + 1 } : e)));
      r.unlocked?.forEach((a: any) => pushToast({ title: `הישג נפתח: ${a.name}`, icon: a.icon, variant: 'success' }));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">🎉 אירועים</h1>
        {user && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={16} /> צור אירוע
          </Button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">טורנירים, תחרויות ואירועי קהילה</p>

      {events === null ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon="🎉" title="אין אירועים קרובים" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {events.map((ev) => (
            <GlassCard key={ev.id} hover className="overflow-hidden">
              <CoverImage src={ev.imageUrl} name={ev.title} className="h-32 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-hc-accent">{ev.type}</span>
                  <span className="text-[11px] text-gray-500">{formatDateTime(ev.startTime)}</span>
                </div>
                <h3 className="font-bold text-white mt-1">{ev.title}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ev.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">האירוע מתחיל בעוד</p>
                    <Countdown startTime={ev.startTime} />
                  </div>
                  <div className="text-left">
                    <p className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
                      <Users size={12} /> {ev.participants}
                    </p>
                    {user && (
                      <Button size="sm" variant={ev.joined ? 'secondary' : 'primary'} onClick={() => toggleJoin(ev)}>
                        {ev.joined ? 'ביטול הצטרפות' : 'הצטרף'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="יצירת אירוע">
        <form onSubmit={createEvent} className="space-y-3">
          <input
            required
            placeholder="שם האירוע"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          />
          <textarea
            placeholder="תיאור"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white h-20"
          />
          <select
            value={form.gameId}
            onChange={(e) => setForm({ ...form, gameId: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">ללא משחק ספציפי</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="community">אירוע קהילה</option>
            <option value="tournament">טורניר</option>
            <option value="server">אירוע שרת</option>
          </select>
          <input
            required
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white"
          />
          <Button type="submit" className="w-full">
            <Trophy size={16} /> צור אירוע
          </Button>
        </form>
      </Modal>
    </div>
  );
}
