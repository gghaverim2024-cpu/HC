import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-hc-primary/30 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-hc-accent/20 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass-strong rounded-2xl p-8"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-hc-primary/30">
            <Gamepad2 size={22} className="text-white" />
          </div>
          <span className="font-black text-xl tracking-tight text-white">
            HC <span className="text-gradient-brand">Israel</span>
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-white text-center">{title}</h1>
        <p className="text-gray-400 text-sm text-center mt-1 mb-6">{subtitle}</p>
        {children}
      </motion.div>
    </div>
  );
}

export function FormField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block mb-4">
      <span className="text-sm font-semibold text-gray-300 mb-1.5 block">{label}</span>
      <input
        {...props}
        className="w-full bg-white/5 border border-hc-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-hc-primary/60 focus:bg-white/[0.07] transition-colors"
      />
    </label>
  );
}
