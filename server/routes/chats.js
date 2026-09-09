import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { serializeMessage } from '../lib/serialize.js';
import { getOrCreateChat, dmChatKey } from '../lib/chatHelpers.js';
import { onlineUserIds } from '../realtime/presence.js';

const router = Router();

router.get(
  '/global',
  asyncHandler(async (_req, res) => {
    const chat = await getOrCreateChat('global', null, 'Global Chat');
    res.json({ chat: { id: chat.id, type: chat.type, name: chat.name } });
  })
);

router.get(
  '/top',
  asyncHandler(async (_req, res) => {
    // "biggest chats" = game chats ranked by message volume, used on the homepage
    const rows = await all(`
    SELECT c.id, c.name, c.ref_id, COUNT(m.id) as messageCount
    FROM chats c LEFT JOIN chat_messages m ON m.chat_id = c.id
    WHERE c.type = 'game'
    GROUP BY c.id ORDER BY messageCount DESC LIMIT 6
  `);
    res.json({ chats: rows });
  })
);

router.get(
  '/dm/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const other = await get('SELECT id, username FROM users WHERE id = ?', [req.params.userId]);
    if (!other) return res.status(404).json({ error: 'משתמש לא נמצא' });
    const key = dmChatKey(req.user.id, other.id);
    const chat = await getOrCreateChat('dm', key, `שיחה עם ${other.username}`);
    res.json({ chat: { id: chat.id, type: chat.type, name: chat.name } });
  })
);

router.get(
  '/:id/messages',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const chat = await get('SELECT * FROM chats WHERE id = ?', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'הצ\'אט לא נמצא' });
    const before = req.query.before;
    const rows = await all(
      `SELECT * FROM chat_messages WHERE chat_id = ? ${before ? 'AND created_at < ?' : ''}
     ORDER BY created_at DESC LIMIT 50`,
      before ? [chat.id, before] : [chat.id]
    );
    const withAuthors = await Promise.all(
      rows.map(async (m) => {
        const author = await get('SELECT * FROM users WHERE id = ?', [m.user_id]);
        return serializeMessage(m, author);
      })
    );
    res.json({ messages: withAuthors.reverse(), onlineCount: onlineUserIds.size });
  })
);

router.delete(
  '/:chatId/messages/:messageId',
  requireAuth,
  requireRole('moderator'),
  asyncHandler(async (req, res) => {
    await run('UPDATE chat_messages SET deleted = 1, content = \'[הודעה נמחקה]\' WHERE id = ?', [req.params.messageId]);
    res.json({ ok: true });
  })
);

export default router;
