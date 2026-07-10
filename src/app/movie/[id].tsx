import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, IconButton } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { backdropUrl, getMovieDetails, posterUrl } from '@/api/tmdb';
import {
  addToWatchlist,
  isInWatchlist,
  isMovieWatched,
  markMovieUnwatched,
  markMovieWatched,
  removeFromWatchlist,
} from '@/db/queries';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => getMovieDetails(movieId),
  });

  const { data: watched = false } = useQuery({
    queryKey: ['is-movie-watched', movieId],
    queryFn: () => isMovieWatched(movieId),
  });

  const { data: watchlisted = false } = useQuery({
    queryKey: ['is-watchlisted', 'movie', movieId],
    queryFn: () => isInWatchlist(movieId, 'movie'),
  });

  function toggleWatched() {
    if (!data) return;
    if (watched) {
      markMovieUnwatched(movieId);
    } else {
      markMovieWatched({ id: movieId, title: data.title, posterPath: data.poster_path });
    }
    queryClient.invalidateQueries({ queryKey: ['is-movie-watched', movieId] });
  }

  function toggleWatchlist() {
    if (!data) return;
    if (watchlisted) {
      removeFromWatchlist(movieId, 'movie');
    } else {
      addToWatchlist({ tmdbId: movieId, mediaType: 'movie', title: data.title, posterPath: data.poster_path });
    }
    queryClient.invalidateQueries({ queryKey: ['is-watchlisted', 'movie', movieId] });
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (isError || !data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">Couldn&apos;t load this movie.</ThemedText>
      </ThemedView>
    );
  }

  const backdrop = backdropUrl(data.backdrop_path);
  const poster = posterUrl(data.poster_path);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {backdrop && <Image source={{ uri: backdrop }} style={styles.backdrop} contentFit="cover" />}

          <View style={styles.headerRow}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
            ) : (
              <ThemedView type="backgroundElement" style={styles.poster} />
            )}
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{data.title}</ThemedText>
              {data.release_date && (
                <ThemedText type="small" themeColor="textSecondary">
                  {data.release_date.slice(0, 4)}
                  {data.runtime ? ` · ${data.runtime} min` : ''}
                </ThemedText>
              )}
              <ThemedText type="small" themeColor="textSecondary">
                {data.genres.map((g) => g.name).join(', ')}
              </ThemedText>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Button mode={watched ? 'contained' : 'outlined'} onPress={toggleWatched} style={styles.actionButton}>
              {watched ? 'Watched' : 'Mark as watched'}
            </Button>
            <IconButton
              icon={watchlisted ? 'bookmark' : 'bookmark-outline'}
              mode="outlined"
              onPress={toggleWatchlist}
              accessibilityLabel={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
            />
          </View>

          <ThemedText type="default" style={styles.overview}>
            {data.overview}
          </ThemedText>
        </ScrollView>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  backdrop: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  actionButton: {
    flex: 1,
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: Spacing.two,
  },
  headerText: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.half,
  },
  overview: {
    paddingHorizontal: Spacing.four,
  },
});
