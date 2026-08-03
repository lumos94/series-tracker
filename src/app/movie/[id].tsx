import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
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

  const { data, isLoading, isError } = useQuery({ queryKey: ['movie', movieId], queryFn: () => getMovieDetails(movieId) });
  const { data: watched = false } = useQuery({ queryKey: ['is-movie-watched', movieId], queryFn: () => isMovieWatched(movieId) });
  const { data: watchlisted = false } = useQuery({ queryKey: ['is-watchlisted', 'movie', movieId], queryFn: () => isInWatchlist(movieId, 'movie') });

  function toggleWatched() {
    if (!data) return;
    if (watched) markMovieUnwatched(movieId);
    else markMovieWatched({ id: movieId, title: data.title, posterPath: data.poster_path, runtimeMinutes: data.runtime });
    queryClient.invalidateQueries({ queryKey: ['is-movie-watched', movieId] });
    queryClient.invalidateQueries({ queryKey: ['watched-movies'] });
    queryClient.invalidateQueries({ queryKey: ['watch-stats'] });
  }

  function toggleWatchlist() {
    if (!data) return;
    if (watchlisted) removeFromWatchlist(movieId, 'movie');
    else addToWatchlist({ tmdbId: movieId, mediaType: 'movie', title: data.title, posterPath: data.poster_path });
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

  const backdrop = backdropUrl(data.backdrop_path, 'w780');
  const poster = posterUrl(data.poster_path);
  const hours = data.runtime ? Math.floor(data.runtime / 60) : 0;
  const minutes = data.runtime ? data.runtime % 60 : 0;
  const status = watched ? 'completed' : watchlisted ? 'planned' : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.backdropWrap}>
            {backdrop && <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" />}
            <View style={styles.backdropScrim} />
          </View>

          <View style={styles.headerRow}>
            {poster ? <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" /> : <View style={styles.poster} />}
            <View style={styles.headerText}>
              {status && <StatusBadge status={status} style={styles.statusBadge} />}
              <ThemedText type="subtitle">{data.title}</ThemedText>
              <View style={styles.metaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  ★ {data.vote_average?.toFixed(1) ?? '—'}
                </ThemedText>
                {data.release_date && (
                  <ThemedText type="small" themeColor="textSecondary">
                    · {data.release_date.slice(0, 4)}
                  </ThemedText>
                )}
                {data.runtime ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    · {hours}h {minutes}m
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={toggleWatched} style={[styles.primaryButton, watched && styles.primaryButtonActive]}>
              <ThemedText type="smallBold" style={{ color: Colors.dark.primaryForeground }}>
                {watched ? 'Watched' : 'Mark as watched'}
              </ThemedText>
            </Pressable>
            <Pressable onPress={toggleWatchlist} style={styles.iconButton}>
              <Ionicons name={watchlisted ? 'bookmark' : 'bookmark-outline'} size={18} color={Colors.dark.text} />
            </Pressable>
          </View>

          <ThemedText type="default" themeColor="textSecondary" style={styles.overview}>
            {data.overview}
          </ThemedText>

          {data.genres.length > 0 && (
            <View style={styles.genreRow}>
              {data.genres.slice(0, 4).map((genre) => (
                <View key={genre.id} style={styles.genreChip}>
                  <ThemedText type="small">{genre.name}</ThemedText>
                </View>
              ))}
            </View>
          )}
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
  backdropWrap: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.dark.cosmicSurface,
  },
  backdropScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 5, 10, 0.35)',
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    marginTop: -64,
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.cosmicSurface,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  headerText: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Spacing.half,
    paddingBottom: Spacing.one,
  },
  statusBadge: {
    marginBottom: Spacing.half,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: Spacing.two + 2,
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
  },
  primaryButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.dark.cosmicElevated,
  },
  overview: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
  },
});
