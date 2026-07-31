import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';

import { HorizontalList } from '@/components/horizontal-list';
import { PosterCard } from '@/components/poster-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { getTvDetails } from '@/api/tmdb';
import { getFollowedShows, getWatchedEpisodesForShow } from '@/db/queries';
import { useRecommendations } from '@/lib/recommendations';
import { computeEpisodeProgress } from '@/lib/watch-status';

function ContinueWatching() {
  const shows = getFollowedShows();
  const queries = useQueries({
    queries: shows.map((show) => ({ queryKey: ['tv', show.id], queryFn: () => getTvDetails(show.id) })),
  });

  if (shows.length === 0) return null;

  return (
    <HorizontalList title="Continue Watching">
      {shows.map((show, i) => {
        const details = queries[i]?.data;
        const progress = details ? computeEpisodeProgress(details.seasons, getWatchedEpisodesForShow(show.id).length) : 0;
        return <PosterCard key={show.id} id={show.id} type="tv" title={show.name} posterPath={show.posterPath} status="watching" progress={progress} size="md" />;
      })}
    </HorizontalList>
  );
}

export default function ForYouScreen() {
  const { sections, isLoading } = useRecommendations(10);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={20} color={Colors.dark.primary} />
            <ThemedText type="title" style={styles.headerTitle}>
              For You
            </ThemedText>
          </View>
          <Link href="/discover" asChild>
            <Pressable style={styles.searchButton}>
              <Ionicons name="search" size={16} color={Colors.dark.textSecondary} />
            </Pressable>
          </Link>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ContinueWatching />

          {isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator />
              <ThemedText type="small" themeColor="textSecondary">
                Finding picks based on your watch history…
              </ThemedText>
            </View>
          )}

          {!isLoading && sections.length === 0 && (
            <View style={styles.empty}>
              <ThemedText type="default" themeColor="textSecondary">
                Follow or watch a few shows and movies to unlock personalized picks.
              </ThemedText>
            </View>
          )}

          {sections.map((section) => (
            <HorizontalList key={section.id} title={section.title}>
              {section.items.map((item) => (
                <PosterCard key={`${section.id}-${item.id}`} id={item.id} type={item.type} title={item.title} posterPath={item.posterPath} size="md" />
              ))}
            </HorizontalList>
          ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 22,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  empty: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
});
