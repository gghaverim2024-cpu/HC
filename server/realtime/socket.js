import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { JWT_SECRET } from '../middleware/auth.js';
import { get, run } from '../db/index.js';
import { containsBlockedContent, censor } from '../lib/contentFilter.js';
import { serializeMessage, publicUser } from '../lib/serialize.js';
import { XP_REWARDS } from '../lib/xp.js';
import { onlineUserIds, bumpReal, snapshot } from './presence.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';

const msgTimestamps = new Map(); // socketId -> timestamps[]

// voiceRooms[roomKey] = Map<socketId, { userId, username, avatarUrl, muted }>
// Purely in-memory/ephemeral — voice rooms are live-only, nothing is persisted.
const voiceRooms = new Map();

function voiceParticipants(roomKey) {
  const room = voiceRooms.get(roomKey);
  if (!room) return [];
  return [...room.entries()].map(([socketId, p]) => ({ socketId, ...p }));
}

function canSendMessage(socketId) {
  const now = Date.now();
  const arr = (msgTimestamps.get(socketId) || []).filter((t) => now - t < 4000);
  if (arr.length >= 5) return false;
  arr.push(now);
  msgTimestamps.set(socketId, arr);
  return true;
}

export function attachSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        socket.data.user = { id: payload.sub, username: payload.username, role: payload.role };
      } catch {
        // ignore invalid token, connect as guest (read-only)
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.data.scopes = new Set();

    if (user) {
      onlineUserIds.add(user.id);
      run('UPDATE users SET is_online = 1, last_seen = datetime(\'now\') WHERE id = ?', [user.id]);
      socket.join(`user:${user.id}`);
    }
    io.emit('presence:snapshot', snapshot());

    socket.on('chat:join', ({ chatId }) => {
      if (!chatId) return;
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', ({ chatId }) => {
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
    });

    socket.on('presence:join', ({ scope, id }) => {
      if (!scope || !id) return;
      const key = `${scope}:${id}`;
      if (!socket.data.scopes.has(key)) {
        socket.data.scopes.add(key);
        bumpReal(key, 1);
        io.emit('presence:snapshot', snapshot());
      }
    });

    socket.on('presence:leave', ({ scope, id }) => {
      const key = `${scope}:${id}`;
      if (socket.data.scopes.has(key)) {
        socket.data.scopes.delete(key);
        bumpReal(key, -1);
        io.emit('presence:snapshot', snapshot());
      }
    });

    socket.on('typing', ({ chatId }) => {
      if (!user || !chatId) return;
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId: user.id, username: user.username });
    });

    socket.on('chat:message', (data) => {
      if (!user) return socket.emit('error:message', { error: 'יש להתחבר כדי לשלוח הודעות' });
      const { chatId, content, imageUrl, replyToId } = data || {};
      if (!chatId || (!content?.trim() && !imageUrl)) return;
      if (!canSendMessage(socket.id)) {
        return socket.emit('error:message', { error: 'לאט מדי, אתה שולח הודעות מהר מדי' });
      }
      const dbUser = get('SELECT * FROM users WHERE id = ?', [user.id]);
      if (!dbUser || dbUser.status === 'banned') {
        return socket.emit('error:message', { error: 'החשבון שלך חסום' });
      }
      if (dbUser.status === 'muted') {
        return socket.emit('error:message', { error: 'אתה מושתק ואינך יכול לשלוח הודעות' });
      }
      let finalContent = (content || '').slice(0, 2000);
      if (containsBlockedContent(finalContent)) finalContent = censor(finalContent);

      const id = nanoid();
      run(
        `INSERT INTO chat_messages (id, chat_id, user_id, content, image_url, reply_to_id) VALUES (?,?,?,?,?,?)`,
        [id, chatId, user.id, finalContent, imageUrl || null, replyToId || null]
      );
      run('UPDATE users SET xp = xp + ? WHERE id = ?', [XP_REWARDS.SEND_MESSAGE, user.id]);

      const saved = get('SELECT * FROM chat_messages WHERE id = ?', [id]);
      const author = get('SELECT * FROM users WHERE id = ?', [user.id]);
      io.to(`chat:${chatId}`).emit('chat:message', serializeMessage(saved, author));

      const unlocked = checkAndAwardAchievements(user.id);
      for (const ach of unlocked) {
        io.to(`user:${user.id}`).emit('achievement:unlocked', ach);
      }
    });

    socket.on('voice:join', ({ roomKey }) => {
      if (!user || !roomKey) return socket.emit('error:message', { error: 'יש להתחבר כדי להצטרף לחדר קול' });
      if (socket.data.voiceRoom) return; // already in a voice room
      socket.join(`voice:${roomKey}`);
      socket.data.voiceRoom = roomKey;
      if (!voiceRooms.has(roomKey)) voiceRooms.set(roomKey, new Map());
      voiceRooms.get(roomKey).set(socket.id, {
        userId: user.id,
        username: user.username,
        avatarUrl: get('SELECT avatar_url FROM users WHERE id = ?', [user.id])?.avatar_url || null,
        muted: false,
      });
      io.to(`voice:${roomKey}`).emit('voice:participants', { roomKey, participants: voiceParticipants(roomKey) });
    });

    socket.on('voice:leave', ({ roomKey }) => {
      if (!roomKey || socket.data.voiceRoom !== roomKey) return;
      socket.leave(`voice:${roomKey}`);
      voiceRooms.get(roomKey)?.delete(socket.id);
      socket.data.voiceRoom = null;
      io.to(`voice:${roomKey}`).emit('voice:participants', { roomKey, participants: voiceParticipants(roomKey) });
    });

    socket.on('voice:mute', ({ roomKey, muted }) => {
      const room = voiceRooms.get(roomKey);
      const entry = room?.get(socket.id);
      if (!entry) return;
      entry.muted = !!muted;
      io.to(`voice:${roomKey}`).emit('voice:participants', { roomKey, participants: voiceParticipants(roomKey) });
    });

    // WebRTC signaling relay (mesh topology) — server never touches media,
    // it only forwards offers/answers/ICE candidates between two peers.
    socket.on('voice:signal', ({ roomKey, toSocketId, data }) => {
      if (!toSocketId || !data) return;
      io.to(toSocketId).emit('voice:signal', { roomKey, fromSocketId: socket.id, data });
    });

    socket.on('disconnect', () => {
      for (const key of socket.data.scopes) bumpReal(key, -1);
      if (socket.data.voiceRoom) {
        const roomKey = socket.data.voiceRoom;
        voiceRooms.get(roomKey)?.delete(socket.id);
        io.to(`voice:${roomKey}`).emit('voice:participants', { roomKey, participants: voiceParticipants(roomKey) });
      }
      if (user) {
        const stillConnected = [...io.sockets.sockets.values()].some(
          (s) => s.data.user?.id === user.id
        );
        if (!stillConnected) {
          onlineUserIds.delete(user.id);
          run('UPDATE users SET is_online = 0, last_seen = datetime(\'now\') WHERE id = ?', [user.id]);
        }
      }
      io.emit('presence:snapshot', snapshot());
    });
  });
}
