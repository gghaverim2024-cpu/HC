import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, Settings as SettingsIcon, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Avatar, Button } from '../ui/Primitives';
import { NotificationsBell } from './NotificationsBell';
import { OnlinePill } from '../ui/LiveCount';
import { useSocket } from '../../context/SocketContext';

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { presence } = useSocket();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-hc-border">
      <div className="flex items-center gap-3 px-4 py-3">
        <form onSubmit={submitSearch} className="flex-1 max-w-lg relative">
          <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפש משחקים, שרתים, שחקנים, קהילות..."
            className="w-full bg-white/5 border border-hc-border rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-hc-primary/60 focus:bg-white/[0.07] transition-colors"
          />
        </form>

        <div className="hidden sm:block">
          <OnlinePill count={presence['global:online'] || 0} />
        </div>

        {user ? (
          <>
            <NotificationsBell />
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)} className="block">
                <Avatar src={user.avatarUrl} alt={user.username} size={38} online />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-11 w-52 glass-strong rounded-xl overflow-hidden shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-hc-border">
                    <p className="font-bold text-white text-sm truncate">{user.username}</p>
                    <p className="text-xs text-gray-500">HC Level {user.level}</p>
                  </div>
                  <Link
                    to="/profile/me"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5"
                  >
                    <UserCircle size={16} /> הפרופיל שלי
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5"
                  >
                    <SettingsIcon size={16} /> הגדרות
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5"
                  >
                    <LogOut size={16} /> התנתקות
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                התחברות
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">הרשמה</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
