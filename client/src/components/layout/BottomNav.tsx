import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { MOBILE_NAV } from '../../lib/nav';

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-hc-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 py-2.5 flex-1 text-[11px] font-semibold transition-colors',
                isActive ? 'text-hc-accent' : 'text-gray-500'
              )
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
