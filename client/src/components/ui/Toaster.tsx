import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { X } from 'lucide-react';

export function Toaster() {
  const { toasts, dismissToast } = useUiStore();
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`glass-strong rounded-xl px-4 py-3 flex items-start gap-3 pointer-events-auto shadow-xl ${
              t.variant === 'success' ? 'border-emerald-500/40' : t.variant === 'error' ? 'border-red-500/40' : ''
            }`}
          >
            {t.icon && <span className="text-xl leading-none">{t.icon}</span>}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">{t.title}</p>
              {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
