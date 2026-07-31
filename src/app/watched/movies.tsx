import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaRow } from '@/components/media-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getWatchedMovies, type WatchedMovie } from '@/db/queries';

function formatRuntime(runtimeMinutes: number | null) {
  if (!runtimeMinutes) return undefined;
  return `${runtimeMinutes} min`;
}

function WatchedMovieRow({ item }: { item: WatchedMovie }) {
  return (
    <MediaRow
      href={{ pathname: '/movie/[id]', params: { id: String(item.id) } } as const}
      title={item.title}
      subtitle={formatRuntime(item.runtimeMinutes)}
      posterPath={item.posterPath}
    />
  );
}

export default function WatchedMoviesScreen() {
  const queryClient = useQueryClient();

  const { data: movies = [] } = useQuery({
    queryKey: ['watched-movies'],
    queryFn: () => getWatchedMovies(),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['watched-movies'] });
    }, [queryClient]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {movies.length === 0 && (
          <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
            Movies you mark as watched will show up here.
          </ThemedText>
        )}

        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <WatchedMovieRow item={item} />}
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
    paddingTop: Spacing.three,
  },
  message: {
    marginBottom: Spacing.three,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
