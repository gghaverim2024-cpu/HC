import { all } from '../db/index.js';

// realCounts[key] = number of REAL connected sockets currently viewing that
// scope, key = "game:<id>" or "server:<id>". No fabricated/base numbers here —
// this only reflects actual people connected right now.
export const realCounts = new Map();
// all known scope keys, so the snapshot always reports 0 (not "missing") for
// games/servers nobody is currently viewing
export const knownKeys = new Set();
// globally connected user ids (socket-authenticated) — real, not simulated
export const onlineUserIds = new Set();

export function initLiveCounts() {
  const games = all('SELECT id FROM games');
  for (const g of games) knownKeys.add(`game:${g.id}`);
  const servers = all('SELECT id FROM servers');
  for (const s of servers) knownKeys.add(`server:${s.id}`);
}

export function registerKey(key) {
  knownKeys.add(key);
}

export function bumpReal(key, delta) {
  realCounts.set(key, Math.max(0, (realCounts.get(key) || 0) + delta));
}

export function getCount(key) {
  return realCounts.get(key) || 0;
}

export function snapshot() {
  const out = {};
  for (const key of knownKeys) out[key] = getCount(key);
  out['global:online'] = onlineUserIds.size;
  return out;
}
