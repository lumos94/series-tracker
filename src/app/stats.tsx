import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { getWatchStats } from '@/db/queries';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

export default function StatsScreen() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ['watch-stats'], queryFn: () => getWatchStats() });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['watch-stats'] });
    }, [queryClient]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.grid}>
          <StatTile label="Episodes watched" value={String(stats?.episodesWatched ?? 0)} />
          <StatTile label="Movies watched" value={String(stats?.moviesWatched ?? 0)} />
          <StatTile label="Shows following" value={String(stats?.showsFollowed ?? 0)} />
          <StatTile label="Hours watched" value={String(stats?.estimatedHours ?? 0)} />
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Hours watched is an estimate based on episode/movie runtimes from TMDB.
        </ThemedText>
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
    padding: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.dark.cosmicSurface,
  },
  note: {
    marginTop: Spacing.four,
  },
});
