import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';

import { getTvDetails } from '@/api/tmdb';
import { MediaRow } from '@/components/media-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getWatchedShowSummaries, type WatchedShowSummary } from '@/db/queries';

function WatchedShowRow({ summary }: { summary: WatchedShowSummary }) {
  const { data: show, isLoading } = useQuery({
    queryKey: ['tv', summary.showId],
    queryFn: () => getTvDetails(summary.showId),
  });

  if (isLoading || !show) {
    return <ActivityIndicator style={styles.rowSpinner} />;
  }

  return (
    <MediaRow
      href={{ pathname: '/show/[id]', params: { id: String(summary.showId) } } as const}
      title={show.name}
      subtitle={`${summary.episodeCount} episode${summary.episodeCount === 1 ? '' : 's'} watched`}
      posterPath={show.poster_path}
    />
  );
}

export default function WatchedSeriesScreen() {
  const queryClient = useQueryClient();

  const { data: summaries = [] } = useQuery({
    queryKey: ['watched-shows'],
    queryFn: () => getWatchedShowSummaries(),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['watched-shows'] });
    }, [queryClient]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {summaries.length === 0 && (
          <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
            Series with watched episodes will show up here.
          </ThemedText>
        )}

        <FlatList
          data={summaries}
          keyExtractor={(item) => String(item.showId)}
          renderItem={({ item }) => <WatchedShowRow summary={item} />}
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
  rowSpinner: {
    alignItems: 'flex-start',
    marginVertical: Spacing.three,
  },
});
