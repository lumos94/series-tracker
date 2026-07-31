import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';

import { FilterChip } from '@/components/filter-chip';
import { PosterCard } from '@/components/poster-card';
import { PosterSkeleton } from '@/components/poster-skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { discoverTitles, getGenreOptions, type DiscoverItem, type DiscoverSort, type DiscoverType } from '@/api/tmdb';

const typeOptions: { key: DiscoverType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];

const sortOptions: { key: DiscoverSort; label: string }[] = [
  { key: 'popularity', label: 'Popular' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<DiscoverType>('all');
  const [sort, setSort] = useState<DiscoverSort>('popularity');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: () => getGenreOptions(),
    staleTime: 1000 * 60 * 60,
  });

  const visibleGenres = useMemo(() => genres.filter((g) => type === 'all' || g.type === 'both' || g.type === type), [genres, type]);

  const result = useInfiniteQuery({
    queryKey: ['discover', debouncedQuery, type, selectedGenres.join(','), sort],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => discoverTitles({ query: debouncedQuery, type, genres: selectedGenres, sort, page: pageParam }),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  const items: DiscoverItem[] = useMemo(() => {
    const seen = new Set<string>();
    return (result.data?.pages ?? []).flatMap((p) => p.items).filter((item) => {
      const key = `${item.type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [result.data]);

  function toggleGenre(id: number) {
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  const hasFilters = query !== '' || type !== 'all' || selectedGenres.length > 0 || sort !== 'popularity';

  function clearFilters() {
    setQuery('');
    setType('all');
    setSort('popularity');
    setSelectedGenres([]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <ThemedText type="title">Discover</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Search the universe of shows and movies
          </ThemedText>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.dark.textSecondary} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search titles..."
              placeholderTextColor={Colors.dark.textSecondary}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close" size={16} color={Colors.dark.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.chipRow}>
            {typeOptions.map((option) => (
              <FilterChip key={option.key} label={option.label} active={type === option.key} onPress={() => setType(option.key)} />
            ))}
            <Pressable
              onPress={() => setShowFilters((v) => !v)}
              style={[styles.filtersButton, (showFilters || selectedGenres.length > 0) && styles.filtersButtonActive]}>
              <Ionicons name="options-outline" size={14} color={Colors.dark.text} />
              <ThemedText type="smallBold">Filters</ThemedText>
              {selectedGenres.length > 0 && (
                <View style={styles.filterCount}>
                  <ThemedText type="small" style={{ color: Colors.dark.primaryForeground, fontSize: 10 }}>
                    {selectedGenres.length}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          {showFilters && (
            <View style={styles.filterPanel}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.filterLabel}>
                SORT BY
              </ThemedText>
              <View style={styles.chipRow}>
                {sortOptions.map((option) => (
                  <FilterChip key={option.key} size="sm" label={option.label} active={sort === option.key} onPress={() => setSort(option.key)} />
                ))}
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={styles.filterLabel}>
                GENRES
              </ThemedText>
              <View style={styles.genreWrap}>
                {visibleGenres.map((genre) => (
                  <FilterChip
                    key={`${genre.type}-${genre.id}`}
                    size="sm"
                    label={genre.name}
                    active={selectedGenres.includes(genre.id)}
                    onPress={() => toggleGenre(genre.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {hasFilters && (
            <Pressable onPress={clearFilters}>
              <ThemedText type="linkPrimary">Clear all filters</ThemedText>
            </Pressable>
          )}
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (result.hasNextPage && !result.isFetchingNextPage) result.fetchNextPage();
          }}
          ListEmptyComponent={
            result.isPending ? (
              <View style={styles.skeletonGrid}>
                <PosterSkeleton count={9} />
              </View>
            ) : (
              <View style={styles.empty}>
                <ThemedText type="default" themeColor="textSecondary">
                  No matches out there. Try a different search or loosen your filters.
                </ThemedText>
              </View>
            )
          }
          ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} /> : null}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <PosterCard id={item.id} type={item.type} title={item.title} posterPath={item.posterPath} size="sm" fill />
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.dark.cosmicSurface,
    paddingHorizontal: Spacing.three,
  },
  searchIcon: {
    marginRight: -4,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  filtersButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.dark.cosmicSurface,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  filtersButtonActive: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  filterCount: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 999,
    paddingHorizontal: 5,
  },
  filterPanel: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15, 15, 26, 0.5)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  filterLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  genreWrap: {
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
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  footerSpinner: {
    marginVertical: Spacing.three,
  },
});
