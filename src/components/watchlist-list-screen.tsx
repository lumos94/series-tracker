import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';

import type { MediaType } from '@/api/tmdb';
import { MediaRow } from '@/components/media-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getWatchlist, removeFromWatchlist, type WatchlistItem } from '@/db/queries';

function WatchlistItemRow({ item }: { item: WatchlistItem }) {
  const queryClient = useQueryClient();
  const href =
    item.mediaType === 'tv'
      ? ({ pathname: '/show/[id]', params: { id: String(item.tmdbId) } } as const)
      : ({ pathname: '/movie/[id]', params: { id: String(item.tmdbId) } } as const);

  function handleRemove() {
    removeFromWatchlist(item.tmdbId, item.mediaType);
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    queryClient.invalidateQueries({ queryKey: ['is-watchlisted', item.mediaType, item.tmdbId] });
  }

  return (
    <MediaRow
      href={href}
      title={item.title}
      posterPath={item.posterPath}
      trailing={
        <IconButton
          icon="bookmark-remove-outline"
          size={22}
          onPress={handleRemove}
          accessibilityLabel="Remove from watchlist"
        />
      }
    />
  );
}

export function WatchlistListScreen({ mediaType, emptyMessage }: { mediaType: MediaType; emptyMessage: string }) {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getWatchlist(),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    }, [queryClient]),
  );

  const filtered = items.filter((item) => item.mediaType === mediaType);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {filtered.length === 0 && (
          <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
            {emptyMessage}
          </ThemedText>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
          renderItem={({ item }) => <WatchlistItemRow item={item} />}
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
