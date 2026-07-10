import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const shows = sqliteTable('shows', {
  id: integer('id').primaryKey(), // TMDB tv id
  name: text('name').notNull(),
  posterPath: text('poster_path'),
  followedAt: text('followed_at').notNull(),
});

export const episodesWatched = sqliteTable(
  'episodes_watched',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    showId: integer('show_id').notNull(),
    seasonNumber: integer('season_number').notNull(),
    episodeNumber: integer('episode_number').notNull(),
    watchedAt: text('watched_at').notNull(),
  },
  (table) => [uniqueIndex('episodes_watched_unique').on(table.showId, table.seasonNumber, table.episodeNumber)],
);

export const watchlist = sqliteTable(
  'watchlist',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tmdbId: integer('tmdb_id').notNull(),
    mediaType: text('media_type').notNull(), // 'tv' | 'movie'
    title: text('title').notNull(),
    posterPath: text('poster_path'),
    addedAt: text('added_at').notNull(),
  },
  (table) => [uniqueIndex('watchlist_unique').on(table.tmdbId, table.mediaType)],
);

export const watchedMovies = sqliteTable('watched_movies', {
  id: integer('id').primaryKey(), // TMDB movie id
  title: text('title').notNull(),
  posterPath: text('poster_path'),
  watchedAt: text('watched_at').notNull(),
});

export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
