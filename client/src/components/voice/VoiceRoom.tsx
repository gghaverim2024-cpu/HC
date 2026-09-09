import { Mic, MicOff, PhoneOff, Phone, Volume2 } from 'lucide-react';
import { useVoiceRoom } from '../../hooks/useVoiceRoom';
import { Avatar, Button, GlassCard } from '../ui/Primitives';
import { useAuthStore } from '../../store/authStore';

export function VoiceRoom({ roomKey, title }: { roomKey: string; title: string }) {
  const user = useAuthStore((s) => s.user);
  const { joined, connecting, participants, selfMuted, error, join, leave, toggleMute } = useVoiceRoom(roomKey);

  if (!user) {
    return (
      <GlassCard className="p-8 text-center text-gray-400 text-sm">
        צריך להתחבר כדי להצטרף לחדר הקול
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Volume2 size={18} className="text-hc-accent" />
          <h3 className="font-bold text-white">{title}</h3>
        </div>
        <span className="text-xs text-gray-500">{participants.length} בחדר</span>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6 min-h-[80px]">
        {participants.map((p) => (
          <div key={p.socketId} className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <Avatar src={p.avatarUrl} alt={p.username} size={52} />
              {p.muted && (
                <span className="absolute -bottom-1 -left-1 bg-hc-danger rounded-full p-1 border-2 border-hc-bg">
                  <MicOff size={10} className="text-white" />
                </span>
              )}
            </div>
            <span className="text-xs text-gray-300 truncate max-w-[70px]">{p.username}</span>
          </div>
        ))}
        {participants.length === 0 && (
          <p className="col-span-full text-center text-sm text-gray-500 py-4">אף אחד לא בחדר הקול כרגע</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        {!joined ? (
          <Button onClick={join} disabled={connecting}>
            <Phone size={16} /> {connecting ? 'מתחבר...' : 'הצטרף לחדר קול'}
          </Button>
        ) : (
          <>
            <Button variant={selfMuted ? 'danger' : 'secondary'} onClick={toggleMute}>
              {selfMuted ? <MicOff size={16} /> : <Mic size={16} />} {selfMuted ? 'השתקת עצמי' : 'המיקרופון פתוח'}
            </Button>
            <Button variant="danger" onClick={leave}>
              <PhoneOff size={16} /> עזוב חדר
            </Button>
          </>
        )}
      </div>
      <p className="text-[11px] text-gray-600 text-center mt-4">
        חיבור קול ישיר בין המשתתפים (P2P). ייתכן שהחיבור לא יעבוד ברשתות מסוימות (חסימות NAT/פיירוול).
      </p>
    </GlassCard>
  );
}
