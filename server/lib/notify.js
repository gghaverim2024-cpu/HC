import { nanoid } from 'nanoid';
import { run } from '../db/index.js';

let ioRef = null;
export function setIo(io) {
  ioRef = io;
}

export function pushNotification(userId, type, payload) {
  const id = nanoid();
  const createdAt = new Date().toISOString();
  run('INSERT INTO notifications (id, user_id, type, payload) VALUES (?,?,?,?)', [
    id,
    userId,
    type,
    JSON.stringify(payload),
  ]);
  if (ioRef) {
    ioRef.to(`user:${userId}`).emit('notification:new', { id, type, payload, read: false, createdAt });
  }
}
