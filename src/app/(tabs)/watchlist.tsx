import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { posterUrl } from '@/api/tmdb';
import { getWatchlist, removeFromWatchlist, type WatchlistItem } from '@/db/queries';

function WatchlistRow({ item }: { item: WatchlistItem }) {
  const queryClient = useQueryClient();
  const poster = posterUrl(item.posterPath, 'w185');
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
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
        ) : (
          <ThemedView type="backgroundElement" style={styles.poster} />
        )}
        <View style={styles.rowText}>
          <ThemedText type="default" numberOfLines={2}>
            {item.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
          </ThemedText>
        </View>
        <IconButton icon="bookmark-remove-outline" size={22} onPress={handleRemove} accessibilityLabel="Remove from watchlist" />
      </Pressable>
    </Link>
  );
}

export default function WatchlistScreen() {
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Watchlist
        </ThemedText>

        {items.length === 0 && (
          <ThemedText type="default" themeColor="textSecondary">
            Shows and movies you plan to watch will show up here.
          </ThemedText>
        )}

        <FlatList
          data={items}
          keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
          renderItem={({ item }) => <WatchlistRow item={item} />}
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
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowPressed: {
    opacity: 0.7,
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: Spacing.one,
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.half,
  },
});
