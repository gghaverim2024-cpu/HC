import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { serializeMessage } from '../lib/serialize.js';
import { getOrCreateChat, dmChatKey } from '../lib/chatHelpers.js';
import { onlineUserIds } from '../realtime/presence.js';

const router = Router();

router.get('/global', (_req, res) => {
  const chat = getOrCreateChat('global', null, 'Global Chat');
  res.json({ chat: { id: chat.id, type: chat.type, name: chat.name } });
});

router.get('/top', (_req, res) => {
  // "biggest chats" = game chats ranked by message volume, used on the homepage
  const rows = all(`
    SELECT c.id, c.name, c.ref_id, COUNT(m.id) as messageCount
    FROM chats c LEFT JOIN chat_messages m ON m.chat_id = c.id
    WHERE c.type = 'game'
    GROUP BY c.id ORDER BY messageCount DESC LIMIT 6
  `);
  res.json({ chats: rows });
});

router.get('/dm/:userId', requireAuth, (req, res) => {
  const other = get('SELECT id, username FROM users WHERE id = ?', [req.params.userId]);
  if (!other) return res.status(404).json({ error: 'משתמש לא נמצא' });
  const key = dmChatKey(req.user.id, other.id);
  const chat = getOrCreateChat('dm', key, `שיחה עם ${other.username}`);
  res.json({ chat: { id: chat.id, type: chat.type, name: chat.name } });
});

router.get('/:id/messages', optionalAuth, (req, res) => {
  const chat = get('SELECT * FROM chats WHERE id = ?', [req.params.id]);
  if (!chat) return res.status(404).json({ error: 'הצ\'אט לא נמצא' });
  const before = req.query.before;
  const rows = all(
    `SELECT * FROM chat_messages WHERE chat_id = ? ${before ? 'AND created_at < ?' : ''}
     ORDER BY created_at DESC LIMIT 50`,
    before ? [chat.id, before] : [chat.id]
  );
  const withAuthors = rows.map((m) => {
    const author = get('SELECT * FROM users WHERE id = ?', [m.user_id]);
    return serializeMessage(m, author);
  });
  res.json({ messages: withAuthors.reverse(), onlineCount: onlineUserIds.size });
});

router.delete('/:chatId/messages/:messageId', requireAuth, requireRole('moderator'), (req, res) => {
  run('UPDATE chat_messages SET deleted = 1, content = \'[הודעה נמחקה]\' WHERE id = ?', [req.params.messageId]);
  res.json({ ok: true });
});

export default router;
