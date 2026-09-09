import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Avatar, Button, LiveDot } from './Primitives';
import { lfgApi, friendsApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { LfgEntry } from '../../types';

export function LfgCard({ entry }: { entry: LfgEntry }) {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [sent, setSent] = useState(false);

  async function joinGroup() {
    if (!user) return;
    try {
      await friendsApi.request(entry.user.id);
      await lfgApi.invite(entry.id);
      setSent(true);
      pushToast({ title: `בקשה נשלחה ל-${entry.user.username}`, variant: 'success' });
    } catch {
      setSent(true);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-hc-border-strong transition-colors">
      <Link to={`/profile/${entry.user.username}`}>
        <Avatar src={entry.user.avatarUrl} alt={entry.user.username} size={44} online={entry.user.isOnline} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/profile/${entry.user.username}`} className="font-bold text-white text-sm hover:underline">
          {entry.user.username}
        </Link>
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
          🎮 {entry.game?.name} {entry.mode && `· ${entry.mode}`}
        </p>
        <LiveDot label={`מחפש ${entry.mode || 'קבוצה'}`} />
      </div>
      {user && user.id !== entry.user.id && (
        <Button size="sm" variant={sent ? 'secondary' : 'primary'} onClick={joinGroup} disabled={sent}>
          {sent ? 'נשלח ✓' : 'הצטרף לקבוצה'}
        </Button>
      )}
    </div>
  );
}
