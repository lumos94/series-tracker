import type { QueryClient } from '@tanstack/react-query';

import { getSeasonDetails, getTvDetails } from '@/api/tmdb';
import { getWatchedEpisodesForShow, markEpisodesWatched, type EpisodeEntry } from '@/db/queries';

function fetchSeason(queryClient: QueryClient, tvId: number, seasonNumber: number) {
  return queryClient.fetchQuery({
    queryKey: ['season', tvId, seasonNumber],
    queryFn: () => getSeasonDetails(tvId, seasonNumber),
  });
}

function fetchTv(queryClient: QueryClient, tvId: number) {
  return queryClient.fetchQuery({ queryKey: ['tv', tvId], queryFn: () => getTvDetails(tvId) });
}

function watchedChecker(tvId: number) {
  const watched = getWatchedEpisodesForShow(tvId);
  return (seasonNumber: number, episodeNumber: number) =>
    watched.some((w) => w.seasonNumber === seasonNumber && w.episodeNumber === episodeNumber);
}

/** Unwatched episodes strictly before (season, episode) — earlier seasons in full, plus earlier episodes in the target season. */
export async function getUnwatchedEpisodesBefore(
  queryClient: QueryClient,
  tvId: number,
  targetSeasonNumber: number,
  targetEpisodeNumber: number,
): Promise<EpisodeEntry[]> {
  const tv = await fetchTv(queryClient, tvId);
  const isWatched = watchedChecker(tvId);
  const entries: EpisodeEntry[] = [];

  const priorSeasonNumbers = tv.seasons
    .map((s) => s.season_number)
    .filter((n) => n > 0 && n < targetSeasonNumber)
    .sort((a, b) => a - b);

  for (const seasonNumber of priorSeasonNumbers) {
    const season = await fetchSeason(queryClient, tvId, seasonNumber);
    for (const episode of season.episodes) {
      if (!isWatched(seasonNumber, episode.episode_number)) {
        entries.push({ seasonNumber, episodeNumber: episode.episode_number, runtimeMinutes: episode.runtime });
      }
    }
  }

  const targetSeason = await fetchSeason(queryClient, tvId, targetSeasonNumber);
  for (const episode of targetSeason.episodes) {
    if (episode.episode_number < targetEpisodeNumber && !isWatched(targetSeasonNumber, episode.episode_number)) {
      entries.push({ seasonNumber: targetSeasonNumber, episodeNumber: episode.episode_number, runtimeMinutes: episode.runtime });
    }
  }

  return entries;
}

/** Every unwatched episode across the whole series. */
export async function getAllUnwatchedEpisodes(queryClient: QueryClient, tvId: number): Promise<EpisodeEntry[]> {
  const tv = await fetchTv(queryClient, tvId);
  const isWatched = watchedChecker(tvId);
  const entries: EpisodeEntry[] = [];

  const seasonNumbers = tv.seasons.map((s) => s.season_number).filter((n) => n > 0);

  for (const seasonNumber of seasonNumbers) {
    const season = await fetchSeason(queryClient, tvId, seasonNumber);
    for (const episode of season.episodes) {
      if (!isWatched(seasonNumber, episode.episode_number)) {
        entries.push({ seasonNumber, episodeNumber: episode.episode_number, runtimeMinutes: episode.runtime });
      }
    }
  }

  return entries;
}

export async function markEntireShowWatched(queryClient: QueryClient, tvId: number): Promise<void> {
  const entries = await getAllUnwatchedEpisodes(queryClient, tvId);
  if (entries.length === 0) return;
  markEpisodesWatched(tvId, entries);
}
