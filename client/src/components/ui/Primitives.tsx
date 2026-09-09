import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import type { Role } from '../../types';

export function GlassCard({
  children,
  className,
  hover = false,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  as?: any;
}) {
  return (
    <As
      className={clsx(
        'glass rounded-2xl',
        hover && 'transition-all duration-300 hover:border-hc-border-strong hover:bg-white/[0.06] hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </As>
  );
}

const buttonVariants = {
  primary: 'gradient-brand text-white shadow-lg shadow-hc-primary/20 hover:brightness-110',
  secondary: 'glass text-gray-100 hover:bg-white/10',
  ghost: 'text-gray-300 hover:bg-white/5 hover:text-white',
  danger: 'bg-hc-danger/90 text-white hover:bg-hc-danger',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      className={clsx(
        'rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2',
        buttonVariants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Avatar({ src, alt, size = 40, online }: { src?: string | null; alt: string; size?: number; online?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <img
        src={src || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(alt)}`}
        alt={alt}
        className="rounded-full object-cover w-full h-full border border-hc-border-strong"
      />
      {online !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 left-0 rounded-full border-2 border-hc-bg',
            online ? 'bg-hc-online' : 'bg-hc-offline'
          )}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}

const roleLabels: Record<Role, { label: string; className: string }> = {
  owner: { label: 'Owner', className: 'bg-hc-danger/20 text-red-300 border-red-500/30' },
  admin: { label: 'Admin', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  moderator: { label: 'Mod', className: 'bg-hc-accent/20 text-cyan-300 border-cyan-500/30' },
  helper: { label: 'Helper', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  verified: { label: 'Verified', className: 'bg-hc-primary/20 text-violet-300 border-violet-500/30' },
  user: { label: '', className: '' },
};

export function RoleBadge({ role }: { role: Role }) {
  if (role === 'user') return null;
  const meta = roleLabels[role];
  return (
    <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded border', meta.className)}>{meta.label}</span>
  );
}

export function LiveDot({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}

export function LevelBar({ level, percent, size = 'md' }: { level: number; percent: number; size?: 'sm' | 'md' }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className={clsx('font-bold text-gradient-brand', size === 'sm' ? 'text-xs' : 'text-sm')}>
          HC Level {level}
        </span>
        <span className="text-[11px] text-gray-500">{percent}%</span>
      </div>
      <div className={clsx('w-full rounded-full bg-white/5 overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div
          className="h-full rounded-full gradient-brand transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded-xl', className)} />;
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 text-gray-400">
      <div className="text-4xl mb-3 opacity-70">{icon}</div>
      <p className="font-semibold text-gray-200">{title}</p>
      {description && <p className="text-sm mt-1 max-w-sm">{description}</p>}
    </div>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {action}
    </div>
  );
}
