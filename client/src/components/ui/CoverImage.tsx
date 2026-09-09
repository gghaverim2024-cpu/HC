const CATEGORY_EMOJI: Record<string, string> = {
  'battle-royale': '🪂',
  sandbox: '🧱',
  fps: '🔫',
  moba: '⚔️',
  strategy: '🏰',
  rpg: '🐉',
  sports: '⚽',
  arcade: '🕹️',
  puzzle: '🧩',
  action: '💥',
  mmo: '🗺️',
  ar: '📍',
  fighting: '🥊',
  racing: '🏎️',
  simulation: '🏡',
  survival: '🏕️',
  board: '🎲',
  casual: '🎨',
  social: '👥',
};

const GRADIENTS = [
  'from-violet-600 to-cyan-500',
  'from-fuchsia-600 to-indigo-500',
  'from-pink-600 to-orange-400',
  'from-emerald-500 to-cyan-500',
  'from-amber-500 to-pink-500',
];

function pickGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function CoverImage({
  src,
  name,
  category,
  className,
}: {
  src?: string | null;
  name: string;
  category?: string;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={name} className={className} />;
  }
  return (
    <div className={`bg-gradient-to-br ${pickGradient(name)} flex flex-col items-center justify-center gap-1 ${className}`}>
      <span className="text-4xl drop-shadow">{CATEGORY_EMOJI[category || ''] || '🎮'}</span>
      <span className="text-white/90 font-bold text-sm px-2 text-center line-clamp-1">{name}</span>
    </div>
  );
}
