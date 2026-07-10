import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backdropUrl, getSeasonDetails, getTvDetails, posterUrl, type Season } from '@/api/tmdb';

function SeasonSection({ tvId, season }: { tvId: number; season: Season }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  const { data, isFetching } = useQuery({
    queryKey: ['season', tvId, season.season_number],
    queryFn: () => getSeasonDetails(tvId, season.season_number),
    enabled: isOpen,
  });

  return (
    <ThemedView>
      <Pressable
        style={({ pressed }) => [styles.seasonHeading, pressed && styles.pressedHeading]}
        onPress={() => setIsOpen((value) => !value)}>
        <ThemedView type="backgroundElement" style={styles.chevronButton}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={theme.text}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </ThemedView>
        <ThemedText type="default" style={styles.seasonTitle}>
          {season.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {season.episode_count} episodes
        </ThemedText>
      </Pressable>

      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView type="backgroundElement" style={styles.episodeList}>
            {isFetching && <ActivityIndicator />}
            {data?.episodes.map((episode) => (
              <View key={episode.id} style={styles.episodeRow}>
                <ThemedText type="smallBold">
                  E{episode.episode_number}. {episode.name}
                </ThemedText>
                {episode.air_date && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {episode.air_date}
                  </ThemedText>
                )}
              </View>
            ))}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tvId = Number(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tv', tvId],
    queryFn: () => getTvDetails(tvId),
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
        <ThemedText themeColor="textSecondary">Couldn&apos;t load this show.</ThemedText>
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
              <ThemedText type="subtitle">{data.name}</ThemedText>
              {data.first_air_date && (
                <ThemedText type="small" themeColor="textSecondary">
                  {data.first_air_date.slice(0, 4)}
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

          <ThemedText type="smallBold" style={styles.seasonsHeading}>
            Seasons
          </ThemedText>
          <View style={styles.seasonsList}>
            {data.seasons
              .filter((season) => season.season_number > 0)
              .map((season) => (
                <SeasonSection key={season.id} tvId={tvId} season={season} />
              ))}
          </View>
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
    marginBottom: Spacing.four,
  },
  seasonsHeading: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  seasonsList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  seasonHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  chevronButton: {
    width: Spacing.four,
    height: Spacing.four,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seasonTitle: {
    flex: 1,
  },
  episodeList: {
    marginTop: Spacing.two,
    marginLeft: Spacing.four,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  episodeRow: {
    gap: Spacing.half,
  },
});
