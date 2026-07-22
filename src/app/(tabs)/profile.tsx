import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getLastSyncedAt, getWatchStats } from '@/db/queries';
import { backupNow, restoreFromDrive } from '@/lib/backup';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function formatLastSynced(isoDate: string | null | undefined) {
  if (!isoDate) return 'Never backed up';
  return `Last backed up ${new Date(isoDate).toLocaleString()}`;
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['watch-stats'],
    queryFn: () => getWatchStats(),
  });

  const { data: lastSyncedAt } = useQuery({
    queryKey: ['last-synced-at'],
    queryFn: () => getLastSyncedAt(),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['watch-stats'] });
      queryClient.invalidateQueries({ queryKey: ['last-synced-at'] });
    }, [queryClient]),
  );

  const backupMutation = useMutation({
    mutationFn: backupNow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['last-synced-at'] }),
    onError: (error: Error) => Alert.alert('Backup failed', error.message),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreFromDrive,
    onSuccess: (found) => {
      if (!found) {
        Alert.alert('No backup found', 'There is no backup in Google Drive yet.');
        return;
      }
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => Alert.alert('Restore failed', error.message),
  });

  function confirmRestore() {
    Alert.alert(
      'Restore from Drive?',
      'This replaces all shows, watchlist, and watch history on this device with the Drive backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => restoreMutation.mutate() },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>

        <View style={styles.grid}>
          <StatTile label="Episodes watched" value={String(stats?.episodesWatched ?? 0)} />
          <StatTile label="Movies watched" value={String(stats?.moviesWatched ?? 0)} />
          <StatTile label="Shows following" value={String(stats?.showsFollowed ?? 0)} />
          <StatTile label="Hours watched" value={String(stats?.estimatedHours ?? 0)} />
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Hours watched is an estimate based on episode/movie runtimes from TMDB.
        </ThemedText>

        <View style={styles.backupSection}>
          <ThemedText type="smallBold">Google Drive backup</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatLastSynced(lastSyncedAt)}
          </ThemedText>
          <View style={styles.backupButtons}>
            <Button
              mode="contained"
              onPress={() => backupMutation.mutate()}
              loading={backupMutation.isPending}
              disabled={backupMutation.isPending || restoreMutation.isPending}
              style={styles.backupButton}
            >
              Backup now
            </Button>
            <Button
              mode="outlined"
              onPress={confirmRestore}
              loading={restoreMutation.isPending}
              disabled={backupMutation.isPending || restoreMutation.isPending}
              style={styles.backupButton}
            >
              Restore from Drive
            </Button>
          </View>
        </View>
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
  title: {
    marginBottom: Spacing.three,
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
  },
  note: {
    marginTop: Spacing.four,
  },
  backupSection: {
    marginTop: Spacing.six,
    gap: Spacing.one,
  },
  backupButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  backupButton: {
    flexGrow: 1,
  },
});
