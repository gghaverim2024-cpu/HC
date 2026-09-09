export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('he-IL').format(n);
}

export function timeAgo(iso: string): string {
  const date = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z');
  const diffSec = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'עכשיו';
  if (diffSec < 3600) return `לפני ${Math.floor(diffSec / 60)} דק'`;
  if (diffSec < 86400) return `לפני ${Math.floor(diffSec / 3600)} שע'`;
  if (diffSec < 86400 * 30) return `לפני ${Math.floor(diffSec / 86400)} ימים`;
  return date.toLocaleDateString('he-IL');
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z');
  return date.toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' });
}

export function countdownParts(iso: string) {
  const target = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, done: diff <= 0 };
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
