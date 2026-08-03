import { useQueries, useQuery } from '@tanstack/react-query';

import { getWatchedEpisodesForShow } from '@/db/queries';

export type WatchStatus = 'watching' | 'completed' | 'planned' | 'dropped';

/**
 * `getWatchedEpisodesForShow` is a synchronous SQLite read, not a React state or prop —
 * calling it directly in a render body is invisible to React's dependency tracking, so a
 * re-render triggered by something else can silently reuse a stale result. Routing it
 * through useQuery (keyed under 'watched-episodes' like the rest of the app) makes it a
 * proper reactive value that `invalidateQueries({ queryKey: ['watched-episodes', showId] })`
 * actually refreshes.
 */
export function useWatchedEpisodes(showId: number): { seasonNumber: number; episodeNumber: number }[] {
  const { data = [] } = useQuery({
    queryKey: ['watched-episodes', showId, 'all'],
    queryFn: () => getWatchedEpisodesForShow(showId),
  });
  return data;
}

export function useWatchedEpisodeCounts(showIds: number[]): number[] {
  const results = useQueries({
    queries: showIds.map((showId) => ({
      queryKey: ['watched-episodes', showId, 'all'],
      queryFn: () => getWatchedEpisodesForShow(showId),
    })),
  });
  return results.map((r) => r.data?.length ?? 0);
}

/**
 * Our data model doesn't track an explicit per-title status (no "dropped" concept) —
 * status is derived from follow/watch state. A show is "completed" once every known
 * episode is watched, "watching" while followed with partial or no progress, and
 * "planned" when it's only on the watchlist.
 */
export function deriveShowStatus(params: {
  followed: boolean;
  watchlisted: boolean;
  watchedCount: number;
  totalEpisodes: number;
}): WatchStatus | undefined {
  if (params.followed) {
    return params.totalEpisodes > 0 && params.watchedCount >= params.totalEpisodes ? 'completed' : 'watching';
  }
  if (params.watchlisted) return 'planned';
  return undefined;
}

export function deriveMovieStatus(params: { watched: boolean; watchlisted: boolean }): WatchStatus | undefined {
  if (params.watched) return 'completed';
  if (params.watchlisted) return 'planned';
  return undefined;
}

export function computeEpisodeProgress(seasons: { season_number: number; episode_count: number }[], watchedCount: number): number {
  const total = seasons.filter((s) => s.season_number > 0).reduce((sum, s) => sum + s.episode_count, 0);
  return total > 0 ? Math.min(100, Math.round((watchedCount / total) * 100)) : 0;
}
