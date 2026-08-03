import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import type { WatchStatus } from '@/lib/watch-status';

const config: Record<WatchStatus, { label: string; color: string }> = {
  watching: { label: 'Watching', color: Colors.dark.statusWatching },
  completed: { label: 'Completed', color: Colors.dark.statusCompleted },
  planned: { label: 'Planned', color: Colors.dark.statusPlanned },
  dropped: { label: 'Dropped', color: Colors.dark.statusDropped },
};

export function StatusBadge({ status, style }: { status: WatchStatus; style?: object }) {
  const { label, color } = config[status];

  return (
    <View style={[styles.badge, { backgroundColor: `${color}33`, borderColor: `${color}4d` }, style]}>
      <ThemedText type="small" style={[styles.label, { color }]}>
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
});
