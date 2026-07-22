import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

const sqlite = openDatabaseSync('tvapp.db');

sqlite.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS shows (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    poster_path TEXT,
    followed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS episodes_watched (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    show_id INTEGER NOT NULL,
    season_number INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    runtime_minutes INTEGER,
    watched_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS episodes_watched_unique ON episodes_watched (show_id, season_number, episode_number);

  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    added_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS watchlist_unique ON watchlist (tmdb_id, media_type);

  CREATE TABLE IF NOT EXISTS watched_movies (
    id INTEGER PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    runtime_minutes INTEGER,
    watched_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
