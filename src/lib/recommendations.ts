import { useQueries, useQuery } from '@tanstack/react-query';

import {
  discoverByGenres,
  getMovieDetails,
  getSimilar,
  getTvDetails,
  type DiscoverItem,
  type MediaType,
} from '@/api/tmdb';
import { getFollowedShows, getWatchedMovies } from '@/db/queries';
import { computeEpisodeProgress, useWatchedEpisodeCounts, type WatchStatus } from '@/lib/watch-status';

export interface UserHistoryInput {
  id: number;
  type: MediaType;
  title: string;
  status: WatchStatus;
  genreIds: number[];
  progress: number;
}

export interface ScoredDiscoverItem extends DiscoverItem {
  score: number;
}

export interface RecommendationSection {
  id: string;
  title: string;
  items: ScoredDiscoverItem[];
}

export function buildGenreAffinity(history: UserHistoryInput[]): Map<number, number> {
  const affinity = new Map<number, number>();
  for (const item of history) {
    const statusWeight = item.status === 'completed' ? 3 : item.status === 'watching' ? 2 : 1;
    const progressBoost = 1 + item.progress / 100;
    for (const genreId of item.genreIds) {
      affinity.set(genreId, (affinity.get(genreId) ?? 0) + statusWeight * progressBoost);
    }
  }
  return affinity;
}

export function scoreCandidate(item: DiscoverItem, affinity: Map<number, number>, sourceProvenance = 0): ScoredDiscoverItem {
  const matchedGenres = item.genreIds.filter((g) => affinity.has(g));
  const affinitySum = matchedGenres.reduce((sum, g) => sum + (affinity.get(g) ?? 0), 0);
  const maxAffinity = Math.max(1, ...Array.from(affinity.values()));
  const genreScore = Math.min(1, affinitySum / maxAffinity);

  const popularity = item.popularity ?? 0;
  const popularityScore = Math.min(1, Math.log10(Math.max(1, popularity)) / 3);
  const ratingScore = item.voteAverage / 10;

  const date = item.date ? new Date(item.date).getTime() : 0;
  const yearsAgo = (Date.now() - date) / (1000 * 60 * 60 * 24 * 365);
  const recencyScore = Math.max(0, Math.min(1, 1 - yearsAgo / 10));

  const provenanceScore = Math.min(1, sourceProvenance);
  const score = genreScore * 40 + provenanceScore * 25 + popularityScore * 15 + ratingScore * 10 + recencyScore * 10;

  return { ...item, score: Math.round(score) };
}

export function deduplicate(items: ScoredDiscoverItem[]): ScoredDiscoverItem[] {
  const seen = new Map<number, ScoredDiscoverItem>();
  for (const item of items) {
    const existing = seen.get(item.id);
    if (!existing || item.score > existing.score) seen.set(item.id, item);
  }
  return Array.from(seen.values());
}

export function sortByScore(items: ScoredDiscoverItem[]): ScoredDiscoverItem[] {
  return [...items].sort((a, b) => b.score - a.score);
}

/** Builds recommendation sections from watch history — "because you watched X", genre trends, hidden gems, fresh releases. */
export async function getRecommendationSections(history: UserHistoryInput[], limit = 10): Promise<RecommendationSection[]> {
  const affinity = buildGenreAffinity(history);
  const trackedIds = new Set(history.map((h) => h.id));
  const topGenres = Array.from(affinity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const sourceTitles = history.filter((h) => h.status === 'completed' || h.status === 'watching').slice(0, 3);

  const similarSections = await Promise.all(
    sourceTitles.map(async (source) => {
      const results = await getSimilar(source.id, source.type);
      const items = results
        .filter((r) => !trackedIds.has(r.id))
        .map((item) => scoreCandidate(item, affinity, 1.0));
      return {
        id: `because-you-watched-${source.id}`,
        title: `Because you watched ${source.title}`,
        items: sortByScore(deduplicate(items)).slice(0, limit),
      };
    }),
  );

  const discoverSections: RecommendationSection[] = [];
  if (topGenres.length > 0) {
    const [trending, hiddenGems, freshReleases] = await Promise.all([
      discoverByGenres(topGenres, { sort_by: 'popularity.desc' }),
      discoverByGenres(topGenres, { sort_by: 'vote_average.desc', 'vote_count.gte': '200' }),
      discoverByGenres(topGenres, { sort_by: 'popularity.desc', 'first_air_date.gte': `${new Date().getFullYear() - 2}-01-01` }),
    ]);

    discoverSections.push({
      id: 'trending-in-your-genres',
      title: 'Trending in your top genres',
      items: sortByScore(
        deduplicate(trending.filter((i) => !trackedIds.has(i.id)).map((i) => scoreCandidate(i, affinity, 0.3))),
      ).slice(0, limit),
    });

    discoverSections.push({
      id: 'hidden-gems',
      title: 'Hidden gems for you',
      items: sortByScore(
        deduplicate(
          hiddenGems
            .filter((i) => !trackedIds.has(i.id) && (i.popularity ?? 0) < 50)
            .map((i) => scoreCandidate(i, affinity, 0.2)),
        ),
      ).slice(0, limit),
    });

    discoverSections.push({
      id: 'fresh-releases',
      title: 'Fresh releases for you',
      items: sortByScore(
        deduplicate(freshReleases.filter((i) => !trackedIds.has(i.id)).map((i) => scoreCandidate(i, affinity, 0.25))),
      ).slice(0, limit),
    });
  }

  return [...similarSections, ...discoverSections].filter((s) => s.items.length > 0);
}

/** Builds recommendation history from followed shows + watched movies (watchlist-only items are excluded, same as the reference design). */
export function useTrackedHistory() {
  const followed = getFollowedShows();
  const watchedMovies = getWatchedMovies();

  const showQueries = useQueries({
    queries: followed.map((show) => ({
      queryKey: ['tv', show.id],
      queryFn: () => getTvDetails(show.id),
    })),
  });

  const movieQueries = useQueries({
    queries: watchedMovies.map((movie) => ({
      queryKey: ['movie', movie.id],
      queryFn: () => getMovieDetails(movie.id),
    })),
  });

  const watchedCounts = useWatchedEpisodeCounts(followed.map((s) => s.id));
  const isLoading = showQueries.some((q) => q.isLoading) || movieQueries.some((q) => q.isLoading);

  const history: UserHistoryInput[] = [];

  followed.forEach((show, i) => {
    const details = showQueries[i]?.data;
    if (!details) return;
    const progress = computeEpisodeProgress(details.seasons, watchedCounts[i] ?? 0);
    history.push({
      id: show.id,
      type: 'tv',
      title: show.name,
      status: progress >= 100 && details.seasons.some((s) => s.season_number > 0) ? 'completed' : 'watching',
      genreIds: details.genres.map((g) => g.id),
      progress,
    });
  });

  watchedMovies.forEach((movie, i) => {
    const details = movieQueries[i]?.data;
    if (!details) return;
    history.push({
      id: movie.id,
      type: 'movie',
      title: movie.title,
      status: 'completed',
      genreIds: details.genres.map((g) => g.id),
      progress: 100,
    });
  });

  return { history, isLoading };
}

export function useRecommendations(limit = 10) {
  const { history, isLoading: historyLoading } = useTrackedHistory();
  const historyKey = history.map((h) => `${h.type}-${h.id}-${h.status}-${h.progress}`).join(',');

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['recommendations', historyKey],
    queryFn: () => getRecommendationSections(history, limit),
    enabled: !historyLoading,
  });

  return { sections, isLoading: historyLoading || sectionsLoading };
}
