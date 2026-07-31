import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, IconButton, SegmentedButtons, Searchbar } from 'react-native-paper';

import { searchMovies, searchTv, type SearchResultItem } from '@/api/tmdb';
import { MediaRow } from '@/components/media-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { markEntireShowWatched } from '@/lib/watch-actions';

type SearchMode = 'movie' | 'tv';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function MovieResultRow({ item }: { item: SearchResultItem }) {
  return (
    <MediaRow
      href={{ pathname: '/movie/[id]', params: { id: String(item.id) } } as const}
      title={item.title}
      subtitle={item.year ?? undefined}
      posterPath={item.poster_path}
    />
  );
}

function TvResultRow({ item }: { item: SearchResultItem }) {
  const queryClient = useQueryClient();

  const markWatchedMutation = useMutation({
    mutationFn: () => markEntireShowWatched(queryClient, item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-episodes', item.id] });
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      queryClient.invalidateQueries({ queryKey: ['watched-shows'] });
      queryClient.invalidateQueries({ queryKey: ['watch-stats'] });
    },
    onError: (error: Error) => Alert.alert("Couldn't mark watched", error.message),
  });

  function confirmMarkWatched() {
    Alert.alert('Mark as watched?', `Mark all of "${item.title}" as watched?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark watched', onPress: () => markWatchedMutation.mutate() },
    ]);
  }

  return (
    <MediaRow
      href={{ pathname: '/show/[id]', params: { id: String(item.id) } } as const}
      title={item.title}
      subtitle={item.year ?? undefined}
      posterPath={item.poster_path}
      trailing={
        markWatchedMutation.isPending ? (
          <ActivityIndicator style={styles.trailingSpinner} />
        ) : (
          <IconButton
            icon="check-circle-outline"
            size={26}
            onPress={confirmMarkWatched}
            accessibilityLabel="Mark entire series watched"
          />
        )
      }
    />
  );
}

export default function SearchScreen() {
  const [mode, setMode] = useState<SearchMode>('movie');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search', mode, debouncedQuery],
    queryFn: () => (mode === 'movie' ? searchMovies(debouncedQuery) : searchTv(debouncedQuery)),
    enabled: debouncedQuery.trim().length > 0,
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Search
        </ThemedText>

        <SegmentedButtons
          value={mode}
          onValueChange={(value) => setMode(value as SearchMode)}
          style={styles.segmented}
          buttons={[
            { value: 'movie', label: 'Movies' },
            { value: 'tv', label: 'TV Shows' },
          ]}
        />

        <Searchbar
          placeholder={mode === 'movie' ? 'Search movies' : 'Search TV shows'}
          value={query}
          onChangeText={setQuery}
          style={styles.searchbar}
        />

        {isFetching && <ActivityIndicator style={styles.spinner} />}

        {isError && (
          <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
            Something went wrong searching TMDB. Try again.
          </ThemedText>
        )}

        {!isFetching && debouncedQuery.trim().length > 0 && data?.length === 0 && (
          <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
            No results for &quot;{debouncedQuery}&quot;.
          </ThemedText>
        )}

        <FlatList
          data={data ?? []}
          keyExtractor={(item) => `${item.media_type}-${item.id}`}
          renderItem={({ item }) => (mode === 'movie' ? <MovieResultRow item={item} /> : <TvResultRow item={item} />)}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: Spacing.four,
  },
  title: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  segmented: {
    marginBottom: Spacing.three,
  },
  searchbar: {
    marginBottom: Spacing.three,
  },
  spinner: {
    marginTop: Spacing.three,
  },
  message: {
    marginTop: Spacing.three,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  trailingSpinner: {
    marginHorizontal: Spacing.three,
  },
});
