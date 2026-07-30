import { and, count, desc, eq, max } from 'drizzle-orm';

import { db } from './client';
import { episodesWatched, shows, syncMeta, watchedMovies, watchlist } from './schema';
import type { MediaType } from '@/api/tmdb';

// --- Followed shows ---

export interface FollowedShow {
  id: number;
  name: string;
  posterPath: string | null;
  followedAt: string;
}

export function getFollowedShows(): FollowedShow[] {
  return db.select().from(shows).orderBy(desc(shows.followedAt)).all();
}

export function isShowFollowed(showId: number): boolean {
  return !!db.select().from(shows).where(eq(shows.id, showId)).get();
}

export function followShow(show: { id: number; name: string; posterPath: string | null }) {
  db.insert(shows)
    .values({ id: show.id, name: show.name, posterPath: show.posterPath, followedAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

export function unfollowShow(showId: number) {
  db.delete(episodesWatched).where(eq(episodesWatched.showId, showId)).run();
  db.delete(shows).where(eq(shows.id, showId)).run();
}

// --- Episode watch state ---

export function getWatchedEpisodeNumbers(showId: number, seasonNumber: number): number[] {
  return db
    .select({ episodeNumber: episodesWatched.episodeNumber })
    .from(episodesWatched)
    .where(and(eq(episodesWatched.showId, showId), eq(episodesWatched.seasonNumber, seasonNumber)))
    .all()
    .map((row) => row.episodeNumber);
}

export function markEpisodeWatched(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  runtimeMinutes: number | null = null,
) {
  db.insert(episodesWatched)
    .values({ showId, seasonNumber, episodeNumber, runtimeMinutes, watchedAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

export function markEpisodeUnwatched(showId: number, seasonNumber: number, episodeNumber: number) {
  db.delete(episodesWatched)
    .where(
      and(
        eq(episodesWatched.showId, showId),
        eq(episodesWatched.seasonNumber, seasonNumber),
        eq(episodesWatched.episodeNumber, episodeNumber),
      ),
    )
    .run();
}

export interface EpisodeEntry {
  seasonNumber: number;
  episodeNumber: number;
  runtimeMinutes: number | null;
}

/** Bulk-marks any number of episodes (single season, multiple seasons, or an entire series) watched in one transaction. */
export function markEpisodesWatched(showId: number, entries: EpisodeEntry[]) {
  const watchedAt = new Date().toISOString();
  db.transaction((tx) => {
    for (const { seasonNumber, episodeNumber, runtimeMinutes } of entries) {
      tx.insert(episodesWatched)
        .values({ showId, seasonNumber, episodeNumber, runtimeMinutes, watchedAt })
        .onConflictDoNothing()
        .run();
    }
  });
}

export function getWatchedEpisodesForShow(showId: number): { seasonNumber: number; episodeNumber: number }[] {
  return db
    .select({ seasonNumber: episodesWatched.seasonNumber, episodeNumber: episodesWatched.episodeNumber })
    .from(episodesWatched)
    .where(eq(episodesWatched.showId, showId))
    .all();
}

export interface WatchCursor {
  seasonNumber: number;
  episodeNumber: number;
}

/** Furthest-along episode watched for a show, used to compute "up next". */
export function getLastWatched(showId: number): WatchCursor | null {
  const row = db
    .select()
    .from(episodesWatched)
    .where(eq(episodesWatched.showId, showId))
    .orderBy(desc(episodesWatched.seasonNumber), desc(episodesWatched.episodeNumber))
    .limit(1)
    .get();

  return row ? { seasonNumber: row.seasonNumber, episodeNumber: row.episodeNumber } : null;
}


// --- Watchlist (shows or movies not yet started) ---

export interface WatchlistItem {
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  addedAt: string;
}

export function getWatchlist(): WatchlistItem[] {
  return db.select().from(watchlist).orderBy(desc(watchlist.addedAt)).all() as WatchlistItem[];
}

export function isInWatchlist(tmdbId: number, mediaType: MediaType): boolean {
  return !!db
    .select()
    .from(watchlist)
    .where(and(eq(watchlist.tmdbId, tmdbId), eq(watchlist.mediaType, mediaType)))
    .get();
}

export function addToWatchlist(item: { tmdbId: number; mediaType: MediaType; title: string; posterPath: string | null }) {
  db.insert(watchlist)
    .values({ ...item, addedAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

export function removeFromWatchlist(tmdbId: number, mediaType: MediaType) {
  db.delete(watchlist).where(and(eq(watchlist.tmdbId, tmdbId), eq(watchlist.mediaType, mediaType))).run();
}

// --- Watched movies ---

export function isMovieWatched(movieId: number): boolean {
  return !!db.select().from(watchedMovies).where(eq(watchedMovies.id, movieId)).get();
}

export function markMovieWatched(movie: {
  id: number;
  title: string;
  posterPath: string | null;
  runtimeMinutes?: number | null;
}) {
  db.insert(watchedMovies)
    .values({
      id: movie.id,
      title: movie.title,
      posterPath: movie.posterPath,
      runtimeMinutes: movie.runtimeMinutes ?? null,
      watchedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .run();
}

export function markMovieUnwatched(movieId: number) {
  db.delete(watchedMovies).where(eq(watchedMovies.id, movieId)).run();
}

export interface WatchedMovie {
  id: number;
  title: string;
  posterPath: string | null;
  runtimeMinutes: number | null;
  watchedAt: string;
}

export function getWatchedMovies(): WatchedMovie[] {
  return db.select().from(watchedMovies).orderBy(desc(watchedMovies.watchedAt)).all();
}

export interface WatchedShowSummary {
  showId: number;
  episodeCount: number;
  lastWatchedAt: string;
}

/** Series with any watched episodes, grouped by show. Not sourced from `shows` — a show can have watched episodes without being followed. */
export function getWatchedShowSummaries(): WatchedShowSummary[] {
  return db
    .select({
      showId: episodesWatched.showId,
      episodeCount: count(episodesWatched.id),
      lastWatchedAt: max(episodesWatched.watchedAt),
    })
    .from(episodesWatched)
    .groupBy(episodesWatched.showId)
    .orderBy(desc(max(episodesWatched.watchedAt)))
    .all() as WatchedShowSummary[];
}

// --- Stats ---

const DEFAULT_EPISODE_MINUTES = 42;
const DEFAULT_MOVIE_MINUTES = 110;

export interface WatchStats {
  episodesWatched: number;
  moviesWatched: number;
  showsFollowed: number;
  estimatedHours: number;
}

export function getWatchStats(): WatchStats {
  const episodeRows = db.select({ runtimeMinutes: episodesWatched.runtimeMinutes }).from(episodesWatched).all();
  const movieRows = db.select({ runtimeMinutes: watchedMovies.runtimeMinutes }).from(watchedMovies).all();
  const showsFollowed = db.select().from(shows).all().length;

  const episodeMinutes = episodeRows.reduce((sum, row) => sum + (row.runtimeMinutes ?? DEFAULT_EPISODE_MINUTES), 0);
  const movieMinutes = movieRows.reduce((sum, row) => sum + (row.runtimeMinutes ?? DEFAULT_MOVIE_MINUTES), 0);

  return {
    episodesWatched: episodeRows.length,
    moviesWatched: movieRows.length,
    showsFollowed,
    estimatedHours: Math.round(((episodeMinutes + movieMinutes) / 60) * 10) / 10,
  };
}

// --- Sync metadata ---

const LAST_SYNCED_AT_KEY = 'lastSyncedAt';

export function getLastSyncedAt(): string | null {
  return db.select().from(syncMeta).where(eq(syncMeta.key, LAST_SYNCED_AT_KEY)).get()?.value ?? null;
}

export function setLastSyncedAt(isoDate: string) {
  db.insert(syncMeta)
    .values({ key: LAST_SYNCED_AT_KEY, value: isoDate })
    .onConflictDoUpdate({ target: syncMeta.key, set: { value: isoDate } })
    .run();
}

// --- Backup / restore ---

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  shows: FollowedShow[];
  episodesWatched: {
    showId: number;
    seasonNumber: number;
    episodeNumber: number;
    runtimeMinutes: number | null;
    watchedAt: string;
  }[];
  watchlist: WatchlistItem[];
  watchedMovies: {
    id: number;
    title: string;
    posterPath: string | null;
    runtimeMinutes: number | null;
    watchedAt: string;
  }[];
}

export function exportAllData(): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    shows: db.select().from(shows).all(),
    episodesWatched: db.select().from(episodesWatched).all(),
    watchlist: db.select().from(watchlist).all() as WatchlistItem[],
    watchedMovies: db.select().from(watchedMovies).all(),
  };
}

export function importAllData(payload: BackupPayload) {
  db.transaction((tx) => {
    tx.delete(episodesWatched).run();
    tx.delete(watchlist).run();
    tx.delete(watchedMovies).run();
    tx.delete(shows).run();

    for (const show of payload.shows) {
      tx.insert(shows).values(show).run();
    }
    for (const episode of payload.episodesWatched) {
      tx.insert(episodesWatched).values(episode).run();
    }
    for (const item of payload.watchlist) {
      tx.insert(watchlist).values(item).run();
    }
    for (const movie of payload.watchedMovies) {
      tx.insert(watchedMovies).values(movie).run();
    }
  });
}
