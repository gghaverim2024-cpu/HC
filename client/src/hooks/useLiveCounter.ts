import { useEffect, useRef, useState } from 'react';

// Eases the displayed number toward `target` instead of jumping, so live
// player counts feel alive without flickering on every socket tick.
export function useLiveCounter(target: number, durationMs = 700): number {
  const [display, setDisplay] = useState(target);
  const frame = useRef<number | null>(null);
  const startVal = useRef(target);
  const startTime = useRef(0);

  useEffect(() => {
    if (target === display) return;
    startVal.current = display;
    startTime.current = performance.now();
    const from = startVal.current;
    const to = target;

    function tick(now: number) {
      const elapsed = now - startTime.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}
