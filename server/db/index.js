import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'hc-israel.db');
export const db = new DatabaseSync(dbPath);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// small query helpers around node:sqlite's DatabaseSync API
export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}
export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
export function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}
