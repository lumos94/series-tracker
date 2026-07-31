export type WatchStatus = 'watching' | 'completed' | 'planned' | 'dropped';

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
