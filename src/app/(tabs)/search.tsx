import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Searchbar } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { posterUrl, searchMulti, type SearchResultItem } from '@/api/tmdb';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function ResultRow({ item }: { item: SearchResultItem }) {
  const poster = posterUrl(item.poster_path, 'w185');
  const href =
    item.media_type === 'tv'
      ? ({ pathname: '/show/[id]', params: { id: String(item.id) } } as const)
      : ({ pathname: '/movie/[id]', params: { id: String(item.id) } } as const);

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
            {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
            {item.year ? ` · ${item.year}` : ''}
          </ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchMulti(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Search
        </ThemedText>
        <Searchbar
          placeholder="Search shows and movies"
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
          renderItem={({ item }) => <ResultRow item={item} />}
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
  row: {
    flexDirection: 'row',
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
