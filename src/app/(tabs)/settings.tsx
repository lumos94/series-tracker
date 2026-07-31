import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { getLastSyncedAt } from '@/db/queries';
import { backupNow, restoreFromDrive } from '@/lib/backup';

function MenuRow({ icon, label, description, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; description: string; href: '/stats' }) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
        <View style={styles.menuIcon}>
          <Ionicons name={icon} size={18} color={Colors.dark.primary} />
        </View>
        <View style={styles.menuText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.dark.textSecondary} />
      </Pressable>
    </Link>
  );
}

function formatLastSynced(isoDate: string | null | undefined) {
  if (!isoDate) return 'Never backed up';
  return `Last backed up ${new Date(isoDate).toLocaleString()}`;
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();

  const { data: lastSyncedAt } = useQuery({ queryKey: ['last-synced-at'], queryFn: () => getLastSyncedAt() });

  useFocusEffect(
    useCallback(() => {
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
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Configure your tracking experience
          </ThemedText>

          <View style={styles.menu}>
            <MenuRow icon="bar-chart-outline" label="Stats" description="Episodes, movies, hours watched" href="/stats" />
          </View>

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
                style={styles.backupButton}>
                Backup now
              </Button>
              <Button
                mode="outlined"
                onPress={confirmRestore}
                loading={restoreMutation.isPending}
                disabled={backupMutation.isPending || restoreMutation.isPending}
                style={styles.backupButton}>
                Restore from Drive
              </Button>
            </View>
          </View>

          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              Watchlog
            </ThemedText>
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
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  title: {
    marginBottom: Spacing.half,
  },
  menu: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.dark.cosmicSurface,
    padding: Spacing.three,
  },
  menuRowPressed: {
    opacity: 0.7,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  menuText: {
    flex: 1,
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
  footer: {
    marginTop: Spacing.six,
    alignItems: 'center',
  },
});
