import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';

import { EpisodeRow } from '@/components/episode-row';
import { ProgressRing } from '@/components/progress-ring';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { backdropUrl, getSeasonDetails, getTvDetails, posterUrl, type Season } from '@/api/tmdb';
import {
  addToWatchlist,
  followShow,
  getWatchedEpisodeNumbers,
  getWatchedEpisodesForShow,
  isInWatchlist,
  isShowFollowed,
  markEpisodesWatched,
  markEpisodeUnwatched,
  markEpisodeWatched,
  removeFromWatchlist,
  unfollowShow,
} from '@/db/queries';
import { computeEpisodeProgress } from '@/lib/watch-status';
import { getUnwatchedEpisodesBefore, markEntireShowWatched } from '@/lib/watch-actions';

/** Cheap, sync heuristic (no network) for whether any episode before (targetSeason, targetEpisode) is still unwatched. */
function hasUnwatchedPrior(
  watched: { seasonNumber: number; episodeNumber: number }[],
  allSeasons: Season[],
  targetSeasonNumber: number,
  targetEpisodeNumber: number,
): boolean {
  for (const s of allSeasons) {
    if (s.season_number > 0 && s.season_number < targetSeasonNumber) {
      const watchedCount = watched.filter((w) => w.seasonNumber === s.season_number).length;
      if (watchedCount < s.episode_count) return true;
    }
  }
  for (let episodeNumber = 1; episodeNumber < targetEpisodeNumber; episodeNumber++) {
    if (!watched.some((w) => w.seasonNumber === targetSeasonNumber && w.episodeNumber === episodeNumber)) return true;
  }
  return false;
}

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tvId = Number(id);
  const queryClient = useQueryClient();
  const [selectedSeason, setSelectedSeason] = useState(1);

  const { data, isLoading, isError } = useQuery({ queryKey: ['tv', tvId], queryFn: () => getTvDetails(tvId) });
  const { data: followed = false } = useQuery({ queryKey: ['is-followed', tvId], queryFn: () => isShowFollowed(tvId) });
  const { data: watchlisted = false } = useQuery({ queryKey: ['is-watchlisted', 'tv', tvId], queryFn: () => isInWatchlist(tvId, 'tv') });

  const seasons = data?.seasons.filter((s) => s.season_number > 0) ?? [];

  const { data: seasonData, isFetching: isFetchingSeason } = useQuery({
    queryKey: ['season', tvId, selectedSeason],
    queryFn: () => getSeasonDetails(tvId, selectedSeason),
    enabled: seasons.length > 0,
  });

  const { data: watchedNumbers = [] } = useQuery({
    queryKey: ['watched-episodes', tvId, selectedSeason],
    queryFn: () => getWatchedEpisodeNumbers(tvId, selectedSeason),
  });

  function invalidateWatchState() {
    queryClient.invalidateQueries({ queryKey: ['watched-episodes', tvId] });
    queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
    queryClient.invalidateQueries({ queryKey: ['watched-shows'] });
    queryClient.invalidateQueries({ queryKey: ['watch-stats'] });
  }

  function toggleFollow() {
    if (!data) return;
    if (followed) unfollowShow(tvId);
    else followShow({ id: tvId, name: data.name, posterPath: data.poster_path });
    queryClient.invalidateQueries({ queryKey: ['is-followed', tvId] });
    queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
  }

  function toggleWatchlist() {
    if (!data) return;
    if (watchlisted) removeFromWatchlist(tvId, 'tv');
    else addToWatchlist({ tmdbId: tvId, mediaType: 'tv', title: data.name, posterPath: data.poster_path });
    queryClient.invalidateQueries({ queryKey: ['is-watchlisted', 'tv', tvId] });
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  }

  function markSingleEpisodeWatched(episodeNumber: number, runtimeMinutes: number | null) {
    markEpisodeWatched(tvId, selectedSeason, episodeNumber, runtimeMinutes);
    invalidateWatchState();
  }

  async function markWithPriorEpisodes(episodeNumber: number, runtimeMinutes: number | null) {
    const priorEntries = await getUnwatchedEpisodesBefore(queryClient, tvId, selectedSeason, episodeNumber);
    markEpisodesWatched(tvId, [...priorEntries, { seasonNumber: selectedSeason, episodeNumber, runtimeMinutes }]);
    invalidateWatchState();
  }

  function toggleEpisode(episodeNumber: number) {
    if (watchedNumbers.includes(episodeNumber)) {
      markEpisodeUnwatched(tvId, selectedSeason, episodeNumber);
      invalidateWatchState();
      return;
    }

    const runtimeMinutes = seasonData?.episodes.find((e) => e.episode_number === episodeNumber)?.runtime ?? null;
    const watched = getWatchedEpisodesForShow(tvId);

    if (hasUnwatchedPrior(watched, seasons, selectedSeason, episodeNumber)) {
      Alert.alert('Earlier episodes unwatched', 'There are earlier episodes of this show marked unwatched. Mark those as watched too?', [
        { text: 'No, just this one', style: 'cancel', onPress: () => markSingleEpisodeWatched(episodeNumber, runtimeMinutes) },
        { text: 'Yes, mark all', onPress: () => markWithPriorEpisodes(episodeNumber, runtimeMinutes) },
      ]);
      return;
    }
    markSingleEpisodeWatched(episodeNumber, runtimeMinutes);
  }

  function markSeasonWatched() {
    if (!seasonData) return;
    markEpisodesWatched(
      tvId,
      seasonData.episodes.map((e) => ({ seasonNumber: selectedSeason, episodeNumber: e.episode_number, runtimeMinutes: e.runtime })),
    );
    invalidateWatchState();
  }

  const markShowWatchedMutation = useMutation({
    mutationFn: () => markEntireShowWatched(queryClient, tvId),
    onSuccess: invalidateWatchState,
    onError: (error: Error) => Alert.alert("Couldn't mark watched", error.message),
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

  const backdrop = backdropUrl(data.backdrop_path, 'w780');
  const poster = posterUrl(data.poster_path);
  const watchedCount = getWatchedEpisodesForShow(tvId).length;
  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episode_count, 0);
  const progress = computeEpisodeProgress(data.seasons, watchedCount);
  const status = followed ? (progress >= 100 && totalEpisodes > 0 ? 'completed' : 'watching') : watchlisted ? 'planned' : undefined;

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
              <ThemedText type="subtitle">{data.name}</ThemedText>
              <View style={styles.metaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  ★ {data.vote_average?.toFixed(1) ?? '—'}
                </ThemedText>
                {data.first_air_date && (
                  <ThemedText type="small" themeColor="textSecondary">
                    · {data.first_air_date.slice(0, 4)}
                  </ThemedText>
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  · {seasons.length} season{seasons.length === 1 ? '' : 's'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={toggleFollow} style={[styles.primaryButton, followed && styles.primaryButtonActive]}>
              <ThemedText type="smallBold" style={{ color: Colors.dark.primaryForeground }}>
                {followed ? 'Following' : 'Follow'}
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

          <View style={styles.progressCard}>
            <ProgressRing progress={progress} size="md" />
            <View>
              <ThemedText type="smallBold">
                {watchedCount} / {totalEpisodes} episodes
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {progress >= 100 ? 'All caught up!' : `${Math.max(0, totalEpisodes - watchedCount)} left to watch`}
              </ThemedText>
            </View>
          </View>

          <View style={styles.seasonsHeadingRow}>
            <ThemedText type="subtitle">Episodes</ThemedText>
            <Pressable
              disabled={markShowWatchedMutation.isPending}
              onPress={() => markShowWatchedMutation.mutate()}
              style={styles.textButton}>
              {markShowWatchedMutation.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <ThemedText type="linkPrimary">Mark all watched</ThemedText>
              )}
            </Pressable>
          </View>

          <View style={styles.seasonChips}>
            {seasons.map((season) => (
              <Pressable
                key={season.id}
                onPress={() => setSelectedSeason(season.season_number)}
                style={[styles.seasonChip, selectedSeason === season.season_number && styles.seasonChipActive]}>
                <ThemedText
                  type="smallBold"
                  style={selectedSeason === season.season_number ? { color: Colors.dark.primaryForeground } : { color: Colors.dark.textSecondary }}>
                  {season.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {isFetchingSeason && <ActivityIndicator style={styles.seasonSpinner} />}

          {!isFetchingSeason && seasonData && seasonData.episodes.length > 0 && (
            <Pressable onPress={markSeasonWatched} style={styles.markSeasonButton}>
              <ThemedText type="linkPrimary">Mark season watched</ThemedText>
            </Pressable>
          )}

          <View style={styles.episodeList}>
            {seasonData?.episodes.map((episode) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                watched={watchedNumbers.includes(episode.episode_number)}
                onToggle={() => toggleEpisode(episode.episode_number)}
              />
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
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.dark.cosmicSurface,
  },
  seasonsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.five,
    marginBottom: Spacing.two,
  },
  textButton: {
    minHeight: 24,
    justifyContent: 'center',
  },
  seasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  seasonChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    backgroundColor: Colors.dark.cosmicSurface,
  },
  seasonChipActive: {
    backgroundColor: Colors.dark.primary,
  },
  seasonSpinner: {
    marginTop: Spacing.four,
  },
  markSeasonButton: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
    alignSelf: 'flex-start',
  },
  episodeList: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
});
