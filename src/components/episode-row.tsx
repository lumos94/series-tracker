import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { posterUrl, type Episode } from '@/api/tmdb';

export function EpisodeRow({ episode, watched, onToggle }: { episode: Episode; watched: boolean; onToggle: () => void }) {
  const still = posterUrl(episode.still_path, 'w185');

  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.stillFrame}>
        {still ? (
          <Image source={{ uri: still }} style={styles.still} contentFit="cover" />
        ) : (
          <ThemedView type="cosmicSurface" style={styles.still}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stillFallback}>
              E{episode.episode_number}
            </ThemedText>
          </ThemedView>
        )}
        {watched && (
          <View style={styles.watchedOverlay}>
            <View style={styles.checkBadge}>
              <ThemedText style={styles.checkMark}>✓</ThemedText>
            </View>
          </View>
        )}
      </View>

      <View style={styles.text}>
        <View style={styles.textHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            E{episode.episode_number}
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {episode.name}
          </ThemedText>
        </View>
        {episode.overview ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {episode.overview}
          </ThemedText>
        ) : null}
        {episode.air_date && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.airDate}>
            {episode.air_date}
          </ThemedText>
        )}
      </View>

      <View style={[styles.checkCircle, watched && styles.checkCircleWatched]}>
        {watched && <ThemedText style={styles.checkCircleMark}>✓</ThemedText>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  rowPressed: {
    opacity: 0.7,
  },
  stillFrame: {
    width: 112,
    height: 64,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  still: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stillFallback: {
    fontSize: 10,
  },
  watchedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 5, 10, 0.5)',
  },
  checkBadge: {
    borderRadius: 999,
    backgroundColor: Colors.dark.statusCompleted,
    padding: 4,
  },
  checkMark: {
    color: '#05050a',
    fontSize: 10,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  textHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'baseline',
  },
  name: {
    flex: 1,
  },
  airDate: {
    fontSize: 10,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(163, 163, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleWatched: {
    borderColor: Colors.dark.statusCompleted,
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
  },
  checkCircleMark: {
    color: Colors.dark.statusCompleted,
    fontWeight: '700',
  },
});
