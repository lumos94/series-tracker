import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/filter-chip';
import { PosterCard } from '@/components/poster-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getMovieDetails, getTvDetails, type MediaType } from '@/api/tmdb';
import { getFollowedShows, getWatchedEpisodesForShow, getWatchedMovies, getWatchlist } from '@/db/queries';
import { computeEpisodeProgress, type WatchStatus } from '@/lib/watch-status';

interface Entry {
  id: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  status: WatchStatus;
  progress: number;
  rating: number;
  genreIds: number[];
  sortDate: string;
}

function useWatchlistEntries() {
  const followed = getFollowedShows();
  const watchedMovies = getWatchedMovies();
  const watchlist = getWatchlist();

  const watchlistTv = watchlist.filter((w) => w.mediaType === 'tv');
  const watchlistMovies = watchlist.filter((w) => w.mediaType === 'movie');

  const tvIds = Array.from(new Set([...followed.map((s) => s.id), ...watchlistTv.map((w) => w.tmdbId)]));
  const movieIds = Array.from(new Set([...watchedMovies.map((m) => m.id), ...watchlistMovies.map((w) => w.tmdbId)]));

  const tvQueries = useQueries({ queries: tvIds.map((id) => ({ queryKey: ['tv', id], queryFn: () => getTvDetails(id) })) });
  const movieQueries = useQueries({ queries: movieIds.map((id) => ({ queryKey: ['movie', id], queryFn: () => getMovieDetails(id) })) });

  const isLoading = tvQueries.some((q) => q.isLoading) || movieQueries.some((q) => q.isLoading);

  const entries: Entry[] = useMemo(() => {
    const list: Entry[] = [];

    tvIds.forEach((id, i) => {
      const details = tvQueries[i]?.data;
      if (!details) return;
      const followedShow = followed.find((s) => s.id === id);
      const watchlistEntry = watchlistTv.find((w) => w.tmdbId === id);
      const watchedCount = getWatchedEpisodesForShow(id).length;
      const progress = computeEpisodeProgress(details.seasons, watchedCount);
      const status: WatchStatus = followedShow
        ? progress >= 100 && details.seasons.some((s) => s.season_number > 0)
          ? 'completed'
          : 'watching'
        : 'planned';
      list.push({
        id,
        type: 'tv',
        title: followedShow?.name ?? details.name,
        posterPath: followedShow?.posterPath ?? details.poster_path,
        status,
        progress,
        rating: details.vote_average ?? 0,
        genreIds: details.genres.map((g) => g.id),
        sortDate: followedShow?.followedAt ?? watchlistEntry?.addedAt ?? '',
      });
    });

    movieIds.forEach((id, i) => {
      const details = movieQueries[i]?.data;
      if (!details) return;
      const watchedMovie = watchedMovies.find((m) => m.id === id);
      const watchlistEntry = watchlistMovies.find((w) => w.tmdbId === id);
      list.push({
        id,
        type: 'movie',
        title: watchedMovie?.title ?? details.title,
        posterPath: watchedMovie?.posterPath ?? details.poster_path,
        status: watchedMovie ? 'completed' : 'planned',
        progress: watchedMovie ? 100 : 0,
        rating: details.vote_average ?? 0,
        genreIds: details.genres.map((g) => g.id),
        sortDate: watchedMovie?.watchedAt ?? watchlistEntry?.addedAt ?? '',
      });
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvQueries, movieQueries]);

  return { entries, isLoading };
}

type TypeFilter = 'all' | MediaType;
type StatusFilter = WatchStatus | 'all';
type SortKey = 'recent' | 'alpha' | 'rating' | 'progress';

const typeOptions: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];

const statusOptions: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Any status' },
  { key: 'watching', label: 'Watching' },
  { key: 'completed', label: 'Completed' },
  { key: 'planned', label: 'Planned' },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently added' },
  { key: 'alpha', label: 'A–Z' },
  { key: 'rating', label: 'Top rated' },
  { key: 'progress', label: 'Progress' },
];

export default function WatchlistScreen() {
  const queryClient = useQueryClient();
  const { entries, isLoading } = useWatchlistEntries();

  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      queryClient.invalidateQueries({ queryKey: ['watched-movies'] });
    }, [queryClient]),
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    for (const e of entries) counts[e.status] = (counts[e.status] ?? 0) + 1;
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    const list = entries.filter((e) => {
      if (type !== 'all' && e.type !== type) return false;
      if (status !== 'all' && e.status !== status) return false;
      return true;
    });
    if (sort === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'progress') list.sort((a, b) => b.progress - a.progress);
    if (sort === 'recent') list.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
    return list;
  }, [entries, type, status, sort]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">Watchlist</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {filtered.length} of {entries.length} titles
          </ThemedText>

          <View style={styles.chipRow}>
            {typeOptions.map((option) => (
              <FilterChip key={option.key} label={option.label} active={type === option.key} onPress={() => setType(option.key)} />
            ))}
          </View>

          <View style={styles.chipRow}>
            {statusOptions.map((option) => (
              <FilterChip
                key={option.key}
                size="sm"
                label={statusCounts[option.key] ? `${option.label} · ${statusCounts[option.key]}` : option.label}
                active={status === option.key}
                onPress={() => setStatus(option.key)}
              />
            ))}
          </View>

          <View style={styles.chipRow}>
            {sortOptions.map((option) => (
              <FilterChip key={option.key} size="sm" label={option.label} active={sort === option.key} onPress={() => setSort(option.key)} />
            ))}
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <ThemedText type="default" themeColor="textSecondary">
                  Nothing here yet. Follow a show or add something to your watchlist from Discover.
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <PosterCard id={item.id} type={item.type} title={item.title} posterPath={item.posterPath} status={item.status} progress={item.progress} size="sm" fill />
            </View>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  gridRow: {
    gap: Spacing.two,
  },
  gridItem: {
    width: '31.5%',
    marginBottom: Spacing.three,
  },
  empty: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
});
