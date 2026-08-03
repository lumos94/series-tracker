import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

export function FilterChip({
  label,
  active = false,
  onPress,
  size = 'md',
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, size === 'sm' ? styles.chipSm : styles.chipMd, active ? styles.chipActive : styles.chipInactive]}>
      <ThemedText type="smallBold" style={[styles.label, size === 'sm' && styles.labelSm, active ? styles.labelActive : styles.labelInactive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
  },
  chipMd: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
  },
  chipSm: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  chipInactive: {
    backgroundColor: 'rgba(15, 15, 26, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    fontSize: 12,
  },
  labelSm: {
    fontSize: 11,
  },
  labelActive: {
    color: Colors.dark.primaryForeground,
  },
  labelInactive: {
    color: Colors.dark.textSecondary,
  },
});
