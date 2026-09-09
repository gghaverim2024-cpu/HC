const BLOCKED_WORDS = [
  'מטומטם', 'אידיוט', 'מניאק', 'זונה', 'בן זונה', 'שרמוטה', 'חרא',
  'idiot', 'moron', 'nazi', 'kys', 'kill yourself', 'retard',
];

const pattern = new RegExp(BLOCKED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');

export function containsBlockedContent(text) {
  return pattern.test(text);
}

export function censor(text) {
  return text.replace(pattern, (m) => '*'.repeat(m.length));
}
