import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send } from 'lucide-react';
import { aiApi } from '../api';
import { Avatar, Button, GlassCard } from '../components/ui/Primitives';
import { ServerCard } from '../components/ui/ServerCard';

interface AiTurn {
  role: 'user' | 'ai';
  text: string;
  results?: any[];
}

const SUGGESTIONS = [
  'אני מחפש שרת Minecraft Survival עם הרבה שחקנים',
  'אני מחפש אנשים לשחק איתם Fortnite עכשיו',
  'מה השרתים הכי גדולים של Valorant?',
];

export function HcAiPage() {
  const [turns, setTurns] = useState<AiTurn[]>([
    { role: 'ai', text: 'היי! אני HC AI 🤖 ספר לי מה אתה מחפש — שרת, קבוצה למשחק, או המלצה — ואני אעזור לך למצוא את זה מהר.' },
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  async function ask(message: string) {
    if (!message.trim() || loading) return;
    setTurns((t) => [...t, { role: 'user', text: message }]);
    setText('');
    setLoading(true);
    try {
      const r = await aiApi.ask(message);
      setTurns((t) => [...t, { role: 'ai', text: r.reply, results: r.results }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-88px)]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">HC AI</h1>
          <p className="text-xs text-gray-500">עוזר גיימינג חכם, מבוסס על נתוני HC Israel בזמן אמת</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-4">
        {turns.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === 'user' ? 'justify-start' : 'justify-start'}`}>
            <div className={`flex items-start gap-2.5 max-w-[85%] ${turn.role === 'user' ? 'mr-auto' : ''}`}>
              {turn.role === 'ai' && (
                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0 mt-1">
                  <Sparkles size={14} className="text-white" />
                </div>
              )}
              <div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${turn.role === 'ai' ? 'glass text-gray-200' : 'gradient-brand text-white'}`}>
                  {turn.text}
                </div>
                {turn.results && turn.results.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    {turn.results.map((res, j) =>
                      res.type === 'server' ? (
                        <ServerCard key={j} server={res.server} />
                      ) : (
                        <GlassCard key={j} className="p-3 flex items-center gap-3">
                          <Avatar src={res.user.avatarUrl} alt={res.user.username} size={36} online={res.user.isOnline} />
                          <div className="min-w-0">
                            <Link to={`/profile/${res.user.username}`} className="font-semibold text-white text-sm hover:underline">
                              {res.user.username}
                            </Link>
                            <p className="text-xs text-gray-400">{res.mode}</p>
                          </div>
                        </GlassCard>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">HC AI חושב...</div>}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="text-xs glass rounded-full px-3 py-1.5 text-gray-400 hover:text-white transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(text)}
          placeholder="שאל את HC AI..."
          className="flex-1 bg-white/5 border border-hc-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-hc-primary/60"
        />
        <Button onClick={() => ask(text)} disabled={loading}>
          <Send size={17} />
        </Button>
      </div>
    </div>
  );
}
