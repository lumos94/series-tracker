import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { backdropUrl, getMovieDetails, posterUrl } from '@/api/tmdb';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => getMovieDetails(movieId),
  });

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
