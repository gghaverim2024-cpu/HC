import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { MAIN_NAV, ADMIN_NAV } from '../../lib/nav';
import { useAuthStore } from '../../store/authStore';
import { Gamepad2 } from 'lucide-react';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const canModerate = user && ['moderator', 'admin', 'owner'].includes(user.role);

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-l border-hc-border p-4 gap-1">
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-hc-primary/30">
          <Gamepad2 size={20} className="text-white" />
        </div>
        <span className="font-black text-lg tracking-tight text-white">
          HC <span className="text-gradient-brand">Israel</span>
        </span>
      </div>

      {MAIN_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
              isActive ? 'gradient-brand text-white shadow-lg shadow-hc-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
            )
          }
        >
          <item.icon size={19} />
          {item.label}
        </NavLink>
      ))}

      {canModerate && (
        <NavLink
          to={ADMIN_NAV.to}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mt-2 border-t border-hc-border pt-4',
              isActive ? 'text-hc-accent' : 'text-gray-500 hover:text-white'
            )
          }
        >
          <ADMIN_NAV.icon size={19} />
          {ADMIN_NAV.label}
        </NavLink>
      )}

      <div className="flex-1" />
      {user && (
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
        >
          הגדרות
        </NavLink>
      )}
    </aside>
  );
}
