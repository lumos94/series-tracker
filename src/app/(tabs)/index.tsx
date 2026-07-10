import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, IconButton } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getSeasonDetails, getTvDetails, posterUrl, type Episode } from '@/api/tmdb';
import { getFollowedShows, getLastWatched, markEpisodeWatched, type FollowedShow } from '@/db/queries';

interface NextEpisode {
  episode: Episode;
  seasonNumber: number;
}

function useNextEpisode(show: FollowedShow): { nextEpisode: NextEpisode | null; isLoading: boolean } {
  const lastWatched = getLastWatched(show.id);

  const { data: tvDetails } = useQuery({
    queryKey: ['tv', show.id],
    queryFn: () => getTvDetails(show.id),
  });

  const seasonNumbers = tvDetails?.seasons.map((s) => s.season_number).filter((n) => n > 0) ?? [];
  const currentSeasonNumber = lastWatched ? lastWatched.seasonNumber : (seasonNumbers[0] ?? 1);

  const { data: currentSeason, isFetching: isFetchingCurrent } = useQuery({
    queryKey: ['season', show.id, currentSeasonNumber],
    queryFn: () => getSeasonDetails(show.id, currentSeasonNumber),
    enabled: !!tvDetails,
  });

  const withinSeasonNext = currentSeason?.episodes.find((e) =>
    lastWatched ? e.episode_number > lastWatched.episodeNumber : true,
  );

  const nextSeasonNumber = seasonNumbers.find((n) => n > currentSeasonNumber);
  const needsNextSeason = !!currentSeason && !withinSeasonNext && !!nextSeasonNumber;

  const { data: nextSeason, isFetching: isFetchingNext } = useQuery({
    queryKey: ['season', show.id, nextSeasonNumber],
    queryFn: () => getSeasonDetails(show.id, nextSeasonNumber!),
    enabled: needsNextSeason,
  });

  const episode = withinSeasonNext ?? nextSeason?.episodes[0] ?? null;
  const seasonNumber = withinSeasonNext ? currentSeasonNumber : (nextSeasonNumber ?? currentSeasonNumber);

  return {
    nextEpisode: episode ? { episode, seasonNumber } : null,
    isLoading: !tvDetails || isFetchingCurrent || (needsNextSeason && isFetchingNext),
  };
}

function UpNextRow({ show }: { show: FollowedShow }) {
  const queryClient = useQueryClient();
  const { nextEpisode, isLoading } = useNextEpisode(show);
  const poster = posterUrl(show.posterPath, 'w185');

  function handleMarkWatched() {
    if (!nextEpisode) return;
    markEpisodeWatched(show.id, nextEpisode.seasonNumber, nextEpisode.episode.episode_number);
    queryClient.invalidateQueries({ queryKey: ['season', show.id] });
    queryClient.invalidateQueries({ queryKey: ['watched-episodes', show.id] });
  }

  return (
    <Link href={{ pathname: '/show/[id]', params: { id: String(show.id) } } as const} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
        ) : (
          <ThemedView type="backgroundElement" style={styles.poster} />
        )}
        <View style={styles.rowText}>
          <ThemedText type="default" numberOfLines={1}>
            {show.name}
          </ThemedText>
          {isLoading && <ActivityIndicator style={styles.rowSpinner} />}
          {!isLoading && nextEpisode && (
            <>
              <ThemedText type="smallBold">
                S{nextEpisode.seasonNumber}E{nextEpisode.episode.episode_number} · {nextEpisode.episode.name}
              </ThemedText>
              {nextEpisode.episode.air_date && (
                <ThemedText type="small" themeColor="textSecondary">
                  {nextEpisode.episode.air_date}
                </ThemedText>
              )}
            </>
          )}
          {!isLoading && !nextEpisode && (
            <ThemedText type="small" themeColor="textSecondary">
              All caught up
            </ThemedText>
          )}
        </View>
        {!isLoading && nextEpisode && (
          <IconButton icon="check-circle-outline" size={26} onPress={handleMarkWatched} accessibilityLabel="Mark watched" />
        )}
      </Pressable>
    </Link>
  );
}

export default function UpNextScreen() {
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery({
    queryKey: ['followed-shows'],
    queryFn: () => getFollowedShows(),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
    }, [queryClient]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Up Next
        </ThemedText>

        {shows.length === 0 && (
          <ThemedText type="default" themeColor="textSecondary">
            Follow a show from search to see what&apos;s next.
          </ThemedText>
        )}

        <FlatList
          data={shows}
          keyExtractor={(show) => String(show.id)}
          renderItem={({ item }) => <UpNextRow show={item} />}
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
  rowSpinner: {
    alignItems: 'flex-start',
  },
});
