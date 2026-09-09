import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, Users2, MessageCircle, ArrowLeft } from 'lucide-react';
import { LiveCount } from '../ui/LiveCount';
import { formatCompactNumber } from '../../lib/format';
import type { Game } from '../../types';

export function GameCard({ game, index = 0 }: { game: Game; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Link
        to={`/games/${game.slug}`}
        className="group relative block rounded-2xl overflow-hidden glass hover:border-hc-border-strong transition-all duration-300 hover:-translate-y-1"
      >
        <div className="relative h-40 overflow-hidden">
          <img
            src={game.coverUrl || ''}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-hc-bg via-hc-bg/30 to-transparent" />
          <img
            src={game.logoUrl || ''}
            alt=""
            className="absolute bottom-3 right-3 w-10 h-10 rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm"
          />
        </div>
        <div className="p-4">
          <h3 className="font-bold text-white text-base mb-1.5">{game.name}</h3>
          <LiveCount count={game.onlinePlayers} />
          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <Server size={12} /> {formatCompactNumber(game.servers)}
            </span>
            <span className="flex items-center gap-1">
              <Users2 size={12} /> {formatCompactNumber(game.communities)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={12} /> {formatCompactNumber(game.chats)}
            </span>
          </div>
        </div>
        <div className="absolute top-3 left-3 w-8 h-8 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowLeft size={14} className="text-white" />
        </div>
      </Link>
    </motion.div>
  );
}
