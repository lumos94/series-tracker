import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';

import { CosmicGradientView } from '@/components/cosmic-gradient';
import { HorizontalList } from '@/components/horizontal-list';
import { PosterCard } from '@/components/poster-card';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { backdropUrl, getSeasonDetails, getTrending, getTvDetails, type Episode } from '@/api/tmdb';
import { getFollowedShows, getWatchedEpisodesForShow, getWatchStats, type FollowedShow } from '@/db/queries';
import { computeEpisodeProgress } from '@/lib/watch-status';

interface NextEpisode {
  episode: Episode;
  seasonNumber: number;
}

function useNextEpisode(show: FollowedShow) {
  const watched = getWatchedEpisodesForShow(show.id);
  const lastWatched = watched.reduce<{ seasonNumber: number; episodeNumber: number } | null>((max, w) => {
    if (!max || w.seasonNumber > max.seasonNumber || (w.seasonNumber === max.seasonNumber && w.episodeNumber > max.episodeNumber)) {
      return w;
    }
    return max;
  }, null);

  const { data: tvDetails } = useQuery({ queryKey: ['tv', show.id], queryFn: () => getTvDetails(show.id) });

  const seasonNumbers = tvDetails?.seasons.map((s) => s.season_number).filter((n) => n > 0) ?? [];
  const currentSeasonNumber = lastWatched ? lastWatched.seasonNumber : (seasonNumbers[0] ?? 1);

  const { data: currentSeason, isFetching: isFetchingCurrent } = useQuery({
    queryKey: ['season', show.id, currentSeasonNumber],
    queryFn: () => getSeasonDetails(show.id, currentSeasonNumber),
    enabled: !!tvDetails,
  });

  const withinSeasonNext = currentSeason?.episodes.find((e) => (lastWatched ? e.episode_number > lastWatched.episodeNumber : true));
  const nextSeasonNumber = seasonNumbers.find((n) => n > currentSeasonNumber);
  const needsNextSeason = !!currentSeason && !withinSeasonNext && !!nextSeasonNumber;

  const { data: nextSeason, isFetching: isFetchingNext } = useQuery({
    queryKey: ['season', show.id, nextSeasonNumber],
    queryFn: () => getSeasonDetails(show.id, nextSeasonNumber!),
    enabled: needsNextSeason,
  });

  const episode = withinSeasonNext ?? nextSeason?.episodes[0] ?? null;
  const seasonNumber = withinSeasonNext ? currentSeasonNumber : (nextSeasonNumber ?? currentSeasonNumber);
  const progress = tvDetails ? computeEpisodeProgress(tvDetails.seasons, watched.length) : 0;

  const nextEpisode: NextEpisode | null = episode ? { episode, seasonNumber } : null;
  return {
    nextEpisode,
    progress,
    tvDetails,
    isLoading: !tvDetails || isFetchingCurrent || (needsNextSeason && isFetchingNext),
  };
}

function Hero({ show }: { show: FollowedShow }) {
  const { nextEpisode, progress, tvDetails, isLoading } = useNextEpisode(show);
  const backdrop = backdropUrl(tvDetails?.backdrop_path ?? null, 'w780');

  return (
    <View style={styles.hero}>
      {backdrop && <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" />}
      <View style={styles.heroScrim} />
      <View style={styles.heroContent}>
        <StatusBadge status="watching" style={styles.heroBadge} />
        <ThemedText type="title" numberOfLines={2}>
          {show.name}
        </ThemedText>
        {tvDetails?.overview ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.heroOverview}>
            {tvDetails.overview}
          </ThemedText>
        ) : null}

        <View style={styles.heroActions}>
          <Link href={{ pathname: '/show/[id]', params: { id: String(show.id) } } as const} asChild>
            <Pressable style={styles.watchButton}>
              <Ionicons name="play" size={16} color={Colors.dark.primaryForeground} />
              <ThemedText type="smallBold" style={{ color: Colors.dark.primaryForeground }}>
                {isLoading || !nextEpisode ? 'Watch' : `Watch S${nextEpisode.seasonNumber} E${nextEpisode.episode.episode_number}`}
              </ThemedText>
            </Pressable>
          </Link>
          <View style={styles.laterButton}>
            <Ionicons name="time-outline" size={16} color={Colors.dark.text} />
            <ThemedText type="smallBold">Later</ThemedText>
          </View>
        </View>

        <View style={styles.progressRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Progress
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {progress}%
          </ThemedText>
        </View>
        <View style={styles.progressTrack}>
          <CosmicGradientView style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    </View>
  );
}

