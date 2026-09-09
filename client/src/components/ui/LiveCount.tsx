import { Users } from 'lucide-react';
import { useLiveCounter } from '../../hooks/useLiveCounter';
import { formatCompactNumber } from '../../lib/format';
import { LiveDot } from './Primitives';

export function LiveCount({ count, label = 'שחקנים פעילים' }: { count: number; label?: string }) {
  const display = useLiveCounter(count);
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <LiveDot />
      <span className="font-bold text-white tabular-nums">{formatCompactNumber(display)}</span>
      <span className="text-gray-400">{label}</span>
    </div>
  );
}

export function OnlinePill({ count }: { count: number }) {
  const display = useLiveCounter(count);
  return (
    <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
      <Users size={14} className="text-hc-accent" />
      <span className="font-bold text-white tabular-nums">{formatCompactNumber(display)}</span>
      <span className="text-gray-400">מחוברים</span>
    </div>
  );
}
