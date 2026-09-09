import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// DATABASE_URL points at either a hosted libSQL/Turso database
// ("libsql://<db>-<org>.turso.io") or a plain local file ("file:..."), which
// behaves exactly like the SQLite file this project used before. When it is
// unset we default to the same on-disk location as always
// (server/data/hc-israel.db) so local dev needs no external account and no
// configuration at all. The path is resolved absolutely on purpose: a relative
// "file:./data/..." URL would follow process.cwd(), so the DB would land in a
// different place depending on whether the server was started from the repo
// root or from server/.
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

let url;
if (DATABASE_URL) {
  url = DATABASE_URL;
} else {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  url = `file:${path.join(dataDir, 'hc-israel.db').replace(/\\/g, '/')}`;
}

const isRemote = /^libsql:|^wss?:|^https?:/.test(url);

// The auth token is only meaningful for a remote libSQL endpoint; passing it
// for a local file is unnecessary (and undefined is fine either way).
export const db = createClient(
  isRemote && DATABASE_AUTH_TOKEN ? { url, authToken: DATABASE_AUTH_TOKEN } : { url }
);

export const databaseMode = isRemote ? 'libsql-remote' : 'local-file';
console.log(
  isRemote
    ? '🗄️  מחובר לבסיס נתונים מרוחק (libSQL/Turso) — הנתונים נשמרים בין restarts.'
    : `🗄️  משתמש בבסיס נתונים מקומי (${url.replace(/^file:/, '')}).`
);

// @libsql/client has no synchronous mode, so the whole query layer below is
// promise-based and every call site awaits it.
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
await db.executeMultiple(schema);

// Rows come back as a libSQL Row object. Spreading normalises them into plain
// objects keyed by column name, so existing code (row.username, row.user_id,
// object spread, JSON.stringify) keeps working unchanged.
function toPlain(row) {
  return row === undefined ? undefined : { ...row };
}

export async function all(sql, params = []) {
  const rs = await db.execute({ sql, args: params });
  return rs.rows.map(toPlain);
}

export async function get(sql, params = []) {
  const rs = await db.execute({ sql, args: params });
  return toPlain(rs.rows[0]);
}

export async function run(sql, params = []) {
  const rs = await db.execute({ sql, args: params });
  // `changes` mirrors the old node:sqlite run() result shape.
  return { changes: rs.rowsAffected, rowsAffected: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid };
}
