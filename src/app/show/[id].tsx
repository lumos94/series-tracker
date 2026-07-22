import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, IconButton } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backdropUrl, getSeasonDetails, getTvDetails, posterUrl, type Season } from '@/api/tmdb';
import {
  addToWatchlist,
  followShow,
  getWatchedEpisodeNumbers,
  isInWatchlist,
  isShowFollowed,
  markEpisodeUnwatched,
  markEpisodeWatched,
  markSeasonWatched,
  removeFromWatchlist,
  unfollowShow,
} from '@/db/queries';

function SeasonSection({ tvId, season }: { tvId: number; season: Season }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data, isFetching } = useQuery({
    queryKey: ['season', tvId, season.season_number],
    queryFn: () => getSeasonDetails(tvId, season.season_number),
    enabled: isOpen,
  });

  const { data: watchedNumbers = [] } = useQuery({
    queryKey: ['watched-episodes', tvId, season.season_number],
    queryFn: () => getWatchedEpisodeNumbers(tvId, season.season_number),
    enabled: isOpen,
  });

  function invalidateWatchState() {
    queryClient.invalidateQueries({ queryKey: ['watched-episodes', tvId, season.season_number] });
    queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
  }

  function toggleEpisode(episodeNumber: number) {
    if (watchedNumbers.includes(episodeNumber)) {
      markEpisodeUnwatched(tvId, season.season_number, episodeNumber);
    } else {
      const runtimeMinutes = data?.episodes.find((e) => e.episode_number === episodeNumber)?.runtime ?? null;
      markEpisodeWatched(tvId, season.season_number, episodeNumber, runtimeMinutes);
    }
    invalidateWatchState();
  }

  function markAllWatched() {
    if (!data) return;
    markSeasonWatched(
      tvId,
      season.season_number,
      data.episodes.map((e) => ({ episodeNumber: e.episode_number, runtimeMinutes: e.runtime })),
    );
    invalidateWatchState();
  }

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
            {!isFetching && data && data.episodes.length > 0 && (
              <Button compact onPress={markAllWatched} style={styles.markAllButton}>
                Mark season watched
              </Button>
            )}
            {data?.episodes.map((episode) => {
              const watched = watchedNumbers.includes(episode.episode_number);
              return (
                <Pressable key={episode.id} style={styles.episodeRow} onPress={() => toggleEpisode(episode.episode_number)}>
                  <View style={styles.episodeText}>
                    <ThemedText type="smallBold">
                      E{episode.episode_number}. {episode.name}
                    </ThemedText>
                    {episode.air_date && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {episode.air_date}
                      </ThemedText>
                    )}
                  </View>
                  <IconButton
                    icon={watched ? 'check-circle' : 'check-circle-outline'}
                    size={22}
                    onPress={() => toggleEpisode(episode.episode_number)}
                  />
                </Pressable>
              );
            })}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tvId = Number(id);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tv', tvId],
    queryFn: () => getTvDetails(tvId),
  });

  const { data: followed = false } = useQuery({
    queryKey: ['is-followed', tvId],
    queryFn: () => isShowFollowed(tvId),
  });

  const { data: watchlisted = false } = useQuery({
    queryKey: ['is-watchlisted', 'tv', tvId],
    queryFn: () => isInWatchlist(tvId, 'tv'),
  });

  function toggleFollow() {
    if (!data) return;
    if (followed) {
      unfollowShow(tvId);
    } else {
      followShow({ id: tvId, name: data.name, posterPath: data.poster_path });
    }
    queryClient.invalidateQueries({ queryKey: ['is-followed', tvId] });
    queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
  }

  function toggleWatchlist() {
    if (!data) return;
    if (watchlisted) {
      removeFromWatchlist(tvId, 'tv');
    } else {
      addToWatchlist({ tmdbId: tvId, mediaType: 'tv', title: data.name, posterPath: data.poster_path });
    }
    queryClient.invalidateQueries({ queryKey: ['is-watchlisted', 'tv', tvId] });
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

          <View style={styles.actionRow}>
            <Button mode={followed ? 'contained' : 'outlined'} onPress={toggleFollow} style={styles.actionButton}>
              {followed ? 'Following' : 'Follow'}
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
    paddingBottom: Spacing.two,
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
  markAllButton: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.one,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  episodeText: {
    flex: 1,
    gap: Spacing.half,
  },
});
