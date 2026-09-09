import { nanoid } from 'nanoid';
import { get, run } from '../db/index.js';

export function getOrCreateChat(type, refId, name) {
  const existing = refId
    ? get('SELECT * FROM chats WHERE type = ? AND ref_id = ?', [type, refId])
    : get(`SELECT * FROM chats WHERE type = 'global'`);
  if (existing) return existing;
  const id = nanoid();
  run('INSERT INTO chats (id, type, ref_id, name) VALUES (?,?,?,?)', [id, type, refId || null, name]);
  return get('SELECT * FROM chats WHERE id = ?', [id]);
}

export function dmChatKey(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join(':');
}
