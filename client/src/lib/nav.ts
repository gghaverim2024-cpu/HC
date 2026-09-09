import { Home, Gamepad2, Server, MessageCircle, User, Users, Building2, CalendarDays, Newspaper, Sparkles, Shield, Clapperboard } from 'lucide-react';

export const MAIN_NAV = [
  { to: '/', label: 'בית', icon: Home, end: true },
  { to: '/games', label: 'משחקים', icon: Gamepad2 },
  { to: '/servers', label: 'שרתים', icon: Server },
  { to: '/chat', label: 'צ\'אט', icon: MessageCircle },
  { to: '/find-players', label: 'מצא שחקנים', icon: Users },
  { to: '/reels', label: 'רילס', icon: Clapperboard },
  { to: '/communities', label: 'קהילות', icon: Building2 },
  { to: '/events', label: 'אירועים', icon: CalendarDays },
  { to: '/feed', label: 'פיד', icon: Newspaper },
  { to: '/hc-ai', label: 'HC AI', icon: Sparkles },
];

export const MOBILE_NAV = [
  { to: '/', label: 'בית', icon: Home, end: true },
  { to: '/games', label: 'משחקים', icon: Gamepad2 },
  { to: '/servers', label: 'שרתים', icon: Server },
  { to: '/chat', label: 'צ\'אט', icon: MessageCircle },
  { to: '/profile/me', label: 'פרופיל', icon: User },
];

export const ADMIN_NAV = { to: '/admin', label: 'ניהול', icon: Shield };