function ForYouTeaser() {
  return (
    <Link href="/for-you" asChild>
      <Pressable style={styles.teaser}>
        <View style={styles.teaserRow}>
          <View style={styles.teaserIcon}>
            <Ionicons name="sparkles" size={20} color={Colors.dark.primary} />
          </View>
          <View style={styles.teaserText}>
            <ThemedText type="smallBold">Smart picks for you</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Based on your watch history
            </ThemedText>
          </View>
        </View>
        <View style={styles.teaserAction}>
          <ThemedText type="smallBold" style={{ color: Colors.dark.primaryForeground }}>
            Explore
          </ThemedText>
          <Ionicons name="chevron-forward" size={14} color={Colors.dark.primaryForeground} />
        </View>
      </Pressable>
    </Link>
  );
}

function StatsTeaser() {
  const { data: stats } = useQuery({ queryKey: ['watch-stats'], queryFn: () => getWatchStats() });

  return (
    <Link href="/stats" asChild>
      <Pressable style={styles.statsTeaser}>
        <View style={styles.statsTeaserRow}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              All time
            </ThemedText>
            <ThemedText type="subtitle">{stats?.episodesWatched ?? 0} episodes</ThemedText>
          </View>
          <View style={styles.statsTeaserLink}>
            <ThemedText type="smallBold">Stats</ThemedText>
            <Ionicons name="chevron-forward" size={14} color={Colors.dark.text} />
          </View>
        </View>
        <View style={styles.statsTeaserFooter}>
          <ThemedText type="small" themeColor="textSecondary">
            {stats?.showsFollowed ?? 0} following · {stats?.moviesWatched ?? 0} movies watched
          </ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery({ queryKey: ['followed-shows'], queryFn: () => getFollowedShows() });
  const { data: trending } = useQuery({ queryKey: ['trending'], queryFn: () => getTrending() });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      queryClient.invalidateQueries({ queryKey: ['watch-stats'] });
    }, [queryClient]),
  );

  const heroShow = shows[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {heroShow ? (
          <Hero show={heroShow} />
        ) : (
          <View style={styles.emptyHero}>
            <ThemedText type="title">Welcome</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Follow a show from Discover to see it here.
            </ThemedText>
          </View>
        )}

        {shows.length > 0 && (
          <HorizontalList title="Up Next" action={{ label: 'See all', href: '/watchlist' }}>
            {shows.map((show) => (
              <UpNextCard key={show.id} show={show} />
            ))}
          </HorizontalList>
        )}

        <View style={styles.teaserWrap}>
          <ForYouTeaser />
        </View>

        {trending && (
          <>
            <HorizontalList title="Trending Shows" action={{ label: 'Discover', href: '/discover' }}>
              {trending.shows.slice(0, 6).map((show) => (
                <PosterCard key={show.id} id={show.id} type="tv" title={show.title} posterPath={show.poster_path} size="md" />
              ))}
            </HorizontalList>
            <HorizontalList title="Trending Movies" action={{ label: 'Discover', href: '/discover' }}>
              {trending.movies.slice(0, 6).map((movie) => (
                <PosterCard key={movie.id} id={movie.id} type="movie" title={movie.title} posterPath={movie.poster_path} size="md" />
              ))}
            </HorizontalList>
          </>
        )}

        <View style={styles.teaserWrap}>
          <StatsTeaser />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function UpNextCard({ show }: { show: FollowedShow }) {
  const { progress, isLoading } = useNextEpisode(show);

  if (isLoading) {
    return (
      <View style={{ width: 144, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <PosterCard id={show.id} type="tv" title={show.name} posterPath={show.posterPath} status="watching" progress={progress} size="md" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  hero: {
    height: 380,
    width: '100%',
    overflow: 'hidden',
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 5, 10, 0.55)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  heroBadge: {
    marginBottom: Spacing.one,
  },
  heroOverview: {
    maxWidth: 280,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.dark.primary,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
  },
  laterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyHero: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  teaserWrap: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.one,
  },
  teaser: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  teaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  teaserIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teaserText: {
    flex: 1,
  },
  teaserAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.primary,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
  },
  statsTeaser: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.dark.cosmicSurface,
    padding: Spacing.three,
  },
  statsTeaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsTeaserLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsTeaserFooter: {
    marginTop: Spacing.two,
  },
});
