import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export function PosterSkeleton({ count = 9 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.poster} />
          <View style={styles.line} />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '31%',
    gap: Spacing.two,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.cosmicSurface,
  },
  line: {
    height: 10,
    width: '80%',
    borderRadius: 4,
    backgroundColor: Colors.dark.cosmicSurface,
  },
});
