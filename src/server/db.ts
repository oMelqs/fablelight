import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const DATA_DIR = resolve(process.cwd(), 'data')
const dbPath = process.env.RPGTABLE_DB ?? resolve(DATA_DIR, 'rpgtable.db')
/** Uploaded files live next to the DB, so a temp DB (tests) gets temp files. */
export const FILES_DIR = process.env.RPGTABLE_DB ? resolve(dirname(dbPath), 'files') : resolve(DATA_DIR, 'files')
mkdirSync(FILES_DIR, { recursive: true })
mkdirSync(dirname(dbPath), { recursive: true })

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS systems (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY, system_id INTEGER NOT NULL REFERENCES systems(id), name TEXT NOT NULL,
  description TEXT, config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY, system_id INTEGER REFERENCES systems(id), campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'md' CHECK (kind IN ('md','pdf')), file_path TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS book_chunks (
  id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL DEFAULT 0, heading TEXT, page INTEGER, text TEXT NOT NULL DEFAULT '');
CREATE VIRTUAL TABLE IF NOT EXISTS book_fts USING fts5(
  heading, text, content='book_chunks', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER IF NOT EXISTS book_chunks_ai AFTER INSERT ON book_chunks BEGIN
  INSERT INTO book_fts(rowid, heading, text) VALUES (new.id, new.heading, new.text); END;
CREATE TRIGGER IF NOT EXISTS book_chunks_ad AFTER DELETE ON book_chunks BEGIN
  INSERT INTO book_fts(book_fts, rowid, heading, text) VALUES ('delete', old.id, old.heading, old.text); END;
CREATE TRIGGER IF NOT EXISTS book_chunks_au AFTER UPDATE ON book_chunks BEGIN
  INSERT INTO book_fts(book_fts, rowid, heading, text) VALUES ('delete', old.id, old.heading, old.text);
  INSERT INTO book_fts(rowid, heading, text) VALUES (new.id, new.heading, new.text); END;
CREATE TABLE IF NOT EXISTS creatures (
  id INTEGER PRIMARY KEY, system_id INTEGER REFERENCES systems(id), campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL, tier TEXT, tags TEXT, stats TEXT NOT NULL DEFAULT '{}', traits TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS audio (
  id INTEGER PRIMARY KEY, campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE, name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'track' CHECK (kind IN ('track','ambient','sfx')),
  source TEXT NOT NULL DEFAULT 'file' CHECK (source IN ('file','youtube')),
  url TEXT, file_path TEXT, tags TEXT, volume REAL NOT NULL DEFAULT 1, loop INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'pc' CHECK (kind IN ('pc','npc')), name TEXT NOT NULL, player TEXT,
  data TEXT NOT NULL DEFAULT '{}', notes TEXT, portrait TEXT);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  number INTEGER, title TEXT, date TEXT, summary TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','played')));
CREATE TABLE IF NOT EXISTS encounters (
  id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL, notes TEXT, round INTEGER NOT NULL DEFAULT 1, active_id INTEGER);
CREATE TABLE IF NOT EXISTS scenes (
  id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL, ord INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL, read_aloud TEXT, gm_notes TEXT, points TEXT NOT NULL DEFAULT '[]', image TEXT,
  audio_preset TEXT NOT NULL DEFAULT '{}', encounter_id INTEGER REFERENCES encounters(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS combatants (
  id INTEGER PRIMARY KEY, encounter_id INTEGER NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL DEFAULT 0, creature_id INTEGER REFERENCES creatures(id) ON DELETE SET NULL,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL, name TEXT NOT NULL,
  hp_cur INTEGER NOT NULL DEFAULT 0, hp_max INTEGER NOT NULL DEFAULT 0, armor INTEGER NOT NULL DEFAULT 0,
  conditions TEXT NOT NULL DEFAULT '[]', acted INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0, notes TEXT);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT, body TEXT NOT NULL DEFAULT '', tags TEXT, pinned INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS rolls (
  id INTEGER PRIMARY KEY, campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE, who TEXT, label TEXT,
  input TEXT NOT NULL DEFAULT '{}', result TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS log_entries (
  id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'system' CHECK (kind IN ('combat','roll','scene','note','system')),
  text TEXT NOT NULL DEFAULT '', data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS log_entries_campaign ON log_entries(campaign_id, id);
`)

/** Tables exposed by the generic CRUD, with their JSON (parsed/stringified) columns. */
export const TABLES: Record<string, { json: string[] }> = {
  systems: { json: ['config'] },
  campaigns: { json: ['config'] },
  books: { json: [] },
  creatures: { json: ['stats'] },
  audio: { json: [] },
  characters: { json: ['data'] },
  sessions: { json: [] },
  scenes: { json: ['points', 'audio_preset'] },
  encounters: { json: [] },
  combatants: { json: ['conditions'] },
  notes: { json: [] },
  rolls: { json: ['input', 'result'] },
  log_entries: { json: ['data'] },
}
