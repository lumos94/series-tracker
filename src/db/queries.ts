import { and, desc, eq } from 'drizzle-orm';

import { db } from './client';
import { episodesWatched, shows, watchedMovies, watchlist } from './schema';
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

export function markEpisodeWatched(showId: number, seasonNumber: number, episodeNumber: number) {
  db.insert(episodesWatched)
    .values({ showId, seasonNumber, episodeNumber, watchedAt: new Date().toISOString() })
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

export function markSeasonWatched(showId: number, seasonNumber: number, episodeNumbers: number[]) {
  const watchedAt = new Date().toISOString();
  for (const episodeNumber of episodeNumbers) {
    db.insert(episodesWatched).values({ showId, seasonNumber, episodeNumber, watchedAt }).onConflictDoNothing().run();
  }
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

export function getWatchedEpisodeCount(): number {
  return db.select().from(episodesWatched).all().length;
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

export function markMovieWatched(movie: { id: number; title: string; posterPath: string | null }) {
  db.insert(watchedMovies)
    .values({ id: movie.id, title: movie.title, posterPath: movie.posterPath, watchedAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

export function markMovieUnwatched(movieId: number) {
  db.delete(watchedMovies).where(eq(watchedMovies.id, movieId)).run();
}

export function getWatchedMovieCount(): number {
  return db.select().from(watchedMovies).all().length;
}
